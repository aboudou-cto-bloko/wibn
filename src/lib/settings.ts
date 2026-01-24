import { db } from "./db";
import { systemSettings } from "./db/schema";
import { eq } from "drizzle-orm";

let cachedSettings: typeof systemSettings.$inferSelect | null = null;
let cacheTime = 0;
const CACHE_TTL = 60000;

export async function getSettings() {
  const now = Date.now();
  if (cachedSettings && now - cacheTime < CACHE_TTL) {
    return cachedSettings;
  }

  let [settings] = await db
    .select()
    .from(systemSettings)
    .where(eq(systemSettings.id, "singleton"));

  if (!settings) {
    [settings] = await db
      .insert(systemSettings)
      .values({ id: "singleton" })
      .returning();
  }

  cachedSettings = settings;
  cacheTime = now;

  return settings;
}

export function clearSettingsCache() {
  cachedSettings = null;
  cacheTime = 0;
}
