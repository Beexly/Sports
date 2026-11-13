"use client";

/**
 * Two-door storefront checkout controls (client).
 *
 * Honesty contract:
 * - Buttons are DISABLED unless the server-side Stage-5 gate reports at least
 *   one official play AND a Whop checkout link is configured for that tier.
 * - A click POSTs to /api/packages/checkout; only a real returned URL navigates.
 * - Disabled / failed states always show a plain-language reason. No fake
 *   success, ever.
 */

import React, { useState } from "react";
import type { Stage5GateStatus } from "@/lib/packages/stage5-gate";
import type {
  SingleSlatePackOffer,
  MembershipPlanId,
} from "@/lib/packages/two-door-offers";
import { MEMBERSHIP_PLANS, FOUNDING_SEAT_COPY } from "@/lib/packages/two-door-offers";

type CheckoutState = "idle" | "loading" | "error";

function useWhopCheckout() {
  const [state, setState] = useState<CheckoutState>("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function startCheckout(payload: Record<string, unknown>) {
    setState("loading");
    setMessage(null);
    try {
      const res = await fetch("/api/packages/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as {
        checkoutEnabled?: boolean;
        url?: string;
        reason?: string;
        message?: string;
        error?: string;
      };
      if (res.ok && data.checkoutEnabled && typeof data.url === "string" && data.url) {
        // Real provider URL only - never a mock.
        window.location.assign(data.url);
        return;
      }
      setState("error");
      setMessage(
        data.message ||
          data.reason ||
          data.error ||
          "Checkout is not available right now. Nothing has been charged.",
      );
    } catch {
      setState("error");
      setMessage("We could not reach checkout. Nothing has been charged - please try again.");
    }
  }

  return { state, message, startCheckout };
}

const eyebrow = "font-numerals text-[11px] uppercase tracking-[0.22em]";

function DisabledNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-3 border-t border-mineral pt-3 text-sm leading-6 text-ion-2">
      {children}
    </p>
  );
}

