import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { PricingPlans, type PlanView } from "@/components/pricing/pricing-plans";
import {
  getCurrentPricingPhase,
  getCurrentPricingMode,
  getNewSubscriberRates,
  annualSavingsPct,
  annualMonthlyEquivalent,
  APEX_ADDON,
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
import { SITE_URL } from "@/lib/seo/sports-jsonld";

// ─────────────────────────────────────────────
// Metadata — SEO-critical surface
// ─────────────────────────────────────────────

const phase = getCurrentPricingPhase();
// Rates a NEW subscriber is quoted — FOUNDING by default, STANDARD_RATES once the
// owner flips PRICING_MODE. Founding-only copy ("lowest price we'll ever offer")
// is gated on this so it never becomes untrue under standard mode.
const rates = getNewSubscriberRates();
const isFounding = getCurrentPricingMode() === "founding";

export const metadata: Metadata = {
  title: isFounding
    ? "Pricing — Founding-Member Rates, Locked For Life"
    : "Pricing — Pro & Elite Plans",
  description: isFounding
    ? "Free for two picks a day, with confidence. Founding-member pricing on Pro and Elite — the lowest price we will ever offer, locked for the life of your subscription. Monthly or annual. Cancel any time."
    : "Free for two picks a day, with confidence. Pro and Elite unlock the full board — Elite is the best-value tier. Monthly or annual. Cancel any time.",
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: `Pricing — ${BRAND_NAME}`,
    description: isFounding
      ? "Founding-member pricing, locked for life. Monthly or annual, with a 3-day money-back window."
      : "Pro and Elite plans — Elite is the best value. Monthly or annual, with a 3-day money-back window.",
  },
};

// ─────────────────────────────────────────────
// Feature matrix (static) + phase-derived prices
// ─────────────────────────────────────────────

const FREE_FEATURES = [
  { label: "2 picks per day, with confidence scores", included: true },
  { label: "Edge Index on every signal", included: true },
  { label: "Game matchup info + pick type", included: true },
  { label: "Public verified record & calibration", included: true },
  { label: "The Academy — full training floor", included: true },
  { label: "Confidence on the full board (Pro)", included: false },
  { label: "Factor trail & evidence audit (Elite)", included: false },
  { label: "Trend Lab + Parlay MRI (Elite)", included: false },
  { label: "Ask the model + line-movement intel (Elite)", included: false },
  { label: "Real-time alerts (Elite)", included: false },
  { label: "CLV Ledger + staking toolkit (Elite)", included: false },
] as const;

const PRO_FEATURES = [
  { label: "The Academy + public verified record", included: true },
  { label: "Every signal, every day — all 7 sports", included: true },
  { label: "Confidence rating on every signal", included: true },
  { label: "Full No-Bet reasoning + board filters", included: true },
  { label: "Edge history + proof ledger access", included: true },
  { label: "Full factor trail & reasoning (Elite)", included: false },
  { label: "Evidence audit — full forensic detail (Elite)", included: false },
  { label: "Ask the model why + line-movement intel (Elite)", included: false },
  { label: "Trend Lab + Parlay MRI (Elite)", included: false },
  { label: "Real-time alerts (Elite)", included: false },
  { label: "CLV Ledger + staking toolkit (Elite)", included: false },
] as const;

