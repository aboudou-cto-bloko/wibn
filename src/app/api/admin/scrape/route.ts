import { inngest } from "@/lib/inngest/client";
import { NextResponse } from "next/server";
import { getSubredditsByCategory } from "@/lib/scrapers/reddit-scraper";
import { withAdmin } from "@/lib/auth/api-middleware";
import { scrapeBodySchema, parseJsonBody } from "@/lib/validation/admin";

export const POST = withAdmin(async (request) => {
  const parsed = await parseJsonBody(request, scrapeBodySchema);
  if ("error" in parsed) return parsed.error;
  const { subreddits, categories } = parsed.data;

  try {
    // categories a priorité sur subreddits si les deux sont fournis.
    const finalSubreddits = categories
      ? getSubredditsByCategory(categories)
      : subreddits!;

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
