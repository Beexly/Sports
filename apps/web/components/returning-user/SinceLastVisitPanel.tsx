"use client";

import * as React from "react";

const LAST_SEEN_COOKIE = "gse_last_seen";
const COOKIE_MAX_AGE_DAYS = 60;

export interface SinceLastVisitPanelProps {
  readonly isFirstVisit: boolean;
  readonly lastSeenAt: string | null;
  readonly picksPublishedSince: number;
  readonly picksSettledSince: number;
  readonly autopsiesWaiting: number;
}

/**
 * Client wrapper that:
 *   1. Renders the brief panel.
 *   2. Writes the lastSeenAt cookie on mount (so the NEXT visit has a delta).
 *
 * Cookie write is fire-and-forget; no errors surfaced.
 */
export function SinceLastVisitPanel(props: SinceLastVisitPanelProps): JSX.Element {
  React.useEffect(() => {
    const now = new Date().toISOString();
    const expires = new Date();
    expires.setDate(expires.getDate() + COOKIE_MAX_AGE_DAYS);
    try {
      document.cookie = `${LAST_SEEN_COOKIE}=${encodeURIComponent(now)}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
    } catch {
      // ignore — telemetry must never disrupt the experience
    }
  }, []);

  const { isFirstVisit, lastSeenAt, picksPublishedSince, picksSettledSince, autopsiesWaiting } = props;

  return (
    <section
      aria-label="Since your last visit"
      className="rounded-2xl border border-mineral bg-gray-900/55 p-6"
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ion-blue">
        {isFirstVisit ? "Welcome" : "Since your last visit"}
      </p>
      {isFirstVisit ? (
        <>
          <h3 className="mt-2 text-xl font-bold text-white">First time here?</h3>
          <p className="mt-3 text-sm leading-6 text-gray-400">
            Galaxy remembers visits with a cookie — nothing more. Next time you return, this panel will show what
            changed since you were last here: picks published, picks settled, autopsies waiting. No account required.
          </p>
        </>
      ) : (
        <>
          <h3 className="mt-2 text-xl font-bold text-white">
            {picksPublishedSince === 0 && picksSettledSince === 0
              ? "No new decisions since you were last here."
              : "Here&apos;s what changed."}
          </h3>
          <dl className="mt-5 grid gap-3 sm:grid-cols-3">
            <Stat label="Picks published" value={picksPublishedSince} />
            <Stat label="Picks settled" value={picksSettledSince} />
            <Stat label="Autopsies waiting" value={autopsiesWaiting} />
          </dl>
          {lastSeenAt && (
            <p className="mt-4 text-xs text-gray-500">
              Last visit:{" "}
              <span className="font-mono text-gray-400">
                {lastSeenAt.slice(0, 19).replace("T", " ")}Z
              </span>
            </p>
          )}
        </>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }): JSX.Element {
  return (
    <div className="border border-mineral bg-carbon/60 p-3">
      <dt className="font-mono text-[9px] uppercase tracking-[0.16em] text-gray-500">{label}</dt>
      <dd className="mt-1 text-2xl font-black tabular-nums text-white">{value}</dd>
    </div>
  );
}
