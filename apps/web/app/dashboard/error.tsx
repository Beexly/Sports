"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("[dashboard] error boundary:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-obsidian px-6 py-16">
      <div className="w-full max-w-md rounded-2xl border border-alert/40 bg-alert/5 p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-alert/30 bg-alert/10">
          <svg aria-hidden="true" className="h-5 w-5 text-alert" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-white">Dashboard failed to load</h2>
        <p className="mt-2 text-sm text-ink-300">
          There was a problem loading your dashboard data. Your account, picks, and subscription are unaffected.
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
            href="/board"
            className="rounded-xl border border-white/[0.10] px-5 py-2 text-sm text-ink-400 hover:bg-white/[0.04] hover:text-white transition-colors"
          >
            View picks
          </Link>
        </div>
      </div>
    </div>
  );
}
