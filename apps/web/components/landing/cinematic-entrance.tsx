"use client";

/**
 * CinematicEntrance — the galaxy traversal cold open for Galaxy Sports Edge.
 *
 * Not a hero section: a mission-control boot that jumps to warp and FLIES the
 * visitor through the Galaxy itself — past the system's real destinations
 * (Board, Galaxy Twin, Trend Lab, Parlay MRI, No-Bet Gate, Decision Autopsy,
 * The Beat, Fantasy Galaxy, the Optimizer, the Academy) — before the light
 * decelerates and converges into the GSE identity. The overlay then dissolves
 * into the live nebula hero behind it (the cinematic object becomes the UI).
 *
 * Modes:
 *  - First visit  → full ~25s cinematic (boot → warp traversal → arrival → identity → handoff).
 *  - Return visit → compressed ~6s jump (localStorage flag): short warp, no waypoint tour.
 *  - Power user   → Skip (always available) jumps straight to the world.
 *  - Opted out    → "Don't show again" on the handoff sets gse-intro-disabled;
 *    the entrance bypasses itself entirely on later visits.
 *  - Reduced motion → static identity + entry choices, instant, no flashing.
 *  - #enter deep-link or ?intro=skip → bypass entirely.
 *
 * WORLD HANDSHAKE: every waypoint passed during warp is a real module of the
 * Galaxy public world (docs/design/GALAXY_2026_PUBLIC_WORLD.md) — the intro is
 * a flyover of the map the visitor is about to land on, and the exit links open
 * the world's primary doors (Board · Galaxy Twin · Fantasy · The Beat).
 *
 * DOCTRINE: no fake odds/teams/wins presented as real. Waypoint copy is the
 * brand's honest philosophy ("Every edge earns a receipt.", "Sometimes the
 * sharpest pick is no pick."). The CSS warp is the instant base layer; the
 * WebGL particle nebula (WarpNebulaLazy) fades in over it when its chunk
 * lands. All geometry is deterministic (no render-time randomness).
 *
 * PERFORMANCE CONTRACT (the intro must never lag):
 *  - The heavy layers (star tunnel, destination orb, waypoint flybys, boot
 *    stars) are module-level memo() components — the transmission tick
 *    re-renders ONLY the transmission line, never the 72 streaks.
 *  - Steering writes CSS variables through one rAF-throttled handler;
 *    zero React re-renders per mousemove.
 *  - No filter/blur animations (compositor-only transform + opacity).
 *
 * Accessibility: role="dialog", focus-managed Skip, Escape to skip, body scroll
 * locked while open, polite live-region announce. No audio.
 */

