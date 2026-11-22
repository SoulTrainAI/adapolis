# Seasons & Fantasy Draft — Working Design (2026-11-21)

Refines CONCEPT.md section 7 (Fantasy DRep Draft). CONCEPT.md stays authoritative
until Jason approves folding these changes into it.

## Decided

- **Process-only points** (Cardinal Rule). Yes/No/Abstain earn the same; nothing reads outcomes.
- **Point rules** (`src/lib/season/points.ts`): vote +10, rationale +10, fresh rationale +5,
  early vote (first half of window) +5, missed action −5, streak +5/+10/+15/+20 per clean epoch.
- **Rationale points are objective only** (exists, not reused). No AI quality judging.
- **Underdog multiplier is size-based, not rank-based** (Jason, 2026-11-21). Rank-based rewards
  tanking. Size = mean of delegated-ADA percentile and delegator-count percentile among DReps
  active that season; multiplier = 1 + 0.5 × smallness; smooth, fixed at draft time.
- **Seasons:** 6 epochs. Season 0 = epochs 666–671 (public preview, no drafting).
  Season 1 starts epoch 672 (~2026-12-05).

## Assumed (Jason didn't answer; revisit before Season 1)

- **Prizes:** Season 1 is free to play with recognition only (leaderboard, titles, badges,
  Champion Card art). No ADA prizes or paid entry until a lawyer reviews (Hawaii bans gambling;
  matches roadmap Gate 4).
- **Delegation bonus:** undecided; proposed +10% team points if the player delegates to one of
  their 5. Not built.

## Next to build (Season 1)

1. Wallet sign-in via CIP-30 `signData` (message signing only; no transaction).
2. Tables: `seasons`, `fantasy_rosters` (stake address, season, 5 DRep ids, underdog snapshot).
3. Draft UI: pick 5 DReps, lock 24h after the season starts.
4. Player leaderboard: sum of drafted DReps' season points × underdog multiplier.
5. Later: delegator consistency points, Champion Cards (testnet first), prizes after legal review.
