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

function MetricSkeleton() {
  return (
    <div className="rounded-xl border border-titanium bg-carbon/60 p-4">
      <div className="h-3 w-16 animate-pulse rounded bg-titanium/60" />
      <div className="mt-2 h-8 w-12 animate-pulse rounded bg-titanium" />
    </div>
  );
}

function PanelSkeleton({ lines = 4 }: { lines?: number }) {
  return (
    <div className="rounded-2xl border border-titanium bg-carbon/60 p-6">
      <div className="mb-4 h-4 w-28 animate-pulse rounded bg-titanium" />
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <div className="h-3 w-20 animate-pulse rounded bg-titanium/50" />
            <div className="h-4 w-16 animate-pulse rounded bg-titanium/70" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function GameRoomLoading() {
  return (
    <div className="min-h-screen bg-obsidian">
      <NavStub />
      <main className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
        <header className="border-b border-titanium pb-8">
          <div className="h-3.5 w-24 animate-pulse rounded bg-titanium/60" />
          <div className="mt-5 h-3 w-36 animate-pulse rounded bg-titanium/50" />
          <div className="mt-3 h-10 w-80 max-w-full animate-pulse rounded bg-titanium" />
          <div className="mt-4 h-4 w-[500px] max-w-full animate-pulse rounded bg-titanium/40" />
        </header>

        <section className="grid gap-4 md:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <MetricSkeleton key={i} />)}
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <PanelSkeleton lines={6} />
          <PanelSkeleton lines={4} />
        </section>

        <section>
          <div className="mb-4 h-4 w-32 animate-pulse rounded bg-titanium" />
          <div className="space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="rounded-xl border border-titanium/40 bg-carbon/40 p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-pulse rounded-full bg-titanium/60" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-4 w-3/4 animate-pulse rounded bg-titanium/70" />
                    <div className="h-3 w-1/2 animate-pulse rounded bg-titanium/40" />
                  </div>
                  <div className="h-3 w-16 animate-pulse rounded bg-titanium/50" />
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
