# ADApolis Supabase Schema

**Database design for ADApolis Phase 1: Scoreboard MVP**

This directory contains the database schema, migrations, and seed data for ADApolis's Supabase project.

---

## Schema Overview

The Phase 1 schema includes six core tables designed to support the Scoreboard MVP:

### 1. **dreps**
DRep profiles and on-chain registration data. Stores CIP-1694 registered delegates with metadata, delegation stats, and parsed CIP-119 profile information.

- **Primary key:** `drep_id` (bech32-encoded DRep credential from CIP-1694)
- **Key fields:** `hex_id`, `amount_lovelace`, `delegator_count`, `metadata` (JSON), `voting_anchor_url`, `is_registered`
- **Used by:** Scoreboard discovery, profile cards, delegation calculations

### 2. **proposals**
Governance actions (governance proposals) from on-chain voting. Tracks all CIP-1694 proposals with their lifecycle status.

- **Primary key:** `proposal_id` (composite: tx_hash + cert_index)
- **Key fields:** `proposal_type`, `title`, `abstract`, `status`, `voting_starts_epoch`, `voting_ends_epoch`
- **Used by:** Vote participation calculation, proposal filtering, governance history

### 3. **votes**
Individual DRep votes on proposals. Used to calculate participation rate and rationale quality.

- **Primary key:** `vote_id` (UUID)
- **Unique constraint:** `(drep_id, proposal_id)` — each DRep votes once per proposal
- **Key fields:** `vote` (yes/no/abstain), `rationale_url`, `rationale` (text), `block_time`
- **Used by:** Participation scoring, rationale retrieval, vote history

### 4. **delegations**
Stake delegated to DReps. Used for ADA-power calculation and quadratic dampening on the Scoreboard.

- **Primary key:** `delegation_id` (UUID)
- **Key fields:** `drep_id`, `stake_address`, `lovelace_amount`, `delegated_at`, `revoked_at`
- **Index:** `(revoked_at)` filtered to active delegations only
- **Used by:** ADA amount calculation, quadratic dampening formula

### 5. **drep_scores**
Cached participation and other scores per epoch. Updated by ETL scoring jobs.

- **Primary key:** `(drep_id, epoch)` — one score per DRep per epoch
- **Key fields:** `participation_rate`, `raw_govscore`, `adjusted_govscore`, `voting_streak_epochs`, `rationale_rate`
- **Leaderboard index:** `adjusted_govscore DESC`
- **Used by:** Scoreboard leaderboard, DRep ranking, performance tracking

### 6. **sync_state**
ETL sync progress tracker. Tracks the last block/epoch synced for each entity type.

- **Primary key:** `id` (UUID)
- **Key fields:** `entity` (enum: dreps/proposals/votes/delegations), `last_synced_block`, `last_synced_at`
- **Used by:** ETL jobs to resume from last sync point

---

## Data Model Relationships

```
dreps
├── votes (fk: drep_id)
├── delegations (fk: drep_id)
└── drep_scores (fk: drep_id)

proposals
└── votes (fk: proposal_id)

delegations
└── stake_address (to identify delegators)
```

---

## Key Design Decisions

### 1. **Participation-Only Scoring (Phase 1)**
The `drep_scores` table currently includes:
- `participation_rate` — votes cast / proposals eligible
- `rationale_rate` — votes with rationale / total votes
- `voting_streak_epochs` — consecutive epochs with rationale-backed votes

Phase 2 will add:
- Rationale quality (AI-scored)
- Delegator alignment signals
- Consistency scores
- Cross-domain reputation

### 2. **Quadratic Dampening Formula**
Applied at query-time in Phase 1, not stored in the DB:

```
adjusted_govscore = raw_govscore × (1 / (1 + log₁₀(ADA_power_M + 1) / 4))
```

Where `ADA_power_M` = lovelace / 10^12 (ADA in millions)

This is calculated in the API layer before returning Scoreboard rankings.

