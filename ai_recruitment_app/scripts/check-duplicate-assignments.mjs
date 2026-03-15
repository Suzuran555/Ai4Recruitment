#!/usr/bin/env node
/**
 * Check for duplicate assignments per job
 */

import postgres from "postgres";
import { config } from "dotenv";

config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL not set in .env");
  process.exit(1);
}

const sql = postgres(DATABASE_URL);

async function checkDuplicates() {
  console.log("🔍 Checking for duplicate assignments...\n");

  try {
    // Find jobs with multiple assignments
    const duplicates = await sql`
      SELECT job_id, COUNT(*) as count, array_agg(id) as assignment_ids
      FROM "pg-drizzle_assignment"
      GROUP BY job_id
      HAVING COUNT(*) > 1
      ORDER BY job_id;
    `;

    if (duplicates.length === 0) {
      console.log("✅ No duplicate assignments found.\n");
    } else {
      console.log(`⚠️  Found ${duplicates.length} job(s) with multiple assignments:\n`);
      
      for (const dup of duplicates) {
        const job = await sql`
          SELECT id, title FROM "pg-drizzle_job" WHERE id = ${dup.job_id};
        `;
        console.log(`Job #${dup.job_id}: ${job[0]?.title ?? "Unknown"}`);
        console.log(`  Assignment IDs: ${dup.assignment_ids.join(", ")}`);
        
        const assignments = await sql`
          SELECT id, repo_template_url, created_at
          FROM "pg-drizzle_assignment"
          WHERE job_id = ${dup.job_id}
          ORDER BY created_at;
        `;
        assignments.forEach((a) => {
          console.log(`    - Assignment #${a.id}: ${a.repo_template_url}`);
          console.log(`      Created: ${new Date(a.created_at).toLocaleString()}`);
        });
        console.log("");
      }
    }

    // Check specific jobs
    const job22 = await sql`
      SELECT a.id, a.job_id, a.repo_template_url, j.title
      FROM "pg-drizzle_assignment" a
      JOIN "pg-drizzle_job" j ON a.job_id = j.id
      WHERE a.job_id = 22;
    `;
    
    if (job22.length > 0) {
      console.log(`Job #22 (Junior Backend engineer) assignments:`);
      job22.forEach((a) => {
        console.log(`  - Assignment #${a.id}: ${a.repo_template_url}`);
      });
    } else {
      console.log(`❌ Job #22 (Junior Backend engineer) has NO assignments`);
    }

  } catch (error) {
    console.error("\n❌ Error:", error.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

checkDuplicates().catch(console.error);

