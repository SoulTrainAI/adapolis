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

### 1.6 Scoring — Decided

| Event | Points |
|---|---|
| Vote on a governance action | +10 |
| Early vote (first half of the voting window) | +5 |
| Original rationale (CIP-100; not identical to any rationale posted before, by anyone) | +5 |
| Clean-epoch streak | +5, +10, +15, then +20 per epoch |
| Action closed with no vote while registered | 0 (ends the streak) |

No penalties: points are only ever added (Jason, 2026-11-27; was −5 for a
missed action). A rationale alone no longer scores (was +10); only an original
one does, compared by content hash against every earlier rationale. Team points = Σ each pick's season points.

### 1.7 Underdog multiplier — Removed from the game (Jason, 2026-11-27)

Dropped before the Preseason: the 10-star Draft Cost already balances the
draft, and stars priced on projected points made small DReps with a 1.5×
multiplier underpriced. The same size-based bonus (`1 + 0.5 × smallness`,
smallness = 1 − mean(ADA percentile, delegator percentile)) now drives the DRep
Match-maker's Decentralization weight instead. Cards still show it.
Stored `underdog_multiplier` values on picks are ignored.

### 1.8 Leaderboard — Decided

Live through the season (points refresh every 6 hours). Ties share a rank; the
team that drafted first is listed first.

### 1.9 Rewards — Decided

NFTs and bragging rights. Free to play: **no ADA prizes and no paid entry
without a lawyer's review** (Hawaii gambling law; roadmap Gate 4).

### 1.10 Retirements mid-season — Decided (2026-11-22)

If a drafted DRep deregisters mid-season they stop earning points, and the
player gets **one free replacement** for that slot, any time before the season
ends. Points already earned by the
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

### 2.3 Who gets a copy — Decided (2026-11-22; widened 2026-11-28)

Every DRep who voted at least once in a season has a card for it (Jason,
2026-11-28): the **DRep All-Star** card (top 10, with edition) or a basic
**Season Card** (that season's stats; no edition, no foil, no All-Star
traits). Season Cards are minted under their own policy, so marketplaces list
them as a separate collection and All-Star supply is unchanged. Built:
`src/lib/season/claims.ts`, migration 026.

- **The DRep: 5 copies** of their own card (to keep, gift or sell; this is how
  DReps can earn, through the market, not from ADApolis).
- **Each of the top 25 prize-eligible global teams: 1 card per pick** (the
  slot's current DRep, or the one it replaced if only they voted): the All-Star
  card for a top-10 DRep, the Season Card otherwise. Up to 5 per team.
- **The ADApolis house wallet: 1 of every card**, the season's full set, kept
  as an archive (Jason, 2026-11-28). Recorded automatically at the season's end; the mint
  transaction is prepared for Jason to sign (mainnet signing stays manual).
- ~~Every wallet delegating to them~~: dropped 2026-11-23. It rewarded
  delegating to particular DReps (against 1.2) and was easy to farm.
- **One mint window for everyone, DReps included** (opens 48 h after the
  season ends, closes 3 epochs after). Unclaimed copies are never minted; then
  **supply is fixed forever.** Each copy is numbered ("3 of 12").

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

### 2.9 Collector's Cup — Dropped (Jason, 2026-11-28)

Both the Collector's Cup game and Collector's Cup editions are dropped: too
much complexity for the value, and they were the design's main "buy to
improve your prize" legal risk.

### 2.9c Packs — Dropped (Jason, 2026-11-28)

No packs, paid or random. The house full set (2.3) is an archive, not stock
for sale. 2.8 stands: no paid packs.

### 2.9b Every NFT in a season — Decided summary

| NFT | Who gets it | Max per season |
|---|---|---|
| DRep All-Star, Gold (#1 DRep) | DRep 5 + up to 25 teams + house 1 | 31 |
| DRep All-Star, Silver (#2) | DRep 5 + up to 25 teams + house 1 | 31 |
| DRep All-Star, Bronze (#3) | DRep 5 + up to 25 teams + house 1 | 31 |
| DRep All-Star, Holo (#4–10, 7 DReps) | each: DRep 5 + up to 25 teams + house 1 | 217 |
| Season Card (every other DRep who voted) | each: DRep 5 + top-25 teams that drafted them + house 1 | uncapped (separate collection) |
| Team Trophy, Gold / Silver / Bronze | top 3 prize-eligible global teams | 3 (one-of-one each) |
| DRep Trophy, Gold / Silver / Bronze | top 3 DReps | 3 (one-of-one each) |
| **All-Star total** | | **191** (see below) |

- **All-Star maximum is 191, not the sum of the rows:** 50 DRep copies (10 × 5)
  + at most 125 team copies (25 teams × 5 picks) + 10 house copies + 6
  trophies, plus 10 Team Test Mint pressings. Team copies are shared between
  All-Stars and Season Cards: each top-25 team mints at most 5 cards in all.
- Season Cards: 5 per DRep who voted, plus team and house copies. Real supply
  is far lower because unclaimed copies are never minted.
- Unclaimed when the mint window closes: never minted.
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
