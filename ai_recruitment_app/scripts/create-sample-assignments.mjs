#!/usr/bin/env node
/**
 * Quick script to create sample assignments for published jobs
 * 
 * This creates assignments with placeholder template URLs.
 * HR should update these with real template repos later.
 * 
 * Usage: node scripts/create-sample-assignments.mjs
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

async function createSampleAssignments() {
  console.log("🔧 Creating sample assignments for published jobs...\n");

  try {
    // Get all published jobs without assignments
    const jobsWithoutAssignments = await sql`
      SELECT j.id, j.title
      FROM "pg-drizzle_job" j
      LEFT JOIN "pg-drizzle_assignment" a ON a.job_id = j.id
      WHERE j.is_published = true
        AND a.id IS NULL
      ORDER BY j.id DESC;
    `;

    if (jobsWithoutAssignments.length === 0) {
      console.log("✅ All published jobs already have assignments!\n");
      return;
    }

    console.log(`Found ${jobsWithoutAssignments.length} job(s) without assignments:\n`);

    for (const job of jobsWithoutAssignments) {
      // Create a placeholder assignment
      // In production, HR should replace this with a real template repo URL
      const placeholderUrl = `https://github.com/lyrathon/template-${job.id}`;
      
      const [assignment] = await sql`
        INSERT INTO "pg-drizzle_assignment" (job_id, repo_template_url, instructions)
        VALUES (
          ${job.id},
          ${placeholderUrl},
          ${`This is a placeholder assignment for ${job.title}. Please update with a real template repository URL.`}
        )
        RETURNING id, repo_template_url;
      `;

      console.log(`✅ Created assignment for Job #${job.id}: ${job.title}`);
      console.log(`   Assignment ID: ${assignment.id}`);
      console.log(`   Template URL: ${assignment.repo_template_url}`);
      console.log(`   ⚠️  Note: This is a placeholder. Update with real template repo!\n`);
    }

    console.log("✅ Done! Assignments created.");
    console.log("\n💡 Next steps:");
    console.log("   1. Go to HR UI: http://localhost:3000/hr/roles");
    console.log("   2. Click on each job and update the assignment template URL");
    console.log("   3. Or use API: assignment.upsertForJob\n");

  } catch (error) {
    console.error("\n❌ Error:", error.message);
    if (error.message.includes("duplicate") || error.message.includes("unique")) {
      console.error("   Some assignments may already exist. Skipping...\n");
    } else {
      process.exit(1);
    }
  } finally {
    await sql.end();
  }
}

createSampleAssignments().catch(console.error);

