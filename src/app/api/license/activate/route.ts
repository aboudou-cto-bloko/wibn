import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { systemSettings } from "@/lib/db/schema";
import { getSettings, clearSettingsCache } from "@/lib/settings";
import { verifyLicenseOffline, LICENSE_SERVER } from "@/lib/license";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { token?: string };
    const token = (body.token ?? "").trim();

    const result = await verifyLicenseOffline(token);
    if (!result.valid) {
      return NextResponse.json({ error: result.reason }, { status: 400 });
    }

    const settings = await getSettings();
    let machineId = settings.machineId;
    if (!machineId) {
      machineId = nanoid();
    }

    // Enregistre l'activation auprès du license-server (verrou 1
    // instance/licence) — tolère une panne réseau, comme Prospecto, pour
    // permettre une activation "grâce" hors-ligne.
    try {
      const res = await fetch(`${LICENSE_SERVER}/api/activate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, machine_id: machineId }),
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok && res.status !== 404) {
        // 409 = déjà activée sur une autre instance, etc. — erreur bloquante.
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        return NextResponse.json(
          { error: data.error ?? "Activation refusée par le serveur de licence" },
          { status: res.status },
        );
      }
    } catch {
      // Serveur de licence injoignable — on active quand même localement.
    }

    await db
      .update(systemSettings)
      .set({ licenseKey: token, machineId, updatedAt: new Date() })
      .where(eq(systemSettings.id, "singleton"));
    clearSettingsCache();

    return NextResponse.json({
      ok: true,
      plan: result.payload.plan,
      expiresAt: new Date(result.payload.exp * 1000).toISOString(),
    });
  } catch (error) {
    console.error("Error activating license:", error);
    return NextResponse.json(
      { error: "Échec de l'activation de la licence" },
      { status: 500 },
    );
  }
}
