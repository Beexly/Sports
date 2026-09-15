import Link from "next/link";
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
 *
 * C-360 (LP1, D3): nav carries only the live surfaces. The nine sample-backed
 * fantasy tools (lineup, waivers, draft, trade, bestball, nba, touchdowns,
 * showdown, connect) are parked — routes stay, nav drops them until each has
 * a named real data path (C-412).
 */
type NavItem = { label: string; href: string; desc: string };
type NavGroup = { heading?: string; items: readonly NavItem[] };

/** Calibration lives under the Board menu (not a top-bar label). */
const BOARD_MENU: readonly NavGroup[] = [
  {
    items: [
      {
        label: "Calibration",
        href: "/calibration",
        desc: "Trust architecture and the public record",
      },
    ],
  },
];

/**
 * Nav — global bar. Auth rail is Suspense-split so public pages prerender.
 *
 * Top-bar labels (≤12): Board · Picks · Record · Method · Verify · Plans ·
 * Players · DFS · Props · GSN. Every label equals its page H1.
 * Calibration sits under the Board menu.
 */
export function Nav() {
  return (
    <header className="nav">
      <div className="container nav-inner">
        <div className="nav-left">
          <BrandLockup />

          <nav className="nav-links" aria-label="Primary">
            <NavMenu label="Board" href="/board" groups={BOARD_MENU} />
            <Link href="/picks" className="inline-flex items-center gap-1">
              Picks
            </Link>
            <Link href="/performance" className="inline-flex items-center gap-1">
              Record
            </Link>
            <Link href="/methodology" className="inline-flex items-center gap-1">
              Method
            </Link>
            <Link href="/verify" className="inline-flex items-center gap-1">
              Verify
            </Link>
            <Link href="/pricing" className="inline-flex items-center gap-1">
              Plans
            </Link>
            <Link href="/players" className="inline-flex items-center gap-1">
              Players
            </Link>
            <Link href="/fantasy/dfs" className="inline-flex items-center gap-1">
              DFS
            </Link>
            <Link href="/fantasy/props" className="inline-flex items-center gap-1">
              Props
            </Link>
            <Link href="/gsn" className="inline-flex items-center gap-1">
              GSN
            </Link>
          </nav>
        </div>

        <Suspense fallback={<NavAuthFallback />}>
          <NavAuth />
        </Suspense>
      </div>
    </header>
  );
}
