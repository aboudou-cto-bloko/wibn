import type { Config } from "@netlify/functions";
import { decodeJwt } from "jose";
import { z } from "zod";
import { getActivation, deleteActivation, isAdmin, readBody, json } from "./_lib";

export default async function handler(req: Request) {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const body = (await readBody(req)) as Record<string, unknown>;

  // Chemin admin : désactive n'importe quel jti sans vérification d'instance
  if (isAdmin(req.headers.get("x-admin-secret"))) {
    const jti = String(body?.jti ?? "");
    if (!jti) return json({ error: "jti requis" }, 400);
    await deleteActivation(jti);
    return json({ ok: true });
  }

  // Chemin utilisateur : token + machine_id correspondant obligatoires
  const parsed = z.object({
    token: z.string().min(10),
    machine_id: z.string().min(8),
  }).safeParse(body);
  if (!parsed.success) return json({ error: "Payload invalide" }, 400);

  const { token, machine_id } = parsed.data;

  let jti: string;
  try {
    const claims = decodeJwt(token);
    jti = String(claims.jti ?? "");
    if (!jti) throw new Error("no jti");
  } catch {
    return json({ error: "Token invalide" }, 400);
  }

  const activation = await getActivation(jti);
  if (!activation) return json({ ok: true }); // pas de verrou — rien à faire

  if (activation.machine_id !== machine_id) {
    return json({ error: "Ce n'est pas votre instance" }, 403);
  }

  await deleteActivation(jti);
  return json({ ok: true });
}

export const config: Config = { path: "/api/deactivate" };
