/**
 * Makes the live Discord server match server-config.ts. Idempotent: run it
 * as often as you like; it creates what is missing, updates what drifted,
 * and never deletes channels, roles or messages.
 *
 * Dry run (the default) lists what it would do without changing anything.
 */

import { z } from "zod";
import {
  AutoModRuleSchema,
  ChannelSchema,
  GuildSchema,
  RoleSchema,
  WEBHOOK_NAME,
  channelWebhooks,
  discord,
  ensureWebhook,
  guildId,
  listChannels,
  listRoles,
  type Channel,
  type Role,
} from "./rest";
import {
  CATEGORIES,
  ONBOARDING,
  ROLES,
  SCAM_KEYWORDS,
  type Access,
  type ChannelSpec,
  type RoleKey,
} from "./server-config";
import { DREP_VERIFY, GUIDES, RULES, WELCOME } from "./content";
import { alreadyPosted, postOnce, refreshPosted } from "./posts";

// BigInt() calls, not literals: the TS target predates ES2020.
const B = (n: number) => BigInt(n);

const P = {
  CREATE_INVITE: B(1) << B(0),
  MANAGE_CHANNELS: B(1) << B(4),
  ADD_REACTIONS: B(1) << B(6),
  VIEW: B(1) << B(10),
  SEND: B(1) << B(11),
  MANAGE_MESSAGES: B(1) << B(13),
  READ_HISTORY: B(1) << B(16),
  CONNECT: B(1) << B(20),
  SPEAK: B(1) << B(21),
  MUTE: B(1) << B(22),
  MOVE: B(1) << B(24),
  MANAGE_THREADS: B(1) << B(34),
  CREATE_PUBLIC_THREADS: B(1) << B(35),
  CREATE_PRIVATE_THREADS: B(1) << B(36),
  SEND_IN_THREADS: B(1) << B(38),
};

const TYPE: Record<ChannelSpec["kind"], number> = {
  text: 0,
  voice: 2,
  announcement: 5,
  stage: 13,
  forum: 15,
};
const CATEGORY = 4;

export interface SetupReport {
  applied: boolean;
  actions: string[];
  warnings: string[];
}

interface Overwrite {
  id: string;
  type: 0;
  allow: string;
  deny: string;
}

function overwrites(
  access: Access,
  kind: ChannelSpec["kind"],
  everyone: string,
  roleId: (k: RoleKey) => string,
): Overwrite[] {
  const ow = (id: string, allow: bigint, deny = B(0)): Overwrite => ({
    id,
    type: 0,
    allow: allow.toString(),
    deny: deny.toString(),
  });
  const mod = roleId("moderator");
  const modPowers =
    P.SEND |
    P.SEND_IN_THREADS |
    P.CREATE_PUBLIC_THREADS |
    P.MANAGE_MESSAGES |
    P.MANAGE_THREADS;
  const stage = kind === "stage" ? P.MUTE | P.MOVE | P.MANAGE_CHANNELS : B(0);
  switch (access.mode) {
    case "open":
      return kind === "stage" ? [ow(mod, stage)] : [];
    case "read_only":
      return [
        ow(
          everyone,
          B(0),
          P.SEND |
            P.SEND_IN_THREADS |
            P.CREATE_PUBLIC_THREADS |
            P.CREATE_PRIVATE_THREADS,
        ),
        ow(mod, modPowers),
      ];
    case "replies_only":
      return [
        ow(everyone, P.SEND_IN_THREADS, P.SEND | P.CREATE_PUBLIC_THREADS),
        ow(mod, modPowers),
      ];
    case "private": {
      const member =
        P.VIEW |
        P.SEND |
        P.SEND_IN_THREADS |
        P.READ_HISTORY |
        P.CONNECT |
        P.SPEAK |
        P.ADD_REACTIONS;
      const roles = Array.from(
        new Set<RoleKey>([...access.roles, "moderator"]),
      );
      return [
        ow(everyone, B(0), P.VIEW | P.CONNECT),
        ...roles.map((k) =>
          ow(
            roleId(k),
            k === "moderator" ? member | modPowers | stage : member,
          ),
        ),
      ];
    }
  }
}

