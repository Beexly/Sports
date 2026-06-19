"use client";

/**
 * Count-up animation hook — reduced-motion safe, SSR safe.
 * Re-implemented TS-native. Inspired by the pattern from react-countup (MIT)
 * and similar hooks. No npm dependency added.
 */

import { useEffect, useRef, useState } from "react";

interface UseCountUpOptions {
  /** Target value to count up to */
  target: number;
  /** Animation duration in ms (default 1500) */
  duration?: number;
  /** Only animate when true (default true) */
  enabled?: boolean;
  /** Start value (default 0) */
  start?: number;
  /** Custom easing function — maps t∈[0,1] to progress∈[0,1] */
  easing?: (t: number) => number;
}

/** Ease-out cubic — fast start, slow finish */
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Returns the current animated count value.
 * Respects `prefers-reduced-motion`: jumps immediately to target when motion is reduced.
 */
export function useCountUp({
  target,
  duration = 1500,
  enabled = true,
  start = 0,
  easing = easeOutCubic,
}: UseCountUpOptions): number {
  const [value, setValue] = useState<number>(enabled ? start : target);
  const rafRef = useRef<number | null>(null);
  const prefersReducedRef = useRef<boolean>(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      prefersReducedRef.current = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;
    }
  }, []);

  useEffect(() => {
    if (!enabled || prefersReducedRef.current) {
      setValue(target);
      return;
    }

    const startTime = performance.now();
    const range = target - start;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      const progress = easing(t);
      setValue(Math.round(start + progress * range));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration, enabled, start, easing]);

  return value;
}
