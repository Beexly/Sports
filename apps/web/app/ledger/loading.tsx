function NavStub() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.10] bg-obsidian/90 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <div className="h-5 w-32 animate-pulse rounded bg-white/[0.08]" />
        <div className="flex flex-1 items-center gap-3">
          {[48, 56, 44].map((w, i) => (
            <div key={i} className="h-3.5 animate-pulse rounded bg-white/[0.06]" style={{ width: `${w}px` }} />
          ))}
        </div>
        <div className="h-8 w-20 animate-pulse rounded-lg bg-white/[0.06]" />
      </div>
    </header>
  );
}

export default function LedgerLoading() {
  return (
    <div className="min-h-screen bg-obsidian">
      <NavStub />

      {/* Hero */}
      <section className="mx-auto max-w-7xl px-4 pb-12 pt-16 sm:px-6">
        <div className="h-4 w-24 animate-pulse rounded bg-white/[0.06]" />
        <div className="mt-4 h-12 w-3/4 animate-pulse rounded-lg bg-white/[0.08]" />
        <div className="mt-2 h-12 w-1/2 animate-pulse rounded-lg bg-white/[0.08]" />
        <div className="mt-6 h-4 w-full max-w-xl animate-pulse rounded bg-white/[0.06]" />
        <div className="mt-2 h-4 w-2/3 max-w-lg animate-pulse rounded bg-white/[0.06]" />
      </section>

      {/* Proof Section — heading + 3-column stats */}
      <section className="mx-auto max-w-7xl px-4 pb-10 sm:px-6">
        <div className="h-6 w-40 animate-pulse rounded bg-white/[0.08]" />
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-white/[0.06] bg-white/[0.08]/5 p-5"
            >
              {/* Stat value */}
              <div className="h-9 w-24 animate-pulse rounded-lg bg-white/[0.08]" />
              {/* Stat label */}
              <div className="mt-3 h-3.5 w-28 animate-pulse rounded bg-white/[0.06]" />
            </div>
          ))}
        </div>
      </section>

      {/* Ledger Table — 8 rows */}
      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
        <div className="overflow-hidden rounded-2xl border border-white/[0.06]">
          {/* Table header */}
          <div className="grid grid-cols-7 gap-4 border-b border-white/[0.06] bg-white/[0.08]/5 px-5 py-3">
            {[80, 56, 72, 64, 56, 96, 60].map((w, i) => (
              <div
                key={i}
                className="h-3 animate-pulse rounded bg-white/[0.06]"
                style={{ width: `${w}%` }}
              />
            ))}
          </div>

          {/* Table rows */}
          {Array.from({ length: 8 }).map((_, rowIdx) => (
            <div
              key={rowIdx}
              className="grid grid-cols-7 items-center gap-4 border-b border-white/[0.10]/20 px-5 py-4 last:border-b-0"
            >
              {/* Matchup name */}
              <div className="h-4 w-36 animate-pulse rounded bg-white/[0.08]" />
              {/* Sport badge */}
              <div className="h-5 w-14 animate-pulse rounded-full bg-white/[0.06]" />
              {/* Selection */}
              <div className="h-4 w-24 animate-pulse rounded bg-white/[0.06]" />
              {/* Result badge */}
              <div className="h-5 w-12 animate-pulse rounded-full bg-white/[0.05]" />
              {/* Date */}
              <div className="h-3.5 w-20 animate-pulse rounded bg-white/[0.05]" />
              {/* Confidence bar */}
              <div className="h-2.5 w-full animate-pulse rounded-full bg-white/[0.04]" />
              {/* Model version */}
              <div className="h-3.5 w-16 animate-pulse rounded bg-white/[0.04]" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
