# The ADApolis Game and Champion Cards — Design (2026-11-22)

Gathers every decision Jason has made about the game and the NFTs (from
`docs/SEASONS.md`, the planning chats and this session) and proposes the rest.
Supersedes CONCEPT.md sections 7 and 8 where they differ; CONCEPT.md stays
the vision document. Each line is tagged:

- **Decided**: Jason has chosen it. Built, or will be built as written.
- **Proposed**: my recommendation, waiting for Jason's call.
- **Open**: needs a decision before it can be built.

Words we use: "the game" (never "fantasy"), "team", "season", "DReps … they/their".

---

## Part 1 — The game

### 1.1 What it is

Pick five DReps before each season starts. Your team scores the season points
those DReps earn for doing the job: voting, explaining their votes, voting
early, keeping a streak. The best team at the end of the season wins.

People who would never read a governance action will follow DRep stats to win.
Civic knowledge is the side effect. (CONCEPT.md 7.2.)

### 1.2 The rule that never bends — Decided

Points come only from how DReps do the job, never from how they vote. Yes, No
and Abstain earn the same; nothing depends on whether an action passes. No
bonus for delegating to any DRep: where someone delegates is personal.

### 1.3 Seasons — Decided

- 6 epochs (about 30 days) on a fixed grid from epoch 666.
- **Season 1 = epochs 678–683, starting 4 Jan 2027.** Every later season follows
  directly. Seasons before 678 were public previews.
- Season 1 results form the **Genesis set** of Champion Cards.
- **Preseason (Jason, 2026-11-23): epochs 672–677 (5 Dec – 4 Jan) are season 0,**
  fully playable (draft, leagues, swaps, leaderboard, end-of-season snapshots) so
  everything can be tested for real. Its Champion Cards and Trophies are shown as
  tests and never minted. Season 1 starts 4 Jan with the alpha launch.

### 1.4 Joining — Decided

- Free. Connect a Cardano wallet and sign a message (no transaction, no fee).
- One team per wallet per season. Optional team name; otherwise "Team" plus the
  last 6 characters of the stake address (the full address is never shown).

### 1.5 Drafting — Decided

