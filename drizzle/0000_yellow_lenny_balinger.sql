CREATE TYPE "public"."job_status" AS ENUM('pending', 'running', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."plan" AS ENUM('free', 'pro', 'agency', 'enterprise');--> statement-breakpoint
CREATE TYPE "public"."source" AS ENUM('reddit', 'twitter', 'hn', 'fixthis');--> statement-breakpoint
CREATE TABLE "clusters" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"pain_point_count" integer DEFAULT 0,
	"avg_pain_score" real,
	"embedding" jsonb,
	"keywords" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ideas" (
	"id" text PRIMARY KEY NOT NULL,
	"cluster_id" text,
	"title" text NOT NULL,
	"tagline" text,
	"description" text,
	"target_audience" text,
	"features" jsonb,
	"pricing_model" text,
	"estimated_mrr" text,
	"competitors" jsonb,
	"moat" text,
	"generated_by" text,
	"is_public" boolean DEFAULT true,
	"view_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pain_points" (
	"id" text PRIMARY KEY NOT NULL,
	"source" "source" NOT NULL,
	"source_id" text NOT NULL,
	"title" text NOT NULL,
	"content" text,
	"url" text,
	"author" text,
	"source_score" integer,
	"pain_score" real,
	"metadata" jsonb,
	"cluster_id" text,
	"embedding" jsonb,
	"scraped_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pain_points_source_id_unique" UNIQUE("source_id")
);
--> statement-breakpoint
CREATE TABLE "scraping_jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"source" "source" NOT NULL,
	"status" "job_status" DEFAULT 'pending' NOT NULL,
	"config" jsonb,
	"pain_points_found" integer DEFAULT 0,
	"error_message" text,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_ideas" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"idea_id" text NOT NULL,
	"accessed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false,
	"name" text,
	"image" text,
	"hashed_password" text,
	"plan" "plan" DEFAULT 'free' NOT NULL,
	"is_admin" boolean DEFAULT false,
	"ideas_used_this_month" integer DEFAULT 0,
	"monthly_limit" integer DEFAULT 3,
	"quota_reset_date" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "ideas" ADD CONSTRAINT "ideas_cluster_id_clusters_id_fk" FOREIGN KEY ("cluster_id") REFERENCES "public"."clusters"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_ideas" ADD CONSTRAINT "user_ideas_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_ideas" ADD CONSTRAINT "user_ideas_idea_id_ideas_id_fk" FOREIGN KEY ("idea_id") REFERENCES "public"."ideas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "clusters_score_idx" ON "clusters" USING btree ("avg_pain_score");--> statement-breakpoint
CREATE INDEX "ideas_cluster_idx" ON "ideas" USING btree ("cluster_id");--> statement-breakpoint
CREATE INDEX "ideas_public_idx" ON "ideas" USING btree ("is_public");--> statement-breakpoint
CREATE INDEX "pain_points_source_idx" ON "pain_points" USING btree ("source");--> statement-breakpoint
CREATE INDEX "pain_points_score_idx" ON "pain_points" USING btree ("pain_score");--> statement-breakpoint
CREATE INDEX "pain_points_cluster_idx" ON "pain_points" USING btree ("cluster_id");--> statement-breakpoint
CREATE INDEX "scraping_jobs_status_idx" ON "scraping_jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "scraping_jobs_source_idx" ON "scraping_jobs" USING btree ("source");--> statement-breakpoint
CREATE INDEX "user_ideas_user_idx" ON "user_ideas" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_ideas_idea_idx" ON "user_ideas" USING btree ("idea_id");--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");