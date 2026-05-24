"use client";

/**
 * Shared per-segment error boundary. Each route's `error.tsx` is a
 * thin wrapper that supplies the segment's title + back link. UI keeps
 * the brand voice (no banned phrases, no legal admissions) and surfaces
 * only the Next.js digest in production — never the raw stack.
 *
 * Logs the error to the console on mount so the Vercel log capture
 * (and `_logs/` audit trail in local dev) has the trace.
 */

import { useEffect } from "react";
import Link from "next/link";

export interface RouteErrorProps {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
  /** Segment title — used in the heading and the console log prefix. */
  readonly segment: string;
  /** Optional href to surface as the secondary action. Defaults to "/". */
  readonly homeHref?: string;
  /** Optional one-line description that overrides the default copy. */
  readonly description?: string;
}

export function RouteError({
  error,
  reset,
  segment,
  homeHref = "/",
  description,
}: RouteErrorProps) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error(`[${segment}] error boundary caught:`, error);
  }, [error, segment]);

  const isProd = process.env.NODE_ENV === "production";
  const visibleDetail = isProd
    ? error.digest
      ? `Reference: ${error.digest}`
      : "A correlation id was not generated for this error."
    : error.message;

  return (
    <div
      data-testid={`route-error-${segment}`}
      className="mx-auto my-8 max-w-xl rounded-2xl border border-red-900 bg-red-950/30 p-6"
    >
      <h2 className="text-lg font-bold text-white">
        {segment} hit a runtime error.
      </h2>
      <p className="mt-2 text-sm text-red-200">
        {description ??
          "Hit retry, or head back — the observatory has the trace either way."}
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
        <Link
          href={homeHref}
          className="rounded-lg border border-red-900 px-4 py-2 text-sm text-red-200 hover:bg-red-950/40"
        >
          Back
        </Link>
      </div>
    </div>
  );
}
