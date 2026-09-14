import { generateJSON } from "./groq";
import { Cluster } from "@/lib/clustering/simple-clustering";

export interface SaaSIdea {
  title: string;
  tagline: string;
  description: string;
  targetAudience: string;
  features: string[];
  pricingModel: string;
  estimatedMRR: string;
  competitors: string[];
  moat: string;
}

interface PricingTier {
  name: string;
  pricePerMonth: number;
  description: string;
}

interface AdoptionPhase {
  label: string;
  // Doit utiliser exactement les noms de pricingTiers[].name.
  tierCounts: Record<string, number>;
}

interface SaaSIdeaDraft {
  title: string;
  tagline: string;
  description: string;
  targetAudience: string;
  features: string[];
  pricingTiers: PricingTier[];
  adoptionPhases: AdoptionPhase[];
  competitors: string[];
  moat: string;
}

/**
 * Calcule le MRR réel à partir des tiers de pricing et des hypothèses
 * d'adoption — en code, pas par le LLM. Une revue manuelle d'une idée
 * générée (2026-09-13) a trouvé des additions fausses dans le MRR estimé
 * par le LLM (ex: Mois 4-6 annoncé à 12 250 $ alors que 70×49+25×149+5×399
 * = 9 150 $) : l'arithmétique n'est pas un point fort fiable d'un LLM,
 * donc on la retire complètement de son périmètre — il ne fait que
 * proposer les tiers/l'adoption, le calcul est déterministe.
 */
function computeMRR(tiers: PricingTier[], phases: AdoptionPhase[]): string {
  const priceByTier = new Map(tiers.map((t) => [t.name, t.pricePerMonth]));

  return phases
    .map((phase) => {
      const mrr = Object.entries(phase.tierCounts || {}).reduce(
        (sum, [tierName, count]) => {
          const price = priceByTier.get(tierName);
          if (price === undefined) {
            console.warn(
              `computeMRR: tier "${tierName}" absent de pricingTiers, ignoré`,
            );
            return sum;
          }
          return sum + price * count;
        },
        0,
      );
      return `${phase.label}: $${mrr.toLocaleString("en-US")}/mo`;
    })
    .join(", ");
}

function formatPricingModel(tiers: PricingTier[]): string {
  return tiers
    .map((t) => `${t.name} — $${t.pricePerMonth}/mo: ${t.description}`)
    .join(". ");
}

/**
 * Passe d'auto-critique : un second appel Groq relit le draft comme le
 * ferait un reviewer produit sceptique, et vérifie que CHAQUE feature sert
 * bien le persona cible annoncé. Sans ça, un cluster regroupant des pain
 * points au bord de la cohérence peut produire une idée "couteau suisse"
 * mélangeant des capacités sans rapport (ex: idée "HouseDesk" générée le
 * 2026-09-13 : éditeur AR + simulateur de sondages + analytics Segment-like
 * pour un persona "développeur AR indépendant" qui n'a besoin que du
 * premier). Le fix de fond est le clustering par tag IA (voir
 * generate-clusters.ts) qui évite désormais de regrouper des pain points
 * sans rapport — cette passe est le filet de sécurité côté génération.
 */
async function critiqueCoherence(
  draft: Pick<SaaSIdeaDraft, "targetAudience" | "features">,
): Promise<{ targetAudience: string; features: string[] }> {
  const prompt = `You are a skeptical product reviewer. A SaaS idea has been drafted with this target audience and feature list:

TARGET AUDIENCE: ${draft.targetAudience}

FEATURES:
${draft.features.map((f, i) => `${i + 1}. ${f}`).join("\n")}

Check EVERY feature against the target audience: would this exact persona, in their day-to-day workflow, actually use it? A feature that clearly belongs to a different job/workflow than the stated persona (e.g. mixing AR asset editing with survey simulation with marketing analytics for one narrow persona) is INCOHERENT and must be removed or the persona must be broadened to genuinely cover it.

Respond in JSON:
{
  "coherent": boolean,
  "reasoning": "one sentence explaining your verdict",
  "revisedTargetAudience": "same as input if coherent=true, otherwise a persona that genuinely covers every remaining feature",
  "revisedFeatures": ["same list as input if coherent=true, otherwise the incoherent ones removed"]
}`;

  try {
    const result = await generateJSON<{
      coherent: boolean;
      reasoning: string;
      revisedTargetAudience?: string;
      revisedFeatures?: string[];
    }>(prompt, { temperature: 0.2, maxTokens: 1000 });

    if (!result.coherent) {
      console.log(`Idea coherence critique: ${result.reasoning}`);
    }

    return {
      targetAudience: result.revisedTargetAudience || draft.targetAudience,
      features:
        result.revisedFeatures && result.revisedFeatures.length > 0
          ? result.revisedFeatures
          : draft.features,
    };
  } catch (error) {
    console.error(
      "Coherence critique failed, keeping draft unchanged:",
      error,
    );
    return draft;
  }
}

