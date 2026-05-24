export default function Loading() {
  return (
    <div className="bg-gray-950 min-h-screen p-6">
      <div className="flex gap-6 justify-center flex-wrap">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-2xl bg-gray-800/60 p-6 animate-pulse space-y-4 w-64">
            <div className="h-6 w-32 rounded bg-gray-700/80" />
            <div className="h-8 w-24 rounded bg-gray-700/60" />
            {Array.from({ length: 5 }).map((_, j) => (
              <div key={j} className="h-4 rounded bg-gray-700/40" />
            ))}
            <div className="h-10 rounded-xl bg-gray-700/60" />
          </div>
        ))}
      </div>
    </div>
  );
}
