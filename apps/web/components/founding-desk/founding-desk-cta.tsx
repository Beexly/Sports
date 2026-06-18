"use client";

/**
 * FoundingDeskCta — the primary CTA for /founding-desk.
 *
 * POSTs to /api/subscriptions/checkout with { tier: "FOUNDING_DESK", interval: "month" }.
 *
 * When the Stripe price ID is not yet configured the route returns a 503 with
 * { error: "...not configured yet." }. In that case — and on any other non-OK
 * response — we show an HONEST inert state: "The Founding Desk opens soon —
 * see a sample" linking to /sample-desk. We NEVER show a fake success state.
 *
 * Events fired:
 *   - checkout_started  (on button click, before the fetch)
 *   - pricing_interest_clicked  (same click — records the intent signal)
 */

import { useState } from "react";
import Link from "next/link";
import { track } from "@/lib/analytics/events";
import { BRAND_COLORS } from "@/lib/brand";

type State = "idle" | "loading" | "redirecting" | "inert";

interface FoundingDeskCtaProps {
  /** Display price shown on the button (sourced from FOUNDING_DESK_OFFER in the server page). */
  displayPrice: number;
  /** Short label for the beta offer (e.g. "14-day Founding Desk beta"). */
  offerLabel: string;
}

export function FoundingDeskCta({ displayPrice, offerLabel }: FoundingDeskCtaProps) {
  const [state, setState] = useState<State>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleClick() {
    if (state === "loading" || state === "redirecting") return;

    track("checkout_started", { tier: "FOUNDING_DESK" });
    track("pricing_interest_clicked");

    setState("loading");
    setErrorMsg(null);

    try {
      const res = await fetch("/api/subscriptions/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: "FOUNDING_DESK", interval: "month" }),
      });

      const data = (await res.json()) as { url?: string; error?: string };

      if (!res.ok) {
        // 503 = not configured yet; any non-ok = honest inert state
        setState("inert");
        setErrorMsg(data.error ?? null);
        return;
      }

      if (!data.url) {
        setState("inert");
        return;
      }

      setState("redirecting");
      window.location.href = data.url;
    } catch {
      setState("inert");
      setErrorMsg(null);
    }
  }

  if (state === "inert") {
    return (
      <div className="flex flex-col items-start gap-3">
        <p
          className="rounded-xl border px-5 py-3 text-sm leading-relaxed"
          style={{
            borderColor: `${BRAND_COLORS.orbitalCyan}30`,
            background: `${BRAND_COLORS.orbitalCyan}08`,
            color: BRAND_COLORS.ionWhite,
          }}
          role="status"
        >
          The Founding Desk opens soon.{" "}
          <Link
            href="/sample-desk"
            className="font-semibold underline underline-offset-4"
            style={{ color: BRAND_COLORS.orbitalCyan }}
          >
            See a sample brief first
          </Link>{" "}
          to understand what you would receive.
        </p>
        {errorMsg && (
          <p className="text-xs" style={{ color: "rgba(246,247,250,0.45)" }}>
            {errorMsg}
          </p>
        )}
      </div>
    );
  }

  const isLoading = state === "loading" || state === "redirecting";

  return (
    <div className="flex flex-col items-start gap-3">
      <button
        onClick={handleClick}
        disabled={isLoading}
        className="btn btn-primary min-h-11"
        style={{ minWidth: 220, opacity: isLoading ? 0.7 : 1 }}
        aria-label={`Join the Founding Desk — $${displayPrice} for ${offerLabel}`}
      >
        {isLoading
          ? state === "redirecting"
            ? "Opening checkout…"
            : "Checking…"
          : `Join the Founding Desk — $${displayPrice}`}
      </button>
      <p className="text-xs" style={{ color: "rgba(246,247,250,0.5)" }}>
        {offerLabel}. Founding price, held for the life of your membership.
      </p>
    </div>
  );
}
