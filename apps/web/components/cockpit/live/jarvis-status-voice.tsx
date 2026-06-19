"use client";

/**
 * JarvisStatusVoice — one-tap "brief me out loud" for the Live Command Center.
 *
 * The owner's standing ask: "I want to WATCH and HEAR status. I want Jarvis to
 * SPEAK." JarvisChat speaks ANSWERS, but only after you type a question. This
 * component makes Jarvis speak the LIVE OPERATING STATUS on a single tap — and
 * renders the same status on screen, so the deck is watch *and* hear.
 *
 * Honest: every figure is passed in from the real `buildJarvisOperatingAssessment`
 * on the server. This component composes a spoken sentence from those real values
 * and nothing else — no fabricated status.
 *
 * Voice is feature-detected (window.speechSynthesis). Browsers require a user
 * gesture before audio, so speech fires on the button tap — never autoplay. When
 * synthesis is unavailable the button is hidden and the written status still shows.
 * Speech is cancelled on unmount and when toggled off. aria-pressed reflects the
 * speaking state; the written summary carries an aria-live region for AT.
 */

import { useCallback, useEffect, useRef, useState } from "react";

type CompanyHealth = "CRITICAL" | "CAUTION" | "UNKNOWN";

interface JarvisStatusVoiceProps {
  readonly health: CompanyHealth;
  readonly ownerDecisionCount: number;
  readonly staleWarningCount: number;
  readonly nextBestAction: string;
}

function hasSpeechSynthesis(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

const HEALTH_TONE: Readonly<Record<CompanyHealth, { dot: string; label: string }>> = {
  CRITICAL: { dot: "#FF2DD6", label: "critical" },
  CAUTION: { dot: "#FFB454", label: "caution" },
  UNKNOWN: { dot: "#7A5CFF", label: "unknown" },
};

export function JarvisStatusVoice({
  health,
  ownerDecisionCount,
  staleWarningCount,
  nextBestAction,
}: JarvisStatusVoiceProps): JSX.Element {
  const [ttsAvailable, setTtsAvailable] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    setTtsAvailable(hasSpeechSynthesis());
  }, []);

  // Cancel any in-flight speech on unmount.
  useEffect(() => {
    return () => {
      if (hasSpeechSynthesis()) {
        try {
          window.speechSynthesis.cancel();
        } catch {
          /* best-effort */
        }
      }
    };
  }, []);

  // Compose the spoken + written status from the real assessment values only.
  const decisions =
    ownerDecisionCount === 1
      ? "1 decision needs your attention"
      : `${ownerDecisionCount} decisions need your attention`;
  const stale =
    staleWarningCount > 0
      ? `${staleWarningCount} stale-data warning${staleWarningCount === 1 ? "" : "s"}`
      : "no stale-data warnings";
  const tone = HEALTH_TONE[health];
  const written = `Company health is ${tone.label}. ${decisions}. ${stale}. Next best action: ${nextBestAction}`;
  const spoken = `Status report. ${written}`;

  const stop = useCallback(() => {
    if (hasSpeechSynthesis()) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        /* best-effort */
      }
    }
    setSpeaking(false);
  }, []);

  const toggle = useCallback(() => {
    if (!hasSpeechSynthesis()) return;
    if (speaking) {
      stop();
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(spoken);
      utterance.rate = 1;
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);
      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
      setSpeaking(true);
    } catch {
      setSpeaking(false);
    }
  }, [speaking, spoken, stop]);

  return (
    <section
      aria-label="Live status — Jarvis can read it aloud"
      className="flex flex-col gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex min-w-0 items-start gap-3">
        <span
          aria-hidden
          className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ background: tone.dot, boxShadow: `0 0 10px ${tone.dot}` }}
        />
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-accent-300">
            Live status
          </p>
          <p aria-live="polite" className="mt-1 text-sm leading-relaxed text-ink-200">
            {written}
          </p>
        </div>
      </div>
      {ttsAvailable && (
        <button
          type="button"
          onClick={toggle}
          aria-pressed={speaking}
          aria-label={speaking ? "Stop Jarvis speaking" : "Have Jarvis brief you out loud"}
          className={[
            "inline-flex shrink-0 items-center gap-2 self-start rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors sm:self-center",
            speaking
              ? "border-accent-400/60 bg-accent-900/40 text-accent-100"
              : "border-accent-500/40 bg-accent-900/30 text-accent-200 hover:bg-accent-900/50",
          ].join(" ")}
        >
          <span aria-hidden>{speaking ? "■" : "🔊"}</span>
          {speaking ? "Stop" : "Jarvis — brief me out loud"}
        </button>
      )}
    </section>
  );
}
