"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function TrendsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("[trends] error boundary caught:", error);
  }, [error]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center p-6 text-gray-200">
      <div className="max-w-md rounded-2xl border border-red-900 bg-red-950/30 p-6">
        <h2 className="text-lg font-bold text-white">Trend Lab couldn't load.</h2>
        <p className="mt-2 text-sm text-red-200">
          A runtime error stopped the trend data from rendering. The underlying
          statistical engine is unaffected — retry to reload.
        </p>
        {error.digest && (
          <p className="mt-2 font-mono text-[11px] text-red-300">ref: {error.digest}</p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={reset}
            className="rounded-lg bg-red-900/60 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800"
          >
            Retry
          </button>
          <Link
            href="/players"
            className="rounded-lg border border-red-900 px-4 py-2 text-sm text-red-200 hover:bg-red-950/40"
          >
            Player Lab
          </Link>
        </div>
      </div>
    </div>
  );
}
