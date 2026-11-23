-- Whether ADApolis may tag a DRep in its commentary posts on Discord and in
-- the X share links it prefills. On by default; a DRep turns it off on their claimed card.
-- Server-only, like drep_profile_overrides. Safe to run more than once.
-- Created: 2026-11-23

CREATE TABLE IF NOT EXISTS drep_mentions (
  drep_id TEXT PRIMARY KEY CHECK (drep_id ~ '^drep1[02-9ac-hj-np-z]{20,100}$'),
  allow_tags BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE drep_mentions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON drep_mentions FROM anon, authenticated;
GRANT ALL ON drep_mentions TO service_role;
