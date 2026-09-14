import gplay from "google-play-scraper";
import { RawPainPoint } from "@/types/scraper";
import { stripLoneSurrogates } from "./sanitize";

export interface PlayStoreScraperConfig {
  /** Ids de packages Android (ex: "com.opay.max", "com.transsnet.store.wesend"). */
  appIds: string[];
  /** Ne garder que les avis à cette note ou en dessous (défaut 2/5 — les
   * avis 4-5 étoiles ne sont pas des pain points). */
  maxRating?: number;
  /** Nombre d'avis récupérés par app avant filtrage par note. */
  limit?: number;
}

/**
 * Scrape les avis Google Play Store via le package npm google-play-scraper
 * (pas de clé, pas de compte requis — vérifié le 2026-09-13). Filtre sur
 * les avis à note basse (par défaut ≤2/5), qui sont la source la plus
 * directe de frustrations utilisateurs concrètes sur des apps déjà
 * utilisées en Afrique (fintech/mobile money, e-commerce, transport).
 *
 * Limite connue : `thumbsUp` (nombre de personnes ayant trouvé l'avis
 * utile) est presque toujours à 0 dans la pratique — pas un signal
 * d'engagement fiable comme les points HN. On l'utilise quand il existe,
 * sinon score neutre (même compromis que le scraper Reddit RSS).
 */
export async function scrapePlayStore(
  config: PlayStoreScraperConfig,
): Promise<RawPainPoint[]> {
  const { appIds, maxRating = 2, limit = 100 } = config;
  const allPainPoints: RawPainPoint[] = [];

  for (const appId of appIds) {
    try {
      const result = await gplay.reviews({
        appId,
        num: limit,
        // gplay.sort.NEWEST vaut 2 à l'exécution, mais les types fournis
        // par le package déclarent `sort` comme une instance de l'enum au
        // lieu de l'espace de noms de l'enum lui-même — gplay.sort.NEWEST
        // ne type-check pas malgré un runtime correct (vérifié le
        // 2026-09-13). Littéral direct pour contourner ce bug de typage.
        sort: 2,
      });

      const lowRatingReviews = result.data.filter(
        (r) => r.score <= maxRating,
      );

      console.log(
        `Play Store ${appId}: ${result.data.length} avis récupérés, ${lowRatingReviews.length} avec note ≤${maxRating}`,
      );

      for (const review of lowRatingReviews) {
        // Sanitize AVANT toute troncature — un .slice() sur du texte brut
        // contenant un emoji peut couper une paire de surrogates en deux
        // (voir sanitize.ts pour le bug concret que ça a causé).
        const content = stripLoneSurrogates((review.text || "").trim());
        if (content.length < 50) continue;

        const title = stripLoneSurrogates(
          `${appId} — ${review.title || content.slice(0, 60)}`,
        );
        const author = stripLoneSurrogates(review.userName || "unknown");

        // La note laissée par l'utilisateur (1-2 étoiles ici) est un signal
        // de sévérité bien plus honnête que `thumbsUp` (quasi toujours à 0
        // en pratique) : un 1 étoile = plainte grave, même formulée en une
        // phrase courte. Sans ça, ces avis (texte court par nature) ne
        // passaient jamais le seuil minPainScore par défaut (40) — testé le
        // 2026-09-13 : scores 15-29 avec un score neutre plat, la
        // composante engagement du pain-scorer (jusqu'à 30/100) ne
        // compensait pas la faible longueur du texte.
        const severityScore = review.score === 1 ? 100 : 75;

        allPainPoints.push({
          sourceId: `playstore_${review.id}`,
          title,
          content,
          url: review.url,
          author,
          score:
            review.thumbsUp > 0
              ? Math.min(100, Math.max(severityScore, review.thumbsUp * 10))
              : severityScore,
          metadata: {
            appId,
            rating: review.score,
            appVersion: review.version,
          },
          scrapedAt: new Date(review.date),
        });
      }

      // Petit délai de courtoisie entre apps.
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`Error scraping Play Store app "${appId}":`, error);
    }
  }

  console.log(`Total pain points collected: ${allPainPoints.length}`);
  return allPainPoints;
}
