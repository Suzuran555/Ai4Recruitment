#!/usr/bin/env node
/**
 * Debug script to check assignment query logic
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

async function debugAssignment() {
  console.log("🔍 Debugging assignment query...\n");

  try {
    // Check all assignments
    const allAssignments = await sql`
      SELECT a.id, a.job_id, a.repo_template_url, j.title, j.is_published
      FROM "pg-drizzle_assignment" a
      JOIN "pg-drizzle_job" j ON a.job_id = j.id
      ORDER BY a.job_id;
    `;

    console.log(`Total assignments: ${allAssignments.length}\n`);

    if (allAssignments.length > 0) {
      console.log("All assignments:");
      allAssignments.forEach((a) => {
        console.log(`  Job #${a.job_id} (${a.title}):`);
        console.log(`    Assignment #${a.id}: ${a.repo_template_url}`);
        console.log(`    Published: ${a.is_published}`);
        console.log("");
      });
    }

    // Check published jobs with assignments
    const publishedJobsWithAssignments = await sql`
      SELECT j.id, j.title, COUNT(a.id) as assignment_count
      FROM "pg-drizzle_job" j
      LEFT JOIN "pg-drizzle_assignment" a ON a.job_id = j.id
      WHERE j.is_published = true
      GROUP BY j.id, j.title
      ORDER BY j.id;
    `;

    console.log("\nPublished jobs and their assignments:");
    publishedJobsWithAssignments.forEach((j) => {
      const count = Number(j.assignment_count);
      if (count > 0) {
        console.log(`  ✅ Job #${j.id} (${j.title}): ${count} assignment(s)`);
      } else {
        console.log(`  ❌ Job #${j.id} (${j.title}): NO assignment`);
      }
    });

    // Specifically check job 22
    const job22 = await sql`
      SELECT j.id, j.title, j.is_published, a.id as assignment_id, a.repo_template_url
      FROM "pg-drizzle_job" j
      LEFT JOIN "pg-drizzle_assignment" a ON a.job_id = j.id
      WHERE j.id = 22;
    `;

    console.log("\n\nJob #22 (Junior Backend engineer) details:");
    if (job22.length > 0) {
      const j = job22[0];
      console.log(`  ID: ${j.id}`);
      console.log(`  Title: ${j.title}`);
      console.log(`  Published: ${j.is_published}`);
      console.log(`  Assignment ID: ${j.assignment_id ?? "NULL"}`);
      console.log(`  Assignment URL: ${j.repo_template_url ?? "NULL"}`);
      
      if (!j.assignment_id) {
        console.log("\n  ⚠️  This job has NO assignment!");
        console.log("  💡 Create one via: http://localhost:3000/hr/roles/22");
      }
    } else {
      console.log("  ❌ Job #22 not found!");
    }

  } catch (error) {
    console.error("\n❌ Error:", error.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

debugAssignment().catch(console.error);

