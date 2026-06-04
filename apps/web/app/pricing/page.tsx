import type { Metadata } from "next";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { PricingPlans, type PlanView } from "@/components/pricing/pricing-plans";
import {
  getCurrentPricingPhase,
  annualSavingsPct,
  annualMonthlyEquivalent,
  GRANDFATHER_GUARANTEE,
} from "@/lib/pricing/pricing-phases";
import { BRAND_NAME, BRAND_COLORS } from "@/lib/brand";
import { Reveal } from "@/components/motion/reveal";

// ─────────────────────────────────────────────
// Metadata — SEO-critical surface
// ─────────────────────────────────────────────

const phase = getCurrentPricingPhase();

export const metadata: Metadata = {
  title: "Pricing — Founding-Member Rates, Locked For Life",
  description:
    "Free for one signal a day. Founding-member pricing on Pro and Elite — the lowest price we will ever offer, locked for the life of your subscription. Monthly or annual. Cancel any time.",
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: `Pricing — ${BRAND_NAME}`,
    description:
      "Founding-member pricing, locked for life. Monthly or annual, with a 7-day refund window.",
  },
};

// ─────────────────────────────────────────────
// Feature matrix (static) + phase-derived prices
// ─────────────────────────────────────────────

const FREE_FEATURES = [
  { label: "1 signal per day", included: true },
  { label: "Game matchup info", included: true },
  { label: "Pick type (spread / ML / total)", included: true },
  { label: "Confidence rating on every signal", included: false },
  { label: "Highest-Edge-Index signals", included: false },
  { label: "Full factor trail & reasoning", included: false },
  { label: "Line-movement alerts", included: false },
  { label: "Email + push notifications", included: false },
  { label: "All 7 sports", included: false },
] as const;

const PRO_FEATURES = [
  { label: "Every signal, every day", included: true },
  { label: "Game matchup info", included: true },
  { label: "Pick type (spread / ML / total)", included: true },
  { label: "Confidence rating on every signal", included: true },
  { label: "Highest-Edge-Index signals", included: true },
  { label: "Full factor trail & reasoning", included: true },
  { label: "Line-movement alerts", included: true },
  { label: "Email + push notifications", included: false },
  { label: "All 7 sports", included: true },
] as const;

const ELITE_FEATURES = PRO_FEATURES.map((f) =>
  f.label === "Email + push notifications" ? { ...f, included: true } : f,
);

const PLANS: PlanView[] = [
  {
    id: "FREE",
    name: "Free",
    monthly: null,
    annual: null,
    annualSavingsPct: null,
    annualMonthly: null,
    description: "One signal a day — sample the discipline before committing.",
    badge: null,
    cta: "Start free",
    features: [...FREE_FEATURES],
  },
  {
    id: "PRO",
    name: "Pro",
    monthly: phase.pro.monthly,
    annual: phase.pro.annual,
    annualSavingsPct: annualSavingsPct(phase.pro),
    annualMonthly: annualMonthlyEquivalent(phase.pro),
    description: "Every published signal, with the confidence rating and factor trail attached.",
    badge: "Where most start",
    cta: "Subscribe to Pro",
    features: [...PRO_FEATURES],
  },
  {
    id: "ELITE",
    name: "Elite",
    monthly: phase.elite.monthly,
    annual: phase.elite.annual,
    annualSavingsPct: annualSavingsPct(phase.elite),
    annualMonthly: annualMonthlyEquivalent(phase.elite),
    description: "Pro plus real-time email & push alerts on every published signal — built for live slates.",
    badge: "All signals, all alerts",
    cta: "Subscribe to Elite",
    features: [...ELITE_FEATURES],
  },
];

const COMPARISON_FEATURES = [
  "Signals per day",
  "Game matchup info",
  "Pick type",
  "Confidence rating",
  "Highest-Edge-Index signals",
  "Full factor trail",
  "Line-movement alerts",
  "Notifications",
  "Sports covered",
] as const;

const COMPARISON_CELLS: Record<"FREE" | "PRO" | "ELITE", (string | boolean)[]> = {
  FREE: ["1", true, true, false, false, false, false, false, "Sampler"],
  PRO: ["Unlimited", true, true, true, true, true, true, false, "All 7"],
  ELITE: ["Unlimited", true, true, true, true, true, true, true, "All 7"],
};

// ─────────────────────────────────────────────
// FAQ — JSON-LD eligible
// ─────────────────────────────────────────────

const FAQ = [
  {
    q: "Is there a free trial on Pro or Elite?",
    a: "Every paid plan ships with a 7-day refund window. Cancel any time from your dashboard.",
  },
  {
    q: "What is founding-member pricing?",
    a: "We are pre-track-record, so the launch cohort gets the lowest price we will ever offer — and it is locked for the life of your subscription. When prices rise for new members as the verified record grows, yours never does.",
  },
  {
    q: "How is this different from a tout service?",
    a: "Tout services publish their wins and quietly delete the losses. Galaxy Sports Edge publishes every signal's full factor trail and holds back a public win-rate until enough canonical settled history exists to support one honestly.",
  },
  {
    q: "Why is the Performance page empty right now?",
    a: "The Calibration Report stays gated until enough canonical settled signals have accumulated to make the published number statistically defensible. Patience over noise — that's the standard.",
  },
  {
    q: "Which sports are covered?",
    a: "NFL, NCAAF, NBA, NCAAB, MLB, NHL, and MLS. The slate runs on a 30-minute refresh loop during games.",
  },
] as const;

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ.map((item) => ({
    "@type": "Question",
    name: item.q,
    acceptedAnswer: { "@type": "Answer", text: item.a },
  })),
};

