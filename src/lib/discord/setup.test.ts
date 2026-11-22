import { beforeEach, describe, expect, it, vi } from 'vitest';

// In-memory stand-in for the Discord API, enough to exercise setup end to end.
interface FakeChannel {
  id: string;
  name: string;
  type: number;
  parent_id?: string | null;
  topic?: string | null;
  rate_limit_per_user?: number;
  permission_overwrites: Array<{ id: string; type: number; allow: string; deny: string }>;
  available_tags?: Array<{ id: string; name: string }>;
}
const state = {
  features: [] as string[],
  roles: [] as Array<{ id: string; name: string; position: number; managed: boolean; permissions: string }>,
  channels: [] as FakeChannel[],
  automod: [] as Array<{ id: string; name: string }>,
  onboarding: null as unknown,
  webhooks: [] as Array<{ id: string; name: string; token: string; channel_id: string }>,
  posts: [] as Array<{ channel: string; body: Record<string, unknown> }>,
  calls: [] as string[],
};
let seq = 1000;
const id = () => String(seq++);

function reply(body: unknown, status = 200) {
  return Promise.resolve(new Response(status === 204 ? null : JSON.stringify(body), { status }));
}

vi.stubGlobal('fetch', (url: string, init: RequestInit) => {
  const method = init.method ?? 'GET';
  const path = url.replace('https://discord.com/api/v10', '').split('?')[0];
  const body = init.body ? JSON.parse(String(init.body)) : undefined;
  state.calls.push(`${method} ${path}`);
  let m: RegExpMatchArray | null;
  if (method === 'GET' && /^\/guilds\/G$/.test(path)) return reply({ id: 'G', name: 'ADApolis', features: state.features });
  if (method === 'PATCH' && /^\/guilds\/G$/.test(path)) {
    expect(body.rules_channel_id).toBeTruthy();
    state.features = body.features;
    return reply({ id: 'G', name: 'ADApolis', features: state.features });
  }
  if (method === 'GET' && path === '/guilds/G/roles') return reply(state.roles);
  if (method === 'POST' && path === '/guilds/G/roles') {
    const r = { id: id(), name: body.name, position: 1, managed: false, permissions: body.permissions };
    state.roles.push(r);
    return reply(r);
  }
  if (method === 'PATCH' && path === '/guilds/G/roles') return reply(state.roles);
  if (method === 'PATCH' && (m = path.match(/^\/guilds\/G\/roles\/(\d+)$/))) {
    const r = state.roles.find((x) => x.id === m![1])!;
    r.permissions = body.permissions;
    return reply(r);
  }
  if (method === 'GET' && path === '/guilds/G/channels') return reply(state.channels);
  if (method === 'POST' && path === '/guilds/G/channels') {
    if ([5, 13, 15].includes(body.type) && !state.features.includes('COMMUNITY')) return reply({ message: 'needs community' }, 400);
    const c: FakeChannel = { id: id(), ...body, permission_overwrites: body.permission_overwrites ?? [], available_tags: body.available_tags?.map((t: { name: string }) => ({ id: id(), name: t.name })) };
    state.channels.push(c);
    return reply(c);
  }
  if ((m = path.match(/^\/channels\/(\d+)$/))) {
    const c = state.channels.find((x) => x.id === m![1])!;
    if (method === 'PATCH') Object.assign(c, body);
    return reply(c);
  }
  if (path === '/guilds/G/auto-moderation/rules') {
    if (method === 'GET') return reply(state.automod);
    state.automod.push({ id: id(), name: body.name });
    return reply(state.automod[state.automod.length - 1]);
  }
  if (method === 'GET' && path === '/guilds/G/onboarding') return reply(state.onboarding ?? { prompts: [], default_channel_ids: [], enabled: false });
  if (method === 'PUT' && path === '/guilds/G/onboarding') {
    state.onboarding = body;
    return reply(body);
  }
  if ((m = path.match(/^\/channels\/(\d+)\/webhooks$/))) {
    if (method === 'GET') return reply(state.webhooks.filter((w) => w.channel_id === m![1]));
    const w = { id: id(), name: body.name, token: 'tok', channel_id: m[1] };
    state.webhooks.push(w);
    return reply(w);
  }
  if ((m = path.match(/^\/webhooks\/(\d+)\/tok$/))) {
    const w = state.webhooks.find((x) => x.id === m![1])!;
    state.posts.push({ channel: w.channel_id, body });
    return reply({ id: id(), channel_id: body.thread_name ? id() : w.channel_id });
  }
  if (method === 'PUT' && path.includes('/pins/')) return reply(null, 204);
  return reply({ message: `unhandled ${method} ${path}` }, 404);
});

// Supabase-backed dedupe, replaced with a Set.
const posted = new Set<string>();
vi.mock('./posts', async () => {
  const rest = await import('./rest');
  return {
    alreadyPosted: async (keys: string[]) => new Set(keys.filter((k) => posted.has(k))),
    postOnce: async (key: string, channelId: string, message: Parameters<typeof rest.postViaWebhook>[1]) => {
      if (posted.has(key)) return null;
      const sent = await rest.postViaWebhook(channelId, message);
      posted.add(key);
      return sent;
    },
  };
});

process.env.DISCORD_BOT_TOKEN = 'bot';
process.env.DISCORD_GUILD_ID = 'G';

describe('Discord setup', () => {
  beforeEach(() => {
    state.calls = [];
  });

  it('dry run changes nothing', async () => {
    const { setupServer } = await import('./setup');
    const report = await setupServer({ apply: false });
    expect(report.actions.length).toBeGreaterThan(30);
    expect(state.calls.every((c) => c.startsWith('GET'))).toBe(true);
    expect(state.channels).toHaveLength(0);
  });

  it('builds the whole server, then is idempotent', async () => {
    const { setupServer } = await import('./setup');
    const first = await setupServer({ apply: true });
    expect(first.warnings).toEqual([]);
    expect(state.features).toContain('COMMUNITY');
    expect(state.roles.map((r) => r.name)).toContain('Verified DRep');
    const names = state.channels.map((c) => c.name);
    for (const n of ['ask-a-drep', 'drep-lounge', 'holders-lounge', 'governance-actions', 'Town Hall', 'mod-log']) expect(names).toContain(n);
    expect(state.automod).toHaveLength(4);
    expect(state.onboarding).toMatchObject({ enabled: true });

    // Private lounges hide from @everyone (the guild id) and open to their role.
    const lounge = state.channels.find((c) => c.name === 'drep-lounge')!;
    const everyone = lounge.permission_overwrites.find((o) => o.id === 'G')!;
    expect(BigInt(everyone.deny) & BigInt(1 << 10)).toBeTruthy();
    const drepRole = state.roles.find((r) => r.name === 'Verified DRep')!;
    expect(lounge.permission_overwrites.some((o) => o.id === drepRole.id && (BigInt(o.allow) & BigInt(1 << 10)))).toBe(true);

    // Welcome, rules, DRep instructions and 5 guides posted once.
    expect(state.posts).toHaveLength(8);
    const second = await setupServer({ apply: true });
    expect(second.actions).toEqual([]);
    expect(state.posts).toHaveLength(8);
  });
});
