import { eq } from "drizzle-orm";
import { inngest } from "@/lib/inngest/client";
import { db } from "@/lib/db";
import { painPoints, scrapingJobs } from "@/lib/db/schema";
import { scrapeReddit } from "@/lib/scrapers/reddit-scraper";
import {
  scorePainPoint,
  filterByMinScore,
  analyzePainPointSources,
  groupByRecurringAuthors,
} from "@/lib/scoring/pain-scorer";
import { getSettings } from "@/lib/settings";
import { nanoid } from "nanoid";

export const scrapeRedditFunction = inngest.createFunction(
  {
    id: "scrape-reddit",
    name: "Scrape Reddit for Pain Points",
  },
  { event: "scraping/reddit.trigger" },
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

    const { subreddits, timeframe = "week" } = event.data;
    // Le jobId est fourni par l'appelant (src/app/api/admin/scrape/route.ts)
    // pour permettre à l'UI de suivre ce job précis dès le déclenchement
    // (polling GET /api/admin/jobs?id=), au lieu d'en générer un nouveau ici.
    const jobId: string = event.data.jobId || nanoid();

    // Étape 1 : Créer le job
    await step.run("create-job", async () => {
      await db.insert(scrapingJobs).values({
        id: jobId,
        source: "reddit",
        status: "running",
        config: { subreddits, timeframe },
        startedAt: new Date(),
      });
    });

    // Étape 2 : Scraper Reddit avec maxPostsPerSubreddit des settings
    const rawPainPoints = await step.run("scrape-posts", async () => {
      return await scrapeReddit({
        subreddits,
        timeframe,
        limit: settings.maxPostsPerSubreddit,
        minScore: 20,
      });
    });

    // Étape 3 : Scorer les pain points
    const scoredPainPoints = await step.run("score-pain-points", async () => {
      return rawPainPoints.map((p) => {
        const scored = scorePainPoint(p, "reddit");
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
              source: "reddit",
              jobId,
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
            subreddits,
            timeframe,
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
      subreddits,
      settingsUsed: {
        maxPostsPerSubreddit: settings.maxPostsPerSubreddit,
        minPainScore: settings.minPainScore,
      },
      analytics,
    };
  },
);
