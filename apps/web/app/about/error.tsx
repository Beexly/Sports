"use client";
import { useEffect } from "react";
import Link from "next/link";

export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") console.error(error);
    else if (error.digest) console.error("digest:", error.digest);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4">
      <div className="rounded-2xl border border-red-900/40 bg-red-950/20 p-8 text-center max-w-md w-full">
        <p className="text-[10px] font-mono uppercase tracking-widest text-red-400/60 mb-3">
          {error.digest ? `ref · ${error.digest}` : "error"}
        </p>
        <h2 className="text-lg font-semibold text-white mb-2">This page hit a problem</h2>
        <p className="text-sm text-gray-400 mb-6">
          The engine is still running. Try refreshing — if it keeps happening, come back in a few minutes.
        </p>
        <div className="flex gap-3 justify-center">
          <button onClick={reset} className="rounded-lg bg-brand-500/20 border border-brand-500/40 px-4 py-2 text-sm font-medium text-brand-300 hover:bg-brand-500/30 transition-colors">
            Try again
          </button>
          <Link href="/" className="rounded-lg bg-gray-800 border border-gray-700 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 transition-colors">
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
