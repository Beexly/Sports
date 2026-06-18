function NavStub() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.10] bg-obsidian/90 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <div className="h-5 w-32 animate-pulse rounded bg-white/[0.08]" />
        <div className="flex flex-1 items-center gap-3">
          {[48, 56, 44, 52].map((w, i) => (
            <div key={i} className="h-3.5 animate-pulse rounded bg-white/[0.06]" style={{ width: `${w}px` }} />
          ))}
        </div>
        <div className="h-8 w-20 animate-pulse rounded-lg bg-white/[0.06]" />
      </div>
    </header>
  );
}

function BoardStatSkeleton() {
  return (
    <div className="rounded-xl border border-white/[0.10] bg-white/[0.03] p-4">
      <div className="h-3 w-20 animate-pulse rounded bg-white/[0.06]" />
      <div className="mt-2 h-7 w-16 animate-pulse rounded bg-white/[0.08]" />
    </div>
  );
}

function PassRowSkeleton() {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
      <div className="flex-1 space-y-1.5">
        <div className="h-4 w-48 animate-pulse rounded bg-white/[0.08]" />
        <div className="h-3 w-32 animate-pulse rounded bg-white/[0.05]" />
      </div>
      <div className="flex items-center gap-2">
        <div className="h-5 w-16 animate-pulse rounded-full bg-white/[0.06]" />
        <div className="h-5 w-12 animate-pulse rounded bg-white/[0.04]" />
      </div>
    </div>
  );
}

export default function BoardLoading() {
  return (
    <div className="relative isolate min-h-screen w-full overflow-x-hidden bg-obsidian">
      <NavStub />
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <div>
          <div className="h-3 w-20 animate-pulse rounded bg-white/[0.06]" />
          <div className="mt-2 h-8 w-56 animate-pulse rounded bg-white/[0.08]" />
          <div className="mt-2 h-4 w-80 max-w-full animate-pulse rounded bg-white/[0.05]" />
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <BoardStatSkeleton key={i} />)}
        </div>

        <div className="rounded-2xl border border-white/[0.10] bg-white/[0.02] p-6">
          <div className="mb-4 h-5 w-32 animate-pulse rounded bg-white/[0.08]" />
          <div className="space-y-2.5">
            {[0, 1, 2, 3, 4, 5].map((i) => <PassRowSkeleton key={i} />)}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/[0.10] bg-white/[0.02] p-6">
            <div className="mb-3 h-4 w-28 animate-pulse rounded bg-white/[0.08]" />
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-4 animate-pulse rounded bg-white/[0.04]" style={{ width: `${85 - i * 10}%` }} />
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-white/[0.10] bg-white/[0.02] p-6">
            <div className="mb-3 h-4 w-36 animate-pulse rounded bg-white/[0.08]" />
            <div className="h-32 animate-pulse rounded-lg bg-white/[0.02]" />
          </div>
        </div>
      </main>
    </div>
  );
}
