import { ToolPageSkeleton } from "@/components/ui/tool-page-skeleton";

/**
 * Root loading boundary — the app's floor for "something is on screen".
 *
 * Without this file, a segment with no `loading.tsx` of its own has no Suspense
 * fallback above it, so Next has nothing to flush while the page awaits. On
 * `app/page.tsx` — force-dynamic, and awaiting loadBoardState() +
 * loadPublicCalibrationReport() at the TOP level, above the page's only
 * <Suspense> — a hung Postgres connection means zero bytes of HTML reach the
 * visitor until the platform request timeout fires. The brand's first
 * impression becomes a blank white page. Both loaders catch their errors, but
 * neither has a timeout, so "caught" does not mean "bounded".
 *
 * App Router resolves loading boundaries by inheritance, so this one file
 * covers every segment that does not define its own — measured on the real
 * segment tree: 205 of 235 page segments had no loading boundary above them,
 * 106 of them async. `__tests__/route-boundary-coverage.test.ts` walks the tree
 * and fails if that ever regresses.
 *
 * Segments that want a different shell keep overriding it locally (the 16 tool
 * routes already do, and /embed opts out of chrome entirely).
 */
export default function Loading() {
  return <ToolPageSkeleton label="Loading Galaxy Sports Edge" />;
}
