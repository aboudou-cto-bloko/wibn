"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, Loader2 } from "lucide-react";
import { PainPointCard, PainPointCardSkeleton } from "./pain-point-card";
import type { PainPointsResponse, PainPointItem } from "@/types/dashboard";

const LIMIT = 20;

/**
 * Rendu de la page 1 côté serveur (voir src/app/admin/pain-points/page.tsx),
 * puis prend le relais côté client pour un vrai "Load More" (paginé) et des
 * filtres source/score min — le paramètre `minScore` existait déjà côté API
 * mais n'était exposé nulle part dans l'UI.
 */
export function PainPointsList({
  initialData,
}: {
  initialData: PainPointsResponse;
}) {
  const [points, setPoints] = useState<PainPointItem[]>(
    initialData.painPoints,
  );
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialData.pagination.hasMore);
  const [total, setTotal] = useState(initialData.pagination.total);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadingFilters, setLoadingFilters] = useState(false);
  const [source, setSource] = useState<"all" | "reddit" | "hn">("all");
  const [minScore, setMinScore] = useState(0);

  const isFirstRender = useRef(true);

  const buildUrl = (targetPage: number) => {
    const params = new URLSearchParams({
      page: String(targetPage),
      limit: String(LIMIT),
    });
    if (source !== "all") params.set("source", source);
    if (minScore > 0) params.set("minScore", String(minScore));
    return `/api/admin/pain-points?${params.toString()}`;
  };

  // Refetch depuis la page 1 quand un filtre change — pas au premier rendu
  // (la page 1 non filtrée vient déjà du SSR).
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    let cancelled = false;
    setLoadingFilters(true);

    fetch(buildUrl(1))
      .then((res) => res.json())
      .then((data: PainPointsResponse) => {
        if (cancelled) return;
        setPoints(data.painPoints);
        setPage(1);
        setHasMore(data.pagination.hasMore);
        setTotal(data.pagination.total);
      })
      .finally(() => {
        if (!cancelled) setLoadingFilters(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, minScore]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const res = await fetch(buildUrl(page + 1));
      const data: PainPointsResponse = await res.json();
      setPoints((prev) => [...prev, ...data.painPoints]);
      setPage((p) => p + 1);
      setHasMore(data.pagination.hasMore);
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Filtres */}
      <div className="flex flex-wrap items-center gap-4">
        <Tabs
          value={source}
          onValueChange={(v) => setSource(v as typeof source)}
        >
          <TabsList>
            <TabsTrigger value="all">All sources</TabsTrigger>
            <TabsTrigger value="reddit">Reddit</TabsTrigger>
            <TabsTrigger value="hn">Hacker News</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-2">
          <label htmlFor="minScore" className="text-sm text-muted-foreground">
            Min score
          </label>
          <Input
            id="minScore"
            type="number"
            min={0}
            max={100}
            value={minScore || ""}
            onChange={(e) => setMinScore(Number(e.target.value) || 0)}
            placeholder="0"
            className="w-20"
          />
        </div>
        <span className="text-sm text-muted-foreground">
          {total} pain point{total === 1 ? "" : "s"}
        </span>
      </div>

      {loadingFilters ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <PainPointCardSkeleton key={i} />
          ))}
        </div>
      ) : points.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No pain points yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {source !== "all" || minScore > 0
                ? "No pain points match these filters"
                : "Start by scraping Reddit or Hacker News"}
            </p>
            {source === "all" && minScore === 0 && (
              <Button asChild>
                <Link href="/admin/scraping">Start Scraping</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            {points.map((point) => (
              <PainPointCard key={point.id} painPoint={point} />
            ))}
          </div>

          {hasMore && (
            <div className="flex justify-center mt-6">
              <Button
                variant="outline"
                onClick={loadMore}
                disabled={loadingMore}
              >
                {loadingMore ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                Load More
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
