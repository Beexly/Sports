"use client";

/**
 * LivePoolEmpty — the honest empty state a fantasy tool shows when projections are
 * LIVE but the graded pool came back empty or the source was unavailable. The
 * doctrine: real data or an honest "source unavailable" state — never a silent
 * fall-back to the illustrative pool presented as live.
 */

export function LivePoolEmpty({
  message = "The live graded pool is unavailable right now, so this tool has nothing real to show. Rather than fall back to illustrative data and present it as live, it stays empty until the source returns.",
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
