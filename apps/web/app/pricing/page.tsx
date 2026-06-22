import type { Metadata } from "next";
import Link from "next/link";
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
import { ShootingStars } from "@/components/motion/shooting-stars";
import { SignalRule } from "@/components/motion/signal-rule";
import {
  VALUE_TIERS,
  POSITIONING,
  EMOTIONAL_VALUE,
} from "@/lib/pricing/value-architecture";
import { getFeature } from "@/lib/pricing/feature-gates";

// ─────────────────────────────────────────────
// Metadata — SEO-critical surface
// ─────────────────────────────────────────────

const phase = getCurrentPricingPhase();

export const metadata: Metadata = {
  title: "Pricing — Founding-Member Rates, Locked For Life",
  description:
    "Free, honest picks and the most transparent verified record in the game. Pro and Elite are for the tools, depth, analytics, and alerts - founding-member pricing, the lowest we will ever offer, locked for the life of your subscription. Monthly or annual. Cancel any time.",
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: `Pricing — ${BRAND_NAME}`,
    description:
      "Founding-member pricing, locked for life. Monthly or annual, with a 3-day money-back window.",
  },
};

// ─────────────────────────────────────────────
// Feature matrix (static) + phase-derived prices
// ─────────────────────────────────────────────

const FREE_FEATURES = [
  { label: "Every pick, free - honest labels & the open verified record", included: true },
  { label: "Edge Index on every signal", included: true },
  { label: "Game matchup info + pick type", included: true },
  { label: "Public verified record & calibration", included: true },
  { label: "The Academy — full training floor", included: true },
  { label: "Confidence on the full board (Pro)", included: false },
  { label: "Factor trail & evidence audit (Pro)", included: false },
  { label: "Trend Lab + Parlay MRI (Pro)", included: false },
  { label: "Real-time alerts (Elite)", included: false },
  { label: "CLV Ledger + staking toolkit (Elite)", included: false },
] as const;

const PRO_FEATURES = [
  { label: "The Academy + public verified record", included: true },
  { label: "Every signal, every day — all 7 sports", included: true },
  { label: "Confidence rating on every signal", included: true },
  { label: "Full factor trail & reasoning", included: true },
  { label: "Evidence audit — full forensic detail", included: true },
  { label: "Ask the model why, on any pick", included: true },
  { label: "Line-movement intel", included: true },
  { label: "Trend Lab — full cohort workbench", included: true },
  { label: "Parlay MRI — the portfolio surgeon", included: true },
  { label: "Real-time alerts (Elite)", included: false },
  { label: "CLV Ledger + staking toolkit (Elite)", included: false },
] as const;

const ELITE_FEATURES = [
  { label: "Real-time email + push alerts on every signal", included: true },
  { label: "CLV Ledger — your glass-box bet tracker", included: true },
  { label: "Staking calculator — Kelly-aware sizing", included: true },
  { label: "First access to new intelligence surfaces", included: true },
  { label: "Every signal, every day — all 7 sports", included: true },
  { label: "Confidence rating on every signal", included: true },
  { label: "Full factor trail & evidence audit", included: true },
  { label: "Ask the model why + line-movement intel", included: true },
  { label: "Trend Lab — full cohort workbench", included: true },
  { label: "Parlay MRI — the portfolio surgeon", included: true },
  { label: "The Academy + public verified record", included: true },
] as const;

const PLANS: PlanView[] = [
  {
    id: "FREE",
    name: "Free",
    monthly: null,
    annual: null,
    annualSavingsPct: null,
    annualMonthly: null,
    description: "The discipline, sampled: one signal a day, the public record, and the full Academy.",
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
    description: "The full intelligence layer: every signal, the confidence rating, the factor trail, the Trend Lab, the Parlay MRI.",
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
    description: "The professional toolkit: everything in Pro, plus real-time alerts and the CLV ledger that proves your own edge.",
    badge: "The professional toolkit",
    cta: "Subscribe to Elite",
    features: [...ELITE_FEATURES],
  },
];

