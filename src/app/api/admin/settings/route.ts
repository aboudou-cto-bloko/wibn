import { db } from "@/lib/db";
import { systemSettings } from "@/lib/db/schema";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { withAdmin } from "@/lib/auth/api-middleware";
import { clearSettingsCache } from "@/lib/settings";

export const revalidate = 0; // Pas de cache

// Champs modifiables par PUT — empêche d'écraser "id"/"updatedAt" ou
// d'injecter des colonnes arbitraires depuis un body non validé.
const EDITABLE_FIELDS = [
  "scrapingEnabled",
  "clusteringEnabled",
  "ideaGenerationEnabled",
  "minPainScore",
  "autoScrapeInterval",
  "maxPostsPerSubreddit",
  "minClusterSize",
  "similarityThreshold",
  "aiTemperature",
  "aiMaxTokens",
] as const;

// GET - Récupère les settings
export const GET = withAdmin(async () => {
  try {
    let [settings] = await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.id, "singleton"));

    // Si pas de settings, créer avec valeurs par défaut
    if (!settings) {
      [settings] = await db
        .insert(systemSettings)
        .values({ id: "singleton" })
        .returning();
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 },
    );
  }
});

// PUT - Met à jour les settings
export const PUT = withAdmin(async (request) => {
  try {
    const body = await request.json();

    // N'accepte que les champs éditables connus, ignore tout le reste
    // (dont "id" et "updatedAt", qui ne doivent jamais venir du client).
    const patch: Record<string, unknown> = {};
    for (const field of EDITABLE_FIELDS) {
      if (field in body) patch[field] = body[field];
    }

    const updated = await db
      .update(systemSettings)
      .set({
        ...patch,
        updatedAt: new Date(),
      })
      .where(eq(systemSettings.id, "singleton"))
      .returning();

    // Sans ça, les jobs en cours (scraping/clustering/génération) continuent
    // d'utiliser les anciennes valeurs jusqu'à 60s (cache de getSettings()).
    clearSettingsCache();

    return NextResponse.json(updated[0]);
  } catch (error) {
    console.error("Error updating settings:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 },
    );
  }
});
