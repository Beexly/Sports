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

function ProofRowSkeleton() {
  return (
    <div className="grid grid-cols-[1fr_auto_auto] gap-4 border-b border-white/[0.10]/30 py-4 last:border-0">
      <div className="space-y-1.5">
        <div className="h-4 w-40 animate-pulse rounded bg-white/[0.08]/70" />
        <div className="h-3 w-28 animate-pulse rounded bg-white/[0.04]" />
        <div className="flex gap-2">
          <div className="h-3.5 w-24 animate-pulse rounded bg-white/[0.03]" />
          <div className="h-3.5 w-32 animate-pulse rounded bg-white/[0.03]" />
        </div>
      </div>
      <div className="flex flex-col items-end gap-1.5">
        <div className="h-5 w-12 animate-pulse rounded-full bg-white/[0.08]" />
        <div className="h-3.5 w-8 animate-pulse rounded bg-white/[0.05]" />
      </div>
      <div className="flex flex-col items-end gap-1.5">
        <div className="h-3.5 w-20 animate-pulse rounded bg-white/[0.05]" />
        <div className="h-3 w-16 animate-pulse rounded bg-white/[0.03]" />
      </div>
    </div>
  );
}

export default function ProofLoading() {
  return (
    <div className="min-h-screen bg-obsidian">
      <NavStub />
      <main className="flex-1 px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="mb-8">
            <div className="h-3 w-32 animate-pulse rounded bg-white/[0.06]" />
            <div className="mt-2 h-9 w-72 max-w-full animate-pulse rounded bg-white/[0.08]" />
            <div className="mt-2 h-4 w-full max-w-2xl animate-pulse rounded bg-white/[0.05]" />
          </div>

          <div className="mb-8 grid gap-4 sm:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-xl border border-white/[0.10] bg-white/[0.03] p-5">
                <div className="h-3 w-20 animate-pulse rounded bg-white/[0.06]" />
                <div className="mt-2 h-9 w-14 animate-pulse rounded bg-white/[0.08]" />
                <div className="mt-1.5 h-3 w-32 animate-pulse rounded bg-white/[0.04]" />
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-white/[0.10] bg-white/[0.02]">
            <div className="border-b border-white/[0.10] p-5">
              <div className="h-4 w-36 animate-pulse rounded bg-white/[0.08]" />
              <div className="mt-1.5 h-3 w-64 animate-pulse rounded bg-white/[0.05]" />
            </div>
            <div className="p-5">
              {[0, 1, 2, 3, 4, 5, 6].map((i) => <ProofRowSkeleton key={i} />)}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
