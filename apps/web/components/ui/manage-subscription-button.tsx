"use client";

import { useState } from "react";
import { SUPPORT_EMAIL } from "@/lib/brand";

export function ManageSubscriptionButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/subscriptions/portal", { method: "POST" });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setError(
          data.error ??
            `Couldn't open the billing portal. Try again, or email ${SUPPORT_EMAIL} if it sticks.`,
        );
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Network blip. Check your connection and retry.");
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
        className="w-full rounded-xl border border-gray-700 bg-gray-800 py-2.5 text-sm font-semibold text-gray-200 transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? (
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
            Opening portal…
          </span>
        ) : (
          "Manage billing"
        )}
      </button>
      {error && (
        <p role="alert" className="text-xs text-red-400">{error}</p>
      )}
    </div>
  );
}
