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

function BlogCardSkeleton() {
  return (
    <article className="rounded-2xl border border-titanium bg-carbon/60 p-6">
      <div className="mb-3 flex items-center gap-2">
        <div className="h-4 w-16 animate-pulse rounded-full bg-titanium/60" />
        <div className="h-3.5 w-24 animate-pulse rounded bg-titanium/40" />
      </div>
      <div className="mb-2 h-6 w-full animate-pulse rounded bg-titanium" />
      <div className="mb-1 h-4 w-5/6 animate-pulse rounded bg-titanium/70" />
      <div className="mb-4 space-y-1.5">
        <div className="h-3.5 w-full animate-pulse rounded bg-titanium/40" />
        <div className="h-3.5 w-4/5 animate-pulse rounded bg-titanium/40" />
        <div className="h-3.5 w-3/4 animate-pulse rounded bg-titanium/30" />
      </div>
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5">
          {[0, 1].map((i) => (
            <div key={i} className="h-4 w-12 animate-pulse rounded-full bg-titanium/40" />
          ))}
        </div>
        <div className="h-4 w-16 animate-pulse rounded bg-titanium/50" />
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
            <div className="h-3 w-20 animate-pulse rounded bg-titanium/60" />
            <div className="mt-2 h-9 w-64 animate-pulse rounded bg-titanium" />
            <div className="mt-2 h-4 w-96 max-w-full animate-pulse rounded bg-titanium/50" />
          </div>

          <div className="mb-6 flex gap-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-8 w-16 animate-pulse rounded-lg bg-titanium/60" />
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
