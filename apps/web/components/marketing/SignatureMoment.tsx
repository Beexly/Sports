"use client";

import * as React from "react";

export interface SignatureMomentProps {
  /** Static phrase that precedes the rotating word. */
  readonly prefix: string;
  /** 2-4 synonyms that rotate. */
  readonly words: ReadonlyArray<string>;
  /** Cadence in ms between rotations. Default 2200. */
  readonly intervalMs?: number;
  /** Punctuation appended to the rotated word. Default '.'. */
  readonly punctuation?: string;
  readonly className?: string;
}

/**
 * SignatureMoment — variable-font kinetic word pattern. One per major
 * public surface (homepage, /orbit, /galaxy-demo, /methodology,
 * /manifesto). The Constitution C33 'one signature moment per surface'
 * is satisfied by this primitive when mounted once per surface.
 *
 * Reduced-motion respect: stays on the first word.
 */
export function SignatureMoment({
  prefix,
  words,
  intervalMs = 2200,
  punctuation = ".",
  className,
}: SignatureMomentProps): JSX.Element {
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
    if (reducedMotion || words.length <= 1) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % words.length);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [reducedMotion, words.length, intervalMs]);

  return (
    <span className={["inline-flex flex-wrap items-baseline gap-x-3", className ?? ""].join(" ")}>
      <span>{prefix}</span>
      <span
        key={index}
        className="inline-block bg-gradient-to-r from-cyan-300 via-blue-300 to-violet-400 bg-clip-text text-transparent motion-safe:animate-fade-up"
        aria-live="off"
      >
        {words[index]}
        {punctuation}
      </span>
    </span>
  );
}
