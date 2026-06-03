/**
 * Root loading skeleton — the Suspense fallback shown during route
 * transitions before the next segment streams in. Prevents a blank flash and
 * keeps perceived performance high. Server component; the pulse animation
 * collapses to a static placeholder under prefers-reduced-motion via the
 * global rule in globals.css.
 */
export default function Loading() {
  return (
    <div
      role="status"
      aria-label="Loading"
      className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-950 p-6"
    >
      <div className="h-10 w-10 animate-pulse rounded-full border border-gray-700" />
      <div className="h-3 w-40 animate-pulse rounded bg-gray-800" />
      <div className="h-3 w-28 animate-pulse rounded bg-gray-800" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
