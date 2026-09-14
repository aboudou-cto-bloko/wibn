"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Sparkles,
  Layers,
  Search,
  Settings,
  Activity,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const navigation = [
  { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { name: "Ideas", href: "/admin/ideas", icon: Sparkles },
  { name: "Clusters", href: "/admin/clusters", icon: Layers },
  { name: "Pain Points", href: "/admin/pain-points", icon: Activity },
  { name: "Scraping", href: "/admin/scraping", icon: Search },
  { name: "Settings", href: "/admin/settings", icon: Settings },
];

function Logo() {
  return (
    <Link href="/admin" className="flex items-center gap-2">
      <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
        <Sparkles className="w-5 h-5 text-primary-foreground" />
      </div>
      <span className="font-mono font-bold text-lg text-sidebar-foreground">
        WIBN
      </span>
    </Link>
  );
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 px-4 py-6 space-y-1">
      {navigation.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.name}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
              isActive
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50",
            )}
          >
            <item.icon className="w-5 h-5" />
            {item.name}
          </Link>
        );
      })}
    </nav>
  );
}

/** Desktop : sidebar fixe, toujours visible à partir de lg (1024px). */
export function AdminSidebar() {
  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 bg-sidebar border-r border-sidebar-border">
      <div className="h-16 flex items-center px-6 border-b border-sidebar-border">
        <Logo />
      </div>

      <NavLinks />

      <div className="p-4 border-t border-sidebar-border">
        <div className="px-3 py-2 rounded-lg bg-sidebar-accent/50">
          <p className="text-xs text-sidebar-foreground/60 font-mono">
            v1.0.0-beta
          </p>
        </div>
      </div>
    </aside>
  );
}

/**
 * Mobile/tablette (< 1024px) : la sidebar est masquée (`hidden lg:flex`
 * ci-dessus) sans aucun remplacement jusqu'ici — l'admin entier était
 * inutilisable sous 1024px, zéro moyen de changer de page. Header sticky +
 * hamburger + Sheet reprenant la même nav.
 */
export function AdminMobileHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="lg:hidden sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-sidebar-border bg-sidebar px-4">
      <Sheet open={open} onOpenChange={setOpen}>
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0"
          onClick={() => setOpen(true)}
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </Button>
        <SheetContent side="left" className="w-64 p-0 bg-sidebar">
          <SheetHeader className="h-16 flex-row items-center border-b border-sidebar-border px-6">
            <SheetTitle asChild>
              <Logo />
            </SheetTitle>
          </SheetHeader>
          <NavLinks onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
      <Logo />
    </header>
  );
}
