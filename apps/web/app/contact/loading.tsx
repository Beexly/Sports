export default function Loading() {
  return (
    <div className="bg-gray-950 min-h-screen p-6 max-w-lg mx-auto space-y-4">
      <div className="h-8 w-40 rounded-xl bg-gray-800/60 animate-pulse mb-6" />
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-12 rounded-xl bg-gray-800/60 animate-pulse" />
      ))}
      <div className="h-32 rounded-xl bg-gray-800/60 animate-pulse" />
      <div className="h-12 w-32 rounded-xl bg-gray-800/60 animate-pulse" />
    </div>
  );
}
