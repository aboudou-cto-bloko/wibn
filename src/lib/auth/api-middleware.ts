import { NextRequest, NextResponse } from "next/server";
import { auth } from "./auth";

type Session = Awaited<ReturnType<typeof auth.api.getSession>>;

// Ctx = le 2e argument que Next.js passe à un route handler dynamique
// (ex: { params: Promise<{ id: string }> } sur /api/.../[id]/route.ts,
// params est une Promise depuis Next 15+). Les routes sans segment
// dynamique n'ont pas besoin de ce paramètre — TypeScript l'infère à
// `undefined` dans ce cas, pas de changement pour les call sites existants.
export function withAdmin<Ctx = { params: Promise<Record<string, string>> }>(
  handler: (req: NextRequest, session: Session, ctx: Ctx) => Promise<Response>,
) {
  return async (req: NextRequest, ctx: Ctx) => {
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 },
      );
    }

    return handler(req, session, ctx);
  };
}
