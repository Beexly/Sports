"use client";

import * as React from "react";

export interface PressRStep {
  readonly key: string;
  readonly label: string;
  readonly score: number;
}

export interface PressRTheaterProps {
  readonly steps: ReadonlyArray<PressRStep>;
  readonly finalEdgeIndex: number | null;
  readonly finalConfidence: number | null;
}

/**
 * PressRTheater — press 'R' to watch the model decide.
 *
 * Cascades factor names + scores into view one at a time, then resolves
 * the final edge index and confidence. The 'live' feel is animation,
 * not network calls. Uses cached scoring data.
 *
 * Reduced-motion path: button reveals the entire step list and final
 * verdict instantly.
 */
export function PressRTheater({
  steps,
  finalEdgeIndex,
  finalConfidence,
}: PressRTheaterProps): JSX.Element {
  const [running, setRunning] = React.useState(false);
  const [shown, setShown] = React.useState(0);
  const [done, setDone] = React.useState(false);
  const [reducedMotion, setReducedMotion] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Global 'R' key
  React.useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key.toLowerCase() !== "r") return;
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || target?.isContentEditable) return;
      if (running) return;
      event.preventDefault();
      start();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  function start(): void {
    setShown(0);
    setDone(false);
    setRunning(true);
    if (reducedMotion) {
      setShown(steps.length);
      setDone(true);
      setRunning(false);
      return;
    }
    let i = 0;
    const tick = () => {
      i += 1;
      setShown(i);
      if (i < steps.length) {
        window.setTimeout(tick, 280);
      } else {
        window.setTimeout(() => {
          setDone(true);
          setRunning(false);
        }, 400);
      }
    };
    window.setTimeout(tick, 200);
  }

  return (
    <section
      aria-label="Watch the model decide"
      className="rounded-2xl border border-mineral bg-gray-900/55 p-6"
    >
      <div className="mb-5 flex items-baseline justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ion-blue">
            Watch the model decide
          </p>
          <h3 className="mt-1 text-xl font-bold text-white">Press &apos;R&apos; or tap the button.</h3>
        </div>
        <button
          type="button"
          onClick={start}
          disabled={running}
          className="inline-flex min-h-10 items-center justify-center rounded-lg bg-ion-blue px-5 text-sm font-bold text-carbon hover:opacity-90 disabled:opacity-50"
        >
          {running ? "Running…" : done ? "Run again" : "Run model"}
        </button>
      </div>

      <ol className="space-y-2">
        {steps.map((step, i) => (
          <li
            key={step.key}
            className={[
              "flex items-center justify-between border-b border-mineral/40 py-3 transition-all duration-300",
              i < shown ? "opacity-100 translate-y-0" : "opacity-30 -translate-y-1",
            ].join(" ")}
          >
            <span className="font-mono text-xs uppercase tracking-widest text-gray-400">
              {step.label}
            </span>
            <span className="font-mono text-sm font-semibold text-cyan-300 tabular-nums">
              {i < shown ? step.score : "—"}
            </span>
          </li>
        ))}
      </ol>

      <div
        className={[
          "mt-5 rounded-xl border p-5 transition-all duration-500",
          done ? "border-emerald-700/50 bg-emerald-950/20 opacity-100" : "border-mineral bg-carbon/60 opacity-40",
        ].join(" ")}
      >
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-emerald-400">
          Verdict
        </p>
        <div className="mt-2 flex flex-wrap items-baseline gap-6">
          <p className="text-sm text-gray-400">
            Edge index:{" "}
            <span className="font-mono text-2xl font-black text-white">
              {done ? (finalEdgeIndex ?? "—") : "…"}
            </span>
          </p>
          <p className="text-sm text-gray-400">
            Confidence:{" "}
            <span className="font-mono text-2xl font-black text-white">
              {done ? (finalConfidence ?? "—") : "…"}
            </span>
          </p>
        </div>
      </div>
    </section>
  );
}
