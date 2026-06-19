import Link from "next/link";
import Image from "next/image";
import { auth } from "@/lib/auth";
import { MobileNav } from "@/components/ui/mobile-nav";
import { BrandLockup } from "@/components/brand/brand-lockup";

// Small, clear top bar. The funnel doctrine: a FEW proprietary doors — the
// Board, the Lab, the Engines, the Fantasy tools — plus standalone Contests
// and The Beat for casual browse. Internal surfaces (Studio, Airwave) are
// deliberately unlinked here: they are ours, not the visitor's.
// `title` gives the metaphor-named doors a plain-English hover hint, since a
// horizontal bar has no room for an inline subtitle.
const PRIMARY_LINKS = [
  { label: "Board", href: "/board", title: "Today's picks board" },
  { label: "The House", href: "/house", title: "NFL hub — odds, picks & matchups" },
] as const;

// Tightened tail: The Beat (media), Academy (learn), Pricing, Founding Desk
// (convert). Contests now lives in the Fantasy menu and Ask Galaxy in the
// Intelligence → The Desk group — no item appears twice in the top bar.
const TAIL_LINKS = [
  { label: "The Beat", href: "/the-beat", title: "Sports-media intelligence — reporters, graded" },
  { label: "Academy", href: "/academy", title: "Learn the system, step by step" },
  { label: "Pricing", href: "/pricing", title: "Plans & what each unlocks" },
  { label: "Founding Desk", href: "/founding-desk", title: "Daily intelligence brief — Founding member access" },
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
      { label: "Opportunity", href: "/players?view=opportunity", desc: "Air yards & target share — find buy-low and sell-high players" },
      { label: "Snap Share", href: "/players?view=snaps", desc: "Who's actually on the field — offensive workload leaders" },
      { label: "Next Gen", href: "/players?view=nextgen", desc: "Separation, accuracy, and yards over expected" },
    ],
  },
  {
    items: [
      { label: "Edge Signals", href: "/players?view=edge", desc: "All the advanced stats, distilled into one tradeable read" },
    ],
  },
];

// Company ▾ — about, partners, media kit, creator network, podcast, shop.
const COMPANY_MENU: readonly NavGroup[] = [
  {
    items: [
      { label: "About", href: "/about", desc: "The story, the model, the operating principles" },
      { label: "Partners", href: "/partners", desc: "Content partnerships, collaborations, and creator network" },
      { label: "Media Kit", href: "/media-kit", desc: "Sponsor information — niche trust, not fake reach" },
      { label: "Affiliate Disclosure", href: "/affiliate-disclosure", desc: "How we disclose material connections — FTC-style, compliance-first" },
      { label: "Press", href: "/press", desc: "Press inquiries and brand assets" },
    ],
  },
  {
    heading: "Media & Community",
    items: [
      { label: "Galaxy Desk Podcast", href: "/podcast", desc: "12–18 min audio brief — Market Mirage, No-Bet Watch, matchup signal" },
      { label: "Creator Network", href: "/creator-network", desc: "Contribute by lane — NFL, NBA, MLB, fantasy, DFS, Houston local" },
      { label: "Shop", href: "/shop", desc: "Merch built around the Galaxy phrase library — opening soon" },
    ],
  },
];

// Intelligence ▾ — one tight list. Everything funnels into the engines;
// the engine browser is the single deep door.
const INTELLIGENCE_MENU: readonly NavGroup[] = [
  {
    items: [
      { label: "Intelligence Stack", href: "/stack", desc: "The whole engine in one diagram — sources, layers, gates & receipts" },
      { label: "Intelligence Engines", href: "/intelligence/engines", desc: "Every engine we run, in one place" },
      { label: "Galaxy Twin", href: "/observatory", desc: "Live market map — line moves & best available prices" },
      { label: "Trend Lab", href: "/trends", desc: "Trends that pass a real statistical test" },
      { label: "Galaxy Lab", href: "/lab", desc: "Run the model yourself — simulate any matchup, free" },
      { label: "CLV Tracker", href: "/track", desc: "Track your own bets — did you beat the closing line?" },
      { label: "How we read metrics", href: "/intelligence/metrics", desc: "What each stat means, in plain terms" },
    ],
  },
  {
    heading: "Receipts",
    items: [
      { label: "Closing Line Value", href: "/clv", desc: "Did we beat the closing line — the benchmark most services hide" },
      { label: "Calibration Report", href: "/performance", desc: "Every settled pick — win rate shown once the sample is honest" },
      { label: "Trust Ledger", href: "/ledger", desc: "Every settled pick, with a tamper-proof receipt" },
      { label: "Accountability", href: "/accountability", desc: "Loss autopsies and the full public record" },
    ],
  },
  {
    heading: "The Desk",
    items: [
      { label: "Ask Galaxy", href: "/ask-galaxy", desc: "Submit one game — manual classification: action / caution / no-bet / insufficient data" },
      { label: "Galaxy Desk Note", href: "/newsletter", desc: "Free newsletter — market signals and No-Bet Watch" },
      { label: "Sample Desk Brief", href: "/sample-desk", desc: "See a representative brief before you join" },
      { label: "Trust Room", href: "/trust-room", desc: "How confidence works, what No-Bet means, our limitations" },
      { label: "No-Bet Philosophy", href: "/no-bet", desc: "Why declining action is a first-class position" },
    ],
  },
];

