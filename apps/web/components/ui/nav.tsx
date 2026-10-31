import React, { type ReactNode } from "react";
import { BrandLockup } from "@/components/brand/brand-lockup";
import { NavAuthFallback } from "@/components/ui/nav-auth";

/**
 * Field IA — one door per job. Board is THE board.
 *
 * The desktop bar mirrors components/ui/mobile-nav.tsx section for section.
 * Keep them in step: a door added or removed here is added or removed there
 * in the same change.
 */
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
  { label: "GALAXY PICKS (PAID)", href: "/packages", desc: "This Week's Football Betting Packs" },
  { label: "CAR @ GB final", href: "/packages/tnf-all-in-pack", desc: "Finished. Not for sale." },
  { label: "Sunday NFL Pack", href: "/packages#sunday-nfl-5pct-slate", desc: "Sunday Best Bets Pack" },
  { label: "DFS", href: "/fantasy/dfs", desc: "Daily Fantasy Lineup Optimizer" },
  { label: "All-Access Pass", href: "/packages#week8-all-access", desc: "Full Weekly All-Access Pass" },
];

export const COMMERCIAL_REVENUE_PILLARS = FIVE_REVENUE_PILLARS;

/**
 * NavChrome — the shared static shell of the global bar: brand lockup and
 * the top-bar doors on the left, the caller's right rail in the slot.
 */
function NavChrome({ right }: { readonly right: ReactNode }) {
  return (
    <header className="nav">
      <div className="container nav-inner">
        <div className="nav-left">
          <BrandLockup />

          <nav className="nav-links" aria-label="Primary">
            <a href="/packages">GALAXY PICKS (PAID)</a>
            <a href="/fantasy/dfs">DFS</a>
          </nav>
        </div>

        {right}
      </div>

      {/* This week's packs — quiet type row; scrolls sideways on phones. */}
      <div
        className="nav-pillars-bar border-t border-mineral bg-obsidian"
        data-testid="five-revenue-pillars-bar"
      >
        <div className="container flex items-center gap-6">
          <span className="hidden shrink-0 text-[11px] font-medium uppercase tracking-[0.14em] text-ion-2 sm:inline">
            This week
          </span>
          <nav
            className="flex min-w-0 flex-1 items-center gap-6 overflow-x-auto whitespace-nowrap py-2.5 text-[13px] sm:gap-8"
            aria-label="This week’s packs"
          >
            {FIVE_REVENUE_PILLARS.map((pillar) => (
              <a
                key={pillar.href}
                href={pillar.href}
                title={pillar.desc}
                className="shrink-0 text-ion-1 underline-offset-4 transition-colors hover:text-ion-white hover:underline focus-visible:text-ion-white focus-visible:underline"
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
 *
 * CORRECTION (next@14.2.35 without PPR): calling cookies()/auth() inside a
 * Suspense child still marks the parent route dynamic (ƒ) and forces a Lambda
 * per page. Rendering NavAuthFallback directly keeps all storefront and
 * marketing pages 100% static CDN routes with zero SSR cookie/session faults.
 */
export function Nav() {
  return <NavChrome right={<NavAuthFallback />} />;
}

/**
 * NavSkeleton — the same bar, painted with the anonymous right rail directly.
 */
export function NavSkeleton() {
  return <NavChrome right={<NavAuthFallback />} />;
}
