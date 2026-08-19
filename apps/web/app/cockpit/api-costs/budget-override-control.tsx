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
      let payload: OverrideResponse;
      try {
        payload = (await response.json()) as OverrideResponse;
      } catch {
        setError(
          `Override response from /api/cockpit/api-costs/override was not JSON (HTTP ${response.status}). Check the route and try again.`,
        );
        return;
      }

      if (!response.ok || !payload.success) {
        setError(
          payload.message ??
            payload.error ??
            `Override update failed (HTTP ${response.status}). Add a reason ≥12 chars and retry.`,
        );
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
      <label className="text-[11px] font-semibold text-ion-2">
        Reason
        <input
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          className="mt-1 h-11 w-full rounded-md border border-titanium/40 bg-carbon/40 px-3 text-xs text-ion-white outline-none focus:border-caution/60"
          placeholder="Decision-log reason"
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void submitOverride(true)}
          disabled={!canSubmit || overrideActive}
          className="min-h-11 rounded-md border border-caution/40 px-3 text-xs font-semibold text-caution hover:bg-caution/30 disabled:border-titanium/40 disabled:text-ion-3"
        >
          Enable 24h
        </button>
        <button
          type="button"
          onClick={() => void submitOverride(false)}
          disabled={!canSubmit || !overrideActive}
          className="min-h-11 rounded-md border border-titanium/40 px-3 text-xs font-semibold text-ion-1 hover:bg-carbon/60 disabled:text-ion-3"
        >
          Disable
        </button>
      </div>
      {message ? <p className="text-[11px] text-verify">{message}</p> : null}
      {error ? <p className="text-[11px] text-alert">{error}</p> : null}
    </div>
  );
}
