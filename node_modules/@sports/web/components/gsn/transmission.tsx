"use client";

/**
 * GSNTransmission, the interactive daily intelligence briefing.
 *
 * A mission-control transmission: a console header, the slate summarised as a
 * live count strip you can CLICK to jump to the matching segment, and the day's
 * intelligence segments as an expandable briefing (Galaxy Brief, Market Mirage,
 * Roster Shock, Coaching Edge, Line-Movement Autopsy). Click a count or a
 * segment to decrypt its detail; points reveal in a short stagger. Illustrative
 * daily transmission, source-badged (board vs methodology). Keyboard-accessible accordion.
 */

import { useRef, useState } from "react";
import { TONE_HEX, type Transmission } from "@/lib/gsn/transmission";
import { BRAND_COLORS } from "@/lib/brand";

export function GSNTransmission({ transmission }: { transmission: Transmission }) {
  const [open, setOpen] = useState<number>(0);
  const segmentRefs = useRef<Array<HTMLDivElement | null>>([]);

  // Map a count-strip cell to the segment that shares its tone (falls back to
  // the cell's index), so clicking a number opens the segment behind it.
  const segmentForSummary = (summaryIndex: number, tone: string): number => {
    const byTone = transmission.segments.findIndex((seg) => seg.tone === tone);
    if (byTone >= 0) return byTone;
    return Math.min(summaryIndex, transmission.segments.length - 1);
  };

  const jumpTo = (index: number) => {
    setOpen(index);
    // Bring the segment into view without yanking the whole page on desktop.
    requestAnimationFrame(() => {
      segmentRefs.current[index]?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  };

  return (
    <div className="surface-card overflow-hidden p-0">
      {/* console header */}
      <div
        className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3 font-mono"
        style={{ borderColor: BRAND_COLORS.steelGray, background: `linear-gradient(90deg, ${BRAND_COLORS.obsidianBlack}, ${BRAND_COLORS.steelGray}44)` }}
      >
        <p className="flex items-center gap-2 text-sm tracking-[0.18em]" style={{ color: BRAND_COLORS.orbitalCyan }}>
          <span className="live-dot" />
          GSN TRANSMISSION // {transmission.code}
        </p>
        <span className="text-[10px] uppercase tracking-[0.22em] text-ion-2">
          {transmission.source === "board"
            ? "Decrypted · board-sourced"
            : "Decrypted · methodology structure"}
        </span>
      </div>

      {/* summary count strip, each cell jumps to its segment */}
      <div className="grid grid-cols-2 gap-px sm:grid-cols-3 lg:grid-cols-5" style={{ background: BRAND_COLORS.steelGray }}>
        {transmission.summary.map((s, i) => {
          const target = segmentForSummary(i, s.tone);
          const isActive = open === target;
          return (
            <button
              key={s.label}
              type="button"
              onClick={() => jumpTo(target)}
              aria-label={`Open ${s.label} segment`}
              className="group px-4 py-4 text-center transition-colors hover:bg-white/[0.03] focus-visible:outline-none"
              style={{ background: BRAND_COLORS.obsidianBlack, boxShadow: isActive ? `inset 0 -2px 0 ${TONE_HEX[s.tone]}` : undefined }}
            >
              <p className="font-display text-3xl tabular-nums" style={{ color: TONE_HEX[s.tone], textShadow: `0 0 22px ${TONE_HEX[s.tone]}55` }}>
                {s.count}
              </p>
              <p className="mt-1 text-[10px] uppercase tracking-wider text-ion-2 transition-colors group-hover:text-ion-1">{s.label}</p>
            </button>
          );
        })}
      </div>

      {/* segments accordion */}
      <div className="divide-y" style={{ borderColor: BRAND_COLORS.steelGray }}>
        {transmission.segments.map((seg, i) => {
          const color = TONE_HEX[seg.tone];
          const isOpen = open === i;
          return (
            <div
              key={seg.type}
              ref={(el) => { segmentRefs.current[i] = el; }}
              style={{ borderColor: BRAND_COLORS.steelGray, scrollMarginTop: "6rem" }}
            >
              <button
                type="button"
                onClick={() => setOpen(isOpen ? -1 : i)}
                aria-expanded={isOpen}
                className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-white/[0.02] focus-visible:outline-none"
              >
                <span
                  className="shrink-0 rounded-full px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider"
                  style={{ color, background: `${color}14`, border: `1px solid ${color}44` }}
                >
                  {seg.type}
                </span>
                <span className="flex-1 text-sm font-semibold text-ion-white sm:text-base">{seg.title}</span>
                <span aria-hidden className="shrink-0 text-ion-2 transition-transform duration-300" style={{ transform: isOpen ? "rotate(45deg)" : "none" }}>
                  +
                </span>
              </button>
              {isOpen && (
                <div className="motion-safe:animate-[gse-step_400ms_ease-out] px-5 pb-5">
                  <p className="max-w-2xl text-sm leading-relaxed text-ion-1">{seg.dek}</p>
                  <ul className="mt-3 space-y-2">
                    {seg.points.map((p, j) => (
                      <li
                        key={j}
                        className="flex gap-2 text-sm leading-relaxed text-ion-1 motion-safe:animate-[gse-step_420ms_ease-out_both]"
                        style={{ animationDelay: `${80 + j * 70}ms` }}
                      >
                        <span aria-hidden style={{ color }}>↳</span>
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
