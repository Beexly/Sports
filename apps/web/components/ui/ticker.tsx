"use client";

/**
 * Ticker — a seamless kinetic marquee band of short, doctrine-clean phrases.
 *
 * The track renders its items TWICE so a -50% translate loops invisibly
 * (see `.gse-marquee` in globals.css). Hover pauses it; reduced-motion stops
 * it and lets the row sit static. Purely decorative chrome — aria-hidden, so
 * screen readers are not spammed with a scrolling word-salad. The same phrases
 * live in real prose elsewhere on the page.
 */

import type { CSSProperties } from "react";
import { BRAND_COLORS } from "@/lib/brand";

type TickerProps = {
  items: readonly string[];
  /** seconds for one full loop; lower = faster. */
  durationSec?: number;
  reverse?: boolean;
  className?: string;
};

export function Ticker({ items, durationSec = 38, reverse = false, className }: TickerProps) {
  const doubled = [...items, ...items];
  return (
    <div
      aria-hidden="true"
      className={[
        "gse-marquee relative w-full select-none border-y",
        reverse ? "gse-marquee-reverse" : "",
        className ?? "",
      ].join(" ")}
      style={{
        borderColor: `${BRAND_COLORS.steelGray}`,
        background: `linear-gradient(90deg, ${BRAND_COLORS.obsidianBlack}, ${BRAND_COLORS.steelGray}55, ${BRAND_COLORS.obsidianBlack})`,
      }}
    >
      {/* Edge fades so words dissolve in/out instead of hard-clipping. */}
      <div
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24"
        style={{ background: `linear-gradient(90deg, ${BRAND_COLORS.obsidianBlack}, transparent)` }}
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24"
        style={{ background: `linear-gradient(270deg, ${BRAND_COLORS.obsidianBlack}, transparent)` }}
      />
      <div
        className="gse-marquee-track py-3"
        style={{ "--gse-marquee-dur": `${durationSec}s` } as CSSProperties}
      >
        {doubled.map((item, i) => (
          <span key={i} className="inline-flex items-center">
            <span className="px-6 text-sm font-medium tracking-wide text-ink-300">{item}</span>
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 rounded-full"
              style={{
                backgroundColor: i % 2 ? BRAND_COLORS.softUltraviolet : BRAND_COLORS.orbitalCyan,
                boxShadow: `0 0 10px ${i % 2 ? BRAND_COLORS.softUltraviolet : BRAND_COLORS.orbitalCyan}`,
              }}
            />
          </span>
        ))}
      </div>
    </div>
  );
}
