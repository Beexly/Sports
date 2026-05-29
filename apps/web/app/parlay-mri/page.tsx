import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { RiskDisclosure } from "@/components/ui/risk-disclosure";
import { BRAND_NAME } from "@/lib/brand";
import { TrustStrip } from "@/components/trust";
import { CoachPromptHost } from "@/components/coach/CoachPromptHost";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `Parlay MRI — Parlay Risk Analysis | ${BRAND_NAME}`,
  description:
    "Understand leg correlation, EV dilution, and compounding probability. Galaxy's Parlay MRI shows you exactly what your parlay structure costs.",
  alternates: { canonical: "/parlay-mri" },
  openGraph: {
    title: `Parlay MRI — ${BRAND_NAME}`,
    description:
      "Leg correlation, EV dilution, compounding probability. See what your parlay actually costs.",
  },
};

// ─── Data ─────────────────────────────────────────────────────────────────────

const CORRELATION_TYPES = [
  {
    type: "Positive Correlation",
    badge: "AVOID",
    badgeColor: "text-red-300 border-red-900 bg-red-950/30",
    body: "Same-team legs — e.g., a team to cover and the same team's quarterback to score — are priced as independent markets by most books, but they aren't. The book adjusts its models; you're left pricing them separately. The margin is compounding.",
    detail: "Parlays with positively correlated legs are priced as if each leg is independent — but the book knows they're not.",
  },
  {
    type: "Negative Correlation",
    badge: "CLOSEST TO FAIR",
    badgeColor: "text-emerald-300 border-emerald-800 bg-emerald-950/30",
    body: "Independent markets — different sports, different games, unrelated lines — are the closest a parlay gets to fair value. Each leg still carries the book's margin, but at least they're not compounding the same event twice.",
    detail: "Negative correlation doesn't mean the parlay is +EV. It means the correlation penalty is minimal.",
  },
  {
    type: "Same-Game Parlay",
    badge: "SIGNIFICANT MARGIN",
    badgeColor: "text-yellow-300 border-yellow-800 bg-yellow-950/30",
    body: "SGPs are heavily correlated by construction — every leg lives in the same game. Books know this and price a meaningful margin into the parlay relative to what independent legs would imply. The entertainment value is real. The edge is not.",
    detail: "Same-game parlays carry built-in margin that conventional parlay math understates.",
  },
] as const;

const EV_TABLE = [
  { legs: "2-leg", implied: "-110 / -110", payout: "~+260", fair: "+264", loss: "~1.5%" },
  { legs: "3-leg", implied: "-110 / -110 / -110", payout: "~+595", fair: "+630", loss: "~5%" },
  { legs: "4-leg", implied: "-110 × 4", payout: "~+1228", fair: "+1388", loss: "~13%" },
] as const;

const WHEN_PARLAYS_MAKE_SENSE = [
  {
    title: "Correlation hedge",
    body: "If you hold a position in one market (e.g., a team spread), a complementary line in the same game can reduce tail risk on that original position — not amplify it.",
  },
  {
    title: "Unified analytical thesis",
    body: "Legs that all stem from the same structural edge — same pace mismatch, same defensive matchup — can be combined when the thesis is explicitly the same across all legs.",
  },
  {
    title: "Small-stake entertainment",
    body: "A parlay at 0.5% of bankroll, sized as entertainment, is not a bankroll strategy. Know what it is before you place it. Don't size it as if it were a disciplined single.",
  },
] as const;

const CHECKLIST = [
  {
    icon: "✓",
    label: "Each leg stands alone as a single-bet thesis",
    body: "Could you place each leg individually and defend why? If the answer is no for any leg, the parlay structure is doing the work — not the analysis.",
  },
  {
    icon: "✓",
    label: "No same-team stack with moneyline and spread",
    body: "Stacking the same team's moneyline, spread, and a correlated player prop prices three legs as independent when they're one event.",
  },
  {
    icon: "✓",
    label: "No more than 3 legs for analytical parlays",
    body: "Each additional leg at standard -110 juice adds compounding margin. Beyond 3 legs, the EV dilution overwhelms most structural edges.",
  },
  {
    icon: "✓",
    label: "Stake is capped at 1% of bankroll",
    body: "A parlay is a high-variance instrument. Sizing it above 1% of bankroll treats it like a single — and a parlay's variance is significantly higher.",
  },
  {
    icon: "✓",
    label: "You've checked each leg on Today's Board",
    body: "If any leg was passed by the model — not published — there is a reason. Review the pass rationale before including it in a parlay.",
  },
  {
    icon: "✓",
    label: "You've read the no-bet rationale for any gated game",
    body: "A gated game on the pass list is gated for a reason. Adding it to a parlay doesn't resolve the gate. It compounds the uncertainty.",
  },
] as const;

