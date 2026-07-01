"use client";

import { useEffect } from "react";
import Link from "next/link";
import { captureError, initObservability } from "@/lib/observability/sentry";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { LogoMarkInline } from "@/components/brand/logo-mark-inline";

/**
 * Intelligence segment error boundary.
 *
 * There is no intelligence/layout.tsx, so this renders the full branded
 * chrome itself. The intelligence hub mounts heavy lazy client
 * components (ConsensusEngine3DLazy / SignalCourtroom / AgentWarRoom),
 * so this boundary catches their client-render throws closer than the
 * root boundary and offers a retry plus a path back into the glass box.
 */
export default function IntelligenceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    initObservability();
    console.error("[intelligence] error boundary caught:", error);
    captureError(error, { digest: error.digest });
  }, [error]);

  const isProd = process.env.NODE_ENV === "production";
  const visibleDetail = isProd
    ? error.digest
      ? `Reference: ${error.digest}`
      : "A correlation id was not generated for this error."
    : error.message;

  return (
    <div className="relative isolate flex min-h-screen flex-col overflow-hidden bg-obsidian">
      {/* Ambient mark — still breathing */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
      >
        <LogoMarkInline size={320} pulse glow className="opacity-[0.06]" />
      </div>

      <Nav />

      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-22 sm:px-6 lg:px-8">
        <div className="w-full max-w-xl rounded-2xl border border-red-900 bg-red-950/30 p-8 text-center">
          <div className="mb-5 flex justify-center">
            <LogoMarkInline size={40} pulse glow />
          </div>

          <h1 className="text-xl font-bold text-white">
            The glass box hit a snag.
          </h1>
          <p className="mt-2 text-sm text-red-200">
            This page threw a runtime error. Hit retry, or head back into
            the glass box — the observatory has the trace either way.
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
              href="/intelligence"
              className="rounded-lg border border-red-900 px-4 py-2 text-sm text-red-200 hover:bg-red-950/40"
            >
              Back to the glass box
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
