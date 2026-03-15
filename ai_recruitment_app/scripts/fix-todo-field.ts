/**
 * Database Migration: Fix candidateAssignment.todo field format
 *
 * This script fixes any existing candidateAssignment records where the 'todo' field
 * was incorrectly initialized as an empty array [] instead of the proper object structure.
 *
 * Run this script if you have existing assignments created before the bug fix.
 */

import { db } from "~/server/db";
import { candidateAssignment } from "~/server/db/schema";
import { sql } from "drizzle-orm";

async function migrateTodoField() {
  console.log("Starting migration: Fix candidateAssignment.todo field format");

  try {
    // Find all assignments where todo is an array or null
    const assignments = await db.query.candidateAssignment.findMany();

    let fixedCount = 0;

    for (const assignment of assignments) {
      const todo = assignment.todo;

      // Check if todo needs fixing (is array, null, or missing subtasks)
      const needsFix =
        !todo ||
        Array.isArray(todo) ||
        typeof todo !== "object" ||
        !("subtasks" in todo);

      if (needsFix) {
        console.log(`Fixing assignment ID ${assignment.id}`);

        await db
          .update(candidateAssignment)
          .set({
            todo: {
              mainTask: "",
              subtasks: [],
              completedCount: 0,
            },
          })
          .where(sql`${candidateAssignment.id} = ${assignment.id}`);

        fixedCount++;
      }
    }

    console.log(`✅ Migration complete! Fixed ${fixedCount} records.`);
    console.log(`Total assignments checked: ${assignments.length}`);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  }
}

// Run migration
migrateTodoField()
  .then(() => {
    console.log("Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });
