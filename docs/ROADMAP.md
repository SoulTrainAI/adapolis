# ADApolis — Roadmap & Build Plan

**Roadmap Document — v1.0**
**Last updated:** 2026-05-23
**Companion to:** CONCEPT.md (v1.0), CLAUDE.md (in repo root)

---

## How to use this document

This is the operational doc. CONCEPT.md is the *what* and *why*. This is the *when* and *how*.

**Working model:**
- You execute tasks via Claude Code in your local repo
- I (Claude in this chat) act as PM — sequencing tasks, catching dependencies, flagging risk, helping debug
- You paste each task's prompt into Claude Code, let it work, report results back to me
- I update the status tracker, adjust scope, write the next prompt
- We move forward one task at a time, never skipping the dependency chain

**Prompt format:**
Every task has a copy-paste-ready prompt block. They're written to be self-contained enough that Claude Code can execute without needing you to translate or remember context. Most prompts assume the repo exists and Claude Code is running in the project root.

**Status tracker (Section 2):**
Always shows where we are. After each session, tell me what got done and I'll update.

**Time estimates:**
Assume solo work at ~10 hrs/week. Estimates are realistic, not optimistic. We will hit unexpected snags — that's fine. The roadmap is a guide, not a contract.

**Cardinal Rule reminder:** Every feature must align with CONCEPT.md Section 2.4 — fantasy and reward layers come from *process metrics* (participation, rationale quality, consistency), never from *outcome metrics* (whose side won the vote). If you catch me sequencing something that violates this, push back.

---

## 0. The Autonomous Workflow (use this — don't copy-paste tasks individually)

Once Phase 0 is complete and you have a repo with `CLAUDE.md`, `CONCEPT.md`, and `ROADMAP.md` committed, you stop copy-pasting individual task prompts. You give Claude Code one starter prompt per session, and it self-navigates the roadmap.

**The starter prompt — paste this when you `cd` into your repo and run `claude`:**

```
Read docs/CLAUDE.md, docs/CONCEPT.md, and docs/ROADMAP.md in that order.

Then begin the autonomous workflow described in CLAUDE.md:

1. Find the next unchecked task in the ROADMAP.md status tracker
2. Verify dependencies are complete
3. Execute the task following all the rules in CLAUDE.md
4. Update the tracker, commit, and continue to the next task

Stop when you hit any of the session-limit conditions in CLAUDE.md
(5 tasks done, a decision gate, a manual task, a paid-service step,
a production deploy, or anything you'd need my approval for).

When you stop, give me the status block defined in CLAUDE.md and
tell me what's next.

Start now.
```

That's it. One prompt per session. Claude Code runs autonomously through up to 5 tasks, then stops at a natural checkpoint and reports.

**What this gives up:** you're not reviewing every prompt I write. You're reviewing 5 tasks at a time after they're done.

**What this protects:** decision gates, manual steps, production deploys, paid services, and anything architectural — all of those still come back to you and me, never silent.

**The PM relationship still works:**
- I write detailed task definitions in ROADMAP.md (Claude Code reads them)
- I get pulled in at decision gates, manual steps, blockers
- I update CONCEPT.md and ROADMAP.md as decisions land
- You stay in the loop on quality and direction, not on syntax

**Cost note:** Claude Code running for an hour costs real money (Anthropic API tokens — typically a few dollars per autonomous session). It's negligible compared to your hourly worth, but track it. If a session burns $10+ you should know why.

**When to deviate from this workflow:**
- A task is going off the rails — interrupt CC, talk to me, get the prompt fixed
- A decision gate comes up mid-task — CC will stop on its own per CLAUDE.md
- You want to skip ahead or pull a later task forward — ask me first; I'll re-sequence

---



| Phase | What ships | Time (10hr/wk) | Key deliverable |
|---|---|---|---|
| **0** | Foundation week — manual setup + scaffolding | 1 week | Repo, accounts, "hello world" deployed at adapolis.net |
| **1** | Scoreboard MVP | ~4 weeks | Live ranking of every Cardano DRep on participation rate, flip-card UI, quadratic dampening |
| **2** | Scoreboard Full + **Coalition Reports** | ~5 weeks | Multi-source scoring + wallet connect + alignment compass + **first paid product** |
| **3** | Substance Layer | ~8 weeks | Proposal Hub, argument graph, Temperature Check, AI summarizer, Ecosystem Map |
| **4** | Layman On-Ramp + Civic Identity | ~4 weeks | Quiz + Speak Your Mind + DRep match + Civic Identity NFT + Sagas |
| **5** | DRep Workstation + **ADApolis Intel B2B** | ~5 weeks | DRep dashboard + Rationale Studio + ADAmail + **B2B subscription product launches** |
| **5A** | DRep Coalitions | ~4 weeks | First-class coalition primitive, Coalition Workstation, cross-coalition coordination protocol |
| **6** | Catalyst submission | ~1 week | Funding proposal + Forum mega-post + Twitter series |
| **7** | Founding Members Mint + Fantasy | ~6 weeks | Plutus contracts + Founding Members Mint + Fantasy Draft + Season 1 |
| **8** | Champion drop + Season 2 | ~3 weeks | First Champion Card mint with royalty distribution |
| **9** | The Lab | ~6 weeks | Counterfactual simulator, Strategic Coherence View, academic preprint draft |
| **10** | Expansion & CIPs | ongoing | CIP drafts for Reforms 3/4/6, Midnight grant, GovScore Oracle, Ring 2 |

**Revenue arc:**
- **Phase 2 (~Month 4):** First paid product — Coalition Quarterly Reports
- **Phase 3–4 (~Month 6):** Catalyst Fund 14 grant if approved
- **Phase 5 (~Month 10):** ADApolis Intel B2B subscriptions
- **Phase 7 (~Month 14):** Founding Members Mint + Champion Card royalties
- **By Year 2:** Three independent revenue streams active

**Total to Champion drop: ~7–8 months of part-time work. Lab and CIPs ongoing thereafter.**

---

## 2. Status Tracker

