import { inngest } from "@/lib/inngest/client";
import { db } from "@/lib/db";
import { clusters, ideas, painPoints, scrapingJobs } from "@/lib/db/schema";
import { generateSaaSIdea, ExistingIdeaRef } from "@/lib/ai/idea-generator";
import { nanoid } from "nanoid";
import { and, desc, eq, isNull } from "drizzle-orm";
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
  async ({ event, step }) => {
    // clusterId optionnel : cible un cluster précis (bouton "Générer une
    // idée pour ce cluster" sur /admin/clusters/[id]) au lieu du batch
    // global des BATCH_SIZE clusters sans idée les mieux notés.
    const targetClusterId: string | undefined = event.data?.clusterId;
    // Fourni par l'appelant (POST /api/admin/ideas) pour que l'UI puisse
    // suivre ce job précis dès le déclenchement — même convention que les
    // fonctions scrape-*.ts (voir GET /api/admin/jobs?id=).
    const jobId: string = event.data?.jobId || nanoid();

    await step.run("create-job", async () => {
      await db.insert(scrapingJobs).values({
        id: jobId,
        source: "ideas",
        status: "running",
        config: targetClusterId ? { clusterId: targetClusterId } : {},
        startedAt: new Date(),
      });
    });

    // Marque le job terminé (succès ou échec) sur chacun des points de
    // sortie de la fonction — pour que le polling côté UI (pollJobUntilDone)
    // ne reste jamais bloqué sur "running" quel que soit le chemin emprunté.
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

    // Filet de sécurité : si une étape lève une erreur non anticipée
    // (au-delà des try/catch déjà en place par cluster/par idée), le job
    // passe quand même à "failed" au lieu de rester bloqué en "running"
    // indéfiniment — bug concret rencontré avec le scraper Play Store
    // avant d'avoir ce genre de garde (voir sanitize.ts).
    try {
      return await runGeneration();
    } catch (error) {
      await completeJob(
        0,
        error instanceof Error ? error.message : "Unknown error",
      ).catch(() => {});
      throw error;
    }

    async function runGeneration() {
    const settings = await step.run("load-settings", async () => {
      return await getSettings();
    });

    if (!settings.ideaGenerationEnabled) {
      await step.run("complete-job-disabled", async () =>
        completeJob(0, "Idea generation is disabled in settings"),
      );
      return {
        jobId,
        message: "Idea generation is disabled in settings",
        ideasGenerated: 0,
      };
    }

    // Étape 1: Récupère le(s) cluster(s) à traiter
    const clustersToProcess = await step.run("fetch-clusters", async () => {
      try {
        const query = db
          .select({
            id: clusters.id,
            name: clusters.name,
            description: clusters.description,
            avgPainScore: clusters.avgPainScore,
            keywords: clusters.keywords,
            painPointCount: clusters.painPointCount,
          })
          .from(clusters)
          .leftJoin(ideas, eq(clusters.id, ideas.clusterId));

        // isNull(ideas.clusterId) s'applique aussi bien au batch global qu'à
        // un clusterId ciblé : sans ça, cibler un cluster qui a DÉJÀ une
        // idée (bouton cliqué deux fois, page restée ouverte après qu'une
        // autre requête l'a généré, etc.) regénérait une idée à partir des
        // mêmes pain points — un doublon silencieux, jamais détecté par
        // checkDuplicate() puisqu'il compare le texte de l'idée, pas les
        // pain points sources. Ici on bloque la régénération à la racine :
        // un cluster qui a déjà une idée n'est plus jamais retraité, point.
        const allClusters = targetClusterId
          ? await query
              .where(
                and(eq(clusters.id, targetClusterId), isNull(ideas.clusterId)),
              )
              .limit(1)
          : await query
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
      const message = targetClusterId
        ? "This cluster already has an idea — not regenerating from the same pain points"
        : "All clusters already have ideas";
      await step.run("complete-job-empty", async () => completeJob(0));
      return {
        jobId,
        ideasGenerated: 0,
        clustersProcessed: 0,
        message,
      };
    }

    // Idées déjà en base : passées à generateSaaSIdea pour éviter de
    // sauvegarder un quasi-doublon (deux clusters différents peuvent
    // décrire le même produit sous-jacent). Voir checkDuplicate dans
    // idea-generator.ts.
    const existingIdeas = await step.run("fetch-existing-ideas", async () => {
      const rows = await db
        .select({ title: ideas.title, tagline: ideas.tagline })
        .from(ideas);
      return rows as ExistingIdeaRef[];
    });

    const generatedIdeas = await step.run("generate-ideas", async () => {
      const ideasArray = [];
      // Grossit au fil du batch pour éviter aussi les doublons ENTRE
      // clusters traités dans ce même run (existingIdeas ne voit que ce qui
      // était déjà sauvegardé au début du run).
      const knownIdeas = [...existingIdeas];

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

          const idea = await generateSaaSIdea(
            {
              id: cluster.id,
              name: cluster.name || "Unnamed Cluster",
              description: cluster.description || "",
              painPoints: clusterPoints,
              avgPainScore: cluster.avgPainScore || 0,
              keywords: (cluster.keywords as string[]) || [],
            },
            knownIdeas,
          );

          if (!idea) {
            // null = doublon détecté (checkDuplicate) — pas une erreur,
            // juste rien à sauvegarder pour ce cluster.
            console.log(
              `Idea for cluster ${cluster.id} skipped (duplicate)`,
            );
            continue;
          }

          if (!idea.title) {
            console.warn(
              `Invalid idea generated for cluster ${cluster.id}, skipping`,
            );
            continue;
          }

          ideasArray.push({
            clusterId: cluster.id,
            idea,
          });
          knownIdeas.push({ title: idea.title, tagline: idea.tagline });

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
      await step.run("complete-job-none-generated", async () =>
        completeJob(0),
      );
      return {
        jobId,
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

    await step.run("complete-job", async () => completeJob(savedCount));

    return {
      jobId,
      ideasGenerated: savedCount,
      clustersProcessed: clustersToProcess.length,
      settingsUsed: {
        aiTemperature: settings.aiTemperature,
        aiMaxTokens: settings.aiMaxTokens,
      },
      successRate: `${Math.round((savedCount / clustersToProcess.length) * 100)}%`,
    };
    }
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
