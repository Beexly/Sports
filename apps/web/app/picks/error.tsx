"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function PicksError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("[picks] error boundary:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-obsidian px-6 py-16">
      <div className="w-full max-w-md rounded-2xl border border-alert/40 bg-alert/5 p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-alert/30 bg-alert/10">
          <svg className="h-5 w-5 text-alert" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-white">Picks failed to load</h2>
        <p className="mt-2 text-sm text-ink-400">
          The picks board hit a server error. The data pipeline is intact — this is likely a transient rendering issue.
        </p>
        {error.digest && (
          <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-ink-500">
            ref: {error.digest}
          </p>
        )}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            onClick={() => reset()}
            className="rounded-xl bg-brand-600 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-500 transition-colors"
          >
            Try again
          </button>
          <Link
            href="/"
            className="rounded-xl border border-white/[0.10] px-5 py-2 text-sm text-ink-400 hover:bg-white/[0.04] hover:text-white transition-colors"
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
