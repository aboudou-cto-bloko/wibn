import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const pool = new Pool({
  connectionString: connectionString,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});

export const db = drizzle(pool, { schema });

export type User = typeof schema.user.$inferSelect;
export type NewUser = typeof schema.user.$inferInsert;
export type PainPoint = typeof schema.painPoints.$inferSelect;
export type Cluster = typeof schema.clusters.$inferSelect;
export type Idea = typeof schema.ideas.$inferSelect;
export type Session = typeof schema.session.$inferSelect;
