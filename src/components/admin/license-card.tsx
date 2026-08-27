"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { KeyRound } from "lucide-react";

type LicenseStatus =
  | { active: true; plan: string; email: string; expiresAt: string }
  | { active: false; reason?: string };

const PLAN_LABELS: Record<string, string> = {
  free: "Free",
  pro: "Pro",
  agency: "Agency",
  enterprise: "Enterprise",
};

export function LicenseCard() {
  const router = useRouter();
  const [status, setStatus] = useState<LicenseStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [deactivating, setDeactivating] = useState(false);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      const res = await fetch("/api/license/status");
      const data = await res.json();
      setStatus(data);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load license status");
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async () => {
    if (!confirm("Désactiver la licence sur cette instance ?")) return;
    setDeactivating(true);
    try {
      const res = await fetch("/api/license/deactivate", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      toast.success("Licence désactivée");
      router.push("/activate");
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Failed to deactivate license");
    } finally {
      setDeactivating(false);
    }
  };

  if (loading || !status) {
    return <Skeleton className="h-40 w-full" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="w-5 h-5 text-primary" />
          Licence
        </CardTitle>
        <CardDescription>Clé de licence de cette instance</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {status.active ? (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 border rounded-lg">
                <p className="text-sm font-medium">Plan</p>
                <Badge variant="outline" className="mt-1 capitalize">
                  {PLAN_LABELS[status.plan] ?? status.plan}
                </Badge>
              </div>
              <div className="p-4 border rounded-lg">
                <p className="text-sm font-medium">Email</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {status.email}
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <p className="text-sm font-medium">Expire le</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(status.expiresAt).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                  {(() => {
                    const daysLeft = Math.ceil(
                      (new Date(status.expiresAt).getTime() - Date.now()) /
                        (1000 * 60 * 60 * 24),
                    );
                    return daysLeft <= 7 ? (
                      <span className="ml-2 text-orange-500">
                        (J-{daysLeft})
                      </span>
                    ) : null;
                  })()}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDeactivate}
              disabled={deactivating}
            >
              {deactivating ? "Désactivation..." : "Désactiver cette instance"}
            </Button>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Aucune licence active {status.reason ? `(${status.reason})` : ""}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
