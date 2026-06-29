-- Align level references with levels.id so PostgreSQL can enforce real FKs.
-- Existing rows must already contain UUID strings; otherwise this migration
-- fails and exposes data that cannot be made referentially safe automatically.
ALTER TABLE "leaderboards" ALTER COLUMN "level_id" TYPE UUID USING "level_id"::uuid;
ALTER TABLE "leaderboard_entries" ALTER COLUMN "level_id" TYPE UUID USING "level_id"::uuid;
ALTER TABLE "completed_levels" ALTER COLUMN "level_id" TYPE UUID USING "level_id"::uuid;

-- User ownership integrity.
ALTER TABLE "leaderboard_entries"
  ADD CONSTRAINT "leaderboard_entries_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE NO ACTION;

ALTER TABLE "player_progress"
  ADD CONSTRAINT "player_progress_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE NO ACTION;

-- Level ownership integrity.
ALTER TABLE "leaderboards"
  ADD CONSTRAINT "leaderboards_level_id_fkey"
  FOREIGN KEY ("level_id") REFERENCES "levels"("id")
  ON DELETE RESTRICT ON UPDATE NO ACTION;

ALTER TABLE "completed_levels"
  ADD CONSTRAINT "completed_levels_level_id_fkey"
  FOREIGN KEY ("level_id") REFERENCES "levels"("id")
  ON DELETE RESTRICT ON UPDATE NO ACTION;