import { memo, useCallback, useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import Link from "next/link";
import { BRAND_COLORS, BRAND_NAME, BRAND_MONOGRAM } from "@/lib/brand";
import { WarpNebulaLazy } from "@/components/landing/warp-nebula-lazy";

const SEEN_KEY = "gse-entrance-seen-v1";
/** Set via "Don't show this intro again" on the handoff — full bypass. */
const DISABLED_KEY = "gse-intro-disabled";

type Phase = "boot" | "warp" | "arrival" | "identity" | "handoff" | "done";

/* ── Cinematic timeline (first visit, from warp engage) ──────────────────
 * Engage → 20s of traversal → 2.6s arrival brake → 3s identity soak →
 * handoff. With the boot phase (auto-engage at 9s if the visitor never
 * holds), the full ride runs ~23–29s. This is a film, not a loading
 * screen — Skip and "don't show again" are always one click away. */
const WARP_MS = 20000;
const ARRIVAL_MS = WARP_MS + 2600; // 22600
const HANDOFF_MS = ARRIVAL_MS + 3000; // 25600
const BOOT_AUTO_ENGAGE_MS = 9000;
const TRANSMISSION_TICK_MS = 3800;

const BOOT = [
  "SYSTEM BOOT",
  "DATA SOURCES ONLINE",
  "ODDS FEEDS SYNCING",
  "MODEL RUNS READY",
  "RISK LAYER ACTIVE",
  "NO-BET ENGINE ARMED",
  "COURSE PLOTTED · ENGAGE",
] as const;

/** Doctrine transmissions that ride the top of the screen during warp. */
const TRANSMISSIONS = [
  "EVERY MARKET TELLS A STORY",
  "NOISE IN · SIGNAL OUT",
  "CONFIDENCE IS NOT EVIDENCE",
  "THE EDGE IS KNOWING WHAT NOT TO TRUST",
  "SIGNAL ACQUIRED",
] as const;

/**
 * The traversal — destinations of the Galaxy public world, flown past in
 * order. Each is a real route the visitor can open after landing; the intro
 * references the parts of the system they have not seen yet.
 */
type Waypoint = {
  label: string;
  line: string;
  href: string;
  tone: "cyan" | "uv" | "plasma" | "white";
  /** lateral exit vector (vw/vh units) — which edge the waypoint sweeps past */
  x: number;
  y: number;
};

const WAYPOINTS: readonly Waypoint[] = [
  { label: "THE BOARD", line: "Every edge earns a receipt.", href: "/board", tone: "cyan", x: -34, y: -12 },
  { label: "GALAXY TWIN", line: "The slate as a living market map.", href: "/observatory", tone: "uv", x: 36, y: -16 },
  { label: "TREND LAB", line: "Trends that survive the math.", href: "/trends", tone: "cyan", x: -38, y: 14 },
  { label: "PARLAY MRI", line: "Stacked risk, made visible.", href: "/parlay-mri", tone: "plasma", x: 34, y: 16 },
  { label: "NO-BET GATE", line: "Sometimes the sharpest pick is no pick.", href: "/board", tone: "white", x: -30, y: -18 },
  { label: "DECISION AUTOPSY", line: "Losses dissected in public.", href: "/performance/losses", tone: "plasma", x: 32, y: -10 },
  { label: "THE BEAT", line: "Reporting, reliability-scored.", href: "/the-beat", tone: "uv", x: -36, y: 12 },
  { label: "FANTASY GALAXY", line: "Draft, lineups, waivers — your league, twinned.", href: "/fantasy", tone: "cyan", x: 38, y: 12 },
  { label: "THE OPTIMIZER", line: "Floor vs ceiling, glass-box.", href: "/optimizer", tone: "white", x: -32, y: 16 },
  { label: "THE ACADEMY", line: "Train the pass. Graded on process.", href: "/academy", tone: "uv", x: 30, y: -14 },
] as const;

/* Each waypoint OWNS the screen — it approaches from deep space, hangs
 * near full size long enough to actually read twice, then sweeps past.
 * The last door exits right as the arrival brake fires. */
const WAYPOINT_STEP_MS = 1550;
const WAYPOINT_FLY_MS = 5400;

/**
 * Deterministic warp starfield — golden-angle spray so the field reads as a
 * tunnel without render-time randomness (server and client agree exactly).
 */
type WarpStar = { angle: number; duration: number; delay: number; hue: "white" | "cyan" | "uv"; thickness: number };

const WARP_STARS: readonly WarpStar[] = Array.from({ length: 72 }, (_, i) => ({
  angle: (i * 137.508) % 360,
  duration: 2.6 + (i % 7) * 0.38, // near-weightless glide — stars, not strobes
  delay: -((i * 0.137) % 3.4),
  hue: i % 9 === 0 ? "cyan" : i % 13 === 0 ? "uv" : "white",
  thickness: i % 5 === 0 ? 2 : 1,
}));

/** Slow ambient stars for the boot phase — the galaxy is already out there. */
const AMBIENT_STARS: readonly { left: number; top: number; size: number; delay: number }[] = Array.from(
  { length: 40 },
  (_, i) => ({
    left: ((i * 137.508) % 100 + 100) % 100,
    top: ((i * 61.803) % 100 + 100) % 100,
    size: i % 7 === 0 ? 2 : 1,
    delay: -((i * 0.41) % 6),
  }),
);

const cyan = BRAND_COLORS.orbitalCyan;
const mag = BRAND_COLORS.ionMagenta;
const uv = BRAND_COLORS.softUltraviolet;
const white = BRAND_COLORS.ionWhite;
const toneColor: Record<Waypoint["tone"], string> = { cyan, uv, plasma: mag, white };

/** Parallax style — reads the CSS vars the steering handler writes. */
const par = (depth: number) => ({
  transform: `translate3d(calc(var(--par-x, 0) * ${depth}px), calc(var(--par-y, 0) * ${depth}px), 0)`,
  willChange: "transform" as const,
});

/* ── Memoized heavy layers ────────────────────────────────────────────────
 * These never receive new props mid-phase, so React skips them entirely on
 * every transmission tick. This is the lag fix: the old version reconciled
 * all 72 streak spans + 10 waypoint cards every 1.2 seconds. */

const BootStars = memo(function BootStars() {
  return (
    <div aria-hidden className="absolute inset-0" style={par(4)}>
      {AMBIENT_STARS.map((s, i) => (
        <span
          key={i}
          className="gse-cine-anim absolute rounded-full"
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: s.size,
            height: s.size,
            background: white,
            opacity: 0.5,
            animation: "gse-star-breathe 6s ease-in-out infinite",
            animationDelay: `${s.delay}s`,
          }}
        />
      ))}
    </div>
  );
});

