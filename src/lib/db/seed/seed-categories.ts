import { db } from "@/lib/db/index";
import { scrapingCategories } from "@/lib/db/schema";
import { nanoid } from "nanoid";

const DEFAULT_CATEGORIES = [
  {
    id: nanoid(),
    name: "Business & Entrepreneurship",
    source: "reddit" as const,
    targets: [
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
    source: "reddit" as const,
    targets: [
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
    source: "reddit" as const,
    targets: [
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
    source: "reddit" as const,
    targets: [
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
    source: "reddit" as const,
    targets: ["ecommerce", "shopify", "dropship", "AmazonSeller"],
    isDefault: true,
  },
  {
    id: nanoid(),
    name: "Finance & Investing",
    source: "reddit" as const,
    targets: [
      "personalfinance",
      "financialindependence",
      "investing",
      "Accounting",
    ],
    isDefault: true,
  },
  // Hacker News : "targets" = requêtes de recherche Algolia (tags=story),
  // pas des noms de subreddits.
  {
    id: nanoid(),
    name: "HN: Frustrations & alternatives",
    source: "hn" as const,
    targets: [
      "frustrated with",
      "looking for an alternative to",
      "why is there no tool for",
    ],
    isDefault: true,
  },
  {
    id: nanoid(),
    name: "HN: Ask HN — problèmes",
    source: "hn" as const,
    targets: ["Ask HN: how do you", "Ask HN: struggling with"],
    isDefault: true,
  },
  {
    id: nanoid(),
    name: "HN: SaaS & tooling gaps",
    source: "hn" as const,
    targets: ["tired of paying for", "wish there was a tool"],
    isDefault: true,
  },
  // Google Play : "targets" = ids de packages Android (ids vérifiés le
  // 2026-09-13 via gplay.search). Mix Nigeria/pan-africain/francophone
  // (Wave est très utilisé au Sénégal/Côte d'Ivoire/Mali/Bénin).
  {
    id: nanoid(),
    name: "Play Store: Fintech & mobile money Afrique",
    source: "playstore" as const,
    targets: [
      "com.kudabank.app",
      "com.moniepoint.personal",
      "com.wave.personal",
      "com.chippercash",
    ],
    isDefault: true,
  },
  {
    id: nanoid(),
    name: "Play Store: E-commerce Afrique",
    source: "playstore" as const,
    targets: ["com.jumia.android"],
    isDefault: true,
  },
  // Presse tech : "targets" = URLs de flux RSS (feeds WordPress standard).
  {
    id: nanoid(),
    name: "News: Presse tech africaine",
    source: "news" as const,
    targets: [
      "https://techcabal.com/feed",
      "https://techpoint.africa/feed",
      "https://disruptafrica.com/feed",
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
