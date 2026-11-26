-- Admin panel and moderation (2026-11-25).
-- Every admin action is logged in a public audit log (transparency: who did
-- what, when, to which team, league or DRep profile). Moderated DRep profiles
-- are marked so readers know ADApolis changed what they see.
-- Safe to run more than once. Deletes nothing.

CREATE TABLE IF NOT EXISTS admin_actions (
  id BIGSERIAL PRIMARY KEY,
  admin_stake TEXT NOT NULL,
  action TEXT NOT NULL,
  target TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_admin_actions_created ON admin_actions(created_at DESC);

ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "admin_actions_select_public" ON admin_actions FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
GRANT ALL ON admin_actions TO service_role;
GRANT USAGE, SELECT ON SEQUENCE admin_actions_id_seq TO service_role;
GRANT SELECT ON admin_actions TO anon, authenticated;

ALTER TABLE drep_profile_overrides
  ADD COLUMN IF NOT EXISTS hide_image BOOLEAN NOT NULL DEFAULT FALSE,     -- hides the image from the claim AND the chain
  ADD COLUMN IF NOT EXISTS hide_bio BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS moderation_note TEXT CHECK (moderation_note IS NULL OR length(moderation_note) <= 300),
  ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS edited_by_admin BOOLEAN NOT NULL DEFAULT FALSE; -- true when ADApolis (not the DRep) wrote this row
