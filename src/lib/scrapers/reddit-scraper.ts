import { RawPainPoint } from "@/types/scraper";

export interface RedditScraperConfig {
  subreddits: string[];
  timeframe: "hour" | "day" | "week" | "month" | "year" | "all";
  limit?: number;
  /** @deprecated le flux RSS n'expose pas le score, ce filtre n'a plus d'effet. */
  minScore?: number;
}

/**
 * Décode les entités HTML les plus courantes du flux Atom Reddit
 * (&lt;, &gt;, &quot;, &amp; et les entités numériques &#NN;).
 *
 * Reddit double-encode certaines entités dans le <content> RSS
 * (ex: une apostrophe arrive en &amp;#39;, pas &#39;) — &amp; doit donc être
 * décodé en premier pour que le passage suivant révèle &#39; à son tour.
 */
function decodeEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

/**
 * Le <content> d'une entrée Reddit RSS est un bloc HTML encodé :
 * <div class="md">...selftext...</div> + "submitted by" + liens [link]/[comments].
 * On extrait juste le texte du post, sans le HTML ni le footer.
 */
function extractSelftext(contentHtml: string): string {
  const decoded = decodeEntities(contentHtml);
  const match = decoded.match(/<div class="md">([\s\S]*?)<\/div>/);
  if (!match) return "";
  return match[1]
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Scrape Reddit via son flux RSS public (r/<sub>/top.rss).
 *
 * L'ancienne implémentation utilisait old.reddit.com/*.json (et
 * www.reddit.com/*.json), désormais bloqués : Reddit redirige toute requête
 * anonyme vers /login (302 → 404 une fois le redirect suivi par fetch), y
 * compris pour un thread individuel. Le flux .rss reste public et ne
 * redirige pas — voir la vérification manuelle du 2026-09-13.
 *
 * Limite connue : le flux RSS n'expose ni score, ni nombre de commentaires,
 * ni upvote ratio (contrairement à l'ancien JSON). On force donc `score` à
 * une valeur médiane neutre pour ne pas fausser à zéro la composante
 * "engagement" du pain-scorer (voir src/lib/scoring/pain-scorer.ts:10) —
 * ce n'est pas une vraie mesure d'engagement, juste un correctif pour ne pas
 * pénaliser injustement tous les posts issus de cette source.
 */
export async function scrapeReddit(
  config: RedditScraperConfig,
): Promise<RawPainPoint[]> {
  const { subreddits, timeframe, limit = 50 } = config;
  const allPainPoints: RawPainPoint[] = [];
  const NEUTRAL_SCORE = 50;

  for (const subreddit of subreddits) {
    try {
      const url = `https://www.reddit.com/r/${subreddit}/top.rss?t=${timeframe}&limit=${limit}`;

      const response = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "application/atom+xml",
          "Accept-Language": "en-US,en;q=0.9",
        },
      });

      if (!response.ok) {
        console.error(`Failed to fetch r/${subreddit}: ${response.status}`);

        if (response.status === 429) {
          // Le flux RSS anonyme a un quota très serré (observé : ~1
          // requête/minute par IP) — on respecte x-ratelimit-reset s'il est
          // présent, sinon 60s par défaut.
          const resetSeconds =
            Number(response.headers.get("x-ratelimit-reset")) || 60;
          console.log(`Rate limited, waiting ${resetSeconds}s...`);
          await new Promise((resolve) =>
            setTimeout(resolve, resetSeconds * 1000),
          );
        }
        continue;
      }

      const xml = await response.text();
      const entries = xml.match(/<entry>[\s\S]*?<\/entry>/g) || [];

      console.log(`r/${subreddit}: Found ${entries.length} posts`);

      for (const entry of entries) {
        const idMatch = entry.match(/<id>t3_(.*?)<\/id>/);
        const titleMatch = entry.match(/<title>([\s\S]*?)<\/title>/);
        const authorMatch = entry.match(/<name>\/u\/(.*?)<\/name>/);
        const publishedMatch = entry.match(/<published>(.*?)<\/published>/);
        const linkMatch = entry.match(/<link href="(.*?)"/);
        const contentMatch = entry.match(
          /<content[^>]*>([\s\S]*?)<\/content>/,
        );

        if (!idMatch || !titleMatch) continue;

        const selftext = contentMatch ? extractSelftext(contentMatch[1]) : "";

        // Filtres de qualité (identiques à l'ancienne implémentation, minus
        // le filtre par score qui n'a plus de donnée à filtrer).
        if (!selftext || selftext.length < 50) continue;
        if (selftext === "[removed]" || selftext === "[deleted]") continue;

        const author = authorMatch ? authorMatch[1] : "unknown";
        if (author === "AutoModerator") continue;

        allPainPoints.push({
          sourceId: `reddit_${idMatch[1]}`,
          title: decodeEntities(titleMatch[1]),
          content: selftext,
          url: linkMatch ? linkMatch[1] : "",
          author,
          score: NEUTRAL_SCORE,
          metadata: {
            subreddit,
            createdUtc: publishedMatch
              ? Math.floor(new Date(publishedMatch[1]).getTime() / 1000)
              : undefined,
          },
          scrapedAt: new Date(),
        });
      }

      // Rate limiting : on espace largement les subreddits vu le quota serré
      // constaté sur le flux RSS anonyme.
      await new Promise((resolve) => setTimeout(resolve, 10000));
    } catch (error) {
      console.error(`Error scraping r/${subreddit}:`, error);
    }
  }

  console.log(`Total pain points collected: ${allPainPoints.length}`);
  return allPainPoints;
}
