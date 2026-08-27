import type { Config } from "@netlify/functions";
import { json } from "./_lib";

export default async function handler() {
  return json({ ok: true, ts: Date.now() });
}

export const config: Config = { path: "/api/health" };
