CREATE TABLE "scraping_categories" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"subreddits" jsonb NOT NULL,
	"is_default" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "scraping_categories_name_idx" ON "scraping_categories" USING btree ("name");