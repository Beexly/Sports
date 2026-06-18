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
        <div className="h-8 w-20 animate-pulse rounded-lg bg-titanium/60" />
      </div>
    </header>
  );
}

export default function PlayersLoading() {
  return (
    <div className="min-h-screen bg-obsidian">
      <NavStub />

      {/* Hero */}
      <section className="mx-auto max-w-7xl px-4 pb-8 pt-14 sm:px-6">
        <div className="mb-3 h-5 w-32 animate-pulse rounded-full bg-titanium/60" />
        <div className="mb-3 h-10 w-1/2 animate-pulse rounded-lg bg-titanium" />
        <div className="mb-1.5 h-4 w-2/5 animate-pulse rounded bg-titanium/60" />
        <div className="h-4 w-1/3 animate-pulse rounded bg-titanium/60" />
      </section>

      {/* Source status ribbon */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-6 flex items-center gap-4 rounded-xl border border-titanium bg-carbon/60 px-5 py-3">
          {[72, 100, 88, 60].map((w, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="h-2 w-2 animate-pulse rounded-full bg-titanium/60" />
              <div className="h-3 animate-pulse rounded bg-titanium/60" style={{ width: `${w}px` }} />
            </div>
          ))}
        </div>
      </div>

      {/* Players table */}
      <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6">
        <div className="overflow-hidden rounded-xl border border-titanium bg-carbon">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-4 border-b border-titanium px-5 py-3">
            <div className="h-3.5 w-24 animate-pulse rounded bg-titanium" />
            <div className="h-3.5 w-12 animate-pulse rounded bg-titanium/60" />
            <div className="h-3.5 w-12 animate-pulse rounded bg-titanium/60" />
            <div className="h-3.5 w-12 animate-pulse rounded bg-titanium/60" />
            <div className="h-3.5 w-14 animate-pulse rounded bg-titanium/60" />
          </div>

          {/* Player rows */}
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-4 border-b border-titanium/40 px-5 py-4 last:border-0"
            >
              {/* Avatar + name/position/team */}
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 flex-shrink-0 animate-pulse rounded-full bg-titanium/60" />
                <div className="space-y-1.5">
                  <div className="h-3.5 w-28 animate-pulse rounded bg-titanium" />
                  <div className="flex items-center gap-1.5">
                    <div className="h-3 w-16 animate-pulse rounded bg-titanium/60" />
                    <div className="h-3 w-1 animate-pulse rounded bg-titanium/60" />
                    <div className="h-3 w-20 animate-pulse rounded bg-titanium/60" />
                  </div>
                </div>
              </div>
              {/* Stat columns */}
              <div className="h-4 w-10 animate-pulse rounded bg-titanium/60" />
              <div className="h-4 w-10 animate-pulse rounded bg-titanium/60" />
              <div className="h-4 w-10 animate-pulse rounded bg-titanium/60" />
              {/* Score badge */}
              <div className="h-6 w-14 animate-pulse rounded-full bg-titanium/60" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
