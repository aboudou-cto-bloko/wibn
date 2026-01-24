import { db } from "@/lib/db";
import { painPoints } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { NextResponse } from "next/server";

export const revalidate = 60;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const minScore = parseInt(searchParams.get("minScore") || "0");

    const offset = (page - 1) * limit;

    // Query avec pagination et filtre
    const query = db
      .select()
      .from(painPoints)
      .orderBy(desc(painPoints.painScore), desc(painPoints.scrapedAt))
      .limit(limit)
      .offset(offset);

    const allPoints = await query;

    // Filtre par score si demandé
    const filtered =
      minScore > 0
        ? allPoints.filter((p) => (p.painScore || 0) >= minScore)
        : allPoints;

    // Compte total (approximatif pour la perf)
    const [totalCount] = await db
      .select({ count: painPoints.id })
      .from(painPoints);

    return NextResponse.json({
      painPoints: filtered.map((p) => ({
        id: p.id,
        source: p.source,
        title: p.title,
        content: p.content,
        url: p.url,
        author: p.author,
        painScore: p.painScore,
        sourceScore: p.sourceScore,
        clusterId: p.clusterId,
        scrapedAt: p.scrapedAt,
        metadata: p.metadata,
      })),
      pagination: {
        page,
        limit,
        total: filtered.length,
        hasMore: filtered.length === limit,
      },
    });
  } catch (error) {
    console.error("Error fetching pain points:", error);
    return NextResponse.json(
      { error: "Failed to fetch pain points" },
      { status: 500 },
    );
  }
}
