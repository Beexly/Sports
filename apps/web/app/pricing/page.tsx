"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";

// ─────────────────────────────────────────────
// Plan data
// ─────────────────────────────────────────────

const PLANS = [
  {
    id: "FREE" as const,
    name: "Free",
    price: 0,
    period: null,
    description: "Get started with one free pick per day.",
    badge: null,
    cta: "Get Started Free",
    ctaHref: "/auth/signin",
    features: [
      { label: "1 pick per day", included: true },
      { label: "Game matchup info", included: true },
      { label: "Basic pick type (spread / ML / total)", included: true },
      { label: "Confidence scores", included: false },
      { label: "Premium picks (highest confidence)", included: false },
      { label: "Full reasoning & analysis", included: false },
      { label: "Line movement alerts", included: false },
      { label: "Email + push notifications", included: false },
      { label: "All 7 sports", included: false },
    ],
  },
  {
    id: "PRO" as const,
    name: "Pro",
    price: 9.99,
    period: "week",
    description: "Unlimited picks with confidence scores and full reasoning.",
    badge: "Most Popular",
    cta: "Subscribe to Pro",
    ctaHref: null,
    features: [
      { label: "Unlimited picks per day", included: true },
      { label: "Game matchup info", included: true },
      { label: "Basic pick type (spread / ML / total)", included: true },
      { label: "Confidence scores", included: true },
      { label: "Premium picks (highest confidence)", included: true },
      { label: "Full reasoning & analysis", included: true },
      { label: "Line movement alerts", included: true },
      { label: "Email + push notifications", included: false },
      { label: "All 7 sports", included: true },
    ],
  },
  {
    id: "ELITE" as const,
    name: "Elite",
    price: 13.99,
    period: "week",
    description: "Everything in Pro, plus real-time alerts and priority access.",
    badge: "Best Value",
    cta: "Subscribe to Elite",
    ctaHref: null,
    features: [
      { label: "Unlimited picks per day", included: true },
      { label: "Game matchup info", included: true },
      { label: "Basic pick type (spread / ML / total)", included: true },
      { label: "Confidence scores", included: true },
      { label: "Premium picks (highest confidence)", included: true },
      { label: "Full reasoning & analysis", included: true },
      { label: "Line movement alerts", included: true },
      { label: "Email + push notifications", included: true },
      { label: "All 7 sports", included: true },
    ],
  },
] as const;

type PlanId = (typeof PLANS)[number]["id"];

// Feature comparison rows (same order as feature list above)
const COMPARISON_FEATURES = [
  "Picks per day",
  "Game matchup info",
  "Pick type",
  "Confidence scores",
  "Premium picks",
  "Full reasoning",
  "Line movement alerts",
  "Notifications",
  "Sports covered",
] as const;

const COMPARISON_CELLS: Record<
  PlanId,
  (string | boolean)[]
> = {
  FREE: ["1", true, true, false, false, false, false, false, "3 of 7"],
  PRO: ["Unlimited", true, true, true, true, true, true, false, "All 7"],
  ELITE: ["Unlimited", true, true, true, true, true, true, true, "All 7"],
};

// ─────────────────────────────────────────────
// Page (Client Component — handles Stripe redirect)
// ─────────────────────────────────────────────

