import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { RiskDisclosure } from "@/components/ui/risk-disclosure";
import { BRAND_NAME } from "@/lib/brand";

export const metadata: Metadata = {
  title: `Galaxy Orbit View — Spatial Signal Intelligence | ${BRAND_NAME}`,
  description:
    "Every game is a gravitational center. Orbit View maps the signal field around each matchup — market pressure, roster events, coaching tendencies, parlay health — in one spatial read.",
  alternates: { canonical: "/orbit" },
  openGraph: {
    title: "Galaxy Orbit View — Spatial Signal Intelligence",
    description:
      "See how every active signal orbits a matchup. Market depth, roster shock, coaching edge, parlay MRI — all in one spatial read.",
  },
};

// ─── Data ─────────────────────────────────────────────────────────────────────

const ORBIT_LAYERS = [
  {
    ring: 1,
    label: "Market Layer",
    color: "text-cyan-300",
    borderColor: "border-cyan-800/40",
    bgColor: "bg-cyan-950/20",
    dotColor: "bg-cyan-400",
    signals: [
      { name: "Line movement", href: "/market-gravity/line-movement", weight: "high" },
      { name: "Book disagreement", href: "/market-gravity/book-disagreement", weight: "medium" },
      { name: "Sharp / public split", href: "/market-gravity", weight: "medium" },
    ],
    summary:
      "The market layer is the fastest clock. Line movement and sharp-side consensus establish the prior that every other signal either confirms or contradicts.",
  },
  {
    ring: 2,
    label: "Personnel Layer",
    color: "text-violet-300",
    borderColor: "border-violet-800/40",
    bgColor: "bg-violet-950/20",
    dotColor: "bg-violet-400",
    signals: [
      { name: "Roster shock index", href: "/roster-shock", weight: "high" },
      { name: "Injury cascade risk", href: "/roster-shock", weight: "medium" },
      { name: "Rumor confidence", href: "/rumor-radar", weight: "low" },
    ],
    summary:
      "The personnel layer captures discrete events the market has not yet fully priced. A starting-QB confirmation at -EV market prices is a structural edge.",
  },
  {
    ring: 3,
    label: "Tendency Layer",
    color: "text-amber-300",
    borderColor: "border-amber-800/40",
    bgColor: "bg-amber-950/20",
    dotColor: "bg-amber-400",
    signals: [
      { name: "Coaching edge model", href: "/coaching-edge", weight: "medium" },
      { name: "Schedule fatigue", href: "/coaching-edge", weight: "low" },
      { name: "Home/away patterns", href: "/coaching-edge", weight: "low" },
    ],
    summary:
      "Coaching tendency data is slow-moving but persistent. It creates the base rate on which market and personnel signals are overlaid.",
  },
  {
    ring: 4,
    label: "Structure Layer",
    color: "text-rose-300",
    borderColor: "border-rose-800/40",
    bgColor: "bg-rose-950/20",
    dotColor: "bg-rose-400",
    signals: [
      { name: "Parlay correlation risk", href: "/parlay-mri", weight: "high" },
      { name: "Market mirage score", href: "/market-mirage", weight: "medium" },
      { name: "No-bet threshold", href: "/no-bet", weight: "medium" },
    ],
    summary:
      "Structural signals reveal when the opportunity is illusory. A market mirage artificially widens a line; the No-Bet engine removes it from publication before it reaches users.",
  },
] as const;

const ORBIT_PRINCIPLES = [
  {
    icon: "◎",
    label: "Gravity, not certainty",
    body: "A game is a gravitational center. Signals orbit it at different distances — market signals are closest because they update fastest. Coaching patterns are furthest because they change slowly.",
  },
  {
    icon: "⊕",
    label: "Convergence is signal",
    body: "When signals from all four layers point the same direction, the model has convergent evidence. When they conflict, the No-Bet engine is more likely to remove the game from the published slate.",
  },
  {
    icon: "⊖",
    label: "Pass is position",
    body: "An incomplete orbit — missing or conflicting layers — yields a pass, not a pick. The No-Bet Engine is not a failure mode. It is the model taking a position that the evidence is insufficient.",
  },
  {
    icon: "◉",
    label: "Freshness decays by layer",
    body: "Market signals expire in minutes. Roster signals in hours. Coaching patterns in weeks. The model tracks freshness per layer and penalizes stale evidence before combining scores.",
  },
];

