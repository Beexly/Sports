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

export default function ObservatoryLoading() {
  return (
    <div className="min-h-screen bg-obsidian">
      <NavStub />

      {/* Hero */}
      <section className="mx-auto max-w-7xl px-4 pb-12 pt-16 sm:px-6">
        <div className="h-4 w-28 animate-pulse rounded bg-titanium/60" />
        <div className="mt-4 h-14 w-4/5 animate-pulse rounded-lg bg-titanium" />
        <div className="mt-2 h-14 w-3/5 animate-pulse rounded-lg bg-titanium" />
        <div className="mt-6 h-4 w-full max-w-xl animate-pulse rounded bg-titanium/60" />
        <div className="mt-2 h-4 w-2/3 max-w-lg animate-pulse rounded bg-titanium/60" />
      </section>

      {/* Feature Preview Cards — 3 in a row */}
      <section className="mx-auto max-w-7xl px-4 pb-10 sm:px-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-titanium/40 bg-titanium/5 p-5"
            >
              {/* Card title */}
              <div className="h-5 w-36 animate-pulse rounded bg-titanium" />
              {/* Body text lines */}
              <div className="mt-3 space-y-2">
                <div className="h-3.5 w-full animate-pulse rounded bg-titanium/60" />
                <div className="h-3.5 w-5/6 animate-pulse rounded bg-titanium/60" />
                <div className="h-3.5 w-4/6 animate-pulse rounded bg-titanium/60" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Live Board Placeholder Panel */}
      <section className="mx-auto max-w-7xl px-4 pb-10 sm:px-6">
        <div className="overflow-hidden rounded-2xl border border-titanium/40 bg-titanium/5">
          {/* Central loading indicator */}
          <div className="flex flex-col items-center justify-center px-6 py-16">
            <div className="h-12 w-12 animate-pulse rounded-full bg-titanium/60" />
            <div className="mt-4 h-4 w-32 animate-pulse rounded bg-titanium/60" />
            <div className="mt-2 h-3.5 w-48 animate-pulse rounded bg-titanium/40" />
          </div>

          {/* 3-column chart skeletons */}
          <div className="grid grid-cols-1 gap-px border-t border-titanium/20 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-5">
                {/* Chart label */}
                <div className="h-4 w-28 animate-pulse rounded bg-titanium/60" />
                {/* Bar chart skeleton */}
                <div className="mt-4 flex items-end gap-1.5">
                  {[60, 80, 50, 90, 70, 55, 85].map((h, j) => (
                    <div
                      key={j}
                      className="flex-1 animate-pulse rounded-t bg-titanium/40"
                      style={{ height: `${h}px` }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Disclaimer / Note paragraph */}
      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
        <div className="flex flex-col items-center gap-2">
          <div className="h-3 w-full max-w-lg animate-pulse rounded bg-titanium/40" />
          <div className="h-3 w-2/3 max-w-md animate-pulse rounded bg-titanium/30" />
        </div>
      </section>
    </div>
  );
}
