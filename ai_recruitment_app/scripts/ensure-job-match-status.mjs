import "dotenv/config";
import postgres from "postgres";

function assertEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

const DATABASE_URL = assertEnv("DATABASE_URL");
const sql = postgres(DATABASE_URL, { max: 1 });

async function main() {
  console.log("[db:ensure-job-match-status] Starting...");

  await sql.begin(async (tx) => {
    // Ensure enum type exists.
    await tx`
      do $$
      begin
        if not exists (select 1 from pg_type where typname = 'application_status') then
          create type "public"."application_status" as enum (
            'not_started',
            'in_progress',
            'completed',
            'flagged',
            'proceed',
            'rejected',
            'waitlisted',
            'expired'
          );
        end if;
      end $$;
    `;

    // Ensure columns exist.
    await tx`alter table "pg-drizzle_job_match" add column if not exists "status" "application_status" default 'completed' not null`;
    await tx`alter table "pg-drizzle_job_match" add column if not exists "updatedAt" timestamp with time zone`;

    // Helpful index.
    await tx`create index if not exists "job_match_status_idx" on "pg-drizzle_job_match" using btree ("status")`;
  });

  console.log("[db:ensure-job-match-status] Done.");
}

await main()
  .catch((err) => {
    console.error("[db:ensure-job-match-status] Failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sql.end({ timeout: 2 });
  });
