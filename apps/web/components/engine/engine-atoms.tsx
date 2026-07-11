"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The Sealed Engine's interactive atoms. Dependency-free, reduced-motion
 * safe, and honest by construction: they animate REAL numbers into view,
 * they never invent them. (prefers-reduced-motion renders final values
 * immediately — the data is the experience; the motion is garnish.)
 */

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

function useInView<T extends Element>(threshold = 0.4) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return { ref, inView };
}

/** A telemetry number that surges from 0 to its real value when scrolled into view. */
export function SurgeCount({
  value,
  className = "",
  durationMs = 1100,
}: {
  value: number;
  className?: string;
  durationMs?: number;
}) {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useInView<HTMLSpanElement>();
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (reduced || value === 0) {
      setShown(value);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / durationMs);
      // ease-out cubic: fast start, settling landing — a gauge, not a slot machine.
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(Math.round(eased * value));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, reduced, value, durationMs]);

  return (
    <span ref={ref} className={className} aria-label={String(value)}>
      {shown.toLocaleString("en-US")}
    </span>
  );
}

/**
 * A frozen hash that materializes character by character — the seal becoming
 * visible. The full hash is present in the DOM from the first paint for
 * copy/paste and screen readers; only the PAINT is staged.
 */
export function HashMaterialize({
  hash,
  className = "",
}: {
  hash: string;
  className?: string;
}) {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useInView<HTMLElement>(0.3);
  const [visible, setVisible] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (reduced) {
      setVisible(hash.length);
      return;
    }
    let i = 0;
    const id = window.setInterval(() => {
      i += 3;
      setVisible(Math.min(i, hash.length));
      if (i >= hash.length) window.clearInterval(id);
    }, 24);
    return () => window.clearInterval(id);
  }, [inView, reduced, hash.length]);

  return (
    <code
      ref={ref as React.RefObject<HTMLElement>}
      className={`relative block break-all font-mono ${className}`}
      aria-label={hash}
    >
      <span aria-hidden className="text-ion-white">
        {hash.slice(0, visible)}
      </span>
      <span aria-hidden className="text-ion-3/40">
        {hash.slice(visible)}
      </span>
    </code>
  );
}

/**
 * The gate bar: published vs declined, drawn as one instrument. Widths animate
 * in on view; hovering either side lifts it. Counts are rendered as text too —
 * the visual is never the only carrier of the fact.
 */
export function GateBar({
  published,
  declined,
}: {
  published: number;
  declined: number;
}) {
  const { ref, inView } = useInView<HTMLDivElement>(0.4);
  const total = published + declined;
  const pubPct = total === 0 ? 0 : Math.round((published / total) * 100);

  return (
    <div ref={ref} className="w-full">
      <div className="flex h-10 w-full overflow-hidden rounded-xl border border-mineral bg-carbon">
        <div
          className="flex items-center justify-center bg-orbital-cyan/25 text-xs font-semibold text-orbital-cyan transition-all duration-1000 ease-out hover:bg-orbital-cyan/35"
          style={{ width: inView ? `${Math.max(pubPct, published > 0 ? 8 : 0)}%` : "0%" }}
          title={`${published} published to the board`}
        >
          {published > 0 && <SurgeCount value={published} />}
        </div>
        <div
          className="flex flex-1 items-center justify-center bg-titanium/60 text-xs font-semibold text-ion-2 transition-colors hover:bg-titanium"
          title={`${declined} declined in writing`}
        >
          {declined > 0 && (
            <span>
              <SurgeCount value={declined} /> declined
            </span>
          )}
        </div>
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-ion-3">
        <span>
          <span className="font-semibold text-orbital-cyan">{published}</span> made the board
        </span>
        <span>
          <span className="font-semibold text-ion-1">{declined}</span> did not clear the bar
        </span>
      </div>
    </div>
  );
}
