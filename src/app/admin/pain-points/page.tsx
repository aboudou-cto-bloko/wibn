export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { cookies } from "next/headers";
import { Activity } from "lucide-react";
import { PainPointCardSkeleton } from "@/components/admin/pain-point-card";
import { PainPointsList } from "@/components/admin/pain-points-list";
import type { PainPointsResponse } from "@/types/dashboard";

async function getPainPoints(jobId?: string): Promise<PainPointsResponse> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";
  const params = new URLSearchParams({ page: "1", limit: "20" });
  if (jobId) params.set("jobId", jobId);

  const res = await fetch(`${baseUrl}/api/admin/pain-points?${params}`, {
    next: { revalidate: 60 }, // Cache pendant 60 secondes
    // cf. src/app/admin/page.tsx : forward des cookies pour ce self-fetch.
    headers: { Cookie: (await cookies()).toString() },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch pain points");
  }

  return res.json();
}

async function PainPointsSection({ jobId }: { jobId?: string }) {
  const data = await getPainPoints(jobId);
  return <PainPointsList initialData={data} initialJobId={jobId} />;
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

export default async function PainPointsPage({
  searchParams,
}: {
  searchParams: Promise<{ jobId?: string }>;
}) {
  const { jobId } = await searchParams;

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
            Collected problems and frustrations from Reddit and Hacker News
          </p>
        </div>
      </div>

      {/* Pain Points List avec Suspense */}
      <Suspense fallback={<PainPointsListLoading />}>
        <PainPointsSection jobId={jobId} />
      </Suspense>
    </div>
  );
}
