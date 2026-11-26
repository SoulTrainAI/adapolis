-- Draft Cost stars (2026-11-25). Each pick's cost (1–7 stars, from the DRep's
-- Projected Points) is fixed when drafted, like the underdog multiplier, and a
-- team may spend at most 25 stars. Nullable: picks saved before this ran keep
-- working and are costed at today's value. Safe to run more than once.

ALTER TABLE fantasy_roster_picks ADD COLUMN IF NOT EXISTS draft_cost SMALLINT CHECK (draft_cost BETWEEN 1 AND 7);
