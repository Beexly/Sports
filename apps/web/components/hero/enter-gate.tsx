"use client";

/**
 * EnterGate — the cinematic "open the glass box" entry to /intelligence.
 *
 * The visitor lands on a sealed full-screen panel over the living galaxy and
 * must *choose* to enter: clicking parts two obsidian doors (left/right slide)
 * while the lockup lifts away, revealing the engine beneath. It opens once per
 * session (sessionStorage), so navigating back in doesn't re-gate you.
 *
 * Accessibility: role="dialog"/aria-modal, the Enter control is auto-focused,
 * Escape or "Skip intro" opens instantly, and body scroll is locked while
 * sealed. Reduced-motion users get an instant cross-fade — no door sweep.
 * The galaxy behind it is the page's own hero, so nothing is mounted twice.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { BRAND_COLORS, BRAND_NAME } from "@/lib/brand";

const KEY = "gse-intel-entered";
type Phase = "sealed" | "opening" | "open";

export function EnterGate() {
  const [phase, setPhase] = useState<Phase>("sealed");
  const btnRef = useRef<HTMLButtonElement | null>(null);

  // Returning within the session? Don't re-gate.
  useEffect(() => {
    let entered = false;
    try {
      entered = sessionStorage.getItem(KEY) === "1";
    } catch {
      /* storage blocked — gate normally */
    }
    // Deep-link past the intro (shareable/marketing links, return visits).
    if (window.location.hash === "#enter") entered = true;
    if (entered) setPhase("open");
    else btnRef.current?.focus();
  }, []);

  // Lock scroll while sealed; release on open.
  useEffect(() => {
    if (phase === "open") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [phase]);

  const open = useCallback(() => {
    setPhase((p) => (p === "sealed" ? "opening" : p));
    try {
      sessionStorage.setItem(KEY, "1");
    } catch {
      /* ignore */
    }
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.setTimeout(() => setPhase("open"), reduced ? 220 : 1250);
  }, []);

  useEffect(() => {
    if (phase !== "sealed") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter") open();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, open]);

  if (phase === "open") return null;

  const opening = phase === "opening";
  const door =
    "absolute top-0 z-20 h-full w-1/2 transition-transform duration-[1200ms] ease-[cubic-bezier(0.77,0,0.18,1)]";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Enter Galaxy Sports Edge"
      className="fixed inset-0 z-[60] overflow-hidden"
      style={{ pointerEvents: opening ? "none" : "auto" }}
    >
      {/* ── Left door ── */}
      <div
        aria-hidden="true"
        className={`${door} left-0`}
        style={{
          transform: opening ? "translateX(-101%)" : "translateX(0)",
          background: `linear-gradient(90deg, ${BRAND_COLORS.obsidianBlack} 70%, ${BRAND_COLORS.steelGray})`,
          borderRight: `1px solid ${BRAND_COLORS.orbitalCyan}55`,
          boxShadow: `inset -1px 0 24px ${BRAND_COLORS.orbitalCyan}22`,
        }}
      />
      {/* ── Right door ── */}
      <div
        aria-hidden="true"
        className={`${door} right-0`}
        style={{
          transform: opening ? "translateX(101%)" : "translateX(0)",
          background: `linear-gradient(270deg, ${BRAND_COLORS.obsidianBlack} 70%, ${BRAND_COLORS.steelGray})`,
          borderLeft: `1px solid ${BRAND_COLORS.softUltraviolet}55`,
          boxShadow: `inset 1px 0 24px ${BRAND_COLORS.softUltraviolet}22`,
        }}
      />
      {/* Center seam glow — the line the doors part along. */}
      <div
        aria-hidden="true"
        className="absolute inset-y-0 left-1/2 z-20 w-px -translate-x-1/2 transition-opacity duration-500"
        style={{
          opacity: opening ? 0 : 1,
          background: `linear-gradient(180deg, transparent, ${BRAND_COLORS.orbitalCyan}, ${BRAND_COLORS.softUltraviolet}, transparent)`,
          boxShadow: `0 0 24px ${BRAND_COLORS.orbitalCyan}`,
        }}
      />

      {/* ── Lockup ── */}
      <div
        className="absolute inset-0 z-30 flex flex-col items-center justify-center px-6 text-center transition-all duration-700 ease-out"
        style={{
          opacity: opening ? 0 : 1,
          transform: opening ? "translateY(-26px) scale(1.04)" : "none",
        }}
      >
        <p className="eyebrow mb-6 flex items-center gap-2" style={{ color: BRAND_COLORS.orbitalCyan }}>
          <span className="live-dot" />
          {BRAND_NAME}
        </p>

        <h1
          className="font-display text-balance text-white"
          style={{ fontSize: "clamp(2.5rem, 8vw, 6.5rem)", lineHeight: 0.98, letterSpacing: "-0.03em" }}
        >
          Open the{" "}
          <span className="gse-editorial gse-sheen" style={{ fontSize: "1.12em" }}>
            glass box.
          </span>
        </h1>

        <p className="mt-6 max-w-md text-base text-ink-300 sm:text-lg">
          Most products hand you a pick and ask for trust. Step inside and watch the
          machine reason — every read, graded and recorded.
        </p>

        <button
          ref={btnRef}
          type="button"
          onClick={open}
          className="group relative mt-10 inline-flex items-center gap-3 rounded-full px-8 py-4 text-base font-semibold transition-transform duration-200 hover:scale-[1.03] focus-visible:outline-none"
          style={{
            color: BRAND_COLORS.obsidianBlack,
            background: `linear-gradient(110deg, ${BRAND_COLORS.orbitalCyan}, ${BRAND_COLORS.softUltraviolet})`,
            boxShadow: `0 0 36px ${BRAND_COLORS.orbitalCyan}66`,
          }}
        >
          {/* expanding focus/attention ring */}
          <span
            aria-hidden="true"
            className="gse-enter-ring absolute inset-0 rounded-full"
            style={{ border: `1.5px solid ${BRAND_COLORS.orbitalCyan}` }}
          />
          Enter the engine
          <span aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-1">
            ▸
          </span>
        </button>

        <button
          type="button"
          onClick={open}
          className="mt-5 text-xs uppercase tracking-[0.18em] text-ink-500 transition-colors hover:text-ink-300 focus-visible:outline-none focus-visible:text-ink-300"
        >
          Skip intro
        </button>
      </div>
    </div>
  );
}
