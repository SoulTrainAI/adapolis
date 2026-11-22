-- Forum discussions (Hot Topics)
-- Cardano Forum threads linked to open governance actions, with AI-classified
-- participant sentiment and for/against arguments. Every argument stores a
-- verbatim quote, the forum username and a link to the post.
-- Safe to run more than once.
-- Created: 2026-11-21

CREATE TABLE IF NOT EXISTS forum_discussions (
  proposal_id TEXT PRIMARY KEY REFERENCES proposals(proposal_id),
  threads JSONB NOT NULL DEFAULT '[]'::jsonb,       -- [{ id, title, url, posts_count, last_posted_at, match }]
  posts_analyzed INTEGER NOT NULL DEFAULT 0,
  participants INTEGER NOT NULL DEFAULT 0,          -- distinct authors with an on-topic stance
  sentiment JSONB NOT NULL DEFAULT '{"support":0,"oppose":0,"neutral":0}'::jsonb,
  args_for JSONB NOT NULL DEFAULT '[]'::jsonb,      -- [{ text, quote, url, author }]
  args_against JSONB NOT NULL DEFAULT '[]'::jsonb,
  input_fingerprint TEXT NOT NULL,                  -- skips re-analysis when no posts changed
  model TEXT,
  input_tokens INTEGER,
  output_tokens INTEGER,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE forum_discussions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "forum_discussions_select_public" ON forum_discussions FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

GRANT ALL ON forum_discussions TO service_role;
GRANT SELECT ON forum_discussions TO anon, authenticated;
