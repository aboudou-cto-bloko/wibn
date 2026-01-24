import { inngest } from "@/lib/inngest/client";
import { db } from "@/lib/db";
import { painPoints, clusters } from "@/lib/db/schema";
import {
  clusterPainPoints,
  evaluateClustering,
} from "@/lib/clustering/simple-clustering";
import { nanoid } from "nanoid";
import { isNull, eq } from "drizzle-orm";
import { getSettings } from "@/lib/settings";

export const generateClustersFunction = inngest.createFunction(
  {
    id: "generate-clusters",
    name: "Generate Pain Point Clusters",
  },
  { event: "clustering/generate" },
  async ({ step }) => {
    const settings = await step.run("load-settings", async () => {
      return await getSettings();
    });

    if (!settings.clusteringEnabled) {
      return {
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
      return {
        clustersGenerated: 0,
        totalPainPoints: 0,
        message: "No unclustered pain points found",
      };
    }

    const generatedClusters = await step.run(
      "cluster-pain-points",
      async () => {
        console.log(
          `Starting clustering with minClusterSize=${settings.minClusterSize}, similarityThreshold=${settings.similarityThreshold}`,
        );

        return clusterPainPoints(
          unclusteredPoints,
          settings.minClusterSize,
          settings.similarityThreshold,
        );
      },
    );

    // Évalue la qualité du clustering
    const evaluation = await step.run("evaluate-clustering", async () => {
      return evaluateClustering(generatedClusters);
    });

    console.log("Clustering evaluation:", evaluation);

    // Sauvegarde en DB
    const savedCount = await step.run("save-clusters", async () => {
      for (const cluster of generatedClusters) {
        const clusterId = nanoid();

        // Insère le cluster
        await db.insert(clusters).values({
          id: clusterId,
          name: cluster.name,
          description: cluster.description,
          painPointCount: cluster.painPoints.length,
          avgPainScore: cluster.avgPainScore,
          keywords: cluster.keywords,
        });

        // Met à jour les pain points avec le clusterId
        for (const point of cluster.painPoints) {
          await db
            .update(painPoints)
            .set({ clusterId })
            .where(eq(painPoints.sourceId, point.sourceId));
        }
      }

      return generatedClusters.length;
    });

    return {
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
  },
);
