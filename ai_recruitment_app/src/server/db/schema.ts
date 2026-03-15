import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  pgEnum,
  pgTable,
  pgTableCreator,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const createTable = pgTableCreator((name) => `pg-drizzle_${name}`);

export const applicationStatusEnum = pgEnum("application_status", [
  "not_started",
  "in_progress",
  "completed",
  "flagged",
  "proceed",
  "rejected",
  "waitlisted",
  "expired",
] as const);

export const assessmentTrackEnum = pgEnum("assessment_track", [
  "specialist",
  "expansion",
  "pragmatist",
] as const);

export const posts = createTable(
  "post",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    name: d.varchar({ length: 256 }),
    createdById: d
      .varchar({ length: 255 })
      .notNull()
      .references(() => user.id),
    createdAt: d
      .timestamp({ withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
  }),
  (t) => [
    index("created_by_idx").on(t.createdById),
    index("name_idx").on(t.name),
  ],
);

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified")
    .$defaultFn(() => false)
    .notNull(),
  image: text("image"),
  /**
   * 用户角色：
   * - "hr": HR 端（可管理 Job、查看候选人）
   * - "candidate": Candidate 端（绑定 GitHub、触发分析、申请岗位）
   *
   * 默认给 "candidate" 以保证安全：未明确标记为 HR 的用户不能访问 HR-only 接口。
   */
  role: text("role").$type<"hr" | "candidate">().notNull().default("candidate"),
  createdAt: timestamp("created_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
  updatedAt: timestamp("updated_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").$defaultFn(
    () => /* @__PURE__ */ new Date(),
  ),
  updatedAt: timestamp("updated_at").$defaultFn(
    () => /* @__PURE__ */ new Date(),
  ),
});

export const userRelations = relations(user, ({ many }) => ({
  account: many(account),
  session: many(session),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, { fields: [account.userId], references: [user.id] }),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, { fields: [session.userId], references: [user.id] }),
}));


// Job schema
export const job = createTable("job", (d) => ({
  id: d.integer().primaryKey().generatedByDefaultAsIdentity(),

  // HR user
  hrUserId: d
    .text("hr_user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),

  title: d.varchar({ length: 255 }).notNull(),
  description: d.text(),

  /**
   * Hackathon: 先用最小字段表达“岗位类型 + 级别”，用于你 spec 里的 4 类 role + junior/senior。
   * - roleType: frontend/backend/full-stack/devops
   * - seniority: junior/senior
   */
  roleType: d.text("role_type"),
  seniority: d.text("seniority"),

  // 技术栈 & 权重（JSON，方便 AI / 规则混用）
  // Required stack: 
  // Example: {
  //   "React": 0.3,
  //   "Node.js": 0.25,
  //   "TypeScript": 0.2,
  //   "PostgreSQL": 0.15,
  //   "Testing": 0.1
  // }
  // With a total of 100%. jsonb可以计算/解释

  requiredStacks: d.jsonb("required_stacks").$type<Record<string, number>>().notNull(),
  // e.g. { "React": 0.3, "Node": 0.2, "Postgres": 0.1 }

  matchThreshold: d.integer("match_threshold").$defaultFn(() => 50).notNull(),

  isPublished: d.boolean("is_published").$defaultFn(() => false).notNull(),

  createdAt: d.timestamp({ withTimezone: true }).$defaultFn(() => new Date()).notNull(),
  updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
}));


// CandidateProfile
// In the current phase, we only read from the public repo
// Candidate can upload their Github URL/ID. All the analysis starts from this table
export const candidateProfile = createTable("candidate_profile", (d) => ({
  userId: d
    .text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),

  githubLogin: d.varchar({ length: 255 }).notNull(),
  githubUrl: d.text("github_url").notNull(),

  // Optional: candidate-provided preferences / resume metadata
  preferredCulture: d.text("preferred_culture"),
  resume: d.jsonb("resume").$type<any>(),

  lastAnalyzedAt: d.timestamp({ withTimezone: true }),

  createdAt: d.timestamp({ withTimezone: true }).$defaultFn(() => new Date()).notNull(),
}));


// RepoAnalysis
export const repoAnalysis = createTable("repo_analysis", (d) => ({
  id: d.integer().primaryKey().generatedByDefaultAsIdentity(),

  candidateUserId: d
    .text("candidate_user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),

  repoFullName: d.text("repo_full_name").notNull(),
  // e.g. "vercel/next.js"

  techStack: d.jsonb("tech_stack").$type<any>().notNull(),        // 先 any 也行
  // e.g. { languages, frameworks, tooling }

  signals: d.jsonb("signals").$type<any>(),
  // e.g. hasCI, hasDockerfile, testFrameworks

  rationale: d.jsonb("rationale").$type<any>(),
  // 0-100，分析可信度

  // README-derived signals (best-effort)
  readmeExcerpt: d.text("readme_excerpt"),
  domainTags: d.jsonb("domain_tags").$type<string[]>(),

  createdAt: d.timestamp({ withTimezone: true }).$defaultFn(() => new Date()).notNull(),
}));

/**
 * CandidateTrackSelection: candidate chooses one assessment track after analysis.
 * Unique per (candidate, analysis).
 */
export const candidateTrackSelection = createTable(
  "candidate_track_selection",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    candidateUserId: d
      .text("candidate_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    analysisId: d
      .integer("analysis_id")
      .notNull()
      .references(() => repoAnalysis.id, { onDelete: "cascade" }),
    track: assessmentTrackEnum("track").notNull(),
    createdAt: d.timestamp({ withTimezone: true }).$defaultFn(() => new Date()).notNull(),
    updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
  }),
  (t) => [
    uniqueIndex("candidate_track_selection_unique").on(t.candidateUserId, t.analysisId),
    index("candidate_track_selection_candidate_idx").on(t.candidateUserId),
    index("candidate_track_selection_analysis_idx").on(t.analysisId),
  ],
);

