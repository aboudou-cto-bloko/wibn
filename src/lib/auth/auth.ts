import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";
import { username } from "better-auth/plugins";
import { count, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },

  databaseHooks: {
    user: {
      create: {
        // Le premier compte créé sur une instance self-hosted devient admin
        // (pas d'invitation/rôle assigné manuellement au départ) — même
        // logique que src/lib/db/seed/seed-admin.ts, appliquée aussi au
        // flux d'inscription self-serve (/sign-up).
        after: async (createdUser) => {
          const [{ total }] = await db.select({ total: count() }).from(user);
          if (total === 1) {
            await db
              .update(user)
              .set({ role: "admin" })
              .where(eq(user.id, createdUser.id));
          }
        },
      },
    },
  },

  plugins: [
    username({
      minUsernameLength: 3,
      maxUsernameLength: 30,
    }),

    admin({
      defaultRole: "free",
      adminRoles: ["admin"],
    }),
  ],

  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },

  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3001",
  basePath: "/api/auth",

  secret: process.env.BETTER_AUTH_SECRET!,
});
