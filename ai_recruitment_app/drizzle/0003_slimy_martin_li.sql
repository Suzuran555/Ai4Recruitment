DROP INDEX "job_match_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "job_match_unique" ON "pg-drizzle_job_match" USING btree ("job_id","candidate_user_id");