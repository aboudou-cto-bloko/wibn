import { Suspense } from "react";
import { cookies } from "next/headers";
import { Sparkles } from "lucide-react";
import { IdeaCardSkeleton } from "@/components/admin/idea-card";
import { IdeasList } from "@/components/admin/ideas-list";
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

async function IdeasSection() {
  const data = await getIdeas();
  return <IdeasList initialData={data} />;
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
        <IdeasSection />
      </Suspense>
    </div>
  );
}
