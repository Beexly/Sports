"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function PerformanceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("[performance] error boundary caught:", error);
  }, [error]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center p-6 text-gray-200">
      <div className="max-w-md rounded-2xl border border-red-900 bg-red-950/30 p-6">
        <h2 className="text-lg font-bold text-white">Calibration page couldn't load.</h2>
        <p className="mt-2 text-sm text-red-200">
          A runtime error stopped the performance data from rendering. The settled
          pick record is unaffected — retry to reload.
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
            href="/picks"
            className="rounded-lg border border-red-900 px-4 py-2 text-sm text-red-200 hover:bg-red-950/40"
          >
            Today's Picks
          </Link>
        </div>
      </div>
    </div>
  );
}
