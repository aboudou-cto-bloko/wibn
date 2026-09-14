import { inngest } from "@/lib/inngest/client";
import { db } from "@/lib/db";
import { painPoints, clusters, scrapingJobs } from "@/lib/db/schema";
import {
  clusterPainPoints,
  evaluateClustering,
  describeClusterFromPoints,
  type Cluster,
} from "@/lib/clustering/simple-clustering";
import { tagPainPointsWithAI } from "@/lib/clustering/ai-tagger";
import { nanoid } from "nanoid";
import { isNull, eq, sql } from "drizzle-orm";
import { getSettings } from "@/lib/settings";

export const generateClustersFunction = inngest.createFunction(
  {
    id: "generate-clusters",
    name: "Generate Pain Point Clusters",
  },
  { event: "clustering/generate" },
  async ({ event, step }) => {
    // Fourni par l'appelant (POST /api/admin/clusters) pour que l'UI
    // puisse suivre ce job précis dès le déclenchement — même convention
    // que scrape-*.ts et generate-ideas.ts.
    const jobId: string = event.data?.jobId || nanoid();

    await step.run("create-job", async () => {
      await db.insert(scrapingJobs).values({
        id: jobId,
        source: "clustering",
        status: "running",
        config: {},
        startedAt: new Date(),
      });
    });

    const completeJob = async (count: number, errorMessage?: string) => {
      await db
        .update(scrapingJobs)
        .set({
          status: errorMessage ? "failed" : "completed",
          painPointsFound: count,
          errorMessage: errorMessage || null,
          completedAt: new Date(),
        })
        .where(eq(scrapingJobs.id, jobId));
    };

    // Filet de sécurité : voir generate-ideas.ts pour le pourquoi (job
    // resté bloqué en "running" sans ce garde-fou, bug rencontré avant sur
    // le scraper Play Store).
    try {
      return await runClustering();
    } catch (error) {
      await completeJob(
        0,
        error instanceof Error ? error.message : "Unknown error",
      ).catch(() => {});
      throw error;
    }

    async function runClustering() {
    const settings = await step.run("load-settings", async () => {
      return await getSettings();
    });

    if (!settings.clusteringEnabled) {
      await step.run("complete-job-disabled", async () =>
        completeJob(0, "Clustering is disabled in settings"),
      );
      return {
        jobId,
        message: "Clustering is disabled in settings",
        clustersGenerated: 0,
      };
    }

    // Récupère les pain points non clusterisés
    const unclusteredPoints = await step.run("fetch-pain-points", async () => {
      const points = await db
        .select()
        .from(painPoints)
        .where(isNull(painPoints.clusterId));

      console.log(`Found ${points.length} unclustered pain points`);

      return points.map((p) => ({
        sourceId: p.sourceId,
        title: p.title,
        content: p.content || "",
        url: p.url || "",
        author: p.author || "",
        score: p.sourceScore || 0,
        painScore: p.painScore || 0,
        metadata: p.metadata as Record<string, unknown>,
        scrapedAt: p.scrapedAt,
      }));
    });

    if (unclusteredPoints.length === 0) {
      await step.run("complete-job-empty", async () => completeJob(0));
      return {
        jobId,
        clustersGenerated: 0,
        totalPainPoints: 0,
        message: "No unclustered pain points found",
      };
    }

    // Noms des clusters déjà en base : passés au tagging IA pour qu'il
    // réutilise un tag exact plutôt que d'en inventer un synonyme, sans
    // quoi le même sujet se fragmenterait en plusieurs clusters au fil des
    // runs successifs.
    const existingClusterNames = await step.run(
      "fetch-existing-cluster-names",
      async () => {
        const rows = await db.select({ name: clusters.name }).from(clusters);
        return rows.map((r) => r.name).filter((n): n is string => !!n);
      },
    );

    // Tagging IA (Groq) : voir src/lib/clustering/ai-tagger.ts pour le
    // pourquoi (le clustering par recoupement de mots-clés bruts ne capte
    // aucune similarité sémantique entre formulations différentes du même
    // problème — observé en conditions réelles : 36/36 pain points HN
    // regroupés dans un seul cluster fourre-tout).
    // Map -> objet : la sortie d'un step Inngest doit être sérialisable
    // en JSON pour être persistée entre les steps.
    const tagBySourceId = await step.run("ai-tag-pain-points", async () => {
      const map = await tagPainPointsWithAI(
        unclusteredPoints,
        existingClusterNames,
      );
      return Object.fromEntries(map) as Record<string, string>;
    });

    const generatedClusters = await step.run(
      "cluster-pain-points",
      async () => {
        const tagged = unclusteredPoints.filter(
          (p) => tagBySourceId[p.sourceId],
        );
        const untagged = unclusteredPoints.filter(
          (p) => !tagBySourceId[p.sourceId],
        );

        console.log(
          `AI tagging: ${tagged.length} pain points tagués, ${untagged.length} en échec (fallback Jaccard)`,
        );

        // Group-by déterministe sur le tag IA (insensible à la casse).
        const groups = new Map<
          string,
          { displayName: string; points: typeof tagged }
        >();
        for (const point of tagged) {
          const tag = tagBySourceId[point.sourceId];
          const key = tag.toLowerCase();
          const group = groups.get(key);
          if (group) {
            group.points.push(point);
          } else {
            groups.set(key, { displayName: tag, points: [point] });
          }
        }

        // Un tag IA devient un cluster réel dès qu'il existe, quelle que
        // soit sa taille (y compris 1 seul pain point) : la cohérence vient
        // du tag sémantique lui-même, pas d'un seuil arbitraire. Forcer un
        // minimum ici revenait à jeter les tags trop petits dans le
        // fourre-tout Jaccard ci-dessous — exactement le mécanisme qui
        // produisait des clusters incohérents (des pain points sans rapport
        // regroupés ensemble, puis un LLM sommé d'en tirer un seul produit
        // cohérent : voir l'idée "HouseDesk" — AR + sondages + analytics
        // mélangés — générée à partir d'un tel fourre-tout).
        const aiClusters: Cluster[] = Array.from(groups.values()).map(
          ({ displayName, points }) => ({
            id: `ai_${displayName.toLowerCase().replace(/\s+/g, "_")}`,
            name: displayName,
            description: describeClusterFromPoints(points),
            painPoints: points,
            avgPainScore: Math.round(
              points.reduce((sum, p) => sum + p.painScore, 0) / points.length,
            ),
            keywords: [displayName],
          }),
        );

        // Fallback Jaccard uniquement pour les points où le tagging IA a
        // échoué (erreur réseau/parsing — voir ai-tagger.ts). Ce fallback
        // ne crée plus lui non plus de fourre-tout "Autres" : les points
        // sans paire suffisamment similaire restent non clusterisés
        // (cluster_id NULL) plutôt que rejoints de force — ils redeviennent
        // candidats au prochain run, une fois que d'autres points sur le
        // même sujet auront été scrapés.
        const fallbackClusters =
          untagged.length > 0
            ? clusterPainPoints(
                untagged,
                settings.minClusterSize,
                settings.similarityThreshold,
              ).filter((c) => c.id !== "cluster_others")
            : [];

        return [...aiClusters, ...fallbackClusters].sort(
          (a, b) => b.avgPainScore - a.avgPainScore,
        );
      },
    );

    // Évalue la qualité du clustering
    const evaluation = await step.run("evaluate-clustering", async () => {
      return evaluateClustering(generatedClusters);
    });

    console.log("Clustering evaluation:", evaluation);

    // Sauvegarde en DB — fusionne dans un cluster existant de même nom
    // (insensible à la casse) au lieu d'en recréer un doublon, pour que le
    // même sujet reste un cluster unique au fil des runs successifs.
    const savedCount = await step.run("save-clusters", async () => {
      for (const cluster of generatedClusters) {
        const [existing] = await db
          .select()
          .from(clusters)
          .where(sql`lower(${clusters.name}) = lower(${cluster.name})`);

        let clusterId: string;

        if (existing) {
          clusterId = existing.id;
          const prevCount = existing.painPointCount || 0;
          const prevAvg = existing.avgPainScore || 0;
          const newCount = prevCount + cluster.painPoints.length;
          const newAvg = Math.round(
            (prevAvg * prevCount +
              cluster.painPoints.reduce((sum, p) => sum + p.painScore, 0)) /
              newCount,
          );

          await db
            .update(clusters)
            .set({
              painPointCount: newCount,
              avgPainScore: newAvg,
              updatedAt: new Date(),
            })
            .where(eq(clusters.id, clusterId));
        } else {
          clusterId = nanoid();

          await db.insert(clusters).values({
            id: clusterId,
            name: cluster.name,
            description: cluster.description,
            painPointCount: cluster.painPoints.length,
            avgPainScore: cluster.avgPainScore,
            keywords: cluster.keywords,
          });
        }

        for (const point of cluster.painPoints) {
          await db
            .update(painPoints)
            .set({ clusterId })
            .where(eq(painPoints.sourceId, point.sourceId));
        }
      }

      return generatedClusters.length;
    });

    await step.run("complete-job", async () => completeJob(savedCount));

    return {
      jobId,
      clustersGenerated: savedCount,
      totalPainPoints: unclusteredPoints.length,
      settingsUsed: {
        minClusterSize: settings.minClusterSize,
        similarityThreshold: settings.similarityThreshold,
      },
      evaluation,
      topClusters: generatedClusters.slice(0, 5).map((c) => ({
        name: c.name,
        pointCount: c.painPoints.length,
        avgScore: c.avgPainScore,
        keywords: c.keywords,
      })),
    };
    }
  },
);
