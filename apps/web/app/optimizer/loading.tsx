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

export default function OptimizerLoading() {
  return (
    <div className="min-h-screen bg-carbon">
      <NavStub />
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="mb-8 space-y-3">
          <div className="h-3.5 w-20 animate-pulse rounded bg-titanium/60" />
          <div className="h-9 w-56 animate-pulse rounded bg-titanium" />
          <div className="h-4 w-88 animate-pulse rounded bg-titanium/60" />
        </div>
        <div className="mb-6 flex gap-2">
          {["DFS", "Start-Sit", "Draft Board"].map((_, i) => (
            <div
              key={i}
              className={`h-9 animate-pulse rounded-lg bg-titanium/50 ${i === 0 ? "w-16" : i === 1 ? "w-20" : "w-24"}`}
            />
          ))}
        </div>
        <div className="flex gap-6">
          <div className="flex-1 rounded-xl border border-titanium bg-obsidian/60 p-5">
            <div className="mb-4 grid grid-cols-4 gap-4 border-b border-titanium/30 pb-3">
              {["Player", "Pos/Team", "Proj Pts", "Salary"].map((_, i) => (
                <div key={i} className="h-3.5 animate-pulse rounded bg-titanium/40" />
              ))}
            </div>
            <div className="space-y-2.5">
              {[0, 1, 2, 3, 4, 5, 6, 7].map((row) => (
                <div key={row} className="grid grid-cols-4 items-center gap-4 rounded-lg px-2 py-2 hover:bg-titanium/5">
                  <div className="h-4 w-32 animate-pulse rounded bg-titanium/50" />
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-8 animate-pulse rounded bg-titanium/40" />
                    <div className="h-3.5 w-16 animate-pulse rounded bg-titanium/30" />
                  </div>
                  <div className="h-4 w-10 animate-pulse rounded bg-titanium/50" />
                  <div className="h-4 w-14 animate-pulse rounded bg-titanium/50" />
                </div>
              ))}
            </div>
          </div>
          <div className="w-64 rounded-xl border border-titanium bg-obsidian/60 p-5">
            <div className="mb-4 h-5 w-28 animate-pulse rounded bg-titanium" />
            <div className="space-y-2">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((slot) => (
                <div key={slot} className="flex items-center gap-3 rounded-lg border border-titanium/20 px-3 py-2.5">
                  <div className="h-5 w-8 animate-pulse rounded bg-titanium/40" />
                  <div className="h-4 flex-1 animate-pulse rounded bg-titanium/30" />
                </div>
              ))}
            </div>
            <div className="mt-5 space-y-2 border-t border-titanium/30 pt-4">
              <div className="flex justify-between">
                <div className="h-3.5 w-24 animate-pulse rounded bg-titanium/50" />
                <div className="h-3.5 w-16 animate-pulse rounded bg-titanium/60" />
              </div>
              <div className="flex justify-between">
                <div className="h-3.5 w-20 animate-pulse rounded bg-titanium/50" />
                <div className="h-3.5 w-12 animate-pulse rounded bg-titanium/60" />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
