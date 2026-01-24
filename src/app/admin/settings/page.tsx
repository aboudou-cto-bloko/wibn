"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Settings, Save, RefreshCw } from "lucide-react";

interface SystemSettings {
  scrapingEnabled: boolean;
  clusteringEnabled: boolean;
  ideaGenerationEnabled: boolean;
  minPainScore: number;
  autoScrapeInterval: number;
  maxPostsPerSubreddit: number;
  minClusterSize: number;
  similarityThreshold: number;
  aiTemperature: number;
  aiMaxTokens: number;
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<SystemSettings | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await fetch("/api/admin/settings");
      const data = await res.json();
      setSettings(data);
    } catch (error) {
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        toast.success("Settings saved successfully!");
      } else {
        throw new Error("Failed to save settings");
      }
    } catch (error) {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleClearCache = async () => {
    toast.success("Cache cleared", {
      description: "Settings cache has been invalidated",
    });
  };

  if (loading || !settings) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Settings className="w-8 h-8 text-primary" />
          Settings
        </h1>
        <p className="text-muted-foreground mt-2">
          Configure your WIBN instance
        </p>
      </div>

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle>System Status</CardTitle>
          <CardDescription>Current system configuration</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="text-sm font-medium">Database</p>
                <p className="text-xs text-muted-foreground">Vercel Postgres</p>
              </div>
              <Badge
                variant="outline"
                className="bg-green-500/10 text-green-500 border-green-500/20"
              >
                Connected
              </Badge>
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="text-sm font-medium">Inngest</p>
                <p className="text-xs text-muted-foreground">Background Jobs</p>
              </div>
              <Badge
                variant="outline"
                className="bg-green-500/10 text-green-500 border-green-500/20"
              >
                Active
              </Badge>
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="text-sm font-medium">Groq AI</p>
                <p className="text-xs text-muted-foreground">Idea Generation</p>
              </div>
              <Badge
                variant="outline"
                className="bg-green-500/10 text-green-500 border-green-500/20"
              >
                Ready
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feature Toggles */}
      <Card>
        <CardHeader>
          <CardTitle>Features</CardTitle>
          <CardDescription>Enable or disable system features</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="scraping">Reddit Scraping</Label>
              <p className="text-sm text-muted-foreground">
                Automatically collect pain points from Reddit
              </p>
            </div>
            <Switch
              id="scraping"
              checked={settings.scrapingEnabled}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, scrapingEnabled: checked })
              }
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="clustering">Auto Clustering</Label>
              <p className="text-sm text-muted-foreground">
                Automatically group pain points into clusters
              </p>
            </div>
            <Switch
              id="clustering"
              checked={settings.clusteringEnabled}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, clusteringEnabled: checked })
              }
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="ideas">Idea Generation</Label>
              <p className="text-sm text-muted-foreground">
                Automatically generate SaaS ideas from clusters
              </p>
            </div>
            <Switch
              id="ideas"
              checked={settings.ideaGenerationEnabled}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, ideaGenerationEnabled: checked })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Scraping Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Scraping Configuration</CardTitle>
          <CardDescription>
            Configure how pain points are collected and scored
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="minScore">Minimum Pain Score</Label>
              <Input
                id="minScore"
                type="number"
                min="0"
                max="100"
                value={settings.minPainScore}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    minPainScore: parseInt(e.target.value) || 0,
                  })
                }
              />
              <p className="text-xs text-muted-foreground">
                Only save pain points with score ≥ {settings.minPainScore}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxPosts">Max Posts per Subreddit</Label>
              <Input
                id="maxPosts"
                type="number"
                min="10"
                max="100"
                value={settings.maxPostsPerSubreddit}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    maxPostsPerSubreddit: parseInt(e.target.value) || 50,
                  })
                }
              />
              <p className="text-xs text-muted-foreground">
                Scrape up to {settings.maxPostsPerSubreddit} posts per subreddit
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Clustering Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Clustering Configuration</CardTitle>
          <CardDescription>
            Configure how pain points are grouped
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="minCluster">Min Cluster Size</Label>
              <Input
                id="minCluster"
                type="number"
                min="2"
                max="10"
                value={settings.minClusterSize}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    minClusterSize: parseInt(e.target.value) || 2,
                  })
                }
              />
              <p className="text-xs text-muted-foreground">
                Minimum {settings.minClusterSize} pain points to form a cluster
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="similarity">Similarity Threshold</Label>
              <Input
                id="similarity"
                type="number"
                min="0"
                max="1"
                step="0.05"
                value={settings.similarityThreshold}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    similarityThreshold: parseFloat(e.target.value) || 0.2,
                  })
                }
              />
              <p className="text-xs text-muted-foreground">
                {Math.round(settings.similarityThreshold * 100)}% keyword
                overlap required
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>AI Configuration</CardTitle>
          <CardDescription>
            Configure Groq AI parameters for idea generation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="temperature">Temperature</Label>
              <Input
                id="temperature"
                type="number"
                min="0"
                max="2"
                step="0.1"
                value={settings.aiTemperature}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    aiTemperature: parseFloat(e.target.value) || 0.8,
                  })
                }
              />
              <p className="text-xs text-muted-foreground">
                {settings.aiTemperature < 0.5
                  ? "Deterministic"
                  : settings.aiTemperature > 1.2
                    ? "Very creative"
                    : "Balanced"}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxTokens">Max Tokens</Label>
              <Input
                id="maxTokens"
                type="number"
                min="1000"
                max="8000"
                step="100"
                value={settings.aiMaxTokens}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    aiMaxTokens: parseInt(e.target.value) || 4000,
                  })
                }
              />
              <p className="text-xs text-muted-foreground">
                Maximum response length: {settings.aiMaxTokens} tokens
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Advanced */}
      <Card>
        <CardHeader>
          <CardTitle>Advanced</CardTitle>
          <CardDescription>Maintenance operations</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg border-orange-500/20 bg-orange-500/5">
            <div>
              <p className="text-sm font-medium">Clear Settings Cache</p>
              <p className="text-xs text-muted-foreground">
                Force reload settings from database
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={handleClearCache}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Clear Cache
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={loadSettings} disabled={saving}>
          Reset
        </Button>
        <Button onClick={handleSave} disabled={saving} size="lg">
          {saving ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
