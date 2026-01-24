import { db } from "@/lib/db";
import { systemSettings } from "@/lib/db/schema";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

export const revalidate = 0; // Pas de cache

// GET - Récupère les settings
export async function GET() {
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
}

// PUT - Met à jour les settings
export async function PUT(request: Request) {
  try {
    const body = await request.json();

    const updated = await db
      .update(systemSettings)
      .set({
        ...body,
        updatedAt: new Date(),
      })
      .where(eq(systemSettings.id, "singleton"))
      .returning();

    return NextResponse.json(updated[0]);
  } catch (error) {
    console.error("Error updating settings:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 },
    );
  }
}
