"use client";

/**
 * SharePickButton — Web Share API (with clipboard fallback) for a single pick.
 *
 * Zero-dependency, client-only affordance: `navigator.share` on a device that
 * supports it (most mobile browsers, some desktop), else
 * `navigator.clipboard.writeText`, else a visible "copy failed" state so the
 * control never silently does nothing. Shares a plain, factual description
 * (team names + the pick's own selection text) and a link to the tamper-
 * evident /verify receipt when one exists, or the /picks board otherwise —
 * never a claim about odds of winning, and never AI-framed copy (brand rule 8).
 */

import { useCallback, useEffect, useRef, useState } from "react";

interface SharePickButtonProps {
  readonly awayTeam: string;
  readonly homeTeam: string;
  readonly selection: string;
  readonly receiptHash: string | null;
}

type ShareState = "idle" | "shared" | "copied" | "unavailable";

export function SharePickButton({
  awayTeam,
  homeTeam,
  selection,
  receiptHash,
}: SharePickButtonProps) {
  const [state, setState] = useState<ShareState>("idle");
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
    };
  }, []);

  const flash = useCallback((next: ShareState) => {
    setState(next);
    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setState("idle"), 2500);
  }, []);

  const handleShare = useCallback(async () => {
    const path = receiptHash
      ? `/verify?hash=${encodeURIComponent(receiptHash)}`
      : "/picks";
    const url =
      typeof window !== "undefined" ? `${window.location.origin}${path}` : path;
    const title = "Galaxy Sports Edge";
    const text = `${awayTeam} @ ${homeTeam}: ${selection} — Galaxy Sports Edge`;

    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({ title, text, url });
        flash("shared");
        return;
      } catch (err) {
        // AbortError = the user closed the native share sheet; that is not a
        // failure worth reporting. Anything else falls through to clipboard.
        if (err instanceof Error && err.name === "AbortError") return;
      }
    }

    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(url);
        flash("copied");
        return;
      } catch {
        flash("unavailable");
        return;
      }
    }

    flash("unavailable");
  }, [awayTeam, homeTeam, selection, receiptHash, flash]);

  const label =
    state === "shared"
      ? "Shared"
      : state === "copied"
        ? "Link copied"
        : state === "unavailable"
          ? "Copy failed"
          : "Share";

  return (
    <button
      type="button"
      onClick={handleShare}
      aria-label={`Share this pick: ${awayTeam} at ${homeTeam}, ${selection}`}
      className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-titanium bg-carbon/50 px-3 py-1.5 text-[11px] font-medium text-ion-1 transition-colors hover:border-orbital-cyan hover:text-orbital-cyan"
    >
      <svg
        className="h-3.5 w-3.5"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.75}
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z"
        />
      </svg>
      <span aria-live="polite">{label}</span>
    </button>
  );
}
