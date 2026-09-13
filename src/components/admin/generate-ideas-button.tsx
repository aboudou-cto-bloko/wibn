"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

/**
 * Déclenche POST /api/admin/ideas (job Inngest "ideas/generate", async —
 * traite un batch de clusters sans idée). Remplace les boutons "Generate
 * More"/"Generate Ideas" qui n'avaient jusqu'ici aucun handler.
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
    const toastId = toast.loading("Génération d'idées lancée...");

    try {
      const res = await fetch("/api/admin/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(clusterId ? { clusterId } : {}),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Échec du déclenchement");

      toast.success("Génération en cours", {
        id: toastId,
        description:
          "Le job tourne en arrière-plan (quelques dizaines de secondes) — la liste se rafraîchira automatiquement.",
      });

      // Le job est async (Inngest) — un refresh immédiat ne verrait rien de
      // nouveau. On retente après un délai raisonnable pour la plupart des cas.
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
