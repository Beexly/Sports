"use client";

/**
 * MontageEntrance — Galaxy Sports Edge's single cinematic cold-open.
 *
 * The official approved brand reveal (Brand Bible v1.0): the orbit forms, the
 * comet streaks, the signal ignites, and the "GALAXY SPORTS EDGE" wordmark
 * resolves in chrome — with sound. One breathtaking arrival, then it dissolves
 * to reveal the site.
 *
 * Behavior:
 *  - Plays the approved reveal MP4 (`/brand/gse-reveal.mp4`), letterboxed on
 *    obsidian so the full wordmark is never cropped.
 *  - Autoplay is MUTED by default (browser policy), with a tasteful unmute so
 *    visitors can hear the sting. No unmuted autoplay is ever attempted.
 *  - Plays once per session (sessionStorage). `?intro=play` force-replays it
 *    (wired to the footer "Replay intro"); `?intro=skip` bypasses it.
 *  - Skippable on any key / backdrop click; the controls never skip.
 *  - prefers-reduced-motion → instant dissolve, no video, no audio.
 *  - Resilient: a load error or a max-duration guard dissolves gracefully so a
 *    visitor is never trapped behind the intro.
 */

import { useCallback, useEffect, useRef, useState } from "react";

const SEEN_KEY = "gse-montage-seen-v2";
/** Legacy cinematic-intro flag, still set so any stragglers stay bypassed. */
const CINEMATIC_SEEN_KEY = "gse-entrance-seen-v1";

/** Hard ceiling so a stalled video can never trap the visitor. */
const MAX_DURATION_MS = 8000;
/** Hold after the reveal resolves before dissolving to the site. */
const RESOLVE_HOLD_MS = 650;
/** Dissolve duration — must match the CSS opacity transition below. */
const DISSOLVE_MS = 520;

export function MontageEntrance() {
  const [active, setActive] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [muted, setMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const timers = useRef<number[]>([]);
  const startedRef = useRef(false);
  const finishingRef = useRef(false);

  const clearTimers = useCallback(() => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  }, []);

  // Begin the dissolve, then unmount after the transition completes.
  const finish = useCallback(() => {
    if (finishingRef.current) return;
    finishingRef.current = true;
    clearTimers();
    const video = videoRef.current;
    if (video) {
      try {
        video.pause();
      } catch {
        /* ignore */
      }
    }
    setExiting(true);
    timers.current.push(
      window.setTimeout(() => setActive(false), DISSOLVE_MS),
    );
  }, [clearTimers]);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    // Accessibility always wins: reduced motion gets no cold-open.
    if (reduced) return;

    const search = window.location.search;
    // ?intro=play force-replays the cold-open, overriding the once-per-session
    // gate, so it can always be re-triggered (e.g. the footer "Replay intro").
    const forcePlay = search.includes("intro=play");

    let seen = false;
    try {
      // Per-SESSION gating (not localStorage): every genuine visit gets the
      // hype, while in-session navigation does not replay it.
      seen = sessionStorage.getItem(SEEN_KEY) === "1";
    } catch {
      /* ignore */
    }

    if (!forcePlay && (seen || search.includes("intro=skip"))) return;

    try {
      sessionStorage.setItem(SEEN_KEY, "1");
      sessionStorage.setItem(CINEMATIC_SEEN_KEY, "1");
    } catch {
      /* ignore */
    }

    setActive(true);

    // Hard ceiling — dissolve no matter what if the video never ends.
    timers.current.push(window.setTimeout(() => finish(), MAX_DURATION_MS));

    return () => clearTimers();
  }, [finish, clearTimers]);

  // Once mounted, kick playback (muted autoplay is always permitted).
  useEffect(() => {
    if (!active) return;
    const video = videoRef.current;
    if (!video) return;
    video.play().catch(() => {
      // Autoplay blocked entirely — don't trap the visitor.
      finish();
    });
  }, [active, finish]);

  // Skip on any key or backdrop click (controls stopPropagation separately).
  useEffect(() => {
    if (!active) return;
    const onKey = () => finish();
    window.addEventListener("keydown", onKey, { once: true });
    return () => window.removeEventListener("keydown", onKey);
  }, [active, finish]);

  if (!active) return null;

  const unmute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    const next = !muted;
    setMuted(next);
    video.muted = next;
    if (!next) {
      // The click is a user gesture, so unmuted playback is now permitted.
      video.play().catch(() => {
        /* keep showing the visual even if audio is refused */
      });
    }
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center overflow-hidden transition-opacity ease-out"
      style={{
        background: "#05070B",
        opacity: exiting ? 0 : 1,
        transitionDuration: `${DISSOLVE_MS}ms`,
      }}
      onClick={finish}
      role="dialog"
      aria-label="Entering Galaxy Sports Edge"
    >
      {/* The approved cinematic reveal — letterboxed so the wordmark is never
          cropped; obsidian frame reads as a premium cinematic bar. */}
      <video
        ref={videoRef}
        className="h-full w-full object-contain"
        src="/brand/gse-reveal.mp4"
        poster="/brand/gse-reveal-poster.png"
        muted={muted}
        playsInline
        preload="metadata"
        onEnded={() =>
          timers.current.push(window.setTimeout(() => finish(), RESOLVE_HOLD_MS))
        }
        onError={finish}
        aria-hidden="true"
      />

      {/* Subtle vignette for depth without dimming the chrome. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 70% at 50% 50%, transparent 58%, rgba(5,7,11,0.55) 100%)",
        }}
      />

      {/* Control bar — unmute + skip. stopPropagation so they never trigger the
          backdrop skip. */}
      <div className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 items-center gap-3">
        <button
          type="button"
          onClick={unmute}
          className="inline-flex items-center gap-2 rounded-full border border-mineral bg-obsidian/60 px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-ion-1 backdrop-blur transition-colors hover:text-ion-white"
          aria-pressed={!muted}
        >
          {muted ? "♪ Unmute" : "♪ Mute"}
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            finish();
          }}
          className="inline-flex items-center rounded-full border border-mineral bg-obsidian/60 px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-ion-2 backdrop-blur transition-colors hover:text-ion-white"
        >
          Skip ▸
        </button>
      </div>

      {/* Quiet hint, top-right. */}
      <p className="absolute right-5 top-5 z-10 font-mono text-[10px] uppercase tracking-[0.3em] text-ion-2">
        Press any key to enter
      </p>
    </div>
  );
}
