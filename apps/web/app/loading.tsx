/**
 * Root loading skeleton — the Suspense fallback shown during route
 * transitions before the next segment streams in. Prevents a blank flash and
 * keeps perceived performance high. Server component; the pulse animation
 * collapses to a static placeholder under prefers-reduced-motion via the
 * global rule in app/globals.css (`*, *::before, *::after { animation-duration:
 * 0.001ms !important }`). Uses the design-token dark scale (bg-carbon +
 * white/N overlays), matching the existing tool-page skeleton idiom — not
 * legacy Tailwind gray (palette-cohesion.test.ts enforces this repo-wide).
 */
export default function Loading() {
  return (
    <div
      role="status"
      aria-label="Loading"
      className="flex min-h-screen flex-col items-center justify-center gap-4 bg-carbon p-6"
    >
      <div className="h-10 w-10 animate-pulse rounded-full border border-white/10" />
      <div className="h-3 w-40 animate-pulse rounded bg-white/10" />
      <div className="h-3 w-28 animate-pulse rounded bg-white/5" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
