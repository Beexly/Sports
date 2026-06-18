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

export default function FantasyLoading() {
  return (
    <div className="min-h-screen bg-obsidian">
      <NavStub />

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-4 pb-10 pt-24 sm:px-6">
        <div className="mb-4 h-5 w-40 animate-pulse rounded-full bg-white/[0.06]" />
        <div className="mb-3 h-12 w-3/4 animate-pulse rounded-lg bg-white/[0.08]" />
        <div className="mb-1.5 h-4 w-2/3 animate-pulse rounded bg-white/[0.06]" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-white/[0.06]" />
      </section>

      {/* Live-first lane */}
      <section className="mx-auto max-w-7xl px-4 pb-10 sm:px-6">
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-white/[0.10] bg-white/[0.03] p-5">
              <div className="mb-3 h-4 w-24 animate-pulse rounded-full bg-white/[0.06]" />
              <div className="mb-3 h-5 w-2/3 animate-pulse rounded bg-white/[0.08]" />
              <div className="space-y-1.5">
                <div className="h-3 w-full animate-pulse rounded bg-white/[0.06]" />
                <div className="h-3 w-5/6 animate-pulse rounded bg-white/[0.06]" />
                <div className="h-3 w-3/4 animate-pulse rounded bg-white/[0.06]" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Tool directory */}
      <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6">
        <div className="mb-5 h-5 w-48 animate-pulse rounded bg-white/[0.08]" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-white/[0.10] bg-white/[0.03] p-4">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="h-4 w-2/3 animate-pulse rounded bg-white/[0.08]" />
                <div className="h-5 w-16 animate-pulse rounded-full bg-white/[0.06]" />
              </div>
              <div className="space-y-1.5">
                <div className="h-3 w-full animate-pulse rounded bg-white/[0.06]" />
                <div className="h-3 w-4/5 animate-pulse rounded bg-white/[0.06]" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
