"use client";

/**
 * CountUp — a real number that animates up when it scrolls into view.
 *
 * Honest by construction: it SSR-renders the true value (so no-JS and crawlers
 * see the real number, and hydration matches), then on first in-view it counts
 * 0 → value with an ease-out. prefers-reduced-motion skips the animation and
 * shows the value. It animates presentation only — never invents a number.
 */

import { useEffect, useRef, useState } from "react";

/** Ease-out exponential: fast start, gentle settle. Pure. */
export function easeOutExpo(t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return 1 - Math.pow(2, -10 * t);
}

export function CountUp({
  value,
  durationMs = 1100,
  decimals = 0,
  group = false,
  prefix,
  suffix,
  className,
}: {
  value: number;
  durationMs?: number;
  decimals?: number;
  /** Thousands-grouping (commas). A boolean, not a function — client components
   *  can't receive function props from a server parent. */
  group?: boolean;
  prefix?: string;
  suffix?: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(value); // SSR + hydration = the true value
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || !Number.isFinite(value)) return;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) { setDisplay(value); return; }

    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting || started.current) return;
        started.current = true;
        let raf = 0;
        let start = 0;
        setDisplay(0);
        const tick = (now: number) => {
          if (!start) start = now;
          const p = Math.min(1, (now - start) / durationMs);
          setDisplay(value * easeOutExpo(p));
          if (p < 1) raf = window.requestAnimationFrame(tick);
        };
        raf = window.requestAnimationFrame(tick);
        cleanup = () => { if (raf) cancelAnimationFrame(raf); };
      },
      { threshold: 0.35 },
    );
    let cleanup = () => {};
    io.observe(el);
    return () => { io.disconnect(); cleanup(); };
  }, [value, durationMs]);

  const shown = group ? GROUP_FMT.format(Math.round(display)) : display.toFixed(decimals);
  return (
    <span ref={ref} className={className}>
      {prefix}{shown}{suffix}
    </span>
  );
}

const GROUP_FMT = new Intl.NumberFormat("en-US");
