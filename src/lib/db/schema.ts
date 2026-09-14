import {
  pgTable,
  text,
  timestamp,
  integer,
  jsonb,
  boolean,
  pgEnum,
  real,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Enums
export const planEnum = pgEnum("plan", ["free", "pro", "agency", "enterprise", "admin"]);
export const sourceEnum = pgEnum("source", [
  "reddit",
  "twitter",
  "hn",
  "fixthis",
  "playstore",
  "news",
]);
export const jobStatusEnum = pgEnum("job_status", [
  "pending",
  "running",
  "completed",
  "failed",
]);

// Types pour metadata
export type PainPointMetadata = {
  subreddit?: string;
  postId?: string;
  commentCount?: number;
  awards?: number;
  [key: string]: unknown;
};

export type ScrapingJobConfig = {
  subreddits?: string[];
  timeframe?: string;
  limit?: number;
  // Hacker News (source "hn") : requêtes de recherche Algolia + seuil de points.
  queries?: string[];
  minPoints?: number;
  // Google Play (source "playstore") : ids de packages Android + note max
  // retenue (avis critiques uniquement).
  appIds?: string[];
  maxRating?: number;
  // Presse tech (source "news") : URLs de flux RSS.
  feeds?: string[];
  [key: string]: unknown;
};

// ============================================
// BETTER AUTH TABLES (Core Schema)
// ============================================

export const user = pgTable(
  "user",
  {
    id: text("id").primaryKey(),
    email: text("email").unique().notNull(),
    emailVerified: boolean("email_verified").default(false).notNull(),
    name: text("name").notNull(),
    image: text("image"),

    // Username plugin fields
    username: text("username").unique(),
    displayUsername: text("display_username"),

    // Custom fields
    role: planEnum("role").default("free").notNull(), // ✅ Changé de "plan" à "role"
    banned: boolean("banned").default(false),
    banReason: text("ban_reason"),
    banExpires: timestamp("ban_expires"),

    // Quotas
    ideasUsedThisMonth: integer("ideas_used_this_month").default(0),
    monthlyLimit: integer("monthly_limit").default(3),
    quotaResetDate: timestamp("quota_reset_date").defaultNow(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => {
    return {
      emailIdx: index("user_email_idx").on(table.email),
      usernameIdx: index("user_username_idx").on(table.username),
    };
  },
);

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    impersonatedBy: text("impersonated_by"), // Admin plugin
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => {
    return {
      tokenIdx: index("session_token_idx").on(table.token),
    };
  },
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => {
    return {
      userIdIdx: index("account_user_id_idx").on(table.userId),
    };
  },
);

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ============================================
// APPLICATION TABLES
// ============================================

export const painPoints = pgTable(
  "pain_points",
  {
    id: text("id").primaryKey(),
    source: sourceEnum("source").notNull(),
    sourceId: text("source_id").notNull().unique(),

    // Content
    title: text("title").notNull(),
    content: text("content"),
    url: text("url"),
    author: text("author"),

    // Scoring
    sourceScore: integer("source_score"),
    painScore: real("pain_score"),

    // Metadata
    metadata: jsonb("metadata").$type<PainPointMetadata>(),

    // Clustering
    clusterId: text("cluster_id"),
    embedding: jsonb("embedding").$type<number[]>(),

    scrapedAt: timestamp("scraped_at").defaultNow().notNull(),
  },
  (table) => {
    return {
      sourceIdx: index("pain_points_source_idx").on(table.source),
      scoreIdx: index("pain_points_score_idx").on(table.painScore),
      clusterIdx: index("pain_points_cluster_idx").on(table.clusterId),
    };
  },
);

export const clusters = pgTable(
  "clusters",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description"),

    // Stats
    painPointCount: integer("pain_point_count").default(0),
    avgPainScore: real("avg_pain_score"),

    // Embedding (centroid)
    embedding: jsonb("embedding").$type<number[]>(),

    // Keywords
    keywords: jsonb("keywords").$type<string[]>(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => {
    return {
      scoreIdx: index("clusters_score_idx").on(table.avgPainScore),
    };
  },
);

export const ideas = pgTable(
  "ideas",
  {
    id: text("id").primaryKey(),
    clusterId: text("cluster_id").references(() => clusters.id, {
      onDelete: "set null",
    }),

    // Core Info
    title: text("title").notNull(),
    tagline: text("tagline"),
    description: text("description"),

    // Business Model
    targetAudience: text("target_audience"),
    features: jsonb("features").$type<string[]>(),
    pricingModel: text("pricing_model"),
    estimatedMRR: text("estimated_mrr"),

    // Competitive Analysis
    competitors: jsonb("competitors").$type<string[]>(),
    moat: text("moat"),

    // Metadata
    generatedBy: text("generated_by"),
    isPublic: boolean("is_public").default(true),
    viewCount: integer("view_count").default(0),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => {
    return {
      clusterIdx: index("ideas_cluster_idx").on(table.clusterId),
      publicIdx: index("ideas_public_idx").on(table.isPublic),
    };
  },
);

export const userIdeas = pgTable(
  "user_ideas",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    ideaId: text("idea_id")
      .references(() => ideas.id, { onDelete: "cascade" })
      .notNull(),
    accessedAt: timestamp("accessed_at").defaultNow().notNull(),
  },
  (table) => {
    return {
      userIdx: index("user_ideas_user_idx").on(table.userId),
      ideaIdx: index("user_ideas_idea_idx").on(table.ideaId),
    };
  },
);

export const scrapingJobs = pgTable(
  "scraping_jobs",
  {
    id: text("id").primaryKey(),
    source: sourceEnum("source").notNull(),
    status: jobStatusEnum("status").default("pending").notNull(),

    // Config
    config: jsonb("config").$type<ScrapingJobConfig>(),

    // Results
    painPointsFound: integer("pain_points_found").default(0),
    errorMessage: text("error_message"),

    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => {
    return {
      statusIdx: index("scraping_jobs_status_idx").on(table.status),
      sourceIdx: index("scraping_jobs_source_idx").on(table.source),
    };
  },
);

export const scrapingCategories = pgTable(
  "scraping_categories",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    source: sourceEnum("source").default("reddit").notNull(),
    // Noms de subreddits pour source="reddit", requêtes de recherche
    // Algolia pour source="hn". Anciennement "subreddits" (colonne
    // renommée — voir drizzle/0007_*.sql).
    targets: jsonb("targets").$type<string[]>().notNull(),
    isDefault: boolean("is_default").default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => {
    return {
      nameIdx: index("scraping_categories_name_idx").on(table.name),
      sourceIdx: index("scraping_categories_source_idx").on(table.source),
    };
  },
);

export const systemSettings = pgTable("system_settings", {
  id: text("id").primaryKey().default("singleton"),

  // Feature toggles
  scrapingEnabled: boolean("scraping_enabled").default(true).notNull(),
  clusteringEnabled: boolean("clustering_enabled").default(true).notNull(),
  ideaGenerationEnabled: boolean("idea_generation_enabled")
    .default(true)
    .notNull(),

  // Scraping config
  minPainScore: integer("min_pain_score").default(40).notNull(),
  autoScrapeInterval: integer("auto_scrape_interval").default(24).notNull(),
  maxPostsPerSubreddit: integer("max_posts_per_subreddit")
    .default(50)
    .notNull(),

  // Clustering config
  minClusterSize: integer("min_cluster_size").default(2).notNull(),
  similarityThreshold: real("similarity_threshold").default(0.2).notNull(),

  // AI config
  aiTemperature: real("ai_temperature").default(0.8).notNull(),
  aiMaxTokens: integer("ai_max_tokens").default(4000).notNull(),

  // Licence — JWT de licence activé sur cette instance (source de vérité,
  // vérifié offline via src/lib/license.ts) et identifiant stable de
  // l'instance (généré au premier boot, sert de "machine_id" côté
  // license-server pour le verrou d'activation à un seul appareil).
  licenseKey: text("license_key"),
  machineId: text("machine_id"),

  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ============================================
// RELATIONS
// ============================================

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  userIdeas: many(userIdeas),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const painPointsRelations = relations(painPoints, ({ one }) => ({
  cluster: one(clusters, {
    fields: [painPoints.clusterId],
    references: [clusters.id],
  }),
}));

export const clustersRelations = relations(clusters, ({ many }) => ({
  painPoints: many(painPoints),
  ideas: many(ideas),
}));

export const ideasRelations = relations(ideas, ({ one, many }) => ({
  cluster: one(clusters, {
    fields: [ideas.clusterId],
    references: [clusters.id],
  }),
  userAccess: many(userIdeas),
}));

export const userIdeasRelations = relations(userIdeas, ({ one }) => ({
  user: one(user, {
    fields: [userIdeas.userId],
    references: [user.id],
  }),
  idea: one(ideas, {
    fields: [userIdeas.ideaId],
    references: [ideas.id],
  }),
}));
