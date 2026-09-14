import type { Idea } from "@/lib/db";
import type { Cluster } from "@/lib/db";

export interface DashboardStats {
  total: number;
  filtered: number;
  avgScore: number;
  topSources: {
    source: string;
    count: number;
    avgScore: number;
  }[];
  recurringAuthors: {
    author: string;
    posts: ScoredPainPoint[];
    avgScore: number;
  }[];
  scoreDistribution: {
    excellent: number;
    good: number;
    medium: number;
  };
}

export interface ScoredPainPoint {
  sourceId: string;
  title: string;
  content: string;
  url: string;
  author: string;
  score: number;
  painScore: number;
  metadata: Record<string, unknown>;
  scrapedAt: Date | string;
}

export interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  trend?: string;
  loading?: boolean;
}

export interface IdeasResponse {
  total: number;
  ideas: IdeaWithCluster[];
}

export interface IdeaWithCluster extends Omit<
  Idea,
  "features" | "competitors"
> {
  features: string[] | null;
  competitors: string[] | null;
}

export interface IdeaCardProps {
  idea: IdeaWithCluster;
}

export interface ClustersResponse {
  total: number;
  clusters: ClusterWithStats[];
}

export interface ClusterWithStats extends Omit<
  Cluster,
  "keywords" | "embedding"
> {
  keywords: string[] | null;
  embedding?: number[] | null;
}

export interface ClusterCardProps {
  cluster: ClusterWithStats;
}

export type ScrapingSource = "reddit" | "hn" | "playstore" | "news";

export interface ScrapingCategory {
  id: string;
  name: string;
  source: ScrapingSource;
  targets: string[];
  isDefault?: boolean;
}

export interface ScrapingResponse {
  message: string;
  source: ScrapingSource;
  targets: string[];
  jobId: string;
}

export interface ScrapingJobItem {
  id: string;
  source: ScrapingSource;
  status: "pending" | "running" | "completed" | "failed";
  painPointsFound: number | null;
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface JobsResponse {
  jobs: ScrapingJobItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

export interface PainPointsResponse {
  painPoints: PainPointItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

export interface PainPointItem {
  id: string;
  source: string;
  title: string;
  content: string | null;
  url: string | null;
  author: string | null;
  painScore: number | null;
  sourceScore: number | null;
  clusterId: string | null;
  scrapedAt: Date;
  metadata: Record<string, unknown> | null;
}

export interface PainPointCardProps {
  painPoint: PainPointItem;
}

export interface SystemSettings {
  scrapingEnabled: boolean;
  clusteringEnabled: boolean;
  ideaGenerationEnabled: boolean;
  autoScrapeInterval: number;
  minPainScore: number;
  groqApiKey: string;
  inngestKeys: {
    eventKey: string;
    signingKey: string;
  };
}