const CROSS_LINKS = [
  { label: "Market Gravity", href: "/market-gravity" },
  { label: "Roster Shock", href: "/roster-shock" },
  { label: "Coaching Edge", href: "/coaching-edge" },
  { label: "Parlay MRI", href: "/parlay-mri" },
  { label: "Market Mirage", href: "/market-mirage" },
  { label: "No-Bet Engine", href: "/no-bet" },
  { label: "Methodology", href: "/methodology" },
] as const;

const ORBIT_LD = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Galaxy Orbit View — Spatial Signal Intelligence",
  description:
    "Every game is a gravitational center. Orbit View maps the signal field around each matchup — market pressure, roster events, coaching tendencies, parlay health — in one spatial read.",
  url: "https://galaxysportsedge.com/orbit",
  dateModified: "2026-05-28",
  author: { "@type": "Organization", name: BRAND_NAME },
  publisher: { "@type": "Organization", name: BRAND_NAME },
  breadcrumb: {
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://galaxysportsedge.com" },
      { "@type": "ListItem", position: 2, name: "Orbit View", item: "https://galaxysportsedge.com/orbit" },
    ],
  },
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OrbitViewPage(): JSX.Element {
  return (
    <div className="flex min-h-screen flex-col bg-carbon text-gray-100">
      <Nav />
      <main className="flex-1">

        {/* ── Hero ────────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden border-b border-mineral px-4 py-20 sm:px-6 lg:px-8">
          {/* Orbital ring decorations (static, CSS-only) */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-[600px] w-[600px] rounded-full border border-cyan-900/15" />
            <div className="absolute h-[420px] w-[420px] rounded-full border border-violet-900/15" />
            <div className="absolute h-[260px] w-[260px] rounded-full border border-amber-900/15" />
            <div className="absolute h-[120px] w-[120px] rounded-full border border-rose-900/20" />
            <div className="absolute h-8 w-8 rounded-full bg-gray-800/80 ring-2 ring-gray-700/60" />
          </div>

          <div className="relative mx-auto max-w-3xl">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-ion-blue">
              Galaxy Orbit View
            </p>
            <h1 className="mt-4 text-5xl font-black tracking-tight text-white">
              Every signal orbits the game.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-gray-400">
              Most intelligence platforms flatten signals into a list. Galaxy reads them
              as a spatial field — market pressure at closest range, structural signals
              at the outer ring, and a pass verdict at the center when the field is
              too conflicted to publish.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-cyan-800/50 bg-cyan-950/30 px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-300">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                Concept preview
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-mineral bg-gray-900/40 px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-gray-500">
                Interactive map — on roadmap
              </span>
            </div>
          </div>
        </section>

        {/* ── Orbital Layer Breakdown ──────────────────────────────────────── */}
        <section className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-12">
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-ion-blue">
                Signal architecture
              </p>
              <h2 className="mt-3 text-3xl font-black text-white">
                Four orbital layers. One convergence verdict.
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-gray-400">
                Each layer moves at a different velocity. The model tracks them
                independently, then evaluates convergence before publishing a signal or
                issuing a pass.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {ORBIT_LAYERS.map((layer, i) => (
                <div
                  key={layer.label}
                  className={`flex flex-col gap-4 rounded-xl border ${layer.borderColor} ${layer.bgColor} p-5`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className={`font-mono text-[10px] uppercase tracking-[0.18em] ${layer.color}`}>
                      Ring {i + 1}
                    </p>
                    <span className={`font-mono text-[10px] uppercase tracking-[0.14em] text-gray-600`}>
                      {["Closest", "Second", "Third", "Outer"][i]}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white">{layer.label}</h3>
                  <ul className="flex flex-col gap-2">
                    {layer.signals.map((sig) => (
                      <li key={sig.name} className="flex items-center gap-2">
                        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${layer.dotColor}`} />
                        <Link
                          href={sig.href}
                          className="text-xs text-gray-400 hover:text-gray-200"
                        >
                          {sig.name}
                        </Link>
                        <span className={`ml-auto font-mono text-[9px] uppercase tracking-[0.1em] ${
                          sig.weight === "high" ? layer.color : "text-gray-700"
                        }`}>
                          {sig.weight}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-auto border-t border-mineral/40 pt-4 text-xs leading-5 text-gray-500">
                    {layer.summary}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Convergence Diagram (ASCII spatial) ─────────────────────────── */}
        <section className="border-y border-mineral bg-gray-900/30 px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <div className="mb-10">
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-ion-blue">
                Convergence model
              </p>
              <h2 className="mt-3 text-2xl font-black text-white">
                How a signal reaches publication.
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <ConvergenceStep
                step="01"
                state="Scanning"
                color="text-cyan-300"
                borderColor="border-cyan-900/40"
                body="The engine ingests market data, roster signals, and coaching patterns. Each signal is scored and freshness-stamped independently."
              />
              <ConvergenceStep
                step="02"
                state="Evaluating"
                color="text-violet-300"
                borderColor="border-violet-900/40"
                body="Signals are compared across layers. Conflicting evidence from inner and outer rings triggers the No-Bet threshold evaluation."
              />
              <ConvergenceStep
                step="03"
                state="Verdict"
                color="text-amber-300"
                borderColor="border-amber-900/40"
                body="Convergent signals above the confidence gate are published. Conflicted or stale orbits yield a pass, recorded in the No-Bet list with the dominant reason."
              />
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/no-bet"
                className="inline-flex min-h-10 items-center justify-center rounded-lg border border-amber-800/40 bg-amber-950/20 px-5 py-2 text-sm font-semibold text-amber-300 hover:bg-amber-950/40"
              >
                No-Bet Engine →
              </Link>
              <Link
                href="/methodology"
                className="inline-flex min-h-10 items-center justify-center rounded-lg border border-mineral px-5 py-2 text-sm font-semibold text-gray-300 hover:border-gray-500"
              >
                Full methodology
              </Link>
            </div>
          </div>
        </section>

        {/* ── Four Principles ─────────────────────────────────────────────── */}
        <section className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-ion-blue">
              Design principles
            </p>
            <h2 className="mt-3 text-2xl font-black text-white">
              How the orbit model thinks.
            </h2>
            <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {ORBIT_PRINCIPLES.map((p) => (
                <div key={p.label} className="flex flex-col gap-3 rounded-xl border border-mineral bg-gray-900/40 p-5">
                  <span className="font-mono text-2xl text-gray-600" aria-hidden="true">{p.icon}</span>
                  <h3 className="text-sm font-bold text-white">{p.label}</h3>
                  <p className="text-xs leading-6 text-gray-500">{p.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Roadmap / Waitlist ───────────────────────────────────────────── */}
        <section className="border-t border-mineral bg-gray-900/20 px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-ion-blue">
              On the roadmap
            </p>
            <h2 className="mt-3 text-3xl font-black text-white">
              The interactive Orbit View is coming.
            </h2>
            <p className="mt-5 text-sm leading-7 text-gray-400">
              Today this page documents the architecture. The full Orbit View — an
              interactive spatial map showing every game&apos;s live signal field — ships
              after the evidence vault and signal ledger reach production stability.
              When it opens, every game on the slate will have an orbit you can inspect
              before placing a bet.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Link
                href="/today"
                className="inline-flex min-h-11 items-center justify-center rounded-lg bg-cyan-950/40 px-6 py-3 text-sm font-semibold text-cyan-300 ring-1 ring-cyan-800/50 hover:bg-cyan-950/60"
              >
                Today&apos;s board
              </Link>
              <Link
                href="/intelligence"
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-mineral px-6 py-3 text-sm font-semibold text-gray-300 hover:border-gray-500"
              >
                Intelligence hub
              </Link>
            </div>
          </div>
        </section>

        {/* ── Source note ─────────────────────────────────────────────────── */}
        <div className="mx-auto max-w-7xl px-4 pb-4 pt-2 sm:px-6 lg:px-8">
          <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-gray-700">
            Source: Galaxy model · Signal architecture from prediction-engine v0.4+
          </p>
        </div>

        {/* ── Cross-links ──────────────────────────────────────────────────── */}
        <section className="border-t border-mineral px-4 py-10 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.2em] text-ion-blue">
              Explore the signal layers
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

        <RiskDisclosure
          variant="card"
          includePastPerformance
          className="mx-auto max-w-5xl px-4 pb-12 pt-4"
        />
      </main>
      <Footer />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ORBIT_LD) }}
      />
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function ConvergenceStep({
  step,
  state,
  color,
  borderColor,
  body,
}: {
  step: string;
  state: string;
  color: string;
  borderColor: string;
  body: string;
}): JSX.Element {
  return (
    <div className={`flex flex-col gap-3 rounded-xl border ${borderColor} bg-gray-900/40 p-5`}>
      <div className="flex items-center justify-between">
        <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-gray-700">
          Step {step}
        </span>
        <span className={`font-mono text-[10px] uppercase tracking-[0.14em] ${color}`}>
          {state}
        </span>
      </div>
      <p className="text-sm leading-6 text-gray-400">{body}</p>
    </div>
  );
}
