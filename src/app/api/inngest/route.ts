import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { scrapeRedditFunction } from "@/lib/inngest/functions/scrape-reddit";
import { scrapeHnFunction } from "@/lib/inngest/functions/scrape-hn";
import { generateClustersFunction } from "@/lib/inngest/functions/generate-clusters";
import { generateIdeasFunction } from "@/lib/inngest/functions/generate-ideas";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    scrapeRedditFunction,
    scrapeHnFunction,
    generateClustersFunction,
    generateIdeasFunction,
  ],
});
