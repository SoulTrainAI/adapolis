-- Basic Season Cards and the house set (Jason, 2026-11-28). Safe to run more than once.
--  * Every DRep who voted in a season gets a card: DRep All-Star (top 10, still in
--    season_champions with its edition) or a basic Season Card. season_cards
--    records every one of them with its stats at the final whistle.
--  * season_claims gains the 'house' claimant: the ADApolis wallet's one copy of
--    every card (the full-set archive).

CREATE TABLE IF NOT EXISTS season_cards (
  season_number INTEGER NOT NULL REFERENCES seasons(season_number),
  drep_id TEXT NOT NULL REFERENCES dreps(drep_id),
  season_rank INTEGER NOT NULL,
  season_points INTEGER NOT NULL,
  all_star BOOLEAN NOT NULL DEFAULT FALSE,
  card JSONB NOT NULL,                               -- card stats at the season's end
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (season_number, drep_id)
);
CREATE INDEX IF NOT EXISTS idx_season_cards_rank ON season_cards(season_number, season_rank);

ALTER TABLE season_cards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "season_cards_select_public" ON season_cards;
CREATE POLICY "season_cards_select_public" ON season_cards FOR SELECT USING (true);
GRANT SELECT ON season_cards TO anon, authenticated;
GRANT ALL ON season_cards TO service_role;

ALTER TABLE season_claims DROP CONSTRAINT IF EXISTS season_claims_claimant_type_check;
ALTER TABLE season_claims ADD CONSTRAINT season_claims_claimant_type_check
  CHECK (claimant_type IN ('drep', 'team', 'delegator', 'house'));
