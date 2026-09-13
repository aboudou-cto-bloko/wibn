import { Suspense } from "react";
import { cookies } from "next/headers";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles } from "lucide-react";
import { IdeaCard, IdeaCardSkeleton } from "@/components/admin/idea-card";
import { GenerateIdeasButton } from "@/components/admin/generate-ideas-button";
import type { IdeasResponse } from "@/types/dashboard";

async function getIdeas(): Promise<IdeasResponse> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";

  const res = await fetch(`${baseUrl}/api/admin/ideas`, {
    cache: "no-store",
    next: { revalidate: 0 },
    // cf. src/app/admin/page.tsx : forward des cookies pour ce self-fetch.
    headers: { Cookie: (await cookies()).toString() },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch ideas");
  }

  return res.json();
}

async function IdeasList() {
  const data = await getIdeas();

  if (data.total === 0) {
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
    <div className="grid gap-6 md:grid-cols-2">
      {data.ideas.map((idea) => (
        <IdeaCard key={idea.id} idea={idea} />
      ))}
    </div>
  );
}

function IdeasListLoading() {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <IdeaCardSkeleton />
      <IdeaCardSkeleton />
    </div>
  );
}

export default function IdeasPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Sparkles className="w-8 h-8 text-primary" />
            Generated Ideas
          </h1>
          <p className="text-muted-foreground mt-2">
            SaaS ideas generated from pain point clusters
          </p>
        </div>
        <GenerateIdeasButton variant="outline" />
      </div>

      {/* Ideas List avec Suspense */}
      <Suspense fallback={<IdeasListLoading />}>
        <IdeasList />
      </Suspense>
    </div>
  );
}
