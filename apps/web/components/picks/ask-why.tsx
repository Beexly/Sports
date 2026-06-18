"use client";

import { useState } from "react";
import {
  EXPLAIN_REGISTERS,
  EXPLAIN_REGISTER_LABELS,
  type ExplainRegister,
} from "@/lib/pick-explainer/prompts";
import { useReaderRegister } from "@/lib/reader-register/use-reader-register";

/**
 * "Ask the model why" — a PRO+ glass-box control. POSTs to
 * /api/picks/[id]/explain and renders the strictly-grounded, policy-validated
 * explanation of why the engine surfaced this pick.
 *
 * Reader registers (NFL House doctrine): the same grounded answer renders for
 * three audiences — "Teach me" (beginner), "Plain read" (default), "Show me
 * the math" (analyst). Same data, different doorway. The choice persists so
 * the whole product meets the reader where they are.
 */

export function AskWhy({ pickId }: { pickId: string }) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [text, setText] = useState<string>("");
  const [register, setRegister] = useReaderRegister();

  async function ask(nextRegister: ExplainRegister) {
    setState("loading");
    try {
      const res = await fetch(`/api/picks/${pickId}/explain`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ register: nextRegister }),
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

  function selectRegister(next: ExplainRegister) {
    setRegister(next);
    // Re-read in the new register if an answer is already on screen.
    if (state === "done") void ask(next);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <div
          role="group"
          aria-label="Explanation depth"
          className="flex w-fit overflow-hidden rounded-full border border-white/[0.08] bg-white/[0.04]/60"
        >
          {EXPLAIN_REGISTERS.map((r) => (
            <button
              key={r}
              type="button"
              aria-pressed={register === r}
              onClick={() => selectRegister(r)}
              disabled={state === "loading"}
              className={[
                "px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide transition disabled:opacity-60",
                register === r
                  ? "bg-orbital-cyan/15 text-orbital-cyan"
                  : "text-ink-400 hover:text-ink-300",
              ].join(" ")}
            >
              {EXPLAIN_REGISTER_LABELS[r]}
            </button>
          ))}
        </div>

        {state !== "done" && (
          <button
            type="button"
            onClick={() => void ask(register)}
            disabled={state === "loading"}
            className="w-fit rounded-full border border-orbital-cyan/40 bg-orbital-cyan/10 px-3 py-1 text-[11px] font-medium tracking-wide text-orbital-cyan transition hover:bg-orbital-cyan/20 disabled:opacity-60"
          >
            {state === "loading" ? "Reading the factors…" : "Ask the model why"}
          </button>
        )}
      </div>

      {(state === "done" || state === "error") && (
        <div
          data-testid="ask-why-result"
          className={[
            "rounded-lg border p-3 text-[11px] leading-relaxed",
            state === "done"
              ? "border-white/[0.08]/60 bg-white/[0.03] text-ink-300"
              : "border-alert/30 bg-alert/5 text-ink-300",
          ].join(" ")}
        >
          <p className="whitespace-pre-wrap">{text}</p>
          {state === "done" && (
            <p className="mt-2 text-[9px] uppercase tracking-wide text-ink-500">
              Grounded only in this pick&apos;s stored factors &amp; signal snapshot.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
