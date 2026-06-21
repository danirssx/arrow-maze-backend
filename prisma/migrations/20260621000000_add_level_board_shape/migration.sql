-- Add optional abstract board shape (CELL_MASK) to levels.
-- Option A: the shape is a visual + authoring/placement mask, not a physical wall.
-- Nullable for backward compatibility with existing rows.
ALTER TABLE "levels" ADD COLUMN "board_shape" JSONB;

-- Guard: when present, board_shape must be a JSON object ({ type, cells }).
ALTER TABLE "levels"
  ADD CONSTRAINT "chk_levels_board_shape_object"
  CHECK ("board_shape" IS NULL OR jsonb_typeof("board_shape") = 'object');
