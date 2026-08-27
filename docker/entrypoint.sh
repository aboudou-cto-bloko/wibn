#!/bin/sh
set -e

echo "⏳ Attente de la base de données..."
attempt=0
until node -e "
const { Client } = require('pg');
const c = new Client({ connectionString: process.env.DATABASE_URL });
c.connect().then(() => c.end()).then(() => process.exit(0)).catch(() => process.exit(1));
" 2>/dev/null; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge 30 ]; then
    echo "❌ Base de données injoignable après 30 tentatives."
    exit 1
  fi
  sleep 1
done
echo "✅ Base de données prête."

echo "📦 Application des migrations..."
./node_modules/.bin/drizzle-kit migrate

echo "🌱 Seed des catégories par défaut..."
./node_modules/.bin/tsx src/lib/db/seed/seed-categories.ts || true

echo "👤 Seed du compte admin..."
./node_modules/.bin/tsx src/lib/db/seed/seed-admin.ts || true

echo "🚀 Démarrage de WIBN..."
exec ./node_modules/.bin/next start -p 3001
