import { inngest } from "@/lib/inngest/client";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { scrapingCategories } from "@/lib/db/schema";
import { inArray } from "drizzle-orm";
import { withAdmin } from "@/lib/auth/api-middleware";
import { scrapeBodySchema, parseJsonBody } from "@/lib/validation/admin";

export const POST = withAdmin(async (request) => {
  const parsed = await parseJsonBody(request, scrapeBodySchema);
  if ("error" in parsed) return parsed.error;
  const { subreddits, categories } = parsed.data;

  try {
    // categories a priorité sur subreddits si les deux sont fournis.
    // categories = ids de scrapingCategories (voir /admin/scraping), pas
    // les clés statiques de RECOMMENDED_SUBREDDITS.
    let finalSubreddits = subreddits!;
    if (categories) {
      const rows = await db
        .select({ subreddits: scrapingCategories.subreddits })
        .from(scrapingCategories)
        .where(inArray(scrapingCategories.id, categories));

      finalSubreddits = [...new Set(rows.flatMap((r) => r.subreddits))];

      if (finalSubreddits.length === 0) {
        return NextResponse.json(
          { error: "Aucune catégorie valide trouvée pour ces ids" },
          { status: 400 },
        );
      }
    }

    await inngest.send({
      name: "scraping/reddit.trigger",
      data: {
        subreddits: finalSubreddits,
        timeframe: "week",
      },
    });

    return NextResponse.json({
      message: "Scraping job started",
      subreddits: finalSubreddits,
    });
  } catch (error) {
    console.error("Error starting scraping job:", error);
    return NextResponse.json(
      { error: "Failed to start scraping job" },
      { status: 500 },
    );
  }
});
