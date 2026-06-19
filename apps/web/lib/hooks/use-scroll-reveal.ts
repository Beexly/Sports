/**
 * useScrollReveal — triggers reveal animation when element enters viewport.
 *
 * Pure CSS approach: sets a data-revealed="true" attribute that CSS targets.
 * Zero JavaScript animation; honors prefers-reduced-motion by returning
 * revealed=true immediately (no animation).
 *
 * Zero npm dependencies.
 */
import { useEffect, useRef, useState } from "react";

export interface ScrollRevealOptions {
  /** Root margin for IntersectionObserver (default: "0px 0px -80px 0px") */
  rootMargin?: string;
  /** Visibility threshold 0–1 (default: 0.1) */
  threshold?: number;
  /** If true, only reveal once (default: true) */
  once?: boolean;
}

export interface ScrollRevealResult {
  ref: React.RefObject<HTMLElement>;
  revealed: boolean;
  /** CSS class to apply for animation, or "" when revealed (animation done) */
  className: string;
}

export function useScrollReveal(options: ScrollRevealOptions = {}): ScrollRevealResult {
  const {
    rootMargin = "0px 0px -80px 0px",
    threshold = 0.1,
    once = true,
  } = options;

  // SSR-safe: default to revealed so server render never shows hidden state.
  // (hydration mismatch risk: we start visible on server, then re-check on client)
  const isServer = typeof window === "undefined";

  const ref = useRef<HTMLElement>(null);
  const [revealed, setRevealed] = useState<boolean>(isServer);

  useEffect(() => {
    // Respect prefers-reduced-motion: skip animation entirely.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setRevealed(true);
      return;
    }

    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setRevealed(true);
            if (once) {
              observer.disconnect();
            }
          } else if (!once) {
            setRevealed(false);
          }
        }
      },
      { rootMargin, threshold }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [rootMargin, threshold, once]);

  return {
    ref,
    revealed,
    className: revealed ? "" : "opacity-0",
  };
}
