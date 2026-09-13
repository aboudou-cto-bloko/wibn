import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Layers, Hash, TrendingUp, Sparkles } from "lucide-react";
import { PainPointCard } from "@/components/admin/pain-point-card";
import { GenerateIdeasButton } from "@/components/admin/generate-ideas-button";
import type { Cluster, Idea, PainPoint } from "@/lib/db";

interface ClusterDetail {
  cluster: Cluster;
  painPoints: PainPoint[];
  idea: Idea | null;
}

async function getCluster(id: string): Promise<ClusterDetail | null> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";

  const res = await fetch(`${baseUrl}/api/admin/clusters/${id}`, {
    cache: "no-store",
    // cf. src/app/admin/page.tsx : forward des cookies pour ce self-fetch.
    headers: { Cookie: (await cookies()).toString() },
  });

  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to fetch cluster");

  return res.json();
}

export default async function ClusterDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getCluster(id);

  if (!data) notFound();

  const { cluster, painPoints, idea } = data;

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/admin/clusters">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Clusters
        </Link>
      </Button>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Layers className="w-8 h-8 text-primary" />
            {cluster.name}
          </h1>
          <p className="text-muted-foreground mt-2">
            {cluster.description || "No description available"}
          </p>
        </div>
        {idea ? (
          <Button asChild>
            <Link href={`/admin/ideas/${idea.id}`}>
              <Sparkles className="w-4 h-4 mr-2" />
              View Generated Idea
            </Link>
          </Button>
        ) : (
          <GenerateIdeasButton
            clusterId={cluster.id}
            label="Generate Idea for this Cluster"
          />
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4" /> Avg Pain Score
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold font-mono">
              {cluster.avgPainScore ? Math.round(cluster.avgPainScore) : 0}
              /100
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pain Points</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold font-mono">
              {cluster.painPointCount || painPoints.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Idea Status</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {idea ? "Generated" : "None yet"}
            </p>
          </CardContent>
        </Card>
      </div>

      {cluster.keywords && cluster.keywords.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-1.5">
              <Hash className="w-4 h-4" /> Keywords
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5">
              {(cluster.keywords as string[]).map((keyword, idx) => (
                <Badge key={idx} variant="secondary">
                  {keyword}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div>
        <h2 className="text-xl font-semibold mb-4">
          Pain Points in this Cluster ({painPoints.length})
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          {painPoints.map((point) => (
            <PainPointCard key={point.id} painPoint={point} />
          ))}
        </div>
      </div>
    </div>
  );
}
