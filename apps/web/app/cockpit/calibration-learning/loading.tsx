/**
 * Route-level loading fallback for the Calibration Learning workbench.
 *
 * Rendered inside the cockpit layout's <main> while the server component awaits
 * the never-throw loader, so it mirrors the page's content-block shape (header +
 * honesty frame + metric grid + section cards) rather than a full-screen layout.
 * Purely decorative: it asserts no figure and carries no data — it is a
 * placeholder, so it must never read as a real (and therefore fabricated) zero.
 */
export default function CalibrationLearningLoading(): JSX.Element {
  return (
    <div
      className="flex flex-col gap-6"
      role="status"
      aria-busy="true"
      aria-label="Loading the Calibration Learning workbench"
    >
      <span className="sr-only">Loading the Calibration Learning workbench…</span>

      {/* Header skeleton */}
      <div className="flex flex-col gap-3" aria-hidden>
        <div className="h-3 w-48 animate-pulse rounded bg-white/[0.06]" />
        <div className="h-7 w-80 animate-pulse rounded-lg bg-white/[0.08]" />
        <div className="h-4 w-full max-w-3xl animate-pulse rounded bg-white/[0.05]" />
        <div className="h-4 w-2/3 max-w-2xl animate-pulse rounded bg-white/[0.05]" />
        {/* The honesty frame placeholder keeps the "read this first" block reserved. */}
        <div className="h-24 w-full animate-pulse rounded-lg border border-rose-500/20 bg-rose-950/20" />
      </div>

      {/* Headline metric grid skeleton */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-hidden>
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg border border-white/[0.06] bg-obsidian/60 px-4 py-3"
          >
            <div className="h-2.5 w-24 animate-pulse rounded bg-white/[0.06]" />
            <div className="mt-2 h-5 w-16 animate-pulse rounded bg-white/[0.08]" />
          </div>
        ))}
      </div>

      {/* Contingency + correlation section skeletons */}
      {Array.from({ length: 2 }).map((_, i) => (
        <div
          key={i}
          className="rounded-lg border border-white/[0.06] bg-obsidian/60 p-4"
          aria-hidden
        >
          <div className="h-4 w-56 animate-pulse rounded bg-white/[0.08]" />
          <div className="mt-3 space-y-2">
            <div className="h-3 w-full animate-pulse rounded bg-white/[0.05]" />
            <div className="h-3 w-5/6 animate-pulse rounded bg-white/[0.05]" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-white/[0.05]" />
          </div>
        </div>
      ))}
    </div>
  );
}
