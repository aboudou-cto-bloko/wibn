"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkles } from "lucide-react";
import { IdeaCard, IdeaCardSkeleton } from "./idea-card";
import { GenerateIdeasButton } from "./generate-ideas-button";
import type { IdeasResponse, IdeaWithCluster } from "@/types/dashboard";

/**
 * Rendu de la page 1 côté serveur (voir src/app/admin/ideas/page.tsx), puis
 * prend le relais côté client pour le tri par date — jusqu'ici fixé en dur
 * à "plus récent d'abord" côté route, sans contrôle dans l'UI.
 */
export function IdeasList({ initialData }: { initialData: IdeasResponse }) {
  const [ideas, setIdeas] = useState<IdeaWithCluster[]>(initialData.ideas);
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const [loading, setLoading] = useState(false);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    let cancelled = false;
    setLoading(true);

    fetch(`/api/admin/ideas?sortDir=${sortDir}`)
      .then((res) => res.json())
      .then((data: IdeasResponse) => {
        if (!cancelled) setIdeas(data.ideas);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [sortDir]);

  if (initialData.total === 0 && ideas.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Sparkles className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No ideas yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Generate clusters first, then create ideas from them
          </p>
          <GenerateIdeasButton />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Select
          value={sortDir}
          onValueChange={(v) => setSortDir(v as "desc" | "asc")}
        >
          <SelectTrigger size="sm" className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="desc">Newest first</SelectItem>
            <SelectItem value="asc">Oldest first</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="grid gap-6 md:grid-cols-2">
          <IdeaCardSkeleton />
          <IdeaCardSkeleton />
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {ideas.map((idea) => (
            <IdeaCard key={idea.id} idea={idea} />
          ))}
        </div>
      )}
    </div>
  );
}