const ELITE_FEATURES = [
  { label: "Everything in Pro — all 7 sports, confidence on every signal", included: true },
  { label: "Full factor trail & reasoning", included: true },
  { label: "Evidence audit — full forensic detail", included: true },
  { label: "Ask the model why, on any pick", included: true },
  { label: "Line-movement intel", included: true },
  { label: "Trend Lab — full cohort workbench", included: true },
  { label: "Parlay MRI — the portfolio surgeon", included: true },
  { label: "Real-time email + push alerts on every signal", included: true },
  { label: "CLV Ledger + Kelly-aware staking toolkit", included: true },
  { label: "First access to new intelligence surfaces", included: true },
  { label: "SHARP-tier signals (70–92% band) — building the record", included: true },
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
    monthly: rates.pro.monthly,
    annual: rates.pro.annual,
    annualSavingsPct: annualSavingsPct(rates.pro),
    annualMonthly: annualMonthlyEquivalent(rates.pro),
    description: "The daily board with confidence: every signal across all 7 sports, the confidence rating, full No-Bet reasoning, and filters.",
    badge: "Most Popular",
    cta: "Subscribe to Pro",
    features: [...PRO_FEATURES],
  },
  {
    id: "ELITE",
    name: "Elite",
    monthly: rates.elite.monthly,
    annual: rates.elite.annual,
    annualSavingsPct: annualSavingsPct(rates.elite),
    annualMonthly: annualMonthlyEquivalent(rates.elite),
    description: "The complete intelligence layer: everything in Pro, plus the full factor trail, ask-the-model, line movement, Trend Lab, Parlay MRI, real-time alerts, and the CLV ledger.",
    badge: "Best Value",
    hero: true,
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
  PRO: ["Unlimited", "All 7", true, true, false, false, false, false, false, false, false, false, true, true],
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
  // Founding-only: the "lowest price we'll ever offer" claim is true only while
  // PRICING_MODE is founding. Under standard mode it is replaced with a neutral
  // grandfather note so nothing on the page becomes untrue.
  isFounding
    ? {
        q: "What is founding-member pricing?",
        a: "We are pre-track-record, so the launch cohort gets the lowest price we will ever offer — and it is locked for the life of your subscription. When prices rise for new members as the verified record grows, yours never does.",
      }
    : {
        q: "Are early subscribers grandfathered?",
        a: "Yes. Founding members keep their founding rate for the life of their subscription — no forced migration, ever. Your price is locked when you join and never rises for you.",
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

// Product/Offer markup — makes the paid tiers rich-result eligible. Prices come
// straight from the live pricing phase (single source of truth), so they can
// never drift from what Stripe charges.
const offersJsonLd = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: `${BRAND_NAME} subscription`,
  description:
    "Daily sports picks with confidence scores, factor trails, line movement, and published calibration receipts. Free tier included; Pro and Elite unlock the full board.",
  brand: { "@type": "Brand", name: BRAND_NAME },
  offers: [
    { tier: "Pro", interval: "Monthly", price: rates.pro.monthly },
    { tier: "Pro", interval: "Annual", price: rates.pro.annual },
    { tier: "Elite", interval: "Monthly", price: rates.elite.monthly },
    { tier: "Elite", interval: "Annual", price: rates.elite.annual },
  ].map((o) => ({
    "@type": "Offer",
    name: `${o.tier} · ${o.interval}`,
    price: o.price.toFixed(2),
    priceCurrency: "USD",
    availability: "https://schema.org/InStock",
    url: `${SITE_URL}/pricing`,
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(offersJsonLd) }}
      />

      <main id="main-content" className="relative flex-1 overflow-hidden px-4 py-20 sm:px-6 lg:px-8">
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
                {isFounding ? "Claim the founding rate." : "Elite is where the depth lives."}
              </h1>
            </Reveal>
            <Reveal delay={180}>
              <p className="mx-auto mt-4 max-w-xl text-lg text-ink-300">
                {isFounding
                  ? "Start free. Back us before the record exists and your price never moves — even as it rises for everyone who joins later."
                  : "Start free. Pro reads today's board with confidence; Elite is the best-value tier — the complete intelligence layer behind every signal."}
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

          {/* Apex add-on — a separate purchase ABOVE Elite, not a tier */}
          <section className="mt-12">
            <div
              className="mx-auto max-w-3xl overflow-hidden rounded-2xl border p-6 text-center"
              style={{
                borderColor: `${BRAND_COLORS.softUltraviolet}44`,
                background: `radial-gradient(120% 100% at 50% 0%, ${BRAND_COLORS.softUltraviolet}10, rgba(8,6,20,0.6) 70%)`,
              }}
            >
              <p
                className="font-mono text-[10px] font-bold uppercase tracking-[0.3em]"
                style={{ color: BRAND_COLORS.softUltraviolet }}
              >
                Apex add-on
              </p>
              <h3 className="mt-2 text-lg font-bold text-white">
                Apex picks (92–100% band)
              </h3>
              <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-ink-300">
                ${APEX_ADDON.perPick}/pick or ${APEX_ADDON.fivePack}/5-pack — a separate purchase
                above Elite. Building the record; no win-rate claim published.
              </p>
            </div>
          </section>

          {/* Why each step up — the value ladder (incl. the Operator waitlist) */}
          <section className="mt-20">
            <h2 className="text-center text-2xl font-bold text-white">Why each step up</h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-ink-300">
              Each plan is a different job — and you can see exactly what the next tier adds before you pay for it.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {VALUE_TIERS.filter((t) => t.status === "live").map((t, i) => (
                <div
                  key={t.id}
                  className="flex h-full flex-col overflow-hidden rounded-2xl border p-5 animate-fade-up transition-all hover:-translate-y-0.5"
                  style={{
                    borderColor: `${BRAND_COLORS.orbitalCyan}20`,
                    background: `linear-gradient(135deg, ${BRAND_COLORS.orbitalCyan}05 0%, rgba(18,14,36,0.7) 100%)`,
                    animationDelay: `${i * 80}ms`,
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p
                      className="font-mono text-[10px] font-semibold uppercase tracking-[0.3em]"
                      style={{ color: BRAND_COLORS.orbitalCyan }}
                    >
                      {t.name}
                    </p>
                    {t.status === "waitlist" && (
                      <span
                        className="rounded-full border px-2 py-0.5 text-[10px] font-medium text-ink-400"
                        style={{ borderColor: "rgba(255,255,255,0.12)" }}
                      >
                        Waitlist
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-base font-semibold text-white">{t.promise}</p>
                  <p className="mt-1 text-xs text-ink-500">{t.forWho}</p>
                  {t.whyNextTier && (
                    <p
                      className="mt-auto pt-3 text-xs leading-relaxed text-ink-400"
                      style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
                    >
                      <span className="text-ink-500">Next: </span>
                      {t.whyNextTier}
                    </p>
                  )}
                  {t.status === "waitlist" && (
                    <Link
                      href="/contact"
                      className="mt-4 inline-block text-xs font-semibold transition-colors hover:text-white"
                      style={{ color: BRAND_COLORS.orbitalCyan }}
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
                  { label: "Today's full board — all 7 sports", href: "/board" },
                  { label: "Confidence on every signal", href: "/board" },
                  { label: "Board filters + No-Bet reasoning", href: "/board" },
                ]}
              />
              <TierDoorColumn
                tier="Elite"
                hex={BRAND_COLORS.softUltraviolet}
                doors={[
                  { label: "Factor trail + ask the model", href: "/board" },
                  { label: "Trend Lab — cohort workbench", href: "/trends" },
                  { label: "Parlay MRI — portfolio surgeon", href: "/parlay-mri" },
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
            <div
              className="mt-8 overflow-x-auto overflow-hidden rounded-2xl border"
              style={{ borderColor: "rgba(255,255,255,0.10)", background: "rgba(8,6,20,0.5)" }}
            >
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", background: `${BRAND_COLORS.orbitalCyan}06` }}>
                    <th className="px-4 py-4 text-left font-mono text-[10px] uppercase tracking-wider text-ink-500">
                      Feature
                    </th>
                    {PLANS.map((plan) => (
                      <th
                        key={plan.id}
                        className="px-4 py-4 text-center text-sm font-bold"
                        style={{
                          color: plan.id === "PRO"
                            ? BRAND_COLORS.ionMagenta
                            : plan.id === "ELITE"
                              ? BRAND_COLORS.softUltraviolet
                              : BRAND_COLORS.orbitalCyan,
                        }}
                      >
                        {plan.name}
                        {plan.monthly !== null && (
                          <span className="ml-1 text-xs font-normal text-ink-500">
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
                      className="transition-colors hover:bg-white/[0.025]"
                      style={{
                        borderBottom: i < COMPARISON_FEATURES.length - 1 ? "1px solid rgba(255,255,255,0.05)" : undefined,
                        background: i % 2 === 0 ? "rgba(255,255,255,0.015)" : undefined,
                      }}
                    >
                      <td className="px-4 py-3 text-ink-300">{feature}</td>
                      {(["FREE", "PRO", "ELITE"] as const).map((planId) => {
                        const cell: string | boolean = COMPARISON_CELLS[planId][i] ?? false;
                        return (
                          <td key={planId} className="px-4 py-3 text-center">
                            <ComparisonCell value={cell} tier={planId} />
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
            <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-ink-400">{EMOTIONAL_VALUE}</p>
            <div className="mx-auto mt-8 grid max-w-4xl gap-4 md:grid-cols-2">
              <div
                className="overflow-hidden rounded-2xl border p-6 transition-all hover:-translate-y-0.5"
                style={{
                  borderColor: `${BRAND_COLORS.orbitalCyan}22`,
                  background: `linear-gradient(135deg, ${BRAND_COLORS.orbitalCyan}06 0%, rgba(18,14,36,0.7) 100%)`,
                }}
              >
                <p
                  className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em]"
                  style={{ color: BRAND_COLORS.orbitalCyan }}
                >
                  Signal quality
                </p>
                <h3 className="text-sm font-semibold text-white">How confidence works</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-400">
                  {getFeature("confidence")?.customerExplanation}
                </p>
              </div>
              <div
                className="overflow-hidden rounded-2xl border p-6 transition-all hover:-translate-y-0.5"
                style={{
                  borderColor: `${BRAND_COLORS.softUltraviolet}22`,
                  background: `linear-gradient(135deg, ${BRAND_COLORS.softUltraviolet}06 0%, rgba(18,14,36,0.7) 100%)`,
                }}
              >
                <p
                  className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em]"
                  style={{ color: BRAND_COLORS.softUltraviolet }}
                >
                  Discipline gate
                </p>
                <h3 className="text-sm font-semibold text-white">What No-Bet means</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-400">
                  {getFeature("no-bet-reasoning")?.customerExplanation}
                </p>
              </div>
            </div>
          </section>

          {/* FAQ */}
          <section className="mt-20">
            <h2 className="text-center text-2xl font-bold text-white">Frequently asked</h2>
            <div
              className="mx-auto mt-8 max-w-3xl overflow-hidden rounded-2xl border"
              style={{ borderColor: "rgba(255,255,255,0.10)", background: "rgba(8,6,20,0.5)" }}
            >
              {FAQ.map((item, i) => (
                <details
                  key={item.q}
                  className="group px-5 py-4 transition-colors hover:bg-white/[0.025] [&_summary::-webkit-details-marker]:hidden"
                  style={{ borderBottom: i < FAQ.length - 1 ? "1px solid rgba(255,255,255,0.07)" : undefined }}
                >
                  <summary className="flex cursor-pointer items-center justify-between gap-4 text-left text-sm font-semibold text-white">
                    <span>{item.q}</span>
                    <span
                      aria-hidden="true"
                      className="shrink-0 rounded-full border px-1.5 py-0.5 text-xs transition-transform group-open:rotate-45"
                      style={{ borderColor: `${BRAND_COLORS.ionMagenta}40`, color: BRAND_COLORS.ionMagenta }}
                    >
                      +
                    </span>
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-ink-400">{item.a}</p>
                </details>
              ))}
            </div>
          </section>

          {/* Refund note */}
          <p className="mt-12 text-center text-xs text-ink-500">
            No free trial. Every paid plan has a 3-day money-back window. Cancel any time
            from your dashboard.{isFounding ? " Prices shown are founding-member rates." : " Founding members keep their founding rate for life."}
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
              className="group flex items-center justify-between rounded-lg border border-transparent px-3 py-2 text-sm text-ink-300 transition-colors hover:border-white/10 hover:bg-white/[0.03] hover:text-white"
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

function ComparisonCell({ value, tier }: { value: string | boolean; tier?: "FREE" | "PRO" | "ELITE" }) {
  if (typeof value === "boolean") {
    const checkColor = tier === "PRO" ? "text-plasma" : tier === "ELITE" ? "text-ultraviolet" : "text-orbital-cyan";
    return value ? (
      <svg
        className={`mx-auto h-5 w-5 ${checkColor}`}
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
        className="mx-auto h-4 w-4 text-titanium"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        role="img"
        aria-label="Not included"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
      </svg>
    );
  }
  return <span className="text-xs font-medium text-ink-400">{value}</span>;
}
