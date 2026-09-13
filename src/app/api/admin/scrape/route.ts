import { inngest } from "@/lib/inngest/client";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { scrapingCategories } from "@/lib/db/schema";
import { inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import { withAdmin } from "@/lib/auth/api-middleware";
import { scrapeBodySchema, parseJsonBody } from "@/lib/validation/admin";

export const POST = withAdmin(async (request) => {
  const parsed = await parseJsonBody(request, scrapeBodySchema);
  if ("error" in parsed) return parsed.error;
  const { subreddits, queries, categories } = parsed.data;

  try {
    // categories a priorité sur subreddits/queries directs si fournis.
    // categories = ids de scrapingCategories (voir /admin/scraping) — la
    // source est déduite de la colonne `source` des catégories elles-mêmes,
    // pas déclarée séparément par le client.
    let source: "reddit" | "hn";
    let finalTargets: string[];

    if (categories) {
      const rows = await db
        .select({
          source: scrapingCategories.source,
          targets: scrapingCategories.targets,
        })
        .from(scrapingCategories)
        .where(inArray(scrapingCategories.id, categories));

      if (rows.length === 0) {
        return NextResponse.json(
          { error: "Aucune catégorie valide trouvée pour ces ids" },
          { status: 400 },
        );
      }

      const sources = new Set(rows.map((r) => r.source));
      if (sources.size > 1) {
        return NextResponse.json(
          {
            error:
              "Les catégories sélectionnées mélangent plusieurs sources — sélectionne uniquement des catégories d'une même source",
          },
          { status: 400 },
        );
      }

      source = rows[0].source as "reddit" | "hn";
      finalTargets = [...new Set(rows.flatMap((r) => r.targets))];
    } else if (subreddits) {
      source = "reddit";
      finalTargets = subreddits;
    } else {
      source = "hn";
      finalTargets = queries!;
    }

    if (finalTargets.length === 0) {
      return NextResponse.json(
        { error: "Aucune cible à scraper" },
        { status: 400 },
      );
    }

    // Généré ici (pas dans la fonction Inngest) pour que l'UI puisse suivre
    // ce job précis dès le déclenchement (GET /api/admin/jobs?id=).
    const jobId = nanoid();

    if (source === "reddit") {
      await inngest.send({
        name: "scraping/reddit.trigger",
        data: { jobId, subreddits: finalTargets, timeframe: "week" },
      });
    } else {
      await inngest.send({
        name: "scraping/hn.trigger",
        data: { jobId, queries: finalTargets, minPoints: 20 },
      });
    }

    return NextResponse.json({
      message: "Scraping job started",
      source,
      targets: finalTargets,
      jobId,
    });
  } catch (error) {
    console.error("Error starting scraping job:", error);
    return NextResponse.json(
      { error: "Failed to start scraping job" },
      { status: 500 },
    );
  }
});
