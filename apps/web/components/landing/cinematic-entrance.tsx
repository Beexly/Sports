"use client";

/**
 * CinematicEntrance — the "SIGNAL ACQUIRED" cold open for Galaxy Sports Edge.
 *
 * Not a hero section: a movie cold-open + mission-control boot + intelligence
 * montage that DISSOLVES into the live galaxy/UI behind it (the cinematic object
 * becomes the interface — the overlay fades to reveal the real page).
 *
 * Modes:
 *  - First visit  → long-form ~22s montage (boot → montage → forming → identity → handoff).
 *  - Return visit → compressed ~3s signal boot (localStorage flag).
 *  - Power user   → Skip (always available) jumps straight to Mission Control.
 *  - Reduced motion → static identity + entry choices, instant, no flashing.
 *  - #enter deep-link or prior-session flag → bypass entirely.
 *
 * DOCTRINE: no fake odds/teams/wins presented as real. The montage is abstract,
 * system-level, and its memorable lines are the brand's honest philosophy
 * ("CONFIDENCE IS NOT EVIDENCE", "GOOD PROCESS · BAD OUTCOME"). Any numerals are
 * a labelled illustrative system trace, not a real market claim.
 *
 * Accessibility: role="dialog", focus-managed Skip, Escape to skip, body scroll
 * locked while open, polite live-region announce. No audio.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import Link from "next/link";
import { BRAND_COLORS, BRAND_NAME, BRAND_MONOGRAM } from "@/lib/brand";

const SEEN_KEY = "gse-entrance-seen-v1";

type Phase = "boot" | "montage" | "forming" | "identity" | "handoff" | "done";

const BOOT = [
  "SYSTEM BOOT",
  "DATA SOURCES ONLINE",
  "ODDS FEEDS SYNCING",
  "HISTORICAL CORPUS LOADED",
  "MODEL RUNS READY",
  "CALIBRATION CHECKED",
  "RISK LAYER ACTIVE",
  "NO-BET ENGINE ARMED",
  "SIGNAL ARCHITECTURE LOADED",
  "SIGNAL LINK ESTABLISHED",
] as const;

type Flash = { text: string; tone: "ion" | "anomaly" | "deep" | "white" };
const FLASHES: readonly Flash[] = [
  { text: "EVERY MARKET TELLS A STORY", tone: "white" },
  { text: "MARKET PRESSURE RISING", tone: "ion" },
  { text: "THE LINE IS MOVING", tone: "ion" },
  { text: "MODEL CONFLICT FOUND", tone: "deep" },
  { text: "PUBLIC OVEREXPOSURE", tone: "anomaly" },
  { text: "NOISE REJECTED", tone: "anomaly" },
  { text: "CONFIDENCE IS NOT EVIDENCE", tone: "white" },
  { text: "EDGE UNDER REVIEW", tone: "ion" },
  { text: "COUNTEREVIDENCE WEIGHED", tone: "deep" },
  { text: "GOOD PROCESS · BAD OUTCOME", tone: "deep" },
  { text: "NO EDGE · NO BET", tone: "anomaly" },
  { text: "SHOW YOUR WORK", tone: "white" },
  { text: "EDGE SURVIVED REVIEW", tone: "ion" },
  { text: "TRACK RECORD OVER PROMISES", tone: "white" },
  { text: "SEE IT FIRST", tone: "deep" },
  { text: "SIGNAL ACQUIRED", tone: "ion" },
];

const toneColor: Record<Flash["tone"], string> = {
  ion: BRAND_COLORS.orbitalCyan,
  anomaly: BRAND_COLORS.ionMagenta,
  deep: BRAND_COLORS.softUltraviolet,
  white: BRAND_COLORS.ionWhite,
};

const FRAG_COUNT = 9;

export function CinematicEntrance() {
  const [phase, setPhase] = useState<Phase>("boot");
  const [tick, setTick] = useState(0);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const timers = useRef<number[]>([]);
  const skipRef = useRef<HTMLButtonElement | null>(null);
  const startedRef = useRef(false);

  const finish = useCallback(() => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current.forEach((t) => window.clearInterval(t));
    timers.current = [];
    setPhase("done");
  }, []);

  // Boot the sequence (once).
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const reduced =
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let seen = false;
    try {
      seen = localStorage.getItem(SEEN_KEY) === "1";
    } catch {
      /* ignore */
    }
    if (window.location.hash === "#enter" || window.location.search.includes("intro=skip")) {
      setPhase("done");
      return;
    }
    try {
      localStorage.setItem(SEEN_KEY, "1");
    } catch {
      /* ignore */
    }

    if (reduced) {
      setPhase("identity");
      const t = window.setTimeout(() => setPhase("handoff"), 600);
      timers.current.push(t);
      return;
    }

    // Schedule (ms). Compressed on return visits; long-form montage on first.
    const S = seen
      ? { montage: 500, forming: 1300, identity: 2000, handoff: 2900 }
      : { montage: 2600, forming: 15400, identity: 18600, handoff: 21800 };

    const push = (fn: () => void, at: number) => timers.current.push(window.setTimeout(fn, at));
    push(() => setPhase("montage"), S.montage);
    push(() => setPhase("forming"), S.forming);
    push(() => setPhase("identity"), S.identity);
    push(() => setPhase("handoff"), S.handoff);

    // Montage recut clock — slower, more cinematic dwell per frame.
    const iv = window.setInterval(() => setTick((t) => t + 1), seen ? 300 : 600);
    timers.current.push(iv);
    push(() => window.clearInterval(iv), S.forming);
  }, []);

  // Focus skip; lock scroll; Escape to skip.
  useEffect(() => {
    if (phase === "done") return;
    skipRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [phase, finish]);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const onMove = (e: ReactMouseEvent) => {
    const x = (e.clientX / window.innerWidth - 0.5) * 2;
    const y = (e.clientY / window.innerHeight - 0.5) * 2;
    setMouse({ x, y });
  };

  const flash = useMemo(() => FLASHES[Math.floor(tick / 2) % FLASHES.length]!, [tick]);
  const fragKind = tick % FRAG_COUNT;

  if (phase === "done") return null;

  const par = (depth: number) => ({
    transform: `translate3d(${mouse.x * depth}px, ${mouse.y * depth}px, 0)`,
  });

  const showMontage = phase === "montage";
  const showBoot = phase === "boot";
  const showForming = phase === "forming";
  const showIdentity = phase === "identity" || phase === "handoff";
  const showHandoff = phase === "handoff";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Entering ${BRAND_NAME}`}
      onMouseMove={onMove}
      className="fixed inset-0 z-[70] overflow-hidden"
      style={{ background: BRAND_COLORS.obsidianBlack }}
    >
      <span className="sr-only" role="status">
        Entering {BRAND_NAME}. The system is acquiring the signal.
      </span>

      {/* atmosphere */}
      <div aria-hidden className="gse-vignette" />
      <div aria-hidden className="gse-scanlines" />
      <div aria-hidden className="gse-grain" />
      {/* sweeping scanline */}
      <div
        aria-hidden
        className="gse-cine-anim pointer-events-none absolute inset-x-0 top-0 h-40"
        style={{
          animation: "gse-scan 3.6s linear infinite",
          background: `linear-gradient(180deg, transparent, ${BRAND_COLORS.orbitalCyan}26, transparent)`,
        }}
      />

      {/* ── BOOT ─────────────────────────────────────────────── */}
      {showBoot && (
        <div className="absolute inset-0 flex items-center justify-center p-8">
          <div className="w-full max-w-md font-mono text-sm" style={par(6)}>
            <p className="mb-5 text-xs uppercase tracking-[0.3em]" style={{ color: BRAND_COLORS.orbitalCyan }}>
              {"// galaxy sports edge · mission control"}
            </p>
            <ul className="space-y-2">
              {BOOT.map((line, i) => (
                <li
                  key={line}
                  className="gse-cine-anim flex items-center justify-between"
                  style={{ animation: "gse-boot-line 360ms ease-out both", animationDelay: `${i * 200}ms` }}
                >
                  <span className="text-ink-300">{line}</span>
                  <span style={{ color: BRAND_COLORS.orbitalCyan }}>OK</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* ── MONTAGE ──────────────────────────────────────────── */}
      {showMontage && (
        <div className="absolute inset-0">
          {/* background fragment, recut each tick */}
          <div
            key={`frag-${tick}`}
            aria-hidden
            className="gse-cine-anim absolute inset-0 flex items-center justify-center"
            style={{ animation: "gse-in 240ms ease-out both", ...par(10) }}
          >
            <Fragment kind={fragKind} />
          </div>

          {/* centered flash word */}
          <div className="absolute inset-0 flex items-center justify-center px-6">
            <p
              key={`flash-${Math.floor(tick / 2)}`}
              className="gse-cine-anim text-center font-display"
              style={{
                animation: "gse-flash-in 600ms ease-out both",
                color: toneColor[flash.tone],
                fontSize: "clamp(1.6rem, 5vw, 3.4rem)",
                letterSpacing: "0.22em",
                textShadow: `0 0 40px ${toneColor[flash.tone]}66`,
                fontWeight: flash.tone === "white" ? 800 : 600,
              }}
            >
              {flash.text}
            </p>
          </div>

          <p className="absolute bottom-5 left-1/2 -translate-x-1/2 font-mono text-[10px] uppercase tracking-[0.3em] text-ink-500">
            {"// illustrative system trace"}
          </p>
        </div>
      )}

      {/* ── FORMING ──────────────────────────────────────────── */}
      {showForming && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative">
            <span
              aria-hidden
              className="gse-cine-anim absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{ animation: "gse-signal-ping 1.4s ease-out infinite", border: `1.5px solid ${BRAND_COLORS.orbitalCyan}` }}
            />
            <span
              aria-hidden
              className="block h-3 w-3 rounded-full"
              style={{ background: BRAND_COLORS.ionWhite, boxShadow: `0 0 30px 8px ${BRAND_COLORS.orbitalCyan}` }}
            />
          </div>
        </div>
      )}

      {/* ── IDENTITY + HANDOFF ───────────────────────────────── */}
      {showIdentity && (
        <div className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden px-6 text-center">
          {/* expanding burst that "becomes" the galaxy behind */}
          <span
            aria-hidden
            className="gse-cine-anim pointer-events-none absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ animation: "gse-form-burst 1100ms ease-out forwards", background: BRAND_COLORS.orbitalCyan }}
          />

          {/* particle sweep — fine streaks rushing inward as identity locks */}
          <span
            aria-hidden
            className="gse-cine-anim pointer-events-none absolute left-1/2 top-1/2 h-[140vmax] w-[140vmax] -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              animation: "gse-particle-sweep 1400ms ease-out forwards",
              background: `repeating-conic-gradient(from 0deg at 50% 50%, transparent 0deg, ${BRAND_COLORS.orbitalCyan}22 1deg, transparent 3deg)`,
              maskImage: "radial-gradient(circle, transparent 30%, black 62%, transparent 80%)",
              WebkitMaskImage: "radial-gradient(circle, transparent 30%, black 62%, transparent 80%)",
            }}
          />

          {/* light-band wipe across the frame as the mark resolves */}
          <span
            aria-hidden
            className="gse-cine-anim pointer-events-none absolute inset-y-0 left-0 w-1/3"
            style={{
              animation: "gse-lightband 1200ms ease-out forwards",
              background: `linear-gradient(100deg, transparent, ${BRAND_COLORS.ionWhite}44, ${BRAND_COLORS.orbitalCyan}33, transparent)`,
            }}
          />

          <div className="gse-cine-anim" style={{ animation: "gse-in 700ms ease-out both" }}>
            <p
              className="font-arch tabular-nums"
              style={{ fontSize: "clamp(4rem, 14vw, 9rem)", lineHeight: 0.85, color: BRAND_COLORS.ionWhite, letterSpacing: "0.02em" }}
            >
              {BRAND_MONOGRAM}
            </p>
            <p className="eyebrow mt-3 justify-center" style={{ color: BRAND_COLORS.orbitalCyan }}>
              {BRAND_NAME}
            </p>
          </div>

          <p
            className="gse-cine-anim mt-7 max-w-xl font-display text-balance text-white"
            style={{ animation: "gse-in 800ms ease-out both", animationDelay: "260ms", fontSize: "clamp(1.5rem, 4.5vw, 2.75rem)", lineHeight: 1.05 }}
          >
            Find the signal{" "}
            <span className="gse-editorial" style={{ fontSize: "1.1em" }}>
              before
            </span>{" "}
            the market moves.
          </p>

          {showHandoff && (
            <div
              className="gse-cine-anim mt-10 flex flex-col items-center gap-4"
              style={{ animation: "gse-in 600ms ease-out both" }}
            >
              <button
                type="button"
                onClick={finish}
                className="group relative inline-flex items-center gap-3 rounded-full px-9 py-4 text-base font-semibold transition-transform duration-200 hover:scale-[1.03] focus-visible:outline-none"
                style={{
                  color: BRAND_COLORS.obsidianBlack,
                  background: `linear-gradient(110deg, ${BRAND_COLORS.orbitalCyan}, ${BRAND_COLORS.softUltraviolet})`,
                  boxShadow: `0 0 40px ${BRAND_COLORS.orbitalCyan}66`,
                }}
              >
                <span aria-hidden className="gse-enter-ring absolute inset-0 rounded-full" style={{ border: `1.5px solid ${BRAND_COLORS.orbitalCyan}` }} />
                Enter the engine
                <span aria-hidden className="transition-transform duration-200 group-hover:translate-x-1">▸</span>
              </button>

              <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
                <Link href="/board" onClick={finish} className="text-ink-300 underline-offset-4 transition-colors hover:text-white hover:underline">
                  Open today&apos;s slate
                </Link>
                <span aria-hidden className="text-ink-500">·</span>
                <Link href="/cipher" onClick={finish} className="text-ink-300 underline-offset-4 transition-colors hover:text-white hover:underline">
                  The Cipher
                </Link>
                <span aria-hidden className="text-ink-500">·</span>
                <Link href="/methodology" onClick={finish} className="text-ink-300 underline-offset-4 transition-colors hover:text-white hover:underline">
                  How it works
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Skip — always available */}
      <button
        ref={skipRef}
        type="button"
        onClick={finish}
        className="absolute right-5 top-5 z-10 rounded-full border px-4 py-1.5 text-xs uppercase tracking-[0.18em] text-ink-400 transition-colors hover:text-white focus-visible:outline-none"
        style={{ borderColor: BRAND_COLORS.steelGray }}
      >
        Skip ▸
      </button>
    </div>
  );
}

/** Abstract intelligence fragments — system-level motifs, never real claims. */
function Fragment({ kind }: { kind: number }) {
  const cyan = BRAND_COLORS.orbitalCyan;
  const mag = BRAND_COLORS.ionMagenta;
  const uv = BRAND_COLORS.softUltraviolet;

  if (kind === 0) {
    // terminal readout
    return (
      <div className="w-full max-w-lg px-8 font-mono text-xs text-ink-400">
        {["MKT.PRESSURE  ▲ 0x3F", "MODEL.Δ       CONFLICT", "PUBLIC.EXP    ████░ 71%", "FRESHNESS     OK · 12s", "EDGE.STATE    UNDER REVIEW"].map((l, i) => (
          <p key={i} className="flex justify-between border-b border-white/5 py-1">
            <span>{l}</span>
            <span style={{ color: i === 1 ? mag : cyan }}>{i === 1 ? "!" : "·"}</span>
          </p>
        ))}
      </div>
    );
  }
  if (kind === 1) {
    // intelligence reticle locking on a moving point
    return (
      <svg width="320" height="320" viewBox="0 0 320 320" aria-hidden>
        <circle cx="160" cy="160" r="120" fill="none" stroke={cyan} strokeOpacity="0.25" strokeWidth="1" />
        <circle cx="160" cy="160" r="70" fill="none" stroke={cyan} strokeOpacity="0.5" strokeWidth="1" strokeDasharray="6 8" className="gse-cine-anim" style={{ transformOrigin: "160px 160px", animation: "gse-sweep 6s linear infinite" }} />
        <line x1="160" y1="20" x2="160" y2="70" stroke={cyan} strokeWidth="1" />
        <line x1="160" y1="250" x2="160" y2="300" stroke={cyan} strokeWidth="1" />
        <line x1="20" y1="160" x2="70" y2="160" stroke={cyan} strokeWidth="1" />
        <line x1="250" y1="160" x2="300" y2="160" stroke={cyan} strokeWidth="1" />
        <circle cx="206" cy="132" r="5" fill={cyan} style={{ filter: `drop-shadow(0 0 8px ${cyan})` }} />
        <circle cx="206" cy="132" r="16" fill="none" stroke={cyan} strokeWidth="1.5" />
      </svg>
    );
  }
  if (kind === 2) {
    // line chart snapping like a bolt
    return (
      <svg width="460" height="220" viewBox="0 0 460 220" aria-hidden>
        <path
          d="M10 180 L80 168 L150 172 L210 120 L270 132 L330 60 L420 30"
          fill="none"
          stroke={cyan}
          strokeWidth="2.5"
          strokeDasharray="240"
          className="gse-cine-anim"
          style={{ animation: "gse-bolt 600ms ease-out forwards", filter: `drop-shadow(0 0 10px ${cyan}aa)` }}
        />
        <circle cx="420" cy="30" r="5" fill={BRAND_COLORS.ionWhite} />
      </svg>
    );
  }
  if (kind === 3) {
    // redacted scouting note
    return (
      <div className="w-full max-w-md space-y-2 px-8">
        {[100, 78, 92, 64, 84].map((w, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="h-3 rounded-sm" style={{ width: `${w}%`, background: i === 2 ? `${mag}cc` : "rgba(255,255,255,0.14)" }} />
          </div>
        ))}
        <p className="pt-2 font-mono text-[10px] uppercase tracking-[0.3em]" style={{ color: mag }}>
          redacted · counterevidence
        </p>
      </div>
    );
  }
  if (kind === 4) {
    // radar sweep
    return (
      <svg width="300" height="300" viewBox="0 0 300 300" aria-hidden>
        {[40, 80, 120].map((r) => (
          <circle key={r} cx="150" cy="150" r={r} fill="none" stroke={uv} strokeOpacity="0.3" strokeWidth="1" />
        ))}
        <g className="gse-cine-anim" style={{ transformOrigin: "150px 150px", animation: "gse-sweep 2.4s linear infinite" }}>
          <path d="M150 150 L150 30 A120 120 0 0 1 250 110 Z" fill={`${uv}33`} />
        </g>
        <circle cx="206" cy="96" r="4" fill={mag} style={{ filter: `drop-shadow(0 0 8px ${mag})` }} />
      </svg>
    );
  }
  if (kind === 5) {
    // probability band
    return (
      <div className="w-full max-w-lg px-8">
        <div className="relative h-10 overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
          <div className="absolute inset-y-0 left-[18%] right-[34%] rounded-full" style={{ background: `linear-gradient(90deg, ${cyan}55, ${uv}66, ${mag}55)` }} />
          <div className="absolute inset-y-0 left-[48%] w-px" style={{ background: BRAND_COLORS.ionWhite }} />
        </div>
        <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-[0.3em] text-ink-500">probability band · confidence interval</p>
      </div>
    );
  }
  if (kind === 6) {
    // signal waveform — a market pulse drawn left-to-right like a heartbeat trace
    const pts = [12, 18, 9, 24, 14, 40, 16, 8, 30, 11, 22, 13, 36, 10, 20];
    const step = 460 / (pts.length - 1);
    const d = pts
      .map((v, i) => `${i === 0 ? "M" : "L"}${(i * step).toFixed(1)} ${(110 - (v - 20) * 2).toFixed(1)}`)
      .join(" ");
    return (
      <svg width="460" height="160" viewBox="0 0 460 160" aria-hidden>
        <line x1="0" y1="110" x2="460" y2="110" stroke={cyan} strokeOpacity="0.18" strokeWidth="1" />
        <path
          d={d}
          fill="none"
          stroke={cyan}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeDasharray="900"
          className="gse-cine-anim"
          style={{ animation: "gse-bolt 1100ms ease-out forwards", filter: `drop-shadow(0 0 8px ${cyan}aa)` }}
        />
        <circle cx={(5 * step).toFixed(1)} cy={(110 - (40 - 20) * 2).toFixed(1)} r="4" fill={mag} style={{ filter: `drop-shadow(0 0 8px ${mag})` }} />
      </svg>
    );
  }
  if (kind === 7) {
    // constellation — scattered nodes wired into a structure (signal from noise)
    const nodes = [
      [60, 70], [130, 130], [110, 220], [200, 90], [240, 200],
      [300, 140], [360, 70], [380, 210], [430, 130],
    ] as const;
    const edges = [
      [0, 1], [1, 3], [3, 5], [5, 6], [5, 8], [1, 2], [2, 4], [4, 5], [6, 8], [4, 7],
    ] as const;
    return (
      <svg width="480" height="280" viewBox="0 0 480 280" aria-hidden>
        {edges.map(([a, b], i) => (
          <line
            key={`e${i}`}
            x1={nodes[a]![0]}
            y1={nodes[a]![1]}
            x2={nodes[b]![0]}
            y2={nodes[b]![1]}
            stroke={uv}
            strokeOpacity="0.5"
            strokeWidth="1"
          />
        ))}
        {nodes.map(([x, y], i) => (
          <circle
            key={`n${i}`}
            cx={x}
            cy={y}
            r={i === 5 ? 5 : 3}
            fill={i === 5 ? cyan : BRAND_COLORS.ionWhite}
            fillOpacity={i === 5 ? 1 : 0.65}
            style={i === 5 ? { filter: `drop-shadow(0 0 8px ${cyan})` } : undefined}
          />
        ))}
      </svg>
    );
  }
  // kind === 8 — heatmap grid; one cell ignites as the located edge
  return (
    <div className="w-full max-w-lg px-8">
      <div className="grid grid-cols-8 gap-1.5">
        {Array.from({ length: 32 }).map((_, i) => {
          const hot = i === 19;
          const warm = i === 18 || i === 20 || i === 11 || i === 27;
          const bg = hot ? `${cyan}cc` : warm ? `${uv}55` : `rgba(255,255,255,${0.04 + (i % 5) * 0.02})`;
          return (
            <span
              key={i}
              className="aspect-square rounded-sm"
              style={{ background: bg, boxShadow: hot ? `0 0 12px ${cyan}aa` : undefined }}
            />
          );
        })}
      </div>
      <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-[0.3em] text-ink-500">edge surface · located</p>
    </div>
  );
}
