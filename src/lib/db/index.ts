import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

// SSL dépend de la base cible (Neon/Vercel Postgres en ont besoin, un
// Postgres local Docker non), pas du mode de l'app — NODE_ENV=production
// (ex: `next start`) ne veut pas dire "la base est distante avec TLS".
const pool = new Pool({
  connectionString: connectionString,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : false,
});

export const db = drizzle(pool, { schema });

export type User = typeof schema.user.$inferSelect;
export type NewUser = typeof schema.user.$inferInsert;
export type PainPoint = typeof schema.painPoints.$inferSelect;
export type Cluster = typeof schema.clusters.$inferSelect;
export type Idea = typeof schema.ideas.$inferSelect;
export type Session = typeof schema.session.$inferSelect;
