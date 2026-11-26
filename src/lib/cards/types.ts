/**
 * Trading-card data shared by the server and the browser. Every number is a
 * process stat (showing up, explaining, timing): never which way a DRep voted
 * or whether its side won (Cardinal Rule).
 */

export interface CardAbility {
  id: string;
  label: string;
  detail: string;
  /** 1 Bronze, 2 Silver, 3 Gold; null for one-level abilities */
  tier: 1 | 2 | 3 | null;
}

export interface CardSummary {
  drep_id: string;
  name: string | null;
  image: string | null;
  registered: boolean;
  do_not_list: boolean;
  /** Scoreboard rank by GovScore among registered DReps */
  rank: number | null;
  total: number;
  ada: number;
  delegators: number;
  govscore: number | null;
  /** GovScore at the end of each of the last 12 windows, oldest first */
  govscore_trend: Array<number | null>;
  /** Change since the end of the previous window, and three windows back */
  delta1: number | null;
  delta3: number | null;
  participation: number | null;
  votes_cast: number;
  votes_eligible: number;
  streak: number;
  season: { window: number; label: string; points: number; votes: number; rationales: number; early: number; missed: number; rank: number | null };
  /** Fantasy points per window for the last 12 windows, oldest first */
  points_trend: number[];
  last_points: number | null;
  /** Average points per window the DRep took part in (completed windows) */
  avg_points: number | null;
  best_points: number;
  /** Average of the last three completed windows it took part in */
  form: number | null;
  /** Projected points next season: form, else average */
  projection: number | null;
  /** Draft Cost in stars (1–5), scaled to this season's projections; set by getCards. */
  draft_cost?: number;
  lifetime: {
    votes: number;
    points: number;
    seasons: number;
    rationale_rate: number | null;
    early_rate: number | null;
    missed: number;
    first_epoch: number | null;
    tenure_epochs: number;
  };
  /** Epoch of the DRep's latest vote */
  last_vote_epoch: number | null;
  /** Votes and missed actions across the current and previous windows (about 6–12 epochs) */
  recent: { votes: number; missed: number };
  rookie: boolean;
  /** Size-based draft multiplier against the latest finished window */
  underdog: number;
  /** Share of this season's fantasy teams that drafted the DRep; null before anyone drafts */
  ownership: number | null;
  archetype: CardAbility | null;
  abilities: CardAbility[];
}

export interface SeasonLine {
  window: number;
  label: string;
  start_epoch: number;
  end_epoch: number;
  in_progress: boolean;
  played: boolean;
  points: number;
  votes: number;
  rationales: number;
  early: number;
  missed: number;
  streak_points: number;
  govscore_end: number | null;
  /** Career votes cast by the end of this window (XP). */
  career_votes_end: number;
  /** Career participation by the end of this window (Stamina). */
  participation_end: number | null;
}

export interface CardDetail {
  summary: CardSummary;
  seasons: SeasonLine[];
  bio: string | null;
  /** Complete quote that fits the card back, or null (never truncated). */
  quote: string | null;
  /** Who wrote the quote: the DRep, or ADApolis flavor text for DReps without one. */
  quote_by: 'drep' | 'adapolis';
  links: Array<{ label: string; url: string }>;
  votes: { yes: number; no: number; abstain: number };
  /** Attributes a minted card would carry (CIP-25 / CIP-68 metadata) */
  metadata: Record<string, string | number>;
}

export interface CardsPayload {
  computed_at: string;
  current_epoch: number;
  current_window: number;
  cards: CardSummary[];
}

export interface Tier {
  label: string;
  frame: string;
  glow: string;
  art: string;
  accent: string;
}

/** Foil tier by scoreboard rank, like rarity on a trading card. */
export function tierFor(rank: number | null): Tier {
  if (rank === 1)
    return { label: 'Legend', frame: 'from-yellow-200 via-amber-500 to-yellow-300', glow: 'shadow-amber-500/40', art: 'rgba(245,158,11,0.45)', accent: 'text-amber-300' };
  if (rank === 2)
    return { label: 'Silver', frame: 'from-slate-100 via-slate-400 to-slate-200', glow: 'shadow-slate-300/30', art: 'rgba(203,213,225,0.35)', accent: 'text-slate-200' };
  if (rank === 3)
    return { label: 'Bronze', frame: 'from-orange-300 via-orange-700 to-amber-400', glow: 'shadow-orange-600/30', art: 'rgba(234,88,12,0.4)', accent: 'text-orange-300' };
  if (rank !== null && rank <= 10)
    return { label: 'Holographic', frame: 'from-fuchsia-400 via-violet-500 to-cyan-400', glow: 'shadow-violet-500/30', art: 'rgba(139,92,246,0.45)', accent: 'text-fuchsia-300' };
  if (rank !== null && rank <= 50)
    return { label: 'Rare', frame: 'from-sky-300 via-blue-600 to-sky-400', glow: 'shadow-sky-500/20', art: 'rgba(14,165,233,0.35)', accent: 'text-sky-300' };
  return { label: 'Common', frame: 'from-slate-200 via-slate-400 to-slate-300', glow: '', art: 'rgba(148,163,184,0.28)', accent: 'text-slate-200' };
}
