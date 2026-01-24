import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";
import { username } from "better-auth/plugins";
import { db } from "@/lib/db";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
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