// JobMatch
export const jobMatch = createTable(
  "job_match",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),

    jobId: d
      .integer("job_id")
      .notNull()
      .references(() => job.id, { onDelete: "cascade" }),

    candidateUserId: d
      .text("candidate_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),

    analysisId: d
      .integer("analysis_id")
      .references(() => repoAnalysis.id),

    // The repo used for this application/match. We denormalize this from repo_analysis.repo_full_name
    // so we can enforce uniqueness: (job, candidate, repoFullName).
    repoFullName: d.text("repo_full_name").notNull(),

    status: applicationStatusEnum("status").notNull().default("completed"),

    score: d.integer("score").notNull(),

    rationale: d.jsonb("rationale"),

    createdAt: d
      .timestamp({ withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),

    updatedAt: d
      .timestamp({ withTimezone: true })
      .$onUpdate(() => new Date()),
  }),
  (t) => [
    // 普通索引（查询用）
    index("job_match_job_idx").on(t.jobId),
    index("job_match_candidate_idx").on(t.candidateUserId),
    index("job_match_analysis_idx").on(t.analysisId),
    index("job_match_repo_idx").on(t.repoFullName),
    index("job_match_status_idx").on(t.status),

    // 关键规则：同一个 candidate 对同一个 job，可以用多个 repo，但同一个 repo 只能一条记录
    uniqueIndex("job_match_unique")
      .on(t.jobId, t.candidateUserId, t.repoFullName),
  ],
);

/**
 * Assignment: one coding assignment template attached to a job.
 */
export const assignment = createTable("assignment", (d) => ({
  id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
  jobId: d
    .integer("job_id")
    .notNull()
    .references(() => job.id, { onDelete: "cascade" }),
  repoTemplateUrl: d.text("repo_template_url").notNull(),
  instructions: d.text("instructions"),
  createdAt: d.timestamp({ withTimezone: true }).$defaultFn(() => new Date()).notNull(),
}));

/**
 * CandidateAssignment: one candidate's claimed assignment (progress + messages + status).
 */
export const candidateAssignment = createTable(
  "candidate_assignment",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),

    assignmentId: d
      .integer("assignment_id")
      .notNull()
      .references(() => assignment.id, { onDelete: "cascade" }),

    // denormalized for faster queries by job
    jobId: d
      .integer("job_id")
      .notNull()
      .references(() => job.id, { onDelete: "cascade" }),

    candidateUserId: d
      .text("candidate_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),

    repoUrl: d.text("repo_url"),
    submissionBranch: d.text("submission_branch").$defaultFn(() => "user-submission").notNull(),

    // candidate workflow status (claimed/submitted/reviewing/completed)
    status: d.text("status").$defaultFn(() => "claimed").notNull(),

    // HR decision status (pending/proceed/reject)
    decisionStatus: d.text("decision_status").$defaultFn(() => "pending").notNull(),

    // Minimal progress tracking (TODO tasks + chat log + timeline)
    todo: d.jsonb("todo").$type<any>(),
    messages: d.jsonb("messages").$type<any>(),
    timeline: d.jsonb("timeline").$type<any>(),

    // AI powered stats snapshot (optional)
    capabilityStats: d.jsonb("capability_stats").$type<any>(),

    createdAt: d.timestamp({ withTimezone: true }).$defaultFn(() => new Date()).notNull(),
  }),
  (t) => [
    index("candidate_assignment_candidate_idx").on(t.candidateUserId),
    index("candidate_assignment_job_idx").on(t.jobId),
    uniqueIndex("candidate_assignment_unique").on(t.assignmentId, t.candidateUserId),
  ],
);


// Relations:
// Don't need to write query anymore, we can match job/analysis etc by the relation directly


// One job can have many job_match rows.
// Each job belongs to one HR user.
export const jobRelations = relations(job, ({ many, one }) => ({
  matches: many(jobMatch),
  hr: one(user, { fields: [job.hrUserId], references: [user.id] }),
  assignments: many(assignment),
}));

// Each candidate profile belongs to one user.
export const candidateProfileRelations = relations(candidateProfile, ({ one }) => ({
  user: one(user, { fields: [candidateProfile.userId], references: [user.id] }),
}));

// Each repo analysis belongs to one candidate user.
// One repo analysis can be referenced by many jobMatch rows.
export const repoAnalysisRelations = relations(repoAnalysis, ({ one, many }) => ({
  candidate: one(user, { fields: [repoAnalysis.candidateUserId], references: [user.id] }),
  matches: many(jobMatch),
}));

export const jobMatchRelations = relations(jobMatch, ({ one }) => ({
  job: one(job, { fields: [jobMatch.jobId], references: [job.id] }),
  candidate: one(user, { fields: [jobMatch.candidateUserId], references: [user.id] }),
  analysis: one(repoAnalysis, { fields: [jobMatch.analysisId], references: [repoAnalysis.id] }),
}));

export const assignmentRelations = relations(assignment, ({ one, many }) => ({
  job: one(job, { fields: [assignment.jobId], references: [job.id] }),
  candidates: many(candidateAssignment),
}));

export const candidateAssignmentRelations = relations(candidateAssignment, ({ one }) => ({
  assignment: one(assignment, { fields: [candidateAssignment.assignmentId], references: [assignment.id] }),
  job: one(job, { fields: [candidateAssignment.jobId], references: [job.id] }),
  candidate: one(user, { fields: [candidateAssignment.candidateUserId], references: [user.id] }),
}));
