"use client";

import { useEffect } from "react";

/**
 * Cockpit error boundary.
 *
 * If anything inside /cockpit/* throws (e.g. Jarvis synthesis blows up
 * because a downstream schema field is missing), we still want a clean
 * operator-facing page rather than a Next.js stack trace.
 */
export default function CockpitError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("[cockpit] error boundary caught:", error);
  }, [error]);

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-red-900 bg-red-950/30 p-6 text-red-200">
      <h2 className="text-lg font-semibold text-white">Cockpit error</h2>
      <p className="text-sm">
        Something inside the cockpit threw on render. Jarvis catches DB
        errors itself, so this is most likely a downstream type or model
        mismatch.
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
        <a
          href="/cockpit"
          className="rounded-lg border border-red-900 px-4 py-2 text-sm text-red-200 hover:bg-red-950/40"
        >
          Reload /cockpit
        </a>
      </div>
    </div>
  );
}
