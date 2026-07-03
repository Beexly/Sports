"use client";

import { useEffect } from "react";
import Link from "next/link";

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
    <div className="flex flex-col gap-4 rounded-2xl border border-alert/30 bg-alert/10 p-6 text-ion-1">
      <h2 className="text-lg font-semibold text-ion-white">Cockpit error</h2>
      <p className="text-sm">
        Something inside the cockpit threw on render. Jarvis catches DB
        errors itself, so this is most likely a downstream type or model
        mismatch.
      </p>
      <pre className="overflow-x-auto rounded-lg bg-carbon/70 p-3 text-xs text-ion-2">
        {error.message}
      </pre>
      {error.digest && (
        <p className="text-label uppercase tracking-widest text-alert">
          digest: {error.digest}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => reset()}
          className="rounded-lg bg-alert/20 px-4 py-2 text-sm font-semibold text-ion-white hover:bg-alert/30"
        >
          Try again
        </button>
        <Link
          href="/cockpit"
          className="rounded-lg border border-alert/30 px-4 py-2 text-sm text-ion-1 hover:bg-alert/10"
        >
          Reload /cockpit
        </Link>
      </div>
    </div>
  );
}
