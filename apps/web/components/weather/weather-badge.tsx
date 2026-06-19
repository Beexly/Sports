"use client";

/**
 * WeatherBadge — accessible, token-styled game-time weather display.
 *
 * - Renders nothing when weather is null (honest empty state).
 * - Reduced-motion safe (no animation classes).
 * - No new npm dependencies.
 * - DISPLAY-ONLY: never feeds the prediction model.
 *
 * Attribution (CC-BY-4.0) is surfaced in the badge title tooltip and
 * in the visible caption below the stats, per Open-Meteo license terms.
 */

import type { GameWeather } from "@/lib/weather/open-meteo";

// ─── Props ────────────────────────────────────────────────────────────────────

interface WeatherBadgeProps {
  /** Weather data from loadGameWeather. Renders nothing when null. */
  readonly weather: GameWeather | null;
  /** Optional CSS class to append to the outer element. */
  readonly className?: string;
}

// ─── Icon helpers (pure SVG, no external icon lib) ────────────────────────────

function ThermometerIcon(): JSX.Element {
  return (
    <svg
      aria-hidden="true"
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" />
    </svg>
  );
}

function WindIcon(): JSX.Element {
  return (
    <svg
      aria-hidden="true"
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2" />
      <path d="M9.6 4.6A2 2 0 1 1 11 8H2" />
      <path d="M12.6 19.4A2 2 0 1 0 14 16H2" />
    </svg>
  );
}

function UmbrellaIcon(): JSX.Element {
  return (
    <svg
      aria-hidden="true"
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M23 12a11.05 11.05 0 0 0-22 0zm-5 7a3 3 0 0 1-6 0v-7" />
    </svg>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function WeatherBadge({ weather, className = "" }: WeatherBadgeProps): JSX.Element | null {
  if (!weather) return null;

  const ariaLabel = `Game-time weather: ${weather.tempF}°F, wind ${weather.windMph} mph, ${weather.precipProbPct}% precip chance. ${weather.summary}.`;

  return (
    <div
      role="region"
      aria-label={ariaLabel}
      title={weather.attribution}
      className={`inline-flex flex-col gap-1.5 rounded border border-white/[0.12] bg-white/[0.04] px-3 py-2 ${className}`}
    >
      {/* Summary line */}
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#00E5FF]">
        {weather.summary}
      </p>

      {/* Stats row */}
      <div className="flex items-center gap-4">
        {/* Temperature */}
        <span className="flex items-center gap-1 text-xs font-semibold text-white">
          <ThermometerIcon />
          <span>{weather.tempF}&deg;F</span>
        </span>

        {/* Wind */}
        <span className="flex items-center gap-1 text-xs font-semibold text-white">
          <WindIcon />
          <span>{weather.windMph} mph</span>
        </span>

        {/* Precip probability */}
        <span className="flex items-center gap-1 text-xs font-semibold text-white">
          <UmbrellaIcon />
          <span>{weather.precipProbPct}%</span>
        </span>
      </div>

      {/* Attribution — required by CC-BY-4.0 */}
      <p className="text-[9px] leading-tight text-white/40">
        {weather.attribution}
      </p>
    </div>
  );
}
