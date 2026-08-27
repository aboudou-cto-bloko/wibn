import type { Config } from "@netlify/functions";
import { z } from "zod";
import { generateKey, isAdmin, readBody, storeLicense, json } from "./_lib";

// Émission manuelle de clé (admin uniquement) — pas de checkout/paiement pour
// l'instant. Copie le `token` retourné et transmets-le toi-même à la
// personne qui veut essayer WIBN.
export default async function handler(req: Request) {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!isAdmin(req.headers.get("x-admin-secret"))) return json({ error: "Unauthorized" }, 401);

  const body = await readBody(req);
  const parsed = z.object({
    email: z.string().email(),
    plan: z.enum(["free", "pro", "agency", "enterprise"]).default("free"),
    durationDays: z.number().int().min(1).max(365).default(90),
  }).safeParse(body);
  if (!parsed.success) return json({ error: "Invalid payload" }, 400);

  const { email, plan, durationDays } = parsed.data;
  const { token, jti, expiresAt } = await generateKey(email, plan, durationDays);

  // Persiste la licence en base pour les checks d'activation/machine-binding
  await storeLicense(jti, email, plan, expiresAt);

  return json({ ok: true, token, jti, expiresAt });
}

export const config: Config = { path: "/api/generate" };
