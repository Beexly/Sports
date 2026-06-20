"use client";

/**
 * GhostJarvis — The machine thinks out loud.
 *
 * An ambient AI presence that occasionally drops a thought into the
 * corner of the screen. Not a chatbot. Not interactive. A ghost.
 *
 * The ghost observes the current page context and emits insights,
 * contradictions, or observations in the brand voice. Each thought
 * fades in, holds for a few seconds, then dissolves.
 *
 * Triggered randomly every 45–120 seconds. Reduced motion → disabled.
 */

import { useEffect, useRef, useState } from "react";

const THOUGHTS = [
  "Three books just moved the line simultaneously. Not coincidence.",
  "That injury report is six hours old. The market hasn't priced the update.",
  "Public is 78% on the over. The gate is watching.",
  "Consensus engine split wide on this one. Width is information.",
  "The sharp money arrived fourteen minutes before the steam.",
  "I've seen this narrative before. It didn't end well.",
  "Two signals disagree. That's where the edge lives.",
  "The closing line is still drifting. Patience is a signal too.",
  "Freshness check failed on that source. Holding it back.",
  "Noise is loudest right before the gate closes.",
  "Correlation between those two legs: 0.71. Stacked fragility.",
  "The model is confident. The data is thin. The gate decides.",
  "I count twelve contradictory takes on this game. None sourced.",
  "Historical pattern match: 73% accuracy, 34 samples. Not enough to publish.",
  "The line moved but the context didn't. That's a trap, not an edge.",
] as const;

function randomRange(min: number, max: number) {
  return min + Math.random() * (max - min);
}

export function GhostJarvis() {
  const [thought, setThought] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const schedule = () => {
      const delay = randomRange(45000, 120000);
      timerRef.current = setTimeout(() => {
        const t = THOUGHTS[Math.floor(Math.random() * THOUGHTS.length)] ?? null;
        setThought(t);
        setVisible(true);

        setTimeout(() => setVisible(false), 6000);
        setTimeout(() => {
          setThought(null);
          schedule();
        }, 8000);
      }, delay);
    };

    schedule();
    return () => clearTimeout(timerRef.current);
  }, []);

  if (!thought) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed bottom-20 right-6 z-50 max-w-xs sm:bottom-24 sm:right-8"
    >
      <div
        className="rounded-lg border border-mineral/50 bg-eclipse/90 px-4 py-3 backdrop-blur-sm"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(12px)",
          transition: "opacity 1.2s ease-out, transform 1.2s ease-out",
          boxShadow: "0 0 20px rgba(0,229,255,0.06)",
        }}
      >
        <div className="flex items-center gap-2">
          <span
            className="h-1.5 w-1.5 rounded-full bg-orbital-cyan"
            style={{ animation: "pp-live-pulse 2s ease-in-out infinite" }}
          />
          <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-orbital-cyan">
            Jarvis
          </span>
        </div>
        <p className="mt-1.5 text-xs leading-5 text-ion-1">{thought}</p>
      </div>
    </div>
  );
}
