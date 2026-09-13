"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import Link from "next/link";
import { toast } from "sonner";
import {
  Search,
  Play,
  CheckCircle2,
  Loader2,
  Plus,
  Edit,
  Trash2,
  X,
  Clock,
  XCircle,
  ArrowRight,
} from "lucide-react";
import { GenerateClustersButton } from "@/components/admin/generate-clusters-button";
import { GenerateIdeasButton } from "@/components/admin/generate-ideas-button";
import type {
  ScrapingCategory,
  ScrapingSource,
  ScrapingJobItem,
} from "@/types/dashboard";

const SOURCE_LABELS: Record<ScrapingSource, string> = {
  reddit: "Reddit",
  hn: "Hacker News",
};

const SOURCE_COPY: Record<
  ScrapingSource,
  { description: string; targetLabel: string; targetPlaceholder: string }
> = {
  reddit: {
    description: "Collect pain points from Reddit communities",
    targetLabel: "Subreddits",
    targetPlaceholder: "e.g. fitness or r/fitness",
  },
  hn: {
    description: "Collect pain points from Hacker News discussions",
    targetLabel: "Search queries",
    targetPlaceholder: "e.g. frustrated with invoicing",
  },
};

const JOB_POLL_INTERVAL_MS = 2500;

function JobStatusBadge({ status }: { status: ScrapingJobItem["status"] }) {
  switch (status) {
    case "completed":
      return (
        <Badge className="gap-1 bg-green-500/10 text-green-600 hover:bg-green-500/10">
          <CheckCircle2 className="w-3 h-3" /> Completed
        </Badge>
      );
    case "failed":
      return (
        <Badge className="gap-1 bg-destructive/10 text-destructive hover:bg-destructive/10">
          <XCircle className="w-3 h-3" /> Failed
        </Badge>
      );
    case "running":
      return (
        <Badge className="gap-1 bg-blue-500/10 text-blue-600 hover:bg-blue-500/10">
          <Loader2 className="w-3 h-3 animate-spin" /> Running
        </Badge>
      );
    default:
      return (
        <Badge variant="secondary" className="gap-1">
          <Clock className="w-3 h-3" /> Pending
        </Badge>
      );
  }
}

