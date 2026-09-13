import { Suspense } from "react";
import { cookies } from "next/headers";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Layers } from "lucide-react";
import {
  ClusterCard,
  ClusterCardSkeleton,
} from "@/components/admin/cluster-card";
import { GenerateClustersButton } from "@/components/admin/generate-clusters-button";
import type { ClustersResponse } from "@/types/dashboard";

async function getClusters(): Promise<ClustersResponse> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";

  const res = await fetch(`${baseUrl}/api/admin/clusters`, {
    cache: "no-store",
    next: { revalidate: 0 },
    // cf. src/app/admin/page.tsx : forward des cookies pour ce self-fetch.
    headers: { Cookie: (await cookies()).toString() },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch clusters");
  }

  return res.json();
}

async function ClustersList() {
  const data = await getClusters();

  if (data.total === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Layers className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No clusters yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Scrape pain points first, then cluster them by similarity
          </p>
          <Button asChild>
            <Link href="/admin/scraping">Start Scraping</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {data.clusters.map((cluster) => (
        <ClusterCard key={cluster.id} cluster={cluster} />
      ))}
    </div>
  );
}

function ClustersListLoading() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <ClusterCardSkeleton key={i} />
      ))}
    </div>
  );
}

export default function ClustersPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Layers className="w-8 h-8 text-primary" />
            Clusters
          </h1>
          <p className="text-muted-foreground mt-2">
            Related pain points grouped by similarity
          </p>
        </div>
        <GenerateClustersButton />
      </div>

      {/* Clusters List avec Suspense */}
      <Suspense fallback={<ClustersListLoading />}>
        <ClustersList />
      </Suspense>
    </div>
  );
}
