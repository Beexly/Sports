import { Suspense } from "react";
import { BrandLockup } from "@/components/brand/brand-lockup";
import { NavActiveLink } from "@/components/ui/nav-active-link";
import { NavMenu } from "@/components/ui/nav-menu";
import { NavAuth, NavAuthFallback } from "@/components/ui/nav-auth";

/**
 * Field IA — five destinations, matching the condensed footer.
 * Board · Record · Method · Fantasy · Plans
 * Deep product routes stay on their hubs; the bar is not a sitemap.
 */
type NavItem = { label: string; href: string; desc: string };
type NavGroup = { heading?: string; items: readonly NavItem[] };

const BOARD_MENU: readonly NavGroup[] = [
  {
    items: [
      { label: "Today's Board", href: "/board", desc: "Scored markets, cleared and held" },
      { label: "Today's Picks", href: "/picks", desc: "Every pick, with the reasoning attached" },
      { label: "The House", href: "/house", desc: "NFL hub: odds, picks & matchups" },
      { label: "Today", href: "/today", desc: "Everything happening today, in one view" },
    ],
  },
];

const METHOD_MENU: readonly NavGroup[] = [
  {
    items: [
      { label: "How it works", href: "/intelligence", desc: "Inside the scoring pass" },
      { label: "Engines", href: "/intelligence/engines", desc: "Every engine we run" },
      { label: "Methodology", href: "/methodology", desc: "Factors, data rights, gates" },
      { label: "Free tools", href: "/tools", desc: "EV, no-vig, parlay, CLV calculators" },
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
    ],
  },
];

/**
 * Nav — global bar. Auth rail is Suspense-split so public pages prerender.
 */
export function Nav() {
  return (
    <header className="nav">
      <div className="container nav-inner">
        <div className="nav-left">
          <BrandLockup />

          <nav className="nav-links" aria-label="Primary">
            <NavMenu label="Board" href="/board" groups={BOARD_MENU} />
            <NavActiveLink href="/calibration" title="Record: calibration, CLV, receipts">
              Record
            </NavActiveLink>
            <NavMenu label="Method" href="/intelligence" groups={METHOD_MENU} />
            <NavMenu label="Fantasy" href="/fantasy" groups={FANTASY_MENU} />
            <NavActiveLink href="/verify" title="Recompute a sealed receipt">
              Verify
            </NavActiveLink>
            <NavActiveLink href="/pricing" title="Plans">
              Plans
            </NavActiveLink>
          </nav>
        </div>

        <Suspense fallback={<NavAuthFallback />}>
          <NavAuth />
        </Suspense>
      </div>
    </header>
  );
}
