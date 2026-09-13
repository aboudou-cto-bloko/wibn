import { generateJSON } from "@/lib/ai/groq";
import { ScoredPainPoint } from "@/types/scraper";

const BATCH_SIZE = 20;

/**
 * Regroupement par recoupement de mots-clés bruts (simple-clustering.ts,
 * similarité de Jaccard) : "invoice" et "billing" ne se recoupent jamais,
 * donc des pain points sémantiquement identiques mais formulés différemment
 * finissent systématiquement dans le fourre-tout "Autres problèmes divers"
 * (observé en conditions réelles : 36/36 pain points HN dans un seul
 * cluster, similarité Jaccard quasi nulle entre titres HN variés).
 *
 * Remplacement : demander à un LLM (Groq, déjà utilisé pour la génération
 * d'idées) d'assigner à chaque pain point un tag de sujet court et
 * cohérent — le regroupement final reste un simple group-by déterministe
 * sur ce tag, pas une classification statistique nécessitant des
 * embeddings (Groq n'expose aucun modèle d'embeddings, vérifié le
 * 2026-09-13 — seulement inférence texte/audio).
 *
 * Contexte "tags existants" : les tags déjà utilisés par les clusters en
 * base sont passés dans le prompt pour que le LLM réutilise un tag exact
 * plutôt que d'en inventer un proche mais différemment formulé — sans ça,
 * chaque run de clustering fragmenterait le même sujet en plusieurs
 * clusters au fil du temps.
 */
export async function tagPainPointsWithAI(
  painPoints: Pick<ScoredPainPoint, "sourceId" | "title" | "content">[],
  existingTags: string[],
): Promise<Map<string, string>> {
  const tagBySourceId = new Map<string, string>();
  const knownTags = [...existingTags];

  for (let i = 0; i < painPoints.length; i += BATCH_SIZE) {
    const batch = painPoints.slice(i, i + BATCH_SIZE);

    const itemsBlock = batch
      .map(
        (p, idx) =>
          `${idx + 1}. TITLE: ${p.title}\n   CONTENT: ${p.content.slice(0, 200)}`,
      )
      .join("\n\n");

    const existingBlock =
      knownTags.length > 0
        ? `TAGS DÉJÀ UTILISÉS (réutilise un tag EXACT de cette liste si le pain point correspond clairement, n'en invente un nouveau que si aucun ne convient) :\n${knownTags.map((t) => `- ${t}`).join("\n")}\n\n`
        : "";

    const prompt = `Tu catégorises des problèmes utilisateurs réels en groupes thématiques, pour un pipeline de génération d'idées SaaS.

${existingBlock}Pour chaque pain point numéroté ci-dessous, assigne UN tag de sujet court (2 à 5 mots, Title Case, ex: "Invoicing & Billing", "Hiring & Recruiting", "Customer Support Tooling") qui capture le domaine de problème central — assez large pour regrouper plusieurs posts similaires, assez précis pour être utile (évite les tags vagues comme "General" ou "Other" ou "Misc").

${itemsBlock}

Réponds en JSON EXACTEMENT avec cette structure (même ordre, même nombre d'éléments que la liste ci-dessus) :
{
  "tags": ["<tag du pain point 1>", "<tag du pain point 2>", ...]
}`;

    try {
      const result = await generateJSON<{ tags: string[] }>(prompt, {
        temperature: 0.3,
        maxTokens: 2000,
      });

      if (!Array.isArray(result.tags) || result.tags.length !== batch.length) {
        console.error(
          `AI tagging: réponse invalide (attendu ${batch.length} tags, reçu ${result.tags?.length}) — fallback pour ce batch`,
        );
        continue;
      }

      batch.forEach((point, idx) => {
        const tag = result.tags[idx]?.trim();
        if (tag) {
          tagBySourceId.set(point.sourceId, tag);
          if (!knownTags.some((t) => t.toLowerCase() === tag.toLowerCase())) {
            knownTags.push(tag);
          }
        }
      });
    } catch (error) {
      console.error(
        `AI tagging: erreur sur le batch ${i}-${i + batch.length}:`,
        error,
      );
      // Ce batch reste sans tag — generate-clusters.ts route les pain
      // points non tagués vers le fallback Jaccard (simple-clustering.ts),
      // pas de perte silencieuse de données.
    }
  }

  return tagBySourceId;
}
