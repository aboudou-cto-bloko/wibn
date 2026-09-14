import { eq } from "drizzle-orm";
import { inngest } from "@/lib/inngest/client";
import { db } from "@/lib/db";
import { painPoints, scrapingJobs } from "@/lib/db/schema";
import { scrapeHackerNews } from "@/lib/scrapers/hn-scraper";
import {
  scorePainPoint,
  filterByMinScore,
  analyzePainPointSources,
  groupByRecurringAuthors,
} from "@/lib/scoring/pain-scorer";
import { getSettings } from "@/lib/settings";
import { nanoid } from "nanoid";

export const scrapeHnFunction = inngest.createFunction(
  {
    id: "scrape-hn",
    name: "Scrape Hacker News for Pain Points",
  },
  { event: "scraping/hn.trigger" },
  async ({ event, step }) => {
    const settings = await step.run("check-settings", async () => {
      return await getSettings();
    });

    if (!settings.scrapingEnabled) {
      return {
        message: "Scraping is disabled in settings",
        painPointsFound: 0,
      };
    }

    const { queries, minPoints = 20 } = event.data;
    // Le jobId est fourni par l'appelant (src/app/api/admin/scrape/route.ts)
    // pour permettre à l'UI de suivre ce job précis dès le déclenchement,
    // au lieu d'en générer un nouveau ici (voir scrape-reddit.ts, même
    // convention).
    const jobId: string = event.data.jobId || nanoid();

    // Étape 1 : Créer le job
    await step.run("create-job", async () => {
      await db.insert(scrapingJobs).values({
        id: jobId,
        source: "hn",
        status: "running",
        config: { queries, minPoints },
        startedAt: new Date(),
      });
    });

    // Étape 2 : Scraper Hacker News avec maxPostsPerSubreddit des settings
    // comme limite par requête (même réglage que Reddit, réutilisé tel
    // quel plutôt que d'ajouter un champ settings dédié).
    const rawPainPoints = await step.run("scrape-posts", async () => {
      return await scrapeHackerNews({
        queries,
        limit: settings.maxPostsPerSubreddit,
        minPoints,
      });
    });

    // Étape 3 : Scorer les pain points
    const scoredPainPoints = await step.run("score-pain-points", async () => {
      return rawPainPoints.map((p) => {
        const scored = scorePainPoint(p, "hn");
        return {
          ...scored,
          scrapedAt:
            typeof scored.scrapedAt === "string"
              ? new Date(scored.scrapedAt)
              : scored.scrapedAt,
        };
      });
    });

    // Étape 4 : Filtrer avec minPainScore
    const filtered = filterByMinScore(scoredPainPoints, settings.minPainScore);

    // Étape 5 : Analyser les sources
    const analytics = await step.run("analyze-sources", async () => {
      return {
        topSources: analyzePainPointSources(filtered).slice(0, 10),
        recurringAuthors: groupByRecurringAuthors(filtered, 2).slice(0, 5),
        totalFiltered: filtered.length,
        avgScore:
          filtered.length > 0
            ? filtered.reduce((sum, p) => sum + p.painScore, 0) /
              filtered.length
            : 0,
      };
    });

    // Étape 6 : Sauvegarder en DB
    const savedCount = await step.run("save-to-db", async () => {
      for (const point of filtered) {
        try {
          await db
            .insert(painPoints)
            .values({
              id: nanoid(),
              source: "hn",
              sourceId: point.sourceId,
              title: point.title,
              content: point.content,
              url: point.url,
              author: point.author,
              sourceScore: point.score,
              painScore: point.painScore,
              metadata: point.metadata,
              scrapedAt: new Date(point.scrapedAt),
            })
            .onConflictDoNothing();
        } catch (error) {
          console.error("Error saving pain point:", error);
        }
      }

      return filtered.length;
    });

    // Étape 7 : Mettre à jour le job avec analytics
    await step.run("complete-job", async () => {
      await db
        .update(scrapingJobs)
        .set({
          status: "completed",
          painPointsFound: savedCount,
          completedAt: new Date(),
          config: {
            queries,
            minPoints,
            settingsUsed: {
              maxPostsPerSubreddit: settings.maxPostsPerSubreddit,
              minPainScore: settings.minPainScore,
            },
            analytics: {
              avgScore: Math.round(analytics.avgScore * 10) / 10,
              topAuthorsCount: analytics.recurringAuthors.length,
              topSourcesCount: analytics.topSources.length,
            },
          },
        })
        .where(eq(scrapingJobs.id, jobId));
    });

    return {
      jobId,
      painPointsFound: savedCount,
      queries,
      settingsUsed: {
        maxPostsPerSubreddit: settings.maxPostsPerSubreddit,
        minPainScore: settings.minPainScore,
      },
      analytics,
    };
  },
);
