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
      </div>
    </header>
  );
}

export default function ClvLoading() {
  return (
    <div className="relative isolate flex min-h-screen flex-col bg-white/[0.03]">
      <NavStub />
      <main className="flex-1 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="mb-10">
            <div className="h-3 w-40 animate-pulse rounded bg-white/[0.06]" />
            <div className="mt-3 h-12 w-72 max-w-full animate-pulse rounded bg-white/[0.08]" />
            <div className="mt-5 h-5 w-full animate-pulse rounded bg-white/[0.06]" />
            <div className="mt-2 h-4 w-4/5 animate-pulse rounded bg-white/[0.04]" />
          </div>

          <div className="mb-10 rounded-2xl border border-white/[0.10] bg-white/[0.03] p-6">
            <div className="mb-3 h-3 w-36 animate-pulse rounded bg-white/[0.06]" />
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-4 animate-pulse rounded bg-white/[0.04]" style={{ width: `${95 - i * 8}%` }} />
              ))}
            </div>
          </div>

          <div className="mb-6 rounded-2xl border border-white/[0.10] bg-white/[0.02] p-8 text-center">
            <div className="mx-auto mb-3 h-12 w-12 animate-pulse rounded-full bg-white/[0.06]" />
            <div className="mx-auto h-6 w-48 animate-pulse rounded bg-white/[0.08]" />
            <div className="mx-auto mt-2 h-4 w-64 animate-pulse rounded bg-white/[0.05]" />
            <div className="mx-auto mt-4 h-4 w-56 animate-pulse rounded bg-white/[0.03]" />
          </div>

          <div className="rounded-2xl border border-white/[0.10] bg-white/[0.02] p-6">
            <div className="mb-3 h-3 w-28 animate-pulse rounded bg-white/[0.06]" />
            <div className="space-y-2">
              {[0, 1].map((i) => (
                <div key={i} className="h-4 animate-pulse rounded bg-white/[0.03]" style={{ width: `${88 - i * 12}%` }} />
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
