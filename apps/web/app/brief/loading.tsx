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

export default function BriefLoading() {
  return (
    <div className="min-h-screen bg-obsidian">
      <NavStub />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        {/* h1 skeleton */}
        <div className="mb-4 h-9 w-48 animate-pulse rounded bg-white/[0.08]" />

        {/* Status paragraph lines */}
        <div className="mb-2 h-4 w-full animate-pulse rounded bg-white/[0.06]" />
        <div className="mb-2 h-4 w-5/6 animate-pulse rounded bg-white/[0.06]" />
        <div className="mb-8 h-4 w-3/4 animate-pulse rounded bg-white/[0.06]" />

        {/* Today's slate card */}
        <div className="rounded-2xl border border-white/[0.10] bg-white/[0.01] p-6">
          {/* Eyebrow */}
          <div className="mb-3 h-3 w-28 animate-pulse rounded bg-white/[0.06]" />
          {/* Stat */}
          <div className="mb-4 h-10 w-20 animate-pulse rounded bg-white/[0.08]" />
          {/* Description lines */}
          <div className="mb-2 h-4 w-full animate-pulse rounded bg-white/[0.06]" />
          <div className="h-4 w-4/5 animate-pulse rounded bg-white/[0.06]" />
        </div>
      </main>
    </div>
  );
}