export interface ExistingIdeaRef {
  title: string;
  tagline: string | null;
}

/**
 * Vérifie que le draft n'est pas juste une resucée d'une idée déjà générée
 * (deux clusters différents peuvent décrire le même produit sous-jacent,
 * ou le même cluster peut être re-tagué légèrement différemment d'un run
 * à l'autre). Sans ce filet, la table `ideas` accumule des doublons quasi
 * identiques au fil des runs successifs de scraping/clustering.
 */
async function checkDuplicate(
  draft: Pick<SaaSIdeaDraft, "title" | "tagline" | "description">,
  existingIdeas: ExistingIdeaRef[],
): Promise<{ isDuplicate: boolean; reasoning?: string }> {
  if (existingIdeas.length === 0) return { isDuplicate: false };

  const existingBlock = existingIdeas
    .map((idea, i) => `${i + 1}. ${idea.title} — ${idea.tagline || ""}`)
    .join("\n");

  const prompt = `You are checking a NEW SaaS idea draft against a list of ALREADY GENERATED ideas, to avoid saving near-duplicates.

NEW IDEA:
Title: ${draft.title}
Tagline: ${draft.tagline}
Description: ${draft.description.slice(0, 400)}

ALREADY GENERATED IDEAS:
${existingBlock}

Is the new idea substantially the SAME product/solution as one of the existing ones (same core mechanism AND same target user — not just the same broad category)? Being in the same general space (e.g. two different "email tools") is NOT enough to count as duplicate — only flag it if a user reading both would think "wait, isn't this the same thing I just saw?".

Respond in JSON:
{ "isDuplicate": boolean, "matchedTitle": "title of the match, or null", "reasoning": "one sentence" }`;

  try {
    const result = await generateJSON<{
      isDuplicate: boolean;
      matchedTitle?: string | null;
      reasoning: string;
    }>(prompt, { temperature: 0.1, maxTokens: 300 });

    if (result.isDuplicate) {
      console.log(
        `Idea duplicate check: "${draft.title}" flagged as duplicate of "${result.matchedTitle}" — ${result.reasoning}`,
      );
    }

    return { isDuplicate: result.isDuplicate, reasoning: result.reasoning };
  } catch (error) {
    console.error(
      "Duplicate check failed, keeping the idea (fail-open):",
      error,
    );
    return { isDuplicate: false };
  }
}

/**
 * Retourne `null` quand l'idée générée est un doublon d'une idée déjà en
 * base (voir checkDuplicate) — l'appelant (generate-ideas.ts) doit alors
 * ignorer ce cluster plutôt que sauvegarder l'idée.
 */
