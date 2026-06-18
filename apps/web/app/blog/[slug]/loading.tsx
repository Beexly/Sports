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

export default function BlogPostLoading() {
  return (
    <div className="flex min-h-screen flex-col bg-obsidian">
      <NavStub />
      <main className="flex-1 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          {/* Breadcrumb */}
          <div className="mb-6 h-3.5 w-16 animate-pulse rounded bg-white/[0.06]" />

          {/* Article header */}
          <header className="mb-8">
            <div className="mb-3 flex gap-2">
              <div className="h-5 w-16 animate-pulse rounded-full bg-white/[0.06]" />
              <div className="h-5 w-24 animate-pulse rounded-full bg-white/[0.04]" />
            </div>
            <div className="mb-2 h-9 w-full animate-pulse rounded bg-white/[0.08]" />
            <div className="h-7 w-4/5 animate-pulse rounded bg-white/[0.08]" />
            <div className="mt-3 h-5 w-full animate-pulse rounded bg-white/[0.05]" />
            <div className="mt-1.5 h-5 w-3/4 animate-pulse rounded bg-white/[0.04]" />
            <div className="mt-4 flex items-center gap-3">
              <div className="h-3.5 w-24 animate-pulse rounded bg-white/[0.05]" />
              <div className="h-1 w-1 rounded-full bg-white/[0.03]" />
              <div className="h-3.5 w-16 animate-pulse rounded bg-white/[0.04]" />
            </div>
          </header>

          {/* Article body */}
          <article className="space-y-4">
            {[100, 92, 87, 95, 78, 88, 100, 72, 90, 83, 96, 65].map((w, i) => (
              <div
                key={i}
                className={`h-4 animate-pulse rounded bg-white/[0.03] ${i % 5 === 4 ? "mt-6" : ""}`}
                style={{ width: `${w}%` }}
              />
            ))}
            <div className="my-6 rounded-xl border border-white/[0.10] bg-white/[0.02] p-5">
              <div className="h-4 w-20 animate-pulse rounded bg-white/[0.06] mb-2" />
              <div className="h-3.5 w-full animate-pulse rounded bg-white/[0.03]" />
              <div className="h-3.5 w-5/6 animate-pulse rounded bg-white/[0.03] mt-1" />
            </div>
            {[88, 75, 94, 82, 70, 90].map((w, i) => (
              <div
                key={`b-${i}`}
                className="h-4 animate-pulse rounded bg-white/[0.08]/25"
                style={{ width: `${w}%` }}
              />
            ))}
          </article>
        </div>
      </main>
    </div>
  );
}