const COMPARISON_FEATURES = [
  "Signals per day",
  "Sports covered",
  "Edge Index",
  "Confidence rating",
  "Factor trail & reasoning",
  "Evidence audit detail",
  "Ask the model why",
  "Line-movement intel",
  "Trend Lab",
  "Parlay MRI",
  "Real-time alerts",
  "CLV Ledger + staking toolkit",
  "The Academy",
  "Public verified record",
] as const;

const COMPARISON_CELLS: Record<"FREE" | "PRO" | "ELITE", (string | boolean)[]> = {
  FREE: ["2", "Sampler", true, "Free picks", false, "Counts only", false, false, false, false, false, false, true, true],
  PRO: ["Unlimited", "All 7", true, true, true, "Full forensic", true, true, true, true, false, false, true, true],
  ELITE: ["Unlimited", "All 7", true, true, true, "Full forensic", true, true, true, true, true, true, true, true],
};

// ─────────────────────────────────────────────
// FAQ — JSON-LD eligible
// ─────────────────────────────────────────────

const FAQ = [
  {
    q: "Is there a free trial on Pro or Elite?",
    a: "No free trial — but every paid plan has a 3-day money-back window. Cancel any time from your dashboard.",
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

      <main className="relative flex-1 overflow-hidden px-4 py-20 sm:px-6 lg:px-8">
        <ShootingStars />
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
            <Reveal delay={260}>
              <p className="mx-auto mt-5 max-w-2xl text-sm text-ink-400">{POSITIONING}</p>
            </Reveal>
          </div>

          {/* Plans with billing toggle */}
          <div className="mt-14">
            <PricingPlans plans={PLANS} grandfatherNote={grandfatherNote} />
          </div>

          {/* Why each step up — the value ladder (incl. the Operator waitlist) */}
          <section className="mt-20">
            <h2 className="text-center text-2xl font-bold text-white">Why each step up</h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-ink-300">
              Each plan is a different job — and you can see exactly what the next tier adds before you pay for it.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {VALUE_TIERS.filter((t) => t.status === "live").map((t) => (
                <div
                  key={t.id}
                  className="flex h-full flex-col rounded-2xl border border-titanium bg-carbon/40 p-5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.3em] text-ink-400">
                      {t.name}
                    </p>
                    {t.status === "waitlist" && (
                      <span className="rounded-full border border-titanium px-2 py-0.5 text-[10px] font-medium text-ink-300">
                        Waitlist
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-base font-semibold text-white">{t.promise}</p>
                  <p className="mt-1 text-xs text-ink-400">{t.forWho}</p>
                  {t.whyNextTier && (
                    <p className="mt-3 border-t border-titanium pt-3 text-xs leading-relaxed text-ink-300">
                      <span className="text-ink-500">Next: </span>
                      {t.whyNextTier}
                    </p>
                  )}
                  {t.status === "waitlist" && (
                    <Link
                      href="/contact"
                      className="mt-4 inline-block text-xs font-semibold text-brand-400 transition-colors hover:text-brand-300"
                    >
                      {t.ctaLabel} →
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </section>

          <SignalRule className="mt-20" />

          {/* Where each tier takes you — real doors, real locks */}
          <section className="mt-20">
            <h2 className="text-center text-2xl font-bold text-white">Where each tier takes you</h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-ink-300">
              Every gate below is enforced on the server — walk up to any door and the seal tells
              you exactly which tier opens it.
            </p>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <TierDoorColumn
                tier="Free"
                hex={BRAND_COLORS.orbitalCyan}
                doors={[
                  { label: "Today's board", href: "/board" },
                  { label: "The Academy", href: "/academy" },
                  { label: "Verified record & calibration", href: "/performance" },
                ]}
              />
              <TierDoorColumn
                tier="Pro"
                hex={BRAND_COLORS.ionMagenta}
                doors={[
                  { label: "Trend Lab — cohort workbench", href: "/trends" },
                  { label: "Parlay MRI — portfolio surgeon", href: "/parlay-mri" },
                  { label: "Factor trail on every pick", href: "/picks" },
                ]}
              />
              <TierDoorColumn
                tier="Elite"
                hex={BRAND_COLORS.softUltraviolet}
                doors={[
                  { label: "CLV Ledger + staking toolkit", href: "/track" },
                  { label: "Real-time alerts", href: "/dashboard" },
                  { label: "New surfaces, first", href: "/changelog" },
                ]}
              />
            </div>
          </section>

          {/* Feature comparison table */}
          <div className="mt-20">
            <h2 className="text-center text-2xl font-bold text-white">Side by side</h2>
            <div className="mt-8 overflow-x-auto rounded-2xl border border-titanium">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-titanium">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ion-2">
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
                              : "text-ion-1",
                        ].join(" ")}
                      >
                        {plan.name}
                        {plan.monthly !== null && (
                          <span className="ml-1 text-xs font-normal text-ion-2">
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
                        "border-b border-titanium/60",
                        i % 2 === 0 ? "bg-carbon/20" : "",
                      ].join(" ")}
                    >
                      <td className="px-4 py-3 text-ion-2">{feature}</td>
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

          {/* Built to protect you from hype — what every tier is really for */}
          <section className="mt-20">
            <h2 className="text-center text-2xl font-bold text-white">Built to protect you from hype</h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-ink-300">{EMOTIONAL_VALUE}</p>
            <div className="mx-auto mt-8 grid max-w-4xl gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-titanium bg-carbon/40 p-6">
                <h3 className="text-sm font-semibold text-white">How confidence works</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-300">
                  {getFeature("confidence")?.customerExplanation}
                </p>
              </div>
              <div className="rounded-2xl border border-titanium bg-carbon/40 p-6">
                <h3 className="text-sm font-semibold text-white">What No-Bet means</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-300">
                  {getFeature("no-bet-reasoning")?.customerExplanation}
                </p>
              </div>
            </div>
          </section>

          {/* FAQ */}
          <section className="mt-20">
            <h2 className="text-center text-2xl font-bold text-white">Frequently asked</h2>
            <div className="mx-auto mt-8 max-w-3xl divide-y divide-titanium/60 rounded-2xl border border-titanium bg-carbon/40">
              {FAQ.map((item) => (
                <details
                  key={item.q}
                  className="group px-5 py-4 [&_summary::-webkit-details-marker]:hidden"
                >
                  <summary className="flex cursor-pointer items-center justify-between gap-4 text-left text-sm font-semibold text-ion-white">
                    <span>{item.q}</span>
                    <span
                      aria-hidden="true"
                      className="text-ion-2 transition-transform group-open:rotate-45"
                    >
                      +
                    </span>
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-ion-2">{item.a}</p>
                </details>
              ))}
            </div>
          </section>

          {/* Refund note */}
          <p className="mt-12 text-center text-xs text-ion-2">
            No free trial. Every paid plan has a 3-day money-back window. Cancel any time
            from your dashboard. Prices shown are founding-member rates.
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

function TierDoorColumn({
  tier,
  hex,
  doors,
}: {
  tier: string;
  hex: string;
  doors: { label: string; href: string }[];
}) {
  return (
    <div
      className="rounded-2xl border p-5"
      style={{ borderColor: `${hex}33`, background: `radial-gradient(100% 80% at 50% 0%, ${hex}0c, transparent 70%)` }}
    >
      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.3em]" style={{ color: hex }}>
        {tier} opens
      </p>
      <ul className="mt-4 space-y-2.5">
        {doors.map((d) => (
          <li key={d.href + d.label}>
            <Link
              href={d.href}
              className="group flex items-center justify-between rounded-lg border border-transparent px-3 py-2 text-sm text-ink-200 transition-colors hover:border-titanium hover:bg-carbon/50 hover:text-white"
            >
              {d.label}
              <span aria-hidden className="text-ink-500 transition-transform group-hover:translate-x-0.5">→</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

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
        className="mx-auto h-5 w-5 text-ion-3"
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
  return <span className="text-ion-1">{value}</span>;
}
