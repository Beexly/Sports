"use client";

/**
 * Signature sound — the Galaxy Sports Edge audio identity.
 *
 * Two delivery paths, in priority order:
 *   1. A real recorded stinger at `/audio/gse-stinger.mp3` (the trademark
 *      "Galaxy Sports Edge / On frequency." voice line, mastered). If the
 *      file exists, it plays. This is the production asset — generate it with
 *      Google Cloud Text-to-Speech (Chirp 3 HD / Studio / Custom Voice) and
 *      drop it in `apps/web/public/audio/`. See docs/data-feeds.md.
 *   2. A WebAudio-synthesized fallback sting (rising cyan shimmer → soft
 *      impact → tail). Ships by default so the identity works with zero
 *      binary assets and never bloats the bundle.
 *
 * Browser autoplay policy: audio with sound can only start from a user
 * gesture. `play()` is therefore wired to the boot screen's ENTER tap — the
 * AudioContext is created inside that gesture, which satisfies the policy.
 *
 * Respects the user: never plays when muted (persisted) or when the user
 * prefers reduced motion.
 */

import { useCallback, useEffect, useRef, useState } from "react";

const MUTE_STORAGE_KEY = "gse-sound-muted";

/**
 * Path to the mastered stinger. Set to `"/audio/gse-stinger.mp3"` once the
 * recorded trademark voice line exists in `apps/web/public/audio/`. While it
 * is `null` we go straight to the synthesized sting and never request a
 * missing file (no 404 on every visit).
 */
const STINGER_SRC: string | null = null;

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function readMuted(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(MUTE_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * Synthesize the fallback sting entirely in the Web Audio API. Called inside
 * the ENTER gesture so the AudioContext is allowed to produce sound.
 *
 * Composition (~1.5s): a cyan "shimmer" sweep (rising sine + detuned saw), a
 * low sub "impact" on the downbeat, and a short filtered-noise whoosh.
 */
function playSynthSting(): void {
  const Ctx =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctx) return;

  const ctx = new Ctx();
  const now = ctx.currentTime;

  const master = ctx.createGain();
  master.gain.setValueAtTime(0.0001, now);
  master.gain.exponentialRampToValueAtTime(0.5, now + 0.04);
  master.gain.exponentialRampToValueAtTime(0.0001, now + 1.5);
  master.connect(ctx.destination);

  // ── Shimmer sweep — the "signal acquiring" rise.
  const sweep = ctx.createOscillator();
  sweep.type = "sine";
  sweep.frequency.setValueAtTime(220, now);
  sweep.frequency.exponentialRampToValueAtTime(880, now + 0.55);
  const sweepGain = ctx.createGain();
  sweepGain.gain.setValueAtTime(0.0001, now);
  sweepGain.gain.exponentialRampToValueAtTime(0.6, now + 0.18);
  sweepGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);
  sweep.connect(sweepGain).connect(master);

  // Detuned saw layered under the sweep for body.
  const saw = ctx.createOscillator();
  saw.type = "sawtooth";
  saw.frequency.setValueAtTime(110, now);
  saw.frequency.exponentialRampToValueAtTime(440, now + 0.55);
  saw.detune.setValueAtTime(8, now);
  const sawGain = ctx.createGain();
  sawGain.gain.setValueAtTime(0.0001, now);
  sawGain.gain.exponentialRampToValueAtTime(0.18, now + 0.2);
  sawGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
  saw.connect(sawGain).connect(master);

  // ── Impact — low sub on the downbeat.
  const sub = ctx.createOscillator();
  sub.type = "sine";
  sub.frequency.setValueAtTime(120, now + 0.5);
  sub.frequency.exponentialRampToValueAtTime(55, now + 0.95);
  const subGain = ctx.createGain();
  subGain.gain.setValueAtTime(0.0001, now + 0.5);
  subGain.gain.exponentialRampToValueAtTime(0.9, now + 0.56);
  subGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.3);
  sub.connect(subGain).connect(master);

  // ── Whoosh — short filtered noise burst into the impact.
  const noiseLen = Math.floor(ctx.sampleRate * 0.5);
  const noiseBuf = ctx.createBuffer(1, noiseLen, ctx.sampleRate);
  const data = noiseBuf.getChannelData(0);
  for (let i = 0; i < noiseLen; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / noiseLen);
  }
  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuf;
  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = "bandpass";
  noiseFilter.frequency.setValueAtTime(900, now);
  noiseFilter.frequency.exponentialRampToValueAtTime(4200, now + 0.5);
  noiseFilter.Q.value = 0.7;
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.0001, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.25, now + 0.12);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
  noise.connect(noiseFilter).connect(noiseGain).connect(master);

  sweep.start(now);
  saw.start(now);
  sub.start(now + 0.5);
  noise.start(now);
  sweep.stop(now + 0.75);
  saw.stop(now + 0.65);
  sub.stop(now + 1.35);
  noise.stop(now + 0.5);

  // Release the context once the tail has rung out.
  window.setTimeout(() => {
    void ctx.close().catch(() => undefined);
  }, 1700);
}

export interface SignatureSound {
  /** Fire the sting. No-op when muted or under reduced-motion. */
  readonly play: () => void;
  readonly muted: boolean;
  readonly toggleMute: () => void;
}

export function useSignatureSound(): SignatureSound {
  const [muted, setMuted] = useState<boolean>(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Hydrate the persisted mute preference after mount (avoids SSR mismatch).
  useEffect(() => {
    setMuted(readMuted());
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(MUTE_STORAGE_KEY, next ? "1" : "0");
      } catch {
        /* storage unavailable — preference is session-only */
      }
      return next;
    });
  }, []);

  const play = useCallback(() => {
    if (muted || prefersReducedMotion()) return;

    // No mastered asset configured yet → synthesized sting.
    if (!STINGER_SRC) {
      playSynthSting();
      return;
    }

    // Prefer the mastered asset; fall back to the synth if it can't play
    // (missing file, decode error, blocked).
    try {
      const audio = audioRef.current ?? new Audio(STINGER_SRC);
      audioRef.current = audio;
      audio.volume = 0.7;
      audio.currentTime = 0;
      const attempt = audio.play();
      if (attempt && typeof attempt.then === "function") {
        attempt.catch(() => playSynthSting());
      }
    } catch {
      playSynthSting();
    }
  }, [muted]);

  return { play, muted, toggleMute };
}
