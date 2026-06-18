"use client";

import { useState } from "react";
import {
  askJarvis,
  JARVIS_QUESTIONS,
  JARVIS_INTENT_ORDER,
  JARVIS_INTENT_GROUPS,
  JARVIS_GROUP_LABELS,
  type JarvisIntentGroup,
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
      className="overflow-hidden rounded-2xl border border-titanium/50 bg-carbon/80"
    >
      {/* Terminal chrome */}
      <div className="flex items-center justify-between border-b border-titanium/40 px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-red-700/50" />
            <div className="h-2.5 w-2.5 rounded-full bg-yellow-700/50" />
            <div className="h-2.5 w-2.5 rounded-full bg-green-700/50" />
          </div>
          <span className="font-mono text-[10px] text-ion-3">
            <span className="text-accent-500">jarvis</span>
            <span className="text-ion-2">@gse</span>
            <span className="text-ion-3"> — ask</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <p className="hidden text-[9px] uppercase tracking-widest text-ion-3 sm:block">
            Deterministic · No model call · Grounded in live state
          </p>
          {active && (
            <button
              onClick={() => { setActive(null); setAnswer(null); }}
              className="font-mono text-[9px] text-ion-3 transition-colors hover:text-ion"
            >
              esc
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2">
        {/* Command list */}
        <div className="border-b border-titanium/30 p-4 lg:border-b-0 lg:border-r">
          <p className="mb-3 font-mono text-[10px] text-ion-3">
            <span className="text-accent-500">$</span>{" "}
            <span className="text-ion-white">ask</span>
            {!active && (
              <span className="ml-0.5 inline-block h-3 w-0.5 animate-cursor-blink bg-accent-500 align-middle" />
            )}
          </p>

          <div className="space-y-3">
            {(Object.keys(JARVIS_INTENT_GROUPS) as JarvisIntentGroup[]).map((group) => (
              <div key={group}>
                <p className="mb-1 px-3 font-mono text-[8px] font-bold uppercase tracking-widest text-ion-3">
                  {JARVIS_GROUP_LABELS[group]}
                </p>
                <div className="space-y-0.5">
                  {JARVIS_INTENT_GROUPS[group].map((intent) => (
                    <button
                      key={intent}
                      onClick={() => handleSelect(intent)}
                      data-testid={`ask-jarvis-btn-${intent}`}
                      className={[
                        "flex w-full items-center gap-3 rounded-lg border-l-2 px-3 py-2 text-left transition-all",
                        active === intent
                          ? "border-plasma bg-plasma/10"
                          : "border-transparent hover:bg-titanium/40",
                      ].join(" ")}
                    >
                      <span className="w-5 flex-shrink-0 font-mono text-[9px] tabular-nums text-ion-3">
                        {String(JARVIS_INTENT_ORDER.indexOf(intent) + 1).padStart(2, "0")}
                      </span>
                      <span
                        className={[
                          "flex-1 text-[11px] transition-colors",
                          active === intent ? "text-ion-white" : "text-ion-2",
                        ].join(" ")}
                      >
                        {JARVIS_QUESTIONS[intent]}
                      </span>
                      {active === intent && (
                        <span className="flex-shrink-0 text-[10px] text-plasma">▶</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Answer pane */}
        <div className="p-4">
          {answer ? (
            <div
              data-testid="ask-jarvis-answer"
              className="animate-fade-up"
            >
              <p className="mb-2 font-mono text-[9px] uppercase tracking-widest text-accent-500">
                {answer.question}
              </p>

              <p className="mb-4 text-sm leading-relaxed text-ion-white">
                {answer.answer}
              </p>

              {answer.supportingState.length > 0 && (
                <div className="mb-3 rounded-lg border border-titanium/40 bg-obsidian/60 p-3">
                  <ul className="space-y-0.5">
                    {answer.supportingState.map((s, idx) => (
                      <li key={idx} className="font-mono text-[9px] text-ion-2">
                        <span className="select-none text-ion-3">· </span>{s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex items-center gap-3">
                <span className="text-[9px] text-ion-3">
                  confidence{" "}
                  <span
                    className={
                      answer.confidence === "HIGH"
                        ? "text-accent-500"
                        : answer.confidence === "MEDIUM"
                          ? "text-yellow-300"
                          : "text-ion-2"
                    }
                  >
                    {answer.confidence}
                  </span>
                </span>
              </div>

              {answer.caveat && (
                <p className="mt-3 text-[9px] italic leading-relaxed text-ion-3">
                  {answer.caveat}
                </p>
              )}

              {answer.nextAction && (
                <div className="mt-3 rounded-lg border border-titanium/40 bg-obsidian/40 px-3 py-2">
                  <p className="mb-0.5 font-mono text-[8px] uppercase tracking-widest text-ion-3">
                    next_action
                  </p>
                  <p className="text-[10px] leading-snug text-ion-white">{answer.nextAction}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex min-h-48 flex-col justify-between">
              <div className="flex flex-1 items-center justify-center">
                <div className="text-center">
                  <p className="font-mono text-[10px] text-ion-3">
                    <span className="text-accent-500">$</span>{" "}
                    <span className="text-ion-white">jarvis ask</span>
                    <span className="ml-0.5 inline-block h-3 w-0.5 animate-cursor-blink bg-accent-500 align-middle" />
                  </p>
                  <p className="mt-2 text-[9px] text-ion-3">
                    Select a question to query Jarvis
                  </p>
                  <p className="mt-0.5 text-[9px] text-ion-3">
                    All answers derived from live operator state
                  </p>
                </div>
              </div>

              {/* Quick command chips */}
              <div className="mt-4 flex flex-wrap gap-1.5">
                {(["picks", "launch-ready", "what-is-wired"] as const).map((intent) => (
                  <button
                    key={intent}
                    onClick={() => handleSelect(intent)}
                    className="rounded-full border border-titanium/50 bg-obsidian/60 px-3 py-1 font-mono text-[8px] text-ion-2 transition-all hover:border-plasma/40 hover:bg-plasma/10 hover:text-plasma"
                  >
                    {JARVIS_QUESTIONS[intent]}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
