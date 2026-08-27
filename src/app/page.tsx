import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Search,
  Layers,
  TrendingUp,
  Zap,
  ArrowRight,
  Github,
  CheckCircle2,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            <span className="text-xl font-bold">WIBN</span>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" asChild>
              <a
                href="https://github.com/aboudou-cto-bloko/wibn"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Github className="w-4 h-4 mr-2" />
                GitHub
              </a>
            </Button>
            <Button asChild>
              <Link href="/admin">Admin Dashboard</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-24 text-center">
        <Badge variant="secondary" className="mb-4">
          <Zap className="w-3 h-3 mr-1" />
          AI-Powered SaaS Idea Generator
        </Badge>
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
          What Is <span className="text-primary">Broken</span> Now?
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
          Discover untapped SaaS opportunities by analyzing real pain points
          from Reddit communities. AI-powered clustering and idea generation at
          your fingertips.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Button size="lg" asChild>
            <Link href="/admin">
              Get Started
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <a
              href="https://github.com/aboudou-cto-bloko/wibn"
              target="_blank"
              rel="noopener noreferrer"
            >
              View on GitHub
            </a>
          </Button>
        </div>
      </section>

      {/* How It Works */}
      <section className="container mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">How It Works</h2>
          <p className="text-muted-foreground">
            From Reddit frustrations to validated SaaS ideas in 3 steps
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <Card>
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Search className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>1. Scrape Reddit</CardTitle>
              <CardDescription>
                Automatically collect pain points from 30+ subreddits across
                business, tech, marketing, and more
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span>Customizable categories</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span>Intelligent scoring (0-100)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span>Background processing with Inngest</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Layers className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>2. Cluster Pain Points</CardTitle>
              <CardDescription>
                AI groups similar problems using keyword analysis and semantic
                similarity
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span>Automatic clustering algorithm</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span>Configurable thresholds</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span>Quality metrics & insights</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>3. Generate Ideas</CardTitle>
              <CardDescription>
                Groq AI analyzes clusters to create actionable SaaS business
                ideas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span>Complete business model</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span>Pricing & MRR estimates</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span>Competitive analysis</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-6 py-16 bg-muted/30 rounded-3xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Powerful Features</h2>
          <p className="text-muted-foreground">
            Everything you need to discover your next SaaS idea
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              icon: TrendingUp,
              title: "Real-Time Analytics",
              description:
                "Track pain point scores, top sources, and recurring themes",
            },
            {
              icon: Zap,
              title: "Background Jobs",
              description:
                "Powered by Inngest for reliable, scalable processing",
            },
            {
              icon: Search,
              title: "Advanced Search",
              description:
                "Filter, sort, and paginate through thousands of pain points",
            },
            {
              icon: Layers,
              title: "Smart Clustering",
              description:
                "Optimized algorithm with configurable similarity thresholds",
            },
            {
              icon: Sparkles,
              title: "AI Generation",
              description:
                "Groq-powered idea generation with customizable parameters",
            },
            {
              icon: CheckCircle2,
              title: "Admin Dashboard",
              description:
                "Beautiful dark UI with real-time insights and controls",
            },
          ].map((feature, i) => (
            <Card key={i}>
              <CardHeader>
                <feature.icon className="w-8 h-8 text-primary mb-2" />
                <CardTitle className="text-lg">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Tech Stack */}
      <section className="container mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Built With Modern Tech</h2>
          <p className="text-muted-foreground">
            Open-source stack for maximum performance and developer experience
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
          {[
            { name: "Next.js 15", color: "bg-black text-white" },
            { name: "TypeScript", color: "bg-blue-600 text-white" },
            { name: "Drizzle ORM", color: "bg-green-600 text-white" },
            { name: "Neon Postgres", color: "bg-cyan-600 text-white" },
            { name: "Inngest", color: "bg-purple-600 text-white" },
            { name: "Groq AI", color: "bg-orange-600 text-white" },
            { name: "Tailwind CSS", color: "bg-sky-600 text-white" },
            { name: "shadcn/ui", color: "bg-zinc-800 text-white" },
          ].map((tech, i) => (
            <div
              key={i}
              className={`${tech.color} p-4 rounded-lg text-center font-semibold`}
            >
              {tech.name}
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-6 py-24 text-center">
        <h2 className="text-4xl font-bold mb-6">
          Ready to Find Your Next SaaS Idea?
        </h2>
        <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
          Start scraping Reddit, clustering pain points, and generating
          AI-powered business ideas today.
        </p>
        <Button size="lg" asChild>
          <Link href="/admin">
            Launch Dashboard
            <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </Button>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="container mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <span className="font-semibold">WIBN</span>
              <span className="text-sm text-muted-foreground">
                · What Is Broken Now
              </span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <a
                href="https://github.com/aboudou-cto-bloko/wibn"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors"
              >
                GitHub
              </a>
              <span>Built by Franck ZINSOU</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
