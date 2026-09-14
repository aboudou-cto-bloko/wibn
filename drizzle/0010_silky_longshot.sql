ALTER TABLE "pain_points" ADD COLUMN "job_id" text;--> statement-breakpoint
CREATE INDEX "pain_points_job_idx" ON "pain_points" USING btree ("job_id");