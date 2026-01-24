export type SourceType = "reddit" | "twitter" | "hn" | "fixthis";

export interface ScraperConfig {
  source: SourceType;
  enabled: boolean;
  rateLimits: {
    requestsPerMinute: number;
    requestsPerHour: number;
  };
}

export interface RawPainPoint {
  sourceId: string;
  title: string;
  content: string;
  url: string;
  author: string;
  score: number;
  metadata: Record<string, unknown>;
  scrapedAt: Date | string;
}

export interface ScoredPainPoint extends RawPainPoint {
  painScore: number;
  scrapedAt: Date | string;
}
