-- Quiz profiles (Find My DRep, opt-in)
-- Quiz answers a player chose to save to their wallet so they can use them on
-- other devices. Off by default: answers otherwise stay in the browser.
-- PRIVATE: no public read policy. Only the server (service role) reads or
-- writes, and only for the signed-in stake address.
-- Safe to run more than once.
-- Created: 2026-11-21

CREATE TABLE IF NOT EXISTS quiz_profiles (
  stake_address TEXT PRIMARY KEY CHECK (stake_address ~ '^stake1u[02-9ac-hj-np-z]{52}$'),
  answers JSONB NOT NULL,
  include_deeper BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE quiz_profiles ENABLE ROW LEVEL SECURITY;

-- Deliberately no SELECT policy for anon/authenticated: answers are private.
REVOKE ALL ON quiz_profiles FROM anon, authenticated;
GRANT ALL ON quiz_profiles TO service_role;
