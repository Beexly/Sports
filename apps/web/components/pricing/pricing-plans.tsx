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

type PlanId = "FREE" | "FANTASY" | "PRO" | "ELITE";
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
  readonly features: ReadonlyArray<{ readonly label: string; readonly included: boolean }>;
}

export function PricingPlans({
  plans,
  grandfatherNote,
}: {
  readonly plans: ReadonlyArray<PlanView>;
  readonly grandfatherNote: string;
}) {
  const [interval, setInterval] = useState<Interval>("month");
  const annual = interval === "year";

  return (
    <div>
      {/* Billing toggle */}
      <div className="flex items-center justify-center gap-3">
        <div
          role="group"
          aria-label="Billing interval"
          className="inline-flex rounded-full border border-titanium bg-carbon/60 p-1"
        >
          <ToggleButton active={!annual} onClick={() => setInterval("month")}>
            Monthly
          </ToggleButton>
          <ToggleButton active={annual} onClick={() => setInterval("year")}>
            Annual
          </ToggleButton>
        </div>
        <span className="text-xs font-medium text-brand-400">Save up to 45% annually</span>
      </div>

      {/* Plan cards */}
      <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {plans.map((plan) => {
          const isPro = plan.id === "PRO";
          const isElite = plan.id === "ELITE";
          const isPaid = plan.id !== "FREE";
          return (
            <HoloTilt key={plan.id} className="h-full">
            <div
              className={[
                "relative flex h-full flex-col rounded-2xl border p-6",
                isPro
                  ? "border-brand-600 bg-brand-950/30 shadow-xl shadow-brand-900/30"
                  : isElite
                    ? "border-ultraviolet/60 bg-ultraviolet/5 shadow-xl shadow-ultraviolet/10"
                    : "border-titanium bg-carbon/60",
              ].join(" ")}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap">
                  <span
                    className={[
                      "rounded-full px-3 py-0.5 text-xs font-semibold",
                      isPro ? "bg-brand-600 text-white" : "bg-ultraviolet text-white",
                    ].join(" ")}
                  >
                    {plan.badge}
                  </span>
                </div>
              )}

              <div className="mb-4">
                <h2 className="text-xl font-bold text-white">{plan.name}</h2>

                <div className="mt-2 flex items-baseline gap-1">
                  {plan.id === "FREE" || plan.monthly === null ? (
                    <span className="text-4xl font-extrabold text-white">$0</span>
                  ) : annual ? (
                    <>
                      <span className="text-4xl font-extrabold text-white">${plan.annual}</span>
                      <span className="text-sm text-ion-2">/year</span>
                    </>
                  ) : (
                    <>
                      <span className="text-4xl font-extrabold text-white">${plan.monthly}</span>
                      <span className="text-sm text-ion-2">/month</span>
                    </>
                  )}
                </div>

                {/* Annual context line */}
                {isPaid && annual && plan.annualMonthly !== null && (
                  <p className="mt-1 text-xs text-brand-400">
                    ≈ ${plan.annualMonthly}/mo billed annually
                    {plan.annualSavingsPct ? ` · save ${plan.annualSavingsPct}%` : ""}
                  </p>
                )}
                {isPaid && !annual && plan.annual !== null && (
                  <p className="mt-1 text-xs text-ion-3">or ${plan.annual}/year</p>
                )}

                <p className="mt-2 text-sm text-ion-2">{plan.description}</p>
              </div>

              <ul className="mb-6 flex flex-col gap-3">
                {plan.features.map(({ label, included }) => (
                  <li key={label} className="flex items-center gap-2 text-sm">
                    {included ? <CheckIcon /> : <DashIcon />}
                    <span className={included ? "text-ion-1" : "text-ion-3"}>{label}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-auto">
                {plan.id === "FREE" ? (
                  <Link
                    href="/auth/signin"
                    className="block w-full rounded-xl border border-titanium bg-titanium py-2.5 text-center text-sm font-semibold text-ion-1 transition-colors hover:bg-titanium"
                  >
                    {plan.cta}
                  </Link>
                ) : (
                  <SubscribeButton
                    tier={plan.id}
                    label={plan.cta}
                    variant={isPro ? "primary" : "ghost"}
                    interval={interval}
                    priceMonthly={plan.monthly}
                    priceAnnual={plan.annual}
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
        "min-h-11 rounded-full px-5 py-1.5 text-sm font-semibold transition-colors",
        active ? "bg-brand-600 text-white" : "text-ion-2 hover:text-ion-1",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function CheckIcon() {
  return (
    <svg
      className="h-4 w-4 shrink-0 text-brand-400"
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
      className="h-4 w-4 shrink-0 text-ion-3"
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
