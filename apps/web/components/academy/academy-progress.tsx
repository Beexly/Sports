"use client";

/**
 * AcademyProgress — the LMS spine: tracks, modules, and a live mastery ring.
 *
 * Reads and writes completion to localStorage (on-device, nothing leaves the
 * browser), so a learner's progress and mastery persist across visits. Each
 * module deep-links to the real wing that trains it; "mark done" records the rep
 * once the learner has actually run the drill. No fabricated certificate — just
 * an honest, motivating record of what you've trained.
 */

import { useEffect, useState } from "react";
import {
  ACADEMY_TRACKS,
  ACADEMY_PROGRESS_KEY,
  computeMastery,
  type AcademyTrack,
} from "@/lib/academy/progress";
import { BRAND_COLORS } from "@/lib/brand";

const ACCENT: Record<AcademyTrack["accent"], string> = {
  cyan: BRAND_COLORS.orbitalCyan,
  magenta: BRAND_COLORS.ionMagenta,
  violet: BRAND_COLORS.softUltraviolet,
};

function loadCompleted(): Set<string> {
  try {
    const raw = localStorage.getItem(ACADEMY_PROGRESS_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as unknown;
    return Array.isArray(arr) ? new Set(arr.filter((x): x is string => typeof x === "string")) : new Set();
  } catch {
    return new Set();
  }
}

export function AcademyProgress() {
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setCompleted(loadCompleted());
    setLoaded(true);
  }, []);

  const persist = (next: Set<string>) => {
    setCompleted(new Set(next));
    try {
      localStorage.setItem(ACADEMY_PROGRESS_KEY, JSON.stringify([...next]));
    } catch {
      /* ignore */
    }
  };

  const toggle = (id: string) => {
    const next = new Set(completed);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    persist(next);
  };

  const reset = () => persist(new Set());

  const mastery = computeMastery(completed);
  // SSR + first paint render the empty state deterministically; real values
  // appear after hydration reads localStorage.
  const pct = loaded ? mastery.pct : 0;
  const circumference = 2 * Math.PI * 26;

  return (
    <section
      aria-label="Your training progress"
      className="relative overflow-hidden rounded-ds-lg border border-mineral bg-eclipse/40 p-5 sm:p-6"
    >
      <div aria-hidden className="absolute inset-x-0 top-0 h-1 bg-signal-fade" />
      <div className="flex flex-wrap items-center gap-5">
        {/* Mastery ring */}
        <div className="relative grid place-items-center" style={{ width: 76, height: 76 }}>
          <svg width="76" height="76" viewBox="0 0 64 64" className="-rotate-90">
            <circle cx="32" cy="32" r="26" fill="none" stroke={BRAND_COLORS.steelGray} strokeWidth="6" />
            <circle
              cx="32" cy="32" r="26" fill="none"
              stroke={BRAND_COLORS.orbitalCyan} strokeWidth="6" strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - pct / 100)}
              style={{ transition: "stroke-dashoffset 700ms cubic-bezier(0.2,0,0,1)" }}
            />
          </svg>
          <span className="absolute font-numerals text-lg font-bold tabular-nums text-ion-white">{pct}%</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ion-2">Your training</p>
          <p className="mt-1 font-display text-xl font-semibold text-ion-white">
            {mastery.tier} <span className="text-ion-2">· {loaded ? mastery.completed : 0}/{mastery.total} modules</span>
          </p>
          <p className="mt-1 text-xs text-ion-1">
            Progress is saved on this device. Run a drill, then mark the rep to build mastery.
          </p>
        </div>
        {loaded && mastery.completed > 0 && (
          <button
            type="button"
            onClick={reset}
            className="rounded-full border border-mineral px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ion-2 transition-colors hover:border-orbital-cyan/60 hover:text-ion-white"
          >
            Reset
          </button>
        )}
      </div>

      {/* Tracks → modules */}
      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        {ACADEMY_TRACKS.map((track) => {
          const accent = ACCENT[track.accent];
          const tp = loaded ? mastery.byTrack[track.id] : { completed: 0, total: track.modules.length };
          return (
            <div key={track.id} className="rounded-ds-md border border-mineral bg-carbon/50 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: accent }}>
                  {track.label}
                </p>
                <span className="font-mono text-[10px] tabular-nums text-ion-2">
                  {tp?.completed ?? 0}/{tp?.total ?? track.modules.length}
                </span>
              </div>
              <p className="mt-1.5 text-xs leading-5 text-ion-1">{track.blurb}</p>
              <ul className="mt-3 space-y-2">
                {track.modules.map((m) => {
                  const done = loaded && completed.has(m.id);
                  return (
                    <li key={m.id} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggle(m.id)}
                        aria-pressed={done}
                        title={m.drill}
                        className="grid h-4 w-4 shrink-0 place-items-center rounded border transition-colors"
                        style={{
                          borderColor: done ? accent : BRAND_COLORS.steelGray,
                          background: done ? accent : "transparent",
                        }}
                      >
                        {done && <span className="text-[9px] font-bold text-obsidian">✓</span>}
                      </button>
                      <a
                        href={m.href}
                        className={`flex-1 truncate text-xs transition-colors hover:text-ion-white ${done ? "text-ion-2 line-through" : "text-ion-1"}`}
                      >
                        {m.label}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
