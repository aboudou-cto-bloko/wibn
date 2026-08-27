import type { Config } from "@netlify/functions";
import { giveawayStatus, json } from "./_lib";

const GIVEAWAY_BATCH = "giveaway-2026-08";

export default async function handler() {
  const status = await giveawayStatus(GIVEAWAY_BATCH);
  return json(status);
}

export const config: Config = { path: "/api/giveaway/status" };
