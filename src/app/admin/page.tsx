import { Suspense } from "react";
import { cookies } from "next/headers";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  Sparkles,
  Layers,
  TrendingUp,
  Search,
} from "lucide-react";
import { StatCard, StatCardSkeleton } from "@/components/admin/stat-card";
import type { DashboardStats } from "@/types/dashboard";

const SOURCE_LABELS: Record<string, string> = {
  reddit: "Reddit",
  hn: "HN",
  playstore: "Play Store",
  news: "News",
};

async function getStats(): Promise<DashboardStats> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";

  const res = await fetch(`${baseUrl}/api/admin/analytics`, {
    cache: "no-store",
    next: { revalidate: 0 },
    // Le fetch d'un Server Component vers sa propre route API ne transmet
    // pas automatiquement les cookies de la requête entrante — sans ça,
    // withAdmin() ne voit aucune session et répond 401.
    headers: { Cookie: (await cookies()).toString() },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch analytics");
  }

  return res.json();
}

async function DashboardStats() {
  const stats = await getStats();

  return (
    <>
      {/* Stats principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Pain Points"
          value={stats.total}
          icon={Activity}
          trend={`${stats.filtered} filtered (score ≥40)`}
        />
        <StatCard
          title="High Quality"
          value={stats.scoreDistribution.excellent}
          icon={Layers}
          trend="Score ≥ 80"
        />
        <StatCard
          title="Recurring Authors"
          value={stats.recurringAuthors.length}
          icon={Sparkles}
          trend="2+ posts each"
        />
        <StatCard
          title="Avg Pain Score"
          value={`${Math.round(stats.avgScore)}/100`}
          icon={TrendingUp}
          trend={stats.avgScore >= 60 ? "Good quality" : "Moderate quality"}
        />
      </div>

      {/* Analytics détaillées */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Score Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Score Distribution</CardTitle>
            <CardDescription>Pain points by quality level</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Excellent (≥80)</span>
              <span className="text-sm font-mono font-bold">
                {stats.scoreDistribution.excellent}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Good (60-79)</span>
              <span className="text-sm font-mono font-bold">
                {stats.scoreDistribution.good}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Medium (40-59)</span>
              <span className="text-sm font-mono font-bold">
                {stats.scoreDistribution.medium}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Top Sources */}
        <Card>
          <CardHeader>
            <CardTitle>Sources</CardTitle>
            <CardDescription>Pain points par plateforme</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.topSources.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucune donnée pour l&apos;instant.
              </p>
            ) : (
              <div className="space-y-3">
                {stats.topSources.map((source) => (
                  <div
                    key={source.source}
                    className="flex items-center justify-between text-sm"
                  >
                    <Badge variant="outline">
                      {SOURCE_LABELS[source.source] || source.source}
                    </Badge>
                    <span className="text-muted-foreground">
                      {source.count} posts
                    </span>
                    <span className="font-mono font-bold">
                      {source.avgScore} avg
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function DashboardStatsLoading() {
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Score Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="h-4 w-24 bg-muted animate-pulse rounded" />
                  <span className="h-4 w-12 bg-muted animate-pulse rounded" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Sources</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="h-4 bg-muted animate-pulse rounded" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

export default function AdminDashboard() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Overview of your SaaS idea generation pipeline
        </p>
      </div>

      {/* Stats avec Suspense */}
      <Suspense fallback={<DashboardStatsLoading />}>
        <DashboardStats />
      </Suspense>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common tasks for managing your pipeline
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href="/admin/scraping">
              <Search className="w-4 h-4 mr-2" />
              Scraping
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/admin/clusters">
              <Layers className="w-4 h-4 mr-2" />
              Clusters
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/admin/ideas">
              <Sparkles className="w-4 h-4 mr-2" />
              Ideas
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
