import { RawPainPoint } from "@/types/scraper";
import { stripLoneSurrogates } from "./sanitize";

export interface NewsScraperConfig {
  /** URLs de flux RSS (ex: "https://techcabal.com/feed"). */
  feeds: string[];
  /** Nombre max d'articles retenus par flux. */
  limit?: number;
}

/**
 * Décode les entités HTML les plus courantes d'un flux RSS.
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
 * Extrait le texte d'un tag RSS, qu'il soit en clair ou encapsulé dans un
 * CDATA (<title><![CDATA[...]]></title> — très fréquent sur les flux
 * WordPress, dont sont bâtis TechCabal/Techpoint Africa/Disrupt Africa).
 */
function extractTag(xml: string, tag: string): string {
  const cdataMatch = xml.match(
    new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`),
  );
  if (cdataMatch) return cdataMatch[1].trim();

  const plainMatch = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
  if (!plainMatch) return "";

  return decodeEntities(plainMatch[1].replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Scrape des flux RSS de presse tech (WordPress standard — pas d'auth, pas
 * de clé). Nature différente de Reddit/HN/Play Store : ce sont des
 * articles édités, pas des plaintes brutes d'utilisateurs — un signal
 * "marché/tendances" (startups qui galèrent, problèmes réglementaires,
 * échecs commentés) plutôt qu'un signal "frustration individuelle". Le
 * score est neutre (pas de notion d'engagement exposée par un flux RSS
 * simple), la composante mots-clés/longueur du pain-scorer fait le tri.
 */
export async function scrapeNews(
  config: NewsScraperConfig,
): Promise<RawPainPoint[]> {
  const { feeds, limit = 30 } = config;
  const allPainPoints: RawPainPoint[] = [];
  const NEUTRAL_SCORE = 40;

  for (const feedUrl of feeds) {
    try {
      const response = await fetch(feedUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "application/rss+xml, application/xml, text/xml",
        },
      });

      if (!response.ok) {
        console.error(`Failed to fetch feed ${feedUrl}: ${response.status}`);
        continue;
      }

      const xml = await response.text();
      const items = (xml.match(/<item>[\s\S]*?<\/item>/g) || []).slice(
        0,
        limit,
      );

      console.log(`${feedUrl}: ${items.length} articles trouvés`);

      for (const item of items) {
        const title = extractTag(item, "title");
        const description = extractTag(item, "description");
        const link = item.match(/<link>([\s\S]*?)<\/link>/)?.[1]?.trim();
        const pubDate = item.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1];
        const guid = item.match(/<guid[^>]*>([\s\S]*?)<\/guid>/)?.[1]?.trim();
        const author = item
          .match(/<dc:creator>([\s\S]*?)<\/dc:creator>/)?.[1]
          ?.trim();

        if (!title || description.length < 50) continue;

        allPainPoints.push({
          sourceId: `news_${guid || link || `${feedUrl}_${title}`}`,
          // stripLoneSurrogates : voir sanitize.ts (défensif, bug rencontré
          // sur le scraper Play Store).
          title: stripLoneSurrogates(title),
          content: stripLoneSurrogates(description),
          url: link || feedUrl,
          author: author || new URL(feedUrl).hostname,
          score: NEUTRAL_SCORE,
          metadata: {
            feed: new URL(feedUrl).hostname,
          },
          scrapedAt: pubDate ? new Date(pubDate) : new Date(),
        });
      }
    } catch (error) {
      console.error(`Error scraping feed ${feedUrl}:`, error);
    }
  }

  console.log(`Total pain points collected: ${allPainPoints.length}`);
  return allPainPoints;
}