```
PHASE 0 — Foundation
[x] 0.1  Read CIP-1694 stack (via crash course)
[x] 0.2  Domain registered: adapolis.net
[~] 0.3  DRep registration — SKIPPED by founder decision
[x] 0.4  Set up accounts (GitHub, Railway, Supabase, Anthropic)
[x] 0.5  TrustLevel fork investigation — DECISION: build fresh
[ ] 0.6  Initial repo scaffold (Claude Code) — NEXT
[ ] 0.7  Hello-world deploy to Railway
[ ] 0.8  Set up CONCEPT.md + ROADMAP.md in repo

PHASE 1 — Scoreboard MVP  (locked after Phase 0 complete)
[x] 1.1  Koios API client + types
[x] 1.2  Supabase schema for DRep cache
[x] 1.3  ETL job: fetch & store DRep list
[x] 1.4  ETL job: fetch & store vote history
[x] 1.5  GovScore v1 (participation rate only)
[x] 1.6  Quadratic ADA dampening
[x] 1.7  Scoreboard list page (server-rendered)
[x] 1.8  Flip-card component (front)
[x] 1.9  Flip-card component (back)
[x] 1.10 Voting streak calculation
[x] 1.11 Hover tooltips on metrics
[x] 1.12 Link out to rationales
[ ] 1.13 Custom domain + production deploy
[ ] 1.14 Soft launch announcement post
```

I'll keep this section live. After each task completes, the box gets checked and I'll add the next phase's checklist.

---

# PHASE 0 — Foundation Week

Goal: be ready to write code by end of week 1.

---

### Task 0.1 — Read the CIP-1694 stack
**Type:** Manual (reading)
**Time:** 6–10 hours
**Dependencies:** None
**Blocks:** Everything after Phase 0

