/** The DRep Overview as stored and shown. Shared by server and browser. */

export interface OverviewQuoteItem {
  label: string;
  quote: string;
  source_index: number;
}

export interface OverviewFacts {
  votes_cast: number;
  votes_eligible: number;
  participation_pct: number | null;
  explained_pct: number | null;
  early_pct: number | null;
  missed: number;
  tenure_epochs: number;
  first_epoch: number | null;
  split: { yes: number; no: number; abstain: number };
  delegators: number;
  ada: number;
}

export interface Overview {
  headline: string | null;
  values: OverviewQuoteItem[];
  affiliations: OverviewQuoteItem[];
  facts: OverviewFacts;
}

export interface OverviewSource {
  index: number;
  kind: 'profile' | 'rationale';
  url: string | null;
  proposal_id: string | null;
  date?: string;
}

export interface OverviewRecord {
  drep_id: string;
  overview: Overview;
  sources: OverviewSource[];
  generated_at: string;
  season_number: number | null;
  model: string;
  reply: { response: string; updated_at: string } | null;
}
