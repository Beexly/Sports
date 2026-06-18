"use client";

import { HoloTilt } from "@/components/motion/holo-tilt";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { SubscribeButton } from "./subscribe-button";

/**
 * Pricing plan cards with a monthly/annual billing toggle.
 *
 * Client component (holds toggle state) but receives all price data as
 * serializable props from the server page — so lib/stripe.ts (and the Stripe
 * SDK / secret) never enters the client bundle. Prices originate from the
 * current pricing phase (pricing-phases.ts); this component only displays them.
 */

type PlanId = "FREE" | "PRO" | "ELITE";
type Interval = "month" | "year";

export interface PlanView {
  readonly id: PlanId;
  readonly name: string;
  readonly monthly: number | null;
  readonly annual: number | null;
  readonly annualSavingsPct: number | null;
  readonly annualMonthly: number | null;
  readonly description: string;
  readonly badge: string | null;
  readonly cta: string;
  /** The flagship, best-value plan — gets the prominent border/scale/glow + primary CTA. */
  readonly hero?: boolean;
  readonly features: ReadonlyArray<{ readonly label: string; readonly included: boolean }>;
}

export function PricingPlans({
  plans,
  grandfatherNote,
}: {
  readonly plans: ReadonlyArray<PlanView>;
  readonly grandfatherNote: string;
}) {
  // Annual-first: the year plan is the better-value default we lead with.
  const [interval, setInterval] = useState<Interval>("year");
  const annual = interval === "year";

  // Honest savings headline: derive the real "up to" figure from the plans we
  // were handed, never a hardcoded number. The annual savings differ by pricing
  // mode (founding vs standard), so a fixed percentage would overstate the
  // founding-rate savings. Computed from each plan's own annualSavingsPct.
  const maxAnnualSavings = plans.reduce(
    (max, p) => (p.annualSavingsPct != null && p.annualSavingsPct > max ? p.annualSavingsPct : max),
    0,
  );

  return (
    <div>
      {/* Billing toggle */}
      <div className="flex items-center justify-center gap-3">
        <div
          role="group"
          aria-label="Billing interval"
          className="inline-flex rounded-full border border-white/[0.10] bg-white/[0.03] p-1"
        >
          <ToggleButton active={annual} onClick={() => setInterval("year")}>
            Annual
          </ToggleButton>
          <ToggleButton active={!annual} onClick={() => setInterval("month")}>
            Monthly
          </ToggleButton>
        </div>
        <span
          className={[
            "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-all duration-300",
            annual
              ? "border border-verify/40 bg-verify/10 text-verify"
              : "text-brand-400",
          ].join(" ")}
        >
          {annual && (
            <span className="h-1.5 w-1.5 rounded-full bg-verify animate-live-pulse" aria-hidden="true" />
          )}
          Save up to {maxAnnualSavings}% annually
        </span>
      </div>

      {/* Plan cards */}
      <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
        {plans.map((plan, i) => {
          const isPro = plan.id === "PRO";
          const isElite = plan.id === "ELITE";
          const isPaid = plan.id !== "FREE";
          // Hero = the flagship best-value plan (Elite). It earns the prominent
          // border/scale/glow + the primary CTA; everything else is secondary.
          const isHero = plan.hero === true;
          return (
            <HoloTilt key={plan.id} className="h-full">
            <div
              className={[
                "relative flex h-full flex-col rounded-2xl border p-6 animate-fade-up",
                isHero
                  ? "border-ultraviolet/60 bg-ultraviolet/10 shadow-glow-uv md:scale-[1.04]"
                  : isPro
                    ? "border-plasma/40 bg-white/[0.03]"
                    : "border-white/[0.10] bg-white/[0.03]",
              ].join(" ")}
              style={{ animationDelay: `${i * 90}ms` }}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap">
                  <span
                    className={[
                      "rounded-full px-3 py-1 text-xs font-bold",
                      isHero
                        ? "bg-ultraviolet text-white shadow-[0_0_14px_rgba(122,92,255,0.5)]"
                        : "bg-plasma text-plasma-ink shadow-[0_0_14px_rgba(255,45,214,0.6)]",
                    ].join(" ")}
                  >
                    {plan.badge}
                  </span>
                </div>
              )}

              <div className="mb-4">
                <h2
                  className={[
                    "text-xl font-bold",
                    isElite ? "text-ultraviolet-glow" : isPro ? "text-plasma" : "text-white",
                  ].join(" ")}
                >
                  {plan.name}
                </h2>

                <div className="mt-2 flex items-baseline gap-1">
                  {plan.id === "FREE" || plan.monthly === null ? (
                    <span className="text-4xl font-extrabold text-white">$0</span>
                  ) : annual ? (
                    <>
                      <span className="text-4xl font-extrabold text-white">${plan.annual}</span>
                      <span className="text-sm text-ink-400">/year</span>
                    </>
                  ) : (
                    <>
                      <span className="text-4xl font-extrabold text-white">${plan.monthly}</span>
                      <span className="text-sm text-ink-400">/month</span>
                    </>
                  )}
                </div>

                {/* Annual context line */}
                {isPaid && annual && plan.annualMonthly !== null && (
                  <p className="mt-1 text-xs text-verify">
                    ≈ ${plan.annualMonthly}/mo billed annually
                    {plan.annualSavingsPct ? ` · save ${plan.annualSavingsPct}%` : ""}
                  </p>
                )}
                {isPaid && !annual && plan.annual !== null && (
                  <p className="mt-1 text-xs text-ink-500">or ${plan.annual}/year</p>
                )}

                <p className="mt-2 text-sm text-ink-400">{plan.description}</p>
              </div>

              <ul className="mb-6 flex flex-col gap-3">
                {plan.features.map(({ label, included }) => (
                  <li key={label} className="flex items-center gap-2 text-sm">
                    {included ? <CheckIcon isPro={isPro} /> : <DashIcon />}
                    <span className={included ? "text-ink-300" : "text-ink-500"}>{label}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-auto">
                {plan.id === "FREE" ? (
                  <Link
                    href="/auth/signin"
                    className="block w-full rounded-xl border border-white/[0.10] bg-white/[0.08] py-2.5 text-center text-sm font-semibold text-ink-300 transition-colors hover:bg-white/[0.08]"
                  >
                    {plan.cta}
                  </Link>
                ) : (
                  <SubscribeButton
                    tier={plan.id}
                    label={plan.cta}
                    variant={isHero ? "primary" : "ghost"}
                    interval={interval}
                  />
                )}
              </div>
            </div>
            </HoloTilt>
          );
        })}
      </div>

      {/* Founding-member grandfather guarantee — the loyalty + urgency hook */}
      <p className="mx-auto mt-8 max-w-2xl text-center text-sm text-brand-400">
        {grandfatherNote}
      </p>
    </div>
  );
}

function ToggleButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={[
        "rounded-full px-4 py-1.5 text-sm font-semibold transition-colors",
        active ? "bg-brand-600 text-white" : "text-ink-400 hover:text-ink-300",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function CheckIcon({ isPro = false }: { isPro?: boolean }) {
  return (
    <svg
      className={`h-4 w-4 shrink-0 ${isPro ? "text-plasma" : "text-verify"}`}
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
      className="h-4 w-4 shrink-0 text-ink-500"
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
