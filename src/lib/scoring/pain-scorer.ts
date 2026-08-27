import { RawPainPoint, ScoredPainPoint } from "@/types/scraper";

/**
 * Score un pain point de 0 à 100 basé sur plusieurs critères
 */
export function scorePainPoint(painPoint: RawPainPoint): ScoredPainPoint {
  let score = 0;

  // 1. Score basé sur l'engagement (30 points max)
  const engagementScore = Math.min(30, (painPoint.score / 100) * 30);
  score += engagementScore;

  // 2. Mots-clés de frustration enrichis (40 points max)
  const frustrationKeywords = [
    // Émotions négatives
    "frustrating",
    "frustrated",
    "frustration",
    "annoying",
    "annoyed",
    "annoyance",
    "hate",
    "hating",
    "loathe",
    "despise",
    "awful",
    "terrible",
    "horrible",
    "dreadful",
    "ridiculous",
    "absurd",
    "ludicrous",
    "painful",
    "exhausting",
    "draining",

    // Fatigue/découragement
    "tired of",
    "sick of",
    "fed up with",
    "can't stand",
    "can't bear",
    "can't handle",
    "burned out",
    "burnout",
    "overwhelmed",

    // Problèmes non résolus
    "why is there no",
    "why doesn't",
    "why can't",
    "wish there was",
    "wish there were",
    "need a solution",
    "need a way to",
    "looking for alternative",
    "seeking alternative",

    // Inefficacité
    "waste of time",
    "time-consuming",
    "inefficient",
    "clunky",
    "cumbersome",
    "tedious",
    "repetitive",
    "manual work",

    // Difficultés techniques
    "struggling with",
    "difficult to",
    "hard to",
    "complicated",
    "complex",
    "confusing",
    "can't figure out",
    "don't understand how",

    // Manques et lacunes
    "doesn't exist",
    "is missing",
    "lacking",
    "no way to",
    "impossible to",
    "can't find",
    "nowhere to be found",
    "unavailable",

    // Coûts
    "too expensive",
    "overpriced",
    "costly",
    "limited",
    "restrictive",
    "constraining",
    "doesn't support",
    "not compatible with",

    // Fiabilité
    "unreliable",
    "buggy",
    "glitchy",
    "crashes",
    "freezes",
    "slow",
    "laggy",
    "poor quality",
    "subpar",
    "mediocre",

    // Support
    "poor documentation",
    "no documentation",
    "bad support",
    "no support",
    "unhelpful",

    // Expressions interrogatives
    "how come",
    "what's the point",
    "is it just me",
    "does anyone else",
    "am I the only one",

    // Alternatives
    "looking for",
    "searching for",
    "trying to find",
    "any suggestions",
    "any recommendations",

    // Urgence
    "urgent",
    "asap",
    "immediate",
    "critical",
    "blocking",
    "blocked",
    "stuck",
    "dead end",

    // Nouveaux termes spécifiques aux sources
    "rant",
    "vent",
    "complaint",
    "issue",
    "problem with",
    "trouble with",
    "challenge with",
    "failed to",
    "won't work",
    "doesn't work",
    "broken",
    "malfunction",
    "error",
    "bug",
    "update broke",
    "update ruined",
    "regression",
    "downgrade",
    "worse",
    "worsened",
    "deteriorated",

    // Termes de comparaison négative
    "used to be better",
    "was better before",
    "other tools have",
    "competitors have",
    "missing feature",
    "basic feature",
    "should have",
    "expected to have",

    // Termes émotionnels forts
    "disappointed",
    "disappointing",
    "let down",
    "infuriating",
    "maddening",
    "enraging",
    "stressful",
    "anxiety",
    "worried",
    "scared",
    "afraid",
    "fear",

    // Abandon/Considération d'alternatives
    "switching to",
    "moving to",
    "migrating to",
    "looking elsewhere",
    "searching for replacement",
    "giving up on",
    "quitting",
    "leaving",

    // Termes communautaires (pour Reddit/HN)
    "PSA",
    "FYI",
    "warning",
    "caution",
    "avoid this",
    "stay away from",
    "don't use",
    "worst part",
    "biggest issue",
    "main problem",

    // Expressions de temps perdu
    "hours wasted",
    "days wasted",
    "time lost",
    "spent hours",
    "spent days",
    "too long",

    // Dépendance non voulue
    "locked in",
    "vendor lock-in",
    "can't escape",
    "dependent on",
    "reliant on",
    "stuck with",
  ];

  const text = `${painPoint.title} ${painPoint.content}`.toLowerCase();

  // Compter les occurrences uniques de mots-clés
  const uniqueMatches = new Set<string>();
  frustrationKeywords.forEach((keyword) => {
    if (text.includes(keyword.toLowerCase())) {
      uniqueMatches.add(keyword);
    }
  });

  // Score basé sur le nombre de mots-clés uniques trouvés
  const keywordScore = Math.min(40, uniqueMatches.size * 8);
  score += keywordScore;

  // 3. Longueur du contenu (15 points max)
  const contentLength = painPoint.content.length;
  const lengthScore = Math.min(15, (contentLength / 500) * 15);
  score += lengthScore;

  // 4. Questions et incertitude (15 points)
  const questionRegex =
    /(?:\?|how to|how do|how can|what if|why|why not|is there|are there)/i;
  const hasQuestionOrUncertainty = questionRegex.test(text);
  if (hasQuestionOrUncertainty) {
    score += 15;
  }

  // Note: Pas de bonus pour duplicateCount car non présent dans RawPainPoint
  // Si cette information existe, elle doit être dans metadata

  return {
    ...painPoint,
    painScore: Math.min(100, Math.round(score)),
  };
}

