import { ScoredPainPoint } from "@/types/scraper";

export interface Cluster {
  id: string;
  name: string;
  description: string;
  painPoints: ScoredPainPoint[];
  avgPainScore: number;
  keywords: string[];
}

// Cache pour éviter de recalculer les mots-clés plusieurs fois
const keywordCache = new Map<string, Set<string>>();
const stopWords = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "but",
  "in",
  "on",
  "at",
  "to",
  "for",
  "of",
  "with",
  "by",
  "from",
  "as",
  "is",
  "was",
  "are",
  "been",
  "be",
  "have",
  "has",
  "had",
  "do",
  "does",
  "did",
  "will",
  "would",
  "could",
  "should",
  "may",
  "might",
  "can",
  "this",
  "that",
  "these",
  "those",
  "i",
  "you",
  "he",
  "she",
  "it",
  "we",
  "they",
  "my",
  "your",
  "his",
  "her",
  "its",
  "our",
  "their",
  "has",
  "not",
  "so",
  "then",
  "just",
  "than",
  "more",
  "also",
  "very",
  "what",
  "which",
  "who",
  "when",
  "where",
  "how",
  "why",
  "all",
  "any",
  "both",
  "each",
  "few",
  "more",
  "most",
  "other",
  "some",
  "such",
  "no",
  "nor",
  "too",
  "same",
  "own",
]);

function extractKeywords(text: string): Set<string> {
  const cacheKey = text.toLowerCase().trim();
  if (keywordCache.has(cacheKey)) {
    return keywordCache.get(cacheKey)!;
  }

  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((word) => {
      // Filtre rapide avec Set lookup
      if (stopWords.has(word)) return false;
      if (word.length < 4) return false;
      if (/^\d+$/.test(word)) return false;

      // Filtre les mots trop courants non-techniques
      const commonWords = new Set([
        "like",
        "want",
        "need",
        "make",
        "take",
        "use",
        "get",
        "see",
        "know",
        "will",
        "have",
        "been",
        "that",
        "this",
        "what",
        "when",
        "here",
        "your",
        "just",
        "only",
        "there",
        "should",
        "would",
        "could",
        "self",
        "tell",
        "done",
        "some",
        "years",
        "year",
      ]);
      if (commonWords.has(word)) return false;

      return true;
    });

  const keywordSet = new Set(words);
  keywordCache.set(cacheKey, keywordSet);
  return keywordSet;
}

// Version optimisée du calcul de similarité Jaccard
function calculateSimilarity(setA: Set<string>, setB: Set<string>): number {
  if (setA.size === 0 || setB.size === 0) return 0;

  // Utilise l'optimisation pour les sets de tailles très différentes
  if (setA.size > setB.size * 2 || setB.size > setA.size * 2) {
    return 0; // Taille trop différente, peu probable d'être similaire
  }

  let intersection = 0;
  // Itère sur le plus petit set pour optimiser
  const [smallerSet, largerSet] =
    setA.size <= setB.size ? [setA, setB] : [setB, setA];

  for (const word of smallerSet) {
    if (largerSet.has(word)) {
      intersection++;
    }
  }

  const union = setA.size + setB.size - intersection;
  return intersection / union;
}

// Prétraitement des points pour optimiser les calculs
interface PreprocessedPoint {
  point: ScoredPainPoint;
  keywords: Set<string>;
  vector?: number[]; // Pour future utilisation avec embeddings
}

function preprocessPoints(painPoints: ScoredPainPoint[]): PreprocessedPoint[] {
  return painPoints.map((point) => ({
    point,
    keywords: extractKeywords(`${point.title} ${point.content}`),
  }));
}

// Version optimisée de getTopKeywords
function getTopKeywords(keywords: string[], limit: number): string[] {
  const counts = new Map<string, number>();

  // Comptage optimisé sans utiliser flatMap pour éviter de créer des tableaux intermédiaires
  for (const keyword of keywords) {
    counts.set(keyword, (counts.get(keyword) || 0) + 1);
  }

  // Utilise un tri partiel pour n'obtenir que les top N
  const entries = Array.from(counts.entries());

  if (entries.length <= limit) {
    return entries.sort((a, b) => b[1] - a[1]).map(([word]) => word);
  }

  // Tri partiel : on ne trie que les top éléments
  const topEntries = entries.sort((a, b) => b[1] - a[1]).slice(0, limit);

  return topEntries.map(([word]) => word);
}

/**
 * Clustering optimisé avec amélioration des performances
 */
