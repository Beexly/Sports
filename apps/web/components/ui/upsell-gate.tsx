"use client";

import Link from "next/link";
import type { ReactNode } from "react";

/**
 * UpsellGate — the money lever's presentation layer.
 *
 * When `locked`, the gated content is rendered but blurred, inert, and hidden
 * from assistive tech, with a tasteful centered overlay CTA inviting the viewer
 * to unlock with PRO/ELITE. When not locked, children render untouched.
 *
 * SELL THE DEPTH, hide nothing structurally: the blurred shape under the glass
 * signals there is real value here without leaking it. Pure presentational — the
 * caller (a server page/loader) decides `locked` via lib/access.ts and passes a
 * serializable boolean. No data, no method, no formula jargon crosses this line.
 *
 * Reduced-motion safe (no animation) and AA on dark.
 */

export interface UpsellGateProps {
  /** When true, blur + overlay the children behind an unlock CTA. */
  locked: boolean;
  /** Tier required to unlock. Drives the CTA copy. Defaults to PRO. */
  tier?: "PRO" | "ELITE";
  /** The premium content to gate. */
  children: ReactNode;
  /** Optional short line under the lock, e.g. "Deeper reads & positions". */
  label?: string;
}

export function UpsellGate({
  locked,
  tier = "PRO",
  children,
  label,
}: UpsellGateProps): JSX.Element {
  if (!locked) {
    return <>{children}</>;
  }

  return (
    <div className="relative isolate overflow-hidden rounded-ds-md">
      {/* Gated content: blurred, inert, and out of the a11y tree. */}
      <div
        aria-hidden="true"
        className="pointer-events-none select-none blur-sm"
      >
        {children}
      </div>

      {/* Overlay CTA — darkened glass with a deliberate cyan accent. */}
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-surface-sunken/70 px-6 text-center backdrop-blur-[2px]">
        <span
          aria-hidden="true"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-orbital-cyan/40 bg-surface-raised/80 text-orbital-cyan"
        >
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="5" y="11" width="14" height="9" rx="2" />
            <path d="M8 11V8a4 4 0 0 1 8 0v3" />
          </svg>
        </span>

        {label ? (
          <p className="text-xs font-medium leading-5 text-ion-1">{label}</p>
        ) : null}

        <Link
          href="/pricing"
          className="inline-flex items-center gap-1.5 rounded-ds-md border border-orbital-cyan/50 bg-orbital-cyan/10 px-4 py-2 text-sm font-semibold text-orbital-cyan transition-colors hover:bg-orbital-cyan/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orbital-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-surface-sunken"
        >
          Unlock with {tier}
        </Link>
      </div>
    </div>
  );
}
