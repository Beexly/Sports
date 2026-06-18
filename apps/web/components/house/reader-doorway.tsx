"use client";

import { useEffect, useState } from "react";
import {
  DEFAULT_EXPLAIN_REGISTER,
  EXPLAIN_REGISTERS,
  EXPLAIN_REGISTER_LABELS,
  isExplainRegister,
  type ExplainRegister,
} from "@/lib/pick-explainer/prompts";

/**
 * The House doorway selector — "how should Galaxy speak to you?"
 *
 * Same data, different doorway (NFL House doctrine): the choice made here
 * sets the shared reader register that every explanation surface honors
 * (starting with "Ask the model why" on pick cards). Stored client-side
 * only — no account required, nothing tracked server-side.
 */

const REGISTER_STORAGE_KEY = "gse-reader-register";

const DOORWAY_DESCRIPTIONS: Record<ExplainRegister, string> = {
  teach:
    "New to markets or fantasy? Every term gets defined as it appears. Warm, steady, never condescending.",
  plain:
    "You know the basics. Straight reads, no filler, no jargon for its own sake.",
  math:
    "Factor weights, snapshot numbers, the quantitative skeleton. The desk shows its work.",
};

export function ReaderDoorway() {
  const [register, setRegister] = useState<ExplainRegister | null>(null);
  const [saved, setSaved] = useState(false);

  // Read after mount so SSR and the first client render agree.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(REGISTER_STORAGE_KEY);
      setRegister(isExplainRegister(raw) ? raw : DEFAULT_EXPLAIN_REGISTER);
    } catch {
      setRegister(DEFAULT_EXPLAIN_REGISTER);
    }
  }, []);

  function choose(next: ExplainRegister) {
    setRegister(next);
    setSaved(true);
    try {
      window.localStorage.setItem(REGISTER_STORAGE_KEY, next);
    } catch {
      // Private mode — the choice holds for this visit only.
    }
  }

  return (
    <div data-testid="reader-doorway">
      <div
        role="group"
        aria-label="How should Galaxy speak to you?"
        className="grid grid-cols-1 gap-3 sm:grid-cols-3"
      >
        {EXPLAIN_REGISTERS.map((r) => {
          const active = register === r;
          return (
            <button
              key={r}
              type="button"
              aria-pressed={active}
              onClick={() => choose(r)}
              className={[
                "rounded-2xl border p-5 text-left transition",
                active
                  ? "border-orbital-cyan/60 bg-orbital-cyan/10"
                  : "border-white/[0.08] bg-white/[0.04]/50 hover:border-white/[0.08]-hi hover:bg-white/[0.04]/80",
              ].join(" ")}
            >
              <span
                className={[
                  "font-display text-lg",
                  active ? "text-orbital-cyan" : "text-white",
                ].join(" ")}
              >
                {EXPLAIN_REGISTER_LABELS[r]}
              </span>
              <span className="mt-2 block text-sm leading-relaxed text-ink-300">
                {DOORWAY_DESCRIPTIONS[r]}
              </span>
            </button>
          );
        })}
      </div>
      <p
        aria-live="polite"
        className="mt-3 min-h-5 text-xs uppercase tracking-wider text-ink-400"
      >
        {saved
          ? "Saved on this device — explanations across Galaxy will meet you there."
          : "Stored on this device only. Change it any time, anywhere it appears."}
      </p>
    </div>
  );
}
