# ADApolis

The civic engine for Cardano governance — live at **[adapolis.net](https://www.adapolis.net)**.

ADApolis scores every Cardano DRep on how reliably it does the job, runs monthly seasons with a free fantasy game, turns each DRep into a trading card, and helps delegators find a DRep that votes the way they think.

- **Scoreboard** — every active DRep ranked by GovScore (confidence-adjusted participation, gently dampened for very large ADA holdings)
- **Seasons and fantasy draft** — 6-epoch seasons, process-only points, an underdog multiplier for small DReps
- **Trading cards** — stats, tiers, abilities; DReps can claim their card with their DRep key (CIP-95)
- **Find My DRep** — a quiz matched against real on-chain votes, with a decentralization boost
- **Hot Topics** — open governance actions, how DReps are splitting, and quoted arguments on each side
- **Discord automation** — governance feeds, season recaps and role linking

## The Cardinal Rule

Scores, points, abilities and fantasy results come from **how** a DRep does the job (voting, explaining, voting on time), **never** from which way it votes or whether a proposal passed. Contributions that reward outcomes won't be merged.

Every formula is documented on the [methodology page](https://www.adapolis.net/methodology); the code here is the source of truth.

## Stack

Next.js 14 (App Router) · TypeScript (strict) · Tailwind · Supabase (Postgres) · [Koios](https://api.koios.rest/) for chain data · Mesh.js for wallets · Anthropic Claude for summaries only · zod for every external response · Vitest · hosted on Railway with a 6-hourly cron.

## Running locally

```bash
npm install
cp .env.local.example .env.local   # fill in your own Supabase project and keys
npm run dev                        # http://localhost:3000
npm test
```

1. Create a Supabase project and run the SQL files in `supabase/migrations/` in order.
2. Fill in `.env.local` (see comments in `.env.local.example`). Without `ANTHROPIC_API_KEY`, AI summaries are simply skipped.
3. Populate data by calling the cron endpoint: `curl -H "Authorization: Bearer $CRON_SECRET" -X POST http://localhost:3000/api/cron`.

## Open data

The JSON behind the site is public: [`/api/dreps`](https://www.adapolis.net/api/dreps) (Scoreboard) and [`/api/cards`](https://www.adapolis.net/api/cards) (every card's stats). Please cache and be gentle.

## Contributing

Bug reports, data anomalies and rule suggestions are welcome in our [Discord](https://discord.gg/64QvF9WWMM). For code, open an issue first so we can agree on the approach. Never commit secrets: they belong in environment variables only.

## License

Code: [GNU AGPL-3.0](LICENSE). If you run a modified version as a public service, you must publish your changes.

The ADApolis name, logo and trading-card artwork are **not** covered by the code license; see [TRADEMARKS.md](TRADEMARKS.md). DRep profile images and bios belong to their owners.
