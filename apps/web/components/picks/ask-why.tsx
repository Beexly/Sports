"use client";

import { useState } from "react";
import {
  EXPLAIN_REGISTERS,
  EXPLAIN_REGISTER_LABELS,
  type ExplainRegister,
} from "@/lib/pick-explainer/prompts";
import { useReaderRegister } from "@/lib/reader-register/use-reader-register";

/**
 * "Why this pick?" — a PRO+ explainer control. POSTs to
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
            "The explainer is unavailable right now. The analysis and pick receipt are still available.",
        );
        setState("error");
      }
    } catch {
      setText("Network error. Try again.");
      setState("error");
    }
  }

  function selectRegister(next: ExplainRegister) {
    setRegister(next);
    // Re-read in the new register if an answer is already on screen.
    if (state === "done") void ask(next);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {state !== "done" && (
          <button
            type="button"
            onClick={() => void ask(register)}
            disabled={state === "loading"}
            aria-busy={state === "loading"}
            className="inline-flex min-h-11 w-fit items-center justify-center rounded-full border border-mineral px-4 py-2 text-xs font-semibold text-ion-1 transition-colors hover:border-mineral-hi hover:text-ion-white disabled:opacity-60"
          >
            {state === "loading" ? "Reading the factors…" : "Why this pick?"}
          </button>
        )}

        <div
          role="group"
          aria-label="Explanation depth"
          className="flex w-fit items-center gap-3"
        >
          {EXPLAIN_REGISTERS.map((r) => (
            <button
              key={r}
              type="button"
              aria-pressed={register === r}
              onClick={() => selectRegister(r)}
              disabled={state === "loading"}
              className={[
                "inline-flex min-h-11 items-center font-mono text-[10px] font-semibold uppercase tracking-[0.12em] underline-offset-[6px] transition-colors disabled:opacity-60",
                register === r
                  ? "text-ion-white underline decoration-ion-white"
                  : "text-ion-2 hover:text-ion-1",
              ].join(" ")}
            >
              {EXPLAIN_REGISTER_LABELS[r]}
            </button>
          ))}
        </div>
      </div>

      {(state === "done" || state === "error") && (
        <div
          data-testid="ask-why-result"
          aria-live="polite"
          className={[
            "border-l-2 pl-3 text-sm leading-6 text-ion-1",
            state === "done" ? "border-mineral-hi" : "border-alert/50",
          ].join(" ")}
        >
          <p className="whitespace-pre-wrap">{text}</p>
          {state === "done" && (
            <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-ion-2">
              Grounded only in this pick&apos;s stored factors &amp; signal snapshot.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
