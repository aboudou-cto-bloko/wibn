import { SignJWT, importPKCS8 } from "jose";
import crypto from "node:crypto";
import { db } from "../src/prisma/db";

// ── Types ─────────────────────────────────────────────────────────────────────

export type LicenseRecord = {
  jti: string;
  email: string;
  plan: string;
  expiresAt: string;
  createdAt: string;
};

export type ActivationRecord = {
  machine_id: string;
  email: string;
  activated_at: string;
};

// ── DB helpers ────────────────────────────────────────────────────────────────
// Une ligne `License` par clé émise (table Postgres gérée par Prisma —
// src/prisma/contract.prisma). L'activation (verrou 1 instance/licence) est
// repliée sur la même ligne (machineId/activatedAt) plutôt qu'une table à
// part : la relation est 1:1, jamais qu'un seul verrou actif par licence.

export async function storeLicense(
  jti: string,
  email: string,
  plan: string,
  expiresAt: string,
  extra?: { giveawayBatch?: string; token?: string },
) {
  await db.orm.public.License.create({
    jti,
    email,
    plan,
    expiresAt,
    ...(extra?.giveawayBatch ? { giveawayBatch: extra.giveawayBatch } : {}),
    ...(extra?.token ? { token: extra.token } : {}),
  });
}

// ── Giveaway ──────────────────────────────────────────────────────────────────
// Un lot de clés pré-générées (email mockup, token déjà signé stocké sur la
// ligne) distribuées au clic public sur /api/giveaway/claim.
//
// ⚠️ Toutes les variantes via l'ORM (.where().update() sur un prédicat
// multi-lignes, avec ou sans pré-lecture, avec ou sans db.transaction) se
// sont révélées NON atomiques sous charge concurrente réelle — testé avec
// de vraies requêtes HTTP parallèles contre le déploiement Netlify (pas
// juste en local) : plusieurs requêtes distinctes reçoivent la même clé.
// Semble être un vrai bug de ce driver Postgres rc plutôt qu'un problème de
// logique applicative. Fix : SQL brut avec verrouillage de ligne explicite
// (`FOR UPDATE SKIP LOCKED`, le pattern standard pour "prendre un élément
// dans une file d'attente" sans doublon) — un seul statement, Postgres gère
// lui-même l'exclusion mutuelle. Revérifié par le même test HTTP concurrent
// après ce fix, voir packages/license-server/README.md.
export async function claimGiveawayKey(
  batch: string,
): Promise<{ token: string } | null> {
  const table = db.sql.public.license;
  const plan = db.raw.sql`
    UPDATE license
    SET "claimedAt" = now()
    WHERE jti = (
      SELECT jti FROM license
      WHERE "giveawayBatch" = ${batch} AND "claimedAt" IS NULL
      ORDER BY "createdAt"
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    )
    RETURNING jti, token
  `.returnsRow({ jti: table.columns.jti, token: table.columns.token }).build();

  // `.execute()` est réservé aux plans de mutation (renvoie des stats, pas
  // de lignes) — un plan qui retourne des lignes passe par `.query()`.
  const rows = await db.runtime().query(plan);
  const row = rows[0];
  return row?.token ? { token: row.token } : null;
}

export async function giveawayStatus(batch: string): Promise<{ remaining: number; total: number }> {
  const [total, claimed] = await Promise.all([
    db.orm.public.License.where({ giveawayBatch: batch }).aggregate((a) => ({ n: a.count() })),
    db.orm.public.License
      .where({ giveawayBatch: batch })
      .where((l) => l.claimedAt.isNotNull())
      .aggregate((a) => ({ n: a.count() })),
  ]);
  return { remaining: total.n - claimed.n, total: total.n };
}

export async function getLicense(jti: string): Promise<LicenseRecord | null> {
  const row = await db.orm.public.License.first({ jti });
  if (!row) return null;
  return {
    jti: row.jti,
    email: row.email,
    plan: row.plan,
    expiresAt: row.expiresAt,
    createdAt: row.createdAt,
  };
}

export async function markRevoked(jti: string) {
  await db.orm.public.License.where({ jti }).update({ revoked: true });
}

export async function isRevoked(jti: string): Promise<boolean> {
  const row = await db.orm.public.License.select("revoked").first({ jti });
  return row?.revoked ?? false;
}

export async function getActivation(jti: string): Promise<ActivationRecord | null> {
  const row = await db.orm.public.License.select("machineId", "email", "activatedAt").first({ jti });
  if (!row || !row.machineId || !row.activatedAt) return null;
  return {
    machine_id: row.machineId,
    email: row.email,
    activated_at: row.activatedAt,
  };
}

export async function setActivation(jti: string, machine_id: string, _email: string) {
  await db.orm.public.License.where({ jti }).update({ machineId: machine_id, activatedAt: new Date().toISOString() });
}

export async function deleteActivation(jti: string) {
  await db.orm.public.License.where({ jti }).update({ machineId: null, activatedAt: null });
}

// ── Key management ────────────────────────────────────────────────────────────

export async function getPrivateKey() {
  const pem = process.env.LICENSE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!pem) throw new Error("LICENSE_PRIVATE_KEY not configured");
  return importPKCS8(pem, "RS256");
}

// ── License generation ────────────────────────────────────────────────────────

export async function generateKey(email: string, plan = "free", durationDays = 30) {
  const key = await getPrivateKey();
  const jti = crypto.randomUUID();
  const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * durationDays;
  const payload: Record<string, unknown> = { plan };
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "RS256" })
    .setSubject(email)
    .setJti(jti)
    .setIssuedAt()
    .setExpirationTime(exp)
    .sign(key);
  return { token, jti, expiresAt: new Date(exp * 1000).toISOString() };
}

// ── Utilities ─────────────────────────────────────────────────────────────────

export function isAdmin(secret: string | null) {
  return secret !== null && secret === process.env.LICENSE_SERVER_SECRET;
}

// Corps JSON d'une requête standard (Netlify Functions v2 = Fetch API) — un
// body absent/malformé résout `{}` plutôt que de jeter, pour laisser chaque
// handler répondre 400 proprement via son propre schéma Zod.
export async function readBody(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return {};
  }
}

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}
