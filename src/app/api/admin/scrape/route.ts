import { inngest } from "@/lib/inngest/client";
import { NextResponse } from "next/server";
import { getSubredditsByCategory } from "@/lib/scrapers/reddit-scraper";

export async function POST(request: Request) {
  const body = await request.json();
  const { subreddits, categories } = body;

  let finalSubreddits: string[] = [];

  if (categories && Array.isArray(categories)) {
    finalSubreddits = getSubredditsByCategory(categories);
  } else if (subreddits && Array.isArray(subreddits)) {
    finalSubreddits = subreddits;
  } else {
    return NextResponse.json(
      { error: "subreddits array or categories array required" },
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
}
