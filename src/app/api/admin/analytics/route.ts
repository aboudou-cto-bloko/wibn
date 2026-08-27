import { db } from "@/lib/db";
import { painPoints } from "@/lib/db/schema";
import {
  analyzePainPointSources,
  groupByRecurringAuthors,
  filterByMinScore,
} from "@/lib/scoring/pain-scorer";
import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { withAdmin } from "@/lib/auth/api-middleware";

export const dynamic = "force-dynamic";

export const GET = withAdmin(async () => {
  try {
    // Récupère les 500 derniers pain points
    const allPainPoints = await db
      .select()
      .from(painPoints)
      .orderBy(desc(painPoints.scrapedAt))
      .limit(500);

    const scoredPoints = allPainPoints.map((p) => ({
      sourceId: p.sourceId,
      title: p.title,
      content: p.content ?? "",
      url: p.url ?? "",
      author: p.author ?? "unknown",
      score: p.sourceScore ?? 0,
      painScore: p.painScore ?? 0,
      metadata: p.metadata as Record<string, unknown>,
      scrapedAt: p.scrapedAt,
    }));

    const filtered = filterByMinScore(scoredPoints, 40);

    const avgScore =
      filtered.length === 0
        ? 0
        : filtered.reduce((sum, p) => sum + p.painScore, 0) / filtered.length;

    return NextResponse.json({
      total: allPainPoints.length,
      filtered: filtered.length,
      avgScore,
      topSources: analyzePainPointSources(filtered).slice(0, 20),
      recurringAuthors: groupByRecurringAuthors(filtered, 2).slice(0, 10),
      scoreDistribution: {
        excellent: filtered.filter((p) => p.painScore >= 80).length,
        good: filtered.filter((p) => p.painScore >= 60 && p.painScore < 80)
          .length,
        medium: filtered.filter((p) => p.painScore >= 40 && p.painScore < 60)
          .length,
      },
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 },
    );
  }
});
