import { db } from "@/lib/db";
import { painPoints } from "@/lib/db/schema";
import { and, asc, count, desc, eq, gte } from "drizzle-orm";
import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/auth/api-middleware";
import { painPointsQuerySchema, parseQuery } from "@/lib/validation/admin";

export const dynamic = "force-dynamic";

export const GET = withAdmin(async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = parseQuery(searchParams, painPointsQuerySchema);
    if ("error" in parsed) return parsed.error;
    const { page, limit, minScore, source, sortBy, sortDir } = parsed.data;

    const offset = (page - 1) * limit;
    // minScore > 0 uniquement : évite un filtre sur painScore NULL non désiré.
    const conditions = [
      minScore > 0 ? gte(painPoints.painScore, minScore) : undefined,
      source ? eq(painPoints.source, source) : undefined,
    ].filter((c) => c !== undefined);
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const dir = sortDir === "asc" ? asc : desc;
    const orderBy =
      sortBy === "date"
        ? [dir(painPoints.scrapedAt)]
        : [dir(painPoints.painScore), desc(painPoints.scrapedAt)];

    // Le filtre est appliqué en SQL avant LIMIT/OFFSET (avant : filtré après
    // coup sur une seule page déjà tronquée, donc "total"/"hasMore" faux et
    // des résultats manquants dès que minScore excluait des lignes de la page).
    const [points, [{ total }]] = await Promise.all([
      db
        .select()
        .from(painPoints)
        .where(where)
        .orderBy(...orderBy)
        .limit(limit)
        .offset(offset),
      db.select({ total: count() }).from(painPoints).where(where),
    ]);

    return NextResponse.json({
      painPoints: points.map((p) => ({
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
        total,
        hasMore: offset + points.length < total,
      },
    });
  } catch (error) {
    console.error("Error fetching pain points:", error);
    return NextResponse.json(
      { error: "Failed to fetch pain points" },
      { status: 500 },
    );
  }
});
