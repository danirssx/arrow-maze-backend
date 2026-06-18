-- Migration 002: create leaderboard tables
CREATE TABLE IF NOT EXISTS leaderboards (
  id          UUID         PRIMARY KEY,
  level_id    VARCHAR(255) UNIQUE NOT NULL,
  max_entries INT          NOT NULL DEFAULT 10,
  updated_at  TIMESTAMPTZ  NOT NULL
);

CREATE TABLE IF NOT EXISTS leaderboard_entries (
  id                  UUID         PRIMARY KEY,
  leaderboard_id      UUID         NOT NULL REFERENCES leaderboards(id) ON DELETE CASCADE,
  user_id             UUID         NOT NULL,
  level_id            VARCHAR(255) NOT NULL,
  username_snapshot   VARCHAR(255) NOT NULL,
  score               INT          NOT NULL,
  time_seconds        NUMERIC      NOT NULL,
  moves_count         INT          NOT NULL,
  rank                INT,
  submitted_at        TIMESTAMPTZ  NOT NULL,
  UNIQUE (leaderboard_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_leaderboard_entries_leaderboard_id
  ON leaderboard_entries(leaderboard_id);
