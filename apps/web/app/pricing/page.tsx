import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { SubscribeButton } from "@/components/pricing/subscribe-button";
import { BRAND_NAME } from "@/lib/brand";
import { PRICE_DISPLAY, formatPrice } from "@/lib/pricing";

// ─────────────────────────────────────────────
// Metadata — SEO-critical surface
// ─────────────────────────────────────────────

export const metadata: Metadata = {
  title: "Pricing — Priced on what we show you",
  description:
    "Free for one signal a day with the Edge Index public. Pro ($14.99/week) for every signal with the confidence rating and full factor trail. Elite ($21.99/week) to operate like the analyst — early access, the full model, custom alerts, and decision tools. Cancel any time.",
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: `Pricing — ${BRAND_NAME}`,
    description:
      "Four tiers, priced on what we show you — not what we hide. Pro $14.99/week, Elite $21.99/week. Every paid plan ships with a 7-day refund window.",
  },
};

// ─────────────────────────────────────────────
// Plan data — the value ladder. Each tier sells a JOB, not a feature list.
// Prices come from lib/pricing (single source of truth, lockstep with Stripe).
// ─────────────────────────────────────────────

const PLANS = [
  {
    id: "FREE" as const,
    name: "Free",
    job: "See the discipline",
    price: 0,
    period: null,
    description:
      "Watch the engine work before you pay a cent. One signal a day, and every trust surface stays open.",
    badge: null,
    cta: "Start free",
    features: [
      { label: "1 signal per day", included: true },
      { label: "Public Edge Index on every pick", included: true },
      { label: "The Pass List — every game we declined", included: true },
      { label: "Public calibration curve + ledger", included: true },
      { label: "Confidence rating on each pick", included: false },
      { label: "Full factor trail & reasoning", included: false },
      { label: "Alerts", included: false },
      { label: "Early access + analyst tools", included: false },
    ],
  },
  {
    id: "PRO" as const,
    name: "Pro",
    job: "Math you can read",
    price: PRICE_DISPLAY.PRO.amount,
    period: PRICE_DISPLAY.PRO.period,
    description:
      "Every published signal with the reasoning attached — the confidence, the factors, the movement.",
    badge: "Where most start",
    cta: "Subscribe to Pro",
    features: [
      { label: "Every signal, every day", included: true },
      { label: "Calibrated confidence on each pick", included: true },
      { label: "Full factor trail & reasoning", included: true },
      { label: "Line-movement history", included: true },
      { label: "Standard alerts — new picks + key line moves", included: true },
      { label: "All 7 sports", included: true },
      { label: "Early access before the market drifts", included: false },
      { label: "Model Court + decision tools", included: false },
    ],
  },
  {
    id: "ELITE" as const,
    name: "Elite",
    job: "Operate like the analyst",
    price: PRICE_DISPLAY.ELITE.amount,
    period: PRICE_DISPLAY.ELITE.period,
    description:
      "Everything in Pro, plus the timing edge and the tooling: see the full model, get there first, and size with discipline.",
    badge: "Most chosen",
    cta: "Subscribe to Elite",
    features: [
      { label: "Everything in Pro", included: true },
      { label: "Early access — picks at publish, before the market moves", included: true },
      { label: "Full model breakdown + Model Court (ask the model)", included: true },
      { label: "Custom alerts by sport / confidence / EV", included: true },
      { label: "Calibration scorecard + model-audit log", included: true },
      { label: "Decision tools — No-Bet check, parlay structure, sizing", included: true },
      { label: "Line shopping across books", included: true },
    ],
  },
  {
    id: "VIP" as const,
    name: "VIP",
    job: "Founder",
    price: PRICE_DISPLAY.VIP.amount,
    period: PRICE_DISPLAY.VIP.period,
    description:
      "For the few who want the builder in the room. Everything in Elite, plus access and perks that don't scale.",
    badge: null,
    cta: "Become a Founder",
    features: [
      { label: "Everything in Elite", included: true },
      { label: "Methodology deep-dives with the builder", included: true },
      { label: "Priority support", included: true },
      { label: "Founder badge", included: true },
      { label: "Founder pricing — grandfathered for life", included: true },
    ],
  },
] as const;

type PlanId = (typeof PLANS)[number]["id"];

// ─────────────────────────────────────────────
// Differentiation — why Galaxy, not the alternatives
// ─────────────────────────────────────────────

