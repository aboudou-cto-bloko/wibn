import { db } from "@/lib/db";
import { painPoints } from "@/lib/db/schema";
import { clusterPainPoints } from "@/lib/clustering/simple-clustering";
import { isNull } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Récupère les pain points non clusterisés
    const unclusteredPoints = await db
      .select()
      .from(painPoints)
      .where(isNull(painPoints.clusterId))
      .limit(100); // Limite pour le test

    console.log(`Found ${unclusteredPoints.length} unclustered pain points`);

    if (unclusteredPoints.length === 0) {
      return NextResponse.json({
        error: "No unclustered pain points found",
        totalPainPoints: await db
          .select()
          .from(painPoints)
          .then((r) => r.length),
      });
    }

    // Convertir en format attendu
    const scoredPoints = unclusteredPoints.map((p) => ({
      sourceId: p.sourceId,
      title: p.title,
      content: p.content || "",
      url: p.url || "",
      author: p.author || "",
      score: p.sourceScore || 0,
      painScore: p.painScore || 0,
      metadata: p.metadata as Record<string, unknown>,
      scrapedAt: p.scrapedAt,
    }));

    console.log("Starting clustering...");

    // Tente le clustering
    const clusters = clusterPainPoints(scoredPoints, 3);

    console.log(`Generated ${clusters.length} clusters`);

    return NextResponse.json({
      success: true,
      totalPoints: scoredPoints.length,
      clustersGenerated: clusters.length,
      clusters: clusters.map((c) => ({
        name: c.name,
        pointCount: c.painPoints.length,
        avgScore: c.avgPainScore,
        keywords: c.keywords,
        topTitles: c.painPoints.slice(0, 3).map((p) => p.title),
      })),
    });
  } catch (error) {
    console.error("Clustering test error:", error);
    return NextResponse.json(
      {
        error: String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    );
  }
}
