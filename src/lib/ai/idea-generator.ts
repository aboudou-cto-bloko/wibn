import { generateJSON } from "./groq";
import { Cluster } from "@/lib/clustering/simple-clustering";

export interface SaaSIdea {
  title: string;
  tagline: string;
  description: string;
  targetAudience: string;
  features: string[];
  pricingModel: string;
  estimatedMRR: string;
  competitors: string[];
  moat: string;
}

export async function generateSaaSIdea(cluster: Cluster): Promise<SaaSIdea> {
  // Sélectionne les meilleurs pain points (top 5)
  const topPainPoints = cluster.painPoints
    .sort((a, b) => b.painScore - a.painScore)
    .slice(0, 5)
    .map((p, idx) => {
      const snippet = p.content.substring(0, 250).replace(/\n/g, " ");
      return `${idx + 1}. "${p.title}" (Score: ${p.painScore}/100)
   Context: ${snippet}...
   Source: ${p.metadata.subreddit || "unknown"}`;
    })
    .join("\n\n");

  // Calcule des statistiques sur le cluster
  const stats = {
    totalPoints: cluster.painPoints.length,
    avgScore: cluster.avgPainScore,
    topScore: Math.max(...cluster.painPoints.map((p) => p.painScore)),
    keywords: cluster.keywords.slice(0, 5),
    subreddits: [
      ...new Set(
        cluster.painPoints
          .map((p) => p.metadata.subreddit as string)
          .filter(Boolean),
      ),
    ],
  };

  const prompt = `You are a SaaS product strategist analyzing REAL user pain points from Reddit. Based on the following cluster of related problems, generate ONE specific, actionable SaaS product idea.

CLUSTER OVERVIEW:
- Name: ${cluster.name}
- Pain Points: ${stats.totalPoints} users
- Avg Pain Score: ${stats.avgScore}/100 (Max: ${stats.topScore}/100)
- Key Topics: ${stats.keywords.join(", ")}
- Communities: ${stats.subreddits.join(", ")}

TOP PAIN POINTS FROM REAL USERS:
${topPainPoints}

INSTRUCTIONS:
- Be SPECIFIC. No generic solutions.
- Focus on the EXACT problem these users describe.
- Use the keywords and context from their messages.
- Make it REALISTIC and buildable by a small team.
- Pricing should match the pain level (higher pain = higher willingness to pay).

Generate a JSON response with this EXACT structure:
{
  "title": "Specific product name (not generic)",
  "tagline": "One compelling sentence that captures the core value",
  "description": "2-3 detailed paragraphs: (1) The exact problem from the pain points, (2) How your solution works, (3) Why it's better than existing alternatives. Reference the actual user frustrations.",
  "targetAudience": "Very specific persona with job title, company size, and specific pain (e.g., 'SaaS founders at $10-50K MRR struggling with customer analytics')",
  "features": [
    "Feature 1: Specific capability that solves the main pain point",
    "Feature 2: Another must-have based on user complaints",
    "Feature 3: Differentiator from competitors",
    "Feature 4: Integration or workflow feature users mentioned",
    "Feature 5: Advanced capability for power users"
  ],
  "pricingModel": "Detailed pricing with 3 tiers. Justify prices based on value delivered and pain score (${stats.avgScore}/100). Include what each tier includes.",
  "estimatedMRR": "Realistic 12-month projection with breakdown: 'Month 1-3: $X (Beta), Month 4-6: $Y (Launch), Month 7-12: $Z (Growth)'. Include conversion assumptions.",
  "competitors": [
    "Direct Competitor 1: What they do and their weakness",
    "Direct Competitor 2: What they do and their weakness",
    "Indirect Alternative: What people use now and why it sucks"
  ],
  "moat": "2-3 sentences explaining: (1) What makes this defensible (network effects, data moat, technical complexity, or unique insight), (2) Why competitors can't easily replicate it, (3) The unfair advantage you can build over time."
}

IMPORTANT:
- Reference the actual keywords: ${stats.keywords.join(", ")}
- Address the subreddits context: ${stats.subreddits.join(", ")}
- Make pricing proportional to pain score (${stats.avgScore}/100)
- NO generic fluff or marketing speak
- Be brutally specific and actionable`;

  try {
    const idea = await generateJSON<SaaSIdea>(prompt, {
      temperature: 0.8,
    });

    if (!idea.title || !idea.tagline || !idea.description) {
      throw new Error("Incomplete idea generated");
    }

    return idea;
  } catch (error) {
    console.error("Error generating SaaS idea:", error);

    return {
      title: `Solution for ${cluster.name}`,
      tagline: `Solve ${cluster.keywords[0]} problems automatically`,
      description: `Based on ${cluster.painPoints.length} user pain points with an average score of ${cluster.avgPainScore}/100.`,
      targetAudience: "Users in the analyzed communities",
      features: cluster.keywords.map((k) => `Feature related to ${k}`),
      pricingModel: "Freemium with paid tiers at $29 and $99/month",
      estimatedMRR: "To be determined after market validation",
      competitors: ["To be researched"],
      moat: "Data-driven insights from real user pain points",
    };
  }
}
