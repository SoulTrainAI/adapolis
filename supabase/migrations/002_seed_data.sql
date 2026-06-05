-- ADApolis Phase 1 Seed Data
-- Mock DReps, proposals, votes, and delegations for local development
-- This file is intentionally separate from the schema so it can be run independently

-- =============================================================================
-- DREP SEED DATA
-- =============================================================================

INSERT INTO dreps (
  drep_id, hex_id, stake_address, is_script, is_registered,
  deposit_lovelace, active_epoch, amount_lovelace, delegator_count,
  voting_anchor_url, voting_anchor_hash, metadata
) VALUES
  (
    'drep_test_1',
    'abcd1234efgh5678ijkl9012mnop3456qrst5678uvwx9012yz',
    'addr_test1vqr2kldt0f0h0qdrvdglf6nwyw4lffauwqlqxahpy5p4cxy0p2a9',
    false,
    true,
    500000000,
    400,
    15000000000,
    250,
    'https://example.com/drep1-metadata.json',
    'abc123def456abc123def456abc123def456abc123def456abc123def456',
    '{"name": "Alice DRep", "bio": "Treasury and protocol expert", "image": "https://example.com/alice.jpg"}'::jsonb
  ),
  (
    'drep_test_2',
    'bcde2345fghi6789jklm0123nopq4567rstu6789vwxy0123za',
    'addr_test1vqr2kldt0f0h0qdrvdglf6nwyw4lffauwqlqxahpy5p4cxy1p2a9',
    false,
    true,
    500000000,
    400,
    8500000000,
    180,
    'https://example.com/drep2-metadata.json',
    'bcd234def567bcd234def567bcd234def567bcd234def567bcd234def567',
    '{"name": "Bob DRep", "bio": "Constitutional and legal analyst", "image": "https://example.com/bob.jpg"}'::jsonb
  ),
  (
    'drep_test_3',
    'cdef3456ghij7890klmn1234opqr5678stuv7890wxyz1234ab',
    'addr_test1vqr2kldt0f0h0qdrvdglf6nwyw4lffauwqlqxahpy5p4cxy2p2a9',
    false,
    true,
    500000000,
    401,
    3200000000,
    95,
    'https://example.com/drep3-metadata.json',
    'cde345def678cde345def678cde345def678cde345def678cde345def678',
    '{"name": "Charlie DRep", "bio": "New delegate, focused on community", "image": "https://example.com/charlie.jpg"}'::jsonb
  );

-- =============================================================================
-- PROPOSAL SEED DATA
-- =============================================================================

INSERT INTO proposals (
  proposal_id, tx_hash, cert_index, proposal_type, action_type,
  title, abstract, proposed_epoch, voting_starts_epoch, voting_ends_epoch,
  expires_at, status
) VALUES
  (
    'prop_test_1',
    'abc123def456abc123def456abc123def456abc123def456abc123def456ab',
    0,
    'treasury_withdrawal'::proposal_type,
    'TreasuryWithdrawal',
    'Treasury Withdrawal: Cardano Developer Tooling Fund',
    'Proposal to allocate 2M ADA for developer tooling ecosystem',
    395,
    396,
    410,
    NOW() + INTERVAL '30 days',
    'active'::proposal_status
  ),
  (
    'prop_test_2',
    'bcd234def567bcd234def567bcd234def567bcd234def567bcd234def567bc',
    0,
    'info'::proposal_type,
    'InfoAction',
    'Info Action: Governance Process Feedback',
    'Community feedback on the CIP-1694 implementation and lessons learned',
    394,
    395,
    409,
    NOW() + INTERVAL '25 days',
    'active'::proposal_status
  ),
  (
    'prop_test_3',
    'cde345def678cde345def678cde345def678cde345def678cde345def678cd',
    0,
    'parameter_change'::proposal_type,
    'ParameterChange',
    'Parameter Change: Increase Max Block Header Size',
    'Technical proposal to increase protocol parameter for block header size',
    393,
    394,
    408,
    NOW() + INTERVAL '20 days',
    'active'::proposal_status
  );

-- =============================================================================
-- VOTE SEED DATA
-- Votes cast by our test DReps on the test proposals
-- =============================================================================

INSERT INTO votes (
  drep_id, proposal_id, vote, rationale_url,
  rationale, block_time, tx_hash
) VALUES
  -- Alice votes on all three proposals
  (
    'drep_test_1',
    'prop_test_1',
    'yes'::vote_choice,
    'https://example.com/alice-rationale-prop1.md',
    'I support this initiative because developer tooling is critical for ecosystem growth.',
    NOW() - INTERVAL '5 days',
    'vote_tx_1'
  ),
  (
    'drep_test_1',
    'prop_test_2',
    'yes'::vote_choice,
    'https://example.com/alice-rationale-prop2.md',
    'The feedback mechanisms are essential for improving governance processes.',
    NOW() - INTERVAL '5 days',
    'vote_tx_2'
  ),
  (
    'drep_test_1',
    'prop_test_3',
    'no'::vote_choice,
    NULL,
    'I abstained on technical grounds pending further analysis.',
    NOW() - INTERVAL '4 days',
    'vote_tx_3'
  ),

  -- Bob votes on two proposals (abstains on one)
  (
    'drep_test_2',
    'prop_test_1',
    'no'::vote_choice,
    'https://example.com/bob-rationale-prop1.md',
    'Concerns about allocation mechanism; recommend different distribution model.',
    NOW() - INTERVAL '4 days',
    'vote_tx_4'
  ),
  (
    'drep_test_2',
    'prop_test_2',
    'yes'::vote_choice,
    NULL,
    NULL,
    NOW() - INTERVAL '3 days',
    'vote_tx_5'
  ),
  (
    'drep_test_2',
    'prop_test_3',
    'abstain'::vote_choice,
    NULL,
    NULL,
    NOW() - INTERVAL '2 days',
    'vote_tx_6'
  ),

  -- Charlie votes on only one proposal (lower participation)
  (
    'drep_test_3',
    'prop_test_1',
    'yes'::vote_choice,
    NULL,
    NULL,
    NOW() - INTERVAL '3 days',
    'vote_tx_7'
  );

