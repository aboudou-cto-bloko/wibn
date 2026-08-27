import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { systemSettings } from "@/lib/db/schema";
import { getSettings, clearSettingsCache } from "@/lib/settings";
import { verifyLicenseOffline, LICENSE_SERVER } from "@/lib/license";

export async function POST() {
  try {
    const settings = await getSettings();
    const token = settings.licenseKey;
    if (!token) {
      return NextResponse.json(
        { error: "Aucune licence active sur cette instance" },
        { status: 400 },
      );
    }

    const result = await verifyLicenseOffline(token);

    // Libère le verrou d'activation côté license-server, si possible —
    // permet de réactiver la même clé sur une autre instance ensuite.
    if (result.valid) {
      try {
        await fetch(`${LICENSE_SERVER}/api/deactivate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, machine_id: settings.machineId }),
          signal: AbortSignal.timeout(5000),
        });
      } catch {
        // Serveur injoignable — on désactive quand même localement.
      }
    }

    await db
      .update(systemSettings)
      .set({ licenseKey: null, updatedAt: new Date() })
      .where(eq(systemSettings.id, "singleton"));
    clearSettingsCache();

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error deactivating license:", error);
    return NextResponse.json(
      { error: "Échec de la désactivation de la licence" },
      { status: 500 },
    );
  }
}
