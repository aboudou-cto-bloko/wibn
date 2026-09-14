"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Activity, Loader2, X } from "lucide-react";
import { PainPointCard, PainPointCardSkeleton } from "./pain-point-card";
import type { PainPointsResponse, PainPointItem } from "@/types/dashboard";

const LIMIT = 20;

/**
 * Rendu de la page 1 côté serveur (voir src/app/admin/pain-points/page.tsx),
 * puis prend le relais côté client pour un vrai "Load More" (paginé) et des
 * filtres source/score min/job — `minScore` et `jobId` existaient déjà côté
 * API mais n'étaient exposés nulle part dans l'UI.
 */
export function PainPointsList({
  initialData,
  initialJobId,
}: {
  initialData: PainPointsResponse;
  /** Filtre "pain points de ce job précis" — arrivé via ?jobId= depuis le
   * panneau Recent Jobs de /admin/scraping. */
  initialJobId?: string;
}) {
  const router = useRouter();
  const [points, setPoints] = useState<PainPointItem[]>(
    initialData.painPoints,
  );
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialData.pagination.hasMore);
  const [total, setTotal] = useState(initialData.pagination.total);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadingFilters, setLoadingFilters] = useState(false);
  const [source, setSource] = useState<
    "all" | "reddit" | "hn" | "playstore" | "news"
  >("all");
  const [minScore, setMinScore] = useState(0);
  const [sortBy, setSortBy] = useState<"score" | "date">("score");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [jobId, setJobId] = useState<string | undefined>(initialJobId);

  const isFirstRender = useRef(true);

  const buildUrl = (targetPage: number) => {
    const params = new URLSearchParams({
      page: String(targetPage),
      limit: String(LIMIT),
      sortBy,
      sortDir,
    });
    if (source !== "all") params.set("source", source);
    if (minScore > 0) params.set("minScore", String(minScore));
    if (jobId) params.set("jobId", jobId);
    return `/api/admin/pain-points?${params.toString()}`;
  };

  const clearJobFilter = () => {
    setJobId(undefined);
    router.replace("/admin/pain-points");
  };

  // Refetch depuis la page 1 quand un filtre/tri change — pas au premier
  // rendu (la page 1 non filtrée vient déjà du SSR).
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
  }, [source, minScore, sortBy, sortDir, jobId]);

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
        <Select value={source} onValueChange={(v) => setSource(v as typeof source)}>
          <SelectTrigger size="sm" className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sources</SelectItem>
            <SelectItem value="reddit">Reddit</SelectItem>
            <SelectItem value="hn">Hacker News</SelectItem>
            <SelectItem value="playstore">Play Store</SelectItem>
            <SelectItem value="news">Tech News</SelectItem>
          </SelectContent>
        </Select>
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
        <Select
          value={`${sortBy}:${sortDir}`}
          onValueChange={(v) => {
            const [by, dir] = v.split(":") as [
              "score" | "date",
              "asc" | "desc",
            ];
            setSortBy(by);
            setSortDir(dir);
          }}
        >
          <SelectTrigger size="sm" className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="score:desc">Highest score</SelectItem>
            <SelectItem value="score:asc">Lowest score</SelectItem>
            <SelectItem value="date:desc">Newest first</SelectItem>
            <SelectItem value="date:asc">Oldest first</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">
          {total} pain point{total === 1 ? "" : "s"}
        </span>
        {jobId && (
          <Badge variant="outline" className="gap-1">
            Filtered by job
            <button onClick={clearJobFilter} aria-label="Clear job filter">
              <X className="w-3 h-3" />
            </button>
          </Badge>
        )}
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
              {source !== "all" || minScore > 0 || jobId
                ? "No pain points match these filters"
                : "Start by scraping Reddit or Hacker News"}
            </p>
            {source === "all" && minScore === 0 && !jobId && (
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
