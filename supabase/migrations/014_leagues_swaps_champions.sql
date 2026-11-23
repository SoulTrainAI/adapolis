-- Leagues, global opt-in, retirement swaps and season-end snapshots (docs/GAME.md)
-- Forward-only and safe to run more than once. Public reads; all writes go
-- through the server with the service role. No existing data is changed.
-- Created: 2026-11-22

-- 1. Global game opt-in (only global teams compete for Season Trophies).
ALTER TABLE fantasy_rosters ADD COLUMN IF NOT EXISTS in_global BOOLEAN NOT NULL DEFAULT TRUE;
-- One free replacement per team per season when a drafted DRep retires.
ALTER TABLE fantasy_rosters ADD COLUMN IF NOT EXISTS swap_used BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Retirement swaps: the slot keeps the retired DRep's points earned before
-- swap_epoch (at their multiplier) and the replacement's from swap_epoch on.
ALTER TABLE fantasy_roster_picks ADD COLUMN IF NOT EXISTS swapped_from TEXT REFERENCES dreps(drep_id);
ALTER TABLE fantasy_roster_picks ADD COLUMN IF NOT EXISTS swapped_from_multiplier NUMERIC(4,3)
  CHECK (swapped_from_multiplier IS NULL OR swapped_from_multiplier BETWEEN 1 AND 1.5);
ALTER TABLE fantasy_roster_picks ADD COLUMN IF NOT EXISTS swap_epoch INTEGER;

-- 3. Leagues: persistent groups of players. A league ranks its members' teams
-- for whichever season is shown. No entry fees, no pools (gambling law).
CREATE TABLE IF NOT EXISTS leagues (
  league_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 3 AND 40),
  visibility TEXT NOT NULL CHECK (visibility IN ('public', 'private')),
  invite_code TEXT NOT NULL UNIQUE CHECK (invite_code ~ '^[A-Za-z0-9]{10}$'),
  owner_stake TEXT NOT NULL CHECK (owner_stake ~ '^stake1u[02-9ac-hj-np-z]{52}$'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS league_members (
  league_id UUID NOT NULL REFERENCES leagues(league_id) ON DELETE CASCADE,
  stake_address TEXT NOT NULL CHECK (stake_address ~ '^stake1u[02-9ac-hj-np-z]{52}$'),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (league_id, stake_address)
);

CREATE INDEX IF NOT EXISTS idx_league_members_stake ON league_members(stake_address);
CREATE INDEX IF NOT EXISTS idx_leagues_public ON leagues(visibility) WHERE visibility = 'public';

-- 4. Season-end snapshots, recorded once when a season ends (cron).
-- Champion DReps: the season's top 10 by season points, with their card as it stood.
CREATE TABLE IF NOT EXISTS season_champions (
  season_number INTEGER NOT NULL REFERENCES seasons(season_number),
  rank SMALLINT NOT NULL CHECK (rank BETWEEN 1 AND 10),
  drep_id TEXT NOT NULL REFERENCES dreps(drep_id),
  edition TEXT NOT NULL CHECK (edition IN ('gold', 'silver', 'bronze', 'holo')),
  season_points INTEGER NOT NULL,
  card JSONB NOT NULL,                               -- card stats at the season's end
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (season_number, rank),
  UNIQUE (season_number, drep_id)
);

-- Who may claim a copy of each Champion Card. claimant is a stake address
-- (teams, delegators) or the DRep ID itself (the DRep's 5 copies).
CREATE TABLE IF NOT EXISTS season_claims (
  season_number INTEGER NOT NULL REFERENCES seasons(season_number),
  drep_id TEXT NOT NULL REFERENCES dreps(drep_id),
  claimant TEXT NOT NULL,
  claimant_type TEXT NOT NULL CHECK (claimant_type IN ('drep', 'team', 'delegator')),
  copies SMALLINT NOT NULL CHECK (copies BETWEEN 1 AND 5),
  claim_closes_at TIMESTAMPTZ,                       -- delegators only: 7 days after the season ends
  claimed_at TIMESTAMPTZ,                            -- set when minted (not yet built)
  PRIMARY KEY (season_number, drep_id, claimant, claimant_type)
);

CREATE INDEX IF NOT EXISTS idx_season_claims_claimant ON season_claims(claimant);

-- Final global standings: places 1–3 win Season Trophies, 1–10 are Finalists.
CREATE TABLE IF NOT EXISTS season_podium (
  season_number INTEGER NOT NULL REFERENCES seasons(season_number),
  place SMALLINT NOT NULL CHECK (place BETWEEN 1 AND 10),
  stake_address TEXT NOT NULL,
  team_name TEXT NOT NULL,
  points NUMERIC(10,1) NOT NULL,
  picks JSONB NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (season_number, place)
);

ALTER TABLE leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE league_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE season_champions ENABLE ROW LEVEL SECURITY;
ALTER TABLE season_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE season_podium ENABLE ROW LEVEL SECURITY;

-- Champions are a public record. Claims, podium, leagues and memberships are
-- read through the server only: they link wallets to teams, and private
-- leagues' invite codes must not be readable with the public key. The site
-- shows each wallet its own claims and publishes per-card totals.
DO $$ BEGIN
  CREATE POLICY "season_champions_select_public" ON season_champions FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

GRANT ALL ON leagues, league_members, season_champions, season_claims, season_podium TO service_role;
GRANT SELECT ON season_champions TO anon, authenticated;
