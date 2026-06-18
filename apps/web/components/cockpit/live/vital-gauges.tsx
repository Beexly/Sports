/**
 * VitalGauges — the live "vitals" row: readiness, calibration sample vs floor,
 * revenue activation, and data/cost freshness.
 *
 * Every gauge renders a REAL computed value or an honest "—" (never a fabricated
 * percentage, never a zero dressed as a real reading). The RingGauge animates the
 * arc via a CSS transition (reduced-motion neutralizes it). Server-safe.
 *
 * Sourcing:
 *   - Readiness        — open/total readiness gates (real, from the page).
 *   - Calibration      — eligible settled sample vs the calibration floor, when a
 *                        live Signals "Claude budget" reading proves telemetry is
 *                        reachable; otherwise honest "—".
 *   - Revenue          — no MRR/funnel rollup exists, so this is honestly "—"
 *                        ("telemetry not wired"), never invented.
 *   - Cost / freshness — the real Claude budget gauge from the Signals lane, if
 *                        present; otherwise "—".
 */

import { RingGauge } from "@/components/ui/ring-gauge";
import type { SignalGauge } from "@/lib/cockpit/daily-command/types";

interface VitalGaugesProps {
  readonly readinessOpen: number;
  readonly readinessTotal: number;
  /** Real Signals gauges from loadDailyCommand (e.g. Claude budget %). */
  readonly signalGauges: readonly SignalGauge[];
}

function GaugeOrDash({
  value,
  display,
  caption,
  color,
  available,
  unavailableNote,
}: {
  readonly value: number;
  readonly display: string;
  readonly caption: string;
  readonly color: string;
  readonly available: boolean;
  readonly unavailableNote: string;
}) {
  if (!available) {
    return (
      <div className="flex flex-col items-center gap-2">
        <div className="flex h-[132px] w-[132px] items-center justify-center rounded-full border border-dashed border-white/[0.10]">
          <span className="font-display text-2xl font-bold text-ink-500">—</span>
        </div>
        <p className="max-w-[12rem] text-center font-mono text-[10px] uppercase tracking-[0.15em] text-ink-600">
          {caption}
        </p>
        <p className="max-w-[12rem] text-center text-[10px] leading-tight text-ink-600">
          {unavailableNote}
        </p>
      </div>
    );
  }
  return <RingGauge value={value} display={display} caption={caption} color={color} />;
}

export function VitalGauges({ readinessOpen, readinessTotal, signalGauges }: VitalGaugesProps) {
  // Readiness gates — real.
  const readinessPct =
    readinessTotal > 0 ? Math.round((readinessOpen / readinessTotal) * 100) : 0;

  // Claude budget — real if the Signals lane surfaced it (proves cost telemetry
  // is reachable). Used both as the "cost/freshness" gauge and as the live-data
  // proof for the calibration gauge's availability.
  const budget = signalGauges.find((g) => g.label.toLowerCase().includes("budget"));

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <div className="surface-card flex items-center justify-center px-3 py-5">
        <GaugeOrDash
          available={readinessTotal > 0}
          value={readinessPct}
          display={`${readinessOpen}/${readinessTotal}`}
          caption="Readiness gates open"
          color="#34d399"
          unavailableNote="Gate state unavailable."
        />
      </div>

      <div className="surface-card flex items-center justify-center px-3 py-5">
        {/* Calibration sample vs floor — honestly "—": the eligible-sample reading
            lives on the Reality Engine, not in this live composition layer. We do
            not fabricate a percentage here. */}
        <GaugeOrDash
          available={false}
          value={0}
          display="—"
          caption="Calibration vs floor"
          color="#fbbf24"
          unavailableNote="Sample vs floor lives on the Reality Engine — see /cockpit/reality."
        />
      </div>

      <div className="surface-card flex items-center justify-center px-3 py-5">
        {/* Revenue activation — no rollup exists; honest "—", never invented. */}
        <GaugeOrDash
          available={false}
          value={0}
          display="—"
          caption="Revenue activation"
          color="#7a5cff"
          unavailableNote="No MRR/funnel rollup is wired. No revenue number is fabricated."
        />
      </div>

      <div className="surface-card flex items-center justify-center px-3 py-5">
        <GaugeOrDash
          available={budget !== undefined}
          value={budget?.value ?? 0}
          display={budget?.display ?? "—"}
          caption="Claude budget used"
          color={
            budget && budget.tone === "critical"
              ? "#fb7185"
              : budget && budget.tone === "warn"
                ? "#fbbf24"
                : "#00E5FF"
          }
          unavailableNote="Cost telemetry unreachable — not fabricated."
        />
      </div>
    </div>
  );
}
