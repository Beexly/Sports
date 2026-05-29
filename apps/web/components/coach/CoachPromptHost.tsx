"use client";

/**
 * CoachPromptHost — single entry point for all Decision Coach prompts.
 *
 * Every prompt is checked against checkBoundaries() before any response
 * is shown — even though responses are canned while COACH_LIVE_AI_ENABLED
 * is false. This ensures the boundary pipeline is load-bearing from day one.
 *
 * Env gate: NEXT_PUBLIC_COACH_LIVE_AI_ENABLED (defaults false).
 * When true, this component will be extended to call the AI route.
 * Only this component needs to change — all surfaces are already wired.
 */

import { useState } from "react";
import { checkBoundaries } from "@/lib/ai-governance/assistant-boundaries";
import { getPromptsForSurface } from "@/lib/coach/prompts";
import { getCannedResponse } from "@/lib/coach/canned-responses";
import type { CoachSurface } from "@/lib/coach/prompts";

interface Props {
  surface: CoachSurface;
  className?: string;
}

const LIVE_AI_ENABLED =
  process.env.NEXT_PUBLIC_COACH_LIVE_AI_ENABLED === "true";

export function CoachPromptHost({ surface, className = "" }: Props) {
  const prompts = getPromptsForSurface(surface);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(false);

  function handleSelect(promptId: string) {
    const prompt = prompts.find((p) => p.id === promptId);
    if (!prompt) return;

    const check = checkBoundaries("decision-coach", prompt.question);
    if (!check.allowed) {
      setBlocked(true);
      setActiveId(null);
      return;
    }

    setBlocked(false);
    setActiveId(promptId);
  }

  const activePrompt = activeId ? prompts.find((p) => p.id === activeId) : null;
  const response = activeId ? getCannedResponse(surface, activeId) : null;

  return (
    <div
      className={["rounded-2xl border border-mineral bg-gray-900/60 p-5", className].join(" ")}
      aria-label="Decision Coach"
    >
      <div className="mb-3 flex items-center gap-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-gray-500">
          Decision Coach
        </p>
        {LIVE_AI_ENABLED && (
          <span className="rounded-full bg-emerald-900/60 px-2 py-0.5 font-mono text-[8px] uppercase tracking-widest text-emerald-400">
            Live AI
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {prompts.map((p) => (
          <button
            key={p.id}
            onClick={() => handleSelect(p.id)}
            aria-pressed={activeId === p.id}
            className={[
              "rounded-lg border px-3 py-1.5 font-mono text-[9px] uppercase tracking-widest transition-colors",
              activeId === p.id
                ? "border-accent-500 bg-accent-900/40 text-accent-300"
                : "border-mineral text-gray-400 hover:border-gray-600 hover:text-gray-300",
            ].join(" ")}
          >
            {p.label}
          </button>
        ))}
      </div>

      {blocked && (
        <p className="mt-3 rounded-lg border border-red-800/40 bg-red-900/20 p-3 font-mono text-[9px] uppercase tracking-widest text-red-400">
          This question falls outside allowed coach scope. See /responsible-play.
        </p>
      )}

      {activePrompt && response && (
        <div className="mt-4 space-y-2">
          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-gray-500">
            {activePrompt.label}
          </p>
          <p className="text-sm leading-relaxed text-gray-300">{response.body}</p>
          <p className="font-mono text-[8px] uppercase tracking-widest text-gray-600">
            {LIVE_AI_ENABLED ? "AI response" : "Methodology summary · not personalized advice"}
          </p>
        </div>
      )}
    </div>
  );
}
