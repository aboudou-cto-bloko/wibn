import { db } from "@/lib/db";
import { painPoints } from "@/lib/db/schema";
import { isNull } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  const points = await db
    .select({
      title: painPoints.title,
      content: painPoints.content,
    })
    .from(painPoints)
    .where(isNull(painPoints.clusterId))
    .limit(10);

  // Extrait les keywords comme dans le clustering
  const extractKeywords = (text: string): string[] => {
    const stopWords = new Set([
      "the",
      "a",
      "an",
      "and",
      "or",
      "but",
      "in",
      "on",
      "at",
      "to",
      "for",
      "of",
      "with",
      "by",
      "from",
      "as",
      "is",
      "was",
      "are",
      "been",
      "be",
    ]);

    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 3 && !stopWords.has(word))
      .filter((word) => !word.match(/^\d+$/));
  };

  const analysis = points.map((p) => ({
    title: p.title.substring(0, 50),
    keywords: extractKeywords(`${p.title} ${p.content || ""}`).slice(0, 10),
  }));

  return NextResponse.json({ analysis });
}
