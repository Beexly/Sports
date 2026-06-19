/**
 * Shimmer loading skeleton — pure CSS, zero dependencies.
 * Uses CSS @keyframes gradient sweep for the shimmer effect.
 * Pattern from the HARVEST_UI_DATAVIZ.md catalog (A3).
 */

interface ShimmerSkeletonProps {
  /** Tailwind height class, e.g. "h-4" */
  height?: string;
  /** Tailwind width class, e.g. "w-full" */
  width?: string;
  /** Tailwind border-radius class, e.g. "rounded" */
  rounded?: string;
  /** CSS className override */
  className?: string;
}

export function ShimmerSkeleton({
  height = "h-4",
  width = "w-full",
  rounded = "rounded",
  className,
}: ShimmerSkeletonProps) {
  return (
    <div
      className={[
        "relative overflow-hidden bg-white/5",
        height,
        width,
        rounded,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-hidden="true"
    >
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </div>
  );
}

/** Multi-line skeleton block for text placeholders */
export function ShimmerText({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={["space-y-2", className].filter(Boolean).join(" ")}>
      {Array.from({ length: lines }, (_, i) => (
        <ShimmerSkeleton
          key={i}
          height="h-3"
          width={i === lines - 1 ? "w-3/4" : "w-full"}
        />
      ))}
    </div>
  );
}

/** Card-shaped skeleton for pick cards, stat blocks */
export function ShimmerCard({ className }: { className?: string }) {
  return (
    <div
      className={["space-y-3 rounded-xl bg-white/5 p-4", className]
        .filter(Boolean)
        .join(" ")}
    >
      <ShimmerSkeleton height="h-5" width="w-2/3" />
      <ShimmerText lines={2} />
      <ShimmerSkeleton height="h-8" rounded="rounded-lg" />
    </div>
  );
}
