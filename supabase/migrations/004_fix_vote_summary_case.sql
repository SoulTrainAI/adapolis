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