const DIFFERENTIATORS = [
  {
    vs: "vs black-box AI",
    line: "You see the reasoning — the factors and the movement — not just a number.",
  },
  {
    vs: "vs tout services",
    line: "We publish the passes and the calibration, not only the winners.",
  },
  {
    vs: "vs raw data tools",
    line: "You get the pick and the story behind it — built, not just charted.",
  },
] as const;

// ─────────────────────────────────────────────
// Comparison matrix — full ladder, side by side
// ─────────────────────────────────────────────

const COMPARISON_FEATURES = [
  "Signals per day",
  "Public Edge Index",
  "Pass List + calibration",
  "Confidence rating",
  "Factor trail & reasoning",
  "Line-movement history",
  "Standard alerts",
  "Early access",
  "Full model + Model Court",
  "Custom alerts",
  "Calibration scorecard",
  "Decision tools",
  "Line shopping",
  "Founder perks",
] as const;

const COMPARISON_CELLS: Record<PlanId, (string | boolean)[]> = {
  FREE:  ["1",       true, true, false, false, false, false, false, false, false, false, false, false, false],
  PRO:   ["Every",   true, true, true,  true,  true,  true,  false, false, false, false, false, false, false],
  ELITE: ["Every",   true, true, true,  true,  true,  true,  true,  true,  true,  true,  true,  true,  false],
  VIP:   ["Every",   true, true, true,  true,  true,  true,  true,  true,  true,  true,  true,  true,  true ],
};

// ─────────────────────────────────────────────
// FAQ — JSON-LD eligible
// ─────────────────────────────────────────────

const FAQ = [
  {
    q: "Is there a refund window on the paid plans?",
    a: "Every paid plan ships with a 7-day refund window. Billing is weekly, and you can cancel any time from your dashboard.",
  },
  {
    q: "What's the real difference between Pro and Elite?",
    a: "Pro gives you the reasoning — every signal with its confidence rating and full factor trail. Elite gives you the timing edge and the tooling on top: early access before the market moves, the full model with Model Court, custom alerts, the calibration scorecard, and the decision tools (No-Bet check, parlay structure, sizing).",
  },
  {
    q: "How is this different from a tout service?",
    a: "Tout services publish their wins and quietly delete the losses. Galaxy Sports Edge shows every signal's factor trail, publishes the games it passed on, and holds back a public win-rate until enough settled results exist to support one honestly.",
  },
  {
    q: "Why is the Performance page empty right now?",
    a: "The Calibration Report stays gated until enough settled signals have accumulated to make the published number statistically defensible. Patience over noise — that's the standard.",
  },
  {
    q: "Which sports are covered?",
    a: "NFL, NCAAF, NBA, NCAAB, MLB, NHL, and MLS. The slate runs on a 30-minute refresh loop during games.",
  },
  {
    q: "Will pricing change?",
    a: "Free stays free. The launch-cohort weekly prices hold for anyone who subscribes now — if they rise later, you're grandfathered at the rate you joined on. VIP founders keep their rate for life.",
  },
] as const;

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ.map((item) => ({
    "@type": "Question",
    name: item.q,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.a,
    },
  })),
};

// ─────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────

