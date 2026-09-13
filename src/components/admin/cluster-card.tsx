import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, Hash } from "lucide-react";
import type { ClusterCardProps } from "@/types/dashboard";

export function ClusterCard({ cluster }: ClusterCardProps) {
  const scoreColor =
    (cluster.avgPainScore || 0) >= 70
      ? "text-green-500"
      : (cluster.avgPainScore || 0) >= 50
        ? "text-yellow-500"
        : "text-orange-500";

  return (
    <Card className="hover:border-primary/50 transition-colors">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <CardTitle className="text-lg">{cluster.name}</CardTitle>
            <CardDescription className="mt-1 line-clamp-2">
              {cluster.description || "No description available"}
            </CardDescription>
          </div>
          <Badge variant="outline" className="shrink-0">
            {cluster.painPointCount || 0} points
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <TrendingUp className={`w-4 h-4 ${scoreColor}`} />
            <span className="font-mono font-bold">
              {cluster.avgPainScore ? Math.round(cluster.avgPainScore) : 0}/100
            </span>
            <span className="text-muted-foreground">avg score</span>
          </div>
        </div>

        {/* Keywords */}
        {cluster.keywords && cluster.keywords.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
              <Hash className="w-3 h-3" />
              Keywords
            </p>
            <div className="flex flex-wrap gap-1">
              {cluster.keywords.slice(0, 6).map((keyword, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs">
                  {keyword}
                </Badge>
              ))}
              {cluster.keywords.length > 6 && (
                <Badge variant="secondary" className="text-xs">
                  +{cluster.keywords.length - 6} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2">
          <Button variant="outline" size="sm" className="flex-1" asChild>
            <Link href={`/admin/clusters/${cluster.id}`}>View Details</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function ClusterCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-full" />
          </div>
          <Skeleton className="h-5 w-16" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-5 w-32" />
        <div>
          <Skeleton className="h-3 w-16 mb-2" />
          <div className="flex flex-wrap gap-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-5 w-16" />
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 flex-1" />
          <Skeleton className="h-9 w-9" />
        </div>
      </CardContent>
    </Card>
  );
}
