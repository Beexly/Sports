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

function MetricCardSkeleton({ wide }: { wide?: boolean }) {
  return (
    <div className={`rounded-xl border border-titanium bg-carbon/60 p-5 ${wide ? "col-span-2" : ""}`}>
      <div className="h-3 w-20 animate-pulse rounded bg-titanium/60" />
      <div className="mt-2 h-10 w-24 animate-pulse rounded bg-titanium" />
      <div className="mt-2 h-3 w-32 animate-pulse rounded bg-titanium/40" />
    </div>
  );
}

function TableRowSkeleton() {
  return (
    <tr>
      <td className="py-3 pr-4">
        <div className="h-4 w-24 animate-pulse rounded bg-titanium/60" />
      </td>
      <td className="py-3 pr-4">
        <div className="h-4 w-12 animate-pulse rounded bg-titanium/50" />
      </td>
      <td className="py-3 pr-4">
        <div className="h-4 w-10 animate-pulse rounded bg-titanium/50" />
      </td>
      <td className="py-3 pr-4">
        <div className="h-4 w-10 animate-pulse rounded bg-titanium/50" />
      </td>
      <td className="py-3">
        <div className="h-5 w-14 animate-pulse rounded-full bg-titanium/40" />
      </td>
    </tr>
  );
}

export default function PerformanceLoading() {
  return (
    <div className="flex min-h-screen flex-col bg-obsidian">
      <NavStub />
      <main className="flex-1 px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="mb-8">
            <div className="h-3 w-32 animate-pulse rounded bg-titanium/60" />
            <div className="mt-2 h-9 w-80 max-w-full animate-pulse rounded bg-titanium" />
            <div className="mt-2 h-4 w-[500px] max-w-full animate-pulse rounded bg-titanium/50" />
          </div>

          <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[0, 1, 2, 3].map((i) => <MetricCardSkeleton key={i} />)}
          </div>

          <div className="mb-8 rounded-2xl border border-titanium bg-carbon/40 p-6">
            <div className="mb-4 h-5 w-36 animate-pulse rounded bg-titanium" />
            <div className="h-32 animate-pulse rounded-lg bg-titanium/20" />
          </div>

          <div className="rounded-2xl border border-titanium bg-carbon/40">
            <div className="border-b border-titanium p-4">
              <div className="h-4 w-40 animate-pulse rounded bg-titanium" />
            </div>
            <div className="overflow-hidden p-4">
              <table className="w-full">
                <thead>
                  <tr>
                    {[80, 48, 44, 44, 60].map((w, i) => (
                      <th key={i} className="pb-3 text-left pr-4">
                        <div
                          className="h-3 animate-pulse rounded bg-titanium/50"
                          style={{ width: `${w}px` }}
                        />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-titanium/30">
                  {[0, 1, 2, 3, 4, 5].map((i) => <TableRowSkeleton key={i} />)}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
