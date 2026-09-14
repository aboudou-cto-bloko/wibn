import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/auth/api-middleware";

export const dynamic = "force-dynamic";

// GET - Statut système RÉEL (remplace les 3 badges "Connected/Active/Ready"
// codés en dur sur /admin/settings — ils ne vérifiaient jamais rien et
// restaient verts même si la DB était injoignable ou GROQ_API_KEY absente).
export const GET = withAdmin(async () => {
  let database: "connected" | "error" = "error";
  try {
    await db.execute(sql`select 1`);
    database = "connected";
  } catch (error) {
    console.error("Health check: database unreachable:", error);
  }

  // Groq/Inngest : on ne fait pas un appel réseau à chaque chargement de la
  // page Settings juste pour un badge (latence/coût pour rien) — on vérifie
  // ce qui est honnêtement vérifiable côté serveur sans appel externe.
  const groq = process.env.GROQ_API_KEY ? "configured" : "missing";

  // En dev (hors Docker), Inngest tourne en mode auto-discovery local sans
  // clés — "Active" y était trompeur dans un sens différent (ça marche,
  // mais pas via les clés qu'on pourrait vérifier). En prod, la présence
  // des clés est le seul signal vérifiable sans appeler l'API Inngest.
  const inngest =
    process.env.NODE_ENV !== "production"
      ? "dev-mode"
      : process.env.INNGEST_EVENT_KEY && process.env.INNGEST_SIGNING_KEY
        ? "configured"
        : "missing";

  return NextResponse.json({ database, groq, inngest });
});
