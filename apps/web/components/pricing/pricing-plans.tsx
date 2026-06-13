"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { SubscribeButton } from "./subscribe-button";

/**
 * Pricing plan cards with a monthly/annual billing toggle.
 *
 * Energi pass: design-token classes throughout (no raw gray-* / brand-* palette
 * classes), filled identity chips for Pro and Elite badges, billing toggle
 * upgraded to use orbital-cyan active state.
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
  readonly features: ReadonlyArray<{ readonly label: string; readonly included: boolean }>;
}

const CARD_RING: Record<PlanId, string> = {
  FREE:  "border-mineral bg-eclipse",
  PRO:   "border-orbital-cyan/40 bg-void shadow-[0_0_48px_-16px_rgba(0,229,255,0.25)]",
  ELITE: "border-ultraviolet/50 bg-void shadow-[0_0_48px_-16px_rgba(122,92,255,0.25)]",
};

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
          className="inline-flex rounded-full border border-mineral bg-eclipse p-1"
        >
          <ToggleButton active={!annual} variant="cyan" onClick={() => setInterval("month")}>
            Monthly
          </ToggleButton>
          <ToggleButton active={annual} variant="cyan" onClick={() => setInterval("year")}>
            Annual
          </ToggleButton>
        </div>
        <span className="text-xs font-medium text-orbital-cyan">Save up to 45% annually</span>
      </div>

      {/* Plan cards */}
      <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
        {plans.map((plan) => {
          const isPro = plan.id === "PRO";
          const isElite = plan.id === "ELITE";
          const isPaid = plan.id !== "FREE";
          return (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-2xl border p-6 ${CARD_RING[plan.id]}`}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap">
                  <span
                    className={isPro ? "gw-chip-cyan" : "gw-chip-plasma"}
                    style={{ fontSize: "9px", padding: "4px 12px" }}
                  >
                    {plan.badge}
                  </span>
                </div>
              )}

              <div className="mb-4">
                <h2 className={`text-xl font-bold ${isPro ? "text-orbital-cyan" : isElite ? "text-ultraviolet" : "text-ion-white"}`}>
                  {plan.name}
                </h2>

                <div className="mt-2 flex items-baseline gap-1">
                  {plan.id === "FREE" || plan.monthly === null ? (
                    <span className="text-4xl font-extrabold text-ion-white">$0</span>
                  ) : annual ? (
                    <>
                      <span className="text-4xl font-extrabold text-ion-white">${plan.annual}</span>
                      <span className="text-sm text-ion-2">/year</span>
                    </>
                  ) : (
                    <>
                      <span className="text-4xl font-extrabold text-ion-white">${plan.monthly}</span>
                      <span className="text-sm text-ion-2">/month</span>
                    </>
                  )}
                </div>

                {/* Annual context line */}
                {isPaid && annual && plan.annualMonthly !== null && (
                  <p className="mt-1 text-xs text-orbital-cyan">
                    ≈ ${plan.annualMonthly}/mo billed annually
                    {plan.annualSavingsPct ? ` · save ${plan.annualSavingsPct}%` : ""}
                  </p>
                )}
                {isPaid && !annual && plan.annual !== null && (
                  <p className="mt-1 text-xs text-ion-2">or ${plan.annual}/year</p>
                )}

                <p className="mt-2 text-sm text-ion-1">{plan.description}</p>
              </div>

              <ul className="mb-6 flex flex-col gap-3">
                {plan.features.map(({ label, included }) => (
                  <li key={label} className="flex items-center gap-2 text-sm">
                    {included ? <CheckIcon /> : <DashIcon />}
                    <span className={included ? "text-ion" : "text-ion-2"}>{label}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-auto">
                {plan.id === "FREE" ? (
                  <Link
                    href="/auth/signin"
                    className="block w-full rounded-xl border border-mineral bg-eclipse py-2.5 text-center text-sm font-semibold text-ion transition-colors hover:border-mineral-hi hover:bg-titanium"
                  >
                    {plan.cta}
                  </Link>
                ) : (
                  <SubscribeButton
                    tier={plan.id}
                    label={plan.cta}
                    variant={isPro ? "primary" : "ghost"}
                    interval={interval}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Founding-member grandfather guarantee */}
      <p className="mx-auto mt-8 max-w-2xl text-center text-sm text-orbital-cyan">
        {grandfatherNote}
      </p>
    </div>
  );
}

function ToggleButton({
  active,
  variant,
  onClick,
  children,
}: {
  active: boolean;
  variant: "cyan";
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
        active
          ? "text-void"
          : "text-ion-2 hover:text-ion",
      ].join(" ")}
      style={active ? {
        background: "linear-gradient(110deg, #5BEEFF, #00E5FF)",
        boxShadow: "0 0 16px -4px rgba(0,229,255,0.5)",
      } : undefined}
    >
      {children}
    </button>
  );
}

function CheckIcon() {
  return (
    <svg
      className="h-4 w-4 shrink-0 text-orbital-cyan"
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
      className="h-4 w-4 shrink-0 text-mineral-hi"
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
