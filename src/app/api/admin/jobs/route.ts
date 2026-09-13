import { db } from "@/lib/db";
import { scrapingJobs } from "@/lib/db/schema";
import { count, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/auth/api-middleware";
import { jobsQuerySchema, parseQuery } from "@/lib/validation/admin";

export const dynamic = "force-dynamic";

// GET - Historique des jobs de scraping (jamais exposé jusqu'ici : la table
// scraping_jobs est peuplée par scrape-reddit.ts/scrape-hn.ts mais aucune
// route ne la lisait). Supporte :
// - ?id=<jobId> : lookup d'un seul job (utilisé par le polling de
//   /admin/scraping juste après avoir déclenché un scraping)
// - ?source=reddit|hn + pagination : historique récent, plus récent d'abord
export const GET = withAdmin(async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = parseQuery(searchParams, jobsQuerySchema);
    if ("error" in parsed) return parsed.error;
    const { id, page, limit, source } = parsed.data;

    if (id) {
      const [job] = await db
        .select()
        .from(scrapingJobs)
        .where(eq(scrapingJobs.id, id));

      if (!job) {
        return NextResponse.json({ error: "Job introuvable" }, { status: 404 });
      }

      return NextResponse.json({ job });
    }

    const offset = (page - 1) * limit;
    const where = source ? eq(scrapingJobs.source, source) : undefined;

    const [jobs, [{ total }]] = await Promise.all([
      db
        .select()
        .from(scrapingJobs)
        .where(where)
        .orderBy(desc(scrapingJobs.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ total: count() }).from(scrapingJobs).where(where),
    ]);

    return NextResponse.json({
      jobs,
      pagination: { page, limit, total },
    });
  } catch (error) {
    console.error("Error fetching jobs:", error);
    return NextResponse.json(
      { error: "Failed to fetch jobs" },
      { status: 500 },
    );
  }
});
