import type { Config } from "@netlify/functions";
import { isRevoked, getActivation, readBody, json } from "./_lib";

export default async function handler(req: Request) {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const body = (await readBody(req)) as Record<string, unknown>;
  const jti = String(body?.jti ?? "");
  const machine_id = body?.machine_id ? String(body.machine_id) : null;

  if (!jti) return json({ valid: false, reason: "missing jti" }, 400);

  if (await isRevoked(jti)) {
    return json({ valid: false, reason: "révoquée" });
  }

  if (machine_id) {
    const activation = await getActivation(jti);
    if (activation && activation.machine_id !== machine_id) {
      return json({ valid: false, reason: "instance non autorisée" });
    }
  }

  return json({ valid: true });
}

export const config: Config = { path: "/api/validate" };
