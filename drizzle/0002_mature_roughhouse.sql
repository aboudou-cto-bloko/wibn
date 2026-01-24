CREATE TABLE "system_settings" (
	"id" text PRIMARY KEY DEFAULT 'singleton' NOT NULL,
	"scraping_enabled" boolean DEFAULT true NOT NULL,
	"clustering_enabled" boolean DEFAULT true NOT NULL,
	"idea_generation_enabled" boolean DEFAULT true NOT NULL,
	"min_pain_score" integer DEFAULT 40 NOT NULL,
	"auto_scrape_interval" integer DEFAULT 24 NOT NULL,
	"max_posts_per_subreddit" integer DEFAULT 50 NOT NULL,
	"min_cluster_size" integer DEFAULT 2 NOT NULL,
	"similarity_threshold" real DEFAULT 0.2 NOT NULL,
	"ai_temperature" real DEFAULT 0.8 NOT NULL,
	"ai_max_tokens" integer DEFAULT 4000 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
