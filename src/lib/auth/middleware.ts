import { auth } from "./auth";
import type { NextRequest } from "next/server";

export async function getSession(req: NextRequest) {
  return await auth.api.getSession({
    headers: req.headers,
  });
}

export async function requireAuth(req: NextRequest) {
  const session = await getSession(req);

  if (!session) {
    throw new Error("Unauthorized");
  }

  return session;
}

export async function requireRole(req: NextRequest, allowedRoles: string[]) {
  const session = await requireAuth(req);

  const userRole = session.user.role;

  if (!userRole) {
    throw new Error("User role is not defined");
  }

  if (!allowedRoles.includes(userRole)) {
    throw new Error(
      `Role ${userRole} not allowed. Required: ${allowedRoles.join(", ")}`,
    );
  }

  return session;
}

export const requirePlan = requireRole;
