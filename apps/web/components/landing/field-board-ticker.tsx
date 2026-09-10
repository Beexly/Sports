"use client";

/**
 * FieldBoardTicker — calm live marquee of today's cleared / held rows.
 * Hover pauses. Reduced motion freezes. aria-hidden (data lives in tables).
 */

import type { CSSProperties } from "react";

export function FieldBoardTicker({ items }: { items: readonly string[] }) {
  if (items.length === 0) return null;
  const doubled = [...items, ...items];
  return (
    <div
      aria-hidden="true"
      className="gse-marquee relative w-full select-none border-y border-mineral"
      style={{ background: "#0C0E13" }}
    >
      <div
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16"
        style={{ background: "linear-gradient(90deg, #0C0E13, transparent)" }}
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16"
        style={{ background: "linear-gradient(270deg, #0C0E13, transparent)" }}
      />
      <div
        className="gse-marquee-track py-3"
        style={{ "--gse-marquee-dur": "48s" } as CSSProperties}
      >
        {doubled.map((item, i) => (
          <span key={`${item}-${i}`} className="inline-flex items-center">
            <span className="px-5 font-mono text-[11px] uppercase tracking-[0.1em] text-ion-2 tabular-nums">
              {item}
            </span>
            <span
              aria-hidden
              className="h-1 w-1"
              style={{ background: item.includes("cleared") ? "#FF4D2E" : "#8F8A82" }}
            />
          </span>
        ))}
      </div>
    </div>
  );
}