### 3. **Flexible Metadata Storage**
All metadata from on-chain anchors (CIP-119, CIP-100) is stored as JSONB:
- **CIP-119** (DRep profile): `dreps.metadata`
- **Governance metadata** (proposals): `proposals.metadata`
- **Rationales** (proposals): `votes.rationale` (text, plus `rationale_url`)

This allows the schema to evolve without migration pain as governance data standards change.

### 4. **Row-Level Security (RLS)**
All tables have RLS enabled:
- **Public read:** Anonymous users and delegators can query all governance data
- **Service role only:** ETL jobs write using `SUPABASE_SERVICE_ROLE_KEY`
- **No client writes:** The anon key has no INSERT/UPDATE/DELETE permissions

This protects data integrity while keeping governance data fully public (as intended).

### 5. **Sync State Tracking**
The `sync_state` table allows ETL jobs to resume from their last sync point:
- Prevents duplicate processing
- Enables rolling sync (only fetch new blocks since last run)
- Provides operational visibility into data freshness

---

## Running Migrations Locally

### Prerequisites
- Supabase CLI installed: `npm install -g supabase`
- Supabase project created on supabase.com
- `.env.local` with `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`

### Apply Migrations

**Option 1: Using Supabase CLI (Recommended)**
```bash
# Log in to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push
```

**Option 2: Manual SQL in Supabase Dashboard**
1. Go to Supabase Dashboard → SQL Editor
2. Create a new query
3. Copy and paste the contents of `migrations/001_initial_schema.sql`
4. Click **Run**
5. Repeat for `migrations/002_seed_data.sql`

### Verify Schema Created
```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' ORDER BY table_name;

-- Check seed data loaded
SELECT COUNT(*) FROM dreps;       -- Should be 3
SELECT COUNT(*) FROM proposals;   -- Should be 3
SELECT COUNT(*) FROM votes;       -- Should be 7
SELECT COUNT(*) FROM delegations; -- Should be 9
```

---

## Applying to Production Supabase

**⚠️ Critical:** Only run migrations on production with explicit user approval.

### Production Deployment Steps

1. **Backup your production database**
   - Supabase automatically creates daily backups (free tier: 7 days)
   - Manual backup: Supabase Dashboard → Settings → Backups → Create backup

2. **Test migrations on a staging database first**
   - Create a second Supabase project for staging
   - Run the same migrations there
   - Verify schema and seed data

3. **Deploy to production**
   ```bash
   supabase db push --linked  # Targets your linked project
   ```

4. **Verify production schema**
   ```sql
   SELECT COUNT(*) FROM dreps;
   ```

5. **Monitor for issues**
   - Supabase Dashboard → Logs
   - Watch for query errors, RLS policy violations, sync_state updates

---

## ETL Job Integration

ETL jobs (Phase 1 Task 1.3+) interact with the database via `SUPABASE_SERVICE_ROLE_KEY`:

### sync-dreps.ts
Fetches DRep list from Koios and upserts into `dreps` table:
```typescript
await supabase.from('dreps').upsert(drepRecords);
```

### sync-votes.ts
Fetches votes from Koios and inserts into `votes` table:
```typescript
await supabase.from('votes').insert(voteRecords);
```

### sync-delegations.ts
Fetches delegation records and updates `delegations` table.

### scoring-v1.ts
Computes participation rates and writes to `drep_scores` for Scoreboard display.

---

## Query Examples

### Get Scoreboard Leaderboard (Top 10 by Adjusted Score)
```sql
SELECT 
  d.drep_id,
  d.metadata->>'name' as name,
  s.adjusted_govscore,
  s.participation_rate,
  d.amount_lovelace / 1000000000.0 as ada_delegated,
  d.delegator_count
FROM dreps d
LEFT JOIN drep_scores s ON d.drep_id = s.drep_id AND s.epoch = (SELECT MAX(epoch) FROM drep_scores)
ORDER BY s.adjusted_govscore DESC NULLS LAST
LIMIT 10;
```

