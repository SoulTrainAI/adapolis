/**
 * Cardano Forum discussion of open governance actions, for Hot Topics.
 *
 * A thread is linked to a proposal only on solid evidence: the proposal's own
 * CIP-108 references link to it, a post in it contains the gov_action id, or
 * its title closely matches the proposal title. Posts are classified
 * (support / oppose / neutral) and summarized into arguments; every argument
 * must quote its post verbatim and links back to it. Quoted replies are
 * stripped first so nobody is credited with words they were quoting.
 */

import { createHash } from 'node:crypto';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/sync/supabase-admin';
import { DEFAULT_STATEMENTS_MODEL, priceFor } from '@/lib/statements/summarize';
import { isFullSentenceQuote } from '@/lib/statements/proposal-arguments';

export const FORUM_BASE = 'https://forum.cardano.org';
const GOVERNANCE_TAG = '#governance';
const REQUEST_SPACING_MS = 1100;
const TIMEOUT_MS = 15_000;
const MAX_TOPICS_PER_PROPOSAL = 3;
const MAX_POSTS = 60;
const MAX_CHARS_PER_POST = 1200;
const MAX_POINTS_PER_SIDE = 3;
const TITLE_MATCH_THRESHOLD = 0.7;

export interface ForumArgument {
  text: string;
  quote: string;
  url: string;
  author: string;
}

export interface ForumThread {
  id: number;
  title: string;
  url: string;
  posts_count: number;
  last_posted_at: string | null;
  match: 'reference' | 'gov_action_id' | 'title';
}

export interface ForumDiscussion {
  threads: ForumThread[];
  posts_analyzed: number;
  participants: number;
  /** Participants by their latest on-topic stance */
  sentiment: { support: number; oppose: number; neutral: number };
  for: ForumArgument[];
  against: ForumArgument[];
}

// ---------- fetching ----------

let lastRequest = 0;
async function forumJson(path: string): Promise<unknown> {
  const wait = lastRequest + REQUEST_SPACING_MS - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequest = Date.now();
  const res = await fetch(FORUM_BASE + path, {
    headers: { Accept: 'application/json', 'User-Agent': 'ADApolis/1.0 (+https://www.adapolis.net)' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) {
    throw new Error(`Cardano Forum ${path} returned HTTP ${res.status}. If this is 429, the forum is rate-limiting; the next cron run will retry.`);
  }
  return res.json();
}

const SearchTopicSchema = z.object({
  id: z.number(),
  title: z.string(),
  slug: z.string(),
  posts_count: z.number(),
  last_posted_at: z.string().nullable().optional(),
});
const SearchSchema = z.object({
  topics: z.array(SearchTopicSchema).optional().default([]),
  posts: z.array(z.object({ topic_id: z.number() })).optional().default([]),
});
const PostSchema = z.object({
  id: z.number(),
  username: z.string(),
  post_number: z.number(),
  cooked: z.string(),
  post_type: z.number().optional(),
});
const TopicSchema = z.object({
  id: z.number(),
  title: z.string(),
  slug: z.string(),
  posts_count: z.number(),
  last_posted_at: z.string().nullable().optional(),
  highest_post_number: z.number().optional(),
  post_stream: z.object({ posts: z.array(PostSchema), stream: z.array(z.number()).optional().default([]) }),
});
const PostsSchema = z.object({ post_stream: z.object({ posts: z.array(PostSchema) }) });

function parse<T>(schema: z.ZodType<T>, raw: unknown, what: string): T {
  const r = schema.safeParse(raw);
  if (!r.success) {
    throw new Error(`Cardano Forum ${what} had an unexpected shape: ${r.error.message}. Discourse's JSON API may have changed.`);
  }
  return r.data;
}

async function search(query: string): Promise<z.infer<typeof SearchSchema>> {
  return parse(SearchSchema, await forumJson(`/search.json?q=${encodeURIComponent(query)}`), 'search');
}

type Topic = z.infer<typeof TopicSchema>;
type Post = z.infer<typeof PostSchema>;

async function loadTopic(id: number): Promise<{ topic: Topic; posts: Post[] }> {
  const topic = parse(TopicSchema, await forumJson(`/t/${id}.json`), `topic ${id}`);
  const posts = [...topic.post_stream.posts];
  const have = new Set(posts.map((p) => p.id));
  const missing = topic.post_stream.stream.filter((pid) => !have.has(pid)).slice(0, Math.max(0, MAX_POSTS - posts.length));
  for (let i = 0; i < missing.length; i += 20) {
    const qs = missing.slice(i, i + 20).map((pid) => `post_ids[]=${pid}`).join('&');
    const more = parse(PostsSchema, await forumJson(`/t/${id}/posts.json?${qs}`), `posts of topic ${id}`);
    posts.push(...more.post_stream.posts);
  }
  return { topic, posts: posts.sort((a, b) => a.post_number - b.post_number) };
}

// ---------- matching ----------

const STOPWORDS = new Set(
  'a an and the of for to in on with by from at as is are be this that it its or into over under per via cardano proposal governance action treasury withdrawal ada'.split(' ')
);
function tokens(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9₳\s]/g, ' ')
      .split(/\s+/)
      // Amounts ("24,995,775 ada") vary between a proposal and its threads; years don't.
      .filter((w) => w.length > 2 && !STOPWORDS.has(w) && (!/^\d+$/.test(w) || /^(19|20)\d\d$/.test(w)))
  );
}
/**
 * A thread title matches when it covers most of the proposal title's
 * distinctive words, or when at least 3 of them make up most of the shorter
 * title (long proposal titles vs short thread titles).
 */
