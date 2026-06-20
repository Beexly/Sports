"use client";

import { useEffect } from "react";
import Link from "next/link";
import { captureError, initObservability } from "@/lib/observability/sentry";
import { LogoMarkInline } from "@/components/brand/logo-mark-inline";

/**
 * Global error boundary. Server-side errors arrive with a `digest`
 * field and a sanitized `error.message` from Next.js.
 *
 * v2 — The mark stays visible even when the engine breaks.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    initObservability();
    console.error("[app] error boundary caught:", error);
    captureError(error, { digest: error.digest });
  }, [error]);

  const isProd = process.env.NODE_ENV === "production";
  const visibleDetail = isProd
    ? error.digest
      ? `Reference: ${error.digest}`
      : "A correlation id was not generated for this error."
    : error.message;

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-obsidian p-6 text-ion-1">
      {/* Background mark — still breathing */}
      <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <LogoMarkInline size={400} pulse className="opacity-[0.04]" />
      </div>

      <div className="relative z-10 max-w-xl rounded-2xl border border-red-900 bg-red-950/30 p-8 text-center">
        <div className="mb-5 flex justify-center">
          <LogoMarkInline size={40} pulse glow />
        </div>

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
        <div className="mt-5 flex flex-wrap justify-center gap-2">
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
