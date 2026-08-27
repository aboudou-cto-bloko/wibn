import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // packages/* are standalone projects (own tsconfig, own deps, deployed
    // separately) — not part of this app's Next.js/React lint surface.
    // Generated files in particular (e.g. Prisma's contract.d.ts) aren't
    // meant to be hand-fixed to satisfy this config.
    "packages/**",
  ]),
]);

export default eslintConfig;
