import { jwtVerify, importSPKI } from "jose";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { systemSettings } from "@/lib/db/schema";

// Clé publique dédiée à WIBN — distincte de celle de Prospecto. La clé
// privée correspondante ne vit que sur le license-server (packages/license-server).
const PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAmzTaXWkpqg8zg3YcovI7
s6yfaBr8Kf+qhWZOyIdEyrDHibziNW2w4Xz/3X00d01UwxZCkAtw6kD+5bLu7aTk
OGH4Tfb+SlN4c/SIUsNSObIxTfxGlig6f87cuR2U0MQYJwnTSWJgJJ8qhAZfVxwM
aKipx4XTWldCqtKkqt3AqN4YawgSK3hoIxe2+CFgu1+gfQSB8EX0SknrjceFZ5DD
nmv0qXI8YKoOD6K6VK3MrwYVYNKBiaOiivhMw0wJaSwup4/9Vzldyxq56zuqnK4Q
Fhojhvn1cO+POQOlI3FJuFDjsp8McB+jOo5A8oGnc6h+gkeR+/+/kwBY+x00O+z0
dwIDAQAB
-----END PUBLIC KEY-----`;

export type LicensePlan = "free" | "pro" | "agency" | "enterprise";

export type LicensePayload = {
  jti: string;
  sub: string;
  plan: LicensePlan;
  exp: number;
  iat: number;
};

type LicenseResult =
  | { valid: true; payload: LicensePayload }
  | { valid: false; reason: string };

let _publicKey: CryptoKey | null = null;
async function getPublicKey(): Promise<CryptoKey> {
  if (!_publicKey) _publicKey = await importSPKI(PUBLIC_KEY_PEM, "RS256");
  return _publicKey;
}

// Vérification offline (signature RSA + expiration) — fonctionne partout
// (jose s'appuie sur Web Crypto), aucun appel réseau nécessaire.
export async function verifyLicenseOffline(
  token: string,
): Promise<LicenseResult> {
  if (!token) return { valid: false, reason: "Aucune clé de licence configurée" };
  try {
    const publicKey = await getPublicKey();
    const { payload } = await jwtVerify(token, publicKey, {
      algorithms: ["RS256"],
    });
    const raw = payload as Record<string, unknown>;
    const plan = String(raw.plan ?? "free") as LicensePlan;
    return {
      valid: true,
      payload: {
        jti: String(payload.jti ?? ""),
        sub: String(payload.sub ?? ""),
        plan,
        exp: Number(payload.exp),
        iat: Number(payload.iat),
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("expired")) return { valid: false, reason: "Licence expirée" };
    return { valid: false, reason: "Clé invalide" };
  }
}

// Vérification online — au plus une fois par 24h, résultat mis en cache en
// mémoire. Échoue "ouvert" (considère valide) si le license-server est
// injoignable, pour ne pas bloquer l'instance à cause d'un problème réseau.
export const LICENSE_SERVER =
  process.env.LICENSE_SERVER_URL ?? "https://wibn-license.netlify.app";

let lastOnlineCheck = 0;
let onlineCheckCache = true;

export async function verifyLicenseOnline(
  jti: string,
  machineId?: string | null,
): Promise<boolean> {
  const now = Date.now();
  if (now - lastOnlineCheck < 24 * 60 * 60 * 1000) return onlineCheckCache;
  try {
    const res = await fetch(`${LICENSE_SERVER}/api/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jti, ...(machineId ? { machine_id: machineId } : {}) }),
      signal: AbortSignal.timeout(5000),
    });
    onlineCheckCache =
      res.ok && ((await res.json()) as { valid?: boolean }).valid === true;
    lastOnlineCheck = now;
    return onlineCheckCache;
  } catch {
    lastOnlineCheck = now;
    return true; // grâce en cas de panne réseau
  }
}

// Lit la clé activée sur cette instance (stockée dans system_settings, pas
// une env var — voir schema.ts) et la vérifie offline.
//
// Requête directe (pas via getSettings()/son cache 60s) : le proxy et les
// routes API tournent dans des runtimes Next.js séparés qui n'ont pas le
// même cache en mémoire — clearSettingsCache() dans /api/license/activate
// ne rendrait donc pas la licence utilisable immédiatement pour le check du
// proxy. Cette requête est légère (une ligne, clé primaire) sur chaque
// requête protégée, le coût est négligeable face à la cohérence immédiate.
export async function checkLicense(): Promise<LicenseResult> {
  const [settings] = await db
    .select({ licenseKey: systemSettings.licenseKey })
    .from(systemSettings)
    .where(eq(systemSettings.id, "singleton"));
  const token = settings?.licenseKey ?? "";
  return verifyLicenseOffline(token);
}
