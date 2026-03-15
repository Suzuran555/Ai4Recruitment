CREATE TYPE "public"."application_status" AS ENUM('not_started', 'in_progress', 'completed', 'flagged', 'proceed', 'rejected', 'waitlisted', 'expired');--> statement-breakpoint
ALTER TABLE "pg-drizzle_job_match" ADD COLUMN "status" "application_status" DEFAULT 'completed' NOT NULL;--> statement-breakpoint
ALTER TABLE "pg-drizzle_job_match" ADD COLUMN "updatedAt" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "job_match_status_idx" ON "pg-drizzle_job_match" USING btree ("status");