const StarTunnel = memo(function StarTunnel({ arrival }: { arrival: boolean }) {
  return (
    <div aria-hidden className="absolute inset-0" style={par(26)}>
      {/* slow camera roll — the whole tunnel banks a few degrees and back,
          which sells "flying" more than any individual streak can */}
      <div
        className="gse-cine-anim absolute inset-0"
        style={{ animation: "gse-camera-roll 24s ease-in-out infinite alternate", willChange: "transform" }}
      >
      {WARP_STARS.map((s, i) => (
        <span
          key={i}
          className="gse-cine-anim absolute left-1/2 top-1/2"
          style={{
            width: 64,
            height: s.thickness,
            transformOrigin: "left center",
            willChange: "transform, opacity",
            // arrival: streaks collapse back to points (deceleration)
            animation: `${arrival ? "gse-warp-brake" : "gse-warp-star"} ${s.duration}s linear infinite`,
            animationDelay: `${s.delay}s`,
            ["--ang" as string]: `${s.angle}deg`,
            background: `linear-gradient(90deg, transparent, ${
              s.hue === "cyan" ? cyan : s.hue === "uv" ? uv : white
            })`,
            opacity: 0,
          }}
        />
      ))}
      </div>
    </div>
  );
});

const DestinationOrb = memo(function DestinationOrb({ arrival }: { arrival: boolean }) {
  return (
    <div aria-hidden className="absolute inset-0 flex items-center justify-center" style={par(10)}>
      <div
        className="gse-cine-anim relative h-40 w-40"
        style={{
          // blooms across the whole traversal; snaps the rest of the way on arrival
          animation: `gse-core-glow ${arrival ? "0.9s" : `${WARP_MS / 1000}s`} ease-in forwards`,
          willChange: "transform, opacity",
        }}
      >
        {/* core bloom */}
        <span
          className="absolute inset-0 rounded-full"
          style={{
            background: `radial-gradient(circle at 42% 38%, ${white}f2 0%, ${cyan}b8 22%, ${uv}55 48%, transparent 70%)`,
            filter: "saturate(1.2)",
          }}
        />
        {/* flowing line streams — two counter-rotating conic veils */}
        <span
          className="gse-cine-anim absolute inset-[6%] rounded-full"
          style={{
            background: `conic-gradient(from 0deg, transparent 0 12%, ${cyan}3d 16%, transparent 24%, ${white}30 38%, transparent 46%, ${uv}44 60%, transparent 70%, ${mag}26 84%, transparent 92%)`,
            animation: "gw-rotate 13s linear infinite",
            maskImage: "radial-gradient(circle, transparent 30%, black 46%, black 66%, transparent 72%)",
            WebkitMaskImage: "radial-gradient(circle, transparent 30%, black 46%, black 66%, transparent 72%)",
          }}
        />
        <span
          className="gse-cine-anim absolute inset-[14%] rounded-full"
          style={{
            background: `conic-gradient(from 180deg, transparent 0 8%, ${white}3d 14%, transparent 26%, ${cyan}33 44%, transparent 56%, ${uv}3d 74%, transparent 86%)`,
            animation: "gw-rotate 19s linear infinite reverse",
            maskImage: "radial-gradient(circle, transparent 22%, black 38%, black 60%, transparent 68%)",
            WebkitMaskImage: "radial-gradient(circle, transparent 22%, black 38%, black 60%, transparent 68%)",
          }}
        />
        {/* particle dust ring */}
        <span
          className="absolute -inset-[14%] rounded-full"
          style={{
            background: `radial-gradient(circle, transparent 52%, ${cyan}14 60%, transparent 64%), radial-gradient(circle, transparent 60%, ${uv}11 70%, transparent 76%)`,
          }}
        />
        {arrival && (
          <span
            className="gse-cine-anim absolute inset-0 rounded-full"
            style={{ animation: "gse-signal-ping 1.2s ease-out infinite", border: `1.5px solid ${cyan}` }}
          />
        )}
      </div>
    </div>
  );
});

