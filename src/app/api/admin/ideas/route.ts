import { inngest } from "@/lib/inngest/client";
import { db } from "@/lib/db";
import { ideas } from "@/lib/db/schema";
import { nanoid } from "nanoid";
import { asc, desc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/auth/api-middleware";
import { ideasQuerySchema, parseQuery } from "@/lib/validation/admin";

export const dynamic = "force-dynamic";

// GET - Liste toutes les idées, triable par date (?sortDir=asc|desc)
export const GET = withAdmin(async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = parseQuery(searchParams, ideasQuerySchema);
    if ("error" in parsed) return parsed.error;
    const { sortDir } = parsed.data;
    const dir = sortDir === "asc" ? asc : desc;

    const allIdeas = await db
      .select()
      .from(ideas)
      .orderBy(dir(ideas.createdAt))
      .limit(50);

    return NextResponse.json({
      total: allIdeas.length,
      ideas: allIdeas.map((i) => ({
        id: i.id,
        title: i.title,
        tagline: i.tagline,
        description: i.description,
        targetAudience: i.targetAudience,
        features: i.features,
        pricingModel: i.pricingModel,
        estimatedMRR: i.estimatedMRR,
        competitors: i.competitors,
        moat: i.moat,
        clusterId: i.clusterId,
        createdAt: i.createdAt,
      })),
    });
  } catch (error) {
    console.error("Error fetching ideas:", error);
    return NextResponse.json(
      { error: "Failed to fetch ideas" },
      { status: 500 },
    );
  }
});

// POST - Trigger idea generation job. Body { clusterId? } optionnel : cible
// un cluster précis (bouton sur /admin/clusters/[id]) au lieu du batch
// global des clusters sans idée.
export const POST = withAdmin(async (request) => {
  try {
    const body = await request.json().catch(() => ({}));
    const clusterId =
      typeof body?.clusterId === "string" ? body.clusterId : undefined;

    // Généré ici (pas dans la fonction Inngest) pour que l'UI puisse suivre
    // ce job précis dès le déclenchement (GET /api/admin/jobs?id=) — même
    // convention que /api/admin/scrape.
    const jobId = nanoid();

    await inngest.send({
      name: "ideas/generate",
      data: clusterId ? { jobId, clusterId } : { jobId },
    });

    return NextResponse.json({ message: "Idea generation job started", jobId });
  } catch (error) {
    console.error("Error starting idea generation job:", error);
    return NextResponse.json(
      { error: "Failed to start idea generation job" },
      { status: 500 },
    );
  }
});
