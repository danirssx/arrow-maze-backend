-- Persist admin manual daily challenge iteration operations (sanitized log).
CREATE TABLE "daily_challenge_iterations" (
  "operation_id" UUID NOT NULL,
  "date" VARCHAR(10) NOT NULL,
  "status" VARCHAR(12) NOT NULL,
  "requested_at" TIMESTAMPTZ(6) NOT NULL,
  "completed_at" TIMESTAMPTZ(6),
  "events" JSONB NOT NULL,
  "challenge" JSONB,
  "created_at" TIMESTAMPTZ(6) NOT NULL,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "daily_challenge_iterations_pkey" PRIMARY KEY ("operation_id")
);

ALTER TABLE "daily_challenge_iterations"
  ADD CONSTRAINT "chk_daily_challenge_iterations_date_format"
  CHECK ("date" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$');

ALTER TABLE "daily_challenge_iterations"
  ADD CONSTRAINT "chk_daily_challenge_iterations_status"
  CHECK ("status" IN ('RUNNING', 'SUCCEEDED', 'FAILED'));

CREATE INDEX "idx_daily_challenge_iterations_date_status"
  ON "daily_challenge_iterations" ("date", "status");

-- Backstop for the "one RUNNING iteration per UTC date" rule: even if two admin
-- requests race past the application-level findRunningByDate check, the DB rejects
-- the second concurrent RUNNING operation for the same date.
CREATE UNIQUE INDEX "uniq_daily_challenge_iterations_running_date"
  ON "daily_challenge_iterations" ("date")
  WHERE "status" = 'RUNNING';