function sameOverwrites(a: Overwrite[], b: unknown): boolean {
  const parsed = z
    .array(z.object({ id: z.string(), allow: z.string(), deny: z.string() }))
    .safeParse(b);
  if (!parsed.success) return false;
  const key = (o: { id: string; allow: string; deny: string }) =>
    `${o.id}:${o.allow}:${o.deny}`;
  return a.map(key).sort().join() === parsed.data.map(key).sort().join();
}

/** A snowflake-shaped id for new onboarding prompts and options (Discord requires one). */
function newId(i: number): string {
  return (
    ((BigInt(Date.now()) - B(1420070400000)) << B(22)) +
    BigInt(i)
  ).toString();
}

export async function setupServer(options: {
  apply: boolean;
}): Promise<SetupReport> {
  const { apply } = options;
  const report: SetupReport = { applied: apply, actions: [], warnings: [] };
  const gid = guildId();
  let fake = 0;
  // In a dry run every change is recorded instead of made, and returns a placeholder.
  async function act<T>(
    description: string,
    fn: () => Promise<T>,
    placeholder: T,
  ): Promise<T> {
    report.actions.push(description);
    if (!apply) return placeholder;
    return fn();
  }

  const guild = GuildSchema.parse(await discord("GET", `/guilds/${gid}`));

  /* ---- Roles ---- */
  const roles: Role[] = await listRoles();
  const roleIds = new Map<RoleKey, string>();
  for (const spec of ROLES) {
    const existing = roles.find((r) => r.name === spec.name);
    const body = {
      name: spec.name,
      color: spec.color,
      hoist: spec.hoist,
      mentionable: spec.mentionable,
      permissions: "0",
    };
    if (existing) {
      roleIds.set(spec.key, existing.id);
      continue;
    }
    const made = await act(
      `Create role ${spec.name}`,
      async () =>
        RoleSchema.parse(
          await discord("POST", `/guilds/${gid}/roles`, body, {
            reason: "ADApolis setup",
          }),
        ),
      {
        id: `role-${++fake}`,
        name: spec.name,
        position: 0,
        managed: false,
        permissions: "0",
      },
    );
    roleIds.set(spec.key, made.id);
  }
  // Moderators need moderation powers server-wide.
  const modId = roleIds.get("moderator")!;
  const modPerms =
    (B(1) << B(1)) |
    (B(1) << B(2)) |
    P.MANAGE_MESSAGES |
    P.MANAGE_THREADS |
    (B(1) << B(40)) |
    (B(1) << B(28)) |
    P.MUTE |
    P.MOVE |
    (B(1) << B(7));
  const current = BigInt(roles.find((r) => r.id === modId)?.permissions ?? "0");
  if ((current & modPerms) !== modPerms)
    await act(
      "Give Moderator kick, ban, timeout, role and message management",
      () =>
        discord("PATCH", `/guilds/${gid}/roles/${modId}`, {
          permissions: (current | modPerms).toString(),
        }),
      undefined,
    );
  // Order roles as in the config, just under the bot's own role.
  if (apply) {
    try {
      const fresh = await listRoles();
      const botRole = fresh
        .filter((r) => r.managed)
        .sort((a, b) => b.position - a.position)[0];
      if (botRole) {
        const top = botRole.position - 1;
        const positions = ROLES.map((spec, i) => ({
          id: roleIds.get(spec.key)!,
          position: Math.max(1, top - i),
        }));
        await discord("PATCH", `/guilds/${gid}/roles`, positions, {
          reason: "ADApolis setup: role order",
        });
      }
    } catch (e) {
      report.warnings.push(
        `Couldn't reorder roles (${e instanceof Error ? e.message : String(e)}). Drag them into order under Server Settings → Roles if you like.`,
      );
    }
  } else {
    report.actions.push("Order roles as listed, under the ADApolis bot role");
  }
  const roleId = (k: RoleKey) => roleIds.get(k)!;

  /* ---- Categories and channels ---- */
  let channels: Channel[] = await listChannels();
  const find = (name: string, type: number) =>
    channels.find(
      (c) => c.name.toLowerCase() === name.toLowerCase() && c.type === type,
    );
  const categoryIds = new Map<string, string>();
  for (const cat of CATEGORIES) {
    const existing = find(cat.name, CATEGORY);
    const made =
      existing ??
      (await act(
        `Create category ${cat.name}`,
        async () =>
          ChannelSchema.parse(
            await discord("POST", `/guilds/${gid}/channels`, {
              name: cat.name,
              type: CATEGORY,
            }),
          ),
        {
          id: `cat-${++fake}`,
          name: cat.name,
          type: CATEGORY,
        },
      ));
    categoryIds.set(cat.name, made.id);
  }

  const everyone = gid;
  async function ensureChannel(
    spec: ChannelSpec,
    parent: string,
  ): Promise<Channel> {
    const type = TYPE[spec.kind];
    const ow = overwrites(spec.access, spec.kind, everyone, roleId);
    const existing = find(spec.name, type);
    const wantsTopic = spec.kind !== "voice" && spec.kind !== "stage";
    if (!existing) {
      const body: Record<string, unknown> = {
        name: spec.name,
        type,
        parent_id: parent,
        permission_overwrites: ow,
      };
      if (wantsTopic && spec.topic) body.topic = spec.topic;
      if (spec.slowmode) body.rate_limit_per_user = spec.slowmode;
      if (spec.tags) body.available_tags = spec.tags.map((name) => ({ name }));
      const made = await act(
        `Create ${spec.kind} channel #${spec.name}`,
        async () =>
          ChannelSchema.parse(
            await discord("POST", `/guilds/${gid}/channels`, body, {
              reason: "ADApolis setup",
            }),
          ),
        {
          id: `ch-${++fake}`,
          name: spec.name,
          type,
          parent_id: parent,
        },
      );
      channels = [...channels, made];
      return made;
    }
    const full = z
      .object({
        topic: z.string().nullable().optional(),
        rate_limit_per_user: z.number().optional(),
        permission_overwrites: z.unknown(),
        parent_id: z.string().nullable().optional(),
      })
      .passthrough()
      .parse(await discord("GET", `/channels/${existing.id}`));
    const patch: Record<string, unknown> = {};
    if (full.parent_id !== parent) patch.parent_id = parent;
    if (wantsTopic && spec.topic && full.topic !== spec.topic)
      patch.topic = spec.topic;
    if (
      (spec.slowmode ?? 0) !== (full.rate_limit_per_user ?? 0) &&
      spec.kind !== "stage"
    )
      patch.rate_limit_per_user = spec.slowmode ?? 0;
    if (!sameOverwrites(ow, full.permission_overwrites))
      patch.permission_overwrites = ow;
    if (spec.tags) {
      const have = existing.available_tags ?? [];
      const missing = spec.tags.filter((t) => !have.some((h) => h.name === t));
      if (missing.length)
        patch.available_tags = [
          ...have,
          ...missing.map((name) => ({ name })),
        ].slice(0, 20);
    }
    if (Object.keys(patch).length) {
      const updated = await act(
        `Update #${spec.name}: ${Object.keys(patch).join(", ")}`,
        async () =>
          ChannelSchema.parse(
            await discord("PATCH", `/channels/${existing.id}`, patch, {
              reason: "ADApolis setup",
            }),
          ),
        existing,
      );
      channels = channels.map((c) => (c.id === updated.id ? updated : c));
      return updated;
    }
    return existing;
  }

  // Community needs a rules channel and an updates channel before it can be switched on,
  // and announcement, forum and stage channels need Community.
  const allSpecs = CATEGORIES.flatMap((c) =>
    c.channels.map((ch) => ({ cat: c.name, ch })),
  );
  const byName = new Map<string, Channel>();
  for (const { cat, ch } of allSpecs.filter(
    (s) => s.ch.name === "rules" || s.ch.name === "mod-log",
  )) {
    byName.set(ch.name, await ensureChannel(ch, categoryIds.get(cat)!));
  }
  if (!guild.features.includes("COMMUNITY")) {
    await act(
      "Turn on Community (needed for onboarding, forums, stage and announcement channels); members need a verified email",
      () =>
        discord(
          "PATCH",
          `/guilds/${gid}`,
          {
            features: [...guild.features, "COMMUNITY"],
            verification_level: 2,
            explicit_content_filter: 2,
            default_message_notifications: 1,
            rules_channel_id: byName.get("rules")!.id,
            public_updates_channel_id: byName.get("mod-log")!.id,
          },
          { reason: "ADApolis setup" },
        ),
      undefined,
    );
  }
  for (const { cat, ch } of allSpecs) {
    if (byName.has(ch.name)) continue;
    try {
      byName.set(ch.name, await ensureChannel(ch, categoryIds.get(cat)!));
    } catch (e) {
      report.warnings.push(
        `#${ch.name}: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  /* ---- AutoMod ---- */
  const modLog = byName.get("mod-log")!.id;
  const alert = { type: 2, metadata: { channel_id: modLog } };
  const rules =
    apply || guild.features.includes("COMMUNITY")
      ? z
          .array(AutoModRuleSchema)
          .parse(await discord("GET", `/guilds/${gid}/auto-moderation/rules`))
      : [];
  const autoMod = [
    {
      name: "ADApolis: wallet scam phrases",
      event_type: 1,
      trigger_type: 1,
      trigger_metadata: { keyword_filter: SCAM_KEYWORDS },
      actions: [
        {
          type: 1,
          metadata: {
            custom_message:
              "Blocked: this looks like a wallet scam. Never share a seed phrase, and nobody from ADApolis will DM you first.",
          },
        },
        alert,
      ],
    },
    {
      name: "ADApolis: mention spam",
      event_type: 1,
      trigger_type: 5,
      trigger_metadata: {
        mention_total_limit: 5,
        mention_raid_protection_enabled: true,
      },
      actions: [
        { type: 1, metadata: {} },
        alert,
        { type: 3, metadata: { duration_seconds: 600 } },
      ],
    },
    {
      name: "ADApolis: spam",
      event_type: 1,
      trigger_type: 3,
      trigger_metadata: {},
      actions: [{ type: 1, metadata: {} }, alert],
    },
    {
      name: "ADApolis: slurs and sexual content",
      event_type: 1,
      trigger_type: 4,
      trigger_metadata: { presets: [2, 3] },
      actions: [{ type: 1, metadata: {} }, alert],
    },
  ];
  for (const rule of autoMod) {
    if (rules.some((r) => r.name === rule.name)) continue;
    try {
      await act(
        `Add AutoMod rule "${rule.name}"`,
        () =>
          discord("POST", `/guilds/${gid}/auto-moderation/rules`, {
            ...rule,
            enabled: true,
            exempt_roles: [modId],
          }),
        undefined,
      );
    } catch (e) {
      report.warnings.push(
        `AutoMod "${rule.name}": ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  /* ---- Onboarding (Channels & Roles) ---- */
  const chId = (name: string) => byName.get(name)?.id;
  let n = 0;
  const prompts = ONBOARDING.map((q) => ({
    id: newId(n++),
    type: 0,
    title: q.title,
    single_select: q.single_select,
    required: false,
    in_onboarding: true,
    options: q.options.map((o) => ({
      id: newId(n++),
      title: o.title,
      description: o.description,
      emoji_name: o.emoji,
      role_ids: o.roles.map(roleId),
      channel_ids: o.channels.map(chId).filter((x): x is string => Boolean(x)),
    })),
  }));
  const defaults = allSpecs
    .filter((s) => s.ch.onboardingDefault)
    .map((s) => chId(s.ch.name))
    .filter((x): x is string => Boolean(x));
  // Re-saving onboarding replaces it, so only do it when the questions or defaults differ.
  const signature = (o: {
    prompts: Array<{
      title: string;
      options: Array<{
        title: string;
        role_ids: string[];
        channel_ids: string[];
      }>;
    }>;
    default_channel_ids: string[];
    enabled?: boolean;
  }) =>
    JSON.stringify([
      o.prompts.map((p) => [
        p.title,
        p.options.map((x) => [
          x.title,
          [...x.role_ids].sort(),
          [...x.channel_ids].sort(),
        ]),
      ]),
      [...o.default_channel_ids].sort(),
      o.enabled ?? true,
    ]);
  const OnboardingSchema = z.object({
    prompts: z.array(
      z.object({
        title: z.string(),
        options: z.array(
          z.object({
            title: z.string(),
            role_ids: z.array(z.string()),
            channel_ids: z.array(z.string()),
          }),
        ),
      }),
    ),
    default_channel_ids: z.array(z.string()),
    enabled: z.boolean(),
  });
  const currentOnboarding = OnboardingSchema.safeParse(
    await discord("GET", `/guilds/${gid}/onboarding`).catch(() => null),
  );
  const unchanged =
    currentOnboarding.success &&
    signature(currentOnboarding.data) ===
      signature({ prompts, default_channel_ids: defaults, enabled: true });
  if (!unchanged)
    try {
      await act(
        "Set up onboarding questions (roles and alerts) and default channels",
        () =>
          discord("PUT", `/guilds/${gid}/onboarding`, {
            prompts,
            default_channel_ids: defaults,
            enabled: true,
            mode: 0,
          }),
        undefined,
      );
    } catch (e) {
      report.warnings.push(
        `Onboarding couldn't be switched on (${e instanceof Error ? e.message : String(e)}). Saving the questions with onboarding off; turn it on under Server Settings → Onboarding.`,
      );
      try {
        await discord("PUT", `/guilds/${gid}/onboarding`, {
          prompts,
          default_channel_ids: defaults,
          enabled: false,
          mode: 0,
        });
      } catch (e2) {
        report.warnings.push(
          `Onboarding questions not saved either: ${e2 instanceof Error ? e2.message : String(e2)}`,
        );
      }
    }

  /* ---- Webhooks for the feeds ---- */
  for (const { ch } of allSpecs.filter(
    (s) => s.ch.feed && s.ch.feed !== "mod_log",
  )) {
    const c = byName.get(ch.name);
    if (!c) continue;
    const has = c.id.startsWith("ch-")
      ? false
      : (await channelWebhooks(c.id)).some(
          (w) => w.name === WEBHOOK_NAME && w.token,
        );
    if (!has)
      await act(
        `Add the ADApolis webhook to #${ch.name}`,
        () => ensureWebhook(c.id),
        { id: "", name: "", token: "" },
      );
  }

  /* ---- Seed messages (posted once) ---- */
  if (apply) {
    const seeds: Array<
      [string, string, Parameters<typeof postOnce>[2], boolean]
    > = [
      ["seed:welcome", "welcome", { embeds: WELCOME }, false],
      ["seed:rules", "rules", { embeds: RULES }, false],
      ["seed:drep-verify", "drep-verify", { embeds: DREP_VERIFY }, true],
    ];
    for (const [key, name, message, pin] of seeds) {
      const c = byName.get(name);
      if (!c) continue;
      const sent = await postOnce(key, c.id, message);
      if (sent) {
        report.actions.push(`Post the ${name} message`);
        if (pin)
          await discord("PUT", `/channels/${c.id}/pins/${sent.id}`).catch(() =>
            report.warnings.push(
              `Couldn't pin the #${name} message; pin it by hand.`,
            ),
          );
      } else {
        const r = await refreshPosted(key, c.id, message);
        if (r.status === "updated") report.actions.push(`Update the ${name} message`);
        if (r.status === "reposted") {
          report.actions.push(`Repost the ${name} message (the old one was deleted)`);
          if (pin)
            await discord("PUT", `/channels/${c.id}/pins/${r.id}`).catch(() =>
              report.warnings.push(`Couldn't pin the #${name} message; pin it by hand.`),
            );
        }
      }
    }
    const guides = byName.get("governance-guides");
    if (guides) {
      const tags = guides.available_tags ?? [];
      for (const g of GUIDES) {
        const tag = tags.find((t) => t.name === g.tag);
        const sent = await postOnce(`seed:guide:${g.slug}`, guides.id, {
          thread_name: g.title,
          content: g.body,
          applied_tags: tag ? [tag.id] : [],
        });
        if (sent) report.actions.push(`Post guide "${g.title}"`);
        else {
          const full = { thread_name: g.title, content: g.body, applied_tags: tag ? [tag.id] : [] };
          const r = await refreshPosted(`seed:guide:${g.slug}`, guides.id, { content: g.body }, full);
          if (r.status === "updated") report.actions.push(`Update guide "${g.title}"`);
          if (r.status === "reposted") report.actions.push(`Repost guide "${g.title}" (the old one was deleted)`);
        }
      }
    }
  } else {
    const keys = [
      "seed:welcome",
      "seed:rules",
      "seed:drep-verify",
      ...GUIDES.map((g) => `seed:guide:${g.slug}`),
    ];
    const done = await alreadyPosted(keys).catch((e: unknown) => {
      report.warnings.push(e instanceof Error ? e.message : String(e));
      return new Set<string>();
    });
    for (const k of keys.filter((k) => !done.has(k)))
      report.actions.push(`Post ${k.replace("seed:", "")}`);
  }

  return report;
}
