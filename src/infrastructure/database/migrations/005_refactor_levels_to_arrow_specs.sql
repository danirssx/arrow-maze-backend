-- Migration 005: refactor level catalog from maze cells to arrow untangle specs
ALTER TABLE levels
  ADD COLUMN IF NOT EXISTS arrows JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS attempts INT NOT NULL DEFAULT 5;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'levels' AND column_name = 'board_rows'
  ) THEN
    ALTER TABLE levels ALTER COLUMN board_rows DROP NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'levels' AND column_name = 'board_cols'
  ) THEN
    ALTER TABLE levels ALTER COLUMN board_cols DROP NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_levels_attempts_positive'
  ) THEN
    ALTER TABLE levels
      ADD CONSTRAINT chk_levels_attempts_positive CHECK (attempts >= 1);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_levels_arrows_array'
  ) THEN
    ALTER TABLE levels
      ADD CONSTRAINT chk_levels_arrows_array CHECK (jsonb_typeof(arrows) = 'array');
  END IF;
END $$;
