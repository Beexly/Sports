import Link from "next/link";
import Image from "next/image";
import { auth } from "@/lib/auth";
import { MobileNav } from "@/components/ui/mobile-nav";
import { BrandLockup } from "@/components/brand/brand-lockup";

// Four doors, not ten. The 2026 IA condenses every public surface into four
// primary doors — Board, Players, Intelligence, Fantasy & Daily — plus a single
// prominent media door (The Beat). Right-side utilities (Live Board, Pricing,
// account) stay out of the door count. Each door is a mega-menu that states the
// surface's plain-English purpose, so the bar reads like an instrument, not a
// sitemap. Internal surfaces (Studio, Airwave) remain deliberately unlinked.
type NavItem = { label: string; href: string; desc: string };
type NavGroup = { heading?: string; items: readonly NavItem[] };

// Board ▾ — the daily decision surfaces. What do I do today?
const BOARD_MENU: readonly NavGroup[] = [
  {
    items: [
      { label: "Today's Board", href: "/board", desc: "Today's picks, scored and ranked" },
      { label: "The House", href: "/house", desc: "NFL hub — odds, picks & matchups" },
      { label: "Mission Control", href: "/today", desc: "Everything happening today, in one view" },
      { label: "Daily Briefing", href: "/gsn", desc: "Our daily briefing format — live feed coming soon" },
    ],
  },
];

// Players ▾ — one immaculate lab. The deep views are lenses on the same data,
// not separate doors.
const PLAYERS_MENU: readonly NavGroup[] = [
  {
    items: [
      { label: "Player Lab", href: "/players", desc: "Every player, every signal — filter, sort, expand" },
      { label: "Edge Signals", href: "/players?view=edge", desc: "The advanced stats, distilled into one tradeable read" },
    ],
  },
  {
    heading: "Lenses",
    items: [
      { label: "Opportunity", href: "/players?view=opportunity", desc: "Air yards & target share — buy-low and sell-high" },
      { label: "Snap Share", href: "/players?view=snaps", desc: "Who's actually on the field" },
      { label: "Next Gen", href: "/players?view=nextgen", desc: "Separation, accuracy & yards over expected" },
      { label: "DFS Board", href: "/players?view=dfs", desc: "Salary value vs. role and usage" },
    ],
  },
  {
    items: [
      { label: "Trend Lab", href: "/trends", desc: "Trends that pass a real statistical test" },
    ],
  },
];

// Intelligence ▾ — the engine room and the proof. How we think, and how we prove it.
const INTELLIGENCE_MENU: readonly NavGroup[] = [
  {
    items: [
      { label: "Intelligence Engines", href: "/intelligence/engines", desc: "Every engine we run, in one place" },
      { label: "Galaxy Twin", href: "/observatory", desc: "Live market map — line moves & best prices" },
      { label: "Command Deck", href: "/deck", desc: "The intelligence command deck" },
      { label: "How we read metrics", href: "/intelligence/metrics", desc: "What each stat means, in plain terms" },
      { label: "Learn the Signal", href: "/academy", desc: "Train on the process, step by step" },
    ],
  },
  {
    heading: "The Proof Room",
    items: [
      { label: "Calibration Report", href: "/performance", desc: "Every settled pick — win rate, once the sample is honest" },
      { label: "Closing Line Value", href: "/clv", desc: "Did we beat the close — the benchmark most services hide" },
      { label: "Trust Ledger", href: "/ledger", desc: "Every settled pick, with a tamper-proof receipt" },
      { label: "Accountability", href: "/accountability", desc: "Loss autopsies and the full public record" },
      { label: "CLV Tracker", href: "/track", desc: "Track your own bets — did you beat the close?" },
    ],
  },
];

// Fantasy & Daily ▾ — the tools. Season-long managers and daily lineups in one door.
const FANTASY_DAILY_MENU: readonly NavGroup[] = [
  {
    heading: "Fantasy",
    items: [
      { label: "Draft Assistant", href: "/fantasy/draft", desc: "Draft tiers, player values & live pick guidance" },
      { label: "Start-Sit Helper", href: "/fantasy/lineup", desc: "Start or sit — floor vs. ceiling, explained" },
      { label: "Waiver & FAAB", href: "/fantasy/waivers", desc: "Who to add and what to bid, with the why" },
      { label: "Trade Analyzer", href: "/fantasy/trade", desc: "Is the trade fair? Value and win-now read" },
      { label: "Connect League", href: "/fantasy/connect", desc: "Link your league in one tap" },
    ],
  },
  {
    heading: "Daily",
    items: [
      { label: "All-in-One Optimizer", href: "/optimizer", desc: "Draft, lineups & daily in one workspace" },
      { label: "DFS Suite", href: "/fantasy/dfs", desc: "Lineup builder for cash games & tournaments" },
      { label: "Salary Board", href: "/fantasy/dfs#salary-board", desc: "DraftKings salaries, reconciled when the feed is live" },
      { label: "Pick'em Edge", href: "/fantasy/props", desc: "Underdog & PrizePicks line edges, graded" },
      { label: "Contests", href: "/fantasy/contests", desc: "Best ball, survivor & squares" },
    ],
  },
];

function NavMenu({ label, href, groups }: { label: string; href: string; groups: readonly NavGroup[] }) {
  return (
    <div className="group relative">
      <Link href={href} aria-haspopup="true" className="inline-flex items-center gap-1">
        {label}
        <span aria-hidden className="text-[9px] opacity-70 transition-transform duration-150 group-hover:rotate-180">▼</span>
      </Link>
      <div className="invisible absolute left-0 top-full z-50 pt-2 opacity-0 transition-all duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
        <div className="surface-card flex w-[20rem] max-w-[90vw] flex-col gap-2 p-2">
          {groups.map((group, gi) => (
            <div key={group.heading ?? `g${gi}`} className="flex flex-col gap-0.5">
              {group.heading ? (
                <p className="px-2 pb-0.5 pt-1 text-[10px] font-semibold uppercase tracking-wider text-ink-200">
                  {group.heading}
                </p>
              ) : null}
              {group.items.map((item) => (
                <Link key={item.href} href={item.href} className="block rounded-md px-2 py-1.5 hover:bg-white/5">
                  <span className="block text-sm font-medium text-white">{item.label}</span>
                  <span className="block text-xs text-ink-200">{item.desc}</span>
                </Link>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

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
            <NavMenu label="Players" href="/players" groups={PLAYERS_MENU} />
            <NavMenu label="Intelligence" href="/intelligence/engines" groups={INTELLIGENCE_MENU} />
            <NavMenu label="Fantasy & Daily" href="/fantasy" groups={FANTASY_DAILY_MENU} />

            <Link href="/the-beat" title="Sports-media intelligence — reporters, graded">
              The Beat
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