const CROSS_LINKS = [
  { label: "Parlay Discipline module", href: "/academy" },
  { label: "Today's Board", href: "/today" },
  { label: "Pass List", href: "/no-bet" },
  { label: "Market Gravity", href: "/market-gravity" },
  { label: "Methodology", href: "/methodology" },
] as const;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ParlayMRIPage(): JSX.Element {
  return (
    <div className="flex min-h-screen flex-col bg-carbon text-gray-100">
      <Nav />

      <main className="flex-1">

        <div className="mx-auto max-w-5xl px-4 pt-6 sm:px-6 lg:px-8">
          <TrustStrip
            surfaceId="parlay-mri"
            source="galaxy-model"
            freshness="sample"
            surfaceKind="decision-quality"
            tier="all"
            uncertainty="sample"
            showMethodology
            showResponsiblePlay
          />
        </div>

        {/* ── Hero ───────────────────────────────────────────────────────── */}
        <section className="border-b border-mineral bg-[radial-gradient(circle_at_70%_20%,rgba(122,92,255,0.10),transparent_40%)] px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-ion-blue">
              Parlay MRI
            </p>
            <h1 className="mt-4 max-w-4xl text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
              See what your parlay actually costs.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-gray-300">
              Most parlay losses aren&apos;t bad picks. They&apos;re bad structure.
              Galaxy&apos;s Parlay MRI breaks down leg correlation, EV dilution, and
              compounding probability to show you exactly what you&apos;re paying for.
            </p>
            <p className="mt-3 max-w-xl text-sm leading-7 text-gray-500">
              Analytical research — no claim of certain outcomes.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/today"
                className="inline-flex min-h-11 items-center justify-center rounded-lg bg-cyan-300 px-5 py-3 text-sm font-bold text-gray-950 hover:bg-cyan-200"
              >
                Today&apos;s Board
              </Link>
              <Link
                href="/academy"
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-gray-700 px-5 py-3 text-sm font-bold text-gray-100 hover:border-cyan-300"
              >
                Parlay Discipline module
              </Link>
            </div>
          </div>
        </section>

        {/* ── Section 1: Correlation Trap ─────────────────────────────────── */}
        <section className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ion-blue">
              Section 1
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-white">
              The Correlation Trap
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-gray-400">
              Correlation between parlay legs is the single largest structural cost most bettors
              never price. Understanding it is the first step to honest parlay construction.
            </p>

            <div className="mt-10 grid gap-5 sm:grid-cols-3">
              {CORRELATION_TYPES.map((ct) => (
                <CorrelationCard key={ct.type} {...ct} />
              ))}
            </div>

            <div className="mt-8 border-l-2 border-ion-blue bg-cyan-950/20 px-5 py-4">
              <p className="text-sm leading-7 text-gray-300">
                <span className="font-semibold text-white">Key principle: </span>
                Parlays with positively correlated legs are priced as if each leg is
                independent — but the book knows they&apos;re not.
              </p>
            </div>
          </div>
        </section>

        {/* ── Section 2: EV Dilution ──────────────────────────────────────── */}
        <section className="border-y border-mineral bg-gray-900/35 px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ion-blue">
              Section 2
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-white">
              The Math Behind the Price
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-gray-400">
              Every leg added to a parlay amplifies the book&apos;s margin. These illustrative
              pricing examples show how EV dilutes as legs compound.
            </p>

            <div className="mt-10 overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-mineral">
                    <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.18em] text-gray-500">
                      Parlay
                    </th>
                    <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.18em] text-gray-500">
                      Lines
                    </th>
                    <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.18em] text-gray-500">
                      Book payout
                    </th>
                    <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.18em] text-gray-500">
                      Fair value
                    </th>
                    <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.18em] text-gray-500">
                      Est. expected loss
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {EV_TABLE.map((row) => (
                    <tr key={row.legs} className="border-b border-mineral/50 hover:bg-gray-900/40">
                      <td className="px-4 py-4 font-semibold text-white">{row.legs}</td>
                      <td className="px-4 py-4 font-mono text-xs text-gray-400">{row.implied}</td>
                      <td className="px-4 py-4 font-mono text-ion-blue">{row.payout}</td>
                      <td className="px-4 py-4 font-mono text-emerald-300">{row.fair}</td>
                      <td className="px-4 py-4 font-mono text-red-300">{row.loss}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 border border-mineral bg-gray-900/50 p-5">
              <p className="text-sm leading-7 text-gray-300">
                <span className="font-semibold text-white">EV dilution: </span>
                Every leg added amplifies the vig. A 4-leg parlay at standard -110 juice carries
                roughly thirteen-percent expected loss against fair pricing. These are illustrative
                pricing examples — not picks, not advantage calculations.
              </p>
              <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.16em] text-gray-600">
                Illustrative only · Based on standard -110 pricing · Not personalized advice
              </p>
            </div>
          </div>
        </section>

        {/* ── Section 3: When Parlays Can Make Sense ─────────────────────── */}
        <section className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ion-blue">
              Section 3
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-white">
              When Parlays Can Make Sense
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-gray-400">
              Parlays are not inherently bad instruments. They&apos;re bad instruments used without
              structural justification. Here are the limited cases where the structure has a
              defensible rationale.
            </p>

            <div className="mt-10 grid gap-5 sm:grid-cols-3">
              {WHEN_PARLAYS_MAKE_SENSE.map((item) => (
                <div key={item.title} className="border border-mineral bg-gray-900/40 p-5">
                  <h3 className="text-base font-bold text-white">{item.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-gray-400">{item.body}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 border border-yellow-900/60 bg-yellow-950/20 p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-yellow-500">
                Warning
              </p>
              <p className="mt-2 text-sm leading-7 text-gray-300">
                If you can&apos;t articulate why each leg is in this parlay, consider why
                you&apos;re adding it. Structure is not a feeling. It&apos;s an argument.
              </p>
            </div>
          </div>
        </section>

        {/* ── Parlay Discipline Checklist ─────────────────────────────────── */}
        <section className="border-y border-mineral bg-gray-900/35 px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ion-blue">
              Discipline checklist
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-white">
              Parlay Discipline Checklist
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-7 text-gray-400">
              Six gates to run before placing any analytical parlay.
            </p>

            <div className="mt-10 flex flex-col gap-4">
              {CHECKLIST.map((item, i) => (
                <ChecklistItem key={i} number={i + 1} {...item} />
              ))}
            </div>
          </div>
        </section>

        {/* ── Decision Coach ──────────────────────────────────────────────── */}
        <section className="px-4 pb-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <CoachPromptHost surface="parlay-mri" />
          </div>
        </section>

        {/* ── Risk Disclosure ─────────────────────────────────────────────── */}
        <section className="px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <RiskDisclosure variant="card" includePastPerformance={true} />
          </div>
        </section>

        {/* ── Cross-links ─────────────────────────────────────────────────── */}
        <section className="border-t border-mineral px-4 py-10 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.2em] text-ion-blue">
              Continue reading
            </p>
            <div className="flex flex-wrap gap-3">
              {CROSS_LINKS.map(({ label, href }) => (
                <Link
                  key={href}
                  href={href}
                  className="inline-flex min-h-8 items-center justify-center rounded border border-gray-700 px-3 text-xs font-semibold text-gray-300 hover:border-ion-blue hover:text-ion-blue"
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function CorrelationCard({
  type,
  badge,
  badgeColor,
  body,
  detail,
}: {
  type: string;
  badge: string;
  badgeColor: string;
  body: string;
  detail: string;
}): JSX.Element {
  return (
    <article className="flex flex-col gap-4 border border-mineral bg-gray-900/50 p-5">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-bold text-white">{type}</h3>
        <span
          className={`shrink-0 rounded border px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider ${badgeColor}`}
        >
          {badge}
        </span>
      </div>
      <p className="text-sm leading-6 text-gray-400">{body}</p>
      <div className="mt-auto border-t border-mineral pt-3">
        <p className="text-xs leading-5 text-gray-500 italic">{detail}</p>
      </div>
    </article>
  );
}

function ChecklistItem({
  number,
  icon,
  label,
  body,
}: {
  number: number;
  icon: string;
  label: string;
  body: string;
}): JSX.Element {
  return (
    <div className="flex gap-5 border border-mineral bg-gray-900/30 p-5">
      <div className="flex shrink-0 flex-col items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-full border border-ion-blue/40 bg-cyan-950/30 font-mono text-xs font-bold text-ion-blue">
          {number}
        </span>
        <span className="text-base text-emerald-400">{icon}</span>
      </div>
      <div className="flex flex-col gap-1.5">
        <h3 className="text-sm font-bold text-white">{label}</h3>
        <p className="text-sm leading-6 text-gray-400">{body}</p>
      </div>
    </div>
  );
}
