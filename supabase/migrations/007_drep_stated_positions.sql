-- DRep stated positions (Find My DRep, Phase 2)
-- AI-summarized from each DRep's own published words (CIP-119 profile and vote
-- rationales). Kept separate from voting-record data so the two can be
-- compared rather than mixed. Every row carries a verbatim quote and its source.
-- Safe to run more than once.
-- Created: 2026-11-21

CREATE TABLE IF NOT EXISTS drep_stated_positions (
  drep_id TEXT NOT NULL REFERENCES dreps(drep_id),
  topic_id TEXT NOT NULL,
  -- 1 = strongly disagrees with the topic statement, 10 = strongly agrees
  stance SMALLINT NOT NULL CHECK (stance BETWEEN 1 AND 10),
  confidence TEXT NOT NULL,           -- 'high' (explicit) | 'medium' (clearly implied)
  quote TEXT NOT NULL,                -- verbatim excerpt, verified to appear in the source
  source_kind TEXT NOT NULL,          -- 'profile' | 'rationale'
  source_url TEXT,                    -- anchor URL of the document quoted
  proposal_id TEXT,                   -- for rationales: the proposal the vote was on
  origin TEXT NOT NULL DEFAULT 'ai',  -- 'ai' now; 'pledge' once DReps can sign their own (Phase 3)
  model TEXT,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (drep_id, topic_id)
);

CREATE INDEX IF NOT EXISTS idx_drep_stated_positions_topic ON drep_stated_positions(topic_id);

-- One row per DRep per summarization pass; the fingerprint lets later runs
-- skip DReps whose statements haven't changed.
CREATE TABLE IF NOT EXISTS drep_statement_runs (
  drep_id TEXT PRIMARY KEY REFERENCES dreps(drep_id),
  input_fingerprint TEXT NOT NULL,
  sources_count INTEGER NOT NULL DEFAULT 0,
  positions_found INTEGER NOT NULL DEFAULT 0,
  quotes_rejected INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL,               -- 'ok' | 'no_sources' | 'error'
  error TEXT,
  model TEXT,
  input_tokens INTEGER,
  output_tokens INTEGER,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE drep_stated_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE drep_statement_runs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "drep_stated_positions_select_public" ON drep_stated_positions FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "drep_statement_runs_select_public" ON drep_statement_runs FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

GRANT ALL ON drep_stated_positions, drep_statement_runs TO service_role;
GRANT SELECT ON drep_stated_positions, drep_statement_runs TO anon, authenticated;
