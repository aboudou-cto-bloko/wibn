import { db } from "@/lib/db/index";
import { scrapingCategories } from "@/lib/db/schema";
import { nanoid } from "nanoid";
import { config } from "dotenv";
import { resolve } from "path";
import { sql } from "drizzle-orm";

config({ path: resolve(process.cwd(), ".env.local") });

const DEFAULT_CATEGORIES = [
  {
    id: nanoid(),
    name: "Business & Entrepreneurship",
    subreddits: [
      "Entrepreneur",
      "startups",
      "SaaS",
      "smallbusiness",
      "EntrepreneurRideAlong",
      "sweatystartup",
    ],
    isDefault: true,
  },
  {
    id: nanoid(),
    name: "Productivity & Self-Improvement",
    subreddits: [
      "productivity",
      "getdisciplined",
      "selfimprovement",
      "ADHD",
      "organization",
    ],
    isDefault: true,
  },
  {
    id: nanoid(),
    name: "Marketing & Growth",
    subreddits: [
      "marketing",
      "SEO",
      "socialmedia",
      "content_marketing",
      "growmybusiness",
    ],
    isDefault: true,
  },
  {
    id: nanoid(),
    name: "Tech & Development",
    subreddits: [
      "programming",
      "webdev",
      "Frontend",
      "reactjs",
      "nextjs",
      "learnprogramming",
    ],
    isDefault: true,
  },
  {
    id: nanoid(),
    name: "E-commerce",
    subreddits: ["ecommerce", "shopify", "dropship", "AmazonSeller"],
    isDefault: true,
  },
  {
    id: nanoid(),
    name: "Finance & Investing",
    subreddits: [
      "personalfinance",
      "financialindependence",
      "investing",
      "Accounting",
    ],
    isDefault: true,
  },
];

export async function seedCategories() {
  console.log("Seeding default categories...");

  // Premièrement, vérifions combien de catégories sont déjà présentes
  const existingCount = await db.select().from(scrapingCategories);
  console.log(
    `Il y a actuellement ${existingCount.length} catégories dans la table.`,
  );

  let inserted = 0;
  let skipped = 0;

  for (const category of DEFAULT_CATEGORIES) {
    try {
      // Tentative d'insertion
      const result = await db
        .insert(scrapingCategories)
        .values(category)
        .onConflictDoNothing()
        .returning();
      if (result.length > 0) {
        inserted++;
        console.log(`Insertion réussie pour : ${category.name}`);
      } else {
        skipped++;
        console.log(`Ignoré (déjà présent) : ${category.name}`);
      }
    } catch (error) {
      console.error(`Erreur lors de l'insertion de ${category.name}:`, error);
    }
  }

  console.log(`Résumé : ${inserted} insérées, ${skipped} ignorées.`);
  console.log("✅ Seed terminé !");
}

// Exécutez la fonction seedCategories si le script est appelé directement
if (require.main === module) {
  seedCategories();
}
