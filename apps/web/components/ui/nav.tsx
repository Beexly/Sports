import { Suspense } from "react";
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
 * Nav — global bar. Auth rail is Suspense-split so the shell streams before
 * the session resolves.
 *
 * CORRECTION (verified against next@14.2.35, no PPR): that Suspense boundary
 * does NOT keep the surrounding page statically prerenderable. In
 * `dist/server/app-render/dynamic-rendering.js`, `trackDynamicDataAccessed()`
 * sets `store.revalidate = 0` BEFORE it throws the DynamicServerError, and
 * `app-render.js` then copies that store value onto `metadata.revalidate`,
 * which `dist/build/index.js` reads as `hasDynamicData`. Suspending (or
 * swallowing) the throw therefore cannot restore static generation: the
 * cookie read has already marked the render dynamic. Partial Prerendering is
 * the feature that would make the claim true, and `experimental.ppr` is not
 * enabled in next.config.mjs. The Suspense boundary is still worth keeping —
 * it streams the shell before the session resolves — it just is not a
 * static-generation guarantee, so do not treat it as one.
 */
export function Nav() {
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
    </header>
  );
}

