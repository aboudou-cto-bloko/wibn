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
import {
  ArrowLeft,
  Sparkles,
  Users,
  DollarSign,
  Layers,
  Shield,
} from "lucide-react";
import type { Idea } from "@/lib/db";

async function getIdea(id: string): Promise<Idea | null> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";

  const res = await fetch(`${baseUrl}/api/admin/ideas/${id}`, {
    cache: "no-store",
    // cf. src/app/admin/page.tsx : forward des cookies pour ce self-fetch.
    headers: { Cookie: (await cookies()).toString() },
  });

  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to fetch idea");

  const data = await res.json();
  return data.idea;
}

export default async function IdeaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const idea = await getIdea(id);

  if (!idea) notFound();

  return (
    <div className="space-y-6 max-w-3xl">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/admin/ideas">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Ideas
        </Link>
      </Button>

      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Sparkles className="w-8 h-8 text-primary" />
          {idea.title}
        </h1>
        {idea.tagline && (
          <p className="text-muted-foreground mt-2 text-lg">{idea.tagline}</p>
        )}
        {idea.clusterId && (
          <Link
            href={`/admin/clusters/${idea.clusterId}`}
            className="inline-block mt-2"
          >
            <Badge variant="outline" className="hover:bg-primary/10">
              View source cluster
            </Badge>
          </Link>
        )}
      </div>

      {idea.description && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-line text-muted-foreground">
              {idea.description}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 space-y-0">
            <Users className="w-4 h-4 text-muted-foreground" />
            <CardTitle className="text-base">Target Audience</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {idea.targetAudience || "Not specified"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 space-y-0">
            <DollarSign className="w-4 h-4 text-muted-foreground" />
            <CardTitle className="text-base">Estimated MRR</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-line">
              {idea.estimatedMRR || "N/A"}
            </p>
          </CardContent>
        </Card>
      </div>

      {idea.features && idea.features.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Key Features</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {idea.features.map((feature, idx) => (
                <li key={idx} className="text-sm text-muted-foreground">
                  • {feature}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {idea.pricingModel && (
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 space-y-0">
            <Layers className="w-4 h-4 text-muted-foreground" />
            <CardTitle className="text-base">Pricing Model</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-line text-muted-foreground">
              {idea.pricingModel}
            </p>
          </CardContent>
        </Card>
      )}

      {idea.competitors && idea.competitors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Competitors</CardTitle>
            <CardDescription>
              Alternatives users mentioned or that exist in this space
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {idea.competitors.map((competitor, idx) => (
                <li key={idx} className="text-sm text-muted-foreground">
                  • {competitor}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {idea.moat && (
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 space-y-0">
            <Shield className="w-4 h-4 text-muted-foreground" />
            <CardTitle className="text-base">Moat</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-line text-muted-foreground">
              {idea.moat}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
