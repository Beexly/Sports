import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { SubscribeButton } from "@/components/pricing/subscribe-button";
import { BRAND_NAME } from "@/lib/brand";
import { PLANS, FEATURE_MATRIX } from "@/lib/galaxy/kernel/pricing";
import type { PlanId } from "@/lib/galaxy/kernel/pricing";

// ─────────────────────────────────────────────
// Metadata — SEO-critical surface
// ─────────────────────────────────────────────

export const metadata: Metadata = {
  title: "Pricing — Three Tiers. No Upsell Games.",
  description:
    "Free for one signal a day. $19/mo for every signal with the reasoning attached. $49/mo for full alerts on every published signal. Cancel any time from your dashboard.",
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: `Pricing — ${BRAND_NAME}`,
    description:
      "Free, Pro ($19/mo), Elite ($49/mo). Every paid plan ships with a 7-day refund window.",
  },
};

// ─────────────────────────────────────────────
// Plan data — sourced from kernel registry
// ─────────────────────────────────────────────

const COMPARISON_CELLS: Record<PlanId, (string | boolean)[]> = {
  FREE: FEATURE_MATRIX.map((f) => f.free),
  PRO: FEATURE_MATRIX.map((f) => f.pro),
  ELITE: FEATURE_MATRIX.map((f) => f.elite),
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
  {
    q: "What happens after I sign up?",
    a: "Free plan gets one signal a day as soon as the readiness gate opens. Pro and Elite unlock immediately — every signal with full reasoning, plus the Edge Index and factor trail behind each one.",
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

const productJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: BRAND_NAME,
  applicationCategory: "SportsApplication",
  operatingSystem: "Web",
  description:
    "Transparent sports intelligence platform. Every pick ships with its full reasoning chain and a settlement record. No win-rate published until 30+ settled signals per model version.",
  url: "https://galaxysportsedge.com",
  offers: [
    {
      "@type": "Offer",
      name: "Free",
      price: "0",
      priceCurrency: "USD",
      description:
        "One signal per day — sample the discipline before committing.",
      url: "https://galaxysportsedge.com/auth/signin",
      availability: "https://schema.org/InStock",
    },
    {
      "@type": "Offer",
      name: "Pro",
      price: "19.00",
      priceCurrency: "USD",
      description:
        "Every published signal with the confidence rating and full factor trail attached.",
      url: "https://galaxysportsedge.com/pricing",
      availability: "https://schema.org/InStock",
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: "19.00",
        priceCurrency: "USD",
        unitCode: "MON",
      },
    },
    {
      "@type": "Offer",
      name: "Elite",
      price: "49.00",
      priceCurrency: "USD",
      description:
        "Pro plus real-time alerts on every published signal — built for live slates.",
      url: "https://galaxysportsedge.com/pricing",
      availability: "https://schema.org/InStock",
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: "49.00",
        priceCurrency: "USD",
        unitCode: "MON",
      },
    },
  ],
};

// ─────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────

export default function PricingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-carbon">
      <Nav />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />

      <main className="flex-1 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          {/* Header */}
          <div className="text-center">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-accent-300">
              Pricing
            </p>
            <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
              Three tiers. No upsell games.
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-lg text-gray-400">
              Start free. Upgrade when the signal earns it. Cancel any time
              from your dashboard.
            </p>
          </div>

          {/* Plan cards */}
          <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3">
            {PLANS.map((plan) => {
              const isHighlighted = plan.id === "PRO";
              const isElite = plan.id === "ELITE";
              return (
                <div
                  key={plan.id}
                  className={[
                    "relative flex flex-col rounded-2xl border p-6",
                    isHighlighted
                      ? "border-brand-600 bg-brand-950/30 shadow-xl shadow-brand-900/30"
                      : isElite
                        ? "border-ultraviolet/60 bg-ultraviolet/5 shadow-xl shadow-ultraviolet/10"
                        : "border-mineral bg-gray-900/60",
                  ].join(" ")}
                >
                  {plan.badge && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap">
                      <span
                        className={[
                          "rounded-full px-3 py-0.5 text-xs font-semibold",
                          plan.id === "PRO"
                            ? "bg-brand-600 text-white"
                            : "bg-ultraviolet text-white",
                        ].join(" ")}
                      >
                        {plan.badge}
                      </span>
                    </div>
                  )}

                  <div className="mb-4">
                    <h2 className="text-xl font-bold text-white">
                      {plan.name}
                    </h2>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold text-white">
                        ${plan.price}
                      </span>
                      {plan.period && (
                        <span className="text-sm text-gray-400">
                          /{plan.period}
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-sm text-gray-400">
                      {plan.description}
                    </p>
                  </div>

                  <ul className="mb-6 flex flex-col gap-3">
                    {plan.features.map(({ label, included }) => (
                      <li
                        key={label}
                        className="flex items-center gap-2 text-sm"
                      >
                        {included ? <CheckIcon /> : <DashIcon />}
                        <span
                          className={
                            included ? "text-gray-200" : "text-gray-400"
                          }
                        >
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
                        variant={plan.id === "PRO" ? "primary" : "ghost"}
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
              Everything, side by side
            </h2>
            <p className="mt-2 text-center text-sm text-gray-500">
              {FEATURE_MATRIX.length} features across {new Set(FEATURE_MATRIX.filter((f) => f.group).map((f) => f.group)).size} categories
            </p>
            <div className="mt-8 overflow-x-auto rounded-2xl border border-mineral">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-mineral bg-gray-950">
                    <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                      Feature
                    </th>
                    {PLANS.map((plan) => (
                      <th
                        key={plan.id}
                        className={[
                          "px-4 py-4 text-center text-sm font-bold",
                          plan.id === "PRO"
                            ? "text-brand-400"
                            : plan.id === "ELITE"
                              ? "text-ultraviolet-glow"
                              : "text-gray-300",
                        ].join(" ")}
                      >
                        {plan.name}
                        {plan.price > 0 && (
                          <span className="ml-1 text-xs font-normal text-gray-500">
                            ${plan.price}/mo
                          </span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {FEATURE_MATRIX.map((feature, i) => (
                    <>
                      {feature.group && (
                        <tr key={`group-${feature.group}`} className="border-b border-mineral bg-gray-950/80">
                          <td colSpan={4} className="px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-ion-blue">
                            {feature.group}
                          </td>
                        </tr>
                      )}
                      <tr
                        key={feature.label}
                        className={[
                          "border-b border-mineral/40 transition-colors hover:bg-gray-900/30",
                          i % 2 === 0 ? "bg-gray-900/10" : "",
                        ].join(" ")}
                      >
                        <td className="px-4 py-3 text-gray-300">{feature.label}</td>
                        {(["FREE", "PRO", "ELITE"] as PlanId[]).map((planId) => {
                          const cell: string | boolean =
                            COMPARISON_CELLS[planId][i] ?? false;
                          return (
                            <td key={planId} className="px-4 py-3 text-center">
                              <ComparisonCell value={cell} />
                            </td>
                          );
                        })}
                      </tr>
                    </>
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
            <div className="mx-auto mt-8 max-w-3xl divide-y divide-gray-800/60 rounded-2xl border border-mineral bg-gray-900/40">
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
            Every paid plan ships with a 7-day refund window. Billed monthly.
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
      className="h-4 w-4 shrink-0 text-green-400"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2.5}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m4.5 12.75 6 6 9-13.5"
      />
    </svg>
  );
}

function DashIcon() {
  return (
    <svg
      className="h-4 w-4 shrink-0 text-gray-700"
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
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="m4.5 12.75 6 6 9-13.5"
        />
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