// Fantasy ▾ — the core manager/DFS tools, plus Connect.
const FANTASY_MENU: readonly NavGroup[] = [
  {
    heading: "Core tools",
    items: [
      { label: "Draft Assistant", href: "/fantasy/draft", desc: "Draft tiers, player values, and live pick guidance" },
      { label: "Lineup Optimizer", href: "/fantasy/lineup", desc: "Start or sit — floor vs. ceiling, explained" },
      { label: "Waiver & FAAB", href: "/fantasy/waivers", desc: "Who to add and what to bid, with the why" },
      { label: "Trade Analyzer", href: "/fantasy/trade", desc: "Is the trade fair? Value and win-now read" },
    ],
  },
  {
    heading: "Daily (DFS)",
    items: [
      { label: "DFS Suite", href: "/fantasy/dfs", desc: "Lineup builder for cash games & tournaments — fully transparent" },
      { label: "Pick'em Edge", href: "/fantasy/props", desc: "Underdog & PrizePicks line edges, graded" },
      { label: "Contests", href: "/fantasy/contests", desc: "Best ball, survivor & squares" },
    ],
  },
  {
    items: [
      { label: "All-in-One Optimizer", href: "/optimizer", desc: "Draft, lineups & DFS in one workspace" },
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
      <div className="invisible absolute left-0 top-full z-50 pt-2 opacity-0 transition-all duration-200 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
        <div
          className="flex w-[20rem] max-w-[90vw] flex-col gap-1.5 overflow-hidden rounded-2xl p-2"
          style={{
            background: "rgba(8,6,20,0.88)",
            backdropFilter: "blur(20px) saturate(160%)",
            border: "1px solid rgba(0,229,255,0.12)",
            boxShadow: "0 0 0 1px rgba(255,255,255,0.04), 0 16px 40px -8px rgba(0,0,0,0.7), 0 0 24px -4px rgba(0,229,255,0.06)",
          }}
        >
          {groups.map((group, gi) => (
            <div key={group.heading ?? `g${gi}`} className="flex flex-col gap-0.5">
              {group.heading ? (
                <p
                  className="px-2 pb-0.5 pt-1.5 font-mono text-[9px] uppercase tracking-[0.2em]"
                  style={{ color: "rgba(0,229,255,0.6)" }}
                >
                  {group.heading}
                </p>
              ) : null}
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group/item block rounded-xl px-2.5 py-2 transition-colors hover:bg-white/5"
                >
                  <span className="block text-sm font-medium text-white">{item.label}</span>
                  <span className="block text-xs leading-4 text-ink-400 group-hover/item:text-ink-300">{item.desc}</span>
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
            {PRIMARY_LINKS.map(({ href, label, title }) => (
              <Link key={href} href={href} title={title}>
                {label}
              </Link>
            ))}

            <NavMenu label="Players" href="/players" groups={PLAYERS_MENU} />
            <NavMenu label="Intelligence" href="/intelligence/engines" groups={INTELLIGENCE_MENU} />
            <NavMenu label="Fantasy" href="/fantasy" groups={FANTASY_MENU} />
            <NavMenu label="Company" href="/about" groups={COMPANY_MENU} />

            {TAIL_LINKS.map(({ href, label, title }) => (
              <Link key={href} href={href} title={title}>
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
