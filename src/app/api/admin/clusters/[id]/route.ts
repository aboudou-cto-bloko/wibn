import { db } from "@/lib/db";
import { clusters, ideas, painPoints } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/auth/api-middleware";

export const dynamic = "force-dynamic";

// GET - Détail d'un cluster : ses pain points + l'idée déjà générée (s'il y
// en a une) — nécessaire pour la page /admin/clusters/[id], jusqu'ici
// inexistante malgré la relation painPoints.clusterId / ideas.clusterId.
export const GET = withAdmin<{ params: Promise<{ id: string }> }>(
  async (_request, _session, { params }) => {
    try {
      const { id } = await params;

      const [cluster] = await db
        .select()
        .from(clusters)
        .where(eq(clusters.id, id));

      if (!cluster) {
        return NextResponse.json(
          { error: "Cluster introuvable" },
          { status: 404 },
        );
      }

      const [clusterPainPoints, [existingIdea]] = await Promise.all([
        db
          .select()
          .from(painPoints)
          .where(eq(painPoints.clusterId, id))
          .orderBy(desc(painPoints.painScore)),
        db.select().from(ideas).where(eq(ideas.clusterId, id)).limit(1),
      ]);

      return NextResponse.json({
        cluster,
        painPoints: clusterPainPoints,
        idea: existingIdea || null,
      });
    } catch (error) {
      console.error("Error fetching cluster:", error);
      return NextResponse.json(
        { error: "Failed to fetch cluster" },
        { status: 500 },
      );
    }
  },
);