export function titleMatches(proposalTitle: string, threadTitle: string): boolean {
  const p = tokens(proposalTitle);
  const t = tokens(threadTitle);
  if (p.size < 2 || t.size === 0) return false;
  let hit = 0;
  p.forEach((w) => {
    if (t.has(w)) hit++;
  });
  return hit / p.size >= TITLE_MATCH_THRESHOLD || (hit >= 3 && hit / Math.min(p.size, t.size) >= TITLE_MATCH_THRESHOLD);
}

function referencedTopicIds(metadata: unknown): number[] {
  const refs = (metadata as { body?: { references?: unknown } } | null)?.body?.references;
  if (!Array.isArray(refs)) return [];
  const ids: number[] = [];
  for (const ref of refs) {
    const uri = (ref as { uri?: unknown } | null)?.uri;
    const m = typeof uri === 'string' ? uri.match(/^https?:\/\/forum\.cardano\.org\/t\/(?:[^/]+\/)?(\d+)/i) : null;
    if (m) ids.push(Number(m[1]));
  }
  return ids;
}

async function findThreads(p: { proposal_id: string; title: string; metadata: unknown }): Promise<Map<number, ForumThread['match']>> {
  const found = new Map<number, ForumThread['match']>();
  for (const id of referencedTopicIds(p.metadata)) found.set(id, 'reference');

  const byId = await search(p.proposal_id);
  for (const post of byId.posts) if (!found.has(post.topic_id)) found.set(post.topic_id, 'gov_action_id');

  if (found.size < MAX_TOPICS_PER_PROPOSAL && tokens(p.title).size >= 2) {
    const byTitle = await search(`${p.title} ${GOVERNANCE_TAG}`);
    for (const t of byTitle.topics) {
      if (!found.has(t.id) && titleMatches(p.title, t.title)) found.set(t.id, 'title');
    }
  }
  return new Map(Array.from(found).slice(0, MAX_TOPICS_PER_PROPOSAL));
}

// ---------- post text ----------

function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)));
}

/** Post's own words: quoted replies, code and images removed. */
export function postText(cooked: string): string {
  return decodeEntities(
    cooked
      .replace(/<aside[\s\S]*?<\/aside>/gi, ' ')
      .replace(/<blockquote[\s\S]*?<\/blockquote>/gi, ' ')
      .replace(/<pre[\s\S]*?<\/pre>/gi, ' ')
      .replace(/<(br|\/p|\/li|\/h\d)>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
  )
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*/g, '\n')
    .trim();
}

// ---------- summarizing ----------

interface ForumPost {
  index: number;
  author: string;
  text: string;
  url: string;
}

const SYSTEM_PROMPT = `You analyze Cardano Forum posts about one Cardano governance action (proposal).

1. stances: for every post, classify the author's stance on the proposal passing:
   "support", "oppose", "neutral" (questions, mixed views, information), or "off_topic".
   Judge only what the post itself says. Do not guess.
2. for / against: up to ${MAX_POINTS_PER_SIDE} distinct arguments each way, most substantive first.
   - text: neutral plain-language summary, at most 20 words, no names, no judgment.
   - quote: 1 to 3 COMPLETE consecutive sentences copied EXACTLY from the cited post (start at a sentence start, end at its final punctuation, at most 80 words). Never trim mid-sentence or join passages.
   - post_index: the post quoted. "for" must cite a supporting post, "against" an opposing one.
   Skip thanks, logistics and personal attacks. Fewer points is better than weak ones.

Call the record_forum_analysis tool exactly once.`;

const POINT = {
  type: 'object',
  properties: { text: { type: 'string' }, quote: { type: 'string' }, post_index: { type: 'integer' } },
  required: ['text', 'quote', 'post_index'],
} as const;

