/**
 * ToolPageSkeleton — loading affordance for the heavy customer tool routes.
 *
 * Mirrors the standard tool-page shell (bg-carbon canvas, max-w-7xl main) so a
 * navigation into a data-heavy tool paints an on-brand skeleton immediately
 * instead of blocking on a blank screen while the page's loaders run. Used by
 * the route-level `loading.tsx` files (Next App Router Suspense boundary).
 */

const CARD_KEYS = ["a", "b", "c", "d", "e", "f"] as const;

export function ToolPageSkeleton({ label = "Loading" }: { label?: string }) {
  return (
    <div className="min-h-screen bg-carbon text-ion" aria-busy="true" aria-live="polite">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <span className="sr-only">{label}…</span>
        <div className="flex flex-col gap-3">
          <div className="h-3 w-32 animate-pulse rounded bg-white/5" />
          <div className="h-9 w-2/3 max-w-md animate-pulse rounded bg-white/10" />
          <div className="h-4 w-full max-w-2xl animate-pulse rounded bg-white/5" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CARD_KEYS.map((k) => (
            <div key={k} className="h-40 animate-pulse rounded-xl border border-white/5 bg-white/5" />
          ))}
        </div>
      </main>
    </div>
  );
}
