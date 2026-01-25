export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Activity } from "lucide-react";
import {
  PainPointCard,
  PainPointCardSkeleton,
} from "@/components/admin/pain-point-card";
import type { PainPointsResponse } from "@/types/dashboard";

async function getPainPoints(page: number = 1): Promise<PainPointsResponse> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";

  const res = await fetch(
    `${baseUrl}/api/admin/pain-points?page=${page}&limit=20`,
    {
      next: { revalidate: 60 }, // Cache pendant 60 secondes
    },
  );

  if (!res.ok) {
    throw new Error("Failed to fetch pain points");
  }

  return res.json();
}

async function PainPointsList({ page }: { page: number }) {
  const data = await getPainPoints(page);

  if (data.painPoints.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No pain points yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Start by scraping Reddit communities
          </p>
          <Button>Start Scraping</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        {data.painPoints.map((point) => (
          <PainPointCard key={point.id} painPoint={point} />
        ))}
      </div>

      {/* Pagination */}
      {data.pagination.hasMore && (
        <div className="flex justify-center mt-6">
          <Button variant="outline">Load More</Button>
        </div>
      )}
    </>
  );
}

function PainPointsListLoading() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {[1, 2, 3, 4].map((i) => (
        <PainPointCardSkeleton key={i} />
      ))}
    </div>
  );
}

export default function PainPointsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Activity className="w-8 h-8 text-primary" />
            Pain Points
          </h1>
          <p className="text-muted-foreground mt-2">
            Collected problems and frustrations from Reddit
          </p>
        </div>
      </div>

      {/* Pain Points List avec Suspense */}
      <Suspense fallback={<PainPointsListLoading />}>
        <PainPointsList page={1} />
      </Suspense>
    </div>
  );
}
