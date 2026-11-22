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
- **Seasons:** 6-epoch windows on a grid from epoch 666. Season 1 starts at epoch 678
  (Jan 4, 2027; Jason, 2026-11-21), and drafting is open now for testing. The default lives
  in code; `SEASON_ONE_START_EPOCH` in Railway overrides it ("off" = previews only).
- **No delegation bonus** (Jason, 2026-11-21): where someone delegates is personal; the game
  never rewards delegating to a particular DRep.
- **Prizes:** winners get NFTs and bragging rights. Season 1 champions form the Genesis set.
- **Cards are pure collectibles** (Jason, 2026-11-21): no holder votes or governance of any kind,
  no royalty share for collectors.
- **No DRep fee** (Jason, 2026-11-21): every registered DRep is in the league automatically.
- **Royalty:** a single 5% CIP-27 royalty to Jason's project wallet, for Genesis and all seasons
  until he decides otherwise. DReps earn via their 5 copies of their own card.
- **Minting cost:** claimers pay their own network fee/min-ADA. Mainnet minting is a hard
  checkpoint: Jason signs.
- **Other revenue to explore:** season sponsors (name/art only, no scoring influence), Catalyst grant.

## Assumed (Jason didn't answer; revisit before Season 1)

- **Free to play.** No ADA prizes or paid entry until a lawyer reviews (Hawaii bans gambling;
  roadmap Gate 4).

## Next to build (Season 1)

1. Wallet sign-in via CIP-30 `signData` (message signing only; no transaction).
2. Tables: `seasons`, `fantasy_rosters` (stake address, season, 5 DRep ids, underdog snapshot).
3. Draft UI: pick 5 DReps, lock 24h after the season starts.
4. Player leaderboard: sum of drafted DReps' season points × underdog multiplier.
5. Social: private leagues with invite links, shareable team images, "drafted by N teams"
   counter on DRep cards, weekly recap.
6. Later: delegator consistency points, Champion Cards (testnet first, living stats),
   lawyer review before any mainnet mint (Gate 4).
