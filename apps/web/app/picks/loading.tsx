function NavStub() {
  return (
    <header className="sticky top-0 z-40 border-b border-titanium bg-obsidian/90 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <div className="h-5 w-32 animate-pulse rounded bg-titanium" />
        <div className="flex flex-1 items-center gap-3">
          <div className="h-3.5 w-12 animate-pulse rounded bg-titanium/60" />
          <div className="h-3.5 w-16 animate-pulse rounded bg-titanium/60" />
          <div className="h-3.5 w-10 animate-pulse rounded bg-titanium/60" />
        </div>
        <div className="h-8 w-20 animate-pulse rounded-lg bg-titanium/60" />
      </div>
    </header>
  );
}

function FilterSkeleton() {
  return (
    <div className="mb-6 flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {["All", "NFL", "NBA", "MLB", "NHL", "NCAAF"].map((w) => (
          <div
            key={w}
            className="h-11 w-14 animate-pulse rounded-lg bg-titanium first:w-10"
            style={{ width: `${w.length * 10 + 20}px` }}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {[80, 90, 100, 90].map((w, i) => (
          <div
            key={i}
            className="h-8 animate-pulse rounded-full bg-titanium/60"
            style={{ width: `${w}px` }}
          />
        ))}
      </div>
    </div>
  );
}

function PickCardSkeleton() {
  return (
    <div className="rounded-2xl border border-titanium bg-carbon/60 p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="mb-2 flex items-center gap-2">
            <div className="h-4 w-10 animate-pulse rounded bg-titanium" />
            <div className="h-4 w-24 animate-pulse rounded bg-titanium/60" />
          </div>
          <div className="h-5 w-3/4 animate-pulse rounded bg-titanium/80" />
          <div className="mt-1.5 h-4 w-1/2 animate-pulse rounded bg-titanium/50" />
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <div className="h-6 w-20 animate-pulse rounded-full bg-titanium" />
          <div className="h-4 w-14 animate-pulse rounded bg-titanium/60" />
        </div>
      </div>
      <div className="mt-3 h-2 w-full animate-pulse rounded-full bg-titanium/40" />
      <div className="mt-3 space-y-1.5">
        <div className="h-3.5 w-full animate-pulse rounded bg-titanium/30" />
        <div className="h-3.5 w-5/6 animate-pulse rounded bg-titanium/30" />
        <div className="h-3.5 w-2/3 animate-pulse rounded bg-titanium/30" />
      </div>
    </div>
  );
}

export default function PicksLoading() {
  return (
    <div className="flex min-h-screen flex-col bg-obsidian">
      <NavStub />
      <main className="flex-1 px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="mb-6">
            <div className="h-3 w-24 animate-pulse rounded bg-titanium/60" />
            <div className="mt-2 h-8 w-64 animate-pulse rounded bg-titanium/80" />
            <div className="mt-2 h-4 w-96 max-w-full animate-pulse rounded bg-titanium/50" />
          </div>

          <div className="mb-4 h-12 animate-pulse rounded-xl bg-carbon/60 border border-titanium/40" />

          <FilterSkeleton />

          <div className="grid gap-4">
            {[0, 1, 2, 3, 4].map((i) => (
              <PickCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
