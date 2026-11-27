/**
 * Engagement feeds, run by the cron (DISCORD_FEEDS=on) or by hand through
 * /api/admin/discord/feeds. Each post happens once, tracked in discord_posts.
 *
 * Neutral by design: feeds report what is up for a vote and who is showing
 * up, never which side is winning (Cardinal Rule).
 */

import { seasonLabel } from '@/lib/season/points';
import { getHotTopics, type HotTopic } from '@/lib/hot-topics/data';
import { getCards } from '@/lib/cards/data';
import { getSeasonData } from '@/lib/season/data';
import { draftSeason } from '@/lib/season/fantasy';
import { getLeaderboard } from '@/lib/season/leaderboard';
import { tierFor } from '@/lib/cards/types';
import { COLORS, guildId, listChannels, listRoles, type Channel, type Embed } from './rest';
import { alreadyPosted, postOnce } from './posts';
import { ACTION_TAGS } from './server-config';
import { getRace } from '@/lib/season/race';
import { buildCommentary, DAY_S } from '@/lib/season/commentary';
import { tagOptOuts } from '@/lib/drep-profile/mentions';
import { supabaseAdmin } from '@/lib/sync/supabase-admin';

/** Discord accounts linked to DReps who allow tagging: drep_id → Discord user id. */
async function taggableDReps(drepIds: string[]): Promise<Map<string, string>> {
  if (!drepIds.length) return new Map();
  const [optOut, links] = await Promise.all([
    tagOptOuts(),
    supabaseAdmin.from('discord_links').select('discord_user_id, drep_id').in('drep_id', drepIds),
  ]);
  const map = new Map<string, string>();
  for (const r of (links.data ?? []) as Array<{ discord_user_id: string; drep_id: string | null }>) {
    if (r.drep_id && !optOut.has(r.drep_id)) map.set(r.drep_id, r.discord_user_id);
  }
  return map;
}

// The www host serves directly; Discord fetches embed images without following redirects reliably.
const SITE = 'https://www.adapolis.net';

export interface FeedReport {
  applied: boolean;
  posted: string[];
  wouldPost: string[];
  warnings: string[];
}

function clip(text: string, max: number): string {
  const t = text.replace(/\s+/g, ' ').trim();
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
}

function epochsLeft(t: HotTopic, current: number): number | null {
  return t.voting_ends_epoch === null ? null : t.voting_ends_epoch - current;
}

function dayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export async function runFeeds(options: { apply: boolean }): Promise<FeedReport> {
  const report: FeedReport = { applied: options.apply, posted: [], wouldPost: [], warnings: [] };
  const [channels, roles] = await Promise.all([listChannels(), listRoles()]);
  const channel = (name: string): Channel | undefined => channels.find((c) => c.name === name);
  const role = (name: string) => roles.find((r) => r.name === name)?.id;
  const ping = (name: string) => {
    const id = role(name);
    return id ? { content: `<@&${id}>`, allowed_mentions: { roles: [id] } } : {};
  };

  type Job = { key: string; channel: string; build: () => Promise<Parameters<typeof postOnce>[2]>; after?: (sent: { id: string; channel_id: string }) => Promise<void> };
  const jobs: Job[] = [];

  /* ---- Governance: new actions and deadlines ---- */
  const hot = await getHotTopics();
  const forum = channel('governance-actions');
  const threadLinks = new Map<string, string>();
  for (const t of hot.topics) {
    const left = epochsLeft(t, hot.current_epoch);
    const link = `${SITE}/hot-topics#${encodeURIComponent(t.proposal_id)}`;
    const tagName = ACTION_TAGS[t.action_type];
    const tag = forum?.available_tags?.find((x) => x.name === tagName);
    jobs.push({
      key: `action:${t.proposal_id}`,
      channel: 'governance-actions',
      build: async () => ({
        thread_name: clip(t.title || 'Untitled governance action', 95),
        applied_tags: tag ? [tag.id] : [],
        embeds: [
          {
            title: clip(t.title || 'Untitled governance action', 250),
            url: link,
            color: COLORS.violet,
            description: clip(t.abstract || 'No abstract was published with this action.', 1500),
            fields: [
              { name: 'Type', value: tagName ?? t.action_type, inline: true },
              { name: 'Voting closes', value: t.voting_ends_epoch !== null ? `End of epoch ${t.voting_ends_epoch}` : 'Not set', inline: true },
              { name: 'Follow it', value: `[Votes, rationales and arguments on ADApolis](${link})` },
            ],
            footer: { text: 'Discuss below. Questions for DReps? Open a post in #ask-a-drep.' },
          },
        ],
      }),
      after: async (sent) => {
        threadLinks.set(t.proposal_id, `https://discord.com/channels/${guildId()}/${sent.channel_id}`);
      },
    });
    jobs.push({
      key: `action-feed:${t.proposal_id}`,
      channel: 'governance-feed',
      build: async () => {
        const thread = threadLinks.get(t.proposal_id);
        return {
          ...ping('Governance Alerts'),
          embeds: [
            {
              title: `New governance action: ${clip(t.title || 'Untitled', 200)}`,
              url: link,
              color: COLORS.gold,
              description: [
                `**${tagName ?? t.action_type}**${t.voting_ends_epoch !== null ? ` · voting closes at the end of epoch ${t.voting_ends_epoch}` : ''}`,
                thread ? `Discuss it here: ${thread}` : 'Discuss it in #governance-actions.',
              ].join('\n'),
            },
          ],
        };
      },
    });
    if (left !== null && left <= 1 && left >= 0) {
      jobs.push({
        key: `closing:${t.proposal_id}`,
        channel: 'governance-feed',
        build: async () => {
          const voted = t.tally.count.yes + t.tally.count.no + t.tally.count.abstain;
          return {
            ...ping('Governance Alerts'),
            embeds: [
              {
                title: `⏳ Last epoch to vote: ${clip(t.title || 'Untitled', 200)}`,
                url: link,
                color: COLORS.red,
                description: `${voted} DReps have voted so far, ${t.rationales} with a published rationale. Has yours? Check at ${SITE}/match`,
              },
            ],
          };
        },
      });
    }
  }

  /* ---- Season: epoch recap and draft reminders ---- */
  const season = await getSeasonData();
  jobs.push({
    key: `recap:${season.current_epoch}`,
    channel: 'season-feed',
    build: async () => {
      const top = season.standings.slice(0, 5);
      const medals = ['🥇', '🥈', '🥉', '4.', '5.'];
      const label = season.season === null ? `Warm-up (epochs ${season.start_epoch}–${season.end_epoch})` : seasonLabel(season.season);
      const lines = top.map((s, i) => `${medals[i]} **${s.profile.name ?? `${s.drep_id.slice(0, 14)}…`}** · ${s.points} pts · ${s.votes_cast} votes`);
      const board = await getLeaderboard().catch(() => null);
      const fantasy =
        board && board.season.status !== 'upcoming' && board.teams.length
          ? [{ name: `Team Leaderboard (${board.teams.length} teams)`, value: board.teams.slice(0, 3).map((t) => `${medals[t.rank - 1] ?? `${t.rank}.`} **${t.name}** · ${t.points} pts`).join('\n') + `\n${SITE}/leaderboard` }]
          : [];
      return {
        embeds: [
          {
            title: `Epoch ${season.current_epoch} standings · ${label}`,
            url: `${SITE}/cardanathon`,
            color: COLORS.gold,
            description: [
              lines.length ? lines.join('\n') : 'No DRep has voted yet this season.',
              '',
              `${season.standings.length} DReps have scored this season. Points come from voting, explaining and voting on time, never from how they vote.`,
            ].join('\n'),
            fields: fantasy,
          },
        ],
      };
    },
  });

  /* ---- Cardanathon: yesterday's commentary, once a day, tagging DReps who allow it ---- */
  const race = await getRace().catch(() => null);
  if (race) {
    const until = Math.min(race.now, race.ends_at);
    const lastFullDay = Math.floor((until - race.starts_at) / DAY_S);
    const lines = lastFullDay >= 1 ? buildCommentary(race.racers, { starts_at: race.starts_at, until, start_epoch: race.start_epoch }).filter((c) => c.day === lastFullDay) : [];
    if (lines.length) {
      jobs.push({
        key: `commentary:${race.window}:${lastFullDay}`,
        channel: 'season-feed',
        build: async () => {
          const shown = lines.slice(0, 8);
          const tags = await taggableDReps(Array.from(new Set(shown.flatMap((l) => l.drep_ids))));
          const text = shown.map((l) => {
            const mentions = l.drep_ids.map((id) => tags.get(id)).filter((u): u is string => !!u).map((u) => `<@${u}>`);
            return `• ${l.text}${mentions.length ? ` ${mentions.join(' ')}` : ''}`;
          });
          const top = race.racers.slice(0, 5).map((r, i) => `${['🥇', '🥈', '🥉', '4.', '5.'][i]} ${r.name ?? `${r.drep_id.slice(0, 14)}…`} · ${r.points}`);
          const users = Array.from(new Set(Array.from(tags.values())));
          return {
            allowed_mentions: { users },
            embeds: [
              {
                title: `🎙️ Cardanathon day ${lastFullDay} · ${race.label}`,
                url: `${SITE}/cardanathon`,
                color: COLORS.gold,
                description: clip(text.join('\n'), 3500),
                fields: [{ name: 'Standings', value: top.join('\n') || '—' }],
                footer: { text: 'Points come from voting, explaining and voting on time, never from how DReps vote.' },
              },
            ],
            // Mentions inside embeds don't notify, so the tags also go in the message itself.
            content: users.length ? users.map((u) => `<@${u}>`).join(' ') : undefined,
          };
        },
      });
    }
  }

  const draft = await draftSeason();
  if (draft) {
    const now = Date.now();
    const lock = new Date(draft.draft_locks_at).getTime();
    const lockText = `<t:${Math.floor(lock / 1000)}:F> (<t:${Math.floor(lock / 1000)}:R>)`;
    jobs.push({
      key: `draft:${draft.season_number}:open`,
      channel: 'season-feed',
      build: async () => ({
        ...ping('Season Alerts'),
        embeds: [
          {
            title: `🏟️ The ${seasonLabel(draft.season_number)} draft is open`,
            url: `${SITE}/draft`,
            color: COLORS.green,
            description: `Pick 5 DReps for epochs ${draft.start_epoch}–${draft.end_epoch}. Smaller DReps carry an underdog multiplier. Rosters lock ${lockText}. Free to play.`,
          },
        ],
      }),
    });
    if (lock - now <= 24 * 3600 * 1000 && lock > now) {
      jobs.push({
        key: `draft:${draft.season_number}:24h`,
        channel: 'season-feed',
        build: async () => ({
          ...ping('Season Alerts'),
          embeds: [{ title: `⏰ ${seasonLabel(draft.season_number)} rosters lock in under 24 hours`, url: `${SITE}/draft`, color: COLORS.red, description: `Lock: ${lockText}. Last chance to draft or change your team.` }],
        }),
      });
    }
  }

  /* ---- Vault: card of the day ---- */
  const cards = await getCards();
  const pool = cards.cards.filter((c) => c.rank !== null && c.recent.votes > 0 && !c.do_not_list).sort((a, b) => a.drep_id.localeCompare(b.drep_id));
  if (pool.length) {
    const today = dayKey();
    const card = pool[hash(today) % pool.length];
    const tier = tierFor(card.rank);
    jobs.push({
      key: `card:${today}`,
      channel: 'card-of-the-day',
      build: async () => {
        const embed: Embed = {
          title: `🃏 Card of the day: ${card.name ?? `${card.drep_id.slice(0, 16)}…`}`,
          url: `${SITE}/scoreboard`,
          color: COLORS.violet,
          description: [
            `**${tier.label}** · #${card.rank} of ${card.total}${card.archetype ? ` · ${card.archetype.label}` : ''}`,
            card.abilities.length ? `Abilities: ${card.abilities.map((a) => a.label).join(', ')}` : '',
          ]
            .filter(Boolean)
            .join('\n'),
          fields: [
            { name: 'GovScore', value: card.govscore !== null ? card.govscore.toFixed(1) : '—', inline: true },
            { name: 'Season pts', value: String(card.season.points), inline: true },
            { name: 'Projection', value: card.projection !== null ? String(card.projection) : '—', inline: true },
            { name: 'Career votes', value: String(card.lifetime.votes), inline: true },
            { name: 'Underdog', value: `${card.underdog.toFixed(2)}×`, inline: true },
            { name: 'Streak', value: `${card.streak} epochs`, inline: true },
          ],
          footer: { text: 'Collect, scout and draft at adapolis.net' },
        };
        // The whole card, rendered as an image, so the art and frame show in Discord.
        embed.image = { url: `${SITE}/api/cards/${card.drep_id}/image?d=${today}` };
        embed.url = `${SITE}/dreps/${card.drep_id}`;
        return { embeds: [embed] };
      },
    });
  }

  /* ---- Run ---- */
  const done = await alreadyPosted(jobs.map((j) => j.key));
  for (const job of jobs) {
    if (done.has(job.key)) continue;
    const target = channel(job.channel);
    if (!target) {
      report.warnings.push(`#${job.channel} is missing: run Discord setup first.`);
      continue;
    }
    if (!options.apply) {
      report.wouldPost.push(job.key);
      continue;
    }
    try {
      const sent = await postOnce(job.key, target.id, await job.build());
      if (sent) {
        report.posted.push(job.key);
        await job.after?.(sent);
      }
    } catch (e) {
      report.warnings.push(`${job.key}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return report;
}
