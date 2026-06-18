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

function BlogCardSkeleton() {
  return (
    <article className="rounded-2xl border border-white/[0.10] bg-white/[0.03] p-6">
      <div className="mb-3 flex items-center gap-2">
        <div className="h-4 w-16 animate-pulse rounded-full bg-white/[0.06]" />
        <div className="h-3.5 w-24 animate-pulse rounded bg-white/[0.04]" />
      </div>
      <div className="mb-2 h-6 w-full animate-pulse rounded bg-white/[0.08]" />
      <div className="mb-1 h-4 w-5/6 animate-pulse rounded bg-white/[0.08]/70" />
      <div className="mb-4 space-y-1.5">
        <div className="h-3.5 w-full animate-pulse rounded bg-white/[0.04]" />
        <div className="h-3.5 w-4/5 animate-pulse rounded bg-white/[0.04]" />
        <div className="h-3.5 w-3/4 animate-pulse rounded bg-white/[0.03]" />
      </div>
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5">
          {[0, 1].map((i) => (
            <div key={i} className="h-4 w-12 animate-pulse rounded-full bg-white/[0.04]" />
          ))}
        </div>
        <div className="h-4 w-16 animate-pulse rounded bg-white/[0.05]" />
      </div>
    </article>
  );
}

export default function BlogLoading() {
  return (
    <div className="flex min-h-screen flex-col bg-obsidian">
      <NavStub />
      <main className="flex-1 px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8">
            <div className="h-3 w-20 animate-pulse rounded bg-white/[0.06]" />
            <div className="mt-2 h-9 w-64 animate-pulse rounded bg-white/[0.08]" />
            <div className="mt-2 h-4 w-96 max-w-full animate-pulse rounded bg-white/[0.05]" />
          </div>

          <div className="mb-6 flex gap-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-8 w-16 animate-pulse rounded-lg bg-white/[0.06]" />
            ))}
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            {[0, 1, 2, 3, 4, 5].map((i) => <BlogCardSkeleton key={i} />)}
          </div>
        </div>
      </main>
    </div>
  );
}
