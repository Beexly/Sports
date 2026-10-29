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
  { label: "Panthers @ Packers Pack", href: "/packages#tnf-all-in-pack", desc: "Carolina @ Green Bay Sunday Pack" },
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

      {/* Live Quick-Jump Bar */}
      <div
        className="nav-pillars-bar border-t border-slate-800 bg-slate-950 py-2"
        data-testid="five-revenue-pillars-bar"
      >
        <div className="container flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 font-mono text-xs font-semibold text-amber-400 uppercase tracking-wider">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            <span className="hidden sm:inline">Quick Jump:</span>
          </div>
          <nav className="flex items-center gap-4 sm:gap-6 font-sans text-xs font-medium" aria-label="Five Revenue Pillars">
            {FIVE_REVENUE_PILLARS.map((pillar) => (
              <a
                key={pillar.href}
                href={pillar.href}
                className="text-slate-200 hover:text-amber-400 transition-colors"
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
