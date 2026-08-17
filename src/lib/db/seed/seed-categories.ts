import { db } from "@/lib/db/index";
import { scrapingCategories } from "@/lib/db/schema";
import { nanoid } from "nanoid";

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

  // "id" est un nanoid généré à chaque exécution : onConflictDoNothing() sur
  // la clé primaire ne peut donc jamais matcher un run précédent. On dédoublonne
  // ici par "name" (la vraie clé d'idempotence) avant d'insérer.
  const existing = await db.select().from(scrapingCategories);
  console.log(`Il y a actuellement ${existing.length} catégories dans la table.`);
  const existingNames = new Set(existing.map((c) => c.name));

  let inserted = 0;
  let skipped = 0;

  for (const category of DEFAULT_CATEGORIES) {
    if (existingNames.has(category.name)) {
      skipped++;
      console.log(`Ignoré (déjà présent) : ${category.name}`);
      continue;
    }

    try {
      await db.insert(scrapingCategories).values(category);
      inserted++;
      console.log(`Insertion réussie pour : ${category.name}`);
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
