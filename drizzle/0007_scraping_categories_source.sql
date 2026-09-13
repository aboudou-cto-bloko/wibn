ALTER TABLE "scraping_categories" RENAME COLUMN "subreddits" TO "targets";--> statement-breakpoint
ALTER TABLE "scraping_categories" ADD COLUMN "source" "source" NOT NULL DEFAULT 'reddit';--> statement-breakpoint
CREATE INDEX "scraping_categories_source_idx" ON "scraping_categories" USING btree ("source");
