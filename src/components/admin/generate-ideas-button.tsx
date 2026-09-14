"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { pollJobUntilDone } from "@/lib/admin/poll-job";

/**
 * Déclenche POST /api/admin/ideas (job Inngest "ideas/generate", tracké
 * dans scraping_jobs comme les jobs de scraping — visible dans le panneau
 * "Recent Jobs" de /admin/scraping) puis poll son statut réel au lieu d'un
 * refresh à l'aveugle après un délai fixe.
 */
export function GenerateIdeasButton({
  variant = "default",
  clusterId,
  label = "Generate Ideas",
}: {
  variant?: "default" | "outline";
  /** Cible un cluster précis au lieu du batch global. */
  clusterId?: string;
  label?: string;
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleClick = async () => {
    setLoading(true);
    const toastId = toast.loading("Génération d'idées en cours...");

    try {
      const res = await fetch("/api/admin/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(clusterId ? { clusterId } : {}),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Échec du déclenchement");

      // Timeout généreux : un batch de 5 clusters peut enchaîner ~3 appels
      // Groq chacun (draft + dédup + critique) + un délai de 8s entre
      // clusters — largement plus long qu'un job de scraping.
      const job = await pollJobUntilDone(data.jobId, { timeoutMs: 300000 });

      if (job.status === "completed") {
        toast.success("Génération terminée", {
          id: toastId,
          description: `${job.painPointsFound ?? 0} idée(s) générée(s).`,
        });
      } else {
        toast.error("Génération échouée", {
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
    <Button onClick={handleClick} disabled={loading} variant={variant}>
      {loading ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : (
        <Sparkles className="w-4 h-4 mr-2" />
      )}
      {label}
    </Button>
  );
}
