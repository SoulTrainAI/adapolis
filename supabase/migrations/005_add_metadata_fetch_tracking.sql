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
