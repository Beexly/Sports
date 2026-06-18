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

export default function StatsLoading() {
  return (
    <div className="min-h-screen bg-white/[0.03]">
      <NavStub />

      <div className="mx-auto max-w-7xl px-4 pb-24 pt-10 sm:px-6">
        {/* Eyebrow + title */}
        <div className="mb-2 h-4 w-28 animate-pulse rounded-full bg-white/[0.06]" />
        <div className="mb-6 h-8 w-64 animate-pulse rounded-lg bg-white/[0.08]" />

        {/* Status ribbon bar */}
        <div className="mb-8 flex items-center gap-3 overflow-hidden rounded-xl border border-white/[0.10] bg-white/[0.03] px-5 py-3">
          {[96, 80, 112, 88, 72].map((w, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="h-2 w-2 animate-pulse rounded-full bg-white/[0.06]" />
              <div className="h-3 animate-pulse rounded bg-white/[0.06]" style={{ width: `${w}px` }} />
            </div>
          ))}
        </div>

        {/* ScoreRing + score bars */}
        <div className="mb-8 flex flex-col items-start gap-6 sm:flex-row sm:items-center">
          {/* ScoreRing placeholder (circular) */}
          <div className="flex-shrink-0">
            <div className="h-36 w-36 animate-pulse rounded-full border-4 border-white/[0.06] bg-white/[0.03]" />
          </div>
          {/* Score bars */}
          <div className="flex flex-1 flex-col gap-4 w-full">
            {[78, 62, 85, 55].map((pct, i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex justify-between">
                  <div className="h-3 w-24 animate-pulse rounded bg-white/[0.06]" />
                  <div className="h-3 w-8 animate-pulse rounded bg-white/[0.06]" />
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/[0.03]">
                  <div
                    className="h-full animate-pulse rounded-full bg-white/[0.06]"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 2x2 stat card grid */}
        <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-white/[0.10] bg-white/[0.03] p-4"
            >
              <div className="mb-2 h-3.5 w-20 animate-pulse rounded bg-white/[0.06]" />
              <div className="mb-1 h-8 w-16 animate-pulse rounded bg-white/[0.08]" />
              <div className="h-3 w-24 animate-pulse rounded bg-white/[0.06]" />
            </div>
          ))}
        </div>

        {/* Insight card */}
        <div className="mb-8 rounded-xl border border-white/[0.10] bg-white/[0.03] p-5">
          <div className="mb-3 h-4 w-32 animate-pulse rounded bg-white/[0.06]" />
          <div className="mb-2 h-5 w-3/4 animate-pulse rounded bg-white/[0.08]" />
          <div className="mb-1.5 h-3.5 w-full animate-pulse rounded bg-white/[0.06]" />
          <div className="h-3.5 w-5/6 animate-pulse rounded bg-white/[0.06]" />
        </div>

        {/* Section header + bar chart */}
        <div className="mb-4 flex items-center justify-between">
          <div className="h-5 w-40 animate-pulse rounded bg-white/[0.08]" />
          <div className="h-4 w-24 animate-pulse rounded bg-white/[0.06]" />
        </div>
        <div className="mb-8 overflow-hidden rounded-xl border border-white/[0.10] bg-white/[0.03] p-5">
          <div className="flex items-end gap-2" style={{ height: "120px" }}>
            {[40, 65, 55, 80, 45, 70, 60, 90, 50, 75, 85, 55].map((h, i) => (
              <div
                key={i}
                className="flex-1 animate-pulse rounded-t bg-white/[0.06]"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="h-2.5 flex-1 animate-pulse rounded bg-white/[0.06]" />
            ))}
          </div>
        </div>

        {/* Surface link cards grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-xl border border-white/[0.10] bg-white/[0.03] px-4 py-3"
            >
              <div className="h-8 w-8 flex-shrink-0 animate-pulse rounded-lg bg-white/[0.06]" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="h-3.5 w-full animate-pulse rounded bg-white/[0.08]" />
                <div className="h-3 w-3/4 animate-pulse rounded bg-white/[0.06]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