export default function PricingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-gray-950">
      <Nav />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <main className="flex-1 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {/* Header */}
          <div className="text-center">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-accent-300">
              Pricing
            </p>
            <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
              Priced on what we{" "}
              <span className="text-accent-300">show you</span>.
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-400">
              Free shows the rigor. Pro shows the reasoning. Elite gives you the
              timing edge and the tools. Start free, upgrade when the signal
              earns it, cancel any time.
            </p>
          </div>

          {/* Differentiation strip */}
          <div className="mx-auto mt-10 grid max-w-4xl grid-cols-1 gap-3 sm:grid-cols-3">
            {DIFFERENTIATORS.map((d) => (
              <div
                key={d.vs}
                className="rounded-xl border border-gray-800 bg-gray-900/40 p-4 text-left"
              >
                <p className="font-mono text-[11px] uppercase tracking-wider text-accent-300">
                  {d.vs}
                </p>
                <p className="mt-1.5 text-sm text-gray-300">{d.line}</p>
              </div>
            ))}
          </div>

          {/* Plan cards */}
          <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {PLANS.map((plan) => {
              const isElite = plan.id === "ELITE";
              const isVip = plan.id === "VIP";
              return (
                <div
                  key={plan.id}
                  className={[
                    "relative flex flex-col rounded-2xl border p-6",
                    isElite
                      ? "border-brand-600 bg-brand-950/30 shadow-xl shadow-brand-900/30 lg:scale-[1.03]"
                      : isVip
                        ? "border-ultraviolet/60 bg-ultraviolet/5 shadow-xl shadow-ultraviolet/10"
                        : "border-gray-800 bg-gray-900/60",
                  ].join(" ")}
                >
                  {plan.badge && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap">
                      <span
                        className={[
                          "rounded-full px-3 py-0.5 text-xs font-semibold",
                          isElite
                            ? "bg-brand-600 text-white"
                            : "bg-gray-700 text-gray-100",
                        ].join(" ")}
                      >
                        {plan.badge}
                      </span>
                    </div>
                  )}

                  <div className="mb-4">
                    <h2 className="text-xl font-bold text-white">{plan.name}</h2>
                    <p
                      className={[
                        "mt-0.5 font-mono text-[11px] uppercase tracking-wider",
                        isElite
                          ? "text-brand-400"
                          : isVip
                            ? "text-ultraviolet-glow"
                            : "text-accent-300",
                      ].join(" ")}
                    >
                      {plan.job}
                    </p>
                    <div className="mt-3 flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold text-white">
                        {formatPrice(plan.price)}
                      </span>
                      {plan.period && (
                        <span className="text-sm text-gray-400">
                          /{plan.period}
                        </span>
                      )}
                    </div>
                    <p className="mt-3 text-sm text-gray-400">
                      {plan.description}
                    </p>
                  </div>

                  <ul className="mb-6 flex flex-col gap-3">
                    {plan.features.map(({ label, included }) => (
                      <li
                        key={label}
                        className="flex items-start gap-2 text-sm"
                      >
                        {included ? <CheckIcon /> : <DashIcon />}
                        <span className={included ? "text-gray-200" : "text-gray-500"}>
                          {label}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-auto">
                    {plan.id === "FREE" ? (
                      <Link
                        href="/auth/signin"
                        className="block w-full rounded-xl border border-gray-700 bg-gray-800 py-2.5 text-center text-sm font-semibold text-gray-200 transition-colors hover:bg-gray-700"
                      >
                        {plan.cta}
                      </Link>
                    ) : (
                      <SubscribeButton
                        tier={plan.id}
                        label={plan.cta}
                        variant={plan.id === "ELITE" ? "primary" : "ghost"}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Feature comparison table */}
          <div className="mt-20">
            <h2 className="text-center text-2xl font-bold text-white">
              The full ladder, side by side
            </h2>
            <div className="mt-8 overflow-x-auto rounded-2xl border border-gray-800">
              <table className="w-full min-w-[640px] text-sm">
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
                          plan.id === "ELITE"
                            ? "text-brand-400"
                            : plan.id === "VIP"
                              ? "text-ultraviolet-glow"
                              : "text-gray-300",
                        ].join(" ")}
                      >
                        {plan.name}
                        {plan.price > 0 && (
                          <span className="ml-1 block text-xs font-normal text-gray-400">
                            {formatPrice(plan.price)}/{plan.period}
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
                      {(["FREE", "PRO", "ELITE", "VIP"] as PlanId[]).map((planId) => {
                        const cell: string | boolean =
                          COMPARISON_CELLS[planId][i] ?? false;
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
            <h2 className="text-center text-2xl font-bold text-white">
              Frequently asked
            </h2>
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
                  <p className="mt-3 text-sm leading-relaxed text-gray-400">
                    {item.a}
                  </p>
                </details>
              ))}
            </div>
          </section>

          {/* Refund note */}
          <p className="mt-12 text-center text-xs text-gray-400">
            Every paid plan ships with a 7-day refund window. Billed weekly.
            Cancel any time from your dashboard.
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

function CheckIcon() {
  return (
    <svg
      className="mt-0.5 h-4 w-4 shrink-0 text-green-400"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2.5}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  );
}

function DashIcon() {
  return (
    <svg
      className="mt-0.5 h-4 w-4 shrink-0 text-gray-700"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  );
}

function ComparisonCell({ value }: { value: string | boolean }) {
  if (typeof value === "boolean") {
    return value ? (
      <svg
        className="mx-auto h-5 w-5 text-green-400"
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
