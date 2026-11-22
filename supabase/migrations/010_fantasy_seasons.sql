-- Fantasy seasons and rosters (Season 1 drafting; docs/SEASONS.md)
-- A season is a 6-epoch window on the grid from epoch 666. Players sign in
-- with a wallet (stake address) and draft 5 DReps; each pick snapshots the
-- DRep's underdog multiplier at draft time. Points come only from process
-- (Cardinal Rule), computed from the season engine, never stored per vote here.
-- Public reads; all writes go through the server with the service role.
-- Safe to run more than once.
-- Created: 2026-11-21

CREATE TABLE IF NOT EXISTS seasons (
  season_number INTEGER PRIMARY KEY CHECK (season_number >= 1),
  grid_window INTEGER NOT NULL UNIQUE,              -- window index on the 6-epoch grid
  start_epoch INTEGER NOT NULL,
  end_epoch INTEGER NOT NULL CHECK (end_epoch >= start_epoch),
  starts_at TIMESTAMPTZ NOT NULL,                   -- first block time of start_epoch
  draft_locks_at TIMESTAMPTZ NOT NULL,              -- starts_at + 24h; rosters frozen after this
  ends_at TIMESTAMPTZ NOT NULL,
  name TEXT,                                        -- optional theme, e.g. "The Treasury Season"
  finalized_at TIMESTAMPTZ,                         -- set once final standings are recorded
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (draft_locks_at > starts_at AND ends_at > starts_at)
);

CREATE TABLE IF NOT EXISTS fantasy_rosters (
  roster_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_number INTEGER NOT NULL REFERENCES seasons(season_number),
  stake_address TEXT NOT NULL CHECK (stake_address ~ '^stake1u[02-9ac-hj-np-z]{52}$'),
  team_name TEXT CHECK (team_name IS NULL OR char_length(team_name) BETWEEN 1 AND 40),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (season_number, stake_address)              -- one team per wallet per season
);

CREATE TABLE IF NOT EXISTS fantasy_roster_picks (
  roster_id UUID NOT NULL REFERENCES fantasy_rosters(roster_id) ON DELETE CASCADE,
  slot SMALLINT NOT NULL CHECK (slot BETWEEN 1 AND 5),
  drep_id TEXT NOT NULL REFERENCES dreps(drep_id),
  -- Size-based multiplier fixed at draft time (1.0 to 1.5), never rank-based
  underdog_multiplier NUMERIC(4,3) NOT NULL CHECK (underdog_multiplier BETWEEN 1 AND 1.5),
  picked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (roster_id, slot),
  UNIQUE (roster_id, drep_id)                        -- no drafting the same DRep twice
);

CREATE INDEX IF NOT EXISTS idx_fantasy_rosters_season ON fantasy_rosters(season_number);
CREATE INDEX IF NOT EXISTS idx_fantasy_roster_picks_drep ON fantasy_roster_picks(drep_id);  -- "drafted by N teams"

ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE fantasy_rosters ENABLE ROW LEVEL SECURITY;
ALTER TABLE fantasy_roster_picks ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "seasons_select_public" ON seasons FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "fantasy_rosters_select_public" ON fantasy_rosters FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "fantasy_roster_picks_select_public" ON fantasy_roster_picks FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

GRANT ALL ON seasons, fantasy_rosters, fantasy_roster_picks TO service_role;
GRANT SELECT ON seasons, fantasy_rosters, fantasy_roster_picks TO anon, authenticated;
