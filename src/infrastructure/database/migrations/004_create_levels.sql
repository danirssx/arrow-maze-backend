-- Migration 004: create level catalog tables
CREATE TABLE IF NOT EXISTS levels (
  id                  UUID         PRIMARY KEY,
  name                VARCHAR(100) NOT NULL,
  description         VARCHAR(500) NOT NULL DEFAULT '',
  difficulty          VARCHAR(10)  NOT NULL,
  status              VARCHAR(10)  NOT NULL DEFAULT 'DRAFT',
  version             INT          NOT NULL DEFAULT 1,
  board_rows          INT          NOT NULL,
  board_cols          INT          NOT NULL,
  time_limit_seconds  INT,
  move_count          INT,
  created_at          TIMESTAMPTZ  NOT NULL,
  updated_at          TIMESTAMPTZ  NOT NULL
);

CREATE TABLE IF NOT EXISTS level_cells (
  id        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  level_id  UUID        NOT NULL REFERENCES levels(id) ON DELETE CASCADE,
  row       INT         NOT NULL,
  col       INT         NOT NULL,
  type      VARCHAR(10) NOT NULL,
  direction VARCHAR(15),
  UNIQUE (level_id, row, col)
);

CREATE INDEX IF NOT EXISTS idx_level_cells_level_id ON level_cells(level_id);
CREATE INDEX IF NOT EXISTS idx_levels_status ON levels(status);
