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

function TrendRowSkeleton() {
  return (
    <div className="flex items-start gap-4 rounded-xl border border-titanium/40 bg-carbon/40 p-4">
      <div className="mt-1 h-8 w-8 shrink-0 animate-pulse rounded-lg bg-titanium/60" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-48 animate-pulse rounded bg-titanium" />
        <div className="h-3.5 w-64 max-w-full animate-pulse rounded bg-titanium/50" />
        <div className="flex gap-2">
          <div className="h-4 w-16 animate-pulse rounded-full bg-titanium/40" />
          <div className="h-4 w-20 animate-pulse rounded-full bg-titanium/40" />
        </div>
      </div>
      <div className="shrink-0 space-y-1 text-right">
        <div className="h-5 w-12 animate-pulse rounded bg-titanium" />
        <div className="h-3 w-10 animate-pulse rounded bg-titanium/50" />
      </div>
    </div>
  );
}

export default function TrendsLoading() {
  return (
    <div className="relative isolate min-h-screen bg-obsidian">
      <NavStub />
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="h-3 w-20 animate-pulse rounded bg-titanium/60" />
          <div className="mt-2 h-9 w-72 max-w-full animate-pulse rounded bg-titanium" />
          <div className="mt-2 h-4 w-[480px] max-w-full animate-pulse rounded bg-titanium/50" />
        </div>

        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border border-titanium bg-carbon/60 p-4">
              <div className="h-3 w-16 animate-pulse rounded bg-titanium/60" />
              <div className="mt-2 h-8 w-12 animate-pulse rounded bg-titanium" />
            </div>
          ))}
        </div>

        <div className="mb-8">
          <div className="mb-3 h-4 w-32 animate-pulse rounded bg-titanium" />
          <div className="space-y-2.5">
            {[0, 1, 2, 3, 4, 5].map((i) => <TrendRowSkeleton key={i} />)}
          </div>
        </div>

        <div className="rounded-2xl border border-titanium bg-carbon/40 p-6">
          <div className="mb-4 h-4 w-36 animate-pulse rounded bg-titanium" />
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-4 animate-pulse rounded bg-titanium/30" style={{ width: `${90 - i * 12}%` }} />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
