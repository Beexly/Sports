/**
 * CockpitPulse — server-rendered one-line summary of the cross-cutting
 * cockpit signals. Drops into the top of /cockpit above the Jarvis
 * content; additive, doesn't touch existing testids.
 *
 * Never throws. Missing telemetry → zeroed pulse with a "no data yet"
 * hint.
 */

import Link from "next/link";
import type { CockpitPulse as PulseShape } from "@/lib/cockpit/pulse";

function fmtUsd(n: number): string {
  if (n === 0) return "$0.00";
  if (n < 0.01) return "<$0.01";
  return `$${n.toFixed(2)}`;
}

function fmtPct(n: number): string {
  if (n === 0) return "—";
  return `${Math.round(n * 1000) / 10}%`;
}

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

export function CockpitPulse({ pulse }: { pulse: PulseShape }) {
  const hasData = pulse.telemetryLogPresent && pulse.callsLast24h > 0;

  return (
    <section
      data-testid="cockpit-pulse"
      aria-label="Cockpit pulse — cross-cutting signals at a glance"
      className="rounded-2xl border border-gray-800 bg-gray-900/60 p-4"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">
          Cockpit pulse
        </h2>
        <span
          data-testid="cockpit-pulse-computed-at"
          className="text-[10px] text-gray-600"
        >
          {pulse.computedAt}
        </span>
      </div>

      {!hasData ? (
        <p
          data-testid="cockpit-pulse-empty"
          className="mt-2 text-sm text-gray-500"
        >
          No Claude telemetry rows in the last 24h.
          {pulse.telemetryLogPresent
            ? ` Log present (${fmtBytes(pulse.telemetryLogBytes)}) but empty for this window.`
            : " Telemetry log not yet created — make at least one Claude call to seed it."}
        </p>
      ) : (
        <dl
          data-testid="cockpit-pulse-grid"
          className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4"
        >
          <PulseStat
            testId="cockpit-pulse-calls"
            label="Calls 24h"
            value={pulse.callsLast24h.toLocaleString()}
            sub={
              pulse.errorsLast24h > 0
                ? `${pulse.errorsLast24h} error${pulse.errorsLast24h === 1 ? "" : "s"}`
                : "0 errors"
            }
            tone={pulse.errorsLast24h > 0 ? "warn" : "ok"}
          />
          <PulseStat
            testId="cockpit-pulse-cache"
            label="Cache hit (24h)"
            value={fmtPct(pulse.cacheHitRate24h)}
            sub={pulse.cacheHitRate24h >= 0.5 ? "healthy" : "low"}
            tone={pulse.cacheHitRate24h >= 0.5 ? "ok" : "info"}
          />
          <PulseStat
            testId="cockpit-pulse-today-usd"
            label="Spend today"
            value={fmtUsd(pulse.todayUsd)}
            sub={`yesterday ${fmtUsd(pulse.yesterdayUsd)}`}
            tone="info"
          />
          <PulseStat
            testId="cockpit-pulse-sites"
            label="Active call sites"
            value={String(pulse.activeCallSites.length)}
            sub={pulse.activeCallSites.slice(0, 3).join(" · ") || "—"}
            tone="info"
          />
        </dl>
      )}

      <nav
        data-testid="cockpit-pulse-nav"
        className="mt-4 flex flex-wrap gap-2 text-[11px]"
      >
        <PulseLink href="/cockpit/telemetry" label="Telemetry →" />
        <PulseLink href="/cockpit/source-health" label="Source health →" />
        <PulseLink href="/cockpit/brief/preview" label="Brief preview →" />
        <PulseLink href="/cockpit/review-draft" label="Draft review →" />
        <PulseLink href="/cockpit/pick-narrator" label="Pick narrator →" />
      </nav>
    </section>
  );
}

function PulseStat({
  testId,
  label,
  value,
  sub,
  tone,
}: {
  testId: string;
  label: string;
  value: string;
  sub: string;
  tone: "ok" | "warn" | "info";
}) {
  const toneClass =
    tone === "ok"
      ? "text-emerald-300"
      : tone === "warn"
        ? "text-yellow-300"
        : "text-gray-300";
  return (
    <div data-testid={testId}>
      <dt className="text-[10px] uppercase tracking-widest text-gray-600">
        {label}
      </dt>
      <dd className={`mt-0.5 text-base font-semibold ${toneClass}`}>{value}</dd>
      <dd className="text-[10px] text-gray-500">{sub}</dd>
    </div>
  );
}

function PulseLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-md border border-gray-800 px-2 py-1 text-gray-300 hover:border-gray-700 hover:bg-gray-900/60"
    >
      {label}
    </Link>
  );
}