const TOOL: Anthropic.Tool = {
  name: 'record_forum_analysis',
  description: 'Record each post stance and the main arguments for and against, each backed by a verbatim quote.',
  input_schema: {
    type: 'object',
    properties: {
      stances: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            post_index: { type: 'integer' },
            stance: { type: 'string', enum: ['support', 'oppose', 'neutral', 'off_topic'] },
          },
          required: ['post_index', 'stance'],
        },
      },
      for: { type: 'array', items: POINT },
      against: { type: 'array', items: POINT },
    },
    required: ['stances', 'for', 'against'],
  },
};

const OutputSchema = z.object({
  stances: z.array(z.unknown()).default([]),
  for: z.array(z.unknown()).default([]),
  against: z.array(z.unknown()).default([]),
});
const StanceSchema = z.object({ post_index: z.number().int(), stance: z.enum(['support', 'oppose', 'neutral', 'off_topic']) });
const PointSchema = z.object({ text: z.string().min(3).max(240), quote: z.string(), post_index: z.number().int() });

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set. Add it in Railway → adapolis → Variables to enable forum summaries.');
    client = new Anthropic({ apiKey });
  }
  return client;
}

async function analyze(title: string, posts: ForumPost[], model: string) {
  const docs = posts.map((p) => `<post index="${p.index}" author="${p.author}">\n${p.text}\n</post>`).join('\n\n');
  const response = await getClient().messages.create({
    model,
    max_tokens: 2000,
    system: SYSTEM_PROMPT,
    tools: [TOOL],
    tool_choice: { type: 'tool', name: TOOL.name },
    messages: [{ role: 'user', content: `Proposal: ${title}\n\n${docs}` }],
  });
  const toolUse = response.content.find((c): c is Anthropic.ToolUseBlock => c.type === 'tool_use');
  const out = OutputSchema.safeParse(toolUse?.input ?? {});
  const raw = out.success ? out.data : { stances: [], for: [], against: [] };

  const stanceByIndex = new Map<number, string>();
  for (const s of raw.stances) {
    const r = StanceSchema.safeParse(s);
    if (r.success && posts.some((p) => p.index === r.data.post_index)) stanceByIndex.set(r.data.post_index, r.data.stance);
  }

  const points = (items: unknown[], want: 'support' | 'oppose'): ForumArgument[] => {
    const result: ForumArgument[] = [];
    for (const item of items) {
      const r = PointSchema.safeParse(item);
      if (!r.success) continue;
      const post = posts.find((p) => p.index === r.data.post_index);
      if (!post || stanceByIndex.get(post.index) !== want || !isFullSentenceQuote(r.data.quote, post.text)) continue;
      if (result.some((x) => x.text === r.data.text.trim())) continue;
      result.push({ text: r.data.text.trim(), quote: r.data.quote.trim(), url: post.url, author: post.author });
      if (result.length >= MAX_POINTS_PER_SIDE) break;
    }
    return result;
  };

  // Each participant counts once, by their latest on-topic post.
  const latest = new Map<string, string>();
  for (const p of posts) {
    const s = stanceByIndex.get(p.index);
    if (s && s !== 'off_topic') latest.set(p.author, s);
  }
  const sentiment = { support: 0, oppose: 0, neutral: 0 };
  latest.forEach((s) => {
    sentiment[s as keyof typeof sentiment]++;
  });

  return {
    sentiment,
    participants: latest.size,
    for: points(raw.for, 'support'),
    against: points(raw.against, 'oppose'),
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  };
}

// ---------- run ----------

export interface ForumRunResult {
  checked: number;
  with_threads: number;
  generated: number;
  unchanged: number;
  errors: number;
  spent_usd: number;
  last_error: string | null;
}

