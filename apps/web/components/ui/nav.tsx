import React, { Suspense, type ReactNode } from "react";
import { BrandLockup } from "@/components/brand/brand-lockup";
import { NavAuth, NavAuthFallback } from "@/components/ui/nav-auth";

/**
 * Field IA — one door per job. Board is THE board.
 *
 * The desktop bar mirrors components/ui/mobile-nav.tsx section for section.
 * Keep them in step: a door added or removed here is added or removed there
 * in the same change.
 */
type NavItem = { label: string; href: string; desc: string };
type NavGroup = { heading?: string; items: readonly NavItem[] };

export interface RevenuePillar {
  label: string;
  href: string;
  desc: string;
}

/**
 * The 5 Revenue Pillars of Galaxy Sports Edge.
 * Exact routes representing core commercial and tactical value streams.
 */
export const FIVE_REVENUE_PILLARS: readonly RevenuePillar[] = [
  { label: "GALAXY PICKS (PAID)", href: "/packages", desc: "Paid Week 8 dossiers" },
  { label: "Game Dossiers", href: "/packages#slate-dossiers", desc: "TNF and Sunday game cards" },
  { label: "DFS", href: "/fantasy/dfs", desc: "Optimizer and stacks" },
  { label: "Pricing", href: "/pricing", desc: "All-access pricing" },
  { label: "VIP Telegram", href: "https://t.me/GalaxySportsEdge_bot", desc: "Unlock channel" },
];

export const COMMERCIAL_REVENUE_PILLARS = FIVE_REVENUE_PILLARS;

/**
 * NavChrome — the shared static shell of the global bar: brand lockup and
 * the four top-bar doors on the left, the caller's right rail in the slot,
 * and the prominent 5-Pillar live revenue bar.
 */
function NavChrome({ right }: { readonly right: ReactNode }) {
  return (
    <header className="nav">
      <div className="container nav-inner">
        <div className="nav-left">
          <BrandLockup />

          <nav className="nav-links" aria-label="Primary">
            <a href="/packages">GALAXY PICKS (PAID)</a>
            <a href="/packages#slate-dossiers">Game Dossiers</a>
            <a href="/fantasy/dfs">DFS</a>
            <a href="/pricing">Pricing</a>
            <a href="https://t.me/GalaxySportsEdge_bot">VIP Telegram</a>
          </nav>
        </div>

        {right}
      </div>

      {/* 5-Pillar Live Revenue Sub-Bar */}
      <div
        className="nav-pillars-bar border-t border-mineral/30 bg-carbon/95 py-1.5"
        data-testid="five-revenue-pillars-bar"
      >
        <div className="container flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 font-mono text-[11px] text-plasma uppercase tracking-wider">
            <span className="h-1.5 w-1.5 rounded-full bg-plasma animate-pulse" />
            <span className="hidden sm:inline">5 Pillars:</span>
          </div>
          <nav className="flex items-center gap-3 sm:gap-6 font-mono text-[11px]" aria-label="Five Revenue Pillars">
            {FIVE_REVENUE_PILLARS.map((pillar) => (
              <a
                key={pillar.href}
                href={pillar.href}
                className="text-ion-1 hover:text-plasma transition-colors"
                title={pillar.desc}
              >
                {pillar.label}
              </a>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}

/**
 * Nav — the Galaxy Sports Edge global navigation bar.
 */
export function Nav() {
  return (
    <NavChrome
      right={
        <Suspense fallback={<NavAuthFallback />}>
          <NavAuth />
        </Suspense>
      }
    />
  );
}

/**
 * NavSkeleton — the same bar, painted with the anonymous right rail directly.
 */
export function NavSkeleton() {
  return <NavChrome right={<NavAuthFallback />} />;
}
