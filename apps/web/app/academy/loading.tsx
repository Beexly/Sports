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

export default function AcademyLoading() {
  return (
    <div className="min-h-screen bg-obsidian">
      <NavStub />
      <main className="mx-auto max-w-7xl px-4 sm:px-6">
        <section className="py-14">
          <div className="space-y-5">
            <div className="h-3.5 w-24 animate-pulse rounded bg-titanium/60" />
            <div className="h-12 w-96 animate-pulse rounded bg-titanium" />
            <div className="h-5 w-2/3 animate-pulse rounded bg-titanium/60" />
          </div>
        </section>
        <section className="mb-12 grid grid-cols-4 gap-4">
          {["Course Floor", "Live Fire", "Beat the Close", "Film Room"].map((_, i) => (
            <div key={i} className="rounded-xl border border-titanium/40 bg-carbon p-5">
              <div className="mb-3 h-8 w-8 animate-pulse rounded-lg bg-titanium/50" />
              <div className="mb-2 h-4 w-28 animate-pulse rounded bg-titanium" />
              <div className="h-3 w-full animate-pulse rounded bg-titanium/40" />
              <div className="mt-1 h-3 w-3/4 animate-pulse rounded bg-titanium/40" />
            </div>
          ))}
        </section>
        <section className="mb-12">
          <div className="mb-6 h-6 w-40 animate-pulse rounded bg-titanium" />
          <div className="space-y-4">
            {[0, 1, 2, 3].map((card) => (
              <div key={card} className="flex items-start gap-5 rounded-xl border border-titanium/40 bg-carbon p-5">
                <div className="h-10 w-10 flex-shrink-0 animate-pulse rounded-xl bg-titanium/50" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-56 animate-pulse rounded bg-titanium" />
                  <div className="h-3.5 w-full animate-pulse rounded bg-titanium/50" />
                  <div className="h-3.5 w-4/5 animate-pulse rounded bg-titanium/40" />
                </div>
                <div className="h-5 w-16 animate-pulse rounded-full bg-titanium/50" />
              </div>
            ))}
          </div>
        </section>
        <section className="mb-12">
          <div className="mb-5 h-6 w-44 animate-pulse rounded bg-titanium" />
          <div className="rounded-xl border border-titanium/40 bg-carbon p-6">
            <div className="mb-6 flex gap-4">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-9 w-28 animate-pulse rounded-lg bg-titanium/40" />
              ))}
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="h-4 w-32 animate-pulse rounded bg-titanium/60" />
                <div className="space-y-2.5">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="h-11 w-full animate-pulse rounded-lg bg-titanium/30" />
                  ))}
                </div>
                <div className="h-10 w-32 animate-pulse rounded-lg bg-titanium/50" />
              </div>
              <div className="rounded-lg border border-titanium/30 bg-obsidian/60 p-5">
                <div className="mb-4 h-4 w-24 animate-pulse rounded bg-titanium/60" />
                <div className="space-y-3">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="flex justify-between">
                      <div className="h-3.5 w-28 animate-pulse rounded bg-titanium/50" />
                      <div className="h-3.5 w-16 animate-pulse rounded bg-titanium/60" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
