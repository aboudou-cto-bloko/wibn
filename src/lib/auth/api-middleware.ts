import { NextRequest, NextResponse } from "next/server";
import { auth } from "./auth";

type Session = Awaited<ReturnType<typeof auth.api.getSession>>;

export function withAuth(
  handler: (req: NextRequest, session: Session) => Promise<Response>,
) {
  return async (req: NextRequest) => {
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return handler(req, session);
  };
}

export function withAdmin(
  handler: (req: NextRequest, session: Session) => Promise<Response>,
) {
  return async (req: NextRequest) => {
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

    return handler(req, session);
  };
}