### Get Votes for a Proposal (with DRep names)
```sql
SELECT 
  d.metadata->>'name' as drep_name,
  v.vote,
  v.rationale,
  v.block_time
FROM votes v
JOIN dreps d ON v.drep_id = d.drep_id
WHERE v.proposal_id = 'prop_test_1'
ORDER BY v.block_time DESC;
```

### Calculate DRep Participation Rate
```sql
SELECT 
  d.drep_id,
  d.metadata->>'name' as name,
  COUNT(DISTINCT v.proposal_id) as votes_cast,
  COUNT(DISTINCT p.proposal_id) as votes_eligible,
  ROUND(COUNT(DISTINCT v.proposal_id)::FLOAT / COUNT(DISTINCT p.proposal_id), 4) as participation_rate
FROM dreps d
CROSS JOIN proposals p
LEFT JOIN votes v ON d.drep_id = v.drep_id AND p.proposal_id = v.proposal_id
WHERE p.status = 'active'
GROUP BY d.drep_id
ORDER BY participation_rate DESC;
```

---

## Indexes

All indexes are created for query performance:

| Table | Index | Purpose |
|---|---|---|
| `dreps` | `amount_lovelace DESC` | Sorting by delegation size |
| `dreps` | `is_registered` | Filtering active DReps |
| `dreps` | `updated_at DESC` | Recent sync check |
| `proposals` | `status` | Filtering active/passed proposals |
| `proposals` | `proposal_type` | Domain-specific filtering (Phase 2+) |
| `proposals` | `expires_at` | Vote window queries |
| `votes` | `(drep_id, proposal_id)` | UNIQUE constraint |
| `votes` | `drep_id` | Fetch all votes by a DRep |
| `votes` | `proposal_id` | Fetch all votes on a proposal |
| `delegations` | `drep_id` | Sum ADA by DRep |
| `delegations` | `(revoked_at) WHERE revoked_at IS NULL` | Active delegations only |
| `drep_scores` | `adjusted_govscore DESC` | **Scoreboard leaderboard** |
| `drep_scores` | `epoch` | Latest scores per epoch |

---

## Future Expansions (Phase 2+)

The schema is designed to expand with minimal migration pain:

- **New score dimensions**: Add columns to `drep_scores` (rationale_quality_score, delegator_alignment, etc.)
- **DRep coalitions**: Add `coalitions` and `coalition_memberships` tables
- **Argument graph**: Add `arguments` and `position_updates` tables for deliberation
- **Temperature check**: Add `temperature_checks` table for off-chain voting
- **Domain tagging**: Add `drep_domains` and `proposal_domains` junction tables

All can be added via new migrations without modifying existing tables.

---

## Support & Debugging

### RLS Policy Issues
If you get "permission denied" errors:
- Ensure you're using the **anon key** for client queries (read-only is fine)
- Ensure ETL jobs use **service role key** for writes
- Check Supabase Dashboard → Authentication → Policies

### Missing Data
If seed data didn't load:
- Check logs: Supabase Dashboard → Logs
- Verify migrations ran: `SELECT * FROM information_schema.tables WHERE table_name = 'dreps'`
- Re-run seed.sql manually

### Performance Issues
- Use the Supabase dashboard to analyze slow queries
- Add indexes (already done for Phase 1)
- Consider materialized views for complex aggregations (Phase 3+)

---

## References

- [CIP-1694 Governance](https://github.com/cardano-foundation/CIPs/tree/master/CIP-1694)
- [CIP-119 DRep Metadata](https://github.com/cardano-foundation/CIPs/tree/master/CIP-0119)
- [CIP-100 Governance Metadata](https://github.com/cardano-foundation/CIPs/tree/master/CIP-0100)
- [Koios API Documentation](https://api.koios.rest/)
- [Supabase Documentation](https://supabase.com/docs)

---

**Last updated:** 2026-06-05  
**Phase:** 1 (MVP)  
**Status:** Ready for Phase 1 Task 1.3 (ETL jobs)
