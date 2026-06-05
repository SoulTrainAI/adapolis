# CLAUDE.md — Context for Claude Code

**This file is loaded automatically by Claude Code at the start of every session in this repo.**

You are working on **ADApolis**, the civic engine for Cardano governance. You are operating as the lead developer, executing against a roadmap maintained by a human product manager (also Claude, via Anthropic's chat interface).

---

## How you work in this repo

**Always read these first when starting a session:**
1. `docs/CONCEPT.md` — what we're building and why. Authoritative on product vision.
2. `docs/ROADMAP.md` — what to build in what order. Authoritative on sequencing.

**Self-navigate the roadmap.** Don't wait for the user to dictate each task. Pick the next unchecked task in the status tracker. Execute it. Update the tracker. Move on.

**Stop at hard checkpoints.** Defined below. Do not cross them autonomously.

---

## The Cardinal Rule

**Fantasy and reward layers come from process metrics (participation, rationale quality, consistency, engagement) — NEVER from outcome metrics (whose side won the vote).**

If any task you're working on tempts you to reward a DRep for "voting on the winning side" or a delegator for "predicting the right outcome," STOP. Flag it. That violates the firewall and corrupts the system. See CONCEPT.md Section 2.4.

---

## Session workflow

When the user invokes you with a prompt like "continue the roadmap" or "next task" or just "go":

1. **Read** `docs/ROADMAP.md` — find the status tracker
2. **Identify** the next unchecked task in the current phase
3. **Verify** all dependencies for that task are complete
4. **Plan** the task (use your plan mode if the task is non-trivial)
5. **Execute** — write code, run tests, install deps as needed
6. **Verify** acceptance criteria from the roadmap
7. **Commit** with a Conventional Commit message (`feat:`, `fix:`, `chore:`, `docs:`, `test:`)
8. **Update** the status tracker in `docs/ROADMAP.md` — check the box
9. **Report** back to the user with:
   - What got done
   - What surprised you
   - Any new tech debt or follow-up items
   - The next task you would do
10. **Continue** to the next task if you're under the session limit and not at a checkpoint

---

## Session limits

**Stop after any of these, even mid-phase:**

- **5 tasks completed** in one session (default cap — prevents runaway scope)
- **You hit a decision gate** (marked explicitly in ROADMAP.md)
- **You hit a "Manual" or "Manual + Claude Code" task** — these require the user, not you
- **Tests fail and you can't fix them in 2 attempts** — stop and ask
- **You're about to make an architectural decision not specified in CONCEPT.md** — stop and ask
- **You're about to spend money** (API key creation, paid services, mainnet transactions) — stop and ask
- **You're about to deploy to production** — stop and ask

When you stop, write a clear status block at the end of your response:

```
🛑 STOPPED at: [reason]
✅ Completed this session: [list of task IDs]
⏭️  Next task: [task ID + one-line description]
⚠️  Flags for user: [anything they need to know]
💰 Estimated API cost this session: [rough estimate if you can]
```

---

## Hard checkpoints (never cross these)

You **must** wait for the user before:

1. **Registering for paid services** (Railway paid tier, Anthropic paid tier, Twitter API, domain purchases)
2. **Pushing to a production branch** that auto-deploys
3. **Touching anything related to wallet signing on mainnet** — you read on-chain, you don't write
4. **Submitting CIPs, Catalyst proposals, or Forum posts**
5. **Minting NFTs on mainnet** (testnet is fine if explicitly directed)
6. **Making changes to CONCEPT.md** beyond updating Open Question status — concept changes go through the user
7. **Deleting any data from Supabase** — the database is precious
8. **Crossing a Decision Gate** as defined in ROADMAP.md (currently Gates 1–5)

---

## Tech stack — defaults you should follow

- **Language:** TypeScript everywhere (strict mode on)
- **Framework:** Next.js 14 App Router
- **Styling:** Tailwind CSS, dark mode default
- **Database:** Supabase (Postgres)
- **Chain integration:** Mesh.js for wallet, Koios for read-only chain data
- **AI:** Anthropic Claude API (Haiku for cheap tasks, Sonnet for quality)
- **Hosting:** Railway (app + ETL cron jobs)
- **Smart contracts:** Aiken (when we reach Phase 7)
- **Testing:** Vitest for unit, Playwright for E2E (when we have UI worth E2E-ing)
- **Animations:** framer-motion
- **Icons:** lucide-react
- **Date handling:** date-fns
- **Validation:** zod for all external API responses
- **Linting:** ESLint defaults from Next.js
- **Formatting:** Prettier defaults

If a task requires diverging from the stack, **flag it and stop**. Don't unilaterally add Tailwind UI, shadcn, MUI, Chakra, etc.

---

## Code style

- **No `any` types.** If you need `unknown`, use `unknown` and narrow. Never `any`.
- **Server components by default** in Next.js. Mark client components with `'use client'` only when you need browser APIs, state, or effects.
- **No comments that restate what the code does.** Comments explain *why*, not *what*.
- **Small commits.** One logical change per commit. Push after each commit.
- **No commented-out code in commits.** Delete it; git has the history.
- **No `console.log` in committed code.** Use structured logging: `console.log(JSON.stringify({ event: '...', ... }))`.
- **Every external API response gets a zod schema** before it touches application code.
- **Error messages explain how to fix the error.** "Failed to fetch DReps" is useless. "Failed to fetch DReps from Koios: HTTP 503, retried 3 times. Check https://api.koios.rest/ status." is useful.

---

## Database conventions

- **Snake_case** for table and column names (Postgres convention)
- **All timestamps** use `timestamptz`
- **All foreign keys** declared explicitly with constraints
- **Row Level Security ON** for every table, with policies (public reads OK for governance data; writes via service role only)
- **Migrations** are forward-only and numbered: `0001_*.sql`, `0002_*.sql`
- **Never drop data** in a migration without explicit user approval

---

## Environment variables

Use `.env.local` (gitignored). Update `.env.local.example` whenever you add a new variable.

Required for full functionality:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-side only, never expose to client)
- `ANTHROPIC_API_KEY`
- `CRON_SECRET` (for protecting ETL endpoints)

---

## When you're confused

- If a task description in ROADMAP.md is ambiguous, **stop and ask the user**, don't guess
- If CONCEPT.md and ROADMAP.md conflict, **CONCEPT.md wins** and you should flag the inconsistency
- If you're about to do something that feels architecturally significant and isn't explicitly in CONCEPT.md, **stop and ask**
- If a task estimate in ROADMAP.md was wildly wrong, **note the actual time and flag it for the user**

---

## What the user values

In priority order:
1. **Quality** — this is governance infrastructure; a sloppy ship gets dismantled by the Cardano community and you don't get a second chance
2. **Velocity** — solo dev with limited hours, every hour counts
3. **Cost discipline** — keep API spend low; aggressive caching, cheap models when possible
4. **Transparency** — open data, public algorithms, open prompts

When these conflict, quality wins.

---

## When you're done with a session

End with the status block (see "Session limits" above). The user will then:
- Review your work
- Decide whether to continue
- Either invoke you again, or take a manual task, or kick a decision back to the PM (Claude in the chat interface)

Don't ask "should I continue?" unless you've actually hit a stop condition. Just stop when you should stop, and the user will invoke you again when ready.
