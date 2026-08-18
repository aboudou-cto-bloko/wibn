import { inngest } from "@/lib/inngest/client";
import { db } from "@/lib/db";
import { ideas } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/auth/api-middleware";

export const dynamic = "force-dynamic";

// GET - Liste toutes les idées
export const GET = withAdmin(async () => {
  const allIdeas = await db
    .select()
    .from(ideas)
    .orderBy(desc(ideas.createdAt))
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
});

// POST - Trigger idea generation job
export const POST = withAdmin(async () => {
  await inngest.send({
    name: "ideas/generate",
    data: {},
  });

  return NextResponse.json({ message: "Idea generation job started" });
});
