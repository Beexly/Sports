import Link from "next/link";
import { Suspense } from "react";
import { BrandLockup } from "@/components/brand/brand-lockup";
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
 *
 * Customer copy pass (owner directive): the public bar no longer walks a
 * customer into the internal proof surfaces. Record (/performance), Verify
 * (/verify) and the Board-menu Calibration child (/calibration) are unlinked
 * here; the routes stay reachable by direct URL.
 */

/**
 * Nav — global bar. Auth rail is Suspense-split so public pages prerender.
 *
 * Top-bar labels (≤12): Board · Picks · Plans · Players · DFS ·
 * Props · GSN. Every label equals its page H1.
 */
export function Nav() {
  return (
    <header className="nav">
      <div className="container nav-inner">
        <div className="nav-left">
          <BrandLockup />

          <nav className="nav-links" aria-label="Primary">
            <Link href="/board" className="inline-flex items-center gap-1">
              Board
            </Link>
            <Link href="/picks" className="inline-flex items-center gap-1">
              Picks
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
