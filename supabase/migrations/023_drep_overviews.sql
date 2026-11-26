-- DRep Overview (2026-11-26): a neutral, sourced summary of each active DRep.
-- Activity facts are computed by code; values and affiliations come from the
-- DRep's own words and every one carries a verbatim quote. DReps can't edit
-- it, but they can publish a response (signed with their DRep key) and anyone
-- signed in can report an error. Safe to run more than once. Deletes nothing.

CREATE TABLE IF NOT EXISTS drep_overviews (
  drep_id TEXT PRIMARY KEY REFERENCES dreps(drep_id),
  overview JSONB NOT NULL,            -- { headline, values[], affiliations[], facts{} }
  sources JSONB NOT NULL,             -- [{ index, kind, url, proposal_id, date }]
  source_count INTEGER NOT NULL DEFAULT 0,
  input_fingerprint TEXT NOT NULL,
  season_number INTEGER,
  model TEXT NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  regenerate BOOLEAN NOT NULL DEFAULT FALSE   -- set by an admin after a valid error report
);

CREATE TABLE IF NOT EXISTS drep_overview_replies (
  drep_id TEXT PRIMARY KEY REFERENCES dreps(drep_id),
  response TEXT NOT NULL CHECK (length(response) BETWEEN 1 AND 1500),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS drep_overview_reports (
  id BIGSERIAL PRIMARY KEY,
  drep_id TEXT NOT NULL REFERENCES dreps(drep_id),
  reporter_stake TEXT,
  reporter_drep TEXT,
  message TEXT NOT NULL CHECK (length(message) BETWEEN 5 AND 1500),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'accepted', 'dismissed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_overview_reports_open ON drep_overview_reports(status, created_at DESC);

ALTER TABLE drep_overviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE drep_overview_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE drep_overview_reports ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "drep_overviews_select_public" ON drep_overviews FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "drep_overview_replies_select_public" ON drep_overview_replies FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
GRANT ALL ON drep_overviews, drep_overview_replies, drep_overview_reports TO service_role;
GRANT USAGE, SELECT ON SEQUENCE drep_overview_reports_id_seq TO service_role;
GRANT SELECT ON drep_overviews, drep_overview_replies TO anon, authenticated;
