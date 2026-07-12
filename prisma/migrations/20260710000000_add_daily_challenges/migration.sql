-- Cache one validated daily challenge per UTC date.
CREATE TABLE "daily_challenges" (
  "date" VARCHAR(10) NOT NULL,
  "seed" VARCHAR(32) NOT NULL,
  "target_difficulty" VARCHAR(10) NOT NULL,
  "source" VARCHAR(20) NOT NULL,
  "level" JSONB NOT NULL,
  "validation" JSONB NOT NULL,
  "generated_at" TIMESTAMPTZ(6) NOT NULL,
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "daily_challenges_pkey" PRIMARY KEY ("date")
);

ALTER TABLE "daily_challenges"
  ADD CONSTRAINT "chk_daily_challenges_date_format"
  CHECK ("date" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$');

ALTER TABLE "daily_challenges"
  ADD CONSTRAINT "chk_daily_challenges_source"
  CHECK ("source" IN ('gemini', 'fallback'));
