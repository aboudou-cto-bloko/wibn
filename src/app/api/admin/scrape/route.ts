import { inngest } from "@/lib/inngest/client";
import { NextResponse } from "next/server";
import {
  getSubredditsByCategory,
  RECOMMENDED_SUBREDDITS,
} from "@/lib/scrapers/reddit-scraper";
import { withAdmin } from "@/lib/auth/api-middleware";

export const POST = withAdmin(async (request) => {
  const body = await request.json();
  const { subreddits, categories } = body;

  let finalSubreddits: string[] = [];

  if (Array.isArray(categories) && categories.length > 0) {
    const validCategories = categories.filter(
      (c) => typeof c === "string" && c in RECOMMENDED_SUBREDDITS,
    );
    if (validCategories.length === 0) {
      return NextResponse.json(
        { error: "No valid category in categories array" },
        { status: 400 },
      );
    }
    finalSubreddits = getSubredditsByCategory(validCategories);
  } else if (
    Array.isArray(subreddits) &&
    subreddits.every((s) => typeof s === "string" && s.trim())
  ) {
    finalSubreddits = subreddits;
  } else {
    return NextResponse.json(
      { error: "subreddits (string[]) or categories (string[]) required" },
      { status: 400 },
    );
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
});
