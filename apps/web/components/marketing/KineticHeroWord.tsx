"use client";

import * as React from "react";

const WORDS = ["differently", "precisely", "decisively", "transparently"] as const;

/**
 * Variable-font kinetic word that rotates through synonyms on a steady
 * cadence. Respects prefers-reduced-motion — when reduced motion is on,
 * the word stays static on the first item.
 *
 * Used in the homepage hero. The signature moment for / (C81 delivers
 * one signature moment per major surface; this is the homepage's).
 */
export function KineticHeroWord(): JSX.Element {
  const [index, setIndex] = React.useState(0);
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
    if (reducedMotion) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % WORDS.length);
    }, 2200);
    return () => window.clearInterval(id);
  }, [reducedMotion]);

  return (
    <span
      key={index}
      className="inline-block bg-gradient-to-r from-cyan-300 via-blue-300 to-violet-400 bg-clip-text text-transparent motion-safe:animate-fade-up"
      aria-live="off"
    >
      {WORDS[index]}.
    </span>
  );
}
