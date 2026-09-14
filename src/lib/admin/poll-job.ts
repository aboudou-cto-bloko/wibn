import type { ScrapingJobItem } from "@/types/dashboard";

/**
 * Poll GET /api/admin/jobs?id= jusqu'à ce que le job soit completed/failed
 * (ou timeout). Utilisé par /admin/scraping et par les boutons Generate
 * Clusters/Ideas — évite de dupliquer cette boucle 3 fois.
 */
export async function pollJobUntilDone(
  jobId: string,
  options: { intervalMs?: number; timeoutMs?: number } = {},
): Promise<ScrapingJobItem> {
  const { intervalMs = 2500, timeoutMs = 180000 } = options;
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const res = await fetch(`/api/admin/jobs?id=${jobId}`);
    if (res.ok) {
      const { job } = (await res.json()) as { job: ScrapingJobItem };
      if (job.status === "completed" || job.status === "failed") {
        return job;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error("Le job met trop de temps à répondre (timeout)");
}
