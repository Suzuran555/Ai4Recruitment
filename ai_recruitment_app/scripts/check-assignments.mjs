#!/usr/bin/env node
/**
 * Quick script to check which published jobs have assignments
 * 
 * Usage: node scripts/check-assignments.mjs
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

async function checkAssignments() {
  console.log("🔍 Checking published jobs and their assignments...\n");

  try {
    const jobs = await sql`
      SELECT 
        j.id,
        j.title,
        j.is_published,
        COUNT(a.id) as assignment_count
      FROM "pg-drizzle_job" j
      LEFT JOIN "pg-drizzle_assignment" a ON a.job_id = j.id
      WHERE j.is_published = true
      GROUP BY j.id, j.title, j.is_published
      ORDER BY j.id DESC;
    `;

    if (jobs.length === 0) {
      console.log("⚠️  No published jobs found!");
      console.log("💡 Create and publish jobs via HR UI\n");
      return;
    }

    console.log(`Found ${jobs.length} published job(s):\n`);

    let jobsWithAssignments = 0;
    let jobsWithoutAssignments = 0;

    for (const job of jobs) {
      const hasAssignment = Number(job.assignment_count) > 0;
      if (hasAssignment) {
        jobsWithAssignments++;
        console.log(`✅ Job #${job.id}: ${job.title}`);
        console.log(`   Assignments: ${job.assignment_count}`);
        
        // Get assignment details
        const assignments = await sql`
          SELECT id, repo_template_url, instructions
          FROM "pg-drizzle_assignment"
          WHERE job_id = ${job.id};
        `;
        assignments.forEach((a) => {
          console.log(`   - Assignment #${a.id}: ${a.repo_template_url || "No template URL"}`);
        });
      } else {
        jobsWithoutAssignments++;
        console.log(`❌ Job #${job.id}: ${job.title}`);
        console.log(`   ⚠️  No assignments found`);
        console.log(`   💡 Create assignment via HR UI: /hr/roles/${job.id}`);
      }
      console.log("");
    }

    console.log("📊 Summary:");
    console.log(`   Jobs with assignments: ${jobsWithAssignments}`);
    console.log(`   Jobs without assignments: ${jobsWithoutAssignments}`);
    console.log("");

    if (jobsWithoutAssignments > 0) {
      console.log("💡 To fix:");
      console.log("   1. Go to HR UI: http://localhost:3000/hr/roles");
      console.log("   2. Click on a job without assignment");
      console.log("   3. Add an assignment template URL");
      console.log("   4. Or use API: assignment.upsertForJob\n");
    }

  } catch (error) {
    console.error("\n❌ Error:", error.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

checkAssignments().catch(console.error);

