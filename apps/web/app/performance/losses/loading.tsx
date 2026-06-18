function NavStub() {
  return (
    <header className="sticky top-0 z-40 border-b border-titanium bg-obsidian/90 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <div className="h-5 w-32 animate-pulse rounded bg-titanium" />
        <div className="flex flex-1 items-center gap-3">
          {[48, 56, 44].map((w, i) => (
            <div key={i} className="h-3.5 animate-pulse rounded bg-titanium/60" style={{ width: `${w}px` }} />
          ))}
        </div>
      </div>
    </header>
  );
}

function LossRowSkeleton() {
  return (
    <div className="flex items-start gap-4 rounded-xl border border-titanium bg-titanium/5 px-5 py-4">
      {/* Sport indicator / avatar */}
      <div className="mt-0.5 h-10 w-10 flex-shrink-0 animate-pulse rounded-full bg-titanium" />

      <div className="flex-1 space-y-2">
        <div className="flex items-center justify-between gap-4">
          {/* Selection name */}
          <div className="h-4 w-40 animate-pulse rounded bg-titanium" />
          {/* Date */}
          <div className="h-3.5 w-20 animate-pulse rounded bg-titanium/60" />
        </div>

        {/* Result badge */}
        <div className="h-5 w-14 animate-pulse rounded-full bg-titanium/60" />

        {/* Autopsy text lines */}
        <div className="h-3.5 w-full animate-pulse rounded bg-titanium/60" />
        <div className="h-3.5 w-4/5 animate-pulse rounded bg-titanium/60" />
      </div>
    </div>
  );
}

export default function PerformanceLossesLoading() {
  return (
    <div className="min-h-screen bg-obsidian">
      <NavStub />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        {/* Heading skeleton */}
        <div className="mb-2 h-8 w-56 animate-pulse rounded bg-titanium" />
        <div className="mb-8 h-4 w-72 animate-pulse rounded bg-titanium/60" />

        {/* Loss rows */}
        <div className="space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <LossRowSkeleton key={i} />
          ))}
        </div>
      </main>
    </div>
  );
}
