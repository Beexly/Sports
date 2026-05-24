export default function Loading() {
  return (
    <div className="bg-gray-950 min-h-screen p-6 space-y-6">
      <div className="grid grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl bg-gray-800/60 p-5 animate-pulse h-24" />
        ))}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-2xl bg-gray-800/60 p-5 animate-pulse space-y-3" style={{ minHeight: 160 }}>
            <div className="h-5 w-20 rounded bg-gray-700/80" />
            <div className="h-4 w-full rounded bg-gray-700/60" />
            <div className="h-4 w-3/4 rounded bg-gray-700/60" />
          </div>
        ))}
      </div>
    </div>
  );
}
