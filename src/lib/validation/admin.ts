import { z } from "zod";
import { NextResponse } from "next/server";
import { RECOMMENDED_SUBREDDITS } from "@/lib/scrapers/reddit-scraper";

/**
 * Parse et valide le body JSON d'une requête contre un schéma Zod.
 * Retourne { data } en cas de succès, ou une NextResponse 400 prête à
 * renvoyer telle quelle en cas d'échec (body illisible ou invalide).
 */
export async function parseJsonBody<T extends z.ZodTypeAny>(
  request: Request,
  schema: T,
): Promise<{ data: z.infer<T> } | { error: NextResponse }> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { error: NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }) };
  }

  const result = schema.safeParse(body);
  if (!result.success) {
    return {
      error: NextResponse.json(
        { error: "Validation failed", details: result.error.flatten() },
        { status: 400 },
      ),
    };
  }

  return { data: result.data };
}

/** Même chose pour des searchParams (déjà des strings, pas de JSON à parser). */
export function parseQuery<T extends z.ZodTypeAny>(
  searchParams: URLSearchParams,
  schema: T,
): { data: z.infer<T> } | { error: NextResponse } {
  const result = schema.safeParse(Object.fromEntries(searchParams));
  if (!result.success) {
    return {
      error: NextResponse.json(
        { error: "Validation failed", details: result.error.flatten() },
        { status: 400 },
      ),
    };
  }
  return { data: result.data };
}

// Schémas Zod pour les frontières système des routes /api/admin/*.
// Convention projet : jamais de body/query non validé au-delà de cette limite.

const nonEmptyString = z.string().trim().min(1);
const subredditList = z.array(nonEmptyString).min(1);

export const categoryCreateSchema = z.object({
  name: nonEmptyString,
  subreddits: subredditList,
});

export const categoryUpdateSchema = z.object({
  id: nonEmptyString,
  name: nonEmptyString.optional(),
  subreddits: subredditList.optional(),
});

export const categoryDeleteQuerySchema = z.object({
  id: nonEmptyString,
});

// Bornes alignées sur ce que l'UI /admin/settings expose déjà (README).
export const settingsPatchSchema = z
  .object({
    scrapingEnabled: z.boolean(),
    clusteringEnabled: z.boolean(),
    ideaGenerationEnabled: z.boolean(),
    minPainScore: z.number().int().min(0).max(100),
    autoScrapeInterval: z.number().int().min(1),
    maxPostsPerSubreddit: z.number().int().min(1).max(500),
    minClusterSize: z.number().int().min(1),
    similarityThreshold: z.number().min(0).max(1),
    aiTemperature: z.number().min(0).max(2),
    aiMaxTokens: z.number().int().min(1).max(32000),
  })
  .partial();

type CategoryKey = keyof typeof RECOMMENDED_SUBREDDITS;
const knownCategory = z.enum(
  Object.keys(RECOMMENDED_SUBREDDITS) as [CategoryKey, ...CategoryKey[]],
);

export const scrapeBodySchema = z
  .object({
    subreddits: subredditList.optional(),
    categories: z.array(knownCategory).min(1).optional(),
  })
  .refine((data) => data.subreddits || data.categories, {
    message: "subreddits ou categories requis",
  });

export const painPointsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  minScore: z.coerce.number().int().min(0).max(100).default(0),
});
