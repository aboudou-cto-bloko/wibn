import { NextResponse } from "next/server";
import { checkLicense } from "@/lib/license";
import { getSettings } from "@/lib/settings";

export async function GET() {
  try {
    const result = await checkLicense();
    const settings = await getSettings();

    if (!result.valid) {
      return NextResponse.json({ active: false, reason: result.reason });
    }

    return NextResponse.json({
      active: true,
      plan: result.payload.plan,
      email: result.payload.sub,
      expiresAt: new Date(result.payload.exp * 1000).toISOString(),
      machineId: settings.machineId,
    });
  } catch (error) {
    console.error("Error fetching license status:", error);
    return NextResponse.json(
      { error: "Échec de la lecture du statut de licence" },
      { status: 500 },
    );
  }
}
