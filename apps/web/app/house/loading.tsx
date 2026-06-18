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

export default function HouseLoading() {
  return (
    <div className="min-h-screen bg-obsidian">
      <NavStub />

      {/* Hero */}
      <section className="mx-auto max-w-7xl px-4 pb-12 pt-16 sm:px-6">
        <div className="h-4 w-24 animate-pulse rounded bg-titanium/60" />
        <div className="mt-4 h-12 w-3/4 animate-pulse rounded-lg bg-titanium" />
        <div className="mt-2 h-12 w-1/2 animate-pulse rounded-lg bg-titanium" />
        <div className="mt-6 h-4 w-full max-w-xl animate-pulse rounded bg-titanium/60" />
        <div className="mt-2 h-4 w-2/3 max-w-lg animate-pulse rounded bg-titanium/60" />
      </section>

      {/* Weekly Ritual Panel */}
      <section className="mx-auto max-w-7xl px-4 pb-10 sm:px-6">
        <div className="rounded-2xl border border-titanium/40 bg-titanium/5 p-6 sm:p-8">
          <div className="h-6 w-48 animate-pulse rounded bg-titanium" />
          <div className="mt-4 h-4 w-full animate-pulse rounded bg-titanium/60" />
          <div className="mt-2 h-4 w-5/6 animate-pulse rounded bg-titanium/60" />
        </div>
      </section>

      {/* Room Doors Grid — 6 cards */}
      <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex flex-col rounded-2xl border border-titanium/40 bg-titanium/5 p-5"
            >
              {/* Room name */}
              <div className="h-5 w-36 animate-pulse rounded bg-titanium" />
              {/* Whose-for text */}
              <div className="mt-2 h-3.5 w-28 animate-pulse rounded bg-titanium/60" />
              {/* Promise paragraph */}
              <div className="mt-4 space-y-2 flex-1">
                <div className="h-3.5 w-full animate-pulse rounded bg-titanium/50" />
                <div className="h-3.5 w-5/6 animate-pulse rounded bg-titanium/50" />
                <div className="h-3.5 w-4/6 animate-pulse rounded bg-titanium/50" />
              </div>
              {/* Footer action button */}
              <div className="mt-5 h-9 w-32 animate-pulse rounded-lg bg-titanium/60" />
            </div>
          ))}
        </div>
      </section>

      {/* Features Section — 3 cards */}
      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-titanium/40 bg-titanium/5 p-5"
            >
              <div className="h-5 w-32 animate-pulse rounded bg-titanium" />
              <div className="mt-3 space-y-2">
                <div className="h-3.5 w-full animate-pulse rounded bg-titanium/60" />
                <div className="h-3.5 w-4/5 animate-pulse rounded bg-titanium/60" />
                <div className="h-3.5 w-3/5 animate-pulse rounded bg-titanium/60" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
