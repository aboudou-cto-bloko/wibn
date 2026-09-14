import { inngest } from "@/lib/inngest/client";
import { db } from "@/lib/db";
import { clusters } from "@/lib/db/schema";
import { nanoid } from "nanoid";
import { desc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/auth/api-middleware";

export const dynamic = "force-dynamic";

// GET - Liste tous les clusters (simple et rapide)
export const GET = withAdmin(async () => {
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
});

// POST - Trigger clustering job
export const POST = withAdmin(async () => {
  try {
    // Généré ici pour que l'UI puisse suivre ce job précis dès le
    // déclenchement (GET /api/admin/jobs?id=).
    const jobId = nanoid();

    await inngest.send({
      name: "clustering/generate",
      data: { jobId },
    });

    return NextResponse.json({ message: "Clustering job started", jobId });
  } catch (error) {
    console.error("Error starting clustering job:", error);
    return NextResponse.json(
      { error: "Failed to start clustering job" },
      { status: 500 },
    );
  }
});
