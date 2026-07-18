"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function TodayError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("[today] error boundary caught:", error);
  }, [error]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center p-6 text-ion">
      <div className="max-w-md rounded-2xl border border-red-900 bg-red-950/30 p-6">
        <h2 className="text-lg font-bold text-white">Mission Control couldn't load.</h2>
        <p className="mt-2 text-sm text-red-200">
          A runtime error stopped today's command deck from rendering. Retry to
          reload, or check the Live Board for current signals.
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
            href="/board"
            className="rounded-lg border border-red-900 px-4 py-2 text-sm text-red-200 hover:bg-red-950/40"
          >
            Live Board
          </Link>
        </div>
      </div>
    </div>
  );
}
