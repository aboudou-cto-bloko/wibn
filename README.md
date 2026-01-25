# WIBN - What Is Broken Now

> AI-Powered SaaS Idea Generator: Discover untapped business opportunities by analyzing real pain points from Reddit communities.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15.0-black.svg)](https://nextjs.org/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

![WIBN Dashboard](https://placehold.co/1200x600/1a1a2e/ffffff?text=WIBN+Dashboard)

## 🚀 Features

- **Reddit Scraping**: Automatically collect pain points from 30+ subreddits
- **Smart Clustering**: AI-powered grouping using keyword analysis and semantic similarity
- **Idea Generation**: Groq AI creates actionable SaaS business ideas with pricing, features, and competitive analysis
- **Real-Time Analytics**: Track scores, top sources, and recurring themes
- **Admin Dashboard**: Beautiful dark UI with comprehensive insights and controls
- **Background Jobs**: Powered by Inngest for reliable, scalable processing
- **Customizable Settings**: Configure scraping, clustering, and AI parameters

## 📋 Table of Contents

- [Demo](#demo)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Running the App](#running-the-app)
- [Admin Dashboard](#admin-dashboard)
- [Project Structure](#project-structure)
- [License](#license)

## 🎥 Demo

[Live Demo](https://your-demo-url.com) | [Video Walkthrough](https://youtube.com/your-video)

## 🛠 Tech Stack

**Frontend:**
- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui
- Sonner (Toast notifications)

**Backend:**
- Next.js API Routes
- Drizzle ORM
- Neon Postgres (Serverless)
- Inngest (Background jobs)

**AI & Services:**
- Groq AI (Llama 3.3 70B)
- Reddit API (Snoowrap)

## 🏁 Getting Started

### Prerequisites

- Node.js 18+ or Bun
- pnpm (recommended) or npm
- Neon Postgres account
- Groq API key
- Inngest account

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/wibn.git
cd wibn
```

2. **Install dependencies**
```bash
pnpm install
# or
npm install
```

3. **Set up environment variables**

Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

See [Environment Variables](#environment-variables) below.

4. **Set up the database**
```bash
# Generate Drizzle schema
pnpm drizzle-kit generate

# Push schema to database
pnpm drizzle-kit push
```

5. **Seed default categories** (optional)
```bash
pnpm tsx src/lib/db/seed-categories.ts
```

6. **Run the development server**
```bash
pnpm dev
```

Open [http://localhost:3001](http://localhost:3001) to see the app.

## 🔐 Environment Variables

Create a `.env.local` file in the root directory:
```env
# Database (Neon Postgres - use POOLED connection)
DATABASE_URL="postgresql://user:password@ep-xxx-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require"
POSTGRES_URL="postgresql://user:password@ep-xxx-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require"

# Groq AI
GROQ_API_KEY="gsk_xxx"

# Inngest
INNGEST_EVENT_KEY="your-inngest-event-key"
INNGEST_SIGNING_KEY="your-inngest-signing-key"

# App
NEXT_PUBLIC_APP_URL="http://localhost:3001"
NODE_ENV="development"
```

### Getting API Keys

**Neon Postgres:**
1. Go to [console.neon.tech](https://console.neon.tech)
2. Create a new project
3. Copy the **Pooled connection** string (contains `-pooler`)

**Groq AI:**
1. Go to [console.groq.com](https://console.groq.com)
2. Create an API key
3. Copy the key (starts with `gsk_`)

**Inngest:**
1. Go to [inngest.com](https://inngest.com)
2. Create a new app
3. Copy Event Key and Signing Key from the "Keys" tab

## 💾 Database Setup

WIBN uses Drizzle ORM with Neon Postgres. The schema includes:

- `users` - User accounts (for Better Auth later)
- `pain_points` - Scraped Reddit posts
- `clusters` - Grouped pain points
- `ideas` - Generated SaaS ideas
- `scraping_categories` - Customizable Reddit categories
- `scraping_jobs` - Job history
- `system_settings` - App configuration

### Migrations
```bash
# Generate migration
pnpm drizzle-kit generate

# Apply migration
pnpm drizzle-kit push

# Open Drizzle Studio
pnpm drizzle-kit studio
```

## 🚀 Running the App

### Development
```bash
pnpm dev
```

Runs on [http://localhost:3001](http://localhost:3001)

### Inngest Dev Server

In a separate terminal:
```bash
pnpm inngest:dev
```

Inngest UI: [http://localhost:8288](http://localhost:8288)

### Production Build
```bash
pnpm build
pnpm start
```

## 🎛 Admin Dashboard

Access the admin dashboard at `/admin`:

**Pages:**
- **Dashboard** - Analytics overview (pain points, scores, top sources)
- **Ideas** - Generated SaaS ideas with details
- **Clusters** - Grouped pain points by theme
- **Pain Points** - All scraped Reddit posts
- **Scraping** - Configure and trigger scraping jobs
- **Settings** - System configuration (scoring, clustering, AI parameters)

**Features:**
- Dark theme with luxe purple accent
- Real-time data with server-side caching
- Suspense loading states
- Toast notifications (Sonner)
- Responsive design

## 📁 Project Structure
```
wibn/
├── src/
│   ├── app/
│   │   ├── admin/              # Admin dashboard pages
│   │   ├── api/                # API routes
│   │   │   ├── admin/          # Admin endpoints
│   │   │   └── inngest/        # Inngest webhook
│   │   ├── globals.css         # Global styles
│   │   ├── layout.tsx          # Root layout
│   │   └── page.tsx            # Landing page
│   ├── components/
│   │   ├── admin/              # Admin-specific components
│   │   ├── providers/          # Context providers
│   │   └── ui/                 # shadcn/ui components
│   ├── lib/
│   │   ├── ai/                 # Groq AI integration
│   │   ├── clustering/         # Clustering algorithm
│   │   ├── db/                 # Database & schema
│   │   ├── inngest/            # Background jobs
│   │   ├── scrapers/           # Reddit scraper
│   │   ├── scoring/            # Pain point scoring
│   │   └── settings.ts         # System settings helper
│   └── types/
│       ├── dashboard.ts        # Dashboard types
│       └── scraper.ts          # Scraper types
├── drizzle.config.ts           # Drizzle configuration
├── next.config.ts              # Next.js configuration
├── tailwind.config.ts          # Tailwind configuration
└── tsconfig.json               # TypeScript configuration
```

## 🔧 Configuration

All settings are configurable via the **Settings** page (`/admin/settings`):

**Scraping:**
- Min Pain Score (0-100)
- Max Posts per Subreddit
- Enable/disable scraping

**Clustering:**
- Min Cluster Size
- Similarity Threshold (0-1)
- Enable/disable clustering

**AI Generation:**
- Temperature (0-2)
- Max Tokens
- Enable/disable idea generation

Settings are stored in the `system_settings` table and cached for 60 seconds.

## 📊 How It Works

1. **Scrape Reddit** → Collect pain points from configured subreddits
2. **Score & Filter** → Calculate pain scores (0-100) and filter by threshold
3. **Cluster** → Group similar pain points using keyword analysis
4. **Generate Ideas** → Use Groq AI to create SaaS business ideas from clusters
5. **Analyze** → View analytics, export data, refine ideas

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [shadcn/ui](https://ui.shadcn.com/) - Beautiful UI components
- [Inngest](https://inngest.com/) - Reliable background jobs
- [Groq](https://groq.com/) - Fast AI inference
- [Neon](https://neon.tech/) - Serverless Postgres

## 📧 Contact

Franck ZINSOU - [@yourtwitter](https://twitter.com/yourtwitter)

Project Link: [https://github.com/yourusername/wibn](https://github.com/yourusername/wibn)

---

**Built with ❤️ in Benin**
