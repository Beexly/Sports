import Link from "next/link";
import Image from "next/image";
import { auth } from "@/lib/auth";
import { MobileNav } from "@/components/ui/mobile-nav";
import { BrandLockup } from "@/components/brand/brand-lockup";

// Decision OS IA: four doors — Edge · My Gameplan · Learn · Proof. The logo carries Home, where the
// daily "Today" decision feed lives. Every prior surface is RE-HOMED here, none deleted: Edge holds the
// betting/markets surfaces (Board, House, Players Lab, Live Market Map, props); My Gameplan holds the
// season-long + daily fantasy tools; Learn holds how-we-read-it + Stories + Academy; Proof holds the
// receipts, calibration, and the scar memory ("What we learned"). Internal engine names never appear
// here — public labels only (e.g. Galaxy Twin → "Live Market Map").
type NavItem = { label: string; href: string; desc: string };
type NavGroup = { heading?: string; items: readonly NavItem[] };

// Edge ▾ — the markets workspace. What's worth a play, and what to pass.
const EDGE_MENU: readonly NavGroup[] = [
  {
    items: [
      { label: "Today's Board", href: "/board", desc: "Today's reads, scored and ranked" },
      { label: "The House", href: "/house", desc: "NFL hub — odds, picks & matchups" },
      { label: "Players Lab", href: "/players", desc: "One surface, every player, every signal" },
      { label: "Live Market Map", href: "/observatory", desc: "Line moves and the best number, live" },
      { label: "Props & Pick'em", href: "/fantasy/props", desc: "Prop and pick'em line edges, graded" },
      { label: "Mission Control", href: "/today", desc: "Everything happening today, in one view" },
      { label: "Daily Briefing", href: "/gsn", desc: "Our daily briefing format" },
    ],
  },
];

// My Gameplan ▾ — the season-long + daily fantasy tools.
const GAMEPLAN_MENU: readonly NavGroup[] = [
  {
    heading: "Season-long",
    items: [
      { label: "Draft Assistant", href: "/fantasy/draft", desc: "Draft tiers, values & live pick guidance" },
      { label: "Start-Sit Helper", href: "/fantasy/lineup", desc: "Start or sit: floor vs. ceiling, explained" },
      { label: "Waiver & FAAB", href: "/fantasy/waivers", desc: "Who to add and what to bid, with the why" },
      { label: "Trade Analyzer", href: "/fantasy/trade", desc: "Is the trade fair? Value and win-now read" },
      { label: "Best Ball", href: "/fantasy/bestball", desc: "Ceiling, stacks & bye structure" },
    ],
  },
  {
    heading: "Daily",
    items: [
      { label: "DFS Suite", href: "/fantasy/dfs", desc: "Lineup builder for cash & tournaments" },
      { label: "All-in-One Optimizer", href: "/optimizer", desc: "Draft, lineups & daily in one workspace" },
      { label: "All fantasy tools", href: "/fantasy", desc: "The full Gameplan hub" },
    ],
  },
];

// Learn ▾ — how we read it, the stories, and the school.
const LEARN_MENU: readonly NavGroup[] = [
  {
    items: [
      { label: "How we read it", href: "/intelligence", desc: "The glass box — why the engine reads a game the way it does" },
      { label: "Every engine", href: "/intelligence/engines", desc: "Every engine we run, in one place" },
      { label: "Stories", href: "/the-beat", desc: "The cinematic broadcast, scored at the source" },
      { label: "The Studio", href: "/fantasy/studio", desc: "Inside the production desk" },
      { label: "The Academy", href: "/academy", desc: "Train on the process, step by step" },
    ],
  },
];

// Proof ▾ — the receipts, the track record, and what we learned.
const PROOF_MENU: readonly NavGroup[] = [
  {
    items: [
      { label: "Track record", href: "/calibration", desc: "Calibration, CLV, and the public ledger" },
      { label: "Trust ledger", href: "/ledger", desc: "Tamper-evident pick receipts" },
      { label: "Proof of record", href: "/proof", desc: "Merkle-hashed, no silent edits" },
      { label: "Accountability", href: "/accountability", desc: "Loss autopsies, in public" },
      { label: "What we learned", href: "/proof/memory", desc: "Traps we're avoiding, and where we got sharper" },
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
            <NavMenu label="Edge" href="/edge" groups={EDGE_MENU} />
            <NavMenu label="My Gameplan" href="/gameplan" groups={GAMEPLAN_MENU} />
            <NavMenu label="Learn" href="/learn" groups={LEARN_MENU} />
            <NavMenu label="Proof" href="/calibration" groups={PROOF_MENU} />
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