export async function refreshForumDiscussions(proposals: Array<{ proposal_id: string; title: string }>): Promise<ForumRunResult> {
  const model = process.env.ANTHROPIC_STATEMENTS_MODEL || DEFAULT_STATEMENTS_MODEL;
  const price = priceFor(model);
  const result: ForumRunResult = { checked: 0, with_threads: 0, generated: 0, unchanged: 0, errors: 0, spent_usd: 0, last_error: null };
  if (proposals.length === 0) return result;
  const ids = proposals.map((p) => p.proposal_id);

  const [{ data: meta }, { data: existing, error }] = await Promise.all([
    supabaseAdmin.from('proposals').select('proposal_id, metadata').in('proposal_id', ids),
    supabaseAdmin.from('forum_discussions').select('proposal_id, input_fingerprint').in('proposal_id', ids),
  ]);
  if (error) {
    throw new Error(`Couldn't read forum_discussions: ${error.message}. Run supabase/migrations/009_forum_discussions.sql in the Supabase SQL Editor.`);
  }
  const metadata = new Map((meta ?? []).map((r: { proposal_id: string; metadata: unknown }) => [r.proposal_id, r.metadata]));
  const known = new Map((existing ?? []).map((r: { proposal_id: string; input_fingerprint: string }) => [r.proposal_id, r.input_fingerprint]));

  for (const p of proposals) {
    result.checked++;
    try {
      const matches = await findThreads({ ...p, metadata: metadata.get(p.proposal_id) ?? null });
      const threads: ForumThread[] = [];
      const posts: ForumPost[] = [];
      for (const [topicId, match] of Array.from(matches)) {
        const { topic, posts: raw } = await loadTopic(topicId);
        threads.push({
          id: topic.id,
          title: topic.title,
          url: `${FORUM_BASE}/t/${topic.slug}/${topic.id}`,
          posts_count: topic.posts_count,
          last_posted_at: topic.last_posted_at ?? null,
          match,
        });
        for (const post of raw) {
          if (posts.length >= MAX_POSTS) break;
          if (post.post_type !== undefined && post.post_type !== 1) continue;
          const text = postText(post.cooked);
          if (text.length < 20) continue;
          posts.push({
            index: posts.length,
            author: post.username,
            text: text.slice(0, MAX_CHARS_PER_POST),
            url: `${FORUM_BASE}/t/${topic.slug}/${topic.id}/${post.post_number}`,
          });
        }
      }
      if (threads.length > 0) result.with_threads++;

      const fp = createHash('sha256')
        // Version prefix: bump when the prompt changes so every thread is re-read once.
        .update('v2-full-sentence-quotes\n')
        .update(posts.map((x) => `${x.url}:${createHash('sha1').update(x.text).digest('hex')}`).join('\n'))
        .digest('hex');
      if (known.get(p.proposal_id) === fp) {
        result.unchanged++;
        continue;
      }

      let analysis = { sentiment: { support: 0, oppose: 0, neutral: 0 }, participants: 0, for: [] as ForumArgument[], against: [] as ForumArgument[], inputTokens: 0, outputTokens: 0 };
      if (posts.length > 0) analysis = await analyze(p.title, posts, model);
      result.spent_usd += (analysis.inputTokens * price.input + analysis.outputTokens * price.output) / 1_000_000;

      const { error: upsertError } = await supabaseAdmin.from('forum_discussions').upsert({
        proposal_id: p.proposal_id,
        threads,
        posts_analyzed: posts.length,
        participants: analysis.participants,
        sentiment: analysis.sentiment,
        args_for: analysis.for,
        args_against: analysis.against,
        input_fingerprint: fp,
        model,
        input_tokens: analysis.inputTokens,
        output_tokens: analysis.outputTokens,
        generated_at: new Date().toISOString(),
      });
      if (upsertError) throw new Error(`Saving forum discussion failed: ${upsertError.message}`);
      result.generated++;
    } catch (e) {
      result.errors++;
      result.last_error = `${p.proposal_id}: ${e instanceof Error ? e.message : String(e)}`;
    }
  }
  result.spent_usd = Number(result.spent_usd.toFixed(4));
  console.log(JSON.stringify({ event: 'forum_discussions_run', ...result }));
  return result;
}

const StoredSchema = z.object({
  proposal_id: z.string(),
  threads: z.array(
    z.object({
      id: z.number(),
      title: z.string(),
      url: z.string(),
      posts_count: z.number(),
      last_posted_at: z.string().nullable(),
      match: z.enum(['reference', 'gov_action_id', 'title']),
    })
  ),
  posts_analyzed: z.number(),
  participants: z.number(),
  sentiment: z.object({ support: z.number(), oppose: z.number(), neutral: z.number() }),
  args_for: z.array(z.object({ text: z.string(), quote: z.string(), url: z.string(), author: z.string() })),
  args_against: z.array(z.object({ text: z.string(), quote: z.string(), url: z.string(), author: z.string() })),
});

/** Stored forum discussions by proposal id; empty if the table doesn't exist yet. */
export async function loadForumDiscussions(ids: string[]): Promise<Map<string, ForumDiscussion>> {
  const out = new Map<string, ForumDiscussion>();
  if (ids.length === 0) return out;
  const { data, error } = await supabaseAdmin
    .from('forum_discussions')
    .select('proposal_id, threads, posts_analyzed, participants, sentiment, args_for, args_against')
    .in('proposal_id', ids);
  if (error) {
    console.warn(JSON.stringify({ event: 'forum_discussions_unavailable', error: error.message }));
    return out;
  }
  for (const row of data ?? []) {
    const r = StoredSchema.safeParse(row);
    if (!r.success || r.data.threads.length === 0) continue;
    out.set(r.data.proposal_id, {
      threads: r.data.threads,
      posts_analyzed: r.data.posts_analyzed,
      participants: r.data.participants,
      sentiment: r.data.sentiment,
      for: r.data.args_for,
      against: r.data.args_against,
    });
  }
  return out;
}
