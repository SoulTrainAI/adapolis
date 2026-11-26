-- Hot Takes "State of the debate" (2026-11-26): a short, neutral AI summary of
-- what DReps are arguing about on each open action, shown above the verbatim
-- quotes. Safe to run more than once.
ALTER TABLE proposal_arguments ADD COLUMN IF NOT EXISTS debate_summary TEXT CHECK (debate_summary IS NULL OR length(debate_summary) <= 600);
