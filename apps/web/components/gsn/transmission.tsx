"use client";

/**
 * GSNTransmission — the interactive daily intelligence briefing.
 *
 * A mission-control transmission: a console header, the slate summarised as a
 * live count strip, and the day's intelligence segments as an expandable
 * briefing (Galaxy Brief, Market Mirage, Roster Shock, Coaching Edge,
 * Line-Movement Autopsy). Click a segment to decrypt its detail. Illustrative
 * sample transmission — explicitly badged. Keyboard-accessible accordion.
 */

import { useState } from "react";
import { TONE_HEX, type Transmission } from "@/lib/gsn/transmission";
import { BRAND_COLORS } from "@/lib/brand";

export function GSNTransmission({ transmission }: { transmission: Transmission }) {
  const [open, setOpen] = useState<number>(0);

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
        <span className="text-[10px] uppercase tracking-[0.22em] text-ink-500">Decrypted · illustrative sample</span>
      </div>

      {/* summary count strip */}
      <div className="grid grid-cols-2 gap-px sm:grid-cols-3 lg:grid-cols-5" style={{ background: BRAND_COLORS.steelGray }}>
        {transmission.summary.map((s) => (
          <div key={s.label} className="px-4 py-4 text-center" style={{ background: BRAND_COLORS.obsidianBlack }}>
            <p className="font-display text-3xl tabular-nums" style={{ color: TONE_HEX[s.tone], textShadow: `0 0 22px ${TONE_HEX[s.tone]}55` }}>
              {s.count}
            </p>
            <p className="mt-1 text-[10px] uppercase tracking-wider text-ink-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* segments accordion */}
      <div className="divide-y" style={{ borderColor: BRAND_COLORS.steelGray }}>
        {transmission.segments.map((seg, i) => {
          const color = TONE_HEX[seg.tone];
          const isOpen = open === i;
          return (
            <div key={seg.type} style={{ borderColor: BRAND_COLORS.steelGray }}>
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
                <span className="flex-1 text-sm font-semibold text-white sm:text-base">{seg.title}</span>
                <span aria-hidden className="shrink-0 text-ink-500 transition-transform duration-300" style={{ transform: isOpen ? "rotate(45deg)" : "none" }}>
                  +
                </span>
              </button>
              {isOpen && (
                <div className="motion-safe:animate-[gse-step_400ms_ease-out] px-5 pb-5">
                  <p className="max-w-2xl text-sm leading-relaxed text-ink-300">{seg.dek}</p>
                  <ul className="mt-3 space-y-2">
                    {seg.points.map((p, j) => (
                      <li key={j} className="flex gap-2 text-sm leading-relaxed text-ink-200">
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