/**
 * Filtre les pain points par score minimum
 */
export function filterByMinScore(
  painPoints: ScoredPainPoint[],
  minScore: number = 40,
): ScoredPainPoint[] {
  return painPoints
    .filter((p) => p.painScore >= minScore)
    .sort((a, b) => b.painScore - a.painScore);
}

/**
 * Fonction utilitaire pour analyser les sources fréquentes de pain points
 * (Ne modifie pas les types, utilise uniquement les données existantes)
 */
export function analyzePainPointSources(
  painPoints: ScoredPainPoint[],
): { sourceId: string; count: number; avgScore: number }[] {
  const sourceMap = new Map<string, { count: number; totalScore: number }>();

  painPoints.forEach((point) => {
    const existing = sourceMap.get(point.sourceId) || {
      count: 0,
      totalScore: 0,
    };
    sourceMap.set(point.sourceId, {
      count: existing.count + 1,
      totalScore: existing.totalScore + point.painScore,
    });
  });

  return Array.from(sourceMap.entries())
    .map(([sourceId, data]) => ({
      sourceId,
      count: data.count,
      avgScore: Math.round((data.totalScore / data.count) * 10) / 10,
    }))
    .sort((a, b) => b.avgScore - a.avgScore);
}

/**
 * Fonction pour regrouper par auteur récurrent
 * (Utile pour identifier les power users ou utilisateurs particulièrement frustrés)
 */
export function groupByRecurringAuthors(
  painPoints: ScoredPainPoint[],
  minPosts: number = 2,
): { author: string; posts: ScoredPainPoint[]; avgScore: number }[] {
  const authorMap = new Map<string, ScoredPainPoint[]>();

  painPoints.forEach((point) => {
    const existing = authorMap.get(point.author) || [];
    authorMap.set(point.author, [...existing, point]);
  });

  return Array.from(authorMap.entries())
    .filter(([, posts]) => posts.length >= minPosts)
    .map(([author, posts]) => ({
      author,
      posts: posts.sort((a, b) => b.painScore - a.painScore),
      avgScore:
        Math.round(
          (posts.reduce((sum, p) => sum + p.painScore, 0) / posts.length) * 10,
        ) / 10,
    }))
    .sort((a, b) => b.avgScore - a.avgScore);
}
