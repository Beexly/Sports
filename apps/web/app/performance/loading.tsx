export default function Loading() {
  return (
    <div className="bg-gray-950 min-h-screen p-6 space-y-8">
      <div className="h-8 w-64 rounded-xl bg-gray-800/60 animate-pulse" />
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="h-5 w-32 rounded bg-gray-700/60 animate-pulse" />
          {Array.from({ length: 4 }).map((_, j) => (
            <div key={j} className="flex gap-3 animate-pulse">
              {Array.from({ length: 5 }).map((_, k) => (
                <div key={k} className="h-4 flex-1 rounded bg-gray-800/60" />
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
