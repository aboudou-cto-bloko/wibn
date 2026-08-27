FROM node:22-alpine AS base
WORKDIR /app
# Une seule fois, mis en cache et partagé par tous les stages suivants —
# évite de re-déclencher un fetch réseau de corepack à chaque stage.
RUN corepack enable && corepack prepare pnpm@11.13.1 --activate

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Valeurs bidon uniquement pour que `next build` puisse s'exécuter
# (aucune route n'est plus pré-rendue avec des données live).
# Les vraies valeurs sont injectées au runtime par docker-compose.
ENV NODE_ENV=production \
    DATABASE_URL="postgresql://user:pass@localhost:5432/db" \
    BETTER_AUTH_SECRET="build-time-placeholder-secret-0000000000" \
    BETTER_AUTH_URL="http://localhost:3001" \
    NEXT_PUBLIC_APP_URL="http://localhost:3001" \
    GROQ_API_KEY="gsk_build_time_placeholder"

RUN pnpm build

FROM base AS runner
RUN addgroup -S wibn && adduser -S wibn -G wibn

ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/src ./src
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/package.json ./package.json
COPY docker/entrypoint.sh ./docker/entrypoint.sh

RUN chmod +x ./docker/entrypoint.sh && chown -R wibn:wibn /app

USER wibn
EXPOSE 3001

ENTRYPOINT ["./docker/entrypoint.sh"]
