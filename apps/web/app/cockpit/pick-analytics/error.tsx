"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * Route-level error boundary for the Pick Analytics workbench.
 *
 * The loader already degrades to an honest-empty report on DB failure, so this
 * only catches a render-time throw (e.g. a downstream type/shape mismatch). It
 * mirrors the cockpit error.tsx convention: a clean operator-facing panel rather
 * than a Next.js stack trace. It asserts nothing about the underlying record.
 */
export default function PickAnalyticsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("[cockpit/pick-analytics] error boundary caught:", error);
  }, [error]);

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-red-900 bg-red-950/30 p-6 text-red-200">
      <h2 className="text-lg font-semibold text-white">Pick Analytics workbench error</h2>
      <p className="text-sm">
        Something inside this workbench threw on render. The loader catches DB
        errors itself and degrades to an honest-empty report, so this is most
        likely a downstream type or shape mismatch — no published pick is affected.
      </p>
      <pre className="overflow-x-auto rounded-lg bg-red-950/60 p-3 text-xs text-red-100">
        {error.message}
      </pre>
      {error.digest && (
        <p className="text-[10px] uppercase tracking-widest text-red-400">
          digest: {error.digest}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => reset()}
          className="rounded-lg bg-red-900/60 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800"
        >
          Try again
        </button>
        <Link
          href="/cockpit"
          className="rounded-lg border border-red-900 px-4 py-2 text-sm text-red-200 hover:bg-red-950/40"
        >
          Reload /cockpit
        </Link>
      </div>
    </div>
  );
}
