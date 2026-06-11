import Link from "next/link";
import Image from "next/image";
import { auth } from "@/lib/auth";
import { MobileNav } from "@/components/ui/mobile-nav";
import { BrandLockup } from "@/components/brand/brand-lockup";

// Small, clear top bar. The funnel doctrine: a FEW proprietary doors — the
// Board, the Lab, the Engines, the Fantasy tools — plus standalone Contests
// and The Beat for casual browse. Internal surfaces (Studio, Airwave) are
// deliberately unlinked here: they are ours, not the visitor's.
const PRIMARY_LINKS = [{ label: "Board", href: "/board" }] as const;

const TAIL_LINKS = [
  { label: "Contests", href: "/fantasy/contests" },
  { label: "The Beat", href: "/the-beat" },
  { label: "Academy", href: "/academy" },
  { label: "Pricing", href: "/pricing" },
] as const;

type NavItem = { label: string; href: string; desc: string };
type NavGroup = { heading?: string; items: readonly NavItem[] };

// Players ▾ — the Lab plus a few high-value deep-link views. "See all in the Lab".
const PLAYERS_MENU: readonly NavGroup[] = [
  {
    items: [
      { label: "Player Lab", href: "/players", desc: "All player data in one tabbed surface" },
    ],
  },
  {
    heading: "Advanced stats",
    items: [
      { label: "Opportunity", href: "/players?view=opportunity", desc: "Air yards · WOPR — buy-low / sell-high" },
      { label: "Snap Share", href: "/players?view=snaps", desc: "Offensive workload leaders" },
      { label: "Next Gen", href: "/players?view=nextgen", desc: "Separation, CPOE, RYOE" },
    ],
  },
  {
    items: [
      { label: "Edge Signals", href: "/players?view=edge", desc: "All the advanced stats, distilled into one tradeable read" },
    ],
  },
];

// Intelligence ▾ — one tight list. Everything funnels into the engines;
// the engine browser is the single deep door.
const INTELLIGENCE_MENU: readonly NavGroup[] = [
  {
    items: [
      { label: "Intelligence Engines", href: "/intelligence/engines", desc: "Every engine we run, browsable" },
      { label: "Mission Control", href: "/today", desc: "Today's command deck" },
      { label: "Galaxy Twin", href: "/observatory", desc: "The slate as a living market map" },
      { label: "Trend Lab", href: "/trends", desc: "Significant trends, with p-values" },
      { label: "CLV Tracker", href: "/track", desc: "Your glass-box bet ledger" },
      { label: "How we read metrics", href: "/intelligence/metrics", desc: "Metric methodology, glass-box" },
    ],
  },
];

// Fantasy ▾ — the core manager/DFS tools, plus Connect.
const FANTASY_MENU: readonly NavGroup[] = [
  {
    heading: "Core tools",
    items: [
      { label: "Draft Assistant", href: "/fantasy/draft", desc: "Tiers, VOR, live guidance" },
      { label: "Lineup Optimizer", href: "/fantasy/lineup", desc: "Start-sit, floor vs ceiling" },
      { label: "Waiver & FAAB", href: "/fantasy/waivers", desc: "Adds and bids, with the why" },
      { label: "Trade Analyzer", href: "/fantasy/trade", desc: "Value, fairness, win-now" },
      { label: "DFS Suite", href: "/fantasy/dfs", desc: "Salary board + optimizer — cash / GPP / leverage" },
      { label: "Pick'em Edge", href: "/fantasy/props", desc: "Pick'em line edges, graded" },
    ],
  },
  {
    items: [
      { label: "Connect League", href: "/fantasy/connect", desc: "Link your league in one tap" },
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
            {PRIMARY_LINKS.map(({ href, label }) => (
              <Link key={href} href={href}>
                {label}
              </Link>
            ))}

            <NavMenu label="Players" href="/players" groups={PLAYERS_MENU} />
            <NavMenu label="Intelligence" href="/intelligence/engines" groups={INTELLIGENCE_MENU} />
            <NavMenu label="Fantasy" href="/fantasy" groups={FANTASY_MENU} />

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
