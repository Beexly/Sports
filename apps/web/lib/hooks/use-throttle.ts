"use client";

/**
 * Throttle a value — returns the value at most once per interval.
 * Useful for scroll/resize handlers.
 * Leading-edge throttle: update immediately on value change, then block for intervalMs.
 */

import { useEffect, useRef, useState } from "react";

export function useThrottle<T>(value: T, intervalMs: number): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const isFirstRender = useRef<boolean>(true);
  const inCooldown = useRef<boolean>(false);
  const pendingValue = useRef<T>(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Skip the initial render — the state is already initialized to the initial value
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    pendingValue.current = value;

    if (!inCooldown.current) {
      // Leading edge: fire immediately
      inCooldown.current = true;
      setThrottledValue(value);

      timerRef.current = setTimeout(() => {
        inCooldown.current = false;
        timerRef.current = null;
        // Emit the latest pending value after the interval
        setThrottledValue(pendingValue.current);
      }, intervalMs);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, intervalMs]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return throttledValue;
}
