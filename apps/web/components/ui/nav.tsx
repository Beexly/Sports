import { Suspense } from "react";
import { BrandLockup } from "@/components/brand/brand-lockup";
import { NavActiveLink } from "@/components/ui/nav-active-link";
import { NavMenu } from "@/components/ui/nav-menu";
import { NavAuth, NavAuthFallback } from "@/components/ui/nav-auth";

/**
 * Field IA — one door per job. Board is THE board.
 *
 * The desktop bar mirrors components/ui/mobile-nav.tsx section for section
 * (Board, Players, Intelligence, Fantasy, GSN, Proof). The two menus are read
 * by the same integrity guard, and a desktop bar that quietly drops a door the
 * mobile panel still carries is how a route becomes unreachable on desktop
 * only. Keep them in step: a door added or removed here is added or removed
 * there in the same change.
 */
type NavItem = { label: string; href: string; desc: string };
type NavGroup = { heading?: string; items: readonly NavItem[] };

const BOARD_MENU: readonly NavGroup[] = [
  {
    items: [
      { label: "The board", href: "/board", desc: "Scored today · cleared · held" },
      { label: "Picks with reasoning", href: "/picks", desc: "Published picks and factor notes" },
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

const INTELLIGENCE_MENU: readonly NavGroup[] = [
  {
    items: [
      { label: "Engines", href: "/intelligence/engines", desc: "Inside the scoring pass" },


      { label: "Methodology", href: "/methodology", desc: "Factors, data rights, gates" },
      { label: "Free tools", href: "/tools", desc: "EV, no-vig, parlay, CLV — live calculators" },
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
      { label: "The Studio", href: "/fantasy/studio", desc: "Production desk" },
      { label: "The Academy", href: "/academy", desc: "Learn the signal" },
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
            <NavMenu label="Intelligence" href="/intelligence/engines" groups={INTELLIGENCE_MENU} />
            <NavMenu label="Fantasy" href="/fantasy" groups={FANTASY_MENU} />
            <NavMenu label="GSN" href="/the-beat" groups={GSN_MENU} />
            <NavActiveLink href="/calibration" title="Record: calibration, CLV, receipts">
              Record
            </NavActiveLink>
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
