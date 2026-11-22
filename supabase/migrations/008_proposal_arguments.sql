-- Proposal arguments (Find My DRep, real-proposal questions)
-- AI summary of the main arguments for and against each quiz proposal, drawn
-- only from the published rationales of DReps who voted Yes (for) and No
-- (against). Every point stores a verbatim quote and the rationale URL.
-- Safe to run more than once.
-- Created: 2026-11-21

CREATE TABLE IF NOT EXISTS proposal_arguments (
  proposal_id TEXT PRIMARY KEY REFERENCES proposals(proposal_id),
  args_for JSONB NOT NULL DEFAULT '[]'::jsonb,      -- [{ text, quote, url }]
  args_against JSONB NOT NULL DEFAULT '[]'::jsonb,  -- [{ text, quote, url }]
  for_sources INTEGER NOT NULL DEFAULT 0,           -- distinct Yes rationales read
  against_sources INTEGER NOT NULL DEFAULT 0,       -- distinct No rationales read
  input_fingerprint TEXT NOT NULL,                  -- skips re-summarizing unchanged rationales
  model TEXT,
  input_tokens INTEGER,
  output_tokens INTEGER,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE proposal_arguments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "proposal_arguments_select_public" ON proposal_arguments FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

GRANT ALL ON proposal_arguments TO service_role;
GRANT SELECT ON proposal_arguments TO anon, authenticated;
