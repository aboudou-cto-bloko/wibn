import { RawPainPoint } from "@/types/scraper";
import { stripLoneSurrogates } from "./sanitize";

export interface HnScraperConfig {
  /** Requêtes de recherche (pas de subreddits — HN n'a pas de communautés nommées). */
  queries: string[];
  /** Nombre max de résultats par requête (Algolia hitsPerPage). */
  limit?: number;
  /** Score minimum de points pour qu'un post soit retenu. */
  minPoints?: number;
}

interface AlgoliaHit {
  objectID: string;
  title: string | null;
  story_text: string | null;
  url: string | null;
  author: string;
  points: number;
  num_comments: number;
  created_at: string;
  _tags: string[];
}

interface AlgoliaResponse {
  hits: AlgoliaHit[];
}

/**
 * Nettoie le story_text renvoyé par l'API Algolia : balises HTML (des <p>
 * essentiellement) + entités HTML courantes, y compris les entités
 * hexadécimales (&#x27; etc.) que HN utilise pour les apostrophes/guillemets.
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Scrape Hacker News via l'API publique Algolia (hn.algolia.com) — pas de
 * clé, pas de quota documenté pour un usage raisonnable. Une requête de
 * recherche par entrée de `queries` (contrairement à Reddit où une entrée
 * de catégorie = un subreddit ; ici une entrée = des mots-clés de recherche
 * type "frustrated with", "Ask HN: how do you", etc.).
 *
 * Contrairement au scraper Reddit (RSS, score neutre faute de donnée réelle),
 * l'API Algolia expose un vrai nombre de points — utilisé tel quel comme
 * `score`, alimentant correctement la composante engagement du pain-scorer
 * (src/lib/scoring/pain-scorer.ts:10).
 */
export async function scrapeHackerNews(
  config: HnScraperConfig,
): Promise<RawPainPoint[]> {
  const { queries, limit = 30, minPoints = 20 } = config;
  const allPainPoints: RawPainPoint[] = [];

  for (const query of queries) {
    try {
      const url = new URL("https://hn.algolia.com/api/v1/search");
      url.searchParams.set("query", query);
      url.searchParams.set("tags", "story");
      url.searchParams.set("numericFilters", `points>${minPoints}`);
      url.searchParams.set("hitsPerPage", String(limit));

      const response = await fetch(url.toString());

      if (!response.ok) {
        console.error(
          `Failed to fetch HN query "${query}": ${response.status}`,
        );
        continue;
      }

      const data: AlgoliaResponse = await response.json();
      const hits = data.hits || [];

      console.log(`HN query "${query}": Found ${hits.length} stories`);

      for (const hit of hits) {
        // Filtres de qualité : seuls les posts avec un vrai corps de texte
        // (typiquement "Ask HN") sont exploitables — un lien externe seul
        // n'a pas de contenu à scorer, contrairement au selftext Reddit.
        if (!hit.story_text) continue;
        const content = stripHtml(hit.story_text);
        if (content.length < 50) continue;
        if (!hit.title) continue;

        allPainPoints.push({
          sourceId: `hn_${hit.objectID}`,
          // stripLoneSurrogates : voir sanitize.ts (défensif, bug rencontré
          // sur le scraper Play Store).
          title: stripLoneSurrogates(hit.title),
          content: stripLoneSurrogates(content),
          url:
            hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
          author: hit.author,
          score: hit.points,
          metadata: {
            numComments: hit.num_comments,
            tags: hit._tags,
          },
          scrapedAt: new Date(),
        });
      }

      // Petit délai de courtoisie entre requêtes (pas de rate-limit
      // documenté sur cette API publique, contrairement au flux RSS Reddit).
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`Error scraping HN query "${query}":`, error);
    }
  }

  console.log(`Total pain points collected: ${allPainPoints.length}`);
  return allPainPoints;
}