- Pick exactly 5 different DReps. Any registered DRep can be picked, within a
  **10-star Draft Cost** (Jason, 2026-11-26): each DRep costs 1–5 gold stars,
  stars = ceil(Projected Points ÷ (P99 of active DReps' projections ÷ 5)),
  min 1 (no projection = 1), locked when picked (migration 020). The scale
  resets each season. Chosen over fixed bands and percentile tiers because
  rank-based tiers make the long-tail top DReps bargains (on 2026-11-26 data,
  stacking them beat any other team by ~32%); proportional pricing at P99
  with 10 stars keeps that gap near 6%, so several team shapes can win.
  (First set as fixed 1–7 bands with a 25-star, then 20-star budget.)
  Holding a DRep's All-Star NFT lowers their cost by 1 **only for teams that
  play in leagues only** (not the global prize game); built once NFTs exist.
- The next season's draft is always open. Change picks freely until the
  **roster lock, 24 hours after the season's first epoch begins.**
- DReps you keep when you edit your team keep the multiplier they had when you
  first picked them.

### 1.6 Scoring — Decided

| Event | Points |
|---|---|
| Vote on a governance action | +10 |
| Rationale attached (CIP-100) | +10 |
| Fresh rationale (not reused) | +5 |
| Early vote (first half of the voting window) | +5 |
| Clean-epoch streak | +5, +10, +15, then +20 per epoch |
| Action closed with no vote while registered | 0 (ends the streak) |

No penalties: points are only ever added (Jason, 2026-11-27; was −5 for a
missed action). Team points = Σ each pick's season points × the underdog
multiplier.

### 1.7 Underdog multiplier — Decided

- 1.00× to 1.50×: `1 + 0.5 × smallness`, smallness = 1 − mean(ADA percentile,
  delegator percentile) among DReps active in the last finished season.
- Size-based, never rank-based (no reason to tank). Smooth, no cut-off.
- Locked when picked; boosts gains only.

### 1.8 Leaderboard — Decided

Live through the season (points refresh every 6 hours). Ties share a rank; the
team that drafted first is listed first.

### 1.9 Rewards — Decided

NFTs and bragging rights. Free to play: **no ADA prizes and no paid entry
without a lawyer's review** (Hawaii gambling law; roadmap Gate 4).

### 1.10 Retirements mid-season — Decided (2026-11-22)

If a drafted DRep deregisters mid-season they stop earning points, and the
player gets **one free replacement** for that slot, at the replacement's current
multiplier, any time before the season ends. Points already earned by the
retired DRep stay on the team.

### 1.11 Leagues — Decided (2026-11-22), built (needs migration 014)

Three ways to compete, all with the same one team per wallet per season:

- **Global game**: the main leaderboard and the only one that wins NFTs
  (Season Trophies). Teams opt in when they save their team (on by default).
- **Public leagues**: anyone can browse and join.
- **Private leagues**: join by invite link only.

A team can be in the global game and any number of leagues at once. Leagues
have their own leaderboards and a league champion title.

**No betting pools, in ADA or NFTs.** Under Hawaii law, gambling is staking
"something of value" on a contest's outcome, and the Attorney General's
Opinion 16-1 (2016) treats paid fantasy contests as illegal gambling; bills to
legalize them have been introduced since 2017 without passing. An NFT is
something of value, so "everyone puts in an NFT, winner takes all" is a pot
just like ADA. Promoting gambling can be a felony for the operator. Leagues are
for bragging rights. Anything more waits for the lawyer review (Gate 4).

### 1.12 Season names — Proposed

Each season is named at the end after its busiest governance theme (e.g. "The
Treasury Season"), chosen by ADApolis from the season's governance actions.
The name goes on that season's Champion Cards.

### 1.13 Player career — Proposed

A player profile per wallet: seasons played, best finish, trophies, and the
Champion Cards earned. Never resets.

### 1.14 Social — Planned (decided direction)

Shareable team images for X, "drafted by N teams" on DRep cards (live as
"Teams" on the draft page), weekly Discord recap of top teams, breakout DReps
and biggest underdog wins (partly live).

### 1.15 Later

- **Debater bonus — Decided: no (Jason, 2026-11-25).** Forum and discussion
  activity never earns points (it would reward spam and favour DReps on the
  sites we can read). It feeds the DRep Overview and Hot Takes instead (display
  only; see docs/PLAN-2026-11-25.md Phase 11).
- Delegator consistency points (staying with active DReps): Open. A scoring
  change, so Season 2 at the earliest.

---

## Part 2 — Champion Cards (NFTs)

### 2.1 What they are — Decided

Season-end trading cards that preserve a DRep's season, minted on Cardano.

- **Pure collectibles.** No holder votes, no governance rights, no royalty share
  or yield for holders, no profit promises. Status and history only.
- **Static editions.** A Champion Card is a snapshot of the card at the season's
  final whistle and never changes. The live card on adapolis.net keeps evolving.
- **Season 1 Champion Cards are the Genesis set**, stamped "Genesis".
- **No paid extra mints**, by DReps or anyone. Supply is set by the rules below.

### 2.2 Who gets enshrined — Decided (2026-11-22)

The **top 10 DReps by season points** each season.

| Season rank | Edition |
|---|---|
| #1 | Gold Champion |
| #2 | Silver |
| #3 | Bronze |
| #4–10 | Holo |

### 2.3 Who gets a copy — Decided (2026-11-22)

For each of the 10 Champion DReps:
- **The DRep: 5 copies** of their own card (to keep, gift or sell; this is how
  DReps can earn, through the market, not from ADApolis).
- **Each of the top 25 prize-eligible global teams that drafted them: 1 copy**
  (Jason, 2026-11-23).
- ~~Every wallet delegating to them~~: dropped 2026-11-23. It rewarded
  delegating to particular DReps (against 1.2) and was easy to farm.
- **A hard 7-day claim window for everyone, DReps included.** Unclaimed copies
  are never minted; then **supply is fixed forever.** Each copy is numbered
  ("3 of 12"). Typical supply: 5–15 per card.

### 2.3a Prize eligibility — Decided (2026-11-23), built (migration 016)

Anyone can play for fun. Only global teams whose wallet qualifies compete for
Season Trophies and Champion Card copies:
- delegates its vote (any DRep, Abstain or No Confidence; never which one)
  since before the season's first epoch (checked by the cron after the lock), and
- has at least 100 ADA in Cardano's stake snapshot at the season's end.
Snapshots mean the same ADA can't qualify two wallets, so fake wallets cost
real idle capital. Undelegated players are shown how to delegate.
Lawyer question: a minimum holding isn't an entry fee, but confirm.

### 2.4 Game winners — Decided (2026-11-22)

Season Trophies are one-of-one NFTs (gold, silver, bronze), six a season
(Jason, 2026-11-23):
- **Team Trophies:** the top 3 prize-eligible teams in the **global game**, with
  the team name, final points and their five picks.
- **DRep Trophies:** the top 3 DReps by season points, with their name, rank
  and season points.

Top 10 global teams get a "Finalist" badge on their player profile (not an
NFT). Trophies are given by ADApolis; players never pay or stake anything to
compete for them.

### 2.5 What's on a card — Proposed

- Image: the card front and back exactly as they looked at the season's end.
- Metadata (CIP-25): season number and name, edition, season rank, season
  points, GovScore, Power, Stamina, XP, Charisma, abilities, set ("Genesis" for
  Season 1), copy number and supply.
- Art: the DRep's own card art (their CIP-119 image or the art they set when
  claiming their card). DReps confirm they have the right to use it.

### 2.6 Minting — Decided

- **Claimers pay their own network fee and minimum ADA** (about 1.5–2 ADA,
  most of which stays with the NFT). ADApolis pays nothing to mint.
- **Royalty: a single 5% CIP-27 royalty** to the ADApolis project wallet, for
  Genesis and all seasons until Jason decides otherwise. Marketplaces honour
  CIP-27 voluntarily.
- **Testnet first.** Every mainnet mint is signed by Jason (hard checkpoint),
  after the lawyer review (Gate 4).

### 2.6a Built so far (2026-11-22)

Season-end snapshots run on the cron (`src/lib/season/finalize.ts`): champions
with their card stats, every claim (DRep 5, drafting teams 1, delegators 1 with a
7-day window) and the global top 10. Players see their claims on /collection;
champions are public at /api/seasons/champions. **Minting is not built**:
Jason asked to hold off on testnet.

### 2.7 How minting works — Proposed

- One minting policy per season, **time-locked** to close when the claim window
  ends, so nobody (ADApolis included) can mint more afterwards.
- Claims happen on /collection: connect, see what you're eligible for, sign one
  transaction that pays your own fee. The policy key co-signs on the server.
- Eligibility snapshots (teams, delegators) are taken when the season ends.
  Each wallet sees its own claims; per-card totals are public. Wallet-to-team
  links stay private.

### 2.8 Money — Decided

No DRep fee, no paid entry, no paid packs. Revenue to explore: the 5% royalty,
season sponsors (name and art on a season only, never any say over scoring),
and a Catalyst grant for the public-good parts.

---

### 2.9 Collector's Cup — Proposed (Jason, 2026-11-23), after minting exists

A separate version of the global game for collectors: you may only draft DReps
whose Champion Card NFT your wallet holds. Its own leaderboard; winners earn a
memento with a "Collector's Cup" trait. No money or ADA prizes.

Legal note (for the lawyer review): entry requires holding NFTs that can be
bought, so if the memento is a tradable NFT it is a prize of value in a contest
you need to buy into: the one part of the design that looks like a paid
contest. Recommended: make the Collector's Cup memento **non-transferable**
(a profile trophy, or a token locked to the winner's wallet), so it has
recognition value but no market value. Earliest: Season 2.

### 2.9a Collector's Cup editions — Decided (Jason, 2026-11-23), Season 2 earliest

Every minted copy is identical (edition set by rank) except the **Collector's
Cup edition**: the same card or trophy with its own frame and a "Collector's
Cup" trait. It **replaces** the regular one, so supply never grows. No other
traits.

**Checked at the season's end snapshot**, the same one used for prize
eligibility. Cards bought or claimed after it don't count. Because claims
open after the snapshot, a winner's new prizes can never unlock their own
Collector's Cup, and a card sits in one wallet at the snapshot, so it can't be
passed around to unlock several. Bought cards count if held at the snapshot.

| Prize | Collector's Cup if, at the snapshot, the wallet holds… |
|---|---|
| Team copy of a Champion Card | a Champion Card of that DRep (any season) |
| Team Trophy | a Champion Card (any season) of a DRep the team drafted this season who finished in the top 10 |
| DRep's own 5 Champion Cards | an earlier Champion Card of their own |
| DRep Trophy | an earlier Champion Card of their own |

Holding without drafting: no prize, so no Collector's Cup. Drafting without
holding: the regular prize. Season 1 (Genesis) can't have any: no Champion
Cards exist before its snapshot.

**Lawyer question:** holding a purchasable card (bought before the season
ends, never after the result is known) unlocks a rarer edition of the same
prize. Confirm this is acceptable in a free contest before the first mint.

### 2.9b Every NFT in a season — Decided summary

| NFT | Who gets it | Max per season |
|---|---|---|
| Champion Card, Gold (#1 DRep) | DRep 5 + up to 25 teams | 30 |
| Champion Card, Silver (#2) | DRep 5 + up to 25 teams | 30 |
| Champion Card, Bronze (#3) | DRep 5 + up to 25 teams | 30 |
| Champion Card, Holo (#4–10, 7 DReps) | each: DRep 5 + up to 25 teams | 210 |
| Team Trophy, Gold / Silver / Bronze | top 3 prize-eligible global teams | 3 (one-of-one each) |
| DRep Trophy, Gold / Silver / Bronze | top 3 DReps | 3 (one-of-one each) |
| **Total** | | **181** (see below) |

- **Season maximum is 181, not the sum of the rows:** 50 DRep copies (10 × 5)
  + at most 125 team copies (25 teams × the 5 DReps each drafted) + 6 trophies.
  The per-card maximum of 30 only happens if all 25 teams drafted that DRep.
  (Edge case: a team that swapped out a retired DRep who still finished top 10
  can get a 6th copy.)
- "Teams" means prize-eligible global teams in the top 25 that drafted (or
  swapped out) that DRep. Each copy is numbered against the real claimed supply.
- Any of these can be minted as its Collector's Cup edition instead (2.9a); the
  total stays the same.
- Unclaimed after the 7-day window: never minted. Real supply is usually far
  below the maximum.
- Not NFTs: the Finalist badge (top 10 teams) and the live cards on the site.
- Preseason (season 0): no NFTs; its cards are test-only.
- Delegators get nothing for delegating; claimers pay their own mint fee; 5%
  CIP-27 royalty on resales to the ADApolis wallet.

**All ADApolis cards and trophies are collectibles only, not financial
instruments:** no yield, no revenue share, no governance rights, no promise of
value, and nothing ADApolis does is aimed at their price. This is stated on
About, Methodology, Collection and every claim.

### 2.10 Pools outside ADApolis

ADApolis can't stop people running their own pools elsewhere, but it must not
facilitate them: no pool features or integrations, no links to pool sites, and
Discord rules forbid organising betting in the server. Promoting or aiding
gambling is the operator's risk.

## Decisions needed from Jason

None open for Season 1. Still to decide later: season naming (1.12), player
profiles (1.13), delegator and Debater points (1.15), and anything involving
money after the lawyer review.
