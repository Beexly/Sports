"use client";

import { useEffect } from "react";
import Link from "next/link";
import { captureError, initObservability } from "@/lib/observability/sentry";

/**
 * Global error boundary. Server-side errors arrive with a `digest`
 * field and a sanitized `error.message` from Next.js — we never see
 * the raw stack in production. Client-side errors get the full
 * message; we still avoid surfacing stack traces and keep the copy
 * on-brand. No banned phrases, no apologies that read as legal admissions.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Defensive init: SentryClientInit in root layout normally handles this,
    // but error boundaries can mount before the layout's useEffect fires.
    // initObservability is idempotent (_initialized guard makes this safe).
    initObservability();
    // eslint-disable-next-line no-console
    console.error("[app] error boundary caught:", error);
    captureError(error, { digest: error.digest });
  }, [error]);

  const isProd = process.env.NODE_ENV === "production";
  // In production, server errors arrive sanitized — show only the digest
  // (a Next.js correlation id we can match in logs). In dev, show the
  // full message so engineers can debug.
  const visibleDetail = isProd
    ? error.digest
      ? `Reference: ${error.digest}`
      : "A correlation id was not generated for this error."
    : error.message;

  return (
    <div className="flex min-h-screen items-center justify-center bg-obsidian p-6 text-ion-1">
      <div className="max-w-xl rounded-2xl border border-red-900 bg-red-950/30 p-6">
        <h1 className="text-xl font-bold text-white">
          Something broke on my side.
        </h1>
        <p className="mt-2 text-sm text-red-200">
          The page hit a runtime error. Hit retry, or head home — the
          observatory has the trace either way.
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