export default function ScrapingPage() {
  const [activeSource, setActiveSource] = useState<ScrapingSource>("reddit");
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<ScrapingCategory[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] =
    useState<ScrapingCategory | null>(null);
  const [recentJobs, setRecentJobs] = useState<ScrapingJobItem[]>([]);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formTargets, setFormTargets] = useState<string[]>([]);
  const [targetInput, setTargetInput] = useState("");

  const copy = SOURCE_COPY[activeSource];

  const loadCategories = useCallback(async (source: ScrapingSource) => {
    try {
      const res = await fetch(`/api/admin/categories?source=${source}`);
      const data = await res.json();
      setCategories(data.categories);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load categories");
    }
  }, []);

  const loadRecentJobs = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/jobs?limit=10");
      const data = await res.json();
      setRecentJobs(data.jobs);
    } catch (error) {
      console.error(error);
    }
  }, []);

  useEffect(() => {
    setSelectedCategories([]);
    loadCategories(activeSource);
  }, [activeSource, loadCategories]);

  useEffect(() => {
    loadRecentJobs();
  }, [loadRecentJobs]);

  // Nettoyage du polling si l'utilisateur quitte la page en cours de job.
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const pollJob = (jobId: string, toastId: string | number) => {
    if (pollRef.current) clearInterval(pollRef.current);

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/admin/jobs?id=${jobId}`);
        if (!res.ok) return;
        const { job } = (await res.json()) as { job: ScrapingJobItem };

        if (job.status === "completed") {
          clearInterval(pollRef.current!);
          pollRef.current = null;
          setLoading(false);
          toast.success("Scraping terminé !", {
            id: toastId,
            description: `${job.painPointsFound ?? 0} pain points trouvés.`,
          });
          loadRecentJobs();
        } else if (job.status === "failed") {
          clearInterval(pollRef.current!);
          pollRef.current = null;
          setLoading(false);
          toast.error("Scraping échoué", {
            id: toastId,
            description: job.errorMessage || "Erreur inconnue",
          });
          loadRecentJobs();
        }
        // pending/running : on continue de poller, toast inchangé.
      } catch (error) {
        console.error("Error polling job:", error);
      }
    }, JOB_POLL_INTERVAL_MS);
  };

  const handleScrape = async () => {
    if (selectedCategories.length === 0) {
      toast.error("No categories selected", {
        description: "Please select at least one category to scrape",
      });
      return;
    }

    setLoading(true);
    const toastId = toast.loading("Scraping en cours...");

    try {
      const res = await fetch("/api/admin/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categories: selectedCategories }),
      });

      const data = await res.json();

      if (res.ok) {
        setSelectedCategories([]);
        loadRecentJobs();
        pollJob(data.jobId, toastId);
      } else {
        throw new Error(data.error || "Failed to start scraping");
      }
    } catch (error) {
      setLoading(false);
      toast.error("Failed to start scraping", {
        id: toastId,
        description:
          error instanceof Error ? error.message : "An error occurred",
      });
    }
  };

  const openDialog = (category?: ScrapingCategory) => {
    if (category) {
      setEditingCategory(category);
      setFormName(category.name);
      setFormTargets(category.targets);
    } else {
      setEditingCategory(null);
      setFormName("");
      setFormTargets([]);
    }
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingCategory(null);
    setFormName("");
    setFormTargets([]);
    setTargetInput("");
  };

  const handleSaveCategory = async () => {
    if (!formName || formTargets.length === 0) {
      toast.error(`Name and at least one ${copy.targetLabel.toLowerCase()} required`);
      return;
    }

    try {
      const method = editingCategory ? "PUT" : "POST";
      const body = editingCategory
        ? { id: editingCategory.id, name: formName, targets: formTargets }
        : { name: formName, source: activeSource, targets: formTargets };

      const res = await fetch("/api/admin/categories", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        toast.success(
          editingCategory ? "Category updated!" : "Category created!",
        );
        loadCategories(activeSource);
        closeDialog();
      } else {
        throw new Error("Failed to save category");
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to save category");
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm("Are you sure you want to delete this category?")) return;

    try {
      const res = await fetch(`/api/admin/categories?id=${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Category deleted!");
        loadCategories(activeSource);
      } else {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete category");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete category",
      );
    }
  };

  const addTarget = () => {
    const cleaned =
      activeSource === "reddit"
        ? targetInput.trim().replace(/^r\//, "")
        : targetInput.trim();
    if (cleaned && !formTargets.includes(cleaned)) {
      setFormTargets([...formTargets, cleaned]);
      setTargetInput("");
    }
  };

  const removeTarget = (target: string) => {
    setFormTargets(formTargets.filter((t) => t !== target));
  };

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((c) => c !== categoryId)
        : [...prev, categoryId],
    );
  };

  const selectAll = () => {
    setSelectedCategories(categories.map((c) => c.id));
    toast.success("All categories selected");
  };

  const clearAll = () => {
    setSelectedCategories([]);
    toast.info("Selection cleared");
  };

  const totalTargets = categories
    .filter((c) => selectedCategories.includes(c.id))
    .reduce((sum, c) => sum + c.targets.length, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Search className="w-8 h-8 text-primary" />
          Scraping
        </h1>
        <p className="text-muted-foreground mt-2">{copy.description}</p>
      </div>

      <Tabs
        value={activeSource}
        onValueChange={(v) => setActiveSource(v as ScrapingSource)}
      >
        <TabsList>
          <TabsTrigger value="reddit">Reddit</TabsTrigger>
          <TabsTrigger value="hn">Hacker News</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Categories Selection */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Select Categories</CardTitle>
              <CardDescription>
                Choose which {copy.targetLabel.toLowerCase()} categories to
                scrape
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openDialog()}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    New Category
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingCategory ? "Edit Category" : "Create Category"}
                    </DialogTitle>
                    <DialogDescription>
                      {editingCategory ? "Update" : "Add"} a custom category
                      with {copy.targetLabel.toLowerCase()} to scrape (
                      {SOURCE_LABELS[activeSource]})
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Category Name</Label>
                      <Input
                        id="name"
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        placeholder="e.g. Health & Fitness"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="target">{copy.targetLabel}</Label>
                      <div className="flex gap-2">
                        <Input
                          id="target"
                          value={targetInput}
                          onChange={(e) => setTargetInput(e.target.value)}
                          onKeyDown={(e) =>
                            e.key === "Enter" &&
                            (e.preventDefault(), addTarget())
                          }
                          placeholder={copy.targetPlaceholder}
                        />
                        <Button type="button" onClick={addTarget}>
                          Add
                        </Button>
                      </div>
                      {formTargets.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {formTargets.map((target) => (
                            <Badge
                              key={target}
                              variant="secondary"
                              className="gap-1"
                            >
                              {activeSource === "reddit"
                                ? `r/${target}`
                                : target}
                              <button onClick={() => removeTarget(target)}>
                                <X className="w-3 h-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={closeDialog}>
                      Cancel
                    </Button>
                    <Button onClick={handleSaveCategory}>
                      {editingCategory ? "Update" : "Create"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Button
                variant="outline"
                size="sm"
                onClick={selectAll}
                disabled={loading}
              >
                Select All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={clearAll}
                disabled={loading}
              >
                Clear All
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            {categories.map((category) => {
              const isSelected = selectedCategories.includes(category.id);
              return (
                <div key={category.id} className="relative">
                  <button
                    onClick={() => toggleCategory(category.id)}
                    disabled={loading}
                    className={`w-full p-4 rounded-lg border-2 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed ${
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold">{category.name}</h3>
                      {isSelected && (
                        <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">
                      {category.targets.length} {copy.targetLabel.toLowerCase()}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {category.targets.slice(0, 4).map((target) => (
                        <Badge
                          key={target}
                          variant="secondary"
                          className="text-xs"
                        >
                          {activeSource === "reddit" ? `r/${target}` : target}
                        </Badge>
                      ))}
                      {category.targets.length > 4 && (
                        <Badge variant="secondary" className="text-xs">
                          +{category.targets.length - 4}
                        </Badge>
                      )}
                    </div>
                  </button>
                  {!category.isDefault && (
                    <div className="absolute top-2 right-2 flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          openDialog(category);
                        }}
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 hover:bg-destructive/10 hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCategory(category.id);
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Action Bar */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              {selectedCategories.length === 0 ? (
                <span>No categories selected</span>
              ) : (
                <span>
                  <span className="font-medium text-foreground">
                    {selectedCategories.length}
                  </span>{" "}
                  categories •{" "}
                  <span className="font-medium text-foreground">
                    {totalTargets}
                  </span>{" "}
                  {copy.targetLabel.toLowerCase()}
                </span>
              )}
            </div>
            <Button
              onClick={handleScrape}
              disabled={loading || selectedCategories.length === 0}
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Scraping...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Start Scraping
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Pipeline : enchaîner clustering + génération d'idées sans changer
          d'écran, une fois le scraping terminé (ou sur des pain points déjà
          en base) */}
      <Card>
        <CardHeader>
          <CardTitle>Pipeline</CardTitle>
          <CardDescription>
            Étapes suivantes après le scraping — pas besoin de changer
            d&apos;écran.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <GenerateClustersButton />
          <GenerateIdeasButton variant="outline" />
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin/clusters">
              View Clusters <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin/ideas">
              View Ideas <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Recent Jobs */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Jobs</CardTitle>
          <CardDescription>
            Les jobs tournent en arrière-plan (Inngest) — statut mis à jour ici
            automatiquement.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentJobs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Aucun job pour l&apos;instant.
            </p>
          ) : (
            <div className="space-y-2">
              {recentJobs.map((job) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between gap-4 rounded-lg border p-3 text-sm"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <JobStatusBadge status={job.status} />
                    <Badge variant="outline">
                      {SOURCE_LABELS[job.source]}
                    </Badge>
                    <span className="text-muted-foreground truncate">
                      {new Date(job.createdAt).toLocaleString("en-US", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    {job.status === "completed" && (
                      <span className="font-medium">
                        {job.painPointsFound ?? 0} pain points
                      </span>
                    )}
                    {job.status === "failed" && job.errorMessage && (
                      <span className="text-destructive text-xs">
                        {job.errorMessage}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
