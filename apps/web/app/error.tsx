"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("[app] error boundary caught:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 p-6 text-gray-200">
      <div className="max-w-xl rounded-2xl border border-red-900 bg-red-950/30 p-6">
        <h1 className="text-xl font-bold text-white">Something broke on my side.</h1>
        <p className="mt-2 text-sm text-red-200">
          The page hit a runtime error. Hit retry, or head home — I&apos;ll
          see the trace either way.
        </p>
        <pre className="mt-3 overflow-x-auto rounded-lg bg-red-950/60 p-3 text-xs text-red-100">
          {error.message}
        </pre>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => reset()}
            className="rounded-lg bg-red-900/60 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800"
          >
            Retry
          </button>
          <Link
            href="/"
            className="rounded-lg border border-red-900 px-4 py-2 text-sm text-red-200 hover:bg-red-950/40"
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
