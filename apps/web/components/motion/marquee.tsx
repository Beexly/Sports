/**
 * Marquee — CSS-only horizontal ticker.
 *
 * Used under the hero to make the page feel alive without a network call.
 * The items list is duplicated once at render so the loop is seamless;
 * the actual animation is a single transform translate to -50% which
 * naturally tiles. Reduced-motion users see a static, scrollable list.
 *
 * The brief calls for "ambient movement, reactive panels, motion as
 * identity." This is the cheapest, lowest-distraction way to deliver that
 * on the marketing surface.
 */

import type { CSSProperties, ReactNode } from "react";

export interface MarqueeProps {
  /** Items to scroll. Mixed strings + nodes are fine. */
  items: ReadonlyArray<string | ReactNode>;
  /** Animation duration in seconds. Lower = faster. Default: 40. */
  durationSec?: number;
  /** Direction. Default: "left" (items move right-to-left). */
  direction?: "left" | "right";
  /** Optional className on the wrapper. */
  className?: string;
  /** Gap between items (Tailwind class friendly: "gap-12", "gap-16"). Default: "gap-12". */
  gap?: string;
  /** Custom separator between items. Default: a small accent dot. */
  separator?: ReactNode;
}

export function Marquee({
  items,
  durationSec = 40,
  direction = "left",
  className = "",
  gap = "gap-12",
  separator,
}: MarqueeProps) {
  const animation =
    direction === "left"
      ? `marquee-x ${durationSec}s linear infinite`
      : `marquee-x ${durationSec}s linear infinite reverse`;

  const styles: CSSProperties = {
    animation,
    // Ensure GPU acceleration so the scroll stays smooth.
    willChange: "transform",
  };

  const sep =
    separator ??
    (
      <span
        aria-hidden="true"
        className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-accent-400/70"
      />
    );

  // Duplicate the items array so the marquee can loop seamlessly via a
  // -50% translate at animation end.
  const doubled = [...items, ...items];

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      // Edge fade so items don't pop in/out abruptly
      style={{
        maskImage:
          "linear-gradient(90deg, transparent 0%, black 8%, black 92%, transparent 100%)",
        WebkitMaskImage:
          "linear-gradient(90deg, transparent 0%, black 8%, black 92%, transparent 100%)",
      }}
    >
      <div
        className={`flex w-max items-center ${gap} motion-reduce:!animate-none motion-reduce:!transform-none`}
        style={styles}
      >
        {doubled.map((item, i) => (
          <span
            key={i}
            className="flex items-center gap-12 whitespace-nowrap text-sm uppercase tracking-[0.18em] text-ink-300"
          >
            {typeof item === "string" ? <span>{item}</span> : item}
            {sep}
          </span>
        ))}
      </div>
    </div>
  );
}
