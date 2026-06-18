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

export default function TodayLoading() {
  return (
    <div className="min-h-screen bg-obsidian">
      <NavStub />

      {/* Hero */}
      <section className="mx-auto max-w-7xl px-4 pb-10 pt-14 sm:px-6">
        <div className="mb-3 h-5 w-36 animate-pulse rounded-full bg-titanium/60" />
        <div className="mb-3 h-10 w-2/3 animate-pulse rounded-lg bg-titanium" />
        <div className="mb-1.5 h-4 w-1/2 animate-pulse rounded bg-titanium/60" />
        <div className="h-4 w-5/12 animate-pulse rounded bg-titanium/60" />
      </section>

      {/* Briefing cards grid */}
      <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex flex-col gap-4 rounded-2xl border border-titanium bg-carbon p-5"
            >
              {/* Eyebrow / priority badge */}
              <div className="flex items-center gap-2">
                <div className="h-5 w-14 animate-pulse rounded-full bg-titanium/60" />
                <div className="h-3.5 w-20 animate-pulse rounded bg-titanium/60" />
              </div>
              {/* Headline */}
              <div className="space-y-2">
                <div className="h-5 w-full animate-pulse rounded bg-titanium" />
                <div className="h-5 w-4/5 animate-pulse rounded bg-titanium" />
              </div>
              {/* Detail text */}
              <div className="space-y-1.5">
                <div className="h-3.5 w-full animate-pulse rounded bg-titanium/60" />
                <div className="h-3.5 w-11/12 animate-pulse rounded bg-titanium/60" />
                <div className="h-3.5 w-3/4 animate-pulse rounded bg-titanium/60" />
              </div>
              {/* Action button */}
              <div className="mt-auto h-9 w-full animate-pulse rounded-lg bg-titanium/60" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
