import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink, TrendingUp } from "lucide-react";
import type { PainPointCardProps } from "@/types/dashboard";

export function PainPointCard({ painPoint }: PainPointCardProps) {
  const scoreColor =
    (painPoint.painScore || 0) >= 70
      ? "bg-green-500"
      : (painPoint.painScore || 0) >= 50
        ? "bg-yellow-500"
        : "bg-orange-500";

  return (
    <Card className="hover:border-primary/50 transition-colors">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base line-clamp-2 mb-2">
              {painPoint.title}
            </CardTitle>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline" className="capitalize">
                {painPoint.source}
              </Badge>
              <span>by {painPoint.author || "unknown"}</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${scoreColor}`} />
              <span className="font-mono font-bold text-sm">
                {painPoint.painScore || 0}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">
              {new Date(painPoint.scrapedAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {painPoint.content && (
          <p className="text-sm text-muted-foreground line-clamp-3">
            {painPoint.content}
          </p>
        )}

        <div className="flex items-center gap-2">
          {painPoint.url && (
            <Button size="sm" variant="outline" asChild className="flex-1">
              <a href={painPoint.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-3 h-3 mr-1" />
                View Post
              </a>
            </Button>
          )}
          {painPoint.clusterId && (
            <Badge variant="secondary" className="text-xs">
              Clustered
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function PainPointCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <div className="flex gap-2">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-24" />
            </div>
          </div>
          <div className="space-y-2">
            <Skeleton className="h-5 w-12" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-9 w-full" />
      </CardContent>
    </Card>
  );
}
