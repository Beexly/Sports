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

export default function PricingLoading() {
  return (
    <div className="min-h-screen bg-obsidian">
      <NavStub />

      {/* Hero */}
      <section className="mx-auto max-w-3xl px-4 pb-12 pt-16 text-center sm:px-6">
        <div className="mb-4 flex justify-center">
          <div className="h-6 w-28 animate-pulse rounded-full bg-titanium/60" />
        </div>
        <div className="mx-auto mb-4 h-10 w-3/4 animate-pulse rounded-lg bg-titanium" />
        <div className="mx-auto mb-2 h-4 w-2/3 animate-pulse rounded bg-titanium/60" />
        <div className="mx-auto h-4 w-1/2 animate-pulse rounded bg-titanium/60" />
      </section>

      {/* Pricing cards */}
      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
        <div className="grid gap-6 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="flex flex-col rounded-2xl border border-titanium bg-carbon p-6"
            >
              {/* Badge */}
              <div className="mb-4 h-5 w-16 animate-pulse rounded-full bg-titanium/60" />
              {/* Plan name */}
              <div className="mb-2 h-6 w-24 animate-pulse rounded bg-titanium" />
              {/* Price block */}
              <div className="mb-1 h-10 w-32 animate-pulse rounded bg-titanium" />
              <div className="mb-6 h-3.5 w-20 animate-pulse rounded bg-titanium/60" />
              {/* Feature rows */}
              <div className="flex flex-col gap-3">
                {[72, 88, 64, 80, 68].map((w, j) => (
                  <div key={j} className="flex items-center gap-2">
                    <div className="h-4 w-4 flex-shrink-0 animate-pulse rounded-full bg-titanium/60" />
                    <div
                      className="h-3.5 animate-pulse rounded bg-titanium/60"
                      style={{ width: `${w}%` }}
                    />
                  </div>
                ))}
              </div>
              {/* CTA button */}
              <div className="mt-8 h-10 w-full animate-pulse rounded-lg bg-titanium/60" />
            </div>
          ))}
        </div>
      </section>

      {/* Comparison table */}
      <section className="mx-auto max-w-5xl px-4 pb-16 sm:px-6">
        <div className="mb-6 h-7 w-56 animate-pulse rounded bg-titanium" />
        <div className="overflow-hidden rounded-xl border border-titanium">
          {/* Table header */}
          <div className="grid grid-cols-4 gap-4 border-b border-titanium bg-carbon/60 px-6 py-3">
            {[140, 80, 80, 80].map((w, i) => (
              <div
                key={i}
                className="h-4 animate-pulse rounded bg-titanium"
                style={{ width: `${w}px` }}
              />
            ))}
          </div>
          {/* Data rows */}
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="grid grid-cols-4 gap-4 border-b border-titanium/40 px-6 py-4 last:border-0"
            >
              <div className="h-3.5 w-36 animate-pulse rounded bg-titanium/60" />
              <div className="h-4 w-5 animate-pulse rounded bg-titanium/60" />
              <div className="h-4 w-5 animate-pulse rounded bg-titanium/60" />
              <div className="h-4 w-5 animate-pulse rounded bg-titanium/60" />
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 pb-24 sm:px-6">
        <div className="mb-6 h-7 w-40 animate-pulse rounded bg-titanium" />
        <div className="flex flex-col gap-3">
          {[55, 70, 60, 65, 50].map((w, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-xl border border-titanium/60 bg-carbon/40 px-5 py-4"
            >
              <div
                className="h-4 animate-pulse rounded bg-titanium/60"
                style={{ width: `${w}%` }}
              />
              <div className="h-4 w-4 flex-shrink-0 animate-pulse rounded bg-titanium/60" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
