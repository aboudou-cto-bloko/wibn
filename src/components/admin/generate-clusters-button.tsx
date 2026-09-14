"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Layers, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { pollJobUntilDone } from "@/lib/admin/poll-job";

/**
 * Déclenche POST /api/admin/clusters (job Inngest "clustering/generate",
 * tracké dans scraping_jobs comme les jobs de scraping) puis poll son
 * statut réel au lieu d'un refresh à l'aveugle après un délai fixe.
 */
export function GenerateClustersButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleClick = async () => {
    setLoading(true);
    const toastId = toast.loading("Clustering en cours...");

    try {
      const res = await fetch("/api/admin/clusters", { method: "POST" });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Échec du déclenchement");

      const job = await pollJobUntilDone(data.jobId);

      if (job.status === "completed") {
        toast.success("Clustering terminé", {
          id: toastId,
          description: `${job.painPointsFound ?? 0} cluster(s) généré(s).`,
        });
      } else {
        toast.error("Clustering échoué", {
          id: toastId,
          description: job.errorMessage || "Erreur inconnue",
        });
      }

      router.refresh();
    } catch (error) {
      toast.error("Échec du déclenchement", {
        id: toastId,
        description:
          error instanceof Error ? error.message : "Erreur inconnue",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={handleClick} disabled={loading}>
      {loading ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : (
        <Layers className="w-4 h-4 mr-2" />
      )}
      Generate Clusters
    </Button>
  );
}