/** Free, transparent PASS reasoning shown when no official play cleared Stage 5. */
export function PassReasoningPanel({ slateLabel }: { slateLabel: string }) {
  return (
    <div
      data-testid="pass-reasoning-panel"
      className="mt-6 border border-mineral bg-obsidian p-5"
    >
      <div className="flex flex-wrap items-center gap-3">
        <span className={`${eyebrow} border border-plasma px-2.5 py-1 text-plasma`}>
          Pass · free reasoning
        </span>
        <span className={`${eyebrow} text-ion-2`}>Badge of honor, not a hidden state</span>
      </div>
      <p className="mt-4 font-display text-lg leading-snug text-ion-white">
        No official play cleared our five-stage check for {slateLabel} yet - here&apos;s why we pass.
      </p>
      <ul className="mt-4 space-y-2.5 text-sm leading-6 text-ion-1">
        <li className="flex gap-3">
          <span aria-hidden className="mt-0.5 font-numerals text-plasma">01</span>
          Every game on this slate failed at least one stage: fresh-data verification, a
          full-market price scan, edge verification, the number/price check, or the final
          publication gate.
        </li>
        <li className="flex gap-3">
          <span aria-hidden className="mt-0.5 font-numerals text-plasma">02</span>
          When the market has already moved past our fair number, the honest move is to sit
          out. We never force a side to fill a pack.
        </li>
        <li className="flex gap-3">
          <span aria-hidden className="mt-0.5 font-numerals text-plasma">03</span>
          You are not paying for a guess. Checkout opens automatically when a play clears
          all five stages - and the reasoning for every pass stays free, right here.
        </li>
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Door 2 - Single-Slate Pack card
// ---------------------------------------------------------------------------

export interface SingleSlateCardProps {
  offer: SingleSlatePackOffer;
  gate: Stage5GateStatus;
  standardConfigured: boolean;
  creditBackConfigured: boolean;
}

export function SingleSlateCard({
  offer,
  gate,
  standardConfigured,
  creditBackConfigured,
}: SingleSlateCardProps) {
  const [tier, setTier] = useState<"standard" | "credit-back">("standard");
  const { state, message, startCheckout } = useWhopCheckout();

  const priceCents = tier === "credit-back" ? offer.creditBackPriceCents : offer.standardPriceCents;
  const tierConfigured = tier === "credit-back" ? creditBackConfigured : standardConfigured;
  const checkoutOpen = gate.checkoutEnabled && tierConfigured;
  const slateLabel =
    offer.slateKey === "primetime-showdown" ? "this primetime slate" : "this Sunday slate";

  return (
    <article
      id={offer.slug}
      data-testid={`single-slate-card-${offer.slateKey}`}
      className="flex h-full flex-col border border-mineral bg-eclipse"
    >
      <header className="border-b border-mineral p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className={`${eyebrow} text-plasma`}>{offer.badge}</span>
          <span className={`${eyebrow} text-ion-2`}>Door 2 · Single slate</span>
        </div>
        <h3 className="mt-3 font-display text-2xl text-ion-white sm:text-3xl">
          {offer.title}
        </h3>
        <p className="mt-2 text-sm leading-6 text-ion-1">{offer.subtitle}</p>
      </header>

      <div className="flex flex-1 flex-col p-6">
        {/* Tier selector */}
        <div role="group" aria-label={`Choose a tier for ${offer.title}`} className="grid grid-cols-2 gap-2">
          <button
            type="button"
            aria-pressed={tier === "standard"}
            onClick={() => setTier("standard")}
            className={`border px-3 py-3 text-left transition-colors ${
              tier === "standard"
                ? "border-plasma bg-obsidian text-ion-white"
                : "border-mineral bg-transparent text-ion-2 hover:border-mineral-hi"
            }`}
          >
            <span className={`${eyebrow} block`}>Standard</span>
            <span className="mt-1 block font-numerals text-xl tabular-nums">
              ${(offer.standardPriceCents / 100).toFixed(0)}
            </span>
          </button>
          <button
            type="button"
            aria-pressed={tier === "credit-back"}
            onClick={() => setTier("credit-back")}
            className={`border px-3 py-3 text-left transition-colors ${
              tier === "credit-back"
                ? "border-plasma bg-obsidian text-ion-white"
                : "border-mineral bg-transparent text-ion-2 hover:border-mineral-hi"
            }`}
          >
            <span className={`${eyebrow} block`}>Credit-Back</span>
            <span className="mt-1 block font-numerals text-xl tabular-nums">
              ${(offer.creditBackPriceCents / 100).toFixed(0)}
            </span>
          </button>
        </div>

        {/* Plain-language protection terms */}
        <div className="mt-4 border border-mineral bg-obsidian p-4">
          <p className={`${eyebrow} text-ion-white`}>Store-credit protection · credit-back tier</p>
          <p className="mt-2 text-sm leading-6 text-ion-1">{offer.protectionCopy}</p>
        </div>

        {/* What's inside */}
        <div className="mt-5">
          <p className={`${eyebrow} text-ion-2`}>What&apos;s inside</p>
          <ul className="mt-2 space-y-1.5 text-sm leading-6 text-ion-1">
            {offer.highlights.map((h) => (
              <li key={h} className="flex gap-2.5">
                <span aria-hidden className="text-plasma">-</span>
                {h}
              </li>
            ))}
          </ul>
        </div>

        {/* PASS-only state: free transparent reasoning (current live state) */}
        {!gate.checkoutEnabled && <PassReasoningPanel slateLabel={slateLabel} />}

        <div className="mt-6 flex-1" />

        {/* Price + action */}
        <div className="border-t border-mineral pt-5">
          <div className="flex items-baseline justify-between gap-3">
            <span className={`${eyebrow} text-ion-2`}>
              One-time · {tier === "credit-back" ? "credit-back tier" : "standard tier"}
            </span>
            <span className="font-numerals text-3xl font-semibold tabular-nums text-ion-white">
              ${(priceCents / 100).toFixed(0)}
            </span>
          </div>

          <button
            type="button"
            disabled={!checkoutOpen || state === "loading"}
            onClick={() =>
              startCheckout({ packageSlug: offer.slug, creditBack: tier === "credit-back" })
            }
            className={`mt-4 w-full px-5 py-3.5 font-numerals text-sm uppercase tracking-[0.18em] transition-colors ${
              checkoutOpen
                ? "bg-plasma text-plasma-ink hover:bg-plasma-glow"
                : "cursor-not-allowed border border-mineral bg-transparent text-ion-2"
            }`}
          >
            {state === "loading"
              ? "Opening checkout…"
              : checkoutOpen
                ? `Get ${offer.title} · $${(priceCents / 100).toFixed(0)}`
                : "Checkout closed"}
          </button>

          {!gate.checkoutEnabled ? (
            <DisabledNote>
              No official play has cleared the five-stage check for this slate, so there is
              nothing to sell yet. The pass reasoning above is free. Checkout opens on its
              own when a play clears - no charge until then.
            </DisabledNote>
          ) : !tierConfigured ? (
            <DisabledNote>
              Checkout for this tier is not open yet: our payment provider is still being
              set up. Nothing has been charged.
            </DisabledNote>
          ) : null}

          {state === "error" && message && (
            <p role="alert" className="mt-3 text-sm leading-6 text-plasma-glow">
              {message}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

// ---------------------------------------------------------------------------
// Door 1 - Season Membership plan buttons
// ---------------------------------------------------------------------------

export interface MembershipPlansProps {
  gate: Stage5GateStatus;
  availability: Readonly<Record<MembershipPlanId, boolean>>;
}

export function MembershipPlans({ gate, availability }: MembershipPlansProps) {
  const { state, message, startCheckout } = useWhopCheckout();
  const [activePlan, setActivePlan] = useState<MembershipPlanId | null>(null);

  return (
    <div>
      <div className="grid gap-2 sm:grid-cols-3">
        {MEMBERSHIP_PLANS.map((plan) => {
          const configured = availability[plan.id];
          const enabled = gate.checkoutEnabled && configured;
          const isFounding = plan.id === "founding-monthly";
          return (
            <button
              key={plan.id}
              type="button"
              disabled={!enabled || state === "loading"}
              onClick={() => {
                setActivePlan(plan.id);
                startCheckout({ packageSlug: "season-membership", plan: plan.id });
              }}
              className={`border px-4 py-4 text-left transition-colors ${
                enabled
                  ? isFounding
                    ? "border-plasma bg-plasma text-plasma-ink hover:bg-plasma-glow"
                    : "border-mineral-hi bg-obsidian text-ion-white hover:border-plasma"
                  : "cursor-not-allowed border-mineral bg-transparent text-ion-2"
              }`}
            >
              <span className={`${eyebrow} block ${enabled && isFounding ? "text-plasma-ink" : ""}`}>
                {plan.id === "founding-monthly"
                  ? "Founding rate"
                  : plan.id === "standard-monthly"
                    ? "Standard rate"
                    : "One-time"}
              </span>
              <span className="mt-1.5 block font-numerals text-2xl font-semibold tabular-nums">
                ${(plan.priceCents / 100).toFixed(2).replace(/\.00$/, "")}
                {plan.cadence === "monthly" && (
                  <span className="text-sm font-normal">/mo</span>
                )}
              </span>
              <span className="mt-1 block text-xs leading-5 opacity-80">
                {plan.id === "founding-monthly"
                  ? FOUNDING_SEAT_COPY
                  : plan.id === "standard-monthly"
                    ? "After the first 100 members"
                    : "Rest of season + playoffs"}
              </span>
              {state === "loading" && activePlan === plan.id && (
                <span className="mt-1 block text-xs">Opening checkout…</span>
              )}
            </button>
          );
        })}
      </div>

      {!gate.checkoutEnabled ? (
        <DisabledNote>
          Membership checkout is closed while no official play has cleared the five-stage
          check. We will not take your money for a slate we are passing on. The founding
          rate is held for the first 100 members once checkout opens.
        </DisabledNote>
      ) : (
        <DisabledNote>
          {Object.values(availability).some(Boolean)
            ? "Plans without an open button are still being set up with our payment provider. Nothing has been charged."
            : "Checkout is not open yet: our payment provider is still being set up. Nothing has been charged."}
        </DisabledNote>
      )}

      {state === "error" && message && (
        <p role="alert" className="mt-3 text-sm leading-6 text-plasma-glow">
          {message}
        </p>
      )}
    </div>
  );
}