const WaypointFlyby = memo(function WaypointFlyby({ onPick }: { onPick: () => void }) {
  return (
    <div className="absolute inset-0" style={par(12)}>
      {WAYPOINTS.map((w, i) => (
        <div
          key={w.label}
          className="gse-cine-anim absolute left-1/2 top-1/2 w-max max-w-[78vw]"
          style={{
            animation: `gse-wp-fly ${WAYPOINT_FLY_MS}ms cubic-bezier(0.16, 0.6, 0.45, 1) both`,
            animationDelay: `${i * WAYPOINT_STEP_MS}ms`,
            ["--wx" as string]: `${w.x}vw`,
            ["--wy" as string]: `${w.y}vh`,
            opacity: 0,
            willChange: "transform, opacity",
          }}
        >
          <Link
            href={w.href}
            tabIndex={-1}
            onClick={onPick}
            className="block rounded-lg border px-4 py-2.5 text-left transition-transform duration-150 hover:scale-105"
            style={{
              borderColor: `${toneColor[w.tone]}55`,
              background: "rgba(5, 6, 8, 0.72)",
              boxShadow: `0 0 28px ${toneColor[w.tone]}22`,
            }}
          >
            <p
              className="font-mono text-[11px] font-semibold uppercase tracking-[0.28em]"
              style={{ color: toneColor[w.tone], textShadow: `0 0 18px ${toneColor[w.tone]}66` }}
            >
              ◈ {w.label}
            </p>
            <p className="mt-1 text-sm text-ink-200">{w.line}</p>
          </Link>
        </div>
      ))}
    </div>
  );
});

