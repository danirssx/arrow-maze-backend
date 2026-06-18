-- Migration 004: create level catalog tables
CREATE TABLE IF NOT EXISTS levels (
  id                  UUID         PRIMARY KEY,
  name                VARCHAR(100) NOT NULL,
  description         VARCHAR(500) NOT NULL DEFAULT '',
  difficulty          VARCHAR(10)  NOT NULL,
  status              VARCHAR(10)  NOT NULL DEFAULT 'DRAFT',
  version             INT          NOT NULL DEFAULT 1,
  arrows              JSONB        NOT NULL DEFAULT '[]'::jsonb,
  attempts            INT          NOT NULL DEFAULT 5 CHECK (attempts >= 1),
  time_limit_seconds  INT,
  move_count          INT,
  created_at          TIMESTAMPTZ  NOT NULL,
  updated_at          TIMESTAMPTZ  NOT NULL
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_levels_arrows_array'
  ) THEN
    ALTER TABLE levels
      ADD CONSTRAINT chk_levels_arrows_array CHECK (jsonb_typeof(arrows) = 'array');
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_levels_status ON levels(status);
