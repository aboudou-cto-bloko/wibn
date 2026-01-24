import { inngest } from "@/lib/inngest/client";
import { db } from "@/lib/db";
import { clusters } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { NextResponse } from "next/server";

// GET - Liste tous les clusters (simple et rapide)
export async function GET() {
  try {
    const allClusters = await db
      .select()
      .from(clusters)
      .orderBy(desc(clusters.avgPainScore));

    return NextResponse.json({
      total: allClusters.length,
      clusters: allClusters.map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        painPointCount: c.painPointCount,
        avgPainScore: c.avgPainScore,
        keywords: c.keywords,
        createdAt: c.createdAt,
      })),
    });
  } catch (error) {
    console.error("Error fetching clusters:", error);
    return NextResponse.json(
      { error: "Failed to fetch clusters" },
      { status: 500 },
    );
  }
}

// POST - Trigger clustering job
export async function POST() {
  await inngest.send({
    name: "clustering/generate",
    data: {},
  });

  return NextResponse.json({ message: "Clustering job started" });
}
