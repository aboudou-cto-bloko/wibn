import { eq } from "drizzle-orm";
import { inngest } from "@/lib/inngest/client";
import { db } from "@/lib/db";
import { painPoints, scrapingJobs } from "@/lib/db/schema";
import { scrapeNews } from "@/lib/scrapers/news-scraper";
import {
  scorePainPoint,
  filterByMinScore,
  analyzePainPointSources,
  groupByRecurringAuthors,
} from "@/lib/scoring/pain-scorer";
import { getSettings } from "@/lib/settings";
import { nanoid } from "nanoid";

export const scrapeNewsFunction = inngest.createFunction(
  {
    id: "scrape-news",
    name: "Scrape Tech News RSS for Market Signals",
  },
  { event: "scraping/news.trigger" },
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

    const { feeds } = event.data;
    const jobId: string = event.data.jobId || nanoid();

    await step.run("create-job", async () => {
      await db.insert(scrapingJobs).values({
        id: jobId,
        source: "news",
        status: "running",
        config: { feeds },
        startedAt: new Date(),
      });
    });

    const rawPainPoints = await step.run("scrape-articles", async () => {
      return await scrapeNews({
        feeds,
        limit: settings.maxPostsPerSubreddit,
      });
    });

    const scoredPainPoints = await step.run("score-pain-points", async () => {
      return rawPainPoints.map((p) => {
        const scored = scorePainPoint(p);
        return {
          ...scored,
          scrapedAt:
            typeof scored.scrapedAt === "string"
              ? new Date(scored.scrapedAt)
              : scored.scrapedAt,
        };
      });
    });

    const filtered = filterByMinScore(scoredPainPoints, settings.minPainScore);

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

    const savedCount = await step.run("save-to-db", async () => {
      for (const point of filtered) {
        try {
          await db
            .insert(painPoints)
            .values({
              id: nanoid(),
              source: "news",
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

    await step.run("complete-job", async () => {
      await db
        .update(scrapingJobs)
        .set({
          status: "completed",
          painPointsFound: savedCount,
          completedAt: new Date(),
          config: {
            feeds,
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
      feeds,
      settingsUsed: {
        maxPostsPerSubreddit: settings.maxPostsPerSubreddit,
        minPainScore: settings.minPainScore,
      },
      analytics,
    };
  },
);
