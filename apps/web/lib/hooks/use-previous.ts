/**
 * Returns the previous value of a variable.
 * Useful for transition animations and before/after comparisons.
 * Returns undefined on first render.
 */

import { useEffect, useRef } from "react";

export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}
