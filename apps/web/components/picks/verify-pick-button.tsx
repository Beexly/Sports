"use client";

import { useState } from "react";

interface VerifyPickButtonProps {
  readonly receiptHash: string | null;
}

type VerifyState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; frozenAt: string; modelVersion?: string }
  | { status: "error"; message: string };

export function VerifyPickButton({ receiptHash }: VerifyPickButtonProps): JSX.Element | null {
  const [state, setState] = useState<VerifyState>({ status: "idle" });
  const [expanded, setExpanded] = useState(false);

  if (!receiptHash) return null;

  const handleClick = async () => {
    if (state.status === "idle" || state.status === "error") {
      setExpanded(true);
      setState({ status: "loading" });
      try {
        const res = await fetch(`/api/verify?hash=${encodeURIComponent(receiptHash)}`);
        if (!res.ok) throw new Error(`Verification service returned ${res.status}`);
        const data = (await res.json()) as { found?: boolean; frozenAt?: string; modelVersion?: string; error?: string };
        if (!data.found) {
          setState({ status: "error", message: "Receipt not found." });
          return;
        }
        // No fabricated timestamps, ever: if the verify service does not
        // return the frozen-at time, report that honestly rather than
        // substituting "now" as if it were the commitment time.
        if (!data.frozenAt) {
          setState({
            status: "error",
            message: "Receipt found, but its committed timestamp was unavailable. Try again.",
          });
          return;
        }
        setState({
          status: "ready",
          frozenAt: data.frozenAt,
          modelVersion: data.modelVersion,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unable to verify right now.";
        setState({ status: "error", message });
      }
    } else {
      setExpanded(!expanded);
    }
  };

  return (
    <div className="w-full sm:w-auto">
      <button
        type="button"
        onClick={handleClick}
        aria-expanded={expanded}
        className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-full border border-mineral px-4 py-2 text-xs font-semibold text-ion-1 transition-colors hover:border-mineral-hi hover:text-ion-white sm:w-auto"
      >
        Verify this pick
      </button>

      {expanded && (
        <div className="mt-3 rounded-lg bg-carbon/60 p-3 text-xs text-ion-1">
          {state.status === "loading" && <p>Checking receipt integrity…</p>}

          {state.status === "ready" && (
            <>
              <p className="font-mono text-[10px] uppercase tracking-wider text-ion-2">Content hash</p>
              <p className="mt-1 break-all font-mono text-ion-1">{receiptHash}</p>

              <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-ion-2">Committed timestamp</p>
              <p className="mt-1 font-mono text-ion-1">
                {new Date(state.frozenAt).toLocaleString("en-US", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
            </>
          )}

          {state.status === "error" && (
            <p className="text-alert">{state.message}</p>
          )}
        </div>
      )}
    </div>
  );
}
