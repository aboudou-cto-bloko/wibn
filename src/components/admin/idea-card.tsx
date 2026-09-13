import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, DollarSign } from "lucide-react";
import type { IdeaCardProps } from "@/types/dashboard";

export function IdeaCard({ idea }: IdeaCardProps) {
  return (
    <Card className="hover:border-primary/50 transition-colors">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <CardTitle className="text-xl mb-2">{idea.title}</CardTitle>
            <CardDescription className="text-sm">
              {idea.tagline || "No tagline"}
            </CardDescription>
          </div>
          <Badge variant="outline" className="shrink-0">
            {new Date(idea.createdAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Description */}
        <p className="text-sm text-muted-foreground line-clamp-3">
          {idea.description || "No description available"}
        </p>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 py-4 border-y border-border">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Target</p>
              <p className="text-sm font-medium line-clamp-1">
                {idea.targetAudience || "Not specified"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Est. MRR</p>
              <p className="text-sm font-medium line-clamp-1">
                {idea.estimatedMRR?.split(":")[0] || "N/A"}
              </p>
            </div>
          </div>
        </div>

        {/* Features */}
        {idea.features && idea.features.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">
              Key Features
            </p>
            <div className="space-y-1">
              {idea.features.slice(0, 3).map((feature, idx) => (
                <p
                  key={idx}
                  className="text-xs text-muted-foreground line-clamp-1"
                >
                  • {feature.split(":")[1]?.trim() || feature}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2">
          <Button size="sm" className="flex-1" variant="outline" asChild>
            <Link href={`/admin/ideas/${idea.id}`}>View Details</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function IdeaCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-full" />
          </div>
          <Skeleton className="h-5 w-16" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-16 w-full" />
        <div className="grid grid-cols-2 gap-4 py-4 border-y">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/4" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 flex-1" />
          <Skeleton className="h-9 w-9" />
        </div>
      </CardContent>
    </Card>
  );
}
