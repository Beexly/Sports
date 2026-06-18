"use client";
import { useEffect } from "react";
import Link from "next/link";

export default function ParlayMriError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[parlay-mri] error boundary:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-obsidian px-6 py-16">
      <div className="w-full max-w-md rounded-2xl border border-alert/40 bg-alert/5 p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-alert/40 bg-alert/10">
          <svg className="h-6 w-6 text-alert" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-white">Parlay MRI failed to load</h2>
        <p className="mt-2 text-sm text-ink-400">The portfolio surgeon hit an error. Try again — no data was saved here.</p>
        {error.digest && (
          <p className="mt-3 font-mono text-[10px] uppercase tracking-wide text-ink-500">
            ref: {error.digest}
          </p>
        )}
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button
            onClick={() => reset()}
            className="rounded-lg bg-orbital-cyan/20 px-5 py-2 text-sm font-semibold text-orbital-cyan transition-colors hover:bg-orbital-cyan/30"
          >
            Try again
          </button>
          <Link
            href="/"
            className="rounded-lg border border-white/[0.10] px-5 py-2 text-sm font-semibold text-ink-300 transition-colors hover:border-ion-2 hover:text-white"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
