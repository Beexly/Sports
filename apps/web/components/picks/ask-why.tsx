"use client";

import { useState } from "react";

/**
 * "Ask the model why" — a PRO+ glass-box control. POSTs to
 * /api/picks/[id]/explain and renders the strictly-grounded, policy-validated
 * explanation of why the engine surfaced this pick. The server enforces tier,
 * grounding, and output policy; this is the thin client surface.
 */
export function AskWhy({ pickId }: { pickId: string }) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [text, setText] = useState<string>("");

  async function ask() {
    setState("loading");
    try {
      const res = await fetch(`/api/picks/${pickId}/explain`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = (await res.json().catch(() => ({}))) as {
        explanation?: string;
        error?: string;
      };
      if (res.ok && data.explanation) {
        setText(data.explanation);
        setState("done");
      } else {
        setText(
          data.error ??
            "The explainer is unavailable right now. The factor breakdown and evidence audit remain available.",
        );
        setState("error");
      }
    } catch {
      setText("Network error — try again.");
      setState("error");
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {state !== "done" && (
        <button
          type="button"
          onClick={ask}
          disabled={state === "loading"}
          className="w-fit rounded-full border border-ion-blue/40 bg-ion-blue/10 px-3 py-1 text-[11px] font-medium tracking-wide text-ion-blue transition hover:bg-ion-blue/20 disabled:opacity-60"
        >
          {state === "loading" ? "Reading the factors…" : "Ask the model why"}
        </button>
      )}
      {(state === "done" || state === "error") && (
        <div
          data-testid="ask-why-result"
          className={[
            "rounded-lg border p-3 text-[11px] leading-relaxed",
            state === "done"
              ? "border-gray-800/60 bg-gray-950/40 text-gray-300"
              : "border-alert/30 bg-alert/5 text-gray-400",
          ].join(" ")}
        >
          <p className="whitespace-pre-wrap">{text}</p>
          {state === "done" && (
            <p className="mt-2 text-[9px] uppercase tracking-wide text-gray-600">
              Grounded only in this pick&apos;s stored factors &amp; signal snapshot.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
