export default function Loading() {
  return (
    <div className="bg-gray-950 min-h-screen p-6">
      <div className="h-10 w-64 rounded-2xl bg-gray-800/60 animate-pulse mb-8" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-4 rounded bg-gray-800/60 animate-pulse" style={{ width: `${70 + i * 5}%` }} />
          ))}
        </div>
        <div className="rounded-2xl bg-gray-800/60 animate-pulse h-48" />
      </div>
    </div>
  );
}
