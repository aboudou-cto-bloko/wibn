import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { scrapeRedditFunction } from "@/lib/inngest/functions/scrape-reddit";
import { scrapeHnFunction } from "@/lib/inngest/functions/scrape-hn";
import { scrapePlayStoreFunction } from "@/lib/inngest/functions/scrape-playstore";
import { scrapeNewsFunction } from "@/lib/inngest/functions/scrape-news";
import { generateClustersFunction } from "@/lib/inngest/functions/generate-clusters";
import { generateIdeasFunction } from "@/lib/inngest/functions/generate-ideas";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    scrapeRedditFunction,
    scrapeHnFunction,
    scrapePlayStoreFunction,
    scrapeNewsFunction,
    generateClustersFunction,
    generateIdeasFunction,
  ],
});
