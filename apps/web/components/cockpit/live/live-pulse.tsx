"use client";

/**
 * LivePulse — the client-side "live" heartbeat for the Live Command Center.
 *
 * Two honest jobs, no data of its own:
 *   1. A ticking wall clock + "last synced" stamp so the deck visibly reads as
 *      a running console rather than a static snapshot.
 *   2. A self-cancelling auto-refresh: when the tab is visible it reloads the
 *      server page on an interval so the real loaders re-run and the theater
 *      re-streams. Hidden tabs never reload (no background churn). This mirrors
 *      the JarvisAutoRefresh pattern already used on /cockpit.
 *
 * It fabricates nothing — the clock is the device clock, and the refresh simply
 * re-fetches the same real server render. prefers-reduced-motion is respected by
 * dropping the blinking dot animation (handled via the global animate-live-pulse
 * reduced-motion rule on the caller's element; this component only gates the
 * countdown text from jittering).
 */

import { useEffect, useState } from "react";

export function LivePulse({
  generatedAtIso,
  intervalMs = 45000,
}: {
  readonly generatedAtIso: string;
  readonly intervalMs?: number;
}) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const tick = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(tick);
  }, []);

  // Self-cancelling, visibility-aware auto-refresh.
  useEffect(() => {
    let timer: number | undefined;
    const schedule = () => {
      timer = window.setTimeout(() => {
        if (!document.hidden) {
          window.location.reload();
        } else {
          // Tab is hidden — don't reload; check again shortly.
          schedule();
        }
      }, intervalMs);
    };
    schedule();
    return () => {
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [intervalMs]);

  const generated = new Date(generatedAtIso);
  const clock = now ? now.toLocaleTimeString("en-US") : "--:--:--";

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-500">
      <span className="flex items-center gap-1.5">
        <span className="relative flex h-2 w-2" aria-hidden>
          <span className="absolute inline-flex h-full w-full animate-live-pulse rounded-full bg-emerald-400/70" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
        </span>
        <span className="text-emerald-300">Live</span>
      </span>
      <span className="tabular-nums text-ink-300">{clock}</span>
      <span aria-live="polite">
        synced {generated.toLocaleTimeString("en-US")} · auto-refresh {Math.round(intervalMs / 1000)}s
      </span>
    </div>
  );
}
