"use client";

/**
 * Subscribe to a CSS media query.
 * Returns false on SSR (no window).
 *
 * @example
 * const isMobile = useMediaQuery("(max-width: 768px)")
 * const prefersReducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)")
 */

import { useEffect, useState } from "react";

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    // SSR-safe: return false when window is undefined
    if (typeof window === "undefined") return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQueryList = window.matchMedia(query);
    setMatches(mediaQueryList.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    mediaQueryList.addEventListener("change", handleChange);

    return () => {
      mediaQueryList.removeEventListener("change", handleChange);
    };
  }, [query]);

  return matches;
}
