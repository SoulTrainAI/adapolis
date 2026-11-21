# ADApolis — The Civic Engine for Cardano Governance

**Concept Document — v1.0**
**Last updated:** 2026-06-09
**Status:** Living document. Update as decisions are made.

---

## Table of Contents

1. [Vision](#1-vision)
2. [Strategic Positioning](#2-strategic-positioning)
3. [The Six Reforms — Project Background](#3-the-six-reforms--project-background)
4. [User Categories](#4-user-categories)
5. [Platform Architecture](#5-platform-architecture)
6. [The Scoreboard — Phase 1 Anchor Product](#6-the-scoreboard--phase-1-anchor-product)
7. [Fantasy DRep Draft — Phase 2](#7-fantasy-drep-draft--phase-2)
8. [Champion NFT Cards — Phase 3](#8-champion-nft-cards--phase-3)
9. [Living NFT + Soulbound Badge System](#9-living-nft--soulbound-badge-system)
10. [Engagement Layer](#10-engagement-layer)
11. [Devil's Advocate Steelman Mini-Game](#11-devils-advocate-steelman-mini-game)
12. [Off-Chain Temperature Check](#12-off-chain-temperature-check)
13. [DRep Workstation](#13-drep-workstation)
14. [Layman On-Ramp](#14-layman-on-ramp)
14A. [Ecosystem Map](#14a-ecosystem-map)
15. [Structured Deliberation — Argument Graph](#15-structured-deliberation--argument-graph)
15A. [DRep Coalitions](#15a-drep-coalitions)
16. [The Lab — Counterfactual Simulator](#16-the-lab--counterfactual-simulator)
17. [AI Layer — Economics and Transparency](#17-ai-layer--economics-and-transparency)
18. [Notifications, ADAmail, Calendar](#18-notifications-adamail-calendar)
19. [Midnight Privacy Layer](#19-midnight-privacy-layer)
20. [Smart Contract Architecture](#20-smart-contract-architecture)
21. [Open Data and Progressive Decentralization](#21-open-data-and-progressive-decentralization)
22. [Six Rings of Expansion](#22-six-rings-of-expansion)
23. [Economics and Monetization](#23-economics-and-monetization)
24. [Third-Party Integration Strategy](#24-third-party-integration-strategy)
25. [What We Deliberately Do Not Build](#25-what-we-deliberately-do-not-build)
26. [User Journeys](#26-user-journeys)
27. [Tech Stack](#27-tech-stack)
28. [Phase Plan Summary](#28-phase-plan-summary)
29. [Open Questions](#29-open-questions)
30. [Version Log](#30-version-log)

---

## 1. Vision

**ADApolis is the civic engine for Cardano governance — the place where deliberation actually happens, where DReps build their reputation, where delegators find their voice, and where every governance decision is debated, recorded, and signaled before it ever touches the chain.**

We turn governance from a chore into a sport, without sacrificing substance. DReps become recognizable figures with stats, rivalries, and seasons. Delegators move from "I don't know what's happening" to "my voice is represented" in under three minutes. Researchers and reformers get the open data corpus that makes the next wave of governance reform possible.

Long-term, ADApolis is not just a Cardano tool. The same architecture — transparent reputation, gamified civic participation, on-chain accountability — is the missing layer beneath every democratic institution on earth. We start with Cardano because it's the most technically accessible entry point. We expand outward through six concentric rings (Section 22).

---

## 1A. Lean Startup Discipline

ADApolis is a lean-startup project, not a venture-funded burn-money product. The founder ships solo at ~10 hours/week with AI assistance. Discipline matters more than ambition. The full vision in this document is the destination, not the v1 scope.

The principles that govern execution:

**1. Ship narrow.** Every phase has one priority deliverable. Other features wait. The Scoreboard is more valuable shipped alone than half-built alongside three other half-built things.

**2. Listen to Coalitions first.** The DRep DAO is the most informed customer ADApolis will ever have. Coalitions need infrastructure they cannot build themselves. They have budgets. They are willing to pay for things that make their job easier. Building for Coalitions first generates revenue, generates feedback, and generates social proof — three of the four things lean startups need most.

**3. Kill features that don't earn their place.** Earlier drafts of this document had Guilds, Battle Pass, Quests-as-rewards, and other engagement mechanisms. Many were cut. Guilds were merged into Coalitions. Steelman and Devil's Advocate awards were unified into Mind-Mover. Living NFT + Soulbound badges + Civic Character class were merged into a single Civic Identity NFT. Every consolidation is a victory.

**4. Make revenue early.** Coalition Quarterly Reports launch with the Scoreboard in Phase 2 — first revenue in month 4, not month 10. ADApolis Intel subscriptions begin in Phase 5, not Phase 10. Money buys time and credibility. A free product is harder to sustain than a paid one.

**5. Be useful before being clever.** The Scoreboard's job is to be the best DRep discovery tool on Cardano. The DRep Workstation's job is to make DReps' work materially easier. The Layman On-Ramp's job is to get a non-technical user delegated in three minutes. Each surface earns its place by being *useful*, not by being *novel*.

**6. Trust the Cardinal Rule.** Fantasy mechanics reward process metrics, never vote outcomes. This is non-negotiable across every layer of the platform. The moment we drift on this, we have built the prediction-market trap we explicitly designed against.

**7. Stay solo until growth demands otherwise.** No premature co-founders, no premature hires, no premature paid services. The build proceeds through Phase 7 (Champion Drop) before any "team" considerations are taken seriously. Solo + AI is the operating model.

**8. Treat the docs as the product spec.** CONCEPT.md and ROADMAP.md are the source of truth. Decisions get logged in version history. The Open Questions section tracks what is *not* yet decided. When in doubt, edit the doc before editing the code.

---

## 2. Strategic Positioning

### 2.1 The Strategic Wedge: the Off-Chain Temperature Check

Cardano governance has **no designated deliberation space**. Discussion is scattered across Cardano Forum, Discord, Twitter, individual DRep blogs, and Intersect working groups. By the time an on-chain vote opens, most of the substantive discussion is fragmented or lost. There is no shared record of *why* DReps voted the way they did, no structured place for delegators to weigh in, no canonical source of truth for what arguments were made.

ADApolis fills this vacuum with the **Off-Chain Temperature Check** mechanism (Section 12). During the deliberation phase, the platform runs a non-binding, non-financial, wallet-signed signal vote on the same question that's heading to the chain. DReps who participate publicly build reputation. DReps who skip are marked "Silent on [Proposal X]." Within months, *not* using the platform becomes a liability for any serious DRep — delegators demand it.

By the time the on-chain vote opens, the deliberation is over, recorded, and citable. The on-chain vote becomes ratification of a process that already happened transparently. **This is Reform #4 (mandatory structured deliberation) implemented at the application layer, without any protocol change required.** The eventual CIP just legalizes what is already normal.

The Temperature Check is not a prediction market. It collects preferences, not bets. Nobody profits from the outcome. It exists purely to surface the wisdom-of-crowds signal cleanly, without financial corruption (see Section 25 for why prediction markets on vote outcomes are explicitly out of scope).

### 2.2 Relationship to GovTool, Intersect, and Existing Tooling

**We do not compete with GovTool on vote-casting.** GovTool is Intersect-blessed, mature, and has wallet trust. In v1, ADApolis's delegation and vote-cast flows link out to GovTool. We do not sign transactions ourselves until we have earned that trust. Frame: "Research on ADApolis, delegate via GovTool."

What ADApolis adds on top:
- Deliberation layer (GovTool has none)
- Multi-source DRep reputation scoring (GovTool has minimal profiles)
- AI-assisted proposal summaries (GovTool shows raw text)
- Delegator engagement tools (GovTool is read-only for delegators)
- Fantasy + NFT + Civic Identity layers
- Counterfactual simulation (The Lab)

We complement, not replace.

### 2.3 The Substance / Fantasy Firewall

The single design principle that keeps ADApolis legitimate:

**Substance is the floor; fantasy is the ceiling.**

You cannot use the fantasy layer to corrupt the substance:
- You cannot buy reputation
- You cannot bet on actual on-chain vote outcomes
- You cannot pay for visibility on arguments
- The platform does not sell DRep slots or rankings
- All scoring and fantasy points come from **process metrics** (participation, rationale quality, consistency, engagement), never from **outcome metrics** (whose side won the vote)

But you can use substance to climb fantasy:
- Posting good arguments earns reputation, which lifts rankings
- Voting consistently with stated rationales builds DRep stats
- Changing other users' minds earns measurable credits
- Picking a breakout DRep early earns the Underdog Multiplier

The two layers reinforce; the boundary between them is what keeps the system legitimate.

### 2.4 The Cardinal Rule (Restated for Emphasis)

**Fantasy points come from process, never from outcomes.**

A DRep gets points for showing up, writing rationales, engaging in debate, maintaining streaks, responding to delegators. They do not get points for being on the winning side of any specific vote. The moment we tie points to vote outcomes, we have reintroduced the prediction-market corruption pattern we explicitly designed against. This is non-negotiable across every layer of the platform.

### 2.5 Accountability Through Transparency, Not Hierarchy

A recurring debate in decentralized governance asks: "Decentralization causes diffuse responsibility and slow coordination — should we add hierarchy?" The most common proposed answer is to elect a President, Council, or executive arbiter to provide direction and accountability.

**ADApolis's position: we make decentralization accountable through transparency, not through hierarchy.**

We agree that diffuse responsibility is a real problem. We disagree that hierarchy is the answer. Once you create a centralized executive role on a decentralized chain, you create the highest-status political prize in the ecosystem — and the same political pathologies that hierarchy is meant to fix get amplified by it. "Revocable in principle" leadership is rarely revocable in practice. Cardano's founding identity rejects this pattern for good reason.

The alternative is structural transparency:
- **Every DRep claims domains publicly** — claiming a domain creates accountability for performance in it
- **Every vote has a public rationale** — reasoning is searchable and citable
- **Every reputation score is computed from open data** with open algorithms
- **Every coalition position is public** with named members
- **Every conflict between domains resolves through a public coordination protocol** (Section 15A), not through executive arbitration

The result: responsibility is *legible*, not *delegated*. You know who voted what, why, and how they performed. You don't need a leader to be accountable; you need a system where evasion is structurally impossible.

This principle shapes every feature in ADApolis. When in doubt, choose the option that increases legibility without concentrating power.

---

## 3. The Six Reforms — Project Background

ADApolis is the implementation arm of a broader governance reform agenda. The six reforms inform every design decision.

| # | Reform | Platform Implementation |
|---|---|---|
| 1 | **Quadratic voting** | Counterfactual in The Lab; CIP submitted in Phase 4 after simulation data is published |
| 2 | **Conviction voting** | Counterfactual in The Lab; modeled in DRep reputation as time-locked positions; conviction-locked delegation already implemented at app layer |
| 3 | **Domain-partitioned DReps** | Implemented at app layer immediately via domain tags + alignment compass; CIP submitted in Phase 4 to make protocol-native |
| 4 | **Structured deliberation** | Implemented at app layer via argument graph + Temperature Check; CIP submitted in Phase 4 to codify as mandatory pre-vote phase |
| 5 | **Citizens assembly** | Implemented as opt-in feature for proposers — random-sample delegator panels review proposals before vote; sortition weighted by holding duration, not amount |
| 6 | **Coalition coordination protocol** | Implemented at app layer via DRep Coalitions (Section 15A) — structured cross-domain conflict resolution without centralized executive arbitration. Codifies how domains surface disagreements and reach resolution transparently. |

Reforms 3, 4, and 6 ship at the application layer without protocol change. Reforms 1, 2, and 5 require eventual CIPs and are pushed in Phase 4 with simulation data backing them.

ADApolis also implements the **anti-cartelization principle** through quadratic ADA-power dampening on the Scoreboard (Section 6.3) — a high-quality DRep with modest delegation surfaces above a lazy DRep with massive delegation. This works at the discovery layer without needing protocol changes.

---

## 4. User Categories

ADApolis serves ten distinct user categories. Each has its own goals, primary surface, and success metric. The platform is one product with many doorways.

### 4.1 DReps (Delegated Representatives)
- *Who they are:* Elected delegates voting on behalf of ADA holders.
- *What they want:* Tools to do their job well, ways to be discovered, channels to communicate with delegators, recognition for substantive work, NFT royalty income from successful seasons.
- *Primary surface:* DRep Workstation (Section 13). Rationale Studio, Delegator Pulse, performance stats, coalition tools, AMA scheduling, Field Reports.
- *Success metric:* They open ADApolis first thing when a new proposal drops.

### 4.2 Engaged Delegators
- *Who they are:* ADA holders who actively care, read proposals, want to ensure their DRep represents them.
- *What they want:* Visibility into DRep behavior, structured debate, pre-vote signaling, accountability mechanisms, NFT free-mint windows when their DRep wins a season.
- *Primary surface:* Scoreboard + DRep profiles + Alignment Compass + Argument Graph.
- *Success metric:* Weekly visits; at least one re-delegation driven by platform discovery.

### 4.3 Casual Delegators
- *Who they are:* ADA holders who hold long-term, want to participate, don't have time to dig deep.
- *What they want:* Fast on-ramp, clear DRep match, opt-in notifications when their DRep diverges from their position.
- *Primary surface:* Quiz + Speak Your Mind on-ramps (Section 14), one-click delegation via GovTool handoff.
- *Success metric:* Complete the on-ramp in under 3 minutes, stay delegated.

### 4.4 Proposers
- *Who they are:* Builders, projects, individuals submitting governance actions (treasury withdrawals, parameter changes, info actions).
- *What they want:* Visibility for their proposal, a place to defend it, identification of supportive DReps, real-time feedback before the on-chain vote.
- *Primary surface:* Proposal authoring tools, optional 3-minute Pitch Video upload, proposer profile pages, Temperature Check visibility, Devil's Advocate engagement.
- *Success metric:* Better-prepared proposals enter the on-chain vote with stronger community alignment.

### 4.5 SPOs (Stake Pool Operators)
- *Who they are:* Run stake pools, vote on a subset of governance actions (hard forks, security-relevant changes).
- *What they want:* SPO-specific proposal filtering, technical depth, coordination with other SPOs.
- *Primary surface:* SPO-flagged proposal views, lightweight SPO Workstation, SPO coalition tools.
- *Success metric:* SPOs use ADApolis as their primary deliberation venue for the proposals they vote on.

### 4.6 Constitutional Committee Members
- *Who they are:* The CC under CIP-1694 — a small body that votes on whether proposals are constitutional.
- *What they want:* A specialized interface to record their constitutional rulings, publish reasoning, surface transparency to the community.
- *Primary surface:* CC Chamber — a dedicated interface for filing constitutional rulings, accessible to verified CC members only.
- *Success metric:* CC rulings are filed through ADApolis and become canonical reference material.

### 4.7 Researchers, Academics, and Journalists
- *Who they are:* People who study governance, write about it, or shape policy.
- *What they want:* Clean open data, citation-grade methodology, embeddable visualizations, historical comparisons.
- *Primary surface:* The Lab (Section 16), open API (Section 21), exportable datasets, embeddable charts.
- *Success metric:* ADApolis data is cited in at least one IOG/Intersect research output, one academic paper, and recurring journalist coverage.

### 4.8 Card Collectors and Fantasy Players
- *Who they are:* People who treat governance as a game — collect Champion cards, run fantasy leagues, build draft teams.
- *What they want:* Collectible NFTs with real provenance, season-based competition, leaderboards, social play, prize pools.
- *Primary surface:* Fantasy Draft (Section 7), Champion Cards (Section 8), Power Rankings, Coalition leaderboards.
- *Success metric:* Card collectors evolve into informed delegators. The fantasy layer is a funnel into substance.

### 4.9 Developers and Integrators
- *Who they are:* People building other tools, dashboards, services that consume governance data.
- *What they want:* Public API, webhooks, SDKs, stable schemas, generous rate limits.
- *Primary surface:* REST + GraphQL API, developer docs, code samples, GovScore oracle endpoint.
- *Success metric:* External tools embed ADApolis data and link back. The platform becomes governance data infrastructure for the ecosystem.

### 4.10 DAOs, Multi-sig Organizations, Project Treasuries
- *Who they are:* Collective entities that delegate ADA on behalf of a group, or operate as institutional DReps.
- *What they want:* Multi-sig delegation flows, internal voting before external action, shared dashboards, custom analytics.
- *Primary surface:* Org Workstation — a variant of DRep Workstation for collective actors.
- *Success metric:* Cardano-native DAOs use ADApolis as their internal governance coordination tool.

### 4.11 DRep Coalitions
- *Who they are:* Groups of individual DReps coordinating around shared domains, methodologies, or values — often forming organically. The clearest live example as of May 2026: **the DRep DAO**, a ~30-member coalition formalizing in June 2026 with a published Interim Charter, Incentive Framework, and Code of Conduct. Their explicit role is parliament-style coordination — producing standards, recommendations, proposer feedback, and structured outputs for Cardano governance.
- *What they want:* A first-class organizational primitive — public identity, joint deliberation tools, coordinated rationale publication, group-level reputation that aggregates members without overriding individual votes. They also need operational tooling — member-activity tracking against custom thresholds, voting infrastructure, public output archives, conflict-of-interest disclosure.
- *Primary surface:* Coalition pages and Coalition Workstation (Section 15A). Coalition-internal Argument Graph, joint Rationale Studio, member roster, public position publication, cross-coalition coordination protocol.
- *Success metric:* The DRep DAO and similar coalitions operate primarily through ADApolis. Coalition outputs become canonical reference points for the broader DRep base and external observers.

---

## 5. Platform Architecture

ADApolis is organized as **20+ interlocking systems**, grouped here by function. The architecture is layered: data → identity → primary surfaces → engagement layers → privacy/scale layers.

### 5.1 Data Layer
- Koios API (free, public) — primary on-chain data source
- DB-Sync / Blockfrost / Maestro — fallback chain data
- Cardano Forum Discourse JSON API — DRep introductions, governance discussion
- CIP-119 metadata fetch — DRep profile, references to socials
- CIP-100 rationale fetch — voting rationales from IPFS/GitHub
- GitHub API — DRep dev activity (opt-in via CIP-119 references)
- Twitter/X API — DRep social engagement (opt-in via CIP-119 references; $100/mo cost, optional)
- syncgovhub.com — secondary governance data source

### 5.2 Identity & Reputation Core (Section 9, 13)
- Wallet-based identity via CIP-30 / CIP-95
- Multi-dimensional reputation: Treasury, Protocol, Constitutional, DeFi, Identity, Community, Meta-Governance
- Multi-tier verification: self-attested → peer-endorsed → KYC-tier (optional)
- Reputation never tied to prediction accuracy or betting outcomes

### 5.3 Primary User Surfaces
- **Scoreboard** (Section 6) — research/discovery, flip-card DReps, quadratic dampening
- **Fantasy Draft** (Section 7) — team-builder, seasons, prize pools
- **Proposal Hub** (Section 15) — every gov action, AI summaries, argument graph
- **DRep Workstation** (Section 13) — DRep job dashboard
- **Layman On-Ramp** (Section 14) — Quiz + Speak Your Mind
- **The Lab** (Section 16) — counterfactual simulation (side quest)
- **AI Playground** (Section 17) — public dataset query interface

### 5.4 Engagement Layers
- Champion NFT Cards (Section 8)
- Living NFT + Soulbound Badges (Section 9)
- Quests, Streaks, Sagas, Referrals (Section 10)
- Devil's Advocate Steelman (Section 11)
- Temperature Check (Section 12)

### 5.5 Infrastructure Layers
- Smart Contract Architecture (Section 20) — 4 Plutus contracts in ADA-only
- AI Layer (Section 17) — minimized, cached, BYOK option, community-improved
- Notifications + ADAmail + Calendar (Section 18)
- Midnight Privacy Layer (Section 19) — Phase 3+

### 5.6 Cross-Cutting
- Open Data + API (Section 21)
- Progressive Decentralization arc (Section 21)
- Six Rings of Expansion (Section 22)

---

## 6. The Scoreboard — Phase 1 Anchor Product

**This is the first thing we build.** It's the research/discovery page for every other layer of the platform. If the Scoreboard is the best DRep discovery tool in the Cardano ecosystem, everything else follows naturally.

### 6.1 The Flip-Card DRep View

Every DRep appears as a card on the Scoreboard.

**Front of card:**
- Profile photo (from CIP-119 if available, fallback to generated avatar)
- Display name (ADAhandle resolution if available)
- Adjusted GovScore (with quadratic dampening applied, see 6.3)
- Voting streak (consecutive epochs with at least one rationale-backed vote)
- Domain badges (Treasury, Protocol, Constitutional, DeFi, Identity)
- ADA delegated + delegator count
- Season rank + movement indicator

**Back of card (flips on click):**
- Full bio (from CIP-119 objectives + motivations + qualifications)
- Summary of voting history
- Links to: rationales, website, Twitter, GitHub, Forum posts
- "Delegate via GovTool" button (handoff to GovTool, not native signing in v1)
- Career legacy score (cross-season, never resets)
- Recent rationales with direct links to read them

### 6.1.1 Honoring CIP-119 `doNotList` (decided 2026-11-21)

CIP-119 lets a DRep set `doNotList: true` to say it does not want delegation-campaign tools to promote it. The spec expects record-keeping tools (block explorers) to keep listing such DReps, and asks tools built for delegation campaigns to respect the flag. ADApolis is both, so:

- **Scoreboard (accountability):** these DReps stay listed with their scores, since their voting record is public. The card shows a "Not seeking delegation" label and omits the "Delegate via GovTool" button.
- **Delegation discovery:** Find My DRep (6.4.1), alignment-quiz matches, and any "top DReps to delegate to" promotion must exclude them.

Profiles that fail Koios hash verification against the on-chain anchor are never displayed.

### 6.2 The Scoring Engine — Multi-Source

Score is a composite across 40+ metrics in eight categories. Below is the initial 5-dimension formula; the engine expands as more data sources are integrated.

**Initial 5 dimensions:**
1. **Participation rate** — votes cast / governance actions eligible to vote on
2. **Rationale quality** — AI-scored on CIP-100 rationales (clarity, evidence, novelty, reasoning)
3. **Delegator alignment signals** — match rate between DRep votes and aggregated delegator pre-vote signals
4. **Consistency** — voting consistent with prior stated positions across Forum, Twitter, GitHub
5. **Growth normalization** — recent activity weighted, with gentle decay for inactivity

**Additional categories as data sources come online:**
- Forum engagement (Discourse API)
- Rationale publication rate
- Cross-channel consistency (do their tweets match their votes?)
- Response rate to delegator questions
- Devil's Advocate Steelman performance
- Argument-graph upvotes received
- Cross-DRep coalition activity

Every metric has a hover bubble explaining what it measures, how it's calculated, and where the data comes from.

### 6.3 The Quadratic ADA Dampening

**Formula:**
```
Adjusted_Score = Raw_GovScore × (1 / (1 + log₁₀(ADA_power_M + 1) / 4))
```

Where `ADA_power_M` is ADA delegated in millions.

**Effect:**
- 100K ADA delegated → ~94% of raw score
- 1M ADA → ~86%
- 10M ADA → ~75%
- 100M ADA → ~67%

This is a gentle, smooth reduction. Not punishing to small DReps. Meaningfully tempering for large ones. Surfaces high-quality DReps with low delegation. Distributes voting power.

The Scoreboard shows the adjusted score by default; the raw score is visible in the expanded detail with a transparent explanation of the dampening.

### 6.4 The Connected-Wallet Experience

When a user connects their wallet:
- Their current DRep delegation is detected
- That DRep's card is highlighted on the Scoreboard
- The current alignment score between the user and the DRep is displayed
- The system suggests three alternative DReps with higher alignment to the user's stated positions (drawn from Quiz/Speak-Your-Mind output, or inferred from past behavior)
- A "Compare My DRep vs Alternative" view side-by-sides their stats

### 6.4.1 The 'Find My DRep' Default Mode

The platform's flagship guided flow. It combines three signals in strict priority order to surface the DRep a user should delegate to:

1. **Participation gate** — only DReps above a participation threshold are eligible (low-participation DReps are filtered out entirely).
2. **Alignment ranking** — eligible DReps are ranked by the user's Personal Alignment Score (from the values quiz, Section 6.4).
3. **Decentralization tiebreak** — among well-matched, high-participation DReps, the one with the LOWEST ADA delegated ranks highest.

The thesis: if every delegator used this flow, delegation would flow to high-quality, value-aligned, under-delegated DReps — decentralizing Cardano by default. This is the single clearest expression of the platform's purpose. Other default presets ("Top Participation," "Underdogs," "Most Consistent") are saved filter+sort configurations over the same universal data.

### 6.5 Why Build This First

- It's high-leverage: it produces a live ranking of every DRep on Cardano, which becomes immediately citable in Forum, Twitter, and journalist coverage
- It validates the data pipeline before we layer fantasy/NFT mechanics on top
- It's achievable in a two-week sprint for the participation-only version, expandable from there
- It's the proof-of-concept asset for the Catalyst proposal
- It's the foundation every other layer depends on

### 6.6 Coalition-Defined Filters and Custom Active-Member Criteria

The Scoreboard produces *universal raw metrics* — participation rate, rationale rate, voting streak, ADA delegated, and so on. These never change based on viewer; they're public on-chain data.

What *does* change is how a given coalition interprets those metrics. The DRep DAO defines active membership as ≥90% voting / 100% rationale rate / ≥50% meeting attendance. Another coalition may use different thresholds. A third may emphasize only Treasury-domain proposals.

ADApolis treats this as a presentation layer, not a scoring layer:

- The universal Scoreboard always shows raw metrics computed from on-chain data
- Each coalition page can apply its own filter criteria — surfacing only members who meet *its* thresholds, with quarterly "active member" reports computed automatically
- The underlying public GovScore never changes; only the filter applied to it varies
- Coalitions never define the canonical score; they define their *interpretation* of it

This is part of "accountability through transparency, not hierarchy" (Section 2.5). The data is universal and open. Communities apply their own meaning.

### 6.6.1 Filter, Sort, and Search Mechanics

The Scoreboard supports deep, composable data exploration over the universal metric set:

- **Independent sorting** — every tracked metric is independently sortable, ascending or descending.
- **Stacked filters** — multi-pass filters compose (e.g., "aligns with my values AND ecosystem-growth focus AND high participation, sorted by lowest ADA delegated").
- **Full-text search** — search on DRep name, ADAhandle, and DRep ID.
- **Server-side pagination** — results are pulled in pages (e.g., 50 per page) so the entire DRep set is browsable without capping at top-N and without loading all rows at once.
- **Saved presets** — default views are saved filter+sort configurations over the same data; they never alter the underlying universal metrics.

**Implementation note:** pagination and sort/filter run against a dedicated API endpoint querying the database with limit/offset/order parameters, keeping each page fast. The ISR-cached top-of-board view remains the default fast-loading landing surface. Domain-based filtering (Treasury, Protocol, etc.) and alignment-based sorting depend on the proposal categorization engine and the user values quiz respectively — both are Phase 2/3 features and are NOT part of the Phase 1 Scoreboard MVP.

---

## 7. Fantasy DRep Draft — Phase 2

The fantasy sports layer. Built on top of the Scoreboard.

### 7.1 Core Mechanic

Users draft a roster of **five DReps** at the start of each season. The roster scores points across the season based on the drafted DReps' **process metrics** — participation rate, rationale quality, debate wins, streak length, response rate. **Never on vote outcomes.** (See Cardinal Rule, Section 2.4.)

### 7.2 Why This Architecturally Works

In fantasy sports, you don't play in the actual game. You draft players, track their real-world performance, win or lose based on how well you identified talent. The financial stakes are completely separated from the game itself. NFL players don't care about your fantasy league.

ADApolis works the same way:
- Fantasy team builders are not voting in governance
- DReps are not financially incentivized to vote any specific way
- Picking a DRep early before they're famous is the same thrill as a rookie pick
- People who would never read a CIP-1694 proposal will obsessively track DRep stats trying to win their fantasy league
- Civic knowledge becomes the side effect

### 7.3 Season Structure

- **Length:** 6 epochs (~30 days) per season for Year 1. Adjustable to 4 epochs as governance activity increases.
- **Cadence:** Monthly seasons → 12 seasons per year → 12 Champion drops per year
- **Themed naming:** Each season gets a name based on its dominant governance theme: "The Treasury Season," "The Constitutional Season," "The Plomin Season." Makes Champion Cards story-rich and collectible.
- **Career legacy score:** Accumulates across all seasons. Never resets. Shown on every DRep card.

### 7.4 The Underdog Multiplier

DReps who were in the **bottom half** of the Scoreboard at season start and end the season in the **top quarter** earn fantasy teams that drafted them a **1.5× points multiplier** for that DRep.

This rewards scouting skill, incentivizes the crowd to find and promote quality DReps lacking visibility, and creates excellent governance dynamics: marginal DReps with low delegation get a community-driven discovery boost.

### 7.5 Prize Pools

End-of-season prizes are paid in ADA from the Season Pool smart contract (Section 20.2), funded by:
- Catalyst grants (Year 1 bridge)
- Genesis Card primary sale proceeds (10% reserve)
- NFT secondary royalty allocation (3% of every Champion Card secondary sale)
- Battle pass purchases (₳5/season, optional)
- B2B Intel subscriptions (later)

**Prize Pool Minimum Guarantee:** A reserve of Genesis Card proceeds tops up any season pool that falls below ₳1,000 minimum. This prevents the "nobody wins anything meaningful" early-stage failure mode.

### 7.6 Roster Mechanics

- Draft window opens at the start of each season
- Standard roster: 5 DReps
- Snake draft for guild leagues; open draft for public mega-league
- Lock-in date: 24 hours after Season Day 1 starts
- One trade per season per roster (optional rule, configurable per league)
- Substitutions: only if a drafted DRep deregisters; replacement drawn from waiver wire

---

## 8. Champion NFT Cards — Phase 3

The headline reward. The viral moment. The long-term collectible.

### 8.1 The Mint Mechanics

At the end of every season, the **top 10 DReps** are enshrined as limited Champion NFT trading cards.

**Mint distribution:**
- **The DRep gets 5 copies** of their own Champion Card
- **Every wallet that had that DRep on their fantasy team gets 1 copy**, automatically
- **Every wallet that delegated to that DRep during the season gets a short free-mint window** to claim one copy (e.g., 7 days post-season-end)
- After the free-mint window closes, the supply is **permanently fixed**. No more mints, ever.
- Cards are tradable on secondary markets (JPG Store, fibo.io, etc.)

### 8.2 Card Content

Cards are visually rich, with art and content AI-generated based on all publicly available info about the DRep:
- Custom art reflecting DRep's domain, style, signature accomplishments
- Stats panel — season scores across all metrics
- Bio summary
- Notable rationales / quotes
- Career legacy score
- Season theme branding ("Treasury Season — Champion #3")

Cards are minted via the ReputationNFT Plutus contract (Section 20.4). They are **fully tradable** (not soulbound — soulbound is a separate system, Section 9).

### 8.3 The 7% Royalty Split

Champion Cards are **pure collectibles** — not investments, not yield-bearing instruments, not financial products. We do not market them with profit promises and we attach no governance rights to ownership. They are status symbols and historical artifacts. The royalty mechanism is the funding flywheel for the platform and DReps, not a return on investment.

Every secondary sale incurs a **7% royalty**, split as follows:

| Recipient | Share | Notes |
|---|---|---|
| **DRep** | 2% | Ongoing reward for excellent governance work |
| **Rewards Pool** | 2% | Feeds the next season's prize pool |
| **Top 10 Card Holders** | 2% | Split proportionately among the top 10 collectors of *that DRep's* cards across all previous seasons — perk for passionate collectors, not a yield product |
| **Project Team** | 1% | Platform development and operations |

**Top-10 collector concentration cap:** To prevent wash-buying and capture, any single wallet is capped at **20% of the 2%** allocated to top-10 collectors for a single DRep. Excess flows back to the Rewards Pool. *(Final cap mechanism — single-wallet 20% vs. 1-card-1-vote — to be settled in Open Questions, Section 29.)*

7% sits at the higher end of typical NFT secondary royalty on Cardano (JPG Store, fibo.io) but is within range that doesn't materially depress trading volume. The split keeps the math clean: equal weight to DRep / Pool / Collectors, with a smaller team slice. This balances all four interests without favoring any one party.

### 8.4 Card Sales Funnel from the Scoreboard

A "Buy Cards" button on every DRep profile and Scoreboard view links directly to the marketplace listing for that DRep's Champion Cards. Secondary trading happens via existing Cardano NFT marketplaces (JPG Store as primary integration).

### 8.5 Why This Mechanic Is the Best Incentive Design

- **DReps** want top-10 finishes for prestige + ongoing royalty income from their own cards
- **Fantasy team builders** want to pick future champions early for the automatic card airdrop
- **Delegators** get a free mint of cards from any DRep they backed who won — viral moment, social proof, story to tell ("I backed the Treasury Season Champion before they were famous")
- **Secondary market** creates ongoing royalty revenue with zero inflation
- **The Project** earns 1% of all secondary volume — aligned monetization
- **The Top Holders** earn passive yield on the DReps they've collected — sustained collector engagement

### 8.6 Founding Members Mint (Genesis Cards)

Before Season 1 launches, a **Founding Members Mint** of 500 credentials at **₳50 each** raises ~**₳25,000**.

**These are not a fundraise. They are permanent membership credentials with concrete benefits.**

Allocation of mint proceeds:
- ₳15,000 covers Season 1 prize pool baseline
- ₳7,500 funds platform development and infrastructure
- ₳2,500 reserve for prize pool minimum guarantee

**What Founding Members get permanently:**

- The *Founding Member* badge added to their Civic Identity NFT — visible forever, capped at 500 holders
- Listing on the ADApolis "Founders' Wall" page — public credit for early belief
- *Genesis Holder* trait on their Civic Identity NFT — visible visual element
- Civic Character Class +5% bonus (Section 9.3) — modest progression speedup
- Free mint on every future Champion Card drop they're eligible for (delegator free-mint window opens earlier and lasts longer)
- Early access to all new platform features (1 epoch ahead of public release)
- Priority access to AMAs, Coalition Workstation alpha, and community AMA scheduling

**Critical positioning:** Founding Member credentials are not investments. They are not yield-bearing. They do not grant governance power inside the platform. They are membership credentials with benefits that scale with platform growth. The price ladder is fixed (₳50 flat), the supply is fixed (500), and ADApolis does not promote secondary trading or make profit promises.

**Why this framing matters legally and culturally:**
- Securities risk drops substantially when there's no expectation of profit from the issuer's efforts
- The community can identify Founding Members publicly — social value compounds
- It feels like an honorable Patron tier, not a token sale
- Holders become brand ambassadors structurally
- Cardano's Founders' Wall becomes a recognized signal in the community over time

The credentials are tradable in principle (you can transfer NFTs on Cardano) but the platform's marketing never frames them as appreciation assets. Holders who want to transfer them can, but no platform-side promotion of secondary trading.

**Legal review still needed.** Even with this framing, jurisdictional requirements may apply. Pre-launch counsel review recommended.

---

## 9. Civic Identity System

Every user has a single, unified Civic Identity. This consolidates what earlier drafts split across three systems (Living NFT, Soulbound Badges, Civic Character classes) into one coherent artifact with multiple surfaces. The system is portable, composable, and queryable by external dApps as a trust signal.

### 9.1 The Three Layers, Now Unified

**The Artifact:** A single soulbound NFT minted to a user's wallet on their first significant civic action (first delegation, first DRep registration, first published rationale, or first Genesis Card mint — whichever happens first). Non-transferable. Visually evolves over time. The metadata is publicly queryable. This is your **Civic Identity NFT**.

**The Achievements:** Badges and traits accumulate on the Civic Identity NFT as you hit milestones. These are *not* separate NFTs — they are properties of your single NFT, queryable via the same metadata. Far more efficient than minting dozens of separate soulbound NFTs per user.

**The Role:** Your Civic Character Class is also a property of the Civic Identity NFT. The four classes (Strategist, Scholar, Sage, Speaker) are awarded algorithmically based on observable activity. Multi-class is possible. Class assignments appear as visible badges on the NFT.

One artifact. Multiple surfaces. One source of truth.

### 9.2 Evolution Stages

The Civic Identity NFT visually evolves through five stages as cumulative civic engagement grows:

*Seedling* → *Sapling* → *Citizen* → *Steward* → *Sovereign*

Each stage unlocks based on activity (governance actions participated in, rationales written, streaks maintained, seasons played, Sagas completed). Stages are not seasonally reset — they accumulate over a user's lifetime on the platform.

### 9.3 Civic Character Classes

The four classes map to domains of governance expertise and inform discovery, badge eligibility, and Saga unlocks.

**Strategist** — Treasury, Finance, Economic policy. Thinks in resource allocation, opportunity cost, ROI, incentive design. Cares about treasury efficiency and accountability. Publishes KPI frameworks and ROI analyses.

**Scholar** — Constitution, Law, Governance Design, Process. Reads source material. Knows CIPs, precedents, constitutional text. Writes long-form rationales that other DReps cite. Produces field reports.

**Sage** — Protocol, Technology, Security, Cryptography. Understands what's happening at the protocol layer. Evaluates hard forks, parameter changes, security implications. Translates between engineers and the community.

**Speaker** — Community, Marketing, Adoption, Communication. Connects the chain to the world. Mobilizes delegators, explains decisions, writes the threads that go viral. Translates insider language into outsider language.

**Class mechanics:**
- Auto-awarded algorithmically based on observable behavior (rationale content, voting patterns, argument graph activity)
- Multi-class is possible — a user can hold multiple classes simultaneously by earning reputation across categories
- Classes are visible *signals*, not gates — anyone can take any action regardless of class
- Phase 5+ may add peer-validation as a second tier (algorithmic = "self-claimed," peer-endorsed = "verified expert"); deferred to Open Question 16

### 9.4 Badges and Traits

Badges and traits accumulate on the Civic Identity NFT as users hit milestones. They appear as visual elements on the NFT and as queryable metadata properties.

**Foundational badges (everyone can earn):**
- *Genesis Member* — minted a Genesis Card during the founding mint window
- *First Delegation* — completed first delegation (universal entry badge)
- *True Believer* — locked delegation for 60+ days
- *Marathon* — 100-epoch streak
- *Polyglot* — earned reputation across 5+ domains

**DRep-specific badges (require DRep registration):**
- *Verified DRep* — the only credential gated to confirmed DReps. Used as trust signal across Cardano dApps via the Oracle (Section 23.7).
- *Iron Orator* — 10 rationales written and community-rated above 4 stars
- *Epoch Guardian* — participated in every governance action for a full epoch
- *Kingmaker* — reached 500 delegators
- *Founding DRep* — registered as DRep in Season 1

**Performance badges (earned through competition):**
- *Mind-Mover* — author won the Mind-Mover Award on a proposal (see Section 11)
- *Alignment Champion* — DRep's votes matched your pre-vote signals at 90%+ for a full season
- *Constitutional* — participated in a constitutional amendment vote with published rationale
- *Champion Backer* — held a Champion Card from a top-3 DRep across multiple seasons

**Ultra-rare endgame badges:**
- *Constitutional Founder* — earned during a constitutional amendment vote where your rationale was cited by 3+ other DReps
- *The Architect* — submitted a CIP that gets adopted
- *Legend* — top 10 DRep leaderboard for 3 consecutive seasons

**Coalition badges (collective, earned with your coalition):**
- Awarded when a Coalition hits performance milestones
- All current Coalition members receive the badge simultaneously
- Strongest social-bond mechanic in the system

### 9.5 Why a Unified System

Earlier drafts had Living NFT (Section 9), Soulbound Badges (Section 9.2), and Civic Character classes (Section 10.4) as three separate systems. They were doing the same conceptual work — *displaying a user's civic identity* — with different mechanics. Consolidation produces:

- **One NFT to mint per user, not many** — simpler smart contract, lower on-chain cost
- **One profile surface to query** — easier for external dApps to consume reputation via the Oracle
- **One narrative** — "the user's Civic Identity," not "the user's NFT + the user's badges + the user's class"
- **Cleaner ownership semantics** — the NFT is the canonical record; everything else is a derived property

### 9.6 Why Both DReps and Delegators Get Civic Identities

The whole point of the engagement layer is bringing the 99% in. There are maybe a few hundred serious DReps at launch — there could be tens of thousands of delegators. Delegator badges and class progression are the actual growth engine because they create shareable moments at scale. *"I correctly identified the Treasury Season Champion before they were famous"* is a delegator's story, and it spreads.

The only badge truly gated to DReps is **Verified DRep**, because it's the credential other platforms will query for trust signals via the Oracle (Section 23.7).

---

## 10. Engagement Layer

The retention engine. Slimmed to three essential mechanics. Coalitions (Section 15A) and Civic Identity (Section 9) handle the social and status layers; this section is just about ongoing engagement.

### 10.1 Quests

Active proposals become quests with urgency mechanics.

- **Hot quest** indicator (flame icon) when a vote closes in <48 hours
- **Stakes display:** "+420 XP + Rare Badge" telegraphs importance at a glance
- **Bonus XP** for early engagement (first 100 voters get a rare badge)
- **Quest chains:** Saga progressions (Section 10.4) that span multiple related proposals
- **Daily side-quests:** read a rationale, vote on a temperature check, write a comment, post an argument

### 10.2 Streaks

Daily streak mechanic borrowed from Duolingo. Logging in, reading a proposal summary, or casting a Temperature Check takes 30 seconds and keeps the streak alive. Streaks are visible on profiles and contribute to GovScore.

Long streaks signal genuine long-term engagement — exactly the signal delegators want from DReps.

### 10.3 Referral Mechanics

- Every user has a referral link
- Referring a new active user earns: 200 XP + 5% of referee's yield for 3 epochs
- Referrals tracked transparently on-chain
- Top referrers earn a Recruiter badge

### 10.4 Sagas

Sagas are long-arc achievement chains spanning multiple proposals or seasons. They are pre-defined by the platform at launch (extensible later). A Saga has a name, a theme, a series of milestones, and a final reward (typically a rare badge or trait on the Civic Identity NFT).

**Initial Saga catalog (illustrative, finalize in Phase 4):**

- **The Constitutional Defender** — participate with rationale in five constitutional amendment votes. Final reward: *Constitutional* trait.
- **The Treasury Sentinel** — write structured reviews on ten Treasury Withdrawal proposals exceeding 1M ADA. Final reward: *Sentinel* trait.
- **The Coalition Builder** — be a founding member of a Coalition that produces three accepted official outputs. Final reward: *Builder* trait + Coalition multiplier on next season.
- **The Mind-Mover** — author arguments that earn 50 total position-update credits (Section 15.4). Final reward: *Persuader* trait.
- **The Steel Spine** — win five Mind-Mover Awards (Section 11). Final reward: *Steel Spine* trait — visible declaration that you can articulate opposing views.

**Saga mechanics:**
- Progress is automatic — the platform tracks events and updates a Saga's percentage complete
- Sagas appear on the user's profile dashboard so progression is visible
- Sagas do not expire — a user can chip away over years
- Some Sagas have prerequisite Sagas (chain progression)
- Saga completions are timestamped on-chain via metadata transaction

**Why Sagas matter:**
Streaks reward daily activity. Sagas reward sustained, meaningful engagement over months or years. They give long-term goals to retain veteran users who have mastered the basic engagement loops. They also create stories — "I'm one vote away from completing Constitutional Defender" is a moment users will talk about.

### 10.5 Why Guilds Are Not a Feature

Earlier drafts had Guilds as a feature alongside Coalitions. They served the same conceptual purpose — social affiliation around shared values — but added a second organizational primitive that confused users and duplicated work. **Coalitions (Section 15A) are the only social-organization primitive in ADApolis.** Anyone can form one; they range from small friend groups (think: "fantasy team alliance") to formal entities like the DRep DAO. One concept, many scales.

---

## 11. Mind-Mover Awards

One award category, one mechanic, one measurement device. Merges what earlier drafts called Steelman Award and Devil's Advocate Award into a single unified competition. This is the most elegant accountability mechanic in the platform — and the strongest anti-tribalism tool.

### 11.1 The Core Mechanic — Mind-Movement Measurement

Every proposal has a Temperature Check (Section 12). Every Temperature Check captures a user's position on the proposal. This creates an opportunity that conventional argument-rating systems can't access: **we can measure how much an argument actually changes minds.**

The mechanic:

1. During deliberation, a user records their initial Temperature Check position (YES / NO / ABSTAIN) before reading the structured argument graph
2. The user reads arguments — including any submitted Steelman arguments and Devil's Advocate arguments
3. At any point before voting closes, the user can update their Temperature Check position with attribution: "I changed because of Argument X"
4. The argument's author earns a **mind-movement credit** — proportional to the magnitude of the position shift and weighted by the rater's reputation

This is the same mechanic as position-update tracking in the Argument Graph (Section 15.4) — but specifically applied to the Steelman and Devil's Advocate competitions.

### 11.2 The Award

**Mind-Mover Award** — best argument on a proposal, measured by how many people's positions it actually moved, weighted by the reputation of those whose minds moved.

Sub-categories (recognized but ranked together):
- **For** — best argument **FOR** a proposal authored by someone who voted AGAINST it or is neutral
- **Against** — best argument **AGAINST** a proposal authored by someone who voted FOR it or is neutral

Both sub-categories measure the same skill: the rare governance trait of being able to genuinely engage with the strongest version of opposing views without retreating into tribal advocacy.

A user can win both directions on the same proposal — extremely rare and prestigious. This signals top-tier intellectual honesty: they articulated the strongest case for *and* against the same proposal, and both moved minds. The Civic Identity NFT (Section 9) gains a permanent *Steel Spine* trait when this happens.

### 11.3 Scoring and Selection

At deliberation close, for each proposal:

- All eligible Mind-Mover submissions are ranked by **net mind-movement credit accumulated**
- Top scorer in each sub-category (For, Against) receives the award
- A separate ranking shows the top combined scorer when a single author won both directions

This produces a clean objective measure: an argument is "the best" if it actually moved the most people, weighted by the credibility of the people moved. It is essentially unganmeable — you cannot create a brigade of fake accounts to mind-move yourself because the mind-movement scoring is reputation-weighted.

### 11.4 Award Rewards

Award winners receive:

- A *Mind-Mover* badge on their Civic Identity NFT (Section 9), with sub-category recorded
- Significant reputation lift in the relevant domain
- Promotion of their argument to the proposal's main view, marked as "Award-Winning Counter-Argument"
- The argument becomes citable in future deliberation
- Progression credit toward the *Steel Spine* Saga (Section 10.4)

A user can win both directions on the same proposal. The *Steel Spine* trait is added to their Civic Identity NFT.

### 11.5 Why This Architecture Works

- **The measurement is real.** We are not asking voters which argument is "best" in the abstract. We are measuring which argument actually moved people from one position to another. That is the only definition of a persuasive argument that matters.
- **It is unganmeable.** You cannot win by being tribal — tribal arguments don't move neutral or opposing positions. You cannot win by brigading — mind-movement is reputation-weighted. You cannot win by writing many low-effort submissions — only your best argument counts.
- **It produces canonical artifacts.** Award-winning arguments become the canonical counter-arguments cited in future debates. Over time, the platform accumulates the highest-quality reasoning on every proposal in Cardano history.
- **It defeats echo chambers structurally.** The award is impossible to win by being tribal. Bad-faith advocacy fails by design.
- **It surfaces the best minds.** Repeat winners become known as the platform's most credible thinkers across domains.

### 11.6 The DRep Multiplier

DReps who author arguments that win Mind-Mover Awards earn additional reputation lift in the Consistency dimension of GovScore. Demonstrating you can articulate the strongest opposing view is the gold standard of governance maturity, and DReps who do this consistently rise visibly in rankings.

---

## 12. Off-Chain Temperature Check

The strategic killer move. The mechanism that makes ADApolis indispensable.

### 12.1 Mechanics

During the deliberation phase of every governance action (typically 7 days before the on-chain vote opens), ADApolis runs a wallet-signed off-chain **Temperature Check** on the same question.

- Gas-free, fast
- YES / NO / ABSTAIN with optional one-sentence rationale
- Open to all wallet holders
- Three display modes: raw counts, stake-weighted, reputation-weighted
- Settles 24 hours before the on-chain vote opens
- Results published as both an on-chain metadata anchor and a shareable visualization

### 12.2 Why It Is Not a Prediction Market

The Temperature Check **collects preferences, not predictions**:
- You signal what *you* believe should happen
- No money on the line
- No reward for being on the winning side
- No reason to misrepresent your view

This is the clean information aggregation that prediction markets pretended to offer without the financial corruption.

### 12.3 The DRep Visibility Lever

DReps who participate publicly in the Temperature Check build reputation. DReps who skip are publicly marked **"Silent on [Proposal X]"** on their profile. Delegators see this. They will demand explanations. Pressure builds organically.

Within 6 months, *not* participating in Temperature Checks becomes a liability for any serious DRep. That's the viral mechanic — infrastructural, not flashy.

### 12.4 The Result

By the time the on-chain vote opens, deliberation is over and recorded. The on-chain vote becomes ratification of a process that already happened transparently. ADApolis is now the canonical deliberation venue for Cardano governance.

This is Reform #4 implemented without any protocol change. When the CIP is filed later to codify mandatory deliberation, the CIP just legalizes what is already normal.

---

## 13. DRep Workstation

A DRep's job should be the most rewarding role in crypto governance. Currently it is thankless and invisible. We fix that.

### 13.1 Dashboard
- Active delegators (list, ADA totals, when they delegated, sentiment signals where shared)
- Reputation scorecard with domain breakdown
- Upcoming proposals requiring attention, sorted by deadline
- Open argument threads where you've been challenged
- Delegator messages awaiting reply (via ADAmail)

### 13.2 Rationale Studio
- AI-assisted rationale drafting — provide bullets, get a polished CIP-100-compliant rationale
- Auto-fetched proposal context — full text, related precedents, similar past votes
- Citation helper — suggests relevant historical proposals, CIPs, Constitution sections
- One-click publish to on-chain metadata + Forum cross-post
- Draft queue
- Template library — DRep can save personal rationale templates

### 13.3 Proposal Brief
- For every active proposal, an AI-generated executive brief customized to the DRep's known positions and prior reasoning
- Highlights the specific tensions the DRep needs to resolve
- Surfaces arguments that contradict the DRep's stated platform — forcing engagement
- Estimated time-to-decide based on the DRep's pace

### 13.4 Delegator Pulse
- Aggregated sentiment from delegators on active proposals (opt-in, anonymous in aggregate)
- Private direct messages via ADAmail
- Optional weekly digest auto-published: "Here's what my delegators are telling me this week"
- Public response composer: "I hear you on X, here's how I'm thinking about it"

### 13.5 Calendar and Workflow
- Governance calendar (every upcoming proposal, deliberation phase, Temperature Check, vote window)
- Integration with Google Calendar / Apple Calendar
- AMA scheduler with Calendly-style booking
- DRep-to-DRep meeting tools for coalitions

### 13.6 Stats and Performance
- Season stats — votes cast, rationale rate, alignment with delegator base, reputation growth
- Head-to-head record vs other DReps
- Biggest moves of the season
- Controversy markers — places where votes diverged from stated platform
- Career legacy score (cross-season, never resets)
- Year-over-year comparison

### 13.7 Cross-DRep Tools
- Coalition formation — invite other DReps, declare shared positions, publish public coalition pages (see Section 15A for full coalition primitive)
- Structured debate scheduler — arrange 1v1 debates on specific proposals
- Joint statements — co-author rationales with other DReps
- Mentorship — senior DReps coach rookie DReps, both earn reputation
- Cross-coalition coordination protocol — when two coalitions surface conflicting positions on a proposal, ADApolis hosts the structured resolution process (Section 15A.4)

### 13.8 Field Reports
- Long-form post-vote analyses, published to DRep profile, surfaced in feeds
- Built-in editor
- Cross-post to Substack, Twitter thread auto-generation
- Best Field Reports get featured in weekly platform digest

### 13.9 Coaching Mode (Optional)
- DReps opt into 15-min onboarding sessions with new delegators
- Earn reputation per accepted session
- Lowers the barrier from "delegate to a stranger" to "delegate to someone I've talked to"

### 13.10 DRep Career Arc
- **Rookie** (first season): tutorials, mentorship matching, gentle reputation curve
- **Established** (multiple seasons): full feature access, leaderboard eligibility
- **Veteran**: Hall of Fame eligibility, platform governance council eligibility
- **Domain Specialist**: high domain-specific reputation unlocks specialist badges and elevated visibility in domain searches

---

## 14. Layman On-Ramp

Two parallel entry paths to the same destination — DRep recommendations and one-click delegation.

### 14.1 Path A: The Quiz
- 7 questions, each at "what kind of Cardano do you want?" level
- Treasury aggressiveness, decentralization vs efficiency, openness vs caution, etc.
- 90 seconds total
- Buzzfeed-quality result graphics, shareable card

### 14.2 Path B: Speak Your Mind
- Free-text input: "Tell me what you care about for Cardano in your own words"
- AI extracts positions on key axes
- Generates the same personality profile as the Quiz
- Can be combined — do the Quiz, then refine with free text

### 14.3 Output (Both Paths)
- One-line governance personality (e.g., "The Pragmatic Builder")
- A paragraph explanation
- Three suggested DReps with one-sentence rationale each
- Shareable result card

### 14.4 Then
- One-click delegation (links to GovTool / wallet for the actual transaction)
- Set notifications — two opt-out defaults:
  - "Tell me when my DRep votes against my stated position"
  - "Tell me when a proposal matches my interests"

Total time from wallet-connect to engaged delegator: under 3 minutes.

---

## 14A. Ecosystem Map

A common barrier to Cardano adoption is institutional confusion. External observers and newcomers face a thicket of organizations — IOG, Cardano Foundation, Emurgo, Intersect MBC, Project Catalyst, the Constitutional Committee, DReps, SPOs, the constellation of Catalyst-funded projects — with overlapping mandates and unclear entry points. This is a real coordination problem the system itself can't solve; only a visualization layer can.

### 14A.1 What It Is

An interactive, visual map of the Cardano governance and operational landscape. One page, no jargon, designed for someone who has never heard of CIP-1694.

Each entity shown as a node:
- Description in plain language ("IOG builds the Cardano protocol. Cardano Foundation handles legal and brand. Intersect MBC manages the post-Voltaire roadmap. Project Catalyst distributes treasury grants.")
- Their relationship to others (who funds whom, who decides what, who answers to whom)
- Their public entry points (where to apply, propose, contribute, contact)
- Current key people / leadership
- Recent activity (last grant approved, last major decision)

### 14A.2 What It Is Not

- Not an advocacy document — descriptive, not editorial
- Not a substitute for those organizations' own communications
- Not a directory of every Cardano project — focused on governance and operational entities
- Not static — auto-updates from public sources where possible

### 14A.3 Why It Matters

The Cardano community has organic strengths that an Ecosystem Map amplifies. Newcomers who can orient themselves in 5 minutes are far more likely to participate. External actors evaluating partnership find a single clear reference. The map itself becomes a feature commonly cited in onboarding materials by other Cardano projects.

It's a small feature with disproportionate strategic value.

---

## 15. Structured Deliberation — Argument Graph

Kialo-style pro/con tree for every proposal.

### 15.1 Structure
- Root claim: "This proposal should pass / fail"
- Below: supporting and opposing arguments
- Below those: counter-arguments, qualifications, evidence
- Arbitrarily deep
- UI shows strongest paths by default, expand-on-demand

### 15.2 Each Node Contains
- Claim text
- Evidence links
- Author wallet
- Parent node ID
- Reputation-weighted upvotes
- Position-change credits earned (see 15.4)

### 15.3 Storage
- Off-chain in Supabase for query speed
- On-chain anchoring via metadata transactions for immutability of timestamp and authorship
- Integrity-verifiable via on-chain hash

### 15.4 Position Update Tracking
- Voluntary log: when you change your mind because of a specific argument, you can credit it
- Authors of mind-changing arguments earn position-change reputation
- This is one of the most important rep sources because it directly rewards persuasion quality

### 15.5 Argument Tournaments
- Brackets that pit strongest pro arguments against strongest cons
- Reputation-weighted users judge
- Winning arguments get bonus XP + visibility

### 15.6 Replay Mode
- Scroll a timeline of when each argument was posted and how positions shifted in response
- Governance as film
- Reusable artifact for journalism and academic study

### 15.7 Cross-Thread Linking
- Arguments can cite arguments from other proposals
- Creates a knowledge graph over time
- Becomes the citable corpus for Cardano governance history

---

## 15A. DRep Coalitions

DRep Coalitions are a first-class organizational primitive on ADApolis. They serve User Category 4.11 and operationalize Reform 6 (Coalition Coordination Protocol) at the application layer.

### 15A.1 What a Coalition Is

A Coalition is a public, named group of DReps coordinating around a shared domain, methodology, or strategic alignment. Examples:
- The Treasury Stewardship Coalition (DReps focused on treasury policy)
- The Protocol Working Group (technical DReps coordinating on hard fork and parameter votes)
- The Constitutional Originalists (DReps prioritizing strict constitutional interpretation)
- The Decentralization Hawks (DReps prioritizing anti-concentration outcomes)
- A bespoke 30-DRep coalition formed organically to coordinate with Intersect

Coalitions have a public identity. They do not override individual DRep votes. They produce coordinated *recommendations* and *positions* that members may follow or diverge from publicly.

### 15A.2 Coalition Mechanics

**Membership:**
- DReps opt in to coalition membership; opt out anytime
- Membership is public on-chain (attestation transaction with coalition ID)
- A DRep can be a member of multiple coalitions
- Coalitions can define internal joining criteria (open / invitation / vetted)

**Coalition pages display:**
- Mission statement and claimed domains
- Full member roster with individual reputation scores
- Aggregate coalition reputation (composite of member performance)
- Recent coalition positions on active proposals
- Coalition voting record — % of members who voted YES, NO, ABSTAIN per proposal
- Coalition-internal Argument Graph (visible to members; optionally public)
- Endorsement list (proposers, other coalitions, public figures who reference the coalition)

**Coalition outputs:**
- Joint rationales (multi-author, signed by all consenting members)
- Position briefs (coalition's recommended stance on each active proposal, published in advance of voting)
- Field Reports (post-vote retrospectives)
- Cross-coalition coordination outputs (Section 15A.4)

### 15A.3 Coalition Workstation

A dedicated UI for coalition coordination, accessible to verified members. Includes:
- Internal Argument Graph for member-only deliberation
- Joint Rationale Studio (multi-author drafting with attribution)
- Member voting telemetry (where members lean before final positions are published)
- Position publishing workflow with member sign-off
- Coalition calendar — internal meetings, AMA schedule, debate prep
- Internal ADAmail group messaging

### 15A.4 Cross-Coalition Coordination Protocol

When two coalitions surface conflicting positions on the same proposal, ADApolis hosts a structured resolution process. This is the application-layer implementation of Reform 6 — coordination without centralized executive arbitration.

**Process:**
1. **Conflict surfacing** — automated when two coalitions publish opposing positions on the same active proposal
2. **Joint deliberation window** — a shared Argument Graph opens between the two coalitions, with a defined time window
3. **Structured exchange** — each coalition publishes their strongest argument; the opposing coalition publishes their best counter; iterate
4. **Reputation-weighted mediation panel (optional)** — coalitions may jointly request a panel of high-reputation neutral DReps (not members of either coalition) to surface synthesis or compromise positions
5. **Public resolution** — the coalitions either (a) reach revised positions, (b) publish a joint statement acknowledging irreconcilable difference with clear reasoning, or (c) publish their original positions unchanged with the deliberation record attached

**Critically:** the protocol produces *legibility*, not *binding resolution*. Each DRep still votes independently. The process produces a public record that delegators, future proposers, and external observers can reference. This is accountability through transparency, not through hierarchy.

### 15A.5 Coalition Reputation

Coalitions accrue aggregate reputation through member performance. Coalition reputation factors:
- Member-weighted average GovScore
- Coalition position accuracy (did stated positions match actual member votes?)
- Output quality (joint rationale quality scores, deliberation thoroughness)
- Cross-coalition coordination participation
- Public referencing (how often outside parties cite the coalition)

Coalition reputation is **distinct from** individual member reputation. A DRep with high personal reputation can belong to a coalition with weak aggregate output; that doesn't drag down the individual, but it does affect the coalition's visibility and influence.

### 15A.6 Why Coalitions Matter Strategically

- They are the organizational primitive the Cardano DRep community is *actually forming around* in 2026
- They give ADApolis a natural home for the structured-decentralization model — domain coordination without protocol-level hierarchy
- They produce citable artifacts that elevate governance discourse
- They make the broader DRep base's job easier (you can follow a coalition you trust rather than evaluating every proposal in every domain)
- They become the unit of cross-domain coordination that the Cardano ecosystem currently lacks
- They are progressively decentralization-friendly — coalitions can fork, merge, or dissolve transparently

### 15A.7 What Coalitions Are Not

- **Not a replacement for individual DReps** — every member votes independently
- **Not an executive body** — they produce recommendations, not binding decisions
- **Not a delegation target** — delegators delegate to individual DReps, not coalitions
- **Not protocol-level** — they exist entirely at the application layer
- **Not hierarchical** — no coalition has authority over another

### 15A.8 Live Example: The DRep DAO

As of May 2026, the most concrete real-world Coalition is the **DRep DAO** — a ~30-member group of active Cardano DReps that has published an Interim Charter, an Incentive Framework, and a Code of Conduct, with a planned June 2026 launch.

Key facts about the DRep DAO that inform ADApolis's design:

- **Membership model:** ≥90% voting participation, 100% rationale rate, ≥50% meeting attendance to remain "active"
- **Voting model:** 1 active member = 1 vote, simple majority for operations, 67% for official recommendations and charter amendments
- **Incentive model:** quarterly points-based reward pool with quality multipliers (0× rejected, 0.5× partial, 1× accepted, 1.25× exceptional)
- **Annual budget model (illustrative):** $1M with $700K for member rewards, $100K for council compensation, $100K for service providers, $100K for domain experts
- **2026 deliverables:** Treasury Withdrawal proposal template, NCL/funding allocation framework, proposer feedback process, funding DAO accountability standards, Intersect liaison coordination
- **Minimum tooling stack at launch:** Telegram, Google Drive, public doc page, X account, forms-based onboarding/agenda/voting, public output archive — explicitly noting "custom tooling may be added later if the DAO proves useful and operational demand justifies it"

This is ADApolis's reference Coalition. The Coalition primitive (15A.1–15A.7) is designed to natively support what the DRep DAO needs operationally:

- Member-activity tracking matches their 90/100/50 thresholds via coalition-defined filters (Section 6.6)
- Temperature Check (Section 12) provides their voting infrastructure
- Coalition Workstation (Section 15A.3) provides their internal coordination layer
- Joint Rationale Studio supports their collective recommendations
- Coalition page provides their public output archive
- Cross-coalition coordination protocol (15A.4) handles disputes with future coalitions

The integration is not built yet (it lands in Phase 5A) but the existing Scoreboard already provides their member-tracking primitives from day one of ADApolis's launch — meaning the DRep DAO can use ADApolis as their tracking system *before* the dedicated Coalition layer is built.

ADApolis's position regarding the DRep DAO: **we serve them, we do not steer them.** The DRep DAO is one Coalition among many that ADApolis is built to support. It is not the official body of Cardano DReps, nor is ADApolis its official platform. We avoid entanglement that would compromise either party's independence while supporting the substantive work the Coalition is undertaking.

---

## 16. The Lab — Counterfactual Simulator

**Strategic role:** Advocacy asset for protocol-level reform (Reforms 1, 2, 5). Side-quest UX — not core daily flow. Heavy users: researchers, IOG, Intersect, journalists.

### 16.1 Why It Exists

Without The Lab, "we should switch to quadratic voting" is opinion. With it, it's evidence: "Here are the 17 proposals from 2024-2026 that would have had different outcomes." The Lab is what gets ADApolis cited in IOG research and academic papers, and what makes Phase 4 CIPs winnable.

### 16.2 Features
- Pull every historical on-chain vote
- Recompute outcomes under alternative systems:
  - Quadratic voting (sqrt-weighted)
  - Conviction voting (time-locked weight)
  - Domain-partitioned (only relevant DReps count)
  - Citizens-assembly (random sample of delegators, weighted by holding duration)
  - Custom parameter sliders for any model
- Side-by-side outcome comparison
- Shareable links to specific scenarios
- Embed code for Forum posts and Twitter
- Open dataset export (CSV, Parquet, JSON-LD)
- Methodology page with peer-review-grade documentation
- Versioned releases for academic citation

### 16.3 Output as Advocacy
- Eventually published as an open dataset on GitHub
- Eventually published as an academic preprint (SSRN or arXiv)
- Used as evidence in CIP submissions for protocol changes

### 16.4 Strategic Coherence View

A diagnostic module within The Lab that addresses one of the most-cited critiques of decentralized treasury management: fragmentation, duplication, and lack of strategic coherence in spending.

**What it visualizes:**
- Historical treasury withdrawals clustered by topic, domain, and beneficiary type
- Duplicated funding — multiple grants apparently solving the same problem
- Project lifecycle tracking — which funded projects shipped, which were abandoned, which are still active
- Concentration vs. fragmentation metrics over time (Gini coefficient of treasury allocation by domain)
- Cross-funding-source overlap — projects receiving both Catalyst and direct treasury withdrawals
- Domain-level spend trends (Treasury, Protocol, Marketing, Education, etc.)
- Recipient concentration — how much treasury goes to repeat recipients vs. new entrants

**Why this matters:**
This is both a diagnostic tool for the community and an advocacy artifact. It surfaces structural inefficiencies empirically rather than rhetorically. The community can use it to push for better coordination protocols (Reform 6) without needing to argue from first principles — the data tells the story.

It also feeds back into coalition formation: if the Strategic Coherence View consistently shows duplicated funding in a domain, that's a signal a Coalition should form to coordinate proposals in that domain before they hit the on-chain vote.

**Outputs:**
- Public dashboard accessible without login
- Embeddable charts for journalists and analysts
- Quarterly written reports synthesizing the data
- Open dataset alongside the rest of The Lab's exports

---

## 17. AI Layer — Economics and Transparency

ADApolis uses AI extensively. We minimize cost, maximize reuse, and never lock users into our keys.

### 17.1 AI Features Across the Platform
- Proposal summaries (plain-language, with risks/benefits)
- AI Devil's Advocate steelman generation per proposal
- Constitution-consistency scoring (AI draft, community-confirmed)
- Rationale Studio (DRep writing assistance)
- Argument moderation flagging
- DRep matching from free-text in Layman On-Ramp
- Translation for multi-language support
- Rationale quality scoring (5-dimension AI assessment)
- Champion Card art and content generation

### 17.2 Economic Design

**The platform must be free to use.** AI is the largest variable cost. Three strategies:

**1. Minimize AI usage.**
- Cache every output. AI-generated proposal summaries are written **once** per proposal and shown to everyone forever. Same for Devil's Advocate steelmen, Constitution-consistency scores, and rationale quality assessments.
- Use the cheapest viable model for each task (e.g., Claude Haiku for summaries, more capable models only when needed).
- Batch processing where possible.

**2. Bring Your Own Key (BYOK).**
- Power users can paste their own Anthropic / OpenAI API key
- Unlocks more capable models, higher rate limits, custom prompts, full AI Playground access
- User pays their own provider directly; ADApolis never sees the key beyond pass-through
- BYOK is opt-in, never required

**3. Optional ADA tip.**
- Free tier covers cached AI outputs for everyone
- For uncached personal queries (e.g., "summarize this niche proposal for me right now"), users can tip a small ADA amount that covers the inference cost plus a tiny margin
- Never gated, never required — only used for personal queries that the cache can't satisfy

### 17.3 Community-Improved AI Content

Every AI output is **public, cached, and replaceable**.

- AI-generated proposal summaries can be edited by high-reputation users
- Edits go through reputation-weighted community vote
- Approved community edits **replace** the AI version as the canonical summary
- The community-improved version is what new users see, while the AI version is preserved in the history
- Contributors of accepted edits earn reputation in the relevant domain

This means AI is the **floor**, not the ceiling. The community improves on AI over time, and the platform gets smarter without paying for more inference.

### 17.4 The Open AI Playground

A public chat interface where any user can query the full governance dataset with natural language. Examples:
- "Show me every treasury withdrawal over 1M ADA"
- "Which DReps consistently vote with [DRep X] on protocol issues?"
- "Summarize how [Proposer Y]'s last three proposals performed"
- "What arguments tend to win in DeFi-domain proposals?"
- "Generate a Constitution-consistency report for Proposal Z"

**Prompts are user-modifiable.** Power users can fork system prompts, tweak parameters, and publish their own AI lenses on the data. Each is tagged with its prompt for transparency.

- Free tier: cached queries only
- BYOK or tip: live queries

### 17.5 Transparency Requirements

- All system prompts published openly
- All AI outputs marked clearly as AI-generated
- Outputs can be challenged and community-corrected
- Versioned — when prompts change, prior outputs remain accessible

---

## 18. Notifications, ADAmail, Calendar

### 18.1 ADAmail as Primary Notification Channel

[ADAmail](https://adamail.me/) (NMKR + IAMX) is wallet-native email. Every Cardano wallet is a mailbox. We integrate it as our **default privacy-respecting notification channel** for both DReps and Delegators.

- DReps receive delegator messages directly
- Delegators get DRep updates without giving up email or phone
- Newsletter-style governance digests
- Optional, but the default recommendation

### 18.2 Additional Channels
- Browser push (Web Push API)
- Mobile push (PWA + native if we eventually ship one)
- Regular email (optional)
- Telegram (optional, via bot)
- Discord webhook (server-level subscriptions for DAOs and projects)

### 18.3 Default Rules (Opt-Out, Ruthlessly Few)
- "Your DRep voted against your stated position" — fires only when divergence exceeds threshold
- "A proposal matching your interests opened"

### 18.4 Composable Custom Rules (Zapier for Governance)
- "When [DRep X] [posts a rationale] on [any Treasury proposal], notify me via [Telegram]"
- "When the Temperature Check for [Proposal Y] reaches [Pass threshold], notify me via [ADAmail]"
- "Weekly digest of [all proposals where my domain reputation is high]"

### 18.5 Calendar Integration
- Google Calendar / Apple Calendar / Outlook
- Subscribable .ics feed for governance events
- DRep AMA bookings push to delegator calendars automatically

---

## 19. Midnight Privacy Layer

**Status:** Phase 3+ aspiration. Funded ideally by a Midnight Foundation grant.

### 19.1 Use Cases

- **Anonymous delegation via ZK proof** — prove you delegated to a specific DRep without revealing your wallet
- **Shielded GovScore oracle** — prove your GovScore exceeds a threshold (e.g., 80) without revealing your exact score or wallet
- **Private soulbound identity** — for sensitive governance contexts where pseudonymity matters
- **Confidential deliberation mode** — rationales time-locked, unsealed only when voting closes; prevents coordination and groupthink during deliberation

### 19.2 Why This Earns a Grant

The Midnight Foundation explicitly funds flagship dApps demonstrating ZK and privacy primitives on Cardano. ADApolis provides a **highly visible, civic-impact use case** that ties privacy to legitimacy — which is exactly the narrative they need.

---

## 20. Smart Contract Architecture

Pure ADA + Plutus. No secondary token. Four contracts.

### 20.1 SeasonPool.plutus
- Holds Catalyst grant + accumulated fees + NFT royalty allocations
- Distributes ranked ADA prizes to top DReps and their delegators at season end
- Fully transparent, fully automatic
- Prize Pool Minimum Guarantee enforced from reserve

### 20.2 DelegatorYield.plutus
- When a DRep earns ADA from Season prizes or NFT royalties, a configured percentage auto-routes here
- Delegators pull their share proportional to stake and lock duration
- Conviction-lock multipliers: 30-day = 1.5×, 60-day = 2.0×, 90-day = 2.5×
- Aligned-incentive: delegators get returns on their trust, DReps get a stable supportive base

### 20.3 ReputationNFT.plutus
- Mints Soulbound badge NFTs on milestone achievement
- Mints Champion Cards at season end (top 10 DReps)
- Mints Living NFT on first user action
- Implements the free-mint window for delegators after Champion Card mint
- Routes 10% royalty on secondary sales (3% DRep / 3% Pool / 3% Top-10 Holders / 1% Project)
- Implements top-10 holder concentration cap

### 20.4 TemperatureCheck.plutus *(if implemented on-chain)*
- Records signed Temperature Check votes
- Anchors final results as metadata transactions
- Not strictly necessary on-chain — can be off-chain with hash anchoring; final decision TBD based on storage costs

### 20.5 What Is Deliberately Off-Chain
- GovScore database (Supabase) — recomputed every epoch, snapshot signed on-chain at season end
- Argument graph (Supabase) — node hashes anchored on-chain via metadata transactions
- Delegator alignment signals — recorded off-chain, surfaced as aggregate signals
- AI-generated content — cached in Supabase + CDN

You don't put the scoreboard on-chain — just the settlements. One signed snapshot per season triggers the Plutus contracts to distribute everything automatically.

---

## 21. Open Data and Progressive Decentralization

### 21.1 From Day One
- Every argument, vote, rationale, reputation score, and signal queryable via public REST + GraphQL API
- Reputation algorithm open-source with parameter-tuning sandbox
- All AI prompts publicly documented
- Standard-format exports (CSV, Parquet, JSON-LD)
- MIT-licensed core platform code
- GovScore oracle endpoint queryable by external dApps (potentially fee-bearing for B2B users — feeds Rewards Pool)

### 21.2 The Progressive Decentralization Arc

**Year 1:** Solo build → public launch → Catalyst funding
**Year 2:** Argument graph hashes anchored on-chain via metadata. Open API matures. Independent forks emerge. Reputation parameters periodically re-tuned via community vote.
**Year 3:** Platform governance handed to a council elected through the platform's own deliberation system. Eat your own dog food.
**Year 4:** Treasury-funded operations via on-chain governance action — voted on by the very system you enabled. Feature CIPs in active review.
**Year 5+:** Best features absorbed into the Cardano protocol itself. The platform retires features as they go on-chain. The win condition: ADApolis progressively becomes unnecessary as the protocol absorbs its best ideas.

---

## 22. Six Rings of Expansion

ADApolis is not a Cardano-only tool long-term. The architecture generalizes.

| Ring | Scope | Timeline |
|---|---|---|
| **1** | Cardano DReps (on-chain, fully verifiable) | Now |
| **2** | All Web3 DAOs (Snapshot, Tally, Compound, Uniswap, cross-chain) | Year 1 |
| **3** | Local and community governance (city councils, school boards, neighborhood associations) | Year 2 |
| **4** | National elected officials (US Congress, UK Parliament, EU Parliament — all public data) | Year 2–3 |
| **5** | Public figures and influencers (position consistency, prediction accuracy, conflict disclosure) | Year 3 |
| **6** | Universal civic identity — the missing accountability layer of the internet | Long-term |

The pattern: each ring builds on the credibility and infrastructure of the one before. By the time we approach Ring 4, we won't be asking for permission. We'll have a working system with documented data showing participation lift, and an oracle other systems already query.

This is the most ambitious vision element. It is explicitly a north star, not a v1 feature. But every architectural decision should be evaluated against whether it serves the long arc.

---

## 23. Economics and Monetization

The platform is **free to use**. We make money in aligned ways that strengthen the system.

### 23.1 Revenue Streams

| Stream | Year 1 Estimate | Notes |
|---|---|---|
| Genesis NFT primary sale | ₳25,000 one-time | 500 cards × ₳50 |
| NFT secondary royalties (7% split) | ₳35,000 | Assuming ₳500K secondary volume at 1% NBA Top Shot scale |
| Battle Pass (optional, ₳5/season) | ₳5,000 – ₳25,000 | Cosmetic perks, leaderboard frames, custom guild themes |
| Catalyst Fund 14 grant | $50–150K USD | Already mapped to governance infrastructure category |
| Midnight Foundation grant | TBD | For ZK privacy layer (Phase 3+) |
| B2B Intel subscriptions | $0 → $10K USD/yr | SPO pools, DeFi protocols, whale wallets paying for governance intelligence |
| GovScore oracle query fees | $0 → $5K USD/yr | External dApps querying reputation as a trust signal |
| Treasury Withdrawal (long-term) | TBD | A governance action voted on by the very system we enabled |
| AI BYOK and ADA tips | Negligible | Covers AI cost variance |

### 23.2 The 7% Champion Card Royalty (recap)

Every secondary sale of a Champion NFT:
- 2% to the DRep depicted
- 2% to the Rewards Pool (feeds next season's prizes)
- 2% split proportionately among top-10 card collectors (with concentration cap)
- 1% to the project team (platform operations)

Genesis Cards follow the same split. Cards are framed and marketed as **pure collectibles** — no profit promises, no governance rights attached.

### 23.3 The Aligned Monetization Principle

Every revenue stream above either:
- Reflects value the platform actually creates (royalties on cards we minted, query fees on data we curate)
- Comes from outside the system (Catalyst, Midnight, B2B subscribers) and flows inward
- Is opt-in (Battle Pass, BYOK)

**What we do not do for revenue:**
- No platform token sold to retail
- No paid placement of DReps on the Scoreboard (visibility is earned, never sold)
- No paid placement of proposals
- No ads
- No sponsored Champion Cards
- No tax on actual voting

### 23.4 Path to Self-Sustainability

- **Year 1:** Catalyst grant bridges costs; Genesis NFT sale covers Season 1 prize pool
- **Year 2:** NFT secondary royalties cover operations; first B2B subscriptions
- **Year 3:** Treasury withdrawal proposal voted on through ADApolis itself — the platform funds itself through the system it improved
- **Year 4+:** Self-sustaining via royalty + subscription + oracle stack

### 23.5 Open Question: How Aligned vs. Mercenary

The above is the *aligned* default. There's an aggressive end of the spectrum (sponsored visibility for DReps clearly marked as such, featured-proposal boosts, premium analytics for institutional users). I've kept those out of v0.3 because the credibility risk in a governance context is high. **User's call** — Open Question, Section 29.

### 23.6 Coalition Quarterly Reports — First Revenue Product

**This is ADApolis's first paying product, launching alongside the Scoreboard in Phase 2.**

**What it is:** A premium quarterly report service for Coalitions (DRep DAO, future coalitions). Each report includes:
- Full member activity tracking against the coalition's custom thresholds
- Aggregated coalition voting record with rationale links
- Position alignment analysis (where members agreed, where they diverged)
- Comparison vs. other Coalitions (anonymized)
- Coalition reputation trajectory
- Custom branding (PDF + dashboard link with their logo)
- Drafted "talking points" for the coalition's own quarterly publication

**Why this works as the first product:**
- **The data is already there.** The Scoreboard tracks every metric a coalition needs. Coalition Reports are essentially a report-generation layer on top of existing data — minimal additional engineering.
- **Coalitions need this.** The DRep DAO's Charter requires quarterly reports per the Incentive Framework. They have no good way to produce them yet. ADApolis becomes their report-generation tool.
- **Coalitions can pay.** The DRep DAO has a $1M illustrative annual budget. ₳200-500/quarter (~$50-150 USD) per coalition for a professional report is trivial spend for a body with that budget.
- **B2B revenue from day one.** This produces revenue in Phase 2, not Phase 10. Lean startup discipline: ship revenue early.

**Pricing tiers (illustrative):**
- **Public coalition profile** — free, every coalition gets one
- **Standard Quarterly Report** — ₳200/quarter (~$50 USD) — PDF + dashboard
- **Premium Quarterly Report** — ₳500/quarter (~$125 USD) — adds custom branding, talking points, comparative analysis, dedicated support
- **Enterprise** — custom pricing — bespoke metrics, longer-term contracts

**Revenue projection:**
- Year 1: 3-5 coalitions × Standard tier = ~₳3,000-5,000/year (modest but real)
- Year 2: 10-15 coalitions × blend of Standard/Premium = ~₳15,000-30,000/year
- Year 3: 20+ coalitions including cross-chain DAOs paying through Ring 2 expansion = ~₳50,000+/year

**Strategic value beyond revenue:**
- Coalitions become *committed users* (sunk cost on subscription = retention)
- Every Coalition Report is a marketing artifact (their members see ADApolis branding monthly)
- Builds the reference customer base needed for higher-tier ADApolis Intel sales
- Establishes ADApolis as "the platform that helps coalitions run" — a different and more defensible positioning than "the platform for delegators"

### 23.7 ADApolis Intel — B2B Subscription Product

A serious, paid product. Not just a revenue line item — a full feature track.

**What it is:** A subscription-based intelligence dashboard for institutional actors that need to track Cardano governance closely. The free public product is excellent. Intel offers the additional capabilities that institutional users will pay recurring ADA or fiat for.

**Target customers:**
- **SPOs (stake pool operators)** — need to know vote-direction signals on proposals before voting closes, especially hard-fork and parameter-change proposals affecting their operations
- **DeFi protocols** — need advance warning on treasury actions, parameter changes, or constitutional amendments that affect liquidity, collateral, or smart-contract behavior
- **Whale wallets and institutional holders** — need to track DRep behavior on proposals affecting their large stakes
- **Founding entities (IOG, CF, Emurgo, Intersect)** — need consolidated governance health reports for their working groups
- **Project Catalyst and Catalyst-funded teams** — need to understand how their funding category is performing against KPI standards
- **Journalists and analysts** — need curated digests, embargo-respecting briefings, and quotable trend data
- **Other governance researchers and academic teams** — need data exports and queryable APIs above free-tier rate limits

**Features:**
- Real-time Temperature Check delta alerts (when sentiment swings >X%)
- Pre-vote DRep position predictions weighted by individual DRep credibility
- Coalition tracking — alerts when major Coalitions publish positions
- Custom proposal watch-lists with notification rules
- Embargoed daily briefing emails
- Higher API rate limits + dedicated query support
- Bulk data exports in research-friendly formats
- Direct line to platform support for urgent questions

**Pricing tiers (illustrative, finalize later):**
- **Free tier** — the public product (Scoreboard, Proposal Hub, basic API). No subscription.
- **Pro tier** — ~$50–100/month or equivalent in ADA — single-user dashboard, alerts, higher API limits
- **Team tier** — ~$200–500/month — multi-user, custom watch-lists, dedicated support
- **Enterprise tier** — custom pricing — bespoke reporting, embedded analytics, white-glove support

**Revenue projection:** Conservative — if 5 SPOs, 5 DeFi protocols, 3 institutional holders, 5 research/journalist seats subscribe at Pro/Team blend by year 2, that's $15-40K/year in recurring revenue. By year 3 with broader adoption, this should reach $50-150K/year and grow with Cardano's institutional footprint.

**Why this is aligned, not mercenary:**
- The Intel product is *built on top of* the public free product, not extracted from it
- Free-tier users get an excellent experience; paying users get *additional* value (depth, speed, customization, support)
- The information sold (sentiment, alerts, exports) is information the platform is generating anyway
- Subscriptions fund the platform's operations, reducing dependence on treasury withdrawals
- No paid placement, no advocacy distortion, no influence on votes themselves

**Critical guardrail:** Intel subscribers do *not* get any ability to influence governance outcomes, surface their proposals preferentially, or hide their tracking activity. The information flows one direction — out to subscribers. The platform's governance role never serves subscribers over the broader community.

### 23.8 GovScore Reputation Oracle — External Query Service

A composable identity primitive for the Cardano ecosystem.

**What it is:** External dApps can query ADApolis's API for any wallet's GovScore, Soulbound badges, Class, Saga progress, and Coalition memberships. This makes ADApolis a *reputation oracle* — other applications can use ADApolis-verified governance reputation as a trust signal in their own systems.

**Examples of consumption:**
- A DeFi protocol that wants to offer lower collateral requirements to users with high Constitutional Scholar reputation
- An NFT mint that wants to whitelist only "Verified DRep" badges
- A job board that wants to surface candidates with demonstrated governance leadership
- A Cardano-native DAO that wants to weight votes by external reputation
- Other governance dApps that want to display ADApolis reputation alongside their own data

**Pricing model:**
- **Public queries** — free, rate-limited (~100 queries/hour per IP)
- **Authenticated API key** — higher rate limits, paid by query or monthly subscription
- **Enterprise integration** — custom pricing, includes webhooks, real-time updates, dedicated infrastructure

**Revenue projection:** Modest in early years — perhaps $5-20K/year by year 2 — but with major upside as Cardano dApps mature. The platform becomes more valuable as more dApps depend on it; that creates a virtuous cycle.

**Why this matters strategically:**
- It makes ADApolis governance reputation *portable and composable* — the killer property of Web3 primitives
- It reinforces ADApolis's role as governance infrastructure (not just a destination dApp)
- It generates revenue that scales with ecosystem growth without compromising the public product
- It provides the foundation for the eventual Ring 2 expansion (Section 22) — ADApolis becomes the reputation layer that ports across chains

### 23.9 Full Monetization Stack — Summary

| Stream | Status | Year 1 estimate | Notes |
|---|---|---|---|
| **Coalition Quarterly Reports** | **Phase 2 — first revenue** | ₳3,000–5,000 | Year 1 starter; scales as more coalitions form |
| Founding Members Mint (Genesis Cards) | Phase 7 | ₳25,000 one-time | 500 credentials × ₳50, membership not investment |
| Catalyst Fund 14 grant | Phase 3-4 | $50–150K USD | One-time |
| Champion Card royalties (7%) | Phase 7+ | ₳35,000 | Pure collectible framing |
| ADApolis Intel B2B subscriptions | Phase 5+ | $15–40K/yr ramping | Brought forward from Phase 10 for early revenue |
| Battle Pass (₳5/season, optional) | Phase 7+ | ₳5,000–25,000 | Cosmetic only |
| Midnight Foundation grant | Phase 10 | TBD | For ZK privacy layer |
| GovScore Oracle query fees | Phase 10 | $5–20K/yr ramping | Scales with ecosystem |
| Treasury Withdrawal grant | Phase 4+ | TBD | Long-term sustainability |
| AI BYOK and ADA tips | All phases | Negligible | Covers AI cost variance |

**The lean-startup revenue arc:**
- **Phase 2 (~Month 4):** First paying customer — Coalition Quarterly Reports go live alongside the Scoreboard. Modest revenue, but real.
- **Phase 3-4 (~Month 6):** Catalyst Fund 14 grant if approved — bridges development.
- **Phase 5+ (~Month 10):** ADApolis Intel subscriptions begin. Real B2B revenue. Funds operations.
- **Phase 7 (~Month 14):** Founding Members Mint + Champion Cards. NFT economics come online.
- **Phase 10+ (~Year 2):** Oracle, Midnight grant, treasury sustainability proposal.

The combined stack is designed so that by month 12, ADApolis has revenue from at least three independent sources (Coalition Reports + Intel subscriptions + grants), and by year 3 is fully self-sustaining without grant dependency.

---

## 24. Third-Party Integration Strategy

**Principle: Build only what doesn't exist. Link to everything that does.**

### 24.1 Build (We Own These)
- Argument graph engine
- Multi-source DRep reputation scoring
- Temperature Check
- Fantasy Draft mechanics
- Champion Card NFT system
- Civic Identity NFT system (unified — replaces separate Living NFT + Soulbound badges + Civic Character)
- AI Layer with caching and BYOK
- The Lab simulator
- DRep Workstation
- The Scoreboard
- Coalition Quarterly Reports (paid product)

### 24.2 Reference (Borrow Patterns, Don't Fork)

After investigation in Phase 0 (TrustLevel Assessment, 2026-05-23), decision was **build fresh, do not fork**. TrustLevel's Grant_Review_Tool is dormant, single-maintainer, narrowly Catalyst-review-coupled, with an unresolved license gap. Patterns worth borrowing:
- JWT middleware shape
- React AuthProvider + useAuthFetch pattern
- Anthropic SDK summarization call pattern
- Admin/role UI patterns

These are 3-6 dev-days of boilerplate, regeneratable from `create-next-app` + a backend starter + Mesh/Lucid for Cardano.

### 24.3 Integrate (Link or Embed, Don't Reinvent)

| Function | Service |
|---|---|
| Vote casting | **GovTool** (Intersect) — handoff for actual signing |
| Wallet connection | **Lace, Eternl, Nami, Typhon, Flint** via CIP-30/95 |
| On-chain data (primary) | **Koios** |
| On-chain data (fallback) | **Blockfrost, Maestro, DB-Sync** |
| Tx exploration | **Cardanoscan, CExplorer** (link out) |
| Forum embed / cross-post | **Cardano Forum (Discourse JSON API)** |
| Server-level notifications | **Discord webhooks** |
| Wallet-native email | **ADAmail** (primary notification channel) |
| Funding | **Project Catalyst, Midnight Foundation, Intersect** |
| Educational link-out | **Intersect docs, Cardano Docs** |
| Display names | **ADAhandle** |
| Argument backup storage | **IPFS / Arweave** |
| Existing governance dashboards | **1694.io, Tempo, Atrium** (link, don't compete) |
| AMA scheduling | **Calendly** (or native build later) |
| DRep video pitches | **Loom, YouTube** (embedded) |
| DRep long-form publishing | **Substack** (cross-post) |
| Social cross-post | **Twitter/X, Mastodon, Farcaster** |
| Historical stake data | **AdaStat** |
| Pool / stake info | **Pool.pm** |
| NFT marketplaces | **JPG Store** (primary), fibo.io |
| Governance data secondary source | **syncgovhub.com** |

### 24.4 DRep DAO Integration

The DRep DAO (Section 15A.8) is the first major real-world Coalition ADApolis will serve. Integration is staged:

**Available at ADApolis launch (no extra build needed):**
- Member-activity tracking via the Scoreboard's raw GovScore metrics
- Public DRep profiles for every DRep DAO member
- Rationale URL aggregation for transparency
- Public archive of all on-chain votes by members

**Available shortly after launch (small-scope additions):**
- Coalition-defined active-member filter applying the DRep DAO's 90/100/50 thresholds (Phase 2, ~1 day of work)
- Coalition page for the DRep DAO with members, mission, recent positions (Phase 5A)
- Quarterly automated "active member" report aligned to their reward period

**Available through normal feature rollout:**
- Temperature Check as the DRep DAO's voting infrastructure (Phase 3)
- Argument Graph for their structured deliberation needs (Phase 3)
- Joint Rationale Studio for collective recommendations (Phase 5A)
- Cross-coalition coordination protocol when other coalitions form (Phase 5A)

**What we do not do for the DRep DAO:**
- We do not become their official platform (avoid entanglement)
- We do not build features they ask for that aren't on the broader ADApolis roadmap (avoid scope creep)
- We do not give them special treatment over other coalitions (avoid centralization)
- We do not charge them for what we'd provide any coalition (the platform is free; revenue comes from NFT royalties, optional Battle Pass, B2B Intel subscriptions)
- We do not pursue funding from them ahead of Catalyst (proper sequence: Scoreboard → Catalyst → trust)

The relationship model is simple: ADApolis builds infrastructure for all Cardano coalitions. The DRep DAO is one such coalition. Our success is measured by whether multiple coalitions (including but not limited to the DRep DAO) find ADApolis useful enough to make it their default tooling.

---

## 25. What We Deliberately Do Not Build

Scope discipline calls. Each is justified.

- **No platform token.** Token gravity destroys mission-driven projects. ADA is the unit of value. *(Tentative — reversible if a strong case emerges, but the default is no.)*
- **No wallet.** We integrate with wallets.
- **No vote-casting flow in v1.** GovTool exists and is trusted. We link out.
- **No vote-outcome prediction markets.** This is the most important "no." Financial incentives on vote outcomes corrupt the governance incentive. See Section 2.4 and Sections 11–12 for what replaces them.
- **No real-money speculation on votes themselves.** Markets are parallel only (e.g., card secondary trading, fantasy team draft entries).
- **No anonymous-by-default accounts.** Pseudonymous wallets yes, but every action is publicly traceable to that wallet. This is governance, not Twitter.
- **No "engagement gamification."** No daily login bonuses, no vote-to-earn, no NFT-for-just-existing drops. The fantasy and reward layers reward substance, not volume.
- **No moderation by us.** Reputation-weighted community moderation. Algorithm is open.
- **No closed-source AI.** All prompts public. All outputs challengeable.
- **No paid placement** for DReps, proposals, or arguments. Visibility is earned.

---

## 26. User Journeys

### 26.1 "Casey" the Casual Delegator

1. Lands on the homepage. One CTA: "Find your DRep in 3 minutes."
2. Picks Speak Your Mind. Types: "I care about Cardano being decentralized and the treasury not being wasted."
3. AI parses → personality: "The Decentralization Hawk." Three DRep matches.
4. Clicks top match — sees their flip-card, their stats, recent rationales.
5. Clicks "Delegate via GovTool." Signs transaction. Done.
6. Sets notifications.
7. Two weeks later, push: "Your DRep just voted against your Decentralization Hawk position on Proposal X. Here's why." Casey reads, disagrees mildly, understands.
8. Three months later, Casey returns. Their DRep is in Top 10 Power Rankings. Casey feels validated. Starts checking weekly.
9. Six months later, Casey's DRep wins the Treasury Season Championship. Casey gets a notification: "You have 7 days to mint your free Champion Card." Casey mints it, posts it on Twitter. Friends ask what ADApolis is.

### 26.2 "Dev" the DRep

1. Imports existing positions via wallet history + Forum cross-link.
2. Registers as DRep via in-platform flow (handoff to GovTool).
3. Opens DRep Workstation. Sees all active proposals with custom briefs.
4. Uses Rationale Studio for Treasury vote rationale. AI surfaces three similar past withdrawals, cites the Constitution, suggests citations. Dev edits, polishes, publishes to chain + Forum + ADAmail subscribers.
5. Posts a structured argument in the argument graph contesting an opposing DRep's position.
6. Schedules a head-to-head structured debate with that DRep.
7. The debate happens, is recorded, becomes a citable artifact.
8. Dev's Treasury-domain reputation rises. New delegators arrive. Power Ranking climbs.
9. Season end: Dev finishes #7. Champion Card mints automatically. Dev gets 5 copies; 142 delegators mint their free copies; 38 fantasy teams that drafted Dev each get 1 card. Secondary trading begins on JPG Store. Dev starts earning 3% royalties on every trade.
10. Year 2: Dev's career legacy score makes them a tier-1 DRep. They run the Treasury Hawks Coalition. Their Mind-Mover Award on the Hard Fork proposal is cited in IOG research.

### 26.3 "Alex" the Fantasy Player / Card Collector

1. Joins the public mega-league. Drafts roster of 5 DReps. Picks one underdog at #45 in Power Rankings.
2. Studies stats obsessively. Reads rationales to evaluate quality. Becomes informed by accident.
3. Mid-season: their underdog jumps to #18. The Underdog Multiplier kicks in.
4. End of season: Alex's roster wins the league. Pays out ₳480 from Season Pool.
5. The underdog finishes #4 — Alex gets a free Champion Card automatically. Stares at it on JPG Store. Holds.
6. Season 4: Alex now owns 12 Champion Cards across different DReps. Becomes a top-10 holder for two DReps and earns ongoing royalty share from secondary trades.
7. Year 2: Alex is following 24 DReps closely, has informed positions on every active proposal, participates in argument threads, runs a guild.

The funnel works in all directions.

---

## 27. Tech Stack

### 27.1 Frontend
- **Next.js 14** (App Router)
- **Tailwind CSS**
- **Mesh.js** for Cardano wallet integration and on-chain reads
- **React Query** for data caching
- **Framer Motion** for card flip animations and transitions

### 27.2 Backend
- **Node.js** API routes (or separate Express server if scale demands)
- **Supabase** (Postgres) for off-chain data
- **MongoDB** *if* we fork TrustLevel's Grant_Review_Tool — otherwise Postgres-only
- **Redis** for caching AI outputs and hot queries

### 27.3 Hosting
- **Railway** for frontend + serverless API (free tier covers MVP)
- **Supabase** for database (free tier covers MVP)

### 27.4 Smart Contracts
- **Plutus V3** (current ledger version supports CIP-1694 features)
- **Aiken** as the higher-level smart contract language (cleaner DX than raw Plutus)

### 27.5 Data Sources (Recap)
- **Koios** — primary on-chain (free, public, CORS-enabled with server proxy)
- **Cardano Forum Discourse JSON API** — free, public, no auth
- **GitHub API** — free, opt-in via CIP-119 references
- **Twitter/X API** — $100/mo Basic tier, opt-in only, optional
- **CIP-119 / CIP-100** metadata fetch (IPFS / GitHub)
- **syncgovhub.com** — secondary

### 27.6 AI
- **Claude API** (Anthropic) — primary
- **Haiku** for cheap cached tasks; **Sonnet** for higher-quality assessments
- **BYOK** support for Anthropic and OpenAI
- Aggressive caching layer in Redis + Supabase

---

## 28. Phase Plan Summary

*Full roadmap lives in a separate document (ROADMAP.md, to be drafted next).*

- **Phase 1 — Foundation (Weeks 1–2):** Read CIP-1694 stack. Register as DRep. Publish DRep platform statement. Competitive audit. Scaffold repo. Fork-or-build decision on TrustLevel Grant_Review_Tool.
- **Phase 2 — The Scoreboard (Weeks 3–10):** Ship the flip-card DRep discovery page with Koios participation data. Add CIP-119/100 fetch. Add Forum API. Add Quadratic ADA dampening. Soft launch to Cardano community.
- **Phase 3 — Substance (Months 3–6):** Argument graph + Temperature Check + AI summarizer + Layman On-Ramp + DRep Workstation. Catalyst Fund 14 proposal submitted. The Lab MVP for advocacy.
- **Phase 4 — Game (Months 6–9):** Fantasy Draft + Quests + Streaks + Civic Identity NFT + Sagas. Founding Members Mint. Season 1 launches.
- **Phase 5 — Cards (Months 9–12):** Champion Card NFT minting + royalty distribution + secondary marketplace integration. Season 1 ends with first Champion drop. Season 2 begins.
- **Phase 6 — Push (Year 2):** Steelman tournaments. CIP submissions for Reforms 3, 4. The Lab publishes academic paper. Midnight Foundation grant for ZK privacy. B2B Intel subscriptions launch.
- **Phase 7+ — Expansion (Year 2–5):** Six Rings begins. Cross-chain DAO integration (Ring 2). Progressive decentralization arc. Self-funding via treasury withdrawal.

---

## 29. Open Questions

To be resolved as the project progresses. Updated as decisions land.

1. **Top-10 holder concentration cap mechanism.** Two options: (a) 1-card-1-vote with no wallet multiplier, or (b) per-wallet cap at 20% of the 3% royalty share. Need to decide which is more game-resistant.
2. **TrustLevel Grant_Review_Tool fork viability — DECIDED: build fresh.** Investigation completed 2026-05-23. TrustLevel is a single-maintainer (Dominik Tilman), dormant (0 commits in last 3 months), narrowly Catalyst-review-shaped codebase with no DRep/CIP-1694/CIP-30/wallet-connect code, an unresolved license gap (README says MIT, package.json says ISC, no LICENSE file, GitHub API returns null), and outdated AI model pinned (claude-3-haiku-20240307). Reusable surface ≈ 3-6 dev-days of generic boilerplate vs. 27-43 dev-days needed to rip out Catalyst domain. Borrow patterns (JWT middleware shape, AuthProvider pattern, Anthropic SDK call pattern), not the repo. Full report at `TRUSTLEVEL_ASSESSMENT.md` in research directory. *(Closed.)*
3. **Genesis Card sale securities review.** Pre-launch legal review needed depending on jurisdiction. Likely positioning: pure utility/collectible, no profit promises, no governance rights, no secondary-sale promotion by us. Reserve revisited.
4. **Royalty rate — DECIDED at 7% with 2/2/2/1 split.** Cards framed as pure collectibles, not financial products. *(Closed.)*
5. **Battle Pass content.** Cosmetic only (frames, themes, guild banners), or some functional perks? Functional perks risk crossing into pay-to-win territory. Default: cosmetics only.
6. **Card transferability for Genesis Cards.** Living NFT and Soulbound badges are non-transferable. Champion Cards are transferable. Genesis Cards: transferable or soulbound? Lean transferable with original-holder marker.
7. **AI BYOK key handling.** Browser-only? Server-side proxy with encryption-at-rest? Implications for trust and liability.
8. **The aligned-vs-mercenary monetization question.** Section 23.5 keeps the default aligned. Open to revisiting if Catalyst doesn't materialize or growth stalls.
9. **Naming review** — *ADApolis* is the working title, confirmed for now. Pre-launch we may want a brand review (logo, domain availability, trademark check). Domain check now (govquest.io, govquest.xyz).
10. **Smart contract auditor.** Plutus contracts handling royalty splits and prize distributions will need a professional audit before mainnet launch. Budget estimate: $15–40K USD. Catalyst grant should cover.
11. **Sybil resistance ceiling.** Current plan: stake-age + delegation-presence + verification tiers. May need dedicated identity solution (Atala PRISM, Iagon, Persona) at scale.
12. **Mobile-first vs web-first.** **Decided: web-first for v1, responsive.** Native mobile in Year 2 if demand warrants. *(Closed.)*
13. **Academic Lab co-author for credibility.** **Decided: solo for now.** Revisit when Lab dataset is publishable. *(Closed.)*
14. **Treasury-funded coalition operational stipends.** Future direction (Phase 4+ CIP territory). Coalitions producing high-quality deliberation outputs become eligible for treasury-funded recurring stipends, voted on via on-chain governance action. Aligns DRep compensation with the work that's actually valuable. Not in scope for v1; flagged for the long-arc reform agenda.
15. **DRep compensation generally.** Currently DReps earn through: Champion Card royalties (passive), Season Pool prizes (competitive), Delegator Yield routing (delegation-aligned), and eventually coalition stipends (operational). Open question: is this enough to sustain serious DReps full-time, or do we need a fifth mechanism? Track real-world economics through Season 1–3 before reaching a conclusion.
16. **Civic Character class assignment — algorithmic vs. peer-validated.** Starting position: algorithmic auto-award based on observable behavior (rationale content, voting domain, argument graph activity). Open question: should peer-endorsement be added in Phase 5+ to make Class assignments higher-trust (and the badges queryable as expert-credentials by external dApps)? Lean: yes, add peer validation as a second tier (algorithmic Class is your "self-claimed" badge; peer-endorsed Class is your "verified expert" badge), but defer until the algorithmic version has been live for a season or two so we know what gaming patterns to defend against.

---

## 30. Version Log

- **v1.1 (2026-06-09)** — Sharpened Scoreboard discovery spec. Added Section 6.4.1 ("Find My DRep" default mode: participation gate → alignment ranking → lowest-ADA tiebreak). Added Section 6.6.1 (filter/sort/search/pagination mechanics). Clarified that domain-based and alignment-based discovery are Phase 2/3, keeping the Phase 1 Scoreboard scoped to participation + dampening.

- **v1.0 (2026-05-23)** — **Lock for execution.** Eight major structural changes completing the lean-startup pass. (1) New Section 1A introduces Lean Startup Discipline principles. (2) Section 9 consolidated: Living NFT + Soulbound badges + Civic Character classes → single Civic Identity NFT system. (3) Section 10 slimmed: Guilds cut entirely (replaced by Coalitions); now contains only Quests, Streaks, Referrals, and Sagas. (4) New Section 10.5 explicitly documents why Guilds were removed. (5) Section 11 simplified: Steelman + Devil's Advocate merged into single Mind-Mover Award with For/Against sub-categories. (6) Section 8.6 reframed: Genesis Cards renamed Founding Members Mint with permanent benefits, explicit non-investment positioning. (7) New Section 23.6 introduces Coalition Quarterly Reports as the first paid product (Phase 2 launch). (8) Monetization arc rewritten — first revenue in month 4 (Coalition Reports), then Catalyst grant, then Intel subscriptions, then NFTs. (9) Section 24 updated: TrustLevel decision locked at "build fresh, do not fork" per Phase 0 investigation. Open Question 2 closed. Fantasy League stays in MVP per founder decision. **The document is now the build spec.**

- **v0.9 (2026-05-22)** — Audit-driven integration of details from original chat that hadn't fully made it into earlier versions.

- **v0.8 (2026-05-22)** — Hosting decision: Railway (not Vercel). Domain registered: `adapolis.net`. Tech stack section (§27.3) updated. ETL infrastructure references aligned to Railway's scheduled-service model.

- **v0.7 (2026-05-22)** — Project renamed from **GovQuest** to **ADApolis**. Naming rationale: the Greek *polis* was simultaneously the civic-deliberative space, the sporting arena, and the festival venue — the same triple-function ADApolis is built to deliver (substantive governance + fantasy DRep draft + collectible card spectacle). The ADA prefix locks the brand Cardano-native; expansion to other ecosystems (Six Rings, CONCEPT §22) would happen under a different brand or rebranded entity at that time. All references throughout the three documents updated. Other content unchanged from v0.6.

- **v0.6 (2026-05-22)** — Integration of DRep DAO context (Charter v0.1, Incentive Framework v0.1, Code of Conduct v0.1 shared by user, all dated mid-May 2026 with June 2026 launch planned).

- **v0.5 (2026-05-22)** — Integration of "Structured Decentralization" document (community paper analyzing CIP-1694 limitations). Five additions: (1) new Section 2.5 articulating "accountability through transparency, not hierarchy" as core positioning, explicitly rejecting elected-executive models; (2) reform list expanded from 5 to 6 with new Reform 6 (Coalition Coordination Protocol); (3) DRep Coalitions promoted to first-class organizational primitive in new Section 15A with full mechanics, Coalition Workstation, and cross-coalition coordination protocol; (4) new Section 14A (Ecosystem Map) — visualization of Cardano's institutional landscape for newcomers; (5) new Section 16.4 (Strategic Coherence View in The Lab) — diagnostic tool for treasury fragmentation. New user category 4.11 (DRep Coalitions). Open Questions expanded with treasury-funded coalition stipends and broader DRep compensation track.

- **v0.4 (2026-05-22)** — Royalty rate set at 7% with clean 2/2/2/1 split (DRep / Pool / Collectors / Project). Cards explicitly framed as pure collectibles, not financial products — no profit promises, no governance rights attached to ownership. Open Question #4 closed.

- **v0.3 (2026-05-22)** — Full integration of decisions from the prior Claude.ai chat (pasted by user). Now includes: ADApolis name (locked), Scoreboard as Phase 1 anchor product with quadratic ADA dampening formula, Fantasy DRep Draft with 6-epoch seasons and Underdog Multiplier, Champion NFT Cards with full mint mechanics and 10% royalty split (3/3/3/1), Living NFT + Soulbound Badge tiers, Guilds/Quests/Streaks/RPG layer, Devil's Advocate Steelman mini-game, Temperature Check (replacing prediction markets), Six Rings of Expansion vision, four-contract Plutus architecture, AI Layer economics (cache + BYOK + ADA tips + community improvement), ADAmail as primary notification channel, Midnight privacy layer (Phase 3+ aspiration), aligned monetization model, TrustLevel Grant_Review_Tool fork as scaffolding path. Ten user categories formalized. Cardinal Rule (process not outcomes) elevated to Section 2.4.

- **v0.2 (incomplete)** — Aborted mid-write; never published.

- **v0.1 (2026-05-22)** — Initial concept doc. Twelve layers, three-persona view, integration strategy. Subsumed by v0.3 once prior-chat context arrived.

---

*This is a living document. Edit freely. Bump the version. Log the changes. The goal is a single source of truth for the platform vision that any contributor can read in 30–45 minutes and immediately understand the whole picture. When in doubt, read Section 2.4 — the Cardinal Rule — and decide from there.*
