"use client";

import { useState } from "react";
import {
  askJarvis,
  JARVIS_QUESTIONS,
  JARVIS_INTENT_ORDER,
  type JarvisIntent,
  type JarvisAnswer,
} from "@/lib/cockpit/ask-jarvis";
import type { OwnerSummary } from "@/lib/cockpit/owner-summary";

export function AskJarvisPanel({ summary }: { summary: OwnerSummary }) {
  const [active, setActive] = useState<JarvisIntent | null>(null);
  const [answer, setAnswer] = useState<JarvisAnswer | null>(null);

  function handleSelect(intent: JarvisIntent) {
    if (active === intent) {
      setActive(null);
      setAnswer(null);
      return;
    }
    setActive(intent);
    setAnswer(askJarvis(intent, summary));
  }

  return (
    <section
      data-testid="ask-jarvis-panel"
      className="rounded-2xl border border-gray-800 bg-gray-900/40 p-5"
    >
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400">
            Ask Jarvis
          </h2>
          <p className="mt-0.5 text-[11px] text-gray-600">
            Deterministic · No model call · Grounded in live state
          </p>
        </div>
        {active && (
          <button
            onClick={() => { setActive(null); setAnswer(null); }}
            className="text-[11px] text-gray-500 hover:text-gray-300"
          >
            Clear
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {JARVIS_INTENT_ORDER.map((intent) => (
          <button
            key={intent}
            onClick={() => handleSelect(intent)}
            data-testid={`ask-jarvis-btn-${intent}`}
            className={[
              "rounded-lg border px-3 py-1.5 text-[11px] font-medium transition-colors",
              active === intent
                ? "border-brand-700 bg-brand-900/40 text-brand-300"
                : "border-gray-700 bg-gray-900/60 text-gray-300 hover:border-gray-600 hover:bg-gray-800/60",
            ].join(" ")}
          >
            {JARVIS_QUESTIONS[intent]}
          </button>
        ))}
      </div>

      {answer && (
        <div
          data-testid="ask-jarvis-answer"
          className="mt-4 rounded-xl border border-gray-700/60 bg-gray-950/60 p-4"
        >
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">
            {answer.question}
          </p>

          <p className="mt-2 text-sm text-gray-100">{answer.answer}</p>

          {answer.supportingState.length > 0 && (
            <ul className="mt-3 space-y-0.5">
              {answer.supportingState.map((s, i) => (
                <li key={i} className="text-[11px] text-gray-400">
                  {s}
                </li>
              ))}
            </ul>
          )}

          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[10px]">
            <span className="text-gray-500">
              Confidence:{" "}
              <span
                className={
                  answer.confidence === "HIGH"
                    ? "text-green-400"
                    : answer.confidence === "MEDIUM"
                      ? "text-yellow-300"
                      : "text-gray-400"
                }
              >
                {answer.confidence}
              </span>
            </span>
          </div>

          {answer.caveat && (
            <p className="mt-2 text-[10px] italic text-gray-500">{answer.caveat}</p>
          )}

          {answer.nextAction && (
            <p className="mt-3 text-[11px] text-gray-300">
              <span className="font-semibold text-gray-400">Next action:</span>{" "}
              {answer.nextAction}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
