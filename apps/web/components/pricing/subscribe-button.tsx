"use client";

import { useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

/**
 * Subscribe button — isolates the Stripe checkout side-effect so the
 * /pricing page itself can stay server-rendered (SEO-critical surface).
 *
 * The button:
 *  - POSTs to /api/subscriptions/checkout with the requested tier
 *  - If unauthenticated (401), redirects to sign-in with callback back to /pricing
 *  - On success, redirects the window to Stripe Checkout
 *  - Renders friendly founder-voice errors with a recovery hint
 *
 * Directly beneath the CTA it renders a proximate recurring-billing disclosure
 * (FTC ROSCA + state auto-renewal-law compliance): the plan is a recurring
 * subscription that auto-renews at the stated price/interval until cancelled,
 * cancellable anytime, with a link to /terms. The price is never hardcoded — it
 * comes from the pricing-phases single source via the `priceMonthly`/`priceAnnual`
 * props the server page already derives. Stripe Checkout also collects an
 * affirmative Terms consent (see lib/stripe.ts).
 */

type Tier = "FANTASY" | "PRO" | "ELITE";
type Interval = "month" | "year";

type Props = {
  tier: Tier;
  label: string;
  variant: "primary" | "ghost";
  interval?: Interval;
  /** Recurring monthly price (USD) from the current pricing phase. */
  priceMonthly?: number | null;
  /** Annual price (USD) from the current pricing phase. */
  priceAnnual?: number | null;
};

const PRIMARY_CLASSES =
  "w-full rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-500 disabled:cursor-not-allowed disabled:opacity-60";
const GHOST_CLASSES =
  "w-full rounded-xl border border-ultraviolet/60 bg-ultraviolet/10 py-2.5 text-sm font-semibold text-ultraviolet-glow transition-colors hover:bg-ultraviolet/25 disabled:cursor-not-allowed disabled:opacity-60";

export function SubscribeButton({
  tier,
  label,
  variant,
  interval = "month",
  priceMonthly = null,
  priceAnnual = null,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Unique id so assistive tech can announce the recurring-billing disclosure as
  // the button's description (aria-describedby). useId keeps it unique even when
  // several SubscribeButtons render on the same /pricing page.
  const disclosureId = useId();
  // Per-visit checkout-intent HINT (Phase 1P). The server owns the durable
  // CheckoutAttempt — this UUID only lets it recognize "same click retried"
  // (double-click, network blip, reload-and-retry within this mount) and hand
  // back the same Stripe session. Keyed by (tier, interval) so a surviving
  // component whose plan/interval props change NEVER reuses an intent id with
  // different Stripe parameters (the server would 409 that anyway).
  const intentRef = useRef<{ key: string; id: string } | null>(null);

  // Interval-appropriate recurring amount, pulled from the pricing-phases source
  // (never hardcoded). Falls back to the amount shown on the plan if a price prop
  // was not passed, so the disclosure is always honest and never invents a number.
  const renewAmount = interval === "year" ? priceAnnual : priceMonthly;
  const renewUnit = interval === "year" ? "year" : "month";
  const renewPricePhrase =
    renewAmount != null ? `$${renewAmount}/${renewUnit}` : `the ${renewUnit}ly price shown`;

  async function handleClick() {
    setError(null);
    setLoading(true);
    try {
      const intentKey = `${tier}:${interval}`;
      if (!intentRef.current || intentRef.current.key !== intentKey) {
        intentRef.current = { key: intentKey, id: crypto.randomUUID() };
      }
      const res = await fetch("/api/subscriptions/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier, interval, clientIntentId: intentRef.current.id }),
      });

      if (res.status === 401) {
        router.push("/auth/signin?callbackUrl=/pricing");
        return;
      }

      const data = (await res.json()) as { url?: string; error?: string };

      if (!res.ok || !data.url) {
        setError(
          data.error ??
            "Checkout didn't open. Try again. If it sticks, contact hq@galaxysportsedge.com.",
        );
        return;
      }

      window.location.href = data.url;
    } catch {
      setError(
        "Network blip. Check your connection and retry.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        disabled={loading}
        aria-busy={loading}
        aria-describedby={disclosureId}
        onClick={handleClick}
        className={variant === "primary" ? PRIMARY_CLASSES : GHOST_CLASSES}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <Spinner />
            Redirecting to checkout…
          </span>
        ) : (
          label
        )}
      </button>

      {/* Proximate recurring-billing / auto-renewal disclosure (FTC ROSCA + state
          auto-renewal laws). Sits immediately beneath the CTA, before any charge. */}
      <p
        id={disclosureId}
        data-testid="auto-renew-disclosure"
        className="text-[11px] leading-relaxed text-ion-3"
      >
        Recurring subscription. Auto-renews at {renewPricePhrase} until you cancel.
        Cancel anytime.{" "}
        <Link href="/terms" className="underline hover:text-ion-2">
          Terms
        </Link>
        .
      </p>

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-red-800/60 bg-red-950/40 px-3 py-2 text-xs text-red-300"
        >
          {error}
        </p>
      )}
    </div>
  );
}

function Spinner() {
  return (
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
  );
}
