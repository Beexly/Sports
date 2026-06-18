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

export default function LossDetailLoading() {
  return (
    <div className="min-h-screen bg-obsidian">
      <NavStub />

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        {/* Breadcrumb */}
        <div className="mb-6 flex items-center gap-2">
          <div className="h-3.5 w-24 animate-pulse rounded bg-white/[0.06]" />
          <div className="h-3 w-3 animate-pulse rounded bg-white/[0.04]" />
          <div className="h-3.5 w-32 animate-pulse rounded bg-white/[0.06]" />
        </div>

        {/* Header — pick name + date/badge row */}
        <div className="mb-10">
          <div className="mb-3 h-8 w-3/4 animate-pulse rounded-lg bg-white/[0.08]" />
          <div className="flex items-center gap-3">
            <div className="h-4 w-28 animate-pulse rounded bg-white/[0.06]" />
            <div className="h-5 w-16 animate-pulse rounded-full bg-alert/20" />
          </div>
        </div>

        {/* What went wrong section */}
        <section className="mb-10">
          <div className="mb-4 h-5 w-40 animate-pulse rounded bg-white/[0.08]" />
          <div className="space-y-3">
            <div className="h-4 w-full animate-pulse rounded bg-white/[0.05]" />
            <div className="h-4 w-[95%] animate-pulse rounded bg-white/[0.05]" />
            <div className="h-4 w-[88%] animate-pulse rounded bg-white/[0.05]" />
            <div className="h-4 w-full animate-pulse rounded bg-white/[0.05]" />
            <div className="h-4 w-[92%] animate-pulse rounded bg-white/[0.05]" />
            <div className="h-4 w-[80%] animate-pulse rounded bg-white/[0.05]" />
            <div className="mt-1 h-4 w-full animate-pulse rounded bg-white/[0.05]" />
            <div className="h-4 w-[85%] animate-pulse rounded bg-white/[0.05]" />
            <div className="h-4 w-[70%] animate-pulse rounded bg-white/[0.05]" />
            <div className="mt-1 h-4 w-full animate-pulse rounded bg-white/[0.05]" />
            <div className="h-4 w-[90%] animate-pulse rounded bg-white/[0.05]" />
            <div className="h-4 w-[60%] animate-pulse rounded bg-white/[0.05]" />
          </div>
        </section>

        {/* Model context panel */}
        <section className="mb-10">
          <div className="mb-4 h-5 w-36 animate-pulse rounded bg-white/[0.08]" />
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.08]/5 p-5">
            <div className="divide-y divide-titanium/20">
              {/* Row 1 — Confidence */}
              <div className="flex items-center justify-between py-3 first:pt-0">
                <div className="h-3.5 w-24 animate-pulse rounded bg-white/[0.06]" />
                <div className="h-4 w-16 animate-pulse rounded bg-white/[0.05]" />
              </div>
              {/* Row 2 — Edge score */}
              <div className="flex items-center justify-between py-3">
                <div className="h-3.5 w-20 animate-pulse rounded bg-white/[0.06]" />
                <div className="h-4 w-12 animate-pulse rounded bg-white/[0.05]" />
              </div>
              {/* Row 3 — Market conditions */}
              <div className="flex items-center justify-between py-3">
                <div className="h-3.5 w-32 animate-pulse rounded bg-white/[0.06]" />
                <div className="h-4 w-20 animate-pulse rounded bg-white/[0.05]" />
              </div>
              {/* Row 4 — Model version */}
              <div className="flex items-center justify-between py-3 last:pb-0">
                <div className="h-3.5 w-28 animate-pulse rounded bg-white/[0.06]" />
                <div className="h-4 w-14 animate-pulse rounded bg-white/[0.05]" />
              </div>
            </div>
          </div>
        </section>

        {/* What we'd do differently section */}
        <section>
          <div className="mb-4 h-5 w-48 animate-pulse rounded bg-white/[0.08]" />
          <div className="space-y-3">
            <div className="h-4 w-full animate-pulse rounded bg-white/[0.05]" />
            <div className="h-4 w-[93%] animate-pulse rounded bg-white/[0.05]" />
            <div className="h-4 w-[78%] animate-pulse rounded bg-white/[0.05]" />
            <div className="mt-1 h-4 w-full animate-pulse rounded bg-white/[0.05]" />
            <div className="h-4 w-[87%] animate-pulse rounded bg-white/[0.05]" />
            <div className="h-4 w-[65%] animate-pulse rounded bg-white/[0.05]" />
            <div className="mt-1 h-4 w-full animate-pulse rounded bg-white/[0.05]" />
            <div className="h-4 w-[82%] animate-pulse rounded bg-white/[0.05]" />
          </div>
        </section>
      </main>
    </div>
  );
}
