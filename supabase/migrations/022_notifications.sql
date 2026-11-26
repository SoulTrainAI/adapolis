-- In-app notifications (2026-11-26). One row per notification per wallet;
-- dedupe_key makes every generator safe to re-run. Preferences hold per-type
-- switches for in-app and (later) email/ADAmail. Private: server only.
-- Safe to run more than once. Deletes nothing.

CREATE TABLE IF NOT EXISTS notifications (
  id BIGSERIAL PRIMARY KEY,
  stake_address TEXT NOT NULL CHECK (stake_address ~ '^stake1u[02-9ac-hj-np-z]{52}$'),
  type TEXT NOT NULL,
  title TEXT NOT NULL CHECK (length(title) <= 200),
  body TEXT CHECK (body IS NULL OR length(body) <= 2000),
  url TEXT CHECK (url IS NULL OR length(url) <= 500),
  dedupe_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  UNIQUE (stake_address, dedupe_key)
);
CREATE INDEX IF NOT EXISTS idx_notifications_wallet ON notifications(stake_address, created_at DESC);

CREATE TABLE IF NOT EXISTS notification_prefs (
  stake_address TEXT PRIMARY KEY CHECK (stake_address ~ '^stake1u[02-9ac-hj-np-z]{52}$'),
  prefs JSONB NOT NULL DEFAULT '{}'::jsonb,   -- { "<type>": { "inapp": bool, "email": bool } }; missing = in-app on
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Last team standing seen by the notifier, so rank and points changes can be reported once.
CREATE TABLE IF NOT EXISTS notification_team_state (
  stake_address TEXT NOT NULL,
  season_number INTEGER NOT NULL,
  rank INTEGER,
  points NUMERIC(10,1),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (stake_address, season_number)
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_prefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_team_state ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON notifications, notification_prefs, notification_team_state FROM anon, authenticated;
GRANT ALL ON notifications, notification_prefs, notification_team_state TO service_role;
GRANT USAGE, SELECT ON SEQUENCE notifications_id_seq TO service_role;
