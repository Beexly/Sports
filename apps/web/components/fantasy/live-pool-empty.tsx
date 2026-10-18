"use client";

/**
 * LivePoolEmpty — the honest empty state a fantasy tool shows when projections are
 * LIVE but the graded pool came back empty or the source was unavailable. The
 * doctrine: real data or an honest "source unavailable" state — never a silent
 * fall-back to the illustrative pool presented as live.
 */

export function LivePoolEmpty({
  message = "Live player data isn't available right now. Rather than show sample players as if they were live, this tool stays empty until the data returns.",
}: { message?: string } = {}) {
  return (
    <div
      className="surface-card border-caution/30 p-6 text-sm leading-relaxed text-ion-1"
      role="status"
    >
      <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.18em] text-caution">
        Live source unavailable
      </p>
      <p>{message}</p>
    </div>
  );
}
