"use client";

import { useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { track } from "@/lib/analytics/events";

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

/**
 * Per-click checkout-intent id, with a fallback.
 *
 * `crypto.randomUUID()` is only exposed in a SECURE CONTEXT and only from
 * Safari 15.4+. Calling it unguarded here meant that on WebKit without a secure
 * context — and on older iOS — it threw a TypeError that the surrounding
 * try/catch swallowed into "Network blip. Check your connection and retry."
 * The checkout POST was never sent, so the user simply could not subscribe and
 * the error message pointed them at their own network. Caught 2026-08-16 by the
 * newly-added WebKit/mobile e2e projects; the desktop-Chrome suite passed it.
 *
 * This mirrors the guard the codebase already uses elsewhere
 * (`lib/ai-control-plane/budget.ts:449`, `credit-admission.ts:349`) — this call
 * site was the only unguarded browser-side one.
 *
 * The id is only a per-visit "same click retried" hint; the server owns the
 * durable CheckoutAttempt and 409s on any mismatch.
 *
 * C-31 fix 5: the original fallback minted a NON-UUID `ci_...` id, but the
 * server's CLIENT_INTENT_ID_RE is UUID-only, so it 400ed every request from a
 * browser lacking randomUUID — turning a swallowed TypeError into a hard
 * checkout failure for exactly the same users. Returns null now; the caller
 * omits the field and the server's token-less branch takes over.
 */
export function newIntentId(): string | null {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  // No randomUUID (Safari < 15.4, older Chrome, any insecure context). The
  // previous `ci_...` fallback was NOT a UUID, and the server's
  // CLIENT_INTENT_ID_RE accepts UUIDs only — so every such browser hard-400ed
  // and could never check out at all. Return null and omit the field instead:
  // createCheckoutAttempt already has a token-less branch that mints its own
  // intent. Widening the server regex would be the wrong fix — it would let a
  // low-entropy client id become a durable idempotency token.
  return null;
}

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
  const intentRef = useRef<{ key: string; id: string | null } | null>(null);

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
    // Intent signal — the user committed to moving up a tier (before the
    // network round-trip). Inert no-op until a provider is wired.
    track("upgrade_cta_click", { tier, interval });
    try {
      const intentKey = `${tier}:${interval}`;
      if (!intentRef.current || intentRef.current.key !== intentKey) {
        intentRef.current = { key: intentKey, id: newIntentId() };
      }
      const intentId = intentRef.current.id;
      // Checkout attempt initiated — the durable CheckoutAttempt is about to be
      // minted server-side. Inert no-op until a provider is wired.
      track("checkout_start", { tier, interval });
      const res = await fetch("/api/subscriptions/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Omit clientIntentId entirely when the browser has no randomUUID —
        // sending null/a non-UUID is a 400. The server then treats this as a
        // token-less request and mints its own durable intent.
        body: JSON.stringify({
          tier,
          interval,
          ...(intentId !== null ? { clientIntentId: intentId } : {}),
        }),
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
          className="rounded-lg border border-alert/60 bg-alert/10 px-3 py-2 text-xs text-alert"
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
