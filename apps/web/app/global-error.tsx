"use client";

import { useEffect } from "react";
import { captureError } from "@/lib/observability";

/**
 * Root error boundary.
 *
 * Unlike `app/error.tsx` (a segment boundary), `global-error.tsx` is the
 * last line of defense: it catches errors thrown by the root layout itself,
 * a path the segment boundaries cannot reach. Because it replaces the root
 * layout when it renders, it must supply its own `<html>` and `<body>`.
 *
 * Same on-brand copy posture as `app/error.tsx` — no apologies that read as
 * legal admissions, no raw stack traces. In production the server error is
 * sanitized by Next.js, so we surface only the `digest` correlation id.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("[global] root error boundary caught:", error);
    captureError(error, { surface: "global", digest: error.digest });
  }, [error]);

  const isProd = process.env.NODE_ENV === "production";
  const visibleDetail = isProd
    ? error.digest
      ? `Reference: ${error.digest}`
      : "A correlation id was not generated for this error."
    : error.message;

  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center bg-gray-950 p-6 text-gray-200">
        <div className="max-w-xl rounded-2xl border border-red-900 bg-red-950/30 p-6">
          <h1 className="text-xl font-bold text-white">
            Something broke on my side.
          </h1>
          <p className="mt-2 text-sm text-red-200">
            The page hit a runtime error before it could render. Hit retry —
            the observatory has the trace either way.
          </p>
          <pre className="mt-3 overflow-x-auto rounded-lg bg-red-950/60 p-3 text-[11px] text-red-100">
            {visibleDetail}
          </pre>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => reset()}
              className="rounded-lg bg-red-900/60 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800"
            >
              Retry
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
