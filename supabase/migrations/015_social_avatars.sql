-- Default card art for DReps with no picture of their own (2026-11-23).
-- When a DRep's CIP-119 profile has no image but links an X or GitHub account,
-- the cron looks up that account's public profile picture once and stores it
-- here. A DRep's own image, or art they set by claiming their card, always wins.
-- Safe to run more than once. Public reads; writes via the service role.

CREATE TABLE IF NOT EXISTS drep_social_avatars (
  drep_id TEXT PRIMARY KEY REFERENCES dreps(drep_id),
  source TEXT NOT NULL CHECK (source IN ('x', 'github')),
  handle TEXT NOT NULL,
  image_url TEXT,                                    -- null when the account has no picture
  status TEXT NOT NULL CHECK (status IN ('ok', 'none', 'error')),
  checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE drep_social_avatars ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "drep_social_avatars_select_public" ON drep_social_avatars FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

GRANT ALL ON drep_social_avatars TO service_role;
GRANT SELECT ON drep_social_avatars TO anon, authenticated;
