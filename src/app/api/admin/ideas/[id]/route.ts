import { db } from "@/lib/db";
import { ideas } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/auth/api-middleware";

export const dynamic = "force-dynamic";

// GET - Détail complet d'une idée (IdeaCard tronque description/features et
// n'affiche jamais pricingModel/competitors/moat — nécessaire pour
// /admin/ideas/[id]).
export const GET = withAdmin<{ params: Promise<{ id: string }> }>(
  async (_request, _session, { params }) => {
    try {
      const { id } = await params;

      const [idea] = await db.select().from(ideas).where(eq(ideas.id, id));

      if (!idea) {
        return NextResponse.json(
          { error: "Idée introuvable" },
          { status: 404 },
        );
      }

      return NextResponse.json({ idea });
    } catch (error) {
      console.error("Error fetching idea:", error);
      return NextResponse.json(
        { error: "Failed to fetch idea" },
        { status: 500 },
      );
    }
  },
);
