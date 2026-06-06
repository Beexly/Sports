import Link from "next/link";
import Image from "next/image";
import { auth } from "@/lib/auth";
import { MobileNav } from "@/components/ui/mobile-nav";
import { BrandLockup } from "@/components/brand/brand-lockup";

const PRIMARY_LINKS = [
  { label: "Mission Control", href: "/today" },
  { label: "Today's Board", href: "/board" },
  { label: "Trend Lab", href: "/trends" },
  { label: "Edge Map", href: "/observatory" },
] as const;

// The decision-OS surfaces, grouped under one "Intelligence ▾" menu.
const INTELLIGENCE_GROUP = [
  { label: "Inside the Signal", href: "/intelligence", desc: "How the engine reasons" },
  { label: "The Beat", href: "/the-beat", desc: "Breaking news, reliability-scored" },
  { label: "GSN", href: "/gsn", desc: "Daily intelligence transmission" },
  { label: "The Airwave Ledger", href: "/airwave", desc: "Pundits, graded on the record" },
  { label: "NFLverse Pulse", href: "/nflverse", desc: "Real player-week usage rows" },
  { label: "Production Lab", href: "/players", desc: "Season + last-5 form, defense ranks" },
  { label: "Snap Share", href: "/players/snaps", desc: "Offensive workload leaders" },
  { label: "Next Gen Stats", href: "/players/nextgen", desc: "Separation, CPOE, RYOE — tracking data" },
  { label: "Edge Signals", href: "/players/edge", desc: "Buy-low / sell-high from tracking vs output" },
  { label: "Injury Report", href: "/players/injuries", desc: "Official availability designations" },
  { label: "Market Signal", href: "/players/market", desc: "Live fantasy adds/drops (Sleeper)" },
  { label: "DFS Salaries", href: "/players/dfs", desc: "DraftKings via licensed feeds, cross-checked" },
  { label: "Game Weather", href: "/weather", desc: "Live conditions at outdoor NFL venues (NWS)" },
  { label: "Parlay MRI", href: "/parlay-mri", desc: "X-ray a ticket's risk" },
  { label: "The Academy", href: "/academy", desc: "Train on process, not luck" },
  { label: "Trust Ledger", href: "/ledger", desc: "Tamper-evident record" },
  { label: "CLV Tracker", href: "/track", desc: "Your glass-box bet ledger" },
  { label: "Data & Integrations", href: "/integrations", desc: "What's live, what's gated" },
  { label: "Data Sourcing", href: "/data", desc: "How we legally source every feed" },
  { label: "The Cipher", href: "/cipher", desc: "Weekly hidden hunt" },
] as const;

// The fantasy-football OS surfaces, grouped under "Fantasy ▾".
const FANTASY_GROUP = [
  { label: "Fantasy Home", href: "/fantasy", desc: "Readiness and roadmap" },
  { label: "Baseline Map", href: "/fantasy/baseline", desc: "LineStar and Elite feature floor" },
  { label: "Connect League", href: "/fantasy/connect", desc: "Read-only Sleeper sync" },
  { label: "GM Autopilot", href: "/fantasy/autopilot", desc: "Delegate from advice to full remote" },
  { label: "The League Twin", href: "/fantasy/league-twin", desc: "Your roster as a galaxy" },
  { label: "The GM Ledger", href: "/fantasy/gm-ledger", desc: "Decisions graded on process" },
  { label: "GM Academy", href: "/fantasy/academy", desc: "Drill the process, build GM IQ" },
  { label: "Draft Assistant", href: "/fantasy/draft", desc: "Tiers, VOR, live guidance" },
  { label: "Waiver & FAAB", href: "/fantasy/waivers", desc: "Adds and bids, with the why" },
  { label: "Lineup Optimizer", href: "/fantasy/lineup", desc: "Start-sit, floor vs. ceiling" },
  { label: "DFS Optimizer", href: "/fantasy/dfs", desc: "Cash/GPP/leverage, glass-box" },
  { label: "Pick'em Edge", href: "/fantasy/props", desc: "Underdog & Pick6 line edges" },
  { label: "Trade Analyzer", href: "/fantasy/trade", desc: "Value, fairness, win-now lean" },
  { label: "Scheme Intelligence", href: "/fantasy/scheme", desc: "How a coaching change cascades" },
  { label: "Contests", href: "/fantasy/contests", desc: "Best ball, survivor, DFS, squares" },
  { label: "Galaxy Studios", href: "/fantasy/studio", desc: "The weekly brief, auto-composed" },
] as const;

const TAIL_LINKS = [
  { label: "Methodology", href: "/methodology" },
  { label: "Pricing", href: "/pricing" },
] as const;

export async function Nav() {
  const session = await auth().catch(() => null);
  const user = session?.user ?? null;

  return (
    <header className="nav">
      <div className="container nav-inner">
        <div className="nav-left">
          <BrandLockup />

          <nav className="nav-links" aria-label="Primary">
            {PRIMARY_LINKS.map(({ href, label }) => (
              <Link key={href} href={href}>
                {label}
              </Link>
            ))}

            {/* Grouped decision-OS surfaces — hover or keyboard-focus to open */}
            <div className="group relative">
              <Link href="/intelligence" aria-haspopup="true" className="inline-flex items-center gap-1">
                Intelligence
                <span aria-hidden className="text-[9px] opacity-70 transition-transform duration-150 group-hover:rotate-180">▼</span>
              </Link>
              <div className="invisible absolute left-0 top-full z-50 pt-2 opacity-0 transition-all duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                <div className="surface-card w-64 p-2">
                  {INTELLIGENCE_GROUP.map((item) => (
                    <Link key={item.href} href={item.href} className="block">
                      <span className="block text-sm font-medium text-white">{item.label}</span>
                      <span className="block text-xs text-ink-500">{item.desc}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* Fantasy OS surfaces */}
            <div className="group relative">
              <Link href="/fantasy" aria-haspopup="true" className="inline-flex items-center gap-1">
                Fantasy
                <span aria-hidden className="text-[9px] opacity-70 transition-transform duration-150 group-hover:rotate-180">▼</span>
              </Link>
              <div className="invisible absolute left-0 top-full z-50 pt-2 opacity-0 transition-all duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                <div className="surface-card w-64 p-2">
                  {FANTASY_GROUP.map((item) => (
                    <Link key={item.href} href={item.href} className="block">
                      <span className="block text-sm font-medium text-white">{item.label}</span>
                      <span className="block text-xs text-ink-500">{item.desc}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {TAIL_LINKS.map(({ href, label }) => (
              <Link key={href} href={href}>
                {label}
              </Link>
            ))}
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
