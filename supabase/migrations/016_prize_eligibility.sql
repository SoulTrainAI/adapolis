-- Prize eligibility (docs/GAME.md, 2026-11-23). Anyone can play; only teams whose
-- wallet delegates at least 100 ADA (to any DRep, or Abstain / No Confidence)
-- compete for Champion Cards and Season Trophies. Checked from Cardano's
-- per-epoch stake snapshot, so the same ADA can't qualify two wallets.
-- Safe to run more than once.

-- Delegated before the roster lock epoch (recorded by the cron after the lock).
ALTER TABLE fantasy_rosters ADD COLUMN IF NOT EXISTS eligible_at_lock BOOLEAN;
-- Still delegated with at least 100 ADA at the season's end (recorded when the season is finalized).
ALTER TABLE fantasy_rosters ADD COLUMN IF NOT EXISTS prize_eligible BOOLEAN;
