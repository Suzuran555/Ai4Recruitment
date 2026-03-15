#!/usr/bin/env node
/**
 * Test script to verify assignment creation and query
 * 
 * Usage: node scripts/test-assignment-save.mjs <jobId> <repoUrl>
 * Example: node scripts/test-assignment-save.mjs 22 https://github.com/test/template
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

async function testAssignment(jobId, repoUrl) {
  console.log(`🧪 Testing assignment for job #${jobId}...\n`);

  try {
    // 1. Check if job exists
    const job = await sql`
      SELECT id, title, hr_user_id, is_published
      FROM "pg-drizzle_job"
      WHERE id = ${jobId}
    `;
    
    if (job.length === 0) {
      console.error(`❌ Job #${jobId} not found`);
      process.exit(1);
    }
    
    console.log(`✅ Job found: ${job[0].title}`);
    console.log(`   HR User ID: ${job[0].hr_user_id}`);
    console.log(`   Published: ${job[0].is_published}\n`);

    // 2. Check existing assignments
    const existing = await sql`
      SELECT id, job_id, repo_template_url, instructions
      FROM "pg-drizzle_assignment"
      WHERE job_id = ${jobId}
    `;
    
    if (existing.length > 0) {
      console.log(`⚠️  Found ${existing.length} existing assignment(s):`);
      existing.forEach((a) => {
        console.log(`   - Assignment #${a.id}: ${a.repo_template_url}`);
      });
      console.log("");
    } else {
      console.log("ℹ️  No existing assignment found\n");
    }

    // 3. If repoUrl provided, test creating/updating
    if (repoUrl) {
      console.log(`📝 Testing assignment save with URL: ${repoUrl}\n`);
      
      // This would normally be done via tRPC API, but we'll simulate it
      if (existing.length > 0) {
        console.log("   Would UPDATE existing assignment #" + existing[0].id);
      } else {
        console.log("   Would CREATE new assignment");
      }
      
      console.log("\n💡 To actually save, use the HR UI:");
      console.log(`   http://localhost:3000/hr/roles/${jobId}\n`);
    }

    // 4. Check unique constraint
    const uniqueIndex = await sql`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE tablename = 'pg-drizzle_assignment' 
      AND indexname = 'assignment_job_unique'
    `;
    
    if (uniqueIndex.length > 0) {
      console.log("✅ Unique constraint exists (prevents duplicates)");
      console.log(`   ${uniqueIndex[0].indexname}\n`);
    } else {
      console.log("⚠️  Unique constraint missing! Run: pnpm db:push\n");
    }

    // 5. Test query (simulating track.getOptions query)
    const jobsWithAssignments = await sql`
      SELECT 
        j.id,
        j.title,
        a.id as assignment_id,
        a.repo_template_url
      FROM "pg-drizzle_job" j
      LEFT JOIN "pg-drizzle_assignment" a ON a.job_id = j.id
      WHERE j.id = ${jobId}
    `;
    
    console.log("📊 Query result (simulating track.getOptions):");
    const result = jobsWithAssignments[0];
    if (result.assignment_id) {
      console.log(`   ✅ Job #${result.id} has assignment #${result.assignment_id}`);
      console.log(`   Template: ${result.repo_template_url}`);
    } else {
      console.log(`   ❌ Job #${result.id} has NO assignment`);
      console.log(`   This is why it shows "missing" in Track Modal`);
    }

  } catch (error) {
    console.error("\n❌ Error:", error.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

const jobId = process.argv[2] ? Number(process.argv[2]) : null;
const repoUrl = process.argv[3] || null;

if (!jobId) {
  console.error("Usage: node scripts/test-assignment-save.mjs <jobId> [repoUrl]");
  console.error("Example: node scripts/test-assignment-save.mjs 22 https://github.com/test/template");
  process.exit(1);
}

testAssignment(jobId, repoUrl).catch(console.error);

