import type { Config } from "@netlify/functions";
import { claimGiveawayKey, json } from "./_lib";

// Lot du giveaway en cours — voir scripts/generate-giveaway.ts pour le
// script qui a rempli ce lot.
const GIVEAWAY_BATCH = "giveaway-2026-08";

export default async function handler(req: Request) {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const result = await claimGiveawayKey(GIVEAWAY_BATCH);
  if (!result) {
    return json({ error: "Toutes les clés du giveaway ont déjà été distribuées." }, 410);
  }

  return json({ ok: true, token: result.token });
}

export const config: Config = { path: "/api/giveaway/claim" };
