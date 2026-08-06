import Link from "next/link";
import Image from "next/image";
import { auth } from "@/lib/auth";
import { MobileNav } from "@/components/ui/mobile-nav";
import { BrandLockup } from "@/components/brand/brand-lockup";
import { NavMenu } from "@/components/ui/nav-menu";

// Four doors, not ten. The 2026 IA condenses every public surface into four
// primary doors — Board, Players, Intelligence, Fantasy & Daily — plus two
// prominent standalone links (The Beat, Proof). Players is a single direct link
// to one immaculate lab (its deep views are in-page lenses, not nav items).
// Proof is pulled OUT of Intelligence into its own door so credibility is a
// global anchor, not a sub-menu. Right-side utilities (Live Board, Pricing,
// account) stay out of the door count. The bar reads like an instrument, not a
// sitemap. Internal surfaces (Studio, Airwave) remain deliberately unlinked.
type NavItem = { label: string; href: string; desc: string };
type NavGroup = { heading?: string; items: readonly NavItem[] };

// Board ▾ — the daily decision surfaces. What do I do today?
const BOARD_MENU: readonly NavGroup[] = [
  {
    items: [
      { label: "Today's Picks", href: "/picks", desc: "Every pick, with the reasoning attached" },
      { label: "Today's Board", href: "/board", desc: "Today's picks, scored and ranked" },
      { label: "The House", href: "/house", desc: "NFL hub: odds, picks & matchups" },
      { label: "Mission Control", href: "/today", desc: "Everything happening today, in one view" },
      { label: "Daily Briefing", href: "/gsn", desc: "Daily intelligence transmission format" },
    ],
  },
];

// Intelligence ▾ — the engine room. How we think. (Proof + Academy moved out.)
const INTELLIGENCE_MENU: readonly NavGroup[] = [
  {
    items: [
      { label: "Intelligence Engines", href: "/intelligence/engines", desc: "Every engine we run, in one place" },
      { label: "Galaxy Twin", href: "/observatory", desc: "Live market map: line moves and best prices" },
    ],
  },
];

// GSN ▾ — Galaxy Sports Network, the media + studio arm. The broadcast, the
// production desk, and the school. (How-we-read-metrics now lives under Proof.)
const GSN_MENU: readonly NavGroup[] = [
  {
    items: [
      { label: "The Beat", href: "/the-beat", desc: "The cinematic broadcast, scored at the source" },
      { label: "The Studio", href: "/fantasy/studio", desc: "Inside the production desk, where the broadcast is built" },
      { label: "The Academy", href: "/academy", desc: "Learn the signal. Train on the process, step by step" },
    ],
  },
];

// Fantasy & Daily ▾ — the tools. Season-long managers and daily lineups in one
// door. Condensed to the live, hand-in-hand tools; secondary surfaces live on
// the /fantasy hub.
const FANTASY_DAILY_MENU: readonly NavGroup[] = [
  {
    heading: "Fantasy",
    items: [
      { label: "Draft Assistant", href: "/fantasy/draft", desc: "Draft tiers, player values & live pick guidance" },
      { label: "Best Ball", href: "/fantasy/bestball", desc: "Draft-only roster construction: ceiling, stacks & bye structure" },
      { label: "Start-Sit Helper", href: "/fantasy/lineup", desc: "Start or sit: floor vs. ceiling, explained" },
      { label: "Waiver & FAAB", href: "/fantasy/waivers", desc: "Who to add and what to bid, with the why" },
      { label: "Trade Analyzer", href: "/fantasy/trade", desc: "Is the trade fair? Value and win-now read" },
    ],
  },
  {
    heading: "Daily",
    items: [
      { label: "All-in-One Optimizer", href: "/optimizer", desc: "Draft, lineups & daily in one workspace" },
      { label: "DFS Suite", href: "/fantasy/dfs", desc: "Lineup builder for cash games & tournaments" },
      { label: "Pick'em Edge", href: "/fantasy/props", desc: "Underdog & PrizePicks line edges, graded" },
    ],
  },
];

export async function Nav() {
  const session = await auth().catch(() => null);
  const user = session?.user ?? null;

  return (
    <header className="nav">
      <div className="container nav-inner">
        <div className="nav-left">
          <BrandLockup />

          <nav className="nav-links" aria-label="Primary">
            <NavMenu label="Board" href="/board" groups={BOARD_MENU} />
            <Link href="/players" title="The Lab: every player, every signal, one place">
              The Lab
            </Link>
            <NavMenu label="Intelligence" href="/intelligence/engines" groups={INTELLIGENCE_MENU} />
            <NavMenu label="Fantasy & Daily" href="/fantasy" groups={FANTASY_DAILY_MENU} />
            <NavMenu label="GSN" href="/the-beat" groups={GSN_MENU} />

            <Link href="/calibration" title="The Proof Room: calibration, CLV, and the public ledger">
              Proof
            </Link>
          </nav>
        </div>

        <div className="nav-right">
          <span className="live-chip">
            <span className="dot" />
            Live Board
          </span>

          <div className="desktop-auth">
            {user ? (
              <Link href="/dashboard" className="btn btn-ghost btn-sm" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                <span style={{ display: "inline-flex", width: 22, height: 22, borderRadius: "50%", overflow: "hidden", background: "var(--titanium)" }}>
                  {user.image ? (
                    <Image src={user.image} alt={user.name ?? "User avatar"} width={22} height={22} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <span style={{ display: "flex", width: "100%", height: "100%", alignItems: "center", justifyContent: "center", color: "var(--ion-white)", fontSize: 11, fontWeight: 600 }}>
                      {user.name?.[0]?.toUpperCase() ?? user.email?.[0]?.toUpperCase() ?? "U"}
                    </span>
                  )}
                </span>
                <span>{user.name ?? user.email}</span>
              </Link>
            ) : (
              <>
                <Link href="/auth/signin" className="btn btn-ghost btn-sm">
                  Sign in
                </Link>
                <Link href="/pricing" className="btn btn-primary btn-sm">
                  See plans
                </Link>
              </>
            )}
          </div>

          <MobileNav />
        </div>
      </div>
    </header>
  );
}
