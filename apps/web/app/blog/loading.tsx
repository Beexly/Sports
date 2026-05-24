export default function Loading() {
  return (
    <div className="bg-gray-950 min-h-screen p-6 space-y-8">
      <div className="h-10 w-48 rounded-2xl bg-gray-800/60 animate-pulse" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-2xl bg-gray-800/60 p-6 animate-pulse space-y-3">
            <div className="h-36 rounded-xl bg-gray-700/60" />
            <div className="h-5 w-3/4 rounded bg-gray-700/60" />
            <div className="h-4 w-full rounded bg-gray-700/40" />
          </div>
        ))}
      </div>
    </div>
  );
}
