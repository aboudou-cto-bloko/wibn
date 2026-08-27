# wibn-license-server

Petit service **Netlify Functions** (déployé sur
[wibn-license.netlify.app](https://wibn-license.netlify.app)) qui émet et
vérifie les clés de licence WIBN. Une clé (JWT signé RS256) déverrouille
**toute une instance** self-hosted de WIBN — même modèle que
`PROSPECTO_LICENSE` sur Prospecto V1 (qui, lui, tourne sur Vercel), sans le
paiement pour l'instant.

`public/index.html` est le guide de démarrage public (installation,
activation, utilisation) — c'est la page d'accueil de
[wibn-license.netlify.app](https://wibn-license.netlify.app), l'URL à
envoyer à quelqu'un avec sa clé de licence. À éditer/redéployer avec le
reste du site (voir *Déployer* ci-dessous).

## Stockage : Prisma Postgres

Une ligne `License` par clé émise dans une base Postgres managée par Prisma
(table `license`, schéma dans `src/prisma/contract.prisma`). L'activation
(verrou 1 instance/licence) est repliée sur la même ligne (`machineId`/
`activatedAt`) plutôt qu'une table à part.

Le projet Prisma dédié (`wibn-license`, distinct du projet `wibn` de l'app
principale) et sa base (`licenses`) existent déjà — ce dossier y est lié via
`.prisma/local.json`. Pour retrouver/gérer la base :

```bash
npx prisma postgres list --project wibn-license
npx prisma postgres show <database-id> --project wibn-license
```

Après toute modification de `src/prisma/contract.prisma` :

```bash
npx prisma contract emit   # régénère contract.json + contract.d.ts
npx prisma db update       # sync rapide dev — pour la prod, migration plan + db migrate
```

⚠️ **Piège** : les champs temporels doivent être typés `TimestamptzString`
(pas `DateTime`) — le runtime Node ici n'a pas l'API `Temporal` globale que
le codec `DateTime` exige, et ça casse au premier `create()`/`update()` avec
une erreur `RUNTIME.TEMPORAL_UNAVAILABLE`. `TimestamptzString` encode en
texte simple (les fonctions de `_lib.ts` manipulent donc des chaînes ISO,
pas des `Date`).

## Déployer (Netlify)

Le site `wibn-license` existe déjà (site id dans `.netlify/state.json`, ce
dossier y est lié). Pour redéployer après un changement :

```bash
cd packages/license-server
netlify deploy --prod --no-build --dir public --functions api
```

⚠️ **Pièges rencontrés en déployant depuis ce monorepo** (WIBN app Next.js à
la racine du repo git, `packages/license-server/` en sous-dossier) :
- Sans `--no-build`, Netlify tente de détecter un framework et remonte
  jusqu'à la racine du repo git → il trouve l'app Next.js WIBN et essaie de
  la builder depuis ce dossier (`@netlify/plugin-nextjs` échoue, pas de
  `pages`/`app` ici). Ce site n'a besoin d'aucun build (functions bundlées
  par esbuild au déploiement) — `--no-build` court-circuite tout ça.
- `publish`/`functions.directory` dans `netlify.toml` se sont révélés
  incohérents à résoudre correctement dans ce contexte monorepo (tantôt
  relatifs à la racine du repo, tantôt à `base`, selon la passe interne du
  CLI) — d'où les flags `--dir public --functions api` explicites plutôt que
  de compter sur `netlify.toml` seul.

Pour repartir de zéro sur un nouveau site :
1. `netlify sites:create --name <nom>` depuis `packages/license-server/`.
2. `netlify env:import .env --replace-existing` (import direct depuis le
   `.env` local — plus fiable que `env:set` pour une valeur multi-lignes
   comme `LICENSE_PRIVATE_KEY`, qui casse le parsing CLI en argument brut).
3. Génère une paire de clés RSA dédiée si besoin (⚠️ ne réutilise jamais
   celle de Prospecto) :
   ```bash
   openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out private.pem
   openssl rsa -pubout -in private.pem -out public.pem
   ```
   Colle le contenu de `public.pem` dans `PUBLIC_KEY_PEM`
   (`~/projects/wibn/src/lib/license.ts`), et `private.pem` dans
   `LICENSE_PRIVATE_KEY` du `.env` local avant l'import.
4. Déploie comme ci-dessus, puis renseigne l'URL obtenue dans
   `LICENSE_SERVER_URL` (env de l'app WIBN elle-même).

## Émettre une clé (aujourd'hui : manuel, pas de paiement)

```bash
curl -X POST https://wibn-license.netlify.app/api/generate \
  -H "x-admin-secret: $LICENSE_SERVER_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"email":"client@exemple.com","plan":"pro","durationDays":90}'
```

Copie le `token` retourné et transmets-le à la personne (email, WhatsApp,
whatever) — elle le colle dans `/activate` sur son instance WIBN.

## Endpoints

| Route | Auth | Usage |
|---|---|---|
| `POST /api/generate` | `x-admin-secret` | Émet une clé (email, plan, durée) |
| `POST /api/activate` | — | Lie une clé à une instance (`machine_id`), verrou 1 instance/clé |
| `POST /api/deactivate` | token+machine_id, ou `x-admin-secret` | Libère le verrou (transfert vers une nouvelle instance) |
| `POST /api/validate` | — | Check online (révocation / instance autorisée), appelé au plus 1x/24h par l'app |
| `POST /api/revoke` | `x-admin-secret` | Révoque définitivement une clé |
| `GET /api/health` | — | Trivial |
| `POST /api/giveaway/claim` | — | Distribue une clé du lot giveaway en cours (voir ci-dessous), décompte à chaque appel |
| `GET /api/giveaway/status` | — | `{remaining, total}` du lot giveaway en cours |

## Giveaway (clés gratuites, décompte en direct)

`public/index.html` a une section "🎁 Giveaway" — bouton public, un clic
livre une clé du lot et décrémente un compteur visible. Mécanique :

1. `scripts/generate-giveaway.ts` pré-génère N clés avec des emails mockup
   (`giveaway-01@wibn.local`, etc.), taguées `giveawayBatch` en base :
   ```bash
   GIVEAWAY_BATCH="giveaway-2026-08" GIVEAWAY_COUNT=25 GIVEAWAY_PLAN=pro GIVEAWAY_DURATION_DAYS=90 \
     npx tsx scripts/generate-giveaway.ts
   ```
2. Le nom du lot est codé en dur dans `api/giveaway-claim.ts` et
   `api/giveaway-status.ts` (`GIVEAWAY_BATCH`) — change-le pour un nouveau
   lot, et mets-le à jour dans le script aussi.
3. `/api/giveaway/claim` distribue une ligne non réclamée du lot et marque
   `claimedAt`, atomiquement.

⚠️ **Piège sérieux — non-atomicité de l'ORM sous charge concurrente réelle.**
Plusieurs variantes "lire une candidate puis l'update sous condition
`claimedAt: null`" via `db.orm.public.License` — y compris avec
`db.transaction(...)` — se sont révélées **non atomiques** sous appels
concurrents : testé avec de vraies requêtes HTTP parallèles (`curl` en
parallèle, pas juste `Promise.all` en local) contre le déploiement Netlify —
plusieurs requêtes distinctes recevaient la **même** clé. Semble être un bug
du driver Postgres rc de Prisma Next, pas un problème de la condition WHERE
elle-même (qui fonctionne bien en séquentiel). **Fix retenu** : SQL brut via
`db.raw.sql` avec verrouillage explicite (`FOR UPDATE SKIP LOCKED`, le
pattern standard "prendre un élément dans une file d'attente sans doublon"),
voir `claimGiveawayKey` dans `_lib.ts`. Revérifié par de vraies requêtes
concurrentes après le fix — zéro doublon sur plusieurs runs. Un rappel utile
sur cette librairie rc : **ne jamais faire confiance à une opération
"atomique" côté ORM sans la tester sous vraie charge concurrente
(pas juste en séquentiel), même quand la doc la présente comme sûre.**

`scripts/test-giveaway.ts` est le test de non-régression (claim en
parallèle, vérifie zéro doublon + comptage correct) — à relancer après
toute modification de `claimGiveawayKey`.

## Brancher le paiement plus tard (Moneroo)

Rien n'est câblé pour l'instant — `generate.ts` est le seul point d'émission,
appelé à la main. Pour rendre ça payant sans tout refaire :

1. Ajouter `api/checkout.ts` : POST qui initialise un paiement Moneroo
   (`moneroo.payments.initialize`) pour le plan/prix choisi, retourne
   `checkout_url`. Voir `~/projects/prospecto/packages/license-server/api/checkout.ts`
   comme modèle.
2. Ajouter `api/webhook/moneroo.ts` : vérifie la signature du webhook
   (`MONEROO_WEBHOOK_SECRET`), et sur `payment.success` appelle `generateKey()`
   **puis `storeLicense()`** (ne pas oublier cet appel — c'est le bug qu'avait
   le webhook Prospecto : une licence émise sans être stockée en base ne peut
   jamais s'activer).
3. Ajouter l'envoi d'email (`nodemailer`, voir `sendLicenseEmail` dans le
   `_lib.ts` de Prospecto) pour livrer la clé automatiquement après paiement,
   au lieu du copier-coller manuel actuel.
4. Env vars à ajouter : `MONEROO_SECRET_KEY`, `MONEROO_WEBHOOK_SECRET`,
   `SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/`SMTP_PASS`/`SMTP_FROM`.

Le reste (activate/deactivate/validate/revoke, la vérification offline côté
app) ne change pas.
