function DashboardHeaderSkeleton() {
  return (
    <header className="border-b border-titanium bg-obsidian/80 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
        <div className="h-4 w-28 animate-pulse rounded bg-titanium" />
        <div className="flex items-center gap-4">
          {[40, 56, 36].map((w, i) => (
            <div key={i} className="h-3 animate-pulse rounded bg-titanium/50" style={{ width: `${w}px` }} />
          ))}
        </div>
      </div>
    </header>
  );
}

function StatCardSkeleton() {
  return (
    <div className="rounded-xl border border-titanium bg-carbon/60 p-4">
      <div className="h-3 w-20 animate-pulse rounded bg-titanium/60" />
      <div className="mt-2 h-8 w-16 animate-pulse rounded bg-titanium" />
    </div>
  );
}

function PickRowSkeleton() {
  return (
    <li className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-center gap-2">
          <div className="h-4 w-10 animate-pulse rounded bg-titanium" />
          <div className="h-4 w-32 animate-pulse rounded bg-titanium/70" />
        </div>
        <div className="h-3 w-48 animate-pulse rounded bg-titanium/50" />
        <div className="h-3 w-40 animate-pulse rounded bg-titanium/40" />
        <div className="mt-1 h-1 w-full animate-pulse rounded-full bg-titanium/30" />
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <div className="h-5 w-16 animate-pulse rounded-full bg-titanium" />
        <div className="h-3.5 w-14 animate-pulse rounded bg-titanium/60" />
      </div>
    </li>
  );
}

export default function DashboardLoading() {
  return (
    <div className="flex min-h-screen flex-col bg-obsidian">
      <DashboardHeaderSkeleton />
      <main className="flex-1 px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <div className="h-7 w-48 animate-pulse rounded bg-titanium" />
              <div className="mt-1.5 h-3.5 w-36 animate-pulse rounded bg-titanium/60" />
            </div>
            <div className="h-6 w-16 animate-pulse rounded-full bg-titanium/60" />
          </div>

          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[0, 1, 2, 3].map((i) => <StatCardSkeleton key={i} />)}
          </div>

          <div className="mb-4 h-10 animate-pulse rounded-lg border border-titanium/40 bg-carbon/40" />

          <section className="mb-6 rounded-2xl border border-titanium bg-carbon/60 p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="h-4 w-24 animate-pulse rounded bg-titanium" />
              <div className="h-3.5 w-14 animate-pulse rounded bg-titanium/60" />
            </div>
            <ul className="divide-y divide-titanium">
              {[0, 1, 2].map((i) => <PickRowSkeleton key={i} />)}
            </ul>
          </section>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {[0, 1].map((i) => (
              <section key={i} className="rounded-2xl border border-titanium bg-carbon/60 p-6">
                <div className="mb-3 h-4 w-24 animate-pulse rounded bg-titanium" />
                <div className="space-y-2">
                  {[0, 1, 2, 3].map((j) => (
                    <div key={j} className="h-8 animate-pulse rounded-lg bg-titanium/30" />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
