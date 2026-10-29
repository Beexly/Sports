import React, { Suspense, type ReactNode } from "react";
import { BrandLockup } from "@/components/brand/brand-lockup";
import { NavMenu } from "@/components/ui/nav-menu";
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
  { label: "Picks", href: "/picks", desc: "Today's top side and total signals" },
  { label: "Player Props", href: "/fantasy/props", desc: "Underdog & PrizePicks N_eff edges" },
  { label: "SGP Projections", href: "/sgp-projections", desc: "Correlated parlay mispricing" },
  { label: "DFS Optimizer", href: "/fantasy/dfs", desc: "Cash and tournament builders" },
  { label: "Pick Packages", href: "/packages", desc: "A-la-carte slate dossiers & writeups" },
];

const BOARD_MENU: readonly NavGroup[] = [
  {
    items: [
      {
        label: "The board",
        href: "/board",
        desc: "Every game we scored today",
      },
      {
        label: "League slates",
        href: "/slate",
        desc: "NFL · NCAAF · NBA · NCAAB · MLB · NHL · MLS",
      },
      {
        label: "Today's picks",
        href: "/picks",
        desc: "What we're on, with the reason",
      },
      {
        label: "Our record",
        href: "/calibration",
        desc: "How we've done, graded in public",
      },
      {
        label: "Bankroll",
        href: "/bankroll",
        desc: "Every settled result, counted",
      },
      {
        label: "SGP projections",
        href: "/sgp-projections",
        desc: "Our number for each same-game market",
      },
      {
        label: "Pick packages",
        href: "/packages",
        desc: "A-la-carte slate packages",
      },
    ],
  },
];

const PLAYERS_MENU: readonly NavGroup[] = [
  {
    items: [
      { label: "Player lab", href: "/players", desc: "Every player, every signal" },
      { label: "The NFL house", href: "/house", desc: "The NFL hub" },
    ],
  },
];

const FANTASY_MENU: readonly NavGroup[] = [
  {
    heading: "Fantasy",
    items: [
      { label: "Start-Sit", href: "/fantasy/lineup", desc: "Floor vs ceiling, explained" },
      { label: "Waivers", href: "/fantasy/waivers", desc: "Who to add and what to bid" },
      { label: "Draft", href: "/fantasy/draft", desc: "Tiers and live pick guidance" },
      { label: "Trade", href: "/fantasy/trade", desc: "Is the trade fair?" },
    ],
  },
  {
    heading: "Daily",
    items: [
      { label: "DFS", href: "/fantasy/dfs", desc: "Cash and tournament builders" },
      { label: "Pick'em", href: "/fantasy/props", desc: "Underdog & PrizePicks edges" },
      { label: "Best ball", href: "/fantasy/bestball", desc: "Season-long drafts, solved" },
      { label: "NBA slate", href: "/fantasy/nba", desc: "The hoops board" },
      { label: "Touchdowns", href: "/fantasy/touchdowns", desc: "Anytime TD, glass-box" },
      { label: "Showdown", href: "/fantasy/showdown", desc: "Single game, 1.5x captain" },
      { label: "Optimizer", href: "/optimizer", desc: "Every lineup, one workspace" },
      { label: "Connect league", href: "/fantasy/connect", desc: "Sync your real roster" },
    ],
  },
];

const GSN_MENU: readonly NavGroup[] = [
  {
    heading: "GSN",
    items: [
      { label: "The Beat", href: "/the-beat", desc: "Cinematic broadcast" },
    ],
  },
];

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
            <NavMenu label="Board" href="/board" groups={BOARD_MENU} />
            <NavMenu label="Players" href="/players" groups={PLAYERS_MENU} />
            <NavMenu label="Fantasy" href="/fantasy" groups={FANTASY_MENU} />
            <NavMenu label="GSN" href="/the-beat" groups={GSN_MENU} />
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
