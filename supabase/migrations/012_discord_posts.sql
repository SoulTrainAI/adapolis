-- Discord posts (feeds and setup)
-- One row per message ADApolis has posted to its Discord server, keyed by what
-- it was about (e.g. 'action:<proposal id>', 'card:2026-11-22'), so a cron run
-- never posts the same thing twice.
-- Server-only: no public read policy.
-- Safe to run more than once.
-- Created: 2026-11-22

CREATE TABLE IF NOT EXISTS discord_posts (
  key TEXT PRIMARY KEY,
  channel_id TEXT NOT NULL,
  message_id TEXT NOT NULL,
  posted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE discord_posts ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON discord_posts FROM anon, authenticated;
GRANT ALL ON discord_posts TO service_role;
