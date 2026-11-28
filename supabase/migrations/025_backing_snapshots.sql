-- Momentum (Jason, 2026-11-28): a Cardanathon bonus for DReps whose backing
-- grows season over season. These tables keep one snapshot per epoch so the
-- bonus can compare season averages. Safe to run more than once.

-- Each DRep's backing, captured once per epoch by the cron pipeline.
CREATE TABLE IF NOT EXISTS drep_backing_snapshots (
  drep_id TEXT NOT NULL REFERENCES dreps(drep_id) ON DELETE CASCADE,
  epoch INTEGER NOT NULL,
  amount_lovelace BIGINT NOT NULL DEFAULT 0,
  -- Every live delegator (null for epochs backfilled from Koios power history)
  delegators INTEGER,
  -- Delegators holding 100+ ADA; null when not counted (backfill, or DReps too large to page)
  qualified_delegators INTEGER,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (drep_id, epoch)
);
CREATE INDEX IF NOT EXISTS idx_backing_epoch ON drep_backing_snapshots(epoch);

-- Where each fantasy team's wallet was delegated, per epoch, so delegation from
-- a wallet to a DRep it drafted never counts toward that DRep's Momentum.
CREATE TABLE IF NOT EXISTS team_wallet_snapshots (
  stake_address TEXT NOT NULL,
  epoch INTEGER NOT NULL,
  drep_id TEXT,
  amount_lovelace BIGINT NOT NULL DEFAULT 0,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (stake_address, epoch)
);

ALTER TABLE drep_backing_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_wallet_snapshots ENABLE ROW LEVEL SECURITY;

-- Backing is public chain data. Team wallet snapshots stay server-only (no policy = no public access).
DROP POLICY IF EXISTS "Public read backing snapshots" ON drep_backing_snapshots;
CREATE POLICY "Public read backing snapshots" ON drep_backing_snapshots FOR SELECT USING (true);

GRANT SELECT ON drep_backing_snapshots TO anon, authenticated;
GRANT ALL ON drep_backing_snapshots, team_wallet_snapshots TO service_role;
