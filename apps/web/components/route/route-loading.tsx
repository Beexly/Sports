/**
 * Shared per-segment loading state. Server component (no client JS).
 * Each route's `loading.tsx` exports a thin wrapper that supplies the
 * segment label. Renders a low-key skeleton — no spinning gradients,
 * no hype copy.
 */

export interface RouteLoadingProps {
  readonly segment: string;
  /** Optional row count for the skeleton list (default 3). */
  readonly rows?: number;
}

export function RouteLoading({ segment, rows = 3 }: RouteLoadingProps) {
  return (
    <div
      data-testid={`route-loading-${segment}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="mx-auto my-8 max-w-3xl space-y-3"
    >
      <p className="text-[10px] uppercase tracking-widest text-gray-600">
        Loading {segment}…
      </p>
      <div className="h-6 w-3/4 animate-pulse rounded bg-gray-800" />
      <div className="h-4 w-full animate-pulse rounded bg-gray-900" />
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className="h-12 animate-pulse rounded-lg border border-gray-800 bg-gray-900/40"
        />
      ))}
    </div>
  );
}
