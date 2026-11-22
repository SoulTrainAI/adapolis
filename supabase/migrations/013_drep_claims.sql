-- DRep card edits and Discord links
-- drep_profile_overrides: art, bio and links a DRep set on adapolis.net after
-- signing with its DRep key. Each field is NULL to show the on-chain profile.
-- Stats are never stored here.
-- discord_links: which Discord account linked which wallet and/or DRep, so
-- roles can be re-checked later.
-- Server-only: no public read policy (the site reads with the service role).
-- Safe to run more than once.
-- Created: 2026-11-22

CREATE TABLE IF NOT EXISTS drep_profile_overrides (
  drep_id TEXT PRIMARY KEY CHECK (drep_id ~ '^drep1[02-9ac-hj-np-z]{20,100}$'),
  image TEXT CHECK (image IS NULL OR length(image) <= 500),
  bio TEXT CHECK (bio IS NULL OR length(bio) <= 1500),
  links JSONB CHECK (links IS NULL OR jsonb_typeof(links) = 'array'),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE drep_profile_overrides ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON drep_profile_overrides FROM anon, authenticated;
GRANT ALL ON drep_profile_overrides TO service_role;

CREATE TABLE IF NOT EXISTS discord_links (
  discord_user_id TEXT PRIMARY KEY,
  discord_username TEXT,
  stake_address TEXT,
  drep_id TEXT,
  roles TEXT[] NOT NULL DEFAULT '{}',
  linked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE discord_links ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON discord_links FROM anon, authenticated;
GRANT ALL ON discord_links TO service_role;
