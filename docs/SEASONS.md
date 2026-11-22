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
- **Seasons:** 6-epoch windows on a grid from epoch 666. Every window is a public preview
  until Season 1 launches "when we're ready to go live" (Jason, 2026-11-21): set
  `SEASON_ONE_START_EPOCH` in Railway; it snaps to the grid.
- **No delegation bonus** (Jason, 2026-11-21): where someone delegates is personal; the game
  never rewards delegating to a particular DRep.
- **Prizes:** winners get NFTs and bragging rights. Season 1 champions form the Genesis set.

## Assumed (Jason didn't answer; revisit before Season 1)

- **Free to play.** No ADA prizes or paid entry until a lawyer reviews (Hawaii bans gambling;
  roadmap Gate 4).

## Next to build (Season 1)

1. Wallet sign-in via CIP-30 `signData` (message signing only; no transaction).
2. Tables: `seasons`, `fantasy_rosters` (stake address, season, 5 DRep ids, underdog snapshot).
3. Draft UI: pick 5 DReps, lock 24h after the season starts.
4. Player leaderboard: sum of drafted DReps' season points × underdog multiplier.
5. Later: delegator consistency points, Champion Cards (testnet first), prizes after legal review.
