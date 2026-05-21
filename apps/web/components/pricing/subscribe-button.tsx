"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Subscribe button — isolates the Stripe checkout side-effect so the
 * /pricing page itself can stay server-rendered (SEO-critical surface).
 *
 * The button:
 *  - POSTs to /api/subscriptions/checkout with the requested tier
 *  - If unauthenticated (401), redirects to sign-in with callback back to /pricing
 *  - On success, redirects the window to Stripe Checkout
 *  - Renders friendly founder-voice errors with a recovery hint
 */

type Tier = "PRO" | "ELITE";

type Props = {
  tier: Tier;
  label: string;
  variant: "primary" | "ghost";
};

const PRIMARY_CLASSES =
  "w-full rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-500 disabled:cursor-not-allowed disabled:opacity-60";
const GHOST_CLASSES =
  "w-full rounded-xl border border-yellow-700/60 bg-yellow-900/20 py-2.5 text-sm font-semibold text-yellow-300 transition-colors hover:bg-yellow-900/40 disabled:cursor-not-allowed disabled:opacity-60";

export function SubscribeButton({ tier, label, variant }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/subscriptions/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });

      if (res.status === 401) {
        router.push("/auth/signin?callbackUrl=/pricing");
        return;
      }

      const data = (await res.json()) as { url?: string; error?: string };

      if (!res.ok || !data.url) {
        setError(
          data.error ??
            "Checkout didn't open. Try again — and if it sticks, email me at hq@galaxysportsedge.com.",
        );
        return;
      }

      window.location.href = data.url;
    } catch {
      setError(
        "Network blip on my end. Check your connection and retry.",
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
