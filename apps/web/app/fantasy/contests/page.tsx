import type { Metadata } from "next";
import Link from "next/link";
import { FantasyShell } from "@/components/fantasy/fantasy-shell";
import { BRAND_COLORS } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Contests — Galaxy Fantasy",
  description:
    "Best ball, survivor, pick'em, DFS, and squares — skill-first formats with a glass-box edge. Real-money entries and payouts activate behind compliance review; nothing charges automatically.",
  alternates: { canonical: "/fantasy/contests" },
};

type Status = "Live · skill" | "Edge advisor" | "Founder-gated" | "Compliance review";

const STATUS_HEX: Record<Status, string> = {
  "Live · skill": BRAND_COLORS.orbitalCyan,
  "Edge advisor": BRAND_COLORS.softUltraviolet,
  "Founder-gated": "#E0A800",
  "Compliance review": BRAND_COLORS.ionMagenta,
};

type Contest = { title: string; status: Status; blurb: string; href?: string; cta?: string };

const SKILL: Contest[] = [
  { title: "Beat the Model", status: "Live · skill", blurb: "Free weekly pick'em against our own projections — climb the leaderboard, no entry fee, pure skill. The flagship engagement game.", href: "/fantasy", cta: "Play free" },
  { title: "Season-long Best Ball", status: "Live · skill", blurb: "Draft, no in-season management — your best lineup auto-starts each week. Skill-first; entry fees gated.", },
  { title: "Survivor / Eliminator", status: "Live · skill", blurb: "One pick a week, can't reuse a team, last manager standing. Our edge engine flags the lowest-risk survivors and the save-it-for-later traps.", },
];

const EDGE: Contest[] = [
  { title: "Pick'em Edge", status: "Edge advisor", blurb: "We don't run the pick'em — we tell you where our number beats Underdog & DK Pick6 lines, and the best alt-line EV.", href: "/fantasy/props", cta: "Open advisor" },
  { title: "DFS · GPP & Milly Maker", status: "Edge advisor", blurb: "Cash, GPP, and leverage lineups with stacking and exposure control — built to win tournaments, glass-box.", href: "/fantasy/dfs", cta: "Open optimizer" },
];

const GATED: Contest[] = [
  { title: "Real-money DFS entries", status: "Founder-gated", blurb: "Paid entries and payouts require licensing, geofencing, and KYC. The tools are live; the money rail activates behind compliance — and never charges automatically.", },
  { title: "Squares (game / week / month)", status: "Compliance review", blurb: "Squares are chance-based. The board and settlement logic are designed, but real-money squares are held for legal/compliance review before any go-live. No autonomous payments.", },
];

function Card({ c }: { c: Contest }) {
  const hex = STATUS_HEX[c.status];
  const inner = (
    <div className="surface-card group flex h-full flex-col p-5 transition-transform duration-300 hover:-translate-y-1">
      <div className="flex items-center justify-between">
        <span className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider" style={{ background: `${hex}1c`, color: hex }}>{c.status}</span>
        {c.cta && <span className="text-xs font-medium transition-transform group-hover:translate-x-1" style={{ color: hex }}>{c.cta} →</span>}
      </div>
      <h3 className="mt-3 text-lg font-semibold text-white">{c.title}</h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-300">{c.blurb}</p>
    </div>
  );
  return c.href ? <Link href={c.href} className="block h-full">{inner}</Link> : <div className="h-full">{inner}</div>;
}

function Section({ title, items }: { title: string; items: Contest[] }) {
  return (
    <div>
      <h2 className="font-display text-xl text-white">{title}</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((c) => <Card key={c.title} c={c} />)}
      </div>
    </div>
  );
}

export default function ContestsPage() {
  return (
    <FantasyShell
      eyebrow="Contests"
      accent={BRAND_COLORS.softUltraviolet}
      title={<>Play where the <span className="gse-editorial" style={{ fontSize: "1.08em" }}>skill</span> is.</>}
      intro="Every format, with the same glass-box edge — and an honest line about what's live. Skill contests are the core. Where we touch third-party pick'em and DFS, we advise rather than operate. And anything involving real money or chance is held behind compliance review and never charges on its own."
      note="Skill-first formats are the live core. Real-money entries/payouts and chance-based squares are founder-gated and activate only behind licensing and compliance review — there are no autonomous payments."
      wide
    >
      <div className="space-y-10">
        <Section title="Skill contests — the core" items={SKILL} />
        <Section title="Edge advisors — we read their lines" items={EDGE} />
        <Section title="Real money — gated behind compliance" items={GATED} />
      </div>
    </FantasyShell>
  );
}
