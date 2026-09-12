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
            <NavMenu label="Players" href="/players" groups={PLAYERS_MENU} />
            <NavMenu label="Fantasy" href="/fantasy" groups={FANTASY_MENU} />
            <NavMenu label="GSN" href="/the-beat" groups={GSN_MENU} />
          </nav>
        </div>

        <Suspense fallback={<NavAuthFallback />}>
          <NavAuth />
        </Suspense>
      </div>
    </header>
  );
}
