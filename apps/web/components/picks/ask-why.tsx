"use client";

import { useState } from "react";

/**
 * "Ask the model why" — a PRO+ control. POSTs to /api/picks/[id]/explain and
 * renders the strictly-grounded, policy-validated read on why the engine
 * surfaced this pick. The server enforces the feature flag, tier, grounding,
 * and output policy; this is the thin client surface. Styled to match the
 * PickCard's gray palette.
 *
 * The endpoint is OFF by default (PICK_EXPLAINER_ENABLED) and inert without the
 * Claude key — in either case this control degrades to a calm, honest message
 * and never fabricates.
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
          "The explanation is unavailable right now. The signal and its grade remain on record below.",
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
          className="w-fit rounded-full border border-blue-700/50 bg-blue-900/30 px-3 py-1 text-[11px] font-medium tracking-wide text-blue-300 transition hover:bg-blue-900/50 disabled:opacity-60"
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
              : "border-red-900/40 bg-red-950/20 text-gray-300",
          ].join(" ")}
        >
          <p className="whitespace-pre-wrap">{text}</p>
          {state === "done" && (
            <p className="mt-2 text-[9px] uppercase tracking-wide text-gray-500">
              Grounded only in this pick&apos;s stored factors &amp; signal snapshot.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
