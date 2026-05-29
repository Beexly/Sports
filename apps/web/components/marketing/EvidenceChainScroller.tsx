"use client";

import * as React from "react";
import Link from "next/link";

/**
 * Evidence Chain Scroller — replaces the static 'Four Stages' marketing
 * section with a scroll-revealed step sequence.
 *
 * Each stage is a server-rendered card that progressively reveals as it
 * scrolls into view. The reveal is opacity + translate-y only, gated
 * by IntersectionObserver. Reduced-motion users see all stages visible
 * immediately.
 */

interface Stage {
  readonly title: string;
  readonly headline: string;
  readonly body: string;
  readonly accent: string;
}

const STAGES: ReadonlyArray<Stage> = [
  {
    title: "Stage 01",
    headline: "Collect",
    body: "The model reads odds across multiple bookmakers, line movement, public consensus, and game context. Sources are labeled with freshness; stale data is gated.",
    accent: "text-ion-blue",
  },
  {
    title: "Stage 02",
    headline: "Score",
    body: "Ten factors feed a deterministic scoring function. Factor names are public; weights are protected. The model produces a confidence band and an edge index.",
    accent: "text-cyan-400",
  },
  {
    title: "Stage 03",
    headline: "Gate",
    body: "Picks below the publish threshold do not appear on the board. The gate is the no-bet doctrine made executable. Passes are logged to the public stream.",
    accent: "text-amber-400",
  },
  {
    title: "Stage 04",
    headline: "Settle",
    body: "When the game ends, the pick settles WIN, LOSS, or PUSH. The settled row joins the append-only canonical ledger. Calibration buckets update.",
    accent: "text-emerald-400",
  },
];

export function EvidenceChainScroller(): JSX.Element {
  const refs = React.useRef<Array<HTMLLIElement | null>>([]);
  const [revealed, setRevealed] = React.useState<boolean[]>(() => STAGES.map(() => false));
  const [reducedMotion, setReducedMotion] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const onChange = (event: MediaQueryListEvent) => setReducedMotion(event.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  React.useEffect(() => {
    if (reducedMotion) {
      setRevealed(STAGES.map(() => true));
      return;
    }
    const observers: IntersectionObserver[] = [];
    refs.current.forEach((el, idx) => {
      if (!el) return;
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setRevealed((prev) => {
                if (prev[idx]) return prev;
                const next = prev.slice();
                next[idx] = true;
                return next;
              });
            }
          });
        },
        { rootMargin: "0px 0px -10% 0px", threshold: 0.2 },
      );
      observer.observe(el);
      observers.push(observer);
    });
    return () => {
      observers.forEach((o) => o.disconnect());
    };
  }, [reducedMotion]);

  return (
    <section
      aria-label="The evidence chain"
      className="border-y border-mineral bg-gray-900/30 px-4 py-20 sm:px-6 lg:px-8"
    >
      <div className="mx-auto max-w-5xl">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-ion-blue">
          The evidence chain
        </p>
        <h2 className="mt-3 text-3xl font-black text-white sm:text-5xl">
          Four stages. One accountability loop.
        </h2>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-gray-400">
          Every published pick carries the entire chain — what was read, how it was scored, why it cleared the gate, and what happened when the game ended.
        </p>

        <ol className="mt-12 space-y-12">
          {STAGES.map((stage, i) => (
            <li
              key={stage.title}
              ref={(el) => {
                refs.current[i] = el;
              }}
              className={[
                "border-l-2 pl-6 transition-all duration-700 ease-out",
                stage.accent.replace("text-", "border-"),
                revealed[i] ? "translate-y-0 opacity-100" : "translate-y-3 opacity-30",
              ].join(" ")}
            >
              <p className={["font-mono text-[10px] uppercase tracking-[0.22em]", stage.accent].join(" ")}>
                {stage.title}
              </p>
              <h3 className="mt-2 text-2xl font-bold leading-tight text-white sm:text-3xl">
                {stage.headline}
              </h3>
              <p className="mt-4 max-w-2xl text-base leading-7 text-gray-400">{stage.body}</p>
            </li>
          ))}
        </ol>

        <div className="mt-14 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/methodology"
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-ion-blue px-6 text-sm font-bold text-carbon hover:opacity-90"
          >
            Read the methodology
          </Link>
          <Link
            href="/ledger/canonical"
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-gray-700 px-6 text-sm font-bold text-gray-200 hover:border-cyan-400 hover:text-cyan-100"
          >
            Open the canonical ledger
          </Link>
        </div>
      </div>
    </section>
  );
}
