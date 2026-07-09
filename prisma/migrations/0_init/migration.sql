-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "username" VARCHAR(30) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" VARCHAR(10) NOT NULL DEFAULT 'USER',
    "status" VARCHAR(10) NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leaderboards" (
    "id" UUID NOT NULL,
    "level_id" VARCHAR(255) NOT NULL,
    "max_entries" INTEGER NOT NULL DEFAULT 10,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "leaderboards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leaderboard_entries" (
    "id" UUID NOT NULL,
    "leaderboard_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "level_id" VARCHAR(255) NOT NULL,
    "username_snapshot" VARCHAR(255) NOT NULL,
    "score" INTEGER NOT NULL,
    "time_seconds" DECIMAL NOT NULL,
    "moves_count" INTEGER NOT NULL,
    "rank" INTEGER,
    "submitted_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "leaderboard_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_progress" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "player_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "completed_levels" (
    "id" UUID NOT NULL,
    "progress_id" UUID NOT NULL,
    "level_id" VARCHAR(255) NOT NULL,
    "best_score" INTEGER NOT NULL,
    "best_time_seconds" DECIMAL NOT NULL,
    "best_moves_count" INTEGER NOT NULL,
    "completed_at" TIMESTAMPTZ(6) NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "completed_levels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "levels" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(500) NOT NULL DEFAULT '',
    "difficulty" VARCHAR(10) NOT NULL,
    "status" VARCHAR(10) NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "arrows" JSONB NOT NULL DEFAULT '[]',
    "attempts" INTEGER NOT NULL DEFAULT 5,
    "time_limit_seconds" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "levels_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "leaderboards_level_id_key" ON "leaderboards"("level_id");

-- CreateIndex
CREATE INDEX "idx_leaderboard_entries_leaderboard_id" ON "leaderboard_entries"("leaderboard_id");

-- CreateIndex
CREATE UNIQUE INDEX "leaderboard_entries_leaderboard_id_user_id_key" ON "leaderboard_entries"("leaderboard_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "player_progress_user_id_key" ON "player_progress"("user_id");

-- CreateIndex
CREATE INDEX "idx_completed_levels_progress_id" ON "completed_levels"("progress_id");

-- CreateIndex
CREATE UNIQUE INDEX "completed_levels_progress_id_level_id_key" ON "completed_levels"("progress_id", "level_id");

-- CreateIndex
CREATE INDEX "idx_levels_status" ON "levels"("status");

-- AddForeignKey
ALTER TABLE "leaderboard_entries" ADD CONSTRAINT "leaderboard_entries_leaderboard_id_fkey" FOREIGN KEY ("leaderboard_id") REFERENCES "leaderboards"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "completed_levels" ADD CONSTRAINT "completed_levels_progress_id_fkey" FOREIGN KEY ("progress_id") REFERENCES "player_progress"("id") ON DELETE CASCADE ON UPDATE NO ACTION;


-- CheckConstraints (preserved from the original SQL migrations; Prisma does not
-- model CHECK constraints, so they live in the migration SQL only and are not
-- subject to drift detection).
ALTER TABLE "levels" ADD CONSTRAINT "chk_levels_arrows_array" CHECK (jsonb_typeof("arrows") = 'array');
ALTER TABLE "levels" ADD CONSTRAINT "chk_levels_attempts_positive" CHECK ("attempts" >= 1);
