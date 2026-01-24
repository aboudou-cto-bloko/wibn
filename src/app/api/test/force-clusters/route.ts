import { db } from "@/lib/db";
import { painPoints, clusters } from "@/lib/db/schema";
import { nanoid } from "nanoid";
import { isNull, like, or, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function POST() {
  // Définit des thèmes manuels
  const themes = [
    {
      name: "SaaS Growth / Revenue",
      keywords: [
        "saas",
        "revenue",
        "growth",
        "arr",
        "mrr",
        "customers",
        "pricing",
      ],
    },
    {
      name: "Marketing / Acquisition",
      keywords: [
        "marketing",
        "users",
        "acquisition",
        "traffic",
        "conversion",
        "seo",
      ],
    },
    {
      name: "Product / Features",
      keywords: ["product", "feature", "onboarding", "ux", "design", "ui"],
    },
    {
      name: "Business / Entrepreneurship",
      keywords: ["business", "startup", "entrepreneur", "founder", "launch"],
    },
  ];

  const createdClusters = [];

  for (const theme of themes) {
    // Trouve les pain points qui matchent ce thème
    const matchingPoints = await db
      .select()
      .from(painPoints)
      .where(
        or(
          isNull(painPoints.clusterId),
          ...theme.keywords.map((kw) =>
            or(
              like(painPoints.title, `%${kw}%`),
              like(painPoints.content, `%${kw}%`),
            ),
          ),
        ),
      )
      .limit(20);

    if (matchingPoints.length >= 3) {
      const clusterId = nanoid();

      // Crée le cluster
      await db.insert(clusters).values({
        id: clusterId,
        name: theme.name,
        description: `Cluster autour de: ${theme.keywords.join(", ")}`,
        painPointCount: matchingPoints.length,
        avgPainScore:
          matchingPoints.reduce((sum, p) => sum + (p.painScore || 0), 0) /
          matchingPoints.length,
        keywords: theme.keywords,
      });

      // Assigne les pain points
      for (const point of matchingPoints) {
        await db
          .update(painPoints)
          .set({ clusterId })
          .where(eq(painPoints.id, point.id));
      }

      createdClusters.push({
        name: theme.name,
        points: matchingPoints.length,
      });
    }
  }

  return NextResponse.json({
    success: true,
    clusters: createdClusters,
  });
}
