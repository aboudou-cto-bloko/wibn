import { RawPainPoint } from "@/types/scraper";

export interface RedditScraperConfig {
  subreddits: string[];
  timeframe: "hour" | "day" | "week" | "month" | "year" | "all";
  limit?: number;
  minScore?: number;
}

interface RedditPost {
  data: {
    id: string;
    title: string;
    selftext: string;
    url: string;
    author: string;
    score: number;
    num_comments: number;
    created_utc: number;
    subreddit: string;
    permalink: string;
    upvote_ratio?: number;
    link_flair_text?: string;
  };
}

/**
 * Scrape Reddit avec old.reddit.com (plus stable et rapide)
 */
export async function scrapeReddit(
  config: RedditScraperConfig,
): Promise<RawPainPoint[]> {
  const { subreddits, timeframe, limit = 50, minScore = 10 } = config;
  const allPainPoints: RawPainPoint[] = [];

  for (const subreddit of subreddits) {
    try {
      // Utilise old.reddit.com pour le JSON
      const url = `https://old.reddit.com/r/${subreddit}/top.json?t=${timeframe}&limit=${limit}`;

      const response = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "application/json",
          "Accept-Language": "en-US,en;q=0.9",
          "Accept-Encoding": "gzip, deflate, br",
          Connection: "keep-alive",
          "Cache-Control": "no-cache",
        },
      });

      if (!response.ok) {
        console.error(`Failed to fetch r/${subreddit}: ${response.status}`);

        // Rate limit handling
        if (response.status === 429) {
          console.log("Rate limited, waiting 60s...");
          await new Promise((resolve) => setTimeout(resolve, 60000));
          continue;
        }
        continue;
      }

      const data = await response.json();
      const posts: RedditPost[] = data.data?.children || [];

      console.log(`r/${subreddit}: Found ${posts.length} posts`);

      for (const post of posts) {
        // Filtres de qualité
        if (post.data.score < minScore) continue;
        if (!post.data.selftext || post.data.selftext.length < 50) continue;
        if (
          post.data.selftext === "[removed]" ||
          post.data.selftext === "[deleted]"
        )
          continue;

        // Ignore les posts automatiques
        if (post.data.author === "AutoModerator") continue;

        allPainPoints.push({
          sourceId: `reddit_${post.data.id}`,
          title: post.data.title,
          content: post.data.selftext,
          url: `https://reddit.com${post.data.permalink}`,
          author: post.data.author,
          score: post.data.score,
          metadata: {
            subreddit: post.data.subreddit,
            numComments: post.data.num_comments,
            createdUtc: post.data.created_utc,
            upvoteRatio: post.data.upvote_ratio,
            flair: post.data.link_flair_text,
          },
          scrapedAt: new Date(),
        });
      }

      // Rate limiting progressif
      const delay = posts.length > 0 ? 2000 : 1000;
      await new Promise((resolve) => setTimeout(resolve, delay));
    } catch (error) {
      console.error(`Error scraping r/${subreddit}:`, error);
    }
  }

  console.log(`Total pain points collected: ${allPainPoints.length}`);
  return allPainPoints;
}

/**
 * Subreddits recommandés par catégorie
 */
export const RECOMMENDED_SUBREDDITS = {
  // SaaS & Entrepreneuriat
  business: [
    "Entrepreneur",
    "startups",
    "SaaS",
    "smallbusiness",
    "EntrepreneurRideAlong",
    "sweatystartup",
  ],

  // Tech & Dev
  tech: [
    "programming",
    "webdev",
    "Frontend",
    "reactjs",
    "nextjs",
    "learnprogramming",
  ],

  // Productivité
  productivity: [
    "productivity",
    "getdisciplined",
    "selfimprovement",
    "ADHD",
    "organization",
  ],

  // Marketing
  marketing: [
    "marketing",
    "SEO",
    "socialmedia",
    "content_marketing",
    "growmybusiness",
  ],

  // Finance
  finance: [
    "personalfinance",
    "financialindependence",
    "investing",
    "Accounting",
  ],

  // E-commerce
  ecommerce: ["ecommerce", "shopify", "dropship", "AmazonSeller"],

  // Freelancing
  freelance: ["freelance", "Upwork", "digitalnomad", "WorkOnline"],
} as const;

/**
 * Helper pour obtenir tous les subreddits d'une catégorie
 */
export function getSubredditsByCategory(
  categories: (keyof typeof RECOMMENDED_SUBREDDITS)[],
): string[] {
  return categories.flatMap((cat) => RECOMMENDED_SUBREDDITS[cat]);
}
