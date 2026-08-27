import type { Config } from "@netlify/functions";
import { isAdmin, readBody, markRevoked, deleteActivation, json } from "./_lib";

export default async function handler(req: Request) {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!isAdmin(req.headers.get("x-admin-secret"))) return json({ error: "Unauthorized" }, 401);
  const body = (await readBody(req)) as Record<string, unknown>;
  const jti = String(body?.jti ?? "");
  if (!jti) return json({ error: "jti requis" }, 400);
  await markRevoked(jti);
  await deleteActivation(jti);
  return json({ ok: true });
}

export const config: Config = { path: "/api/revoke" };