export function clusterPainPoints(
  painPoints: ScoredPainPoint[],
  minClusterSize: number = 2,
  similarityThreshold: number = 0.2,
): Cluster[] {
  if (painPoints.length === 0) return [];

  const preprocessedPoints = preprocessPoints(painPoints);
  const clusters: Cluster[] = [];
  const used = new Set<string>();

  preprocessedPoints.sort((a, b) => b.point.painScore - a.point.painScore);

  for (let i = 0; i < preprocessedPoints.length; i++) {
    const current = preprocessedPoints[i];
    if (used.has(current.point.sourceId)) continue;

    const similarIndices: number[] = [i];

    for (let j = i + 1; j < preprocessedPoints.length; j++) {
      if (used.has(preprocessedPoints[j].point.sourceId)) continue;

      const similarity = calculateSimilarity(
        current.keywords,
        preprocessedPoints[j].keywords,
      );

      if (similarity > similarityThreshold) {
        similarIndices.push(j);
      }

      if (similarIndices.length >= 10) break;
    }

    if (similarIndices.length >= minClusterSize) {
      const clusterPoints = similarIndices.map(
        (idx) => preprocessedPoints[idx].point,
      );

      const allKeywords: string[] = [];
      similarIndices.forEach((idx) => {
        preprocessedPoints[idx].keywords.forEach((keyword) => {
          allKeywords.push(keyword);
        });
      });

      const topKeywords = getTopKeywords(allKeywords, 5);

      const topClusterPoints = clusterPoints
        .slice(0, 3)
        .sort((a, b) => b.painScore - a.painScore);

      const description = topClusterPoints
        .map((p, idx) => `${idx + 1}. ${p.title.substring(0, 80)}...`)
        .join("\n");

      clusters.push({
        id: `cluster_${clusters.length + 1}`,
        name: generateClusterName(topKeywords),
        description:
          description.length > 150
            ? description.substring(0, 150) + "..."
            : description,
        painPoints: clusterPoints,
        avgPainScore: Math.round(
          clusterPoints.reduce((sum, p) => sum + p.painScore, 0) /
            clusterPoints.length,
        ),
        keywords: topKeywords,
      });

      similarIndices.forEach((idx) => {
        used.add(preprocessedPoints[idx].point.sourceId);
      });
    }
  }

  const remainingPoints = preprocessedPoints
    .filter((p) => !used.has(p.point.sourceId))
    .map((p) => p.point);

  // Bug corrigé : ce bloc ne s'exécutait qu'en dessous de minClusterSize,
  // donc dès qu'il restait minClusterSize+ points non regroupés (le cas
  // fréquent), ils disparaissaient silencieusement — jamais de clusterId,
  // jamais visibles, jamais utilisés pour générer une idée.
  if (remainingPoints.length > 0) {
    const otherKeywords = new Set<string>();
    remainingPoints.forEach((point) => {
      extractKeywords(`${point.title} ${point.content}`).forEach((k) =>
        otherKeywords.add(k),
      );
    });

    const topOtherKeywords = getTopKeywords(Array.from(otherKeywords), 3);

    clusters.push({
      id: `cluster_others`,
      name: "Autres problèmes divers",
      description: `${remainingPoints.length} problèmes isolés non regroupés`,
      painPoints: remainingPoints,
      avgPainScore: Math.round(
        remainingPoints.reduce((sum, p) => sum + p.painScore, 0) /
          remainingPoints.length,
      ),
      keywords: topOtherKeywords,
    });
  }

  return clusters.sort((a, b) => b.avgPainScore - a.avgPainScore);
}

function generateClusterName(keywords: string[]): string {
  if (keywords.length === 0) return "Cluster sans mots-clés";

  // Utilise les mots-clés les plus significatifs
  const meaningfulKeywords = keywords
    .filter((k) => k.length > 4) // Privilégie les mots plus longs
    .slice(0, 3);

  if (meaningfulKeywords.length === 0) {
    return keywords.slice(0, 2).join(" / ");
  }

  return meaningfulKeywords.join(" / ");
}

/**
 * Fonction utilitaire pour évaluer la qualité du clustering
 */
export function evaluateClustering(clusters: Cluster[]): {
  totalClusters: number;
  totalPoints: number;
  avgClusterSize: number;
  avgPainScore: number;
  distribution: { min: number; max: number; avg: number }[];
} {
  const totalPoints = clusters.reduce(
    (sum, cluster) => sum + cluster.painPoints.length,
    0,
  );
  const avgClusterSize = totalPoints / clusters.length;
  const avgPainScore =
    clusters.reduce((sum, cluster) => sum + cluster.avgPainScore, 0) /
    clusters.length;

  const distribution = clusters.map((cluster) => ({
    min: Math.min(...cluster.painPoints.map((p) => p.painScore)),
    max: Math.max(...cluster.painPoints.map((p) => p.painScore)),
    avg: cluster.avgPainScore,
  }));

  return {
    totalClusters: clusters.length,
    totalPoints,
    avgClusterSize,
    avgPainScore,
    distribution,
  };
}
