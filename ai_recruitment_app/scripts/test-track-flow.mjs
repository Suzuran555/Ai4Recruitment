#!/usr/bin/env node
/**
 * Quick test script for Track Recommendations flow
 * 
 * This script helps verify:
 * 1. Database schema is correct
 * 2. Key tables exist and are accessible
 * 3. Sample data can be queried
 * 
 * Usage: node scripts/test-track-flow.mjs
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

async function testDatabase() {
  console.log("🧪 Testing Track Recommendations Database Schema...\n");

  try {
    // Test 1: Check repo_analysis table has new fields
    console.log("1️⃣  Checking repo_analysis table...");
    const repoAnalysisCheck = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'pg-drizzle_repo_analysis' 
      AND column_name IN ('readme_excerpt', 'domain_tags')
      ORDER BY column_name;
    `;
    
    if (repoAnalysisCheck.length === 2) {
      console.log("   ✅ readme_excerpt and domain_tags columns exist");
    } else {
      console.log("   ⚠️  Missing columns:", repoAnalysisCheck);
      console.log("   💡 Run: pnpm db:push");
    }

    // Test 2: Check candidate_track_selection table exists
    console.log("\n2️⃣  Checking candidate_track_selection table...");
    const trackSelectionExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'pg-drizzle_candidate_track_selection'
      );
    `;
    
    if (trackSelectionExists[0]?.exists) {
      console.log("   ✅ candidate_track_selection table exists");
      
      // Count existing selections
      const count = await sql`
        SELECT COUNT(*) as count 
        FROM "pg-drizzle_candidate_track_selection";
      `;
      console.log(`   📊 Total track selections: ${count[0]?.count ?? 0}`);
    } else {
      console.log("   ❌ candidate_track_selection table missing");
      console.log("   💡 Run: pnpm db:push");
    }

    // Test 3: Check assessment_track enum exists
    console.log("\n3️⃣  Checking assessment_track enum...");
    const enumExists = await sql`
      SELECT EXISTS (
        SELECT FROM pg_type 
        WHERE typname = 'assessment_track'
      );
    `;
    
    if (enumExists[0]?.exists) {
      const enumValues = await sql`
        SELECT enumlabel 
        FROM pg_enum 
        WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'assessment_track')
        ORDER BY enumsortorder;
      `;
      console.log("   ✅ assessment_track enum exists");
      console.log(`   📋 Values: ${enumValues.map((e) => e.enumlabel).join(", ")}`);
    } else {
      console.log("   ❌ assessment_track enum missing");
      console.log("   💡 Run: pnpm db:push");
    }

    // Test 4: Check for published jobs
    console.log("\n4️⃣  Checking for published jobs...");
    const publishedJobs = await sql`
      SELECT id, title, is_published 
      FROM "pg-drizzle_job" 
      WHERE is_published = true 
      LIMIT 5;
    `;
    
    if (publishedJobs.length > 0) {
      console.log(`   ✅ Found ${publishedJobs.length} published job(s):`);
      publishedJobs.forEach((job) => {
        console.log(`      - Job #${job.id}: ${job.title}`);
      });
    } else {
      console.log("   ⚠️  No published jobs found");
      console.log("   💡 Create a job via HR UI or API");
    }

    // Test 5: Check for assignments
    console.log("\n5️⃣  Checking for assignments...");
    const assignments = await sql`
      SELECT a.id, a.job_id, j.title as job_title
      FROM "pg-drizzle_assignment" a
      JOIN "pg-drizzle_job" j ON a.job_id = j.id
      WHERE j.is_published = true
      LIMIT 5;
    `;
    
    if (assignments.length > 0) {
      console.log(`   ✅ Found ${assignments.length} assignment(s):`);
      assignments.forEach((a) => {
        console.log(`      - Assignment #${a.id} for job: ${a.job_title}`);
      });
    } else {
      console.log("   ⚠️  No assignments found for published jobs");
      console.log("   💡 Create assignments via HR UI");
    }

    // Test 6: Check recent repo analyses
    console.log("\n6️⃣  Checking recent repo analyses...");
    const recentAnalyses = await sql`
      SELECT id, repo_full_name, 
             CASE WHEN domain_tags IS NOT NULL THEN jsonb_array_length(domain_tags) ELSE 0 END as domain_count,
             CASE WHEN readme_excerpt IS NOT NULL THEN length(readme_excerpt) ELSE 0 END as readme_length
      FROM "pg-drizzle_repo_analysis"
      ORDER BY id DESC
      LIMIT 3;
    `;
    
    if (recentAnalyses.length > 0) {
      console.log(`   ✅ Found ${recentAnalyses.length} recent analysis(es):`);
      recentAnalyses.forEach((a) => {
        console.log(`      - Analysis #${a.id}: ${a.repo_full_name}`);
        console.log(`        Domain tags: ${a.domain_count}, README: ${a.readme_length} chars`);
      });
    } else {
      console.log("   ℹ️  No repo analyses yet");
      console.log("   💡 Run analysis via /candidate/profile/me");
    }

    // Test 7: Check track selections
    console.log("\n7️⃣  Checking track selections...");
    // First, get the actual column names
    const trackCols = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'pg-drizzle_candidate_track_selection'
      AND column_name LIKE '%created%' OR column_name = 'track';
    `;
    
    const createdCol = trackCols.find((c) => c.column_name.includes("created"))?.column_name ?? "created_at";
    
    const trackSelections = await sql`
      SELECT ts.id, ts.track, ra.repo_full_name, ts.${sql(createdCol)} as created_at
      FROM "pg-drizzle_candidate_track_selection" ts
      JOIN "pg-drizzle_repo_analysis" ra ON ts.analysis_id = ra.id
      ORDER BY ts.id DESC
      LIMIT 3;
    `;
    
    if (trackSelections.length > 0) {
      console.log(`   ✅ Found ${trackSelections.length} track selection(s):`);
      trackSelections.forEach((ts) => {
        console.log(`      - Selection #${ts.id}: ${ts.track} for ${ts.repo_full_name}`);
        console.log(`        Created: ${new Date(ts.created_at).toLocaleString()}`);
      });
    } else {
      console.log("   ℹ️  No track selections yet");
      console.log("   💡 Select a track after analyzing a repo");
    }

    console.log("\n✅ Database schema test completed!\n");
    console.log("📝 Next steps for manual testing:");
    console.log("   1. Start dev server: pnpm dev");
    console.log("   2. Go to: http://localhost:3000/candidate/profile/me");
    console.log("   3. Select a repo and click 'Start Challenge'");
    console.log("   4. Verify track modal appears with Top 3 recommendations\n");

  } catch (error) {
    console.error("\n❌ Test failed:", error.message);
    if (error.message.includes("does not exist")) {
      console.error("   💡 Run: pnpm db:push");
    }
    process.exit(1);
  } finally {
    await sql.end();
  }
}

testDatabase().catch(console.error);

