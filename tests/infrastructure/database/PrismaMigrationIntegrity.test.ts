import { readFileSync } from "node:fs";

const migrationSql = readFileSync(
  new URL("../../../prisma/migrations/20260628000000_add_progress_integrity/migration.sql", import.meta.url),
  "utf8",
);

describe("Prisma MAZ-176 integrity migration", () => {
  it("should_define_user_and_level_foreign_keys_when_migration_is_inspected", () => {
    // Arrange / Act / Assert
    expect(migrationSql).toContain("leaderboard_entries_user_id_fkey");
    expect(migrationSql).toMatch(/REFERENCES "users"\("id"\)\s+ON DELETE RESTRICT/);
    expect(migrationSql).toContain("player_progress_user_id_fkey");
    expect(migrationSql).toContain("leaderboards_level_id_fkey");
    expect(migrationSql).toMatch(/REFERENCES "levels"\("id"\)\s+ON DELETE RESTRICT/);
    expect(migrationSql).toContain("completed_levels_level_id_fkey");
  });

  it("should_cast_level_references_to_uuid_before_adding_level_foreign_keys", () => {
    // Arrange / Act / Assert
    expect(migrationSql).toContain(
      'ALTER TABLE "leaderboards" ALTER COLUMN "level_id" TYPE UUID USING "level_id"::uuid',
    );
    expect(migrationSql).toContain(
      'ALTER TABLE "completed_levels" ALTER COLUMN "level_id" TYPE UUID USING "level_id"::uuid',
    );
  });
});
