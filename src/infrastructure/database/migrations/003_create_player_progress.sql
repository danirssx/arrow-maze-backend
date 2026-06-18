-- Migration 003: create player progress tables
CREATE TABLE IF NOT EXISTS player_progress (
  id          UUID         PRIMARY KEY,
  user_id     UUID         UNIQUE NOT NULL,
  version     INT          NOT NULL DEFAULT 0,
  updated_at  TIMESTAMPTZ  NOT NULL
);

CREATE TABLE IF NOT EXISTS completed_levels (
  id                 UUID         PRIMARY KEY,
  progress_id        UUID         NOT NULL REFERENCES player_progress(id) ON DELETE CASCADE,
  level_id           VARCHAR(255) NOT NULL,
  best_score         INT          NOT NULL,
  best_time_seconds  NUMERIC      NOT NULL,
  best_moves_count   INT          NOT NULL,
  completed_at       TIMESTAMPTZ  NOT NULL,
  updated_at         TIMESTAMPTZ  NOT NULL,
  UNIQUE (progress_id, level_id)
);

CREATE INDEX IF NOT EXISTS idx_completed_levels_progress_id
  ON completed_levels(progress_id);
