DROP INDEX IF EXISTS "job_match_unique";--> statement-breakpoint

-- Add repo_full_name as nullable first, then backfill + dedupe, then set NOT NULL.
ALTER TABLE "pg-drizzle_job_match" ADD COLUMN IF NOT EXISTS "repo_full_name" text;--> statement-breakpoint

-- Backfill from repo_analysis via analysis_id
UPDATE "pg-drizzle_job_match" jm
SET "repo_full_name" = ra."repo_full_name"
FROM "pg-drizzle_repo_analysis" ra
WHERE jm."analysis_id" = ra."id" AND jm."repo_full_name" IS NULL;--> statement-breakpoint

-- Ensure no NULL remains (stable, unique-ish fallback for legacy rows without analysis)
UPDATE "pg-drizzle_job_match"
SET "repo_full_name" = CONCAT('__unknown__/', COALESCE("analysis_id"::text, 'no-analysis'), '/', "id"::text)
WHERE "repo_full_name" IS NULL;--> statement-breakpoint

-- Dedupe rows that would violate the new unique index; keep newest createdAt/id
WITH ranked AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "job_id", "candidate_user_id", "repo_full_name"
      ORDER BY "createdAt" DESC, "id" DESC
    ) AS rn
  FROM "pg-drizzle_job_match"
)
DELETE FROM "pg-drizzle_job_match" jm
USING ranked r
WHERE jm."id" = r."id" AND r.rn > 1;--> statement-breakpoint

ALTER TABLE "pg-drizzle_job_match" ALTER COLUMN "repo_full_name" SET NOT NULL;--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "job_match_repo_idx" ON "pg-drizzle_job_match" USING btree ("repo_full_name");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "job_match_unique" ON "pg-drizzle_job_match" USING btree ("job_id","candidate_user_id","repo_full_name");