export function CinematicEntrance() {
  const [phase, setPhase] = useState<Phase>("boot");
  const [tick, setTick] = useState(0);
  const [tour, setTour] = useState(true);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const timers = useRef<number[]>([]);
  const skipRef = useRef<HTMLButtonElement | null>(null);
  const startedRef = useRef(false);

  const finish = useCallback(() => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current.forEach((t) => window.clearInterval(t));
    timers.current = [];
    setPhase("done");
  }, []);

  const disableForever = useCallback(() => {
    try {
      localStorage.setItem(DISABLED_KEY, "1");
    } catch {
      /* ignore */
    }
    finish();
  }, [finish]);

  // Boot the sequence (once).
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const reduced =
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let seen = false;
    let disabled = false;
    try {
      seen = localStorage.getItem(SEEN_KEY) === "1";
      disabled = localStorage.getItem(DISABLED_KEY) === "1";
    } catch {
      /* ignore */
    }
    if (
      disabled ||
      window.location.hash === "#enter" ||
      window.location.search.includes("intro=skip")
    ) {
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

    // Return visits get a short automatic jump with no waypoint tour.
    setTour(!seen);
    const push = (fn: () => void, at: number) => timers.current.push(window.setTimeout(fn, at));

    if (seen) {
      push(() => setPhase("warp"), 600);
      push(() => setPhase("arrival"), 4600);
      push(() => setPhase("identity"), 5400);
      push(() => setPhase("handoff"), 6400);
      const iv = window.setInterval(() => setTick((t) => t + 1), 1500);
      timers.current.push(iv);
      push(() => window.clearInterval(iv), 4600);
      return;
    }

    // First visit — Unseen-style entry: the visitor CLICK & HOLDs to engage
    // the warp (engageRef fires the chain); if they don't, the system
    // auto-engages so the door never blocks anyone.
    push(() => engageRef.current(), BOOT_AUTO_ENGAGE_MS);
  }, []);

  // Engage the warp (idempotent): clears boot timers and runs the traversal
  // chain relative to NOW — fired by the hold interaction or the fallback.
  const engagedRef = useRef(false);
  const engageRef = useRef<() => void>(() => {});
  engageRef.current = () => {
    if (engagedRef.current) return;
    engagedRef.current = true;
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    const push = (fn: () => void, at: number) => timers.current.push(window.setTimeout(fn, at));
    setPhase("warp");
    push(() => setPhase("arrival"), WARP_MS);
    push(() => setPhase("identity"), ARRIVAL_MS);
    push(() => setPhase("handoff"), HANDOFF_MS);
    const iv = window.setInterval(() => setTick((t) => t + 1), TRANSMISSION_TICK_MS);
    timers.current.push(iv);
    push(() => window.clearInterval(iv), WARP_MS);
  };

  // Click & hold — the charge ring fills for 800ms; releasing early aborts.
  // Engage fires from the timer while held, AND from a duration check on
  // release — so a busy main thread (chunk loads) can never eat a completed
  // hold by running the release handler before the delayed timer.
  const [holding, setHolding] = useState(false);
  const holdTimer = useRef<number | null>(null);
  const holdStart = useRef(0);
  const beginHold = (e: { target: EventTarget | null }) => {
    if (phase !== "boot") return;
    if ((e.target as Element | null)?.closest?.("button, a")) return;
    setHolding(true);
    holdStart.current = performance.now();
    holdTimer.current = window.setTimeout(() => engageRef.current(), 800);
  };
  const endHold = () => {
    setHolding(false);
    if (holdTimer.current !== null) {
      window.clearTimeout(holdTimer.current);
      holdTimer.current = null;
      if (performance.now() - holdStart.current >= 760) engageRef.current();
    }
  };

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

  // Steering: parallax is written straight to CSS variables — zero React
  // re-renders per mousemove — and throttled to one write per frame so a
  // high-polling-rate mouse can't outpace the compositor.
  const steerRaf = useRef(0);
  const steerXY = useRef<[number, number]>([0, 0]);
  const onMove = (e: ReactMouseEvent) => {
    steerXY.current = [
      (e.clientX / window.innerWidth - 0.5) * 2,
      (e.clientY / window.innerHeight - 0.5) * 2,
    ];
    if (steerRaf.current) return;
    steerRaf.current = requestAnimationFrame(() => {
      steerRaf.current = 0;
      const el = rootRef.current;
      if (!el) return;
      el.style.setProperty("--par-x", String(steerXY.current[0]));
      el.style.setProperty("--par-y", String(steerXY.current[1]));
    });
  };
  useEffect(() => () => cancelAnimationFrame(steerRaf.current), []);

  const transmission = useMemo(
    () => TRANSMISSIONS[Math.min(tick, TRANSMISSIONS.length - 1)]!,
    [tick],
  );

  if (phase === "done") return null;

  const showBoot = phase === "boot";
  const showWarp = phase === "warp";
  const showArrival = phase === "arrival";
  const showIdentity = phase === "identity" || phase === "handoff";
  const showHandoff = phase === "handoff";

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Entering ${BRAND_NAME}`}
      onMouseMove={onMove}
      onPointerDown={beginHold}
      onPointerUp={endHold}
      onPointerLeave={endHold}
      className="fixed inset-0 z-[70] overflow-hidden"
      style={{ background: BRAND_COLORS.obsidianBlack }}
    >
      <span className="sr-only" role="status">
        Entering {BRAND_NAME}. Traversing the galaxy toward the signal.
      </span>

      {/* atmosphere */}
      <div aria-hidden className="gse-vignette" />
      <div aria-hidden className="gse-grain" />

      {/* nebula depth — ultraviolet + plasma weather, breathing through every phase */}
      <div
        aria-hidden
        className="gse-cine-anim pointer-events-none absolute -left-1/4 top-[-20%] h-[80vh] w-[80vw] rounded-full"
        style={{
          animation: "gse-nebula-drift 14s ease-in-out infinite alternate",
          background: `radial-gradient(closest-side, ${uv}2e, transparent 72%)`,
        }}
      />
      <div
        aria-hidden
        className="gse-cine-anim pointer-events-none absolute bottom-[-25%] right-[-15%] h-[70vh] w-[70vw] rounded-full"
        style={{
          animation: "gse-nebula-drift 17s ease-in-out infinite alternate-reverse",
          background: `radial-gradient(closest-side, ${mag}1f, transparent 72%)`,
        }}
      />

      {/* ── BOOT — the galaxy idles outside the cockpit glass ──────────── */}
      {showBoot && (
        <div className="absolute inset-0">
          <BootStars />
          <div className="absolute inset-0 flex items-center justify-center p-8">
            <div className="w-full max-w-md font-mono text-sm" style={par(6)}>
              <p className="mb-5 text-xs uppercase tracking-[0.3em]" style={{ color: cyan }}>
                {"// galaxy sports edge · mission control"}
              </p>
              <ul className="space-y-2">
                {BOOT.map((line, i) => (
                  <li
                    key={line}
                    className="gse-cine-anim flex items-center justify-between"
                    style={{ animation: "gse-boot-line 600ms ease-out both", animationDelay: `${i * 460}ms` }}
                  >
                    <span className="text-ink-300">{line}</span>
                    <span style={{ color: cyan }}>OK</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Unseen-style entry: click & hold charges the warp drive. The
              ring fills while held; auto-engage covers everyone else. */}
          {tour && (
            <div className="pointer-events-none absolute inset-x-0 bottom-14 flex flex-col items-center gap-3">
              <span className="relative flex h-12 w-12 items-center justify-center">
                <span
                  aria-hidden
                  className="absolute inset-0 rounded-full border"
                  style={{ borderColor: `${cyan}40` }}
                />
                <span
                  aria-hidden
                  className="gse-cine-anim absolute inset-0 rounded-full"
                  style={{
                    border: `2px solid ${cyan}`,
                    clipPath: "inset(0 0 0 0)",
                    opacity: holding ? 1 : 0,
                    transform: holding ? "scale(1)" : "scale(0.7)",
                    animation: holding ? "gse-hold-charge 800ms linear forwards" : "none",
                    boxShadow: `0 0 24px ${cyan}66`,
                  }}
                />
                <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: cyan, boxShadow: `0 0 12px ${cyan}` }} />
              </span>
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-ink-300">
                {holding ? "charging…" : "click & hold to engage warp"}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── WARP TRAVERSAL — flying through the galaxy, past the system ── */}
      {(showWarp || showArrival) && (
        <div className="absolute inset-0" style={{ perspective: "600px" }}>
          {/* particle nebula — the BlueYard-class WebGL tier. Streams during
              warp, decelerates to galactic idle on arrival. The CSS streaks
              below are the instant base layer; this fades in over them. */}
          <WarpNebulaLazy mode={showArrival ? "idle" : "warp"} />
          <StarTunnel arrival={showArrival} />
          <DestinationOrb arrival={showArrival} />
          {showWarp && tour && <WaypointFlyby onPick={finish} />}

          {/* doctrine transmission — rides the top of the canopy */}
          {showWarp && (
            <p
              key={`tx-${tick}`}
              className="gse-cine-anim absolute left-1/2 top-[12%] -translate-x-1/2 px-6 text-center font-display"
              style={{
                animation: "gse-flash-in 900ms ease-out both",
                color: white,
                fontSize: "clamp(1.05rem, 2.6vw, 1.7rem)",
                letterSpacing: "0.24em",
                textShadow: `0 0 30px ${cyan}55`,
              }}
            >
              {transmission}
            </p>
          )}

          <p className="absolute bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.3em] text-ink-400">
            {"steer with your cursor · grab a door as it passes // illustrative system map"}
          </p>
        </div>
      )}

      {/* ── IDENTITY + HANDOFF ───────────────────────────────── */}
      {showIdentity && (
        <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
          {/* expanding burst that "becomes" the galaxy behind */}
          <span
            aria-hidden
            className="gse-cine-anim pointer-events-none absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ animation: "gse-form-burst 1100ms ease-out forwards", background: cyan }}
          />

          <div className="gse-cine-anim" style={{ animation: "gse-in 1100ms ease-out both" }}>
            <p
              className="font-arch tabular-nums"
              style={{ fontSize: "clamp(4rem, 14vw, 9rem)", lineHeight: 0.85, color: white, letterSpacing: "0.02em" }}
            >
              {BRAND_MONOGRAM}
            </p>
            <p className="eyebrow mt-3 justify-center" style={{ color: cyan }}>
              {BRAND_NAME}
            </p>
            <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.3em] text-ink-400">
              edge · the decision engine&ensp;|&ensp;network · the signal studio
            </p>
          </div>

          <p
            className="gse-cine-anim mt-7 max-w-xl font-display text-balance text-white"
            style={{ animation: "gse-in 1200ms ease-out both", animationDelay: "500ms", fontSize: "clamp(1.5rem, 4.5vw, 2.75rem)", lineHeight: 1.05 }}
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
                  background: `linear-gradient(110deg, ${cyan}, ${uv})`,
                  boxShadow: `0 0 40px ${cyan}66`,
                }}
              >
                <span aria-hidden className="gse-enter-ring absolute inset-0 rounded-full" style={{ border: `1.5px solid ${cyan}` }} />
                Enter the system
                <span aria-hidden className="transition-transform duration-200 group-hover:translate-x-1">▸</span>
              </button>

              <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
                <Link href="/board" onClick={finish} className="text-ink-300 underline-offset-4 transition-colors hover:text-white hover:underline">
                  Today&apos;s board
                </Link>
                <span aria-hidden className="text-ink-500">·</span>
                <Link href="/observatory" onClick={finish} className="text-ink-300 underline-offset-4 transition-colors hover:text-white hover:underline">
                  Galaxy Twin
                </Link>
                <span aria-hidden className="text-ink-500">·</span>
                <Link href="/fantasy" onClick={finish} className="text-ink-300 underline-offset-4 transition-colors hover:text-white hover:underline">
                  Fantasy Galaxy
                </Link>
                <span aria-hidden className="text-ink-500">·</span>
                <Link href="/the-beat" onClick={finish} className="text-ink-300 underline-offset-4 transition-colors hover:text-white hover:underline">
                  The Beat
                </Link>
              </div>

              <button
                type="button"
                onClick={disableForever}
                className="mt-1 font-mono text-[10px] uppercase tracking-[0.24em] text-ink-500 underline-offset-4 transition-colors hover:text-ink-300 hover:underline"
              >
                don&apos;t show this intro again
              </button>
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
