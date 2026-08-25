/**
 * ToolPageSkeleton — loading affordance for the heavy customer tool routes.
 *
 * Mirrors the standard tool-page shell (bg-carbon canvas, max-w-7xl main) so a
 * navigation into a data-heavy tool paints an on-brand skeleton immediately
 * instead of blocking on a blank screen while the page's loaders run. Used by
 * the route-level `loading.tsx` files (Next App Router Suspense boundary).
 *
 * The nav bar is part of the skeleton on purpose. `app/layout.tsx` renders no
 * chrome — 90 individual page.tsx files each render their own <Nav />, and zero
 * layouts do. A `loading.tsx` without a nav therefore makes the header vanish
 * and come back on every navigation into /picks, /board, /performance,
 * /players, /trends and /proof, which reads as a full page reload rather than
 * an in-app transition. Painting the bar here keeps the header nailed in place
 * across the transition.
 *
 * NavSkeleton, not Nav: a `loading.tsx` is rendered as a Suspense fallback, and
 * the auth-dependent right rail would drag a cookies() read into it. See
 * components/ui/nav.tsx — the two render identical markup during the loading
 * window.
 *
 * `chrome={false}` is for segments that deliberately ship no site chrome, e.g.
 * the iframe-embedded widgets under /embed.
 */

import { NavSkeleton } from "@/components/ui/nav";

const CARD_KEYS = ["a", "b", "c", "d", "e", "f"] as const;

export function ToolPageSkeleton({
  label = "Loading",
  chrome = true,
}: {
  label?: string;
  chrome?: boolean;
}) {
  return (
    <div className="min-h-screen bg-carbon text-ion" aria-busy="true" aria-live="polite">
      {chrome ? <NavSkeleton /> : null}
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
