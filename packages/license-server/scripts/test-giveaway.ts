import "dotenv/config";
import { claimGiveawayKey, giveawayStatus } from "../api/_lib";
import { db } from "../src/prisma/db";

async function main() {
  const batch = "test-batch";

  console.log("status before:", await giveawayStatus(batch));

  // Réclame en parallèle 5 fois pour un lot de 3 → doit donner 3 tokens
  // distincts et 2 échecs (pool épuisé), jamais de doublon.
  const results = await Promise.all(
    Array.from({ length: 5 }, () => claimGiveawayKey(batch)),
  );
  const tokens = results.filter((r): r is { token: string } => r !== null).map((r) => r.token);
  const failures = results.filter((r) => r === null).length;

  console.log("tokens reçus:", tokens.length, "échecs:", failures);
  console.log("tokens uniques:", new Set(tokens).size === tokens.length ? "OUI" : "NON — DOUBLON !");

  if (tokens.length !== 3 || failures !== 2) throw new Error("comptage inattendu");
  if (new Set(tokens).size !== tokens.length) throw new Error("doublon détecté !");

  console.log("status after:", await giveawayStatus(batch));

  // 6e appel — pool déjà vide, doit renvoyer null proprement.
  const empty = await claimGiveawayKey(batch);
  if (empty !== null) throw new Error("attendu null sur pool vide");
  console.log("claim sur pool vide → null (attendu) ✅");

  // cleanup — .delete() sur un prédicat multi-lignes n'en supprime qu'une
  // seule (constaté), donc suppression ligne par ligne par jti.
  const remaining = await db.orm.public.License.select("jti").where({ giveawayBatch: batch }).all();
  for (const r of remaining) await db.orm.public.License.where({ jti: r.jti }).delete();
  console.log("GIVEAWAY TEST OK");
}

main().then(() => process.exit(0)).catch((e) => { console.error("FAILED", e); process.exit(1); });
