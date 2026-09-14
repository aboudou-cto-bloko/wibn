"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

/**
 * Spécifique à /admin/* : le error.tsx racine renvoie vers "/" (la landing
 * page publique), pas très utile pour un admin qui vient de perdre sa
 * session ou de tomber sur un fetch en échec — ici on le ramène vers
 * l'admin lui-même.
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <AlertCircle className="w-10 h-10 text-destructive" />
      <h1 className="text-xl font-semibold">Une erreur est survenue</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        Le chargement de cette page a échoué — ta session a peut-être expiré,
        ou une requête a échoué. Réessaie, ou reviens au tableau de bord.
      </p>
      <div className="flex gap-2">
        <Button onClick={() => reset()}>Réessayer</Button>
        <Button variant="outline" asChild>
          <Link href="/admin">Retour au dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
