import { createAuthClient } from "better-auth/react";
import { adminClient } from "better-auth/client/plugins";
import { usernameClient } from "better-auth/client/plugins";
import { ac, free, pro, agency, enterprise, admin } from "./permissions";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001",
  plugins: [
    usernameClient(),
    adminClient({
      ac,
      roles: {
        free,
        pro,
        agency,
        enterprise,
        admin,
      },
    }),
  ],
});

export const { useSession, signIn, signUp, signOut } = authClient;
