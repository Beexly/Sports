"use client";

/**
 * BootSequence — the cinematic entrance.
 *
 * A full-screen "system coming online" overlay in the mission-control/JARVIS
 * spirit: the galaxy mark draws itself, boot telemetry types in, a scan line
 * sweeps the wordmark, and an ENTER affordance launches the site — firing the
 * signature sound on that tap (the only way audio can carry sound under
 * browser autoplay policy).
 *
 * Discipline:
 *   - Plays at most ONCE per browser session (sessionStorage), so internal
 *     navigation never replays it.
 *   - `prefers-reduced-motion` → no overlay, no sound, no animation. The user
 *     lands straight on the site.
 *   - Skippable at any time; ESC also skips. Focus moves to ENTER when ready.
 *
 * Mounted once in app/layout.tsx above {children}. Styling lives in
 * styles/pickpilot-kit.css under `.gse-boot*` (reusing the gse-intro keyframes).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { BRAND_NAME } from "@/lib/brand";
import { GalaxyMark } from "@/components/brand/brand-lockup";
import { useSignatureSound } from "./use-signature-sound";

const SESSION_KEY = "gse-booted";

const TELEMETRY: readonly string[] = [
  "Initializing signal array",
  "Syncing live board · 7 sports",
  "Calibration model online",
  "Market telemetry locked",
];

/** ms between each telemetry line revealing. */
const LINE_CADENCE = 520;
/** ms the dissolve transition runs (mirror the CSS opacity transition). */
const LAUNCH_MS = 820;

type Stage = "hidden" | "booting" | "ready" | "launching";

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function alreadyBooted(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.sessionStorage.getItem(SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

function markBooted(): void {
  try {
    window.sessionStorage.setItem(SESSION_KEY, "1");
  } catch {
    /* storage unavailable — overlay simply may replay next mount */
  }
}

export function BootSequence(): JSX.Element | null {
  const [stage, setStage] = useState<Stage>("hidden");
  const [visibleLines, setVisibleLines] = useState(0);
  const { play, muted, toggleMute } = useSignatureSound();
  const enterRef = useRef<HTMLButtonElement | null>(null);
  const timers = useRef<number[]>([]);

  const clearTimers = useCallback(() => {
    for (const id of timers.current) window.clearTimeout(id);
    timers.current = [];
  }, []);

  // Decide whether to play on first mount.
  useEffect(() => {
    if (alreadyBooted() || prefersReducedMotion()) {
      markBooted();
      return;
    }
    setStage("booting");
    TELEMETRY.forEach((_, i) => {
      timers.current.push(
        window.setTimeout(() => setVisibleLines(i + 1), LINE_CADENCE * (i + 1)),
      );
    });
    timers.current.push(
      window.setTimeout(
        () => setStage("ready"),
        LINE_CADENCE * (TELEMETRY.length + 1),
      ),
    );
    return clearTimers;
  }, [clearTimers]);

  // Move focus to ENTER once the launch gate is live.
  useEffect(() => {
    if (stage === "ready") enterRef.current?.focus();
  }, [stage]);

  const dismiss = useCallback(
    (withSound: boolean) => {
      if (withSound) play();
      clearTimers();
      setStage("launching");
      window.setTimeout(() => {
        markBooted();
        setStage("hidden");
      }, LAUNCH_MS);
    },
    [play, clearTimers],
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") dismiss(false);
      if ((e.key === "Enter" || e.key === " ") && stage === "ready") {
        e.preventDefault();
        dismiss(true);
      }
    },
    [dismiss, stage],
  );

  if (stage === "hidden") return null;

  return (
    <div
      className="gse-boot"
      data-state={stage}
      data-testid="boot-sequence"
      role="dialog"
      aria-modal="true"
      aria-label={`${BRAND_NAME} — system start`}
      onKeyDown={onKeyDown}
    >
      <div className="gse-boot__grid" aria-hidden="true" />

      <div className="gse-boot__controls">
        <button
          type="button"
          className="gse-boot__chip"
          data-testid="boot-mute"
          aria-pressed={muted}
          onClick={toggleMute}
        >
          {muted ? "Sound off" : "Sound on"}
        </button>
        <button
          type="button"
          className="gse-boot__chip"
          data-testid="boot-skip"
          onClick={() => dismiss(false)}
        >
          Skip
        </button>
      </div>

      <div className="gse-boot__core">
        <div className="gse-boot__mark brand-mark" aria-hidden="true">
          <GalaxyMark />
        </div>
        <div className="gse-boot__scan" aria-hidden="true" />
        <div className="gse-boot__wordmark">{BRAND_NAME}</div>
        <div className="gse-boot__frequency">On frequency.</div>

        <ul className="gse-boot__telemetry" aria-hidden="true">
          {TELEMETRY.map((line, i) => (
            <li
              key={line}
              className="gse-boot__line"
              data-shown={i < visibleLines ? "1" : "0"}
            >
              <span className="gse-boot__tick">›</span> {line}
            </li>
          ))}
        </ul>

        <button
          type="button"
          ref={enterRef}
          className="gse-boot__enter"
          data-testid="boot-enter"
          data-ready={stage === "ready" ? "1" : "0"}
          onClick={() => dismiss(true)}
          disabled={stage !== "ready"}
        >
          Enter
        </button>
      </div>
    </div>
  );
}
