"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function BoardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("[board] error boundary:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-obsidian px-6 py-16">
      <div className="w-full max-w-md rounded-2xl border border-alert/40 bg-alert/5 p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-alert/30 bg-alert/10">
          <svg aria-hidden="true" className="h-5 w-5 text-alert" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 7.5A2.25 2.25 0 017.5 5.25h9a2.25 2.25 0 012.25 2.25v9a2.25 2.25 0 01-2.25 2.25h-9a2.25 2.25 0 01-2.25-2.25v-9z" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-white">Board unavailable</h2>
        <p className="mt-2 text-sm text-ink-300">
          The live board hit an error during render. Picks are still being generated — this is a display issue only.
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
            Reload board
          </button>
          <Link
            href="/picks"
            className="rounded-xl border border-white/[0.10] px-5 py-2 text-sm text-ink-400 hover:bg-white/[0.04] hover:text-white transition-colors"
          >
            Picks feed
          </Link>
        </div>
      </div>
    </div>
  );
}
