import { inngest } from "@/lib/inngest/client";
import { db } from "@/lib/db";
import { clusters, ideas, painPoints } from "@/lib/db/schema";
import { generateSaaSIdea } from "@/lib/ai/idea-generator";
import { nanoid } from "nanoid";
import { desc, eq, isNull } from "drizzle-orm";
import { getSettings } from "@/lib/settings";

// Configuration
const BATCH_SIZE = 5;
const DELAY_BETWEEN_REQUESTS = 8000;

export const generateIdeasFunction = inngest.createFunction(
  {
    id: "generate-ideas",
    name: "Generate SaaS Ideas from Clusters",
    retries: 3,
  },
  { event: "ideas/generate" },
  async ({ step }) => {
    const settings = await step.run("load-settings", async () => {
      return await getSettings();
    });

    if (!settings.ideaGenerationEnabled) {
      return {
        message: "Idea generation is disabled in settings",
        ideasGenerated: 0,
      };
    }

    // Étape 1: Récupère les clusters sans idées
    const clustersToProcess = await step.run("fetch-clusters", async () => {
      try {
        const allClusters = await db
          .select({
            id: clusters.id,
            name: clusters.name,
            description: clusters.description,
            avgPainScore: clusters.avgPainScore,
            keywords: clusters.keywords,
            painPointCount: clusters.painPointCount,
          })
          .from(clusters)
          .leftJoin(ideas, eq(clusters.id, ideas.clusterId))
          .where(isNull(ideas.clusterId))
          .orderBy(desc(clusters.avgPainScore))
          .limit(BATCH_SIZE);

        console.log(`Found ${allClusters.length} clusters without ideas`);

        if (allClusters.length === 0) {
          return [];
        }

        const enrichedClusters = [];
        for (const cluster of allClusters) {
          try {
            const clusterPainPoints = await db
              .select({
                sourceId: painPoints.sourceId,
                title: painPoints.title,
                content: painPoints.content,
                url: painPoints.url,
                author: painPoints.author,
                sourceScore: painPoints.sourceScore,
                painScore: painPoints.painScore,
                metadata: painPoints.metadata,
                scrapedAt: painPoints.scrapedAt,
              })
              .from(painPoints)
              .where(eq(painPoints.clusterId, cluster.id))
              .orderBy(desc(painPoints.painScore))
              .limit(10);

            enrichedClusters.push({
              cluster,
              painPoints: clusterPainPoints.map((p) => ({
                sourceId: p.sourceId,
                title: p.title,
                content: p.content || "",
                url: p.url || "",
                author: p.author || "",
                score: p.sourceScore || 0,
                painScore: p.painScore || 0,
                metadata: (p.metadata as Record<string, unknown>) || {},
                scrapedAt: p.scrapedAt,
              })),
            });
          } catch (error) {
            console.error(
              `Error fetching pain points for cluster ${cluster.id}:`,
              error,
            );
          }
        }

        console.log(
          `${enrichedClusters.length} clusters enriched with pain points`,
        );
        return enrichedClusters;
      } catch (error) {
        console.error("Error fetching clusters:", error);
        throw new Error(
          `Failed to fetch clusters: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    });

    if (clustersToProcess.length === 0) {
      return {
        ideasGenerated: 0,
        clustersProcessed: 0,
        message: "All clusters already have ideas",
      };
    }

    const generatedIdeas = await step.run("generate-ideas", async () => {
      const ideasArray = [];

      for (const { cluster, painPoints: clusterPoints } of clustersToProcess) {
        try {
          console.log(
            `Generating idea for cluster: ${cluster.name} (${cluster.id})`,
          );

          if (!clusterPoints || clusterPoints.length === 0) {
            console.warn(
              `No pain points found for cluster ${cluster.id}, skipping`,
            );
            continue;
          }

          const idea = await generateSaaSIdea({
            id: cluster.id,
            name: cluster.name || "Unnamed Cluster",
            description: cluster.description || "",
            painPoints: clusterPoints,
            avgPainScore: cluster.avgPainScore || 0,
            keywords: (cluster.keywords as string[]) || [],
          });

          if (!idea || !idea.title) {
            console.warn(
              `Invalid idea generated for cluster ${cluster.id}, skipping`,
            );
            continue;
          }

          ideasArray.push({
            clusterId: cluster.id,
            idea,
          });

          console.log(
            `Successfully generated idea: ${idea.title} for cluster ${cluster.id}`,
          );

          if (ideasArray.length < clustersToProcess.length) {
            await new Promise((resolve) =>
              setTimeout(resolve, DELAY_BETWEEN_REQUESTS),
            );
          }
        } catch (error) {
          console.error(
            `Error generating idea for cluster ${cluster.id}:`,
            error,
          );
        }
      }

      return ideasArray;
    });

    if (generatedIdeas.length === 0) {
      return {
        ideasGenerated: 0,
        clustersProcessed: clustersToProcess.length,
        message: "No ideas were successfully generated",
      };
    }

    // Étape 3: Sauvegarde en DB
    const savedCount = await step.run("save-ideas", async () => {
      let successCount = 0;

      for (const { clusterId, idea } of generatedIdeas) {
        try {
          await db.insert(ideas).values({
            id: nanoid(),
            clusterId,
            title: idea.title,
            tagline: idea.tagline || null,
            description: idea.description || null,
            targetAudience: idea.targetAudience || null,
            features: idea.features || [],
            pricingModel: idea.pricingModel || null,
            estimatedMRR: idea.estimatedMRR || null,
            competitors: idea.competitors || [],
            moat: idea.moat || null,
            isPublic: true,
          });

          successCount++;
          console.log(`Saved idea for cluster ${clusterId}: ${idea.title}`);
        } catch (error) {
          console.error(`Error saving idea for cluster ${clusterId}:`, error);
        }
      }

      return successCount;
    });

    return {
      ideasGenerated: savedCount,
      clustersProcessed: clustersToProcess.length,
      settingsUsed: {
        aiTemperature: settings.aiTemperature,
        aiMaxTokens: settings.aiMaxTokens,
      },
      successRate: `${Math.round((savedCount / clustersToProcess.length) * 100)}%`,
    };
  },
);

export async function getClustersWithoutIdeas(page = 1, pageSize = BATCH_SIZE) {
  try {
    const offset = (page - 1) * pageSize;

    const result = await db
      .select({
        id: clusters.id,
        name: clusters.name,
        description: clusters.description,
        avgPainScore: clusters.avgPainScore,
        keywords: clusters.keywords,
      })
      .from(clusters)
      .leftJoin(ideas, eq(clusters.id, ideas.clusterId))
      .where(isNull(ideas.clusterId))
      .orderBy(desc(clusters.avgPainScore))
      .limit(pageSize)
      .offset(offset);

    return result;
  } catch (error) {
    console.error("Error in getClustersWithoutIdeas:", error);
    throw error;
  }
}
