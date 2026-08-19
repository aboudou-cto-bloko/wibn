import { db } from "@/lib/db";
import { systemSettings } from "@/lib/db/schema";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { withAdmin } from "@/lib/auth/api-middleware";
import { clearSettingsCache } from "@/lib/settings";
import { settingsPatchSchema, parseJsonBody } from "@/lib/validation/admin";

export const revalidate = 0; // Pas de cache

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
    const parsed = await parseJsonBody(request, settingsPatchSchema);
    if ("error" in parsed) return parsed.error;

    // Le schéma n'expose que les champs éditables (jamais "id"/"updatedAt"),
    // avec les bons types et bornes — plus de spread de body non validé.
    const updated = await db
      .update(systemSettings)
      .set({
        ...parsed.data,
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
