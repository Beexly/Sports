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

export default function ParlayMriLoading() {
  return (
    <div className="min-h-screen bg-obsidian">
      <NavStub />
      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="mb-10 space-y-4">
          <div className="h-3.5 w-24 animate-pulse rounded bg-white/[0.06]" />
          <div className="h-9 w-64 animate-pulse rounded bg-white/[0.08]" />
          <div className="h-4 w-80 animate-pulse rounded bg-white/[0.06]" />
        </div>
        <div className="rounded-xl border border-white/[0.10] bg-white/[0.03] p-6">
          <div className="mb-5 h-5 w-36 animate-pulse rounded bg-white/[0.08]" />
          <div className="flex gap-6">
            <div className="flex flex-1 flex-col gap-4">
              {[0, 1, 2].map((leg) => (
                <div key={leg} className="rounded-lg border border-white/[0.06] bg-obsidian/60 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="space-y-1.5">
                      <div className="h-4 w-36 animate-pulse rounded bg-white/[0.06]" />
                      <div className="h-3.5 w-28 animate-pulse rounded bg-white/[0.04]" />
                    </div>
                    <div className="h-5 w-16 animate-pulse rounded-full bg-white/[0.05]" />
                  </div>
                  <div className="mb-3 flex items-center gap-3">
                    <div className="h-6 w-14 animate-pulse rounded bg-white/[0.05]" />
                    <div className="h-3.5 w-20 animate-pulse rounded bg-white/[0.04]" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <div className="h-3 w-24 animate-pulse rounded bg-white/[0.04]" />
                      <div className="h-3 w-10 animate-pulse rounded bg-white/[0.04]" />
                    </div>
                    <div className="h-2 w-full animate-pulse rounded-full bg-white/[0.03]">
                      <div className="h-2 w-3/5 animate-pulse rounded-full bg-white/[0.06]" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="w-72 rounded-lg border border-white/[0.06] bg-obsidian/60 p-5">
              <div className="mb-5 flex items-center justify-center">
                <div className="h-28 w-28 animate-pulse rounded-full border-4 border-white/[0.06] bg-white/[0.02]" />
              </div>
              <div className="mb-4 space-y-3">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="h-3.5 w-24 animate-pulse rounded bg-white/[0.05]" />
                    <div className="h-3.5 w-14 animate-pulse rounded bg-white/[0.06]" />
                  </div>
                ))}
              </div>
              <div className="rounded-lg border border-white/[0.10]/30 bg-white/[0.03] p-3">
                <div className="mb-1.5 h-3 w-16 animate-pulse rounded bg-white/[0.04]" />
                <div className="h-7 w-24 animate-pulse rounded bg-white/[0.08]" />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
