-- ADApolis: one-paste setup for a NEW, EMPTY Supabase project
-- Generated from migrations 001 + 004 + 005 (003 is superseded by 004).
-- Does NOT include 002_seed_data.sql: that file is mock data for local dev only.
-- Paste into Supabase Dashboard -> SQL Editor -> New query -> Run.

-- ADApolis Phase 1 Initial Schema
-- Designed for Scoreboard MVP: DRep discovery and participation scoring
-- Last updated: 2026-06-05

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "moddatetime";

-- =============================================================================
-- DREPS TABLE
-- Core DRep profiles and metadata from on-chain registration
-- =============================================================================

CREATE TABLE IF NOT EXISTS dreps (
  drep_id TEXT PRIMARY KEY,
  -- drep_id is the bech32-encoded DRep credential from CIP-1694 (e.g., drep_...)

  hex_id TEXT NOT NULL UNIQUE,
  -- Hex-encoded version of drep_id for Koios API compatibility

  stake_address TEXT,
  -- Stake address associated with the DRep (if registered via stake cred)

  is_script BOOLEAN DEFAULT FALSE,
  -- Whether the DRep is a Plutus script (governance action auto-approval)

  is_registered BOOLEAN DEFAULT TRUE,
  -- Whether the DRep is currently registered on-chain

  deposit_lovelace BIGINT DEFAULT 500000000,
  -- Deposit amount (500 ADA = 500000000 lovelace) as per CIP-1694

  active_epoch INTEGER,
  -- Epoch when the DRep registration becomes active

  expires_epoch INTEGER,
  -- Epoch when the DRep registration expires (if unregistered)

  amount_lovelace BIGINT DEFAULT 0,
  -- Total ADA delegated to this DRep (updated by sync)

  delegator_count INTEGER DEFAULT 0,
  -- Number of delegators to this DRep (updated by sync)

  voting_anchor_url TEXT,
  -- CIP-119 metadata anchor URL (e.g., IPFS or GitHub raw content)

  voting_anchor_hash TEXT,
  -- BLAKE2b-256 hash of CIP-119 metadata

  metadata JSONB,
  -- Parsed CIP-119 metadata: { name, bio, objectives, motivations, qualifications, image, social_links }
  -- Populated by ETL after fetching from voting_anchor_url

  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_dreps_amount_lovelace ON dreps(amount_lovelace DESC);
CREATE INDEX idx_dreps_is_registered ON dreps(is_registered);
CREATE INDEX idx_dreps_updated_at ON dreps(updated_at DESC);

-- =============================================================================
-- PROPOSALS TABLE
-- On-chain governance actions (parameter changes, treasury withdrawals, etc.)
-- =============================================================================

CREATE TYPE proposal_type AS ENUM (
  'parameter_change',
  'hard_fork',
  'treasury_withdrawal',
  'no_confidence',
  'committee_update',
  'constitution',
  'info'
);

CREATE TYPE proposal_status AS ENUM (
  'active',
  'passed',
  'failed',
  'expired'
);

CREATE TABLE IF NOT EXISTS proposals (
  proposal_id TEXT PRIMARY KEY,
  -- proposal_id is a composite of tx_hash + cert_index from on-chain

  tx_hash TEXT NOT NULL,
  -- Transaction hash where the governance action was submitted

  cert_index INTEGER NOT NULL,
  -- Certificate index within the transaction

  UNIQUE(tx_hash, cert_index),
  -- Ensure no duplicate proposals

  proposal_type proposal_type NOT NULL,
  action_type TEXT NOT NULL,
  -- Generic action_type from Koios (e.g., 'InfoAction', 'TreasuryWithdrawal')
  -- proposal_type is a normalized enum, action_type is the raw value

  title TEXT,
  abstract TEXT,
  -- Parsed from metadata or Koios; populated by ETL

  metadata_url TEXT,
  metadata_hash TEXT,
  -- Governance metadata anchor (CIP-100 or custom)

  metadata JSONB,
  -- Raw metadata from on-chain anchor (will be large for some proposals)

  proposed_epoch INTEGER,
  submission_block_time TIMESTAMPTZ,
  -- When the proposal was submitted on-chain

  voting_starts_epoch INTEGER,
  voting_ends_epoch INTEGER,
  -- Epoch range during which votes are accepted on-chain

  expires_at TIMESTAMPTZ,
  status proposal_status DEFAULT 'active',
  -- Status updated by ETL as vote window progresses

  ratified_epoch INTEGER,
  enacted_epoch INTEGER,
  expired_epoch INTEGER,
  -- Terminal epochs: when the proposal reached each final state

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_proposals_status ON proposals(status);
CREATE INDEX idx_proposals_proposal_type ON proposals(proposal_type);
CREATE INDEX idx_proposals_expires_at ON proposals(expires_at);
CREATE INDEX idx_proposals_updated_at ON proposals(updated_at DESC);

-- =============================================================================
-- VOTES TABLE
-- Individual DRep votes on governance actions
-- =============================================================================

CREATE TYPE vote_choice AS ENUM ('yes', 'no', 'abstain');

CREATE TABLE IF NOT EXISTS votes (
  vote_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  drep_id TEXT NOT NULL REFERENCES dreps(drep_id),
  proposal_id TEXT NOT NULL REFERENCES proposals(proposal_id),

  vote vote_choice NOT NULL,
  -- yes, no, or abstain

  rationale_url TEXT,
  -- CIP-100 or custom rationale anchor URL (e.g., IPFS, GitHub raw)

  rationale_hash TEXT,
  -- Hash of rationale for verification

  rationale TEXT,
  -- Full rationale text (fetched from anchor if available; ETL-populated)

  block_time TIMESTAMPTZ NOT NULL,
  -- On-chain timestamp of the vote

  tx_hash TEXT,
  -- Transaction that contained the vote

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(drep_id, proposal_id)
  -- A DRep can only vote once per proposal
);

CREATE INDEX idx_votes_drep_id ON votes(drep_id);
CREATE INDEX idx_votes_proposal_id ON votes(proposal_id);
CREATE INDEX idx_votes_block_time ON votes(block_time DESC);

-- =============================================================================
-- DELEGATIONS TABLE
-- Stake delegated to DReps (used for quadratic dampening)
-- =============================================================================

CREATE TABLE IF NOT EXISTS delegations (
  delegation_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  drep_id TEXT NOT NULL REFERENCES dreps(drep_id),
  stake_address TEXT NOT NULL,
  -- Stake address delegating to this DRep

  lovelace_amount BIGINT NOT NULL DEFAULT 0,
  -- Amount delegated in lovelace

  delegated_at TIMESTAMPTZ NOT NULL,
  -- On-chain timestamp of the delegation

  revoked_at TIMESTAMPTZ,
  -- When the delegation was revoked (null if still active)

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_delegations_drep_id ON delegations(drep_id);
CREATE INDEX idx_delegations_stake_address ON delegations(stake_address);
CREATE INDEX idx_delegations_active ON delegations(revoked_at) WHERE revoked_at IS NULL;

-- =============================================================================
-- DREP_SCORES TABLE
-- Cached participation and other scores (updated by ETL scoring job)
-- Phase 1 includes only participation rate; Phase 2+ adds more dimensions
-- =============================================================================

CREATE TABLE IF NOT EXISTS drep_scores (
  score_id UUID DEFAULT uuid_generate_v4(),

  drep_id TEXT NOT NULL REFERENCES dreps(drep_id),
  epoch INTEGER NOT NULL,
  -- Epoch for which this score was computed

  participation_rate NUMERIC(5, 4),
  -- Percentage of eligible proposals voted on (0.0 to 1.0)
  -- = votes_cast / votes_eligible

  votes_cast INTEGER DEFAULT 0,
  votes_eligible INTEGER DEFAULT 0,
  -- Numerator and denominator for participation calculation

  rationale_rate NUMERIC(5, 4),
  -- Percentage of votes with published rationale

  voting_streak_epochs INTEGER DEFAULT 0,
  -- Number of consecutive epochs with at least one rationale-backed vote

  raw_govscore NUMERIC(10, 2),
  -- Raw participation score (0-100) before quadratic dampening

  adjusted_govscore NUMERIC(10, 2),
  -- Score after quadratic ADA-power dampening (formula in CONCEPT.md Section 6.3)

  computed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  PRIMARY KEY (drep_id, epoch)
  -- One score per DRep per epoch
);

CREATE INDEX idx_drep_scores_adjusted_govscore ON drep_scores(adjusted_govscore DESC);
-- Used for leaderboard sorting
CREATE INDEX idx_drep_scores_epoch ON drep_scores(epoch);

-- =============================================================================
-- SYNC_STATE TABLE
-- Track blockchain sync progress for ETL jobs
-- =============================================================================

CREATE TYPE sync_entity AS ENUM ('dreps', 'proposals', 'votes', 'delegations');

CREATE TABLE IF NOT EXISTS sync_state (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  entity sync_entity NOT NULL UNIQUE,
  -- Which entity type this row tracks

  last_synced_block BIGINT DEFAULT 0,
  -- Last block number successfully processed

  last_synced_epoch INTEGER DEFAULT 0,
  -- Last epoch successfully processed

  last_synced_at TIMESTAMPTZ,
  -- Timestamp of last successful sync

  last_error TEXT,
  -- Last error message (if any)

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- ROW LEVEL SECURITY
-- All tables allow public READ; only service role can WRITE
-- =============================================================================

ALTER TABLE dreps ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE delegations ENABLE ROW LEVEL SECURITY;
ALTER TABLE drep_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_state ENABLE ROW LEVEL SECURITY;

-- Public read access (governance data is public)
CREATE POLICY "dreps_select_public" ON dreps FOR SELECT USING (true);
CREATE POLICY "proposals_select_public" ON proposals FOR SELECT USING (true);
CREATE POLICY "votes_select_public" ON votes FOR SELECT USING (true);
CREATE POLICY "delegations_select_public" ON delegations FOR SELECT USING (true);
CREATE POLICY "drep_scores_select_public" ON drep_scores FOR SELECT USING (true);
CREATE POLICY "sync_state_select_public" ON sync_state FOR SELECT USING (true);

-- Service role only for writes (ETL jobs use service role key)
CREATE POLICY "dreps_write_service" ON dreps FOR INSERT WITH CHECK (false);
CREATE POLICY "proposals_write_service" ON proposals FOR INSERT WITH CHECK (false);
CREATE POLICY "votes_write_service" ON votes FOR INSERT WITH CHECK (false);
CREATE POLICY "delegations_write_service" ON delegations FOR INSERT WITH CHECK (false);
CREATE POLICY "drep_scores_write_service" ON drep_scores FOR INSERT WITH CHECK (false);
CREATE POLICY "sync_state_write_service" ON sync_state FOR INSERT WITH CHECK (false);

-- =============================================================================
-- AUTO-UPDATE TRIGGERS FOR updated_at COLUMNS
-- =============================================================================

CREATE TRIGGER handle_updated_at_dreps
  BEFORE UPDATE ON dreps
  FOR EACH ROW
  EXECUTE FUNCTION moddatetime (updated_at);

CREATE TRIGGER handle_updated_at_proposals
  BEFORE UPDATE ON proposals
  FOR EACH ROW
  EXECUTE FUNCTION moddatetime (updated_at);

CREATE TRIGGER handle_updated_at_delegations
  BEFORE UPDATE ON delegations
  FOR EACH ROW
  EXECUTE FUNCTION moddatetime (updated_at);

CREATE TRIGGER handle_updated_at_sync_state
  BEFORE UPDATE ON sync_state
  FOR EACH ROW
  EXECUTE FUNCTION moddatetime (updated_at);

-- =============================================================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================================================

COMMENT ON TABLE dreps IS 'DRep profiles from CIP-1694 on-chain registration';
COMMENT ON TABLE proposals IS 'Governance actions (proposals) from on-chain voting';
COMMENT ON TABLE votes IS 'Individual DRep votes on proposals';
COMMENT ON TABLE delegations IS 'Stake delegated to DReps (for ADA-power calculation)';
COMMENT ON TABLE drep_scores IS 'Cached participation and other scores per epoch';
COMMENT ON TABLE sync_state IS 'ETL sync progress tracker';

COMMENT ON COLUMN dreps.amount_lovelace IS 'Total ADA delegated to this DRep; updated by ETL';
COMMENT ON COLUMN dreps.metadata IS 'Parsed CIP-119 metadata; fetched and cached by ETL';
COMMENT ON COLUMN proposals.status IS 'Updated by ETL as the proposal progresses through voting windows';
COMMENT ON COLUMN votes.rationale IS 'Full rationale text; fetched from anchor by ETL if available';
COMMENT ON COLUMN drep_scores.adjusted_govscore IS 'Score after quadratic ADA dampening; used for Scoreboard ranking';

-- Fix get_vote_summaries vote matching
-- sync-votes.ts stores votes lowercased ('yes' | 'no' | 'abstain') to match the
-- vote_choice enum. The 003 version compared against 'Yes'/'No'/'Abstain',
-- which are not valid vote_choice labels, so the function failed on any
-- database built from these migrations.
-- Created: 2026-11-20

CREATE OR REPLACE FUNCTION get_vote_summaries(drep_ids text[])
RETURNS TABLE(drep_id text, yes_count bigint, no_count bigint, abstain_count bigint)
LANGUAGE sql STABLE AS $$
  SELECT
    v.drep_id,
    COUNT(*) FILTER (WHERE v.vote = 'yes') AS yes_count,
    COUNT(*) FILTER (WHERE v.vote = 'no') AS no_count,
    COUNT(*) FILTER (WHERE v.vote = 'abstain') AS abstain_count
  FROM votes v
  WHERE v.drep_id = ANY(drep_ids)
  GROUP BY v.drep_id;
$$;

-- Add metadata fetch tracking columns to dreps table
-- Enables the CIP-119 metadata fetcher to track fetch status and freshness
-- Last updated: 2026-11-20 (originally written 2026-07-28 as 004; renumbered to 005)

-- =============================================================================
-- DREPS TABLE EXTENSIONS
-- =============================================================================

ALTER TABLE dreps ADD COLUMN IF NOT EXISTS metadata_fetch_status TEXT;
-- Allowed values: 'ok' (fetched, hash-verified by Koios, and parsed)
--                 'no_anchor' (DRep has no metadata URL registered)
--                 'hash_mismatch' (document does not match the on-chain anchor hash; never displayed)
--                 'unreachable' (anchor URL set but Koios could not retrieve the document)
--                 'invalid_json' (fetched but could not parse as JSON)
--                 'schema_mismatch' (valid JSON but missing all significant fields)
-- NULL means not yet attempted

ALTER TABLE dreps ADD COLUMN IF NOT EXISTS metadata_fetched_at TIMESTAMPTZ;
-- Timestamp when the metadata was last fetched, used to detect staleness

-- Create an index on metadata_fetch_status for querying dreps needing a refresh
CREATE INDEX IF NOT EXISTS idx_dreps_metadata_fetch_status ON dreps(metadata_fetch_status);

-- Add a composite index for finding dreps that need a metadata check
-- (either never fetched, or hash doesn't match current anchor)
CREATE INDEX IF NOT EXISTS idx_dreps_metadata_check ON dreps(voting_anchor_hash, metadata_fetch_status);

-- =============================================================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================================================

COMMENT ON COLUMN dreps.metadata_fetch_status IS
'Status of the most recent CIP-119 metadata fetch attempt. Values: ok, no_anchor, unreachable, hash_mismatch, invalid_json, schema_mismatch, or NULL if never attempted.';

COMMENT ON COLUMN dreps.metadata_fetched_at IS
'Timestamp of the most recent CIP-119 metadata fetch attempt, used to detect staleness and avoid re-fetching unchanged data.';
