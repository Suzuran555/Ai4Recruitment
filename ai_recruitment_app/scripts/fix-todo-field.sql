-- SQL Migration: Fix candidateAssignment.todo field format
-- Run this if you have existing assignments with incorrect todo field format

-- Update all records where todo is an empty array or null
UPDATE "pg-drizzle_candidate_assignment"
SET todo = '{"mainTask": "", "subtasks": [], "completedCount": 0}'::jsonb
WHERE
  todo IS NULL
  OR todo = '[]'::jsonb
  OR NOT (todo ? 'subtasks')
  OR jsonb_typeof(todo) = 'array';

-- Verify the fix
SELECT
  id,
  status,
  todo,
  CASE
    WHEN todo ? 'subtasks' THEN '✓ Fixed'
    ELSE '✗ Still broken'
  END as todo_status
FROM "pg-drizzle_candidate_assignment"
ORDER BY id;
