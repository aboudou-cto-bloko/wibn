// Génère un lot de clés de giveaway (emails mockup, pas de vrais
// destinataires — distribuées ensuite au clic public sur
// /api/giveaway/claim). Usage : npx tsx scripts/generate-giveaway.ts
//
// Idempotent-ish : relancer avec le même BATCH ajoute COUNT clés de plus au
// lot (ne remplace pas les existantes) — change BATCH pour un nouveau lot.
import "dotenv/config";
import { generateKey, storeLicense } from "../api/_lib";

const BATCH = process.env.GIVEAWAY_BATCH ?? "giveaway-2026-08";
const COUNT = Number(process.env.GIVEAWAY_COUNT ?? 25);
const PLAN = process.env.GIVEAWAY_PLAN ?? "pro";
const DURATION_DAYS = Number(process.env.GIVEAWAY_DURATION_DAYS ?? 90);

async function main() {
  console.log(`Génération de ${COUNT} clés — lot "${BATCH}", plan ${PLAN}, ${DURATION_DAYS}j`);
  for (let i = 1; i <= COUNT; i++) {
    const email = `giveaway-${String(i).padStart(2, "0")}@wibn.local`;
    const { token, jti, expiresAt } = await generateKey(email, PLAN, DURATION_DAYS);
    await storeLicense(jti, email, PLAN, expiresAt, { giveawayBatch: BATCH, token });
    console.log(`  ${i}/${COUNT} — ${jti}`);
  }
  console.log("Terminé.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Échec :", err);
    process.exit(1);
  });
