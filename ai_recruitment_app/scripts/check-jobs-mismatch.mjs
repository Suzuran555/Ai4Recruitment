#!/usr/bin/env node
/**
 * 检查 HR 和 Candidate 界面看到的 jobs 不匹配问题
 */

import { config } from "dotenv";
import postgres from "postgres";

config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL not found in environment");
  process.exit(1);
}

const sql = postgres(DATABASE_URL);

async function checkJobsMismatch() {
  console.log("=== 检查 Jobs 数据不匹配问题 ===\n");

  try {
    // 1. 获取所有 jobs
    const allJobs = await sql`
      SELECT 
        id, 
        title, 
        is_published, 
        hr_user_id,
        "createdAt"
      FROM "pg-drizzle_job"
      ORDER BY "createdAt" DESC
    `;

    console.log(`📊 数据库中的总 jobs 数: ${allJobs.length}\n`);

    // 2. 按 hr_user_id 分组统计
    const jobsByHr = {};
    for (const job of allJobs) {
      const hrId = job.hr_user_id;
      if (!jobsByHr[hrId]) {
        jobsByHr[hrId] = { total: 0, published: 0, unpublished: 0, jobs: [] };
      }
      jobsByHr[hrId].total++;
      if (job.is_published) {
        jobsByHr[hrId].published++;
      } else {
        jobsByHr[hrId].unpublished++;
      }
      jobsByHr[hrId].jobs.push(job);
    }

    console.log("📋 按 HR 用户分组统计:\n");
    for (const [hrId, stats] of Object.entries(jobsByHr)) {
      console.log(`HR User ID: ${hrId}`);
      console.log(`  - 总 jobs: ${stats.total}`);
      console.log(`  - 已发布: ${stats.published}`);
      console.log(`  - 未发布: ${stats.unpublished}`);
      console.log(`  - HR 界面应该看到: ${stats.published} 个已发布的 jobs`);
      console.log("");
    }

    // 3. 统计所有已发布的 jobs（Candidate 应该看到的）
    const publishedJobs = allJobs.filter((j) => j.is_published);
    console.log(`✅ Candidate 界面应该看到: ${publishedJobs.length} 个已发布的 jobs（所有 HR 创建的）\n`);

    // 4. 检查是否有问题
    console.log("🔍 问题分析:\n");
    console.log("HR 界面查询逻辑: hrUserId = 当前用户 AND isPublished = true");
    console.log("Candidate 界面查询逻辑: isPublished = true (不限制 hrUserId)\n");

    if (Object.keys(jobsByHr).length > 1) {
      console.log("⚠️  发现多个 HR 用户创建了 jobs:");
      console.log("   - 每个 HR 只能看到自己创建的已发布 jobs");
      console.log("   - Candidate 可以看到所有 HR 创建的已发布 jobs");
      console.log("   - 这是正常的行为差异，不是 bug\n");
    }

    // 5. 显示所有 jobs 的详细信息
    console.log("📝 所有 Jobs 详情:\n");
    for (const job of allJobs) {
      const status = job.is_published ? "✅ 已发布" : "❌ 未发布";
      console.log(`ID: ${job.id} | ${job.title} | ${status} | HR: ${job.hr_user_id}`);
    }

    // 6. 检查 candidate_assignment 关联
    console.log("\n\n📊 Candidate Assignment 关联统计:\n");
    const assignments = await sql`
      SELECT 
        ca.id,
        ca.job_id,
        ca.candidate_user_id,
        j.title as job_title,
        j.is_published,
        j.hr_user_id
      FROM "pg-drizzle_candidate_assignment" ca
      JOIN "pg-drizzle_job" j ON ca.job_id = j.id
      ORDER BY ca."createdAt" DESC
      LIMIT 20
    `;

    if (assignments.length > 0) {
      console.log(`找到 ${assignments.length} 个 candidate assignments:\n`);
      for (const assignment of assignments) {
        console.log(
          `Assignment ID: ${assignment.id} | Job: ${assignment.job_title} (ID: ${assignment.job_id}) | Candidate: ${assignment.candidate_user_id} | Published: ${assignment.is_published}`
        );
      }
    } else {
      console.log("没有找到 candidate assignments");
    }
  } catch (error) {
    console.error("❌ 错误:", error);
  } finally {
    await sql.end();
  }
}

checkJobsMismatch().catch(console.error);