export async function generateSaaSIdea(
  cluster: Cluster,
  existingIdeas: ExistingIdeaRef[] = [],
): Promise<SaaSIdea | null> {
  // Sélectionne les meilleurs pain points (top 5)
  const topPainPoints = cluster.painPoints
    .sort((a, b) => b.painScore - a.painScore)
    .slice(0, 5)
    .map((p, idx) => {
      const snippet = p.content.substring(0, 250).replace(/\n/g, " ");
      // subreddit (reddit), tags (hn), appId+note (playstore) ou feed
      // (news) selon la source — voir src/lib/db/schema.ts:PainPointMetadata.
      const context =
        (p.metadata.subreddit as string) ||
        (Array.isArray(p.metadata.tags)
          ? (p.metadata.tags as string[]).join(", ")
          : undefined) ||
        (p.metadata.appId
          ? `${p.metadata.appId} (${p.metadata.rating}★ review)`
          : undefined) ||
        (p.metadata.feed as string) ||
        "unknown";
      return `${idx + 1}. "${p.title}" (Score: ${p.painScore}/100)
   Context: ${snippet}...
   Source: ${context}`;
    })
    .join("\n\n");

  // Calcule des statistiques sur le cluster
  const stats = {
    totalPoints: cluster.painPoints.length,
    avgScore: cluster.avgPainScore,
    topScore: Math.max(...cluster.painPoints.map((p) => p.painScore)),
    keywords: cluster.keywords.slice(0, 5),
  };

  const prompt = `You are a SaaS product strategist analyzing REAL user pain points scraped from Reddit and Hacker News. Based on the following cluster of related problems, generate ONE specific, actionable SaaS product idea.

CLUSTER OVERVIEW:
- Name: ${cluster.name}
- Pain Points: ${stats.totalPoints} users
- Avg Pain Score: ${stats.avgScore}/100 (Max: ${stats.topScore}/100)
- Key Topics: ${stats.keywords.join(", ")}

TOP PAIN POINTS FROM REAL USERS:
${topPainPoints}

INSTRUCTIONS:
- Be SPECIFIC. No generic solutions.
- Focus on the EXACT problem these users describe.
- Use the keywords and context from their messages.
- Make it REALISTIC and buildable by a small team.
- COHERENCE IS CRITICAL: pick ONE narrow target persona and make every single
  feature something that exact persona would use in their actual workflow.
  Do NOT combine capabilities that belong to different jobs/workflows just
  because they came from the same cluster — if the pain points genuinely
  describe different problems, focus the whole idea on the single strongest
  one instead of stitching a "kitchen sink" product together.
- Pricing should match the pain level (higher pain = higher willingness to pay).
- Do not invent named competitors you are not confident are real — prefer
  naming a category of alternative ("generic note-taking apps") over a
  fabricated specific product name if unsure.

Generate a JSON response with this EXACT structure:
{
  "title": "Specific product name (not generic)",
  "tagline": "One compelling sentence that captures the core value",
  "description": "2-3 detailed paragraphs: (1) The exact problem from the pain points, (2) How your solution works, (3) Why it's better than existing alternatives. Reference the actual user frustrations.",
  "targetAudience": "One narrow, specific persona with job title, company size, and specific pain (e.g., 'SaaS founders at $10-50K MRR struggling with customer analytics') — every feature below must serve THIS persona specifically",
  "features": [
    "Feature 1: Specific capability that solves the main pain point",
    "Feature 2: Another must-have based on user complaints",
    "Feature 3: Differentiator from competitors",
    "Feature 4: Integration or workflow feature users mentioned",
    "Feature 5: Advanced capability for power users"
  ],
  "pricingTiers": [
    { "name": "<tier name>", "pricePerMonth": <number>, "description": "what's included" },
    { "name": "<tier name>", "pricePerMonth": <number>, "description": "what's included" },
    { "name": "<tier name>", "pricePerMonth": <number>, "description": "what's included" }
  ],
  "adoptionPhases": [
    { "label": "Month 1-3 (Beta)", "tierCounts": { "<tier name>": <number>, ... } },
    { "label": "Month 4-6 (Launch)", "tierCounts": { "<tier name>": <number>, ... } },
    { "label": "Month 7-12 (Growth)", "tierCounts": { "<tier name>": <number>, ... } }
  ],
  "competitors": [
    "Direct Competitor 1: What they do and their weakness",
    "Direct Competitor 2: What they do and their weakness",
    "Indirect Alternative: What people use now and why it sucks"
  ],
  "moat": "2-3 sentences explaining: (1) What makes this defensible (network effects, data moat, technical complexity, or unique insight), (2) Why competitors can't easily replicate it, (3) The unfair advantage you can build over time."
}

IMPORTANT:
- tierCounts keys MUST exactly match a "name" in pricingTiers — do not invent tier names in adoptionPhases that don't appear in pricingTiers.
- Prices and adoption counts MUST be numbers you choose specifically for THIS
  cluster (avg pain score ${stats.avgScore}/100, ${stats.totalPoints} pain
  points) — every field above marked <number>/<tier name> is a placeholder
  you must replace with your own reasoning, never reuse round numbers like
  29/99/299 or adoption counts like 20/60/150 out of habit; a niche/low-pain
  cluster should look financially different from a broad/high-pain one.
- Reference the actual keywords: ${stats.keywords.join(", ")}
- Make pricing proportional to pain score (${stats.avgScore}/100)
- NO generic fluff or marketing speak
- Be brutally specific and actionable`;

  try {
    const draft = await generateJSON<SaaSIdeaDraft>(prompt, {
      temperature: 0.8,
      maxTokens: 3000,
    });

    if (!draft.title || !draft.tagline || !draft.description) {
      throw new Error("Incomplete idea generated");
    }

    const { isDuplicate } = await checkDuplicate(draft, existingIdeas);
    if (isDuplicate) {
      return null;
    }

    const { targetAudience, features } = await critiqueCoherence({
      targetAudience: draft.targetAudience,
      features: draft.features,
    });

    return {
      title: draft.title,
      tagline: draft.tagline,
      description: draft.description,
      targetAudience,
      features,
      pricingModel: formatPricingModel(draft.pricingTiers || []),
      estimatedMRR: computeMRR(
        draft.pricingTiers || [],
        draft.adoptionPhases || [],
      ),
      competitors: draft.competitors,
      moat: draft.moat,
    };
  } catch (error) {
    console.error("Error generating SaaS idea:", error);

    return {
      title: `Solution for ${cluster.name}`,
      tagline: `Solve ${cluster.keywords[0]} problems automatically`,
      description: `Based on ${cluster.painPoints.length} user pain points with an average score of ${cluster.avgPainScore}/100.`,
      targetAudience: "Users in the analyzed communities",
      features: cluster.keywords.map((k) => `Feature related to ${k}`),
      pricingModel: "Freemium with paid tiers at $29 and $99/month",
      estimatedMRR: "To be determined after market validation",
      competitors: ["To be researched"],
      moat: "Data-driven insights from real user pain points",
    };
  }
}
