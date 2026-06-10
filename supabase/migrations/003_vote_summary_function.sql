-- Vote Summary Function for Efficient Aggregation
-- Aggregates vote counts by DRep without hitting the 1,000-row PostgREST limit
-- Created: 2026-06-09

CREATE OR REPLACE FUNCTION get_vote_summaries(drep_ids text[])
RETURNS TABLE(drep_id text, yes_count bigint, no_count bigint, abstain_count bigint)
LANGUAGE sql STABLE AS $$
  SELECT
    drep_id,
    COUNT(*) FILTER (WHERE vote = 'Yes') as yes_count,
    COUNT(*) FILTER (WHERE vote = 'No') as no_count,
    COUNT(*) FILTER (WHERE vote = 'Abstain') as abstain_count
  FROM votes
  WHERE drep_id = ANY(drep_ids)
  GROUP BY drep_id;
$$;
