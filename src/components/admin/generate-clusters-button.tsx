"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Layers, Loader2 } from "lucide-react";
import { toast } from "sonner";

/**
 * Déclenche POST /api/admin/clusters (job Inngest "clustering/generate",
 * async). Remplace le bouton "Generate Clusters" qui n'avait jusqu'ici
 * aucun handler.
 */
export function GenerateClustersButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleClick = async () => {
    setLoading(true);
    const toastId = toast.loading("Clustering lancé...");

    try {
      const res = await fetch("/api/admin/clusters", { method: "POST" });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Échec du déclenchement");

      toast.success("Clustering en cours", {
        id: toastId,
        description:
          "Le job tourne en arrière-plan — la liste se rafraîchira automatiquement.",
      });

      setTimeout(() => router.refresh(), 8000);
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