-- =============================================================================
-- DELEGATION SEED DATA
-- Simulate delegations from various stakeholders
-- =============================================================================

INSERT INTO delegations (
  drep_id, stake_address, lovelace_amount, delegated_at
) VALUES
  -- Alice's delegations (15B ADA total)
  ('drep_test_1', 'addr_test1vqr2kldt0f0h0qdrvdglf6nwyw4lffauwqlqxahpy5p4cxy0p2a0', 5000000000, NOW() - INTERVAL '180 days'),
  ('drep_test_1', 'addr_test1vqr2kldt0f0h0qdrvdglf6nwyw4lffauwqlqxahpy5p4cxy0p2a1', 3000000000, NOW() - INTERVAL '90 days'),
  ('drep_test_1', 'addr_test1vqr2kldt0f0h0qdrvdglf6nwyw4lffauwqlqxahpy5p4cxy0p2a2', 4500000000, NOW() - INTERVAL '60 days'),
  ('drep_test_1', 'addr_test1vqr2kldt0f0h0qdrvdglf6nwyw4lffauwqlqxahpy5p4cxy0p2a3', 2500000000, NOW() - INTERVAL '30 days'),

  -- Bob's delegations (8.5B ADA total)
  ('drep_test_2', 'addr_test1vqr2kldt0f0h0qdrvdglf6nwyw4lffauwqlqxahpy5p4cxy0p2b0', 3000000000, NOW() - INTERVAL '120 days'),
  ('drep_test_2', 'addr_test1vqr2kldt0f0h0qdrvdglf6nwyw4lffauwqlqxahpy5p4cxy0p2b1', 2500000000, NOW() - INTERVAL '75 days'),
  ('drep_test_2', 'addr_test1vqr2kldt0f0h0qdrvdglf6nwyw4lffauwqlqxahpy5p4cxy0p2b2', 3000000000, NOW() - INTERVAL '45 days'),

  -- Charlie's delegations (3.2B ADA total)
  ('drep_test_3', 'addr_test1vqr2kldt0f0h0qdrvdglf6nwyw4lffauwqlqxahpy5p4cxy0p2c0', 1200000000, NOW() - INTERVAL '30 days'),
  ('drep_test_3', 'addr_test1vqr2kldt0f0h0qdrvdglf6nwyw4lffauwqlqxahpy5p4cxy0p2c1', 2000000000, NOW() - INTERVAL '15 days');

-- =============================================================================
-- DREP_SCORES SEED DATA
-- Computed participation scores for the current epoch
-- =============================================================================

INSERT INTO drep_scores (
  drep_id, epoch, participation_rate, votes_cast, votes_eligible,
  rationale_rate, voting_streak_epochs, raw_govscore, adjusted_govscore
) VALUES
  -- Alice: 100% participation, 67% rationale rate (2/3)
  (
    'drep_test_1',
    400,
    1.0000,
    3,
    3,
    0.6667,
    5,
    95.00,
    82.50
    -- Adjusted score = 95.00 * (1 / (1 + log10(15 + 1) / 4))
    --                = 95.00 * (1 / (1 + 0.403 / 4))
    --                = 95.00 * 0.8687 ≈ 82.50
  ),

  -- Bob: 100% participation, 33% rationale rate (1/3)
  (
    'drep_test_2',
    400,
    1.0000,
    3,
    3,
    0.3333,
    3,
    88.00,
    76.25
    -- Adjusted score = 88.00 * (1 / (1 + log10(8.5 + 1) / 4))
    --                = 88.00 * (1 / (1 + 0.354 / 4))
    --                = 88.00 * 0.8665 ≈ 76.25
  ),

  -- Charlie: 33% participation (1/3 votes), 0% rationale rate
  (
    'drep_test_3',
    400,
    0.3333,
    1,
    3,
    0.0000,
    1,
    35.00,
    32.50
    -- Adjusted score = 35.00 * (1 / (1 + log10(3.2 + 1) / 4))
    --                = 35.00 * (1 / (1 + 0.254 / 4))
    --                = 35.00 * 0.9388 ≈ 32.85
  );

-- =============================================================================
-- SYNC_STATE SEED DATA
-- Initialize sync tracking (these will be updated by ETL jobs)
-- =============================================================================

INSERT INTO sync_state (entity, last_synced_block, last_synced_epoch, last_synced_at) VALUES
  ('dreps', 10500000, 400, NOW()),
  ('proposals', 10500000, 400, NOW()),
  ('votes', 10500000, 400, NOW()),
  ('delegations', 10500000, 400, NOW());
