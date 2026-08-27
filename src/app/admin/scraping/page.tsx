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
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Search,
  Play,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Plus,
  Edit,
  Trash2,
  X,
} from "lucide-react";
import type { ScrapingCategory } from "@/types/dashboard";

export default function ScrapingPage() {
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<ScrapingCategory[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] =
    useState<ScrapingCategory | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formSubreddits, setFormSubreddits] = useState<string[]>([]);
  const [subredditInput, setSubredditInput] = useState("");

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const res = await fetch("/api/admin/categories");
      const data = await res.json();
      setCategories(data.categories);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load categories");
    }
  };

  const handleScrape = async () => {
    if (selectedCategories.length === 0) {
      toast.error("No categories selected", {
        description: "Please select at least one category to scrape",
      });
      return;
    }

    setLoading(true);
    const toastId = toast.loading("Starting scraping job...");

    try {
      const res = await fetch("/api/admin/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categories: selectedCategories }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("Scraping started!", {
          id: toastId,
          description: `Collecting pain points from ${data.subreddits.length} subreddits.`,
        });
        setSelectedCategories([]);
      } else {
        throw new Error(data.error || "Failed to start scraping");
      }
    } catch (error) {
      toast.error("Failed to start scraping", {
        id: toastId,
        description:
          error instanceof Error ? error.message : "An error occurred",
      });
    } finally {
      setLoading(false);
    }
  };

  const openDialog = (category?: ScrapingCategory) => {
    if (category) {
      setEditingCategory(category);
      setFormName(category.name);
      setFormSubreddits(category.subreddits);
    } else {
      setEditingCategory(null);
      setFormName("");
      setFormSubreddits([]);
    }
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingCategory(null);
    setFormName("");
    setFormSubreddits([]);
    setSubredditInput("");
  };

  const handleSaveCategory = async () => {
    if (!formName || formSubreddits.length === 0) {
      toast.error("Name and at least one subreddit required");
      return;
    }

    try {
      const method = editingCategory ? "PUT" : "POST";
      const body = editingCategory
        ? { id: editingCategory.id, name: formName, subreddits: formSubreddits }
        : { name: formName, subreddits: formSubreddits };

      const res = await fetch("/api/admin/categories", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        toast.success(
          editingCategory ? "Category updated!" : "Category created!",
        );
        loadCategories();
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
        loadCategories();
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

  const addSubreddit = () => {
    const cleaned = subredditInput.trim().replace(/^r\//, "");
    if (cleaned && !formSubreddits.includes(cleaned)) {
      setFormSubreddits([...formSubreddits, cleaned]);
      setSubredditInput("");
    }
  };

  const removeSubreddit = (sub: string) => {
    setFormSubreddits(formSubreddits.filter((s) => s !== sub));
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

  const totalSubreddits = categories
    .filter((c) => selectedCategories.includes(c.id))
    .reduce((sum, c) => sum + c.subreddits.length, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Search className="w-8 h-8 text-primary" />
            Reddit Scraping
          </h1>
          <p className="text-muted-foreground mt-2">
            Collect pain points from Reddit communities
          </p>
        </div>
      </div>

      {/* Info Banner */}
      <Card className="border-blue-500/50 bg-blue-500/5">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium">About Reddit Scraping</p>
              <p className="text-sm text-muted-foreground">
                The scraping process runs in the background via Inngest. Monitor
                progress at{" "}
                <a
                  href="http://localhost:8288"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-foreground transition-colors"
                >
                  localhost:8288
                </a>
                . Each category scrapes top posts from the past week.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Categories Selection */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Select Categories</CardTitle>
              <CardDescription>
                Choose which subreddit categories to scrape
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
                      with subreddits to scrape
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
                      <Label htmlFor="subreddit">Subreddits</Label>
                      <div className="flex gap-2">
                        <Input
                          id="subreddit"
                          value={subredditInput}
                          onChange={(e) => setSubredditInput(e.target.value)}
                          onKeyDown={(e) =>
                            e.key === "Enter" &&
                            (e.preventDefault(), addSubreddit())
                          }
                          placeholder="e.g. fitness or r/fitness"
                        />
                        <Button type="button" onClick={addSubreddit}>
                          Add
                        </Button>
                      </div>
                      {formSubreddits.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {formSubreddits.map((sub) => (
                            <Badge
                              key={sub}
                              variant="secondary"
                              className="gap-1"
                            >
                              r/{sub}
                              <button onClick={() => removeSubreddit(sub)}>
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
                      {category.subreddits.length} subreddits
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {category.subreddits.slice(0, 4).map((sub) => (
                        <Badge
                          key={sub}
                          variant="secondary"
                          className="text-xs"
                        >
                          r/{sub}
                        </Badge>
                      ))}
                      {category.subreddits.length > 4 && (
                        <Badge variant="secondary" className="text-xs">
                          +{category.subreddits.length - 4}
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
                    {totalSubreddits}
                  </span>{" "}
                  subreddits
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
    </div>
  );
}