// ─────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────

export default function PricingPage() {
  const grandfatherNote = `${phase.name}-member rate. ${GRANDFATHER_GUARANTEE}`;

  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: BRAND_COLORS.obsidianBlack }}>
      <Nav />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <main className="relative flex-1 px-4 py-20 sm:px-6 lg:px-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-96"
          style={{
            background: `radial-gradient(60% 70% at 50% 0%, ${BRAND_COLORS.softUltraviolet}22, transparent 70%), radial-gradient(40% 50% at 72% 0%, ${BRAND_COLORS.orbitalCyan}14, transparent 70%)`,
          }}
        />
        <div className="mx-auto max-w-6xl">
          {/* Header */}
          <div className="text-center">
            <Reveal>
              <p className="eyebrow" style={{ color: BRAND_COLORS.orbitalCyan }}>
                {phase.name} pricing
              </p>
            </Reveal>
            <Reveal delay={90}>
              <h1 className="mt-3 font-display text-display-xl text-balance text-white">
                Claim the founding rate.
              </h1>
            </Reveal>
            <Reveal delay={180}>
              <p className="mx-auto mt-4 max-w-xl text-lg text-ink-300">
                Start free. Back us before the record exists and your price never moves —
                even as it rises for everyone who joins later.
              </p>
            </Reveal>
          </div>

          {/* Plans with billing toggle */}
          <div className="mt-14">
            <PricingPlans plans={PLANS} grandfatherNote={grandfatherNote} />
          </div>

          {/* Feature comparison table */}
          <div className="mt-20">
            <h2 className="text-center text-2xl font-bold text-white">Side by side</h2>
            <div className="mt-8 overflow-x-auto rounded-2xl border border-gray-800">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                      Feature
                    </th>
                    {PLANS.map((plan) => (
                      <th
                        key={plan.id}
                        className={[
                          "px-4 py-3 text-center text-sm font-bold",
                          plan.id === "PRO"
                            ? "text-brand-400"
                            : plan.id === "ELITE"
                              ? "text-ultraviolet-glow"
                              : "text-gray-300",
                        ].join(" ")}
                      >
                        {plan.name}
                        {plan.monthly !== null && (
                          <span className="ml-1 text-xs font-normal text-gray-400">
                            ${plan.monthly}/mo
                          </span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_FEATURES.map((feature, i) => (
                    <tr
                      key={feature}
                      className={[
                        "border-b border-gray-800/60",
                        i % 2 === 0 ? "bg-gray-900/20" : "",
                      ].join(" ")}
                    >
                      <td className="px-4 py-3 text-gray-400">{feature}</td>
                      {(["FREE", "PRO", "ELITE"] as const).map((planId) => {
                        const cell: string | boolean = COMPARISON_CELLS[planId][i] ?? false;
                        return (
                          <td key={planId} className="px-4 py-3 text-center">
                            <ComparisonCell value={cell} />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* FAQ */}
          <section className="mt-20">
            <h2 className="text-center text-2xl font-bold text-white">Frequently asked</h2>
            <div className="mx-auto mt-8 max-w-3xl divide-y divide-gray-800/60 rounded-2xl border border-gray-800 bg-gray-900/40">
              {FAQ.map((item) => (
                <details
                  key={item.q}
                  className="group px-5 py-4 [&_summary::-webkit-details-marker]:hidden"
                >
                  <summary className="flex cursor-pointer items-center justify-between gap-4 text-left text-sm font-semibold text-gray-100">
                    <span>{item.q}</span>
                    <span
                      aria-hidden="true"
                      className="text-gray-400 transition-transform group-open:rotate-45"
                    >
                      +
                    </span>
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-gray-400">{item.a}</p>
                </details>
              ))}
            </div>
          </section>

          {/* Refund note */}
          <p className="mt-12 text-center text-xs text-gray-400">
            Every paid plan ships with a 7-day refund window. Cancel any time from your
            dashboard. Prices shown are founding-member rates.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function ComparisonCell({ value }: { value: string | boolean }) {
  if (typeof value === "boolean") {
    return value ? (
      <svg
        className="mx-auto h-5 w-5 text-brand-400"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2.5}
        stroke="currentColor"
        role="img"
        aria-label="Included"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
      </svg>
    ) : (
      <svg
        className="mx-auto h-5 w-5 text-gray-700"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2}
        stroke="currentColor"
        role="img"
        aria-label="Not included"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
      </svg>
    );
  }
  return <span className="text-gray-300">{value}</span>;
}
