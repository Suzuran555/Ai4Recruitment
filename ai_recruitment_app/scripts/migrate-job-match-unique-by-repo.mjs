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
  console.log("[db:migrate-job-match-unique-by-repo] Starting...");

  await sql.begin(async (tx) => {
    // 1) Ensure column exists (nullable first)
    await tx`alter table "pg-drizzle_job_match" add column if not exists "repo_full_name" text`;

    // 2) Backfill from repo_analysis
    await tx`
      update "pg-drizzle_job_match" jm
      set "repo_full_name" = ra."repo_full_name"
      from "pg-drizzle_repo_analysis" ra
      where jm."analysis_id" = ra."id" and jm."repo_full_name" is null
    `;

    // 3) Fill remaining nulls with stable fallback to satisfy NOT NULL
    await tx`
      update "pg-drizzle_job_match"
      set "repo_full_name" = concat('__unknown__/', coalesce("analysis_id"::text, 'no-analysis'), '/', "id"::text)
      where "repo_full_name" is null
    `;

    // 4) Dedupe by (job_id, candidate_user_id, repo_full_name) keeping newest createdAt/id
    await tx`
      with ranked as (
        select
          "id",
          row_number() over (
            partition by "job_id", "candidate_user_id", "repo_full_name"
            order by "createdAt" desc, "id" desc
          ) as rn
        from "pg-drizzle_job_match"
      )
      delete from "pg-drizzle_job_match" jm
      using ranked r
      where jm."id" = r."id" and r.rn > 1
    `;

    // 5) Swap unique index
    // Old index: (job_id, candidate_user_id)
    // New index: (job_id, candidate_user_id, repo_full_name)
    await tx`drop index if exists "job_match_unique"`;
    await tx`
      create unique index "job_match_unique"
      on "pg-drizzle_job_match" using btree ("job_id","candidate_user_id","repo_full_name")
    `;

    // 6) Ensure not null
    await tx`alter table "pg-drizzle_job_match" alter column "repo_full_name" set not null`;

    // 7) Add helpful index
    await tx`create index if not exists "job_match_repo_idx" on "pg-drizzle_job_match" using btree ("repo_full_name")`;
  });

  console.log("[db:migrate-job-match-unique-by-repo] Done.");
}

await main()
  .catch((err) => {
    console.error("[db:migrate-job-match-unique-by-repo] Failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sql.end({ timeout: 2 });
  });


