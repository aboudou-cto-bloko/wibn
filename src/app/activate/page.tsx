"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function ActivateForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reason = searchParams.get("reason");
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/license/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Activation impossible");
        return;
      }

      toast.success("Licence activée !");
      setTimeout(() => {
        router.push("/sign-up");
        router.refresh();
      }, 1000);
    } catch (error) {
      console.error(error);
      toast.error("Activation impossible");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/20 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Activer WIBN</CardTitle>
          <CardDescription>
            {reason
              ? `Licence requise (${reason}). Colle ta clé de licence pour déverrouiller cette instance.`
              : "Colle ta clé de licence pour déverrouiller cette instance."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="token">Clé de licence</Label>
              <Textarea
                id="token"
                required
                rows={6}
                placeholder="eyJhbGciOi..."
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="font-mono text-xs"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Activation..." : "Activer"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Pas encore de clé ?{" "}
            <a
              href="https://github.com/aboudou-cto-bloko/wibn"
              className="underline underline-offset-4"
              target="_blank"
              rel="noreferrer"
            >
              Voir le dépôt
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ActivatePage() {
  return (
    <Suspense>
      <ActivateForm />
    </Suspense>
  );
}