Read these in order:
1. [CIP-1694 full spec](https://github.com/cardano-foundation/CIPs/blob/master/CIP-1694/README.md) — 2–3 hours
2. [PR #380 discussion thread](https://github.com/cardano-foundation/CIPs/pull/380) — skim the 200+ comments for community concerns (~1 hour)
3. [CIP-30](https://github.com/cardano-foundation/CIPs/blob/master/CIP-0030/README.md) and [CIP-95](https://github.com/cardano-foundation/CIPs/blob/master/CIP-0095/README.md) — wallet APIs (~1.5 hours total)
4. [CIP-119](https://github.com/cardano-foundation/CIPs/blob/master/CIP-0119/README.md) — DRep metadata schema (~30 min)
5. [CIP-100](https://github.com/cardano-foundation/CIPs/blob/master/CIP-0100/README.md) — governance metadata standard (~30 min)
6. [GovTool repo](https://github.com/IntersectMBO/govtool) — browse the code so you understand what already exists (~1 hour)

**Acceptance:**
- [ ] You can explain to a stranger what a DRep is, what a governance action looks like, and how votes are tallied
- [ ] You've taken notes on anything in CIP-1694 you disagree with or think could be improved (this becomes your DRep platform statement)

**PM note:** Skip this step and everything downstream gets harder. Don't write code yet.

---

### Task 0.2 — Domain decision
**Type:** Manual
**Time:** 30 minutes
**Dependencies:** None

Check availability for:
- `govquest.io`
- `govquest.xyz`
- `govquest.app`
- `govquest.org`
- `govquest.app`
- `gov-quest.com`

Register the best available. Set DNS to default for now — Railway config comes later.

**PM note:** If `govquest.io` is taken at a reasonable price, grab it. If parked at $5K+, fall back to `.xyz` or `.app` — both fine for a crypto-native product.

---

### Task 0.3 — Register as a DRep on Cardano mainnet
**Type:** Manual
**Time:** 30 minutes (plus 500 ADA reserved)
**Dependencies:** Task 0.1 (you need to understand what you're committing to)

1. Open Lace wallet (or Eternl with governance enabled)
2. Navigate to Governance → Become a DRep
3. Costs ~500 ADA deposit (refundable on deregistration)
4. Fill in CIP-119 metadata pointing to your platform statement (host on GitHub as a JSON file for now — we'll move to IPFS later)

**Draft DRep platform statement content:**
- Your name / handle
- The five reforms (quote from CONCEPT.md Section 3)
- Your commitment to publishing rationales on every vote
- Your commitment to engaging with delegator feedback
- Link to govquest.io (once registered)

**Acceptance:**
- [ ] Your wallet shows as a registered DRep
- [ ] Your DRep ID is captured somewhere safe (save it — you'll need it everywhere)
- [ ] Your CIP-119 metadata is fetchable via Koios

**PM note:** This is the most important manual step. You become a participant in the system you're building. It also gives you live data to test the Scoreboard against (your own DRep).

---

### Task 0.4 — Set up accounts
**Type:** Manual
**Time:** 30 minutes
**Dependencies:** None

Create accounts for (all free tier):
1. **GitHub** — for the repo (you likely have one)
2. **Railway** — railway.app → sign in with GitHub. Free $5/month credit handles MVP usage.
3. **Supabase** — create new project, name it `govquest`, save the URL and anon key
4. **Anthropic Console** — for Claude API key (for AI features later)
5. **Koios** — no signup needed; bookmark https://api.koios.rest/
6. **JPG Store** — bookmark for NFT marketplace later

Save all API keys and project URLs in a password manager. Do **not** commit them to the repo.

---

### Task 0.5 — TrustLevel fork investigation
**Type:** Manual + Claude Code (read-only)
**Time:** 1–2 hours
**Dependencies:** Task 0.4
**Decision gate:** Output of this task determines Task 0.6 prompt

Investigate whether to fork TrustLevel's Grant Review Tool as scaffolding or build fresh.

**Claude Code Prompt:**
```
Investigate the TrustLevel Grant_Review_Tool repository on GitHub
(https://github.com/Trust-Level/Grant_Review_Tool — verify exact URL).

I need you to:
1. Clone it locally to /tmp/trustlevel-review (or wherever convenient)
2. Read the README, package.json, and directory structure
3. Report back on:
   - Confirmed license (looking for MIT)
   - Last commit date (is it actively maintained?)
   - Tech stack (confirm: Next.js + Node + MongoDB + Supabase + Claude AI)
   - Auth flow architecture
   - Whether the codebase is structured around Catalyst proposal review
     specifically (which we'd need to rip out), or if it's domain-agnostic
   - Estimated effort to repurpose for CIP-1694 DRep governance scoring

Do NOT modify anything — read only. Write your findings to
/tmp/trustlevel-assessment.md

Be specific. We need to decide: fork this and adapt, or build fresh
on a clean Next.js 14 + Supabase scaffold. Estimated savings if we
fork: 2–4 weeks. Risk if we fork: dragging along Catalyst-specific
assumptions that don't map cleanly.
```

**Decision criteria after Claude Code reports back:**
- ✅ Fork if: MIT license confirmed, active in last 6 months, the auth + gamification + AI integration is genuinely reusable, ripping out Catalyst logic is < 1 week of work
- ❌ Build fresh if: stale repo, license is restrictive, architecture is too coupled to grant review specifically, or rip-out effort approaches the savings

Tell me what Claude Code reports back and we'll decide together.

**PM note:** I lean slightly toward "build fresh" because dragging unfamiliar architecture often costs more than it saves for a solo dev. But the data wins — let the assessment tell us.

---

### Task 0.6 — Initial repo scaffold
**Type:** Claude Code
**Time:** 2 hours
**Dependencies:** Task 0.5 (decision)

If we decided **build fresh**, use this prompt:

**Claude Code Prompt:**
```
Create a new Next.js 14 project for ADApolis, a Cardano governance
platform.

Setup:
- Project directory: ./govquest (create new directory)
- Next.js 14 with App Router and TypeScript
- Tailwind CSS
- ESLint with Next.js defaults
- Use the `src/` directory structure
- Import alias: `@/*`

Add these dependencies:
- @meshsdk/core and @meshsdk/react (Cardano wallet integration)
- @supabase/supabase-js
- @anthropic-ai/sdk
- zod (runtime validation for API responses)
- date-fns
- lucide-react (icons)
- framer-motion (for card flip animations later)

Create this directory structure:
- src/app/                  (Next.js App Router pages)
  - layout.tsx
  - page.tsx                (homepage — placeholder for now)
  - scoreboard/             (will house the Scoreboard later)
- src/components/           (React components)
- src/lib/                  (utilities)
  - supabase.ts             (Supabase client setup)
  - koios.ts                (Koios API client — stub for now)
  - claude.ts               (Anthropic client — stub for now)
- src/types/                (TypeScript types)
  - dre p.ts                (DRep, Vote, GovScore types — stubs)
- supabase/                 (Supabase migrations — empty for now)
  - migrations/
- docs/                     (project docs)
  - CONCEPT.md              (placeholder — I'll paste content)
  - ROADMAP.md              (placeholder — I'll paste content)

Create .env.local.example with:
- NEXT_PUBLIC_SUPABASE_URL=
- NEXT_PUBLIC_SUPABASE_ANON_KEY=
- SUPABASE_SERVICE_ROLE_KEY=
- ANTHROPIC_API_KEY=
- KOIOS_API_KEY=  (optional, public access works without)

Create .gitignore that excludes:
- node_modules
- .env.local
- .env*.local
- .next
- /coverage
- .DS_Store
- /tmp

Create a simple homepage at src/app/page.tsx that displays:
- "ADApolis" as the title
- Tagline: "The civic engine for Cardano governance"
- A placeholder section that says "Scoreboard launching soon"
- Tailwind-styled, dark mode by default, minimal

Initialize git, make initial commit "chore: scaffold ADApolis Next.js 14 + Tailwind + Mesh + Supabase".

Run `npm install` and verify everything compiles by running `npm run build`.

Report back with:
- Confirmation the build passed
- Any version conflicts you had to resolve
- The directory tree you created
```

If we decided **fork TrustLevel**, I'll write a different prompt — tell me first.

**Acceptance:**
- [ ] `npm run dev` shows the homepage at localhost:3000
- [ ] `npm run build` passes with no errors
- [ ] Repo pushed to GitHub
- [ ] `.env.local` populated with real credentials (locally only)

---

### Task 0.7 — Deploy to Railway
**Type:** Manual + Claude Code (helper)
**Time:** 30 minutes
**Dependencies:** Task 0.6

1. railway.app → "New Project" → "Deploy from GitHub repo" → select your `adapolis` repo
2. Railway detects Next.js and proposes a build config — accept defaults
3. Variables tab → add all environment variables from `.env.local` (Supabase URL, keys, Anthropic key, CRON_SECRET, etc.)
4. Settings → Networking → "Generate Domain" — you get a free `*.up.railway.app` URL
5. Verify the hello-world homepage loads at the Railway-generated URL
6. Settings → Networking → Custom Domain → add `adapolis.net` and `www.adapolis.net`
7. Update DNS at your domain registrar with the CNAME record Railway shows you
8. Wait 5-30 minutes for DNS propagation; Railway issues TLS automatically

**Acceptance:**
- [ ] Homepage loads at `https://adapolis.net`
- [ ] HTTPS works
- [ ] Build pipeline triggers on `git push` to main
- [ ] Environment variables loading correctly (test via a `/api/health` endpoint that returns Supabase connection status)

**PM note:** Even though the site says nothing yet, having it live with a real domain is psychologically huge. You now have a thing. Share the URL with one person you trust and feel good for an hour.

**Railway-specific notes:**
- Railway's default behavior is to deploy on every push to main. That's what we want.
- Railway free tier has $5/month credit, which covers a small Next.js app comfortably at MVP traffic. If usage exceeds it, expect $5-15/month total.
- Cron jobs (for ETL) come later as a separate Railway service in the same project (Phase 1, Task 1.3). Set up as Railway "Scheduled Service" — much cleaner than serverless cron.

---

### Task 0.8 — Drop concept + roadmap into repo
**Type:** Manual
**Time:** 5 minutes
**Dependencies:** Task 0.6

Paste the contents of CONCEPT.md (v0.4) into `docs/CONCEPT.md` in your repo.
Paste the contents of ROADMAP.md (this doc) into `docs/ROADMAP.md` in your repo.

Commit: `docs: add concept and roadmap`

**PM note:** Now they're versioned alongside the code. As they evolve, the repo history tells the story.

---

# PHASE 1 — Scoreboard MVP

**Goal:** A live ranking of every Cardano DRep, scored on participation rate, with the flip-card UI and quadratic dampening, deployed at govquest.io.

**Why this first:** It's the highest-leverage initial deliverable. It produces a citable artifact (the live leaderboard) on day one. It validates the data pipeline before we add complexity. It is the foundation every other layer depends on.

**Cardinal rule check:** Scoring is on participation rate (process metric). ✅

---

### Task 1.1 — Koios API client
**Type:** Claude Code
**Time:** 2 hours
**Dependencies:** Phase 0 complete

**Claude Code Prompt:**
```
We're building the Koios API client for ADApolis. Koios is a free,
public Cardano API at https://api.koios.rest/.

Goal: a typed TypeScript client that fetches the data we need
for the DRep Scoreboard.

In src/lib/koios.ts, build a client that exposes these methods:

1. listDReps(): Promise<DRepListItem[]>
   - Hits POST /api/v1/drep_list
   - Returns: { drep_id, hex, has_script, registered, deposit, active, expires_epoch_no }

2. getDRepInfo(drepIds: string[]): Promise<DRepInfo[]>
   - Hits POST /api/v1/drep_info with body { _drep_ids: [...] }
   - Returns enriched info per DRep including amount, active_until, etc.

3. getDRepMetadata(drepIds: string[]): Promise<DRepMetadata[]>
   - Hits POST /api/v1/drep_metadata
   - Returns the CIP-119 metadata URL and hash per DRep

4. getDRepVotes(drepId: string): Promise<DRepVote[]>
   - Hits POST /api/v1/voter_proposal_list with body { _voter_id: drepId }
   - Returns all votes cast by this DRep across all governance actions

5. listProposals(): Promise<Proposal[]>
   - Hits POST /api/v1/proposal_list
   - Returns all governance actions ever submitted

6. getProposalVotes(proposalId: string): Promise<ProposalVote[]>
   - Hits POST /api/v1/proposal_votes with body { _proposal_id: proposalId }
   - Returns all votes cast on this proposal

Use zod schemas to validate every response. If Koios returns
unexpected shape, throw a clear error with the actual response.

Add proper TypeScript types in src/types/cardano.ts for:
- DRepListItem
- DRepInfo
- DRepMetadata
- DRepVote (with vote: 'Yes' | 'No' | 'Abstain')
- Proposal
- ProposalVote

Use the native fetch API. Include retry logic: 3 attempts with
exponential backoff (1s, 2s, 4s) on 5xx errors only.

Document each method with JSDoc including the Koios endpoint URL
and a link to https://api.koios.rest/ for the live docs.

Write src/lib/koios.test.ts with vitest tests that mock fetch
and verify the client handles success, retries, and validation
errors correctly. Add vitest to devDependencies and configure it.

After implementation, run a quick manual sanity check by adding
a script at scripts/sanity-koios.ts that calls listDReps() and
prints the first 5 DReps to console. Run with `npx tsx scripts/sanity-koios.ts`.

Report back with: number of DReps Koios returned, the sample output,
and any quirks you noticed in the API.
```

**Acceptance:**
- [ ] `npx tsx scripts/sanity-koios.ts` prints 5 real DReps from mainnet
- [ ] Tests pass
- [ ] Types are clean (no `any`)
- [ ] You can articulate what each endpoint returns

**PM note:** This is the foundation of everything downstream. Take time here. Bad types now = pain forever.

---

### Task 1.2 — Supabase schema for DRep cache
**Type:** Claude Code
**Time:** 1.5 hours
**Dependencies:** Task 1.1

**Claude Code Prompt:**
```
Create the initial Supabase schema for ADApolis's DRep cache.

We're caching data fetched from Koios so we don't hit the live API
on every page load and so we can compute derived scores.

Create a migration file at supabase/migrations/0001_initial_schema.sql
with these tables:

1. dreps
   - drep_id (text, primary key) — the bech32 DRep ID
   - hex_id (text)
   - is_script (boolean)
   - is_registered (boolean)
   - deposit_lovelace (bigint)
   - active_epoch (integer)
   - expires_epoch (integer)
   - amount_lovelace (bigint) — ADA delegated to this DRep
   - delegator_count (integer)
   - metadata_url (text, nullable)
   - metadata_hash (text, nullable)
   - first_seen_at (timestamptz, default now())
   - last_synced_at (timestamptz, default now())

2. proposals
   - proposal_id (text, primary key)
   - tx_hash (text)
   - cert_index (integer)
   - block_time (timestamptz)
   - proposed_epoch (integer)
   - action_type (text)  -- e.g. 'TreasuryWithdrawals', 'InfoAction'
   - title (text, nullable) -- pulled from metadata later
   - dropped (boolean, default false)
   - ratified_epoch (integer, nullable)
   - enacted_epoch (integer, nullable)
   - expired_epoch (integer, nullable)
   - raw_metadata (jsonb, nullable)
   - first_seen_at (timestamptz, default now())

3. drep_votes
   - id (uuid, primary key, default gen_random_uuid())
   - drep_id (text, references dreps(drep_id))
   - proposal_id (text, references proposals(proposal_id))
   - vote (text, check vote in ('Yes', 'No', 'Abstain'))
   - block_time (timestamptz)
   - tx_hash (text)
   - rationale_url (text, nullable)
   - synced_at (timestamptz, default now())
   - UNIQUE (drep_id, proposal_id) — a DRep votes at most once per proposal

4. drep_scores
   - drep_id (text, references dreps(drep_id))
   - epoch (integer)
   - participation_rate (numeric)  -- 0.0 to 1.0
   - votes_cast (integer)
   - votes_eligible (integer)
   - rationale_rate (numeric)  -- % of votes with published rationale
   - streak_epochs (integer)
   - raw_govscore (numeric)
   - adjusted_govscore (numeric)  -- after quadratic ADA dampening
   - computed_at (timestamptz, default now())
   - PRIMARY KEY (drep_id, epoch)

Add indexes on:
- drep_votes(proposal_id)
- drep_votes(drep_id)
- drep_scores(adjusted_govscore DESC)  -- for leaderboard sort
- dreps(amount_lovelace DESC)  -- for whale queries

Enable Row Level Security on all tables.
Create policies for public read access on all four tables
(everything in this database is public on-chain data anyway).
Disable inserts/updates from anon — only the service role can write.

Create a TypeScript types file at src/types/database.ts with the
matching types for each table.

Document the schema with comments in the SQL file explaining what
each table represents.

After creating the migration, instruct me on:
1. How to run the migration against my Supabase project
   (likely: copy/paste into the Supabase SQL editor for the first run,
   or use supabase CLI if I have it installed)
2. How to verify the tables were created

Report back when done.
```

**Acceptance:**
- [ ] Tables visible in Supabase dashboard
- [ ] Migration file committed to repo
- [ ] You can write a test row to `dreps` via Supabase Studio and read it back

---

### Task 1.3 — ETL: fetch & store DRep list
**Type:** Claude Code
**Time:** 2 hours
**Dependencies:** Tasks 1.1, 1.2

**Claude Code Prompt:**
```
Build the first ETL (Extract, Transform, Load) job for ADApolis.

Goal: fetch the current list of all DReps from Koios and upsert
into the Supabase `dreps` table.

Create src/lib/etl/sync-dreps.ts that exports a function:

  async function syncDReps(): Promise<{
    fetched: number;
    inserted: number;
    updated: number;
    errors: string[];
  }>

Steps:
1. Call koios.listDReps() to get all DRep IDs
2. Chunk the IDs into batches of 50 (Koios limit on POST body)
3. For each chunk, call koios.getDRepInfo() AND koios.getDRepMetadata()
   in parallel
4. Merge the data into our `dreps` schema shape
5. Upsert into Supabase using ON CONFLICT (drep_id) DO UPDATE
6. Always update `last_synced_at = now()`
7. Track and return counts of inserted vs updated

Use the service role Supabase client (server-side only).
Create that client at src/lib/supabase-admin.ts using
SUPABASE_SERVICE_ROLE_KEY. Mark it server-only.

Create an API route at src/app/api/etl/sync-dreps/route.ts that
calls this function. Gate it behind a simple shared secret:
require header `x-cron-secret` matching `process.env.CRON_SECRET`.
Add CRON_SECRET to .env.local.example.

Also create scripts/run-etl-dreps.ts that can be invoked manually
via `npx tsx scripts/run-etl-dreps.ts` for local testing — bypasses
the API route, runs syncDReps() directly, prints the result.

Add structured logging using console.log with JSON output:
  console.log(JSON.stringify({ phase: 'sync-dreps', ...payload }))

Run the manual script once and report:
- Total DReps fetched
- How long it took
- Any data quality issues you noticed (missing metadata URLs,
  unexpected fields, etc.)
```

**Acceptance:**
- [ ] `dreps` table in Supabase populated with real DReps
- [ ] Re-running the script updates `last_synced_at` and doesn't duplicate
- [ ] You know roughly how many active DReps Cardano currently has

**PM note:** If Koios is slow or rate-limits you, switch to chunked sequential calls with a 200ms sleep. Don't optimize prematurely.

---

### Task 1.4 — ETL: fetch & store votes
**Type:** Claude Code
**Time:** 2 hours
**Dependencies:** Task 1.3

**Claude Code Prompt:**
```
Build the second ETL job: fetch and store all DRep votes.

Create src/lib/etl/sync-votes.ts that exports:

  async function syncVotes(): Promise<{
    proposals_processed: number;
    votes_inserted: number;
    votes_updated: number;
    errors: string[];
  }>

Steps:
1. Call koios.listProposals() — get every governance action
2. Upsert all proposals into the `proposals` table (similar pattern
   to sync-dreps, ON CONFLICT update)
3. For each proposal, call koios.getProposalVotes(proposalId)
4. For each vote returned, if voter_role === 'DRep', insert into
   `drep_votes` with ON CONFLICT (drep_id, proposal_id) DO UPDATE
5. Track counts, log per-proposal progress
6. Be respectful — 200ms sleep between proposal calls so we don't
   spam Koios

Create the matching API route at src/app/api/etl/sync-votes/route.ts
gated behind the same x-cron-secret.

Create scripts/run-etl-votes.ts for manual testing.

Run it once. Report:
- Total proposals on mainnet
- Total DRep votes recorded
- Total runtime
- Whether any rationale URLs were populated in the vote rows
  (look at the Koios vote shape — if rationale is exposed directly,
  capture it; if it's only in metadata you have to fetch separately,
  note that for Task 2.x)
```

**Acceptance:**
- [ ] `proposals` table has all current mainnet governance actions
- [ ] `drep_votes` table has individual vote records
- [ ] You can query Supabase: `SELECT drep_id, count(*) FROM drep_votes GROUP BY drep_id ORDER BY count DESC LIMIT 10` and see top voters

---

### Task 1.5 — GovScore v1 (participation rate)
**Type:** Claude Code
**Time:** 1.5 hours
**Dependencies:** Task 1.4

**Claude Code Prompt:**
```
Compute the first version of GovScore: participation rate only.

Definition (from CONCEPT.md Section 6.2):
  participation_rate = votes_cast / votes_eligible

Where:
- votes_eligible = governance actions that were active during the
  epochs in which this DRep was registered
- votes_cast = votes the DRep actually submitted (Yes, No, or Abstain
  — all three count as participation; not voting is the non-participation case)

Create src/lib/scoring/govscore-v1.ts exporting:

  async function computeGovScoresForEpoch(epoch: number): Promise<{
    dreps_scored: number;
    avg_participation: number;
  }>

For each registered DRep:
1. Find proposals that were votable during this epoch
   (proposed_epoch <= epoch <= expired_epoch OR ratified_epoch OR
   enacted_epoch — whichever ended their voting window)
2. Filter to proposals where the DRep was registered when voting
   was open
3. Count votes_eligible (the filtered set)
4. Count votes_cast (rows in drep_votes for those proposals where
   block_time falls in the voting window)
5. participation_rate = votes_cast / votes_eligible (handle div-by-zero
   — if 0 eligible, score is null not 0)
6. For now, raw_govscore = participation_rate * 100 (we'll add
   dimensions later)
7. Apply quadratic ADA dampening (see Task 1.6) and write to
   drep_scores

For now, defer the quadratic step — just write raw_govscore.
Task 1.6 wires in the adjusted score.

Create scripts/run-scoring-v1.ts that calls
computeGovScoresForEpoch() for the current epoch and reports
the top 10 by raw_govscore.

Run it. Show me the top 10 DReps by participation. We'll sanity-check
the math against known active DReps.
```

**Acceptance:**
- [ ] `drep_scores` table populated for current epoch
- [ ] Top 10 by participation looks plausible (active DReps you've heard of)
- [ ] No NaN, no negative scores

**PM note:** When you show me the top 10, I'll spot-check. If something looks off (e.g., a DRep with 100% but only 1 vote), we tune the eligibility logic.

---

### Task 1.6 — Quadratic ADA dampening
**Type:** Claude Code
**Time:** 30 minutes
**Dependencies:** Task 1.5

**Claude Code Prompt:**
```
Add quadratic ADA-power dampening to GovScore.

Formula (from CONCEPT.md Section 6.3):
  ada_m = amount_lovelace / 1_000_000_000_000  // convert lovelace to millions of ADA
  dampener = 1 / (1 + Math.log10(ada_m + 1) / 4)
  adjusted_govscore = raw_govscore * dampener

Expected effect:
- 100K ADA delegated → ~94% of raw score
- 1M ADA → ~86%
- 10M ADA → ~75%
- 100M ADA → ~67%

Update src/lib/scoring/govscore-v1.ts to compute and write
adjusted_govscore alongside raw_govscore.

After running, query the top 10 by adjusted_govscore AND the top 10
by raw_govscore. Show both.

We expect to see noticeable reordering — small-delegation DReps with
high participation should rise; large-delegation DReps with similar
participation should fall slightly.

Report the comparison.
```

**Acceptance:**
- [ ] Both `raw_govscore` and `adjusted_govscore` populated
- [ ] Manual spot-check: pick the largest DRep by amount_lovelace and confirm their dampener is around 0.67–0.75
- [ ] Top-10 by adjusted score differs from top-10 by raw score

---

### Task 1.7 — Scoreboard list page
**Type:** Claude Code
**Time:** 3 hours
**Dependencies:** Task 1.6

**Claude Code Prompt:**
```
Build the Scoreboard page at /scoreboard.

Read CONCEPT.md Section 6 for the full design intent.

Create src/app/scoreboard/page.tsx as a server component that:

1. Fetches all DReps from Supabase with their latest score
   (join `dreps` with the most recent row in `drep_scores`)
2. Sorts by adjusted_govscore DESC
3. Renders a list — grid layout at desktop, single column at mobile

Each row/card shows (front-of-card view, no flip yet):
- Rank (#1, #2, ...)
- DRep display name (use ADAhandle if present in metadata, otherwise
  truncated drep_id)
- Adjusted GovScore (large, prominent)
- Raw GovScore (smaller, beside or below, with subtle "raw" label)
- Participation rate as %
- ADA delegated (formatted: "12.4M ADA", "850K ADA", etc.)
- Delegator count
- Active/inactive badge

Tailwind styling:
- Dark mode default (matches the existing homepage)
- Each card uses a subtle border, rounded corners, hover state
- Top 10 rows get a subtle gold tint
- Top 3 get a gold/silver/bronze badge

Loading state: skeleton rows for first paint.

At the top of the page:
- H1: "DRep Scoreboard"
- Subtitle: "Live ranking of every Cardano DRep, scored on
  participation and adjusted for ADA-power dampening."
- A pill showing "Current Epoch: 567" (read latest epoch from
  drep_scores)
- Last-synced timestamp ("Updated 2 hours ago")

Below the list, footer:
- Methodology link (placeholder href="#methodology" for now)
- Open data link (placeholder)
- API link (placeholder)

Do not implement the flip-card click behavior yet — that's Task 1.8.
For now, clicking a row goes nowhere.

Use the latest server-side rendering pattern in Next.js 14 App Router.
Fetch happens at request time, not build time, so the page is fresh
on every load.

Test locally with `npm run dev` and confirm it renders cleanly with
real data.
```

**Acceptance:**
- [ ] `/scoreboard` shows real DReps from Supabase
- [ ] Sort order is correct (highest adjusted score first)
- [ ] Mobile responsive
- [ ] Page loads in under 2 seconds (server-side rendered)

**PM note:** Take a screenshot and share it with me when you're done. This is the first visible product moment.

---

### Task 1.8 — Flip-card component (front)
**Type:** Claude Code
**Time:** 2 hours
**Dependencies:** Task 1.7

**Claude Code Prompt:**
```
Convert the Scoreboard rows into proper flip-cards.

Read CONCEPT.md Section 6.1 for the full card design.

Create src/components/scoreboard/DRepCard.tsx — a client component
(uses framer-motion for the flip animation).

Front of card:
- DRep PFP / avatar in the top-left (use the image URL from CIP-119
  metadata if available — Task 2.x will populate this; for now,
  fall back to a deterministic generated avatar based on drep_id
  using a simple gradient based on hash)
- Display name + rank badge top-right
- Adjusted GovScore (huge, center-ish)
- Below: participation rate, ADA delegated, delegator count, voting streak
- Footer: "Click to see full profile" hint

Click anywhere on the card → triggers a flip (rotateY 180deg) using
framer-motion. The back-of-card is built in Task 1.9 — for now,
just show a placeholder "Back of card — coming next."

Update src/app/scoreboard/page.tsx to render DRepCard for each row.

Maintain accessibility:
- The card is a button (keyboard-accessible)
- Enter/Space triggers flip
- ARIA labels describe the DRep + score
- Reduced-motion users get a fade instead of flip (use
  prefers-reduced-motion media query)

The grid layout should fit ~3 cards per row at desktop, 1 per row
at mobile. Cards should have a consistent aspect ratio (roughly
trading-card proportions — 5:7 or 2:3).

Show me what it looks like (screenshot or describe).
```

**Acceptance:**
- [ ] Click flips card smoothly
- [ ] Reduced motion respected
- [ ] Keyboard navigation works
- [ ] Cards look like trading cards, not table rows

---

### Tasks 1.9 — 1.14

I'll write detailed prompts for these as you complete each. They are:

- **1.9** Flip-card back (bio, voting history summary, social links, "Delegate via GovTool" button)
- **1.10** Voting streak calculation (added to scoring ETL)
- **1.11** Hover tooltips on metrics (explain participation rate, dampening, etc.)
- **1.12** Link out to rationales (parse CIP-100 rationale URLs from votes)
- **1.13** Custom domain + production deploy (Railway domain config)
- **1.14** Soft launch announcement (Forum + Twitter — manual, not Claude Code)

The reason I'm not writing all of them upfront: Claude Code prompts are most accurate when written with the *current state of the codebase* in mind. By Task 1.8, we'll know what the actual component structure looks like, and 1.9–1.14 prompts will be more precise.

**PM rule:** After each task, report back. I write the next prompt.

---

# PHASE 2 — Scoreboard Full

**Goal:** Multi-source scoring + connected-wallet experience.

Sketched tasks (full prompts written when we reach this phase):

- **2.1** CIP-119 metadata fetcher (DRep profiles, social links, claimed domains)
- **2.2** CIP-100 rationale fetcher (full rationale text from IPFS/GitHub)
- **2.3** Cardano Forum Discourse API integration
- **2.4** GitHub API integration (opt-in via CIP-119)
- **2.5** AI rationale quality scorer (Claude Haiku, fully cached)
- **2.6** Multi-dimension composite GovScore (participation + rationale quality + consistency + delegator alignment placeholder + growth normalization)
- **2.7** Wallet connection (CIP-30/95 via Mesh)
- **2.8** Personalized alignment compass (when wallet connected, show match scores)
- **2.9** "Suggest alternative DReps" widget
- **2.10** Compare two DReps view (head-to-head)
- **2.11** Coalition-defined active-member criteria — coalitions can configure their own thresholds (e.g., DRep DAO's 90% voting / 100% rationale / 50% attendance) and a filtered "active member" view applies them. Underlying public GovScore unchanged. Small task (~1 day) but high strategic value: makes the Scoreboard immediately useful to the DRep DAO from their June 2026 launch (CONCEPT §6.6, §15A.8, §24.4).
- **2.12** **Coalition Reports MVP** — quarterly PDF + dashboard report generator for paying coalitions. Pulls existing Scoreboard data, applies coalition-defined filters, generates branded report. First paid product (CONCEPT §23.6).
- **2.13** Coalition Reports subscription payment flow — accept ADA payments via wallet, mark coalition as paid subscriber, gate premium features
- **2.14** Outreach + onboarding flow for first 3 paid coalitions (manual sales process, automated delivery)

---

# PHASE 3 — Substance Layer

Sketched.

**⚠️ Priority signal:** Tasks 3.9 and 3.10 (Temperature Check) are now elevated within Phase 3. The DRep DAO launches June 2026 and explicitly needs voting infrastructure for July–August outputs. If Temperature Check is live and trustworthy by July, it becomes their default voting mechanism and ADApolis captures the canonical Cardano-governance-deliberation-voting role. If not, they pick Snapshot or Discourse polls or a custom form, and we compete with that incumbent for the next year. Within Phase 3, do 3.5–3.6 (argument graph data + UI) first because the Argument Graph anchors rationale capture, then prioritize 3.9–3.10 (Temperature Check) over 3.1–3.4 (Proposal Hub + AI summarizer features).

- **3.1** Proposal Hub page (every gov action, auto-ingested)
- **3.2** AI proposal summarizer (cached forever per proposal)
- **3.3** AI risk/benefit extractor
- **3.4** AI Devil's Advocate auto-steelman (proposal-level baseline — distinct from the player competition in Task 3.13)
- **3.5** Argument graph data model (Supabase tables) — *priority*
- **3.6** Argument graph UI (Kialo-style) — *priority*
- **3.7** Argument upvotes + reputation-weighted
- **3.8** Position-update credit tracking
- **3.9** Temperature Check — signed off-chain voting — *priority, see signal above*
- **3.10** Temperature Check results dashboard — *priority, see signal above*
- **3.11** Constitution-consistency scoring
- **3.12** Ecosystem Map page — visualization of Cardano governance/operational landscape (IOG, CF, Emurgo, Intersect, Catalyst, CC, DReps, SPOs); small but high-leverage for newcomers (CONCEPT §14A)
- **3.13** Steelman & Devil's Advocate Awards — mind-movement measurement using pre/post Temperature Check positions; ungameable design; produces canonical counter-arguments per proposal (CONCEPT §11). Depends on Tasks 3.5–3.10.

---

# PHASE 4 — Layman On-Ramp

Sketched:

- **4.1** Quiz UI and question design
- **4.2** Speak Your Mind free-text + AI parsing
- **4.3** Personality classifier
- **4.4** DRep matching algorithm
- **4.5** Shareable result cards
- **4.6** One-click delegation handoff to GovTool
- **4.7** Civic Character class auto-award engine — Strategist / Scholar / Sage / Speaker — algorithmic awards based on observable behavior (CONCEPT §10.4)
- **4.8** Saga progress tracking + UI surfaces (CONCEPT §10.5)
- **4.9** Saga catalog v1 — pre-defined initial sagas (Constitutional Defender, Treasury Sentinel, Coalition Builder, Mind-Mover, Steel Spine)

---

# PHASE 5 — DRep Workstation

Sketched:

- **5.1** DRep auth gate (verified via on-chain registration)
- **5.2** Dashboard layout
- **5.3** Active proposals + brief view
- **5.4** Rationale Studio (AI-assisted writing)
- **5.5** ADAmail integration
- **5.6** Delegator Pulse aggregator
- **5.7** Calendar integration
- **5.8** Stats & performance page
- **5.9** Field Reports publishing
- **5.10** **ADApolis Intel — subscription tier setup** — define pricing tiers, build subscription management, ADA payment flow (CONCEPT §23.7)
- **5.11** ADApolis Intel — alert engine (Temperature Check delta alerts, sentiment swings, custom watch-lists)
- **5.12** ADApolis Intel — premium dashboard (real-time DRep position predictions, embargoed daily briefing)
- **5.13** ADApolis Intel — outreach to first 5 institutional subscribers (manual sales: SPOs, DeFi protocols, journalists)

---

# PHASE 5A — DRep Coalitions

Sketched. This is the application-layer implementation of Reform 6. Strategic priority: builds direct utility for the 30-DRep Telegram coalition + similar groups forming organically. Likely overlaps in time with Phase 5 — Coalition Workstation reuses DRep Workstation primitives.

- **5A.1** Coalition data model (Supabase tables for coalitions, memberships, positions)
- **5A.2** Coalition creation flow (DReps form a coalition with mission statement, claimed domains, joining criteria)
- **5A.3** Public coalition page (mission, members, recent positions, aggregate reputation, endorsements)
- **5A.4** Coalition membership attestation (on-chain metadata transaction for joining/leaving)
- **5A.5** Coalition Workstation (member-only UI — internal Argument Graph, joint Rationale Studio, position publishing workflow)
- **5A.6** Joint Rationale Studio (multi-author with attribution, member sign-off flow)
- **5A.7** Cross-coalition coordination protocol UI (conflict surfacing, joint deliberation window, reputation-weighted mediation panel)
- **5A.8** Coalition reputation aggregation engine
- **5A.9** Coalition position briefs (recommendation per active proposal, with version history)
- **5A.10** Coalition discovery on Scoreboard (filter DReps by coalition membership, view coalition-level rankings)

---

# PHASE 6 — Catalyst Submission

Sketched:

- **6.1** Write Catalyst proposal (using live Scoreboard as demo)
- **6.2** Record demo video
- **6.3** Forum mega-post
- **6.4** Twitter thread series (5 threads, one per reform)
- **6.5** Submit + community engagement

---

# PHASE 7 — Genesis + Fantasy Draft

Sketched:

- **7.1** Aiken / Plutus setup
- **7.2** SeasonPool.plutus contract
- **7.3** DelegatorYield.plutus contract
- **7.4** ReputationNFT.plutus contract (with 7% royalty 2/2/2/1 split)
- **7.5** Smart contract audit (external, $15–40K budget — Catalyst-funded)
- **7.6** Genesis Card art (AI-generated, 500 unique pieces)
- **7.7** Genesis mint UI + flow
- **7.8** Fantasy Draft UI
- **7.9** Season pool funding integration
- **7.10** Champion Card finalist tracking logic
- **7.11** Delegator free-mint window logic

---

# PHASE 8 — Champion Drop + Season 2

Sketched:

- **8.1** Champion Card art generation pipeline
- **8.2** Top-10 DRep auto-detection at season end
- **8.3** Free-mint window UI
- **8.4** Secondary marketplace integration (JPG Store API)
- **8.5** Royalty split verification (post-trade analytics)
- **8.6** Season 2 launch with refined mechanics

---

# PHASE 9 — The Lab

Sketched. Strategic-advocacy infrastructure; not core daily UX. Pushes Reforms 1, 2, 5 toward eventual CIP submission via published evidence.

- **9.1** Lab data pipeline (historical on-chain vote ingestion, normalized for replay)
- **9.2** Quadratic voting simulator
- **9.3** Conviction voting simulator
- **9.4** Domain-partitioned voting simulator
- **9.5** Citizens-assembly sortition simulator
- **9.6** Custom parameter playground (slider-based what-ifs)
- **9.7** Side-by-side outcome comparison UI
- **9.8** Shareable scenario links + embed code
- **9.9** Open dataset exports (CSV, Parquet, JSON-LD)
- **9.10** Methodology page with peer-review-grade documentation
- **9.11** Strategic Coherence View — treasury fragmentation/duplication analysis (CONCEPT §16.4)
- **9.12** Lab academic preprint draft (SSRN or arXiv submission)

---

# PHASE 10 — Expansion & CIPs

Sketched. Begins the Six Rings of Expansion arc (CONCEPT §22) and the protocol-level reform push.

- **10.1** CIP draft for Reform 3 (Domain-partitioned DReps)
- **10.2** CIP draft for Reform 4 (Mandatory structured deliberation)
- **10.3** CIP draft for Reform 6 (Coalition coordination protocol)
- **10.4** Midnight Foundation grant application for ZK privacy layer
- **10.5** ADApolis Intel — B2B subscription product (CONCEPT §23.6) — full product track with target customers, tiered pricing, dashboard, alerts engine, dedicated API access
- **10.6** GovScore Reputation Oracle — external query API for Cardano dApps (CONCEPT §23.7) — public + authenticated tiers, query metering, payment integration
- **10.7** Ring 2 — DAO governance integrations (Snapshot, Tally adapter)
- **10.8** Platform self-governance handoff design (council elected via ADApolis's own deliberation system)

---

# Decision Gates

Major points where we stop, evaluate, and decide before continuing:

**Gate 1 — End of Phase 0:** TrustLevel fork or build fresh?
**Gate 2 — End of Phase 1:** Soft launch outcome — is the Scoreboard getting traction? If yes, full speed Phase 2. If not, what's the feedback?
**Gate 3 — End of Phase 2:** Multi-source scoring live. Catalyst submission timing — go now with stronger demo, or wait for Substance Layer?
**Gate 4 — End of Phase 5:** Pre-Genesis legal review. Does the cards-as-collectibles framing hold up under counsel review? Adjustments needed?
**Gate 5 — Pre-mainnet smart contracts:** Audit complete? If not, postpone Genesis launch.
**Gate 6 — End of Phase 5A:** Coalition adoption check. Are real DRep coalitions (e.g. the 30-DRep Telegram group) using the platform? If yes, prioritize Phase 9 for advocacy momentum. If not, reassess coalition UX before pushing to CIPs.
**Gate 7 — Phase 9 publication:** Lab dataset ready for academic preprint. Recruit co-author or publish solo? Engage IOG research?

---

# Working Cadence

**Weekly:**
- You execute as many tasks as fit in your ~10 hours
- Report status — what completed, what blocked, what surprises
- I update the status tracker, write the next prompt(s), flag risks

**Per-session:**
- Pick ONE task from the tracker
- Paste its prompt into Claude Code
- Let it work; review output
- Tell me what happened

**On any error or surprise:**
- Stop and tell me before continuing
- It's much cheaper to fix a wrong direction at task 1.2 than at task 1.8

---

# Version Log

- **v1.0 (2026-05-23)** — **Lock for execution alongside CONCEPT.md v1.0.** Phase 0 marked complete except for repo scaffold (0.6, next). TrustLevel fork decision locked: build fresh. New tasks: 2.12/2.13/2.14 (Coalition Reports MVP + payment flow + outreach — first paid product), 5.10-5.13 (ADApolis Intel B2B subscription product). Big-Picture Map rewritten to show revenue arc. Phase names updated: "Founding Members Mint" replaces "Genesis Card" wording, "Coalition Reports" added to Phase 2 deliverables, "ADApolis Intel B2B" added to Phase 5.

- **v0.7 (2026-05-22)** — Audit additions matching CONCEPT v0.9. New Phase 4 tasks 4.7–4.9 (Civic Character classes + Sagas). New Phase 3 task 3.13 (Steelman/Devil's Advocate Awards via mind-movement measurement). Phase 10 tasks 10.5 and 10.6 elevated from line items to full product tracks (ADApolis Intel B2B + GovScore Oracle).

- **v0.6 (2026-05-22)** — Hosting changed from Vercel to **Railway**. Rationale: Railway handles long-lived ETL processes more naturally than Vercel serverless (10-second timeout limits), and ADApolis has many scheduled jobs (epoch-based DRep syncing, vote indexing, scoring computation). Domain registered: `adapolis.net`. Task 0.7 rewritten with accurate Railway deployment steps. Supabase remains the database.

- **v0.5 (2026-05-22)** — Project renamed from GovQuest to **ADApolis**. All references updated. No other changes.

- **v0.4 (2026-05-22)** — DRep DAO integration. New Task 2.11 (coalition-defined active-member criteria — small task, high strategic value, makes Scoreboard immediately useful to DRep DAO at their June 2026 launch). Priority signal added to Phase 3 elevating Temperature Check (Tasks 3.9, 3.10) — DRep DAO needs voting infrastructure by July; if we ship Temperature Check by then it becomes the canonical Cardano governance voting tool.

- **v0.3 (2026-05-22)** — Integration of CONCEPT.md v0.5 additions. New Phase 5A (DRep Coalitions) — application-layer implementation of Reform 6. New task 3.12 (Ecosystem Map). New Phase 9 (The Lab) with Strategic Coherence View task 9.11. New Phase 10 (Expansion & CIPs) consolidating later-phase work. Two new Decision Gates: 6 (coalition adoption check) and 7 (Lab publication).

- **v0.2 (2026-05-22)** — Added Section 0: The Autonomous Workflow. Introduces CLAUDE.md as the persistent context file that lets Claude Code self-navigate the roadmap. Eliminates per-task copy-paste. Defines hard checkpoints where autonomous work must stop.

- **v0.1 (2026-05-22)** — Initial roadmap. Detailed prompts for Phase 0 (tasks 0.1–0.8) and Phase 1 tasks 1.1–1.8. Later phases sketched, full prompts to be written when reached.

---

*This document evolves. Each completed task updates the tracker. Each decision gate may rewrite downstream phases. Live in here, not in your head.*
