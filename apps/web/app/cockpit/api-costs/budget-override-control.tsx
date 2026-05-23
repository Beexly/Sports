"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { ClaudeApiSurface } from "@/lib/claude-api/cost-monitor";

interface BudgetOverrideControlProps {
  readonly surface: ClaudeApiSurface;
  readonly overrideActive: boolean;
}

interface OverrideResponse {
  readonly success?: boolean;
  readonly error?: string;
  readonly message?: string;
}

export function BudgetOverrideControl({
  surface,
  overrideActive,
}: BudgetOverrideControlProps): JSX.Element {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const canSubmit = reason.trim().length >= 12 && !isPending;

  async function submitOverride(nextOverrideActive: boolean): Promise<void> {
    if (!canSubmit) return;
    setMessage(null);
    setError(null);

    const overrideExpiresAt = nextOverrideActive
      ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      : null;

    try {
      const response = await fetch("/api/cockpit/api-costs/override", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          surface,
          overrideActive: nextOverrideActive,
          overrideExpiresAt,
          reason,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as OverrideResponse;

      if (!response.ok || !payload.success) {
        setError(payload.message ?? payload.error ?? "Override update failed.");
        return;
      }

      setReason("");
      setMessage(nextOverrideActive ? "Override enabled for 24 hours." : "Override disabled.");
      startTransition(() => router.refresh());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Override update failed.");
    }
  }

  return (
    <div className="flex min-w-[320px] flex-col gap-2">
      <label className="text-[11px] font-semibold text-gray-400">
        Reason
        <input
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          className="mt-1 h-11 w-full rounded-md border border-gray-800 bg-black/40 px-3 text-xs text-gray-100 outline-none focus:border-yellow-500/60"
          placeholder="Decision-log reason"
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void submitOverride(true)}
          disabled={!canSubmit || overrideActive}
          className="min-h-11 rounded-md border border-yellow-500/40 px-3 text-xs font-semibold text-yellow-100 hover:bg-yellow-950/30 disabled:border-gray-800 disabled:text-gray-600"
        >
          Enable 24h
        </button>
        <button
          type="button"
          onClick={() => void submitOverride(false)}
          disabled={!canSubmit || !overrideActive}
          className="min-h-11 rounded-md border border-gray-700 px-3 text-xs font-semibold text-gray-200 hover:bg-gray-900 disabled:text-gray-600"
        >
          Disable
        </button>
      </div>
      {message ? <p className="text-[11px] text-emerald-300">{message}</p> : null}
      {error ? <p className="text-[11px] text-rose-300">{error}</p> : null}
    </div>
  );
}