export default function PricingPage() {
  const router = useRouter();
  const [loadingTier, setLoadingTier] = useState<PlanId | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubscribe(tier: "PRO" | "ELITE") {
    setError(null);
    setLoadingTier(tier);

    try {
      const res = await fetch("/api/subscriptions/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });

      if (res.status === 401) {
        // Not signed in — redirect to sign in, come back to pricing
        router.push("/auth/signin?callbackUrl=/pricing");
        return;
      }

      const data = (await res.json()) as { url?: string; error?: string };

      if (!res.ok || !data.url) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoadingTier(null);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-950">
      <Nav />

      <main className="flex-1 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
              Simple, Transparent Pricing
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-lg text-gray-400">
              Start free. Upgrade when you&apos;re ready. Cancel any time.
            </p>
          </div>

          {/* Error banner */}
          {error && (
            <div className="mx-auto mt-6 max-w-md rounded-xl border border-red-800/60 bg-red-950/40 p-4 text-center">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Plan cards */}
          <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3">
            {PLANS.map((plan) => {
              const isHighlighted = plan.id === "PRO";
              return (
                <div
                  key={plan.id}
                  className={[
                    "relative flex flex-col rounded-2xl border p-6",
                    isHighlighted
                      ? "border-brand-600 bg-brand-950/30 shadow-xl shadow-brand-900/30"
                      : "border-gray-800 bg-gray-900/60",
                  ].join(" ")}
                >
                  {/* Badge */}
                  {plan.badge && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span
                        className={[
                          "rounded-full px-3 py-0.5 text-xs font-semibold",
                          plan.id === "PRO"
                            ? "bg-brand-600 text-white"
                            : "bg-yellow-500 text-yellow-950",
                        ].join(" ")}
                      >
                        {plan.badge}
                      </span>
                    </div>
                  )}

                  {/* Plan name + price */}
                  <div className="mb-4">
                    <h2 className="text-xl font-bold text-white">
                      {plan.name}
                    </h2>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold text-white">
                        ${plan.price}
                      </span>
                      {plan.period && (
                        <span className="text-sm text-gray-500">
                          /{plan.period}
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-sm text-gray-400">
                      {plan.description}
                    </p>
                  </div>

                  {/* Features */}
                  <ul className="mb-6 flex flex-col gap-3">
                    {plan.features.map(({ label, included }) => (
                      <li
                        key={label}
                        className="flex items-center gap-2 text-sm"
                      >
                        {included ? (
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
                        ) : (
                          <svg
                            className="h-4 w-4 shrink-0 text-gray-700"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={2}
                            stroke="currentColor"
                            aria-hidden="true"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M6 18 18 6M6 6l12 12"
                            />
                          </svg>
                        )}
                        <span
                          className={included ? "text-gray-200" : "text-gray-600"}
                        >
                          {label}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <div className="mt-auto">
                    {plan.ctaHref ? (
                      <Link
                        href={plan.ctaHref}
                        className="block w-full rounded-xl border border-gray-700 bg-gray-800 py-2.5 text-center text-sm font-semibold text-gray-200 transition-colors hover:bg-gray-700"
                      >
                        {plan.cta}
                      </Link>
                    ) : (
                      <button
                        type="button"
                        disabled={loadingTier !== null}
                        onClick={() =>
                          handleSubscribe(plan.id as "PRO" | "ELITE")
                        }
                        className={[
                          "w-full rounded-xl py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                          isHighlighted
                            ? "bg-brand-600 text-white hover:bg-brand-500"
                            : "border border-yellow-700/60 bg-yellow-900/20 text-yellow-300 hover:bg-yellow-900/40",
                        ].join(" ")}
                      >
                        {loadingTier === plan.id ? (
                          <span className="flex items-center justify-center gap-2">
                            <svg
                              className="h-4 w-4 animate-spin"
                              fill="none"
                              viewBox="0 0 24 24"
                              aria-hidden="true"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              />
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                              />
                            </svg>
                            Redirecting to checkout…
                          </span>
                        ) : (
                          plan.cta
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Feature comparison table */}
          <div className="mt-20">
            <h2 className="text-center text-2xl font-bold text-white">
              Full Feature Comparison
            </h2>
            <div className="mt-8 overflow-x-auto rounded-2xl border border-gray-800">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
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
                            ? "text-yellow-400"
                            : "text-gray-300",
                        ].join(" ")}
                      >
                        {plan.name}
                        {plan.price > 0 && (
                          <span className="ml-1 text-xs font-normal text-gray-500">
                            ${plan.price}/{plan.period}
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
                      {(["FREE", "PRO", "ELITE"] as PlanId[]).map((planId) => {
                        const cell: string | boolean =
                          COMPARISON_CELLS[planId][i] ?? false;
                        return (
                          <td
                            key={planId}
                            className="px-4 py-3 text-center"
                          >
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

          {/* Money back note */}
          <p className="mt-8 text-center text-xs text-gray-600">
            All paid plans include a 7-day money-back guarantee. Billed weekly.
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

function ComparisonCell({ value }: { value: string | boolean }) {
  if (typeof value === "boolean") {
    return value ? (
      <svg
        className="mx-auto h-5 w-5 text-green-400"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2.5}
        stroke="currentColor"
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
        aria-label="Not included"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M6 18 18 6M6 6l12 12"
        />
      </svg>
    );
  }
  return <span className="text-gray-300">{value}</span>;
}
