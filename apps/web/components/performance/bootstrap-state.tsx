import { RiskDisclosure } from "@/components/ui/risk-disclosure";

/**
 * Performance — Bootstrap State
 *
 * Rendered on /performance when either:
 *   - the PERFORMANCE_STATS_ENABLED readiness gate is false, OR
 *   - the gate is true but there are zero canonical settled picks.
 *
 * The point is to be *educational* — explain what would be shown here once
 * the readiness criteria are met, surface the criteria themselves, and
 * never imply a track record exists before it does.
 */

interface BootstrapStateProps {
  /** True if the gate is on but data is empty; false if the gate itself is off. */
  readonly gateEnabled: boolean;
  /**
   * Minimum settled canonical picks required before public stats become
   * meaningful. Sourced from PlatformConfig.minSettledPicksForLearning so
   * the page and the engine stay aligned.
   */
  readonly minSettledPicksForLearning: number;
}

export function PerformanceBootstrapState({
  gateEnabled,
  minSettledPicksForLearning,
}: BootstrapStateProps) {
  return (
    <div data-testid="performance-bootstrap-state" className="mx-auto max-w-3xl">
      {/* Honest empty header */}
      <div className="rounded-2xl border border-mineral bg-eclipse/60 p-8">
        <p
          data-testid="bootstrap-status-label"
          className="text-xs font-semibold uppercase tracking-widest text-caution"
        >
          {gateEnabled ? "No official record yet" : "Public stats disabled"}
        </p>

        <h2 className="mt-3 text-2xl font-bold text-ion-white">
          {gateEnabled
            ? "We're still collecting finished, graded picks from the live engine."
            : "We don't show a track record we haven't earned."}
        </h2>

        <p className="mt-4 text-sm leading-relaxed text-ion-1">
          {gateEnabled
            ? "The performance page is on, but not enough live picks have finished and been graded to publish a win rate that means anything."
            : "Public performance statistics are switched off because not enough live picks have finished and been graded to publish them honestly."}
        </p>

        <p className="mt-3 text-sm leading-relaxed text-ion-1">
          Warm-up picks, those generated before the official record was
          enabled, are stored for internal validation but are{" "}
          <strong className="text-ion-white">never</strong> counted in public
          performance numbers. We do this on purpose so the first numbers you
          see represent the live engine, not warm-up data.
        </p>
      </div>

      {/* Readiness ladder */}
      <section
        data-testid="readiness-ladder"
        className="mt-8 rounded-2xl border border-mineral bg-eclipse/40 p-6"
        aria-labelledby="ladder-heading"
      >
        <h3
          id="ladder-heading"
          className="text-sm font-semibold uppercase tracking-widest text-ion-2"
        >
          What needs to be true before this page shows data
        </h3>
        <ol className="mt-4 space-y-3 text-sm text-ion-1">
          <li className="flex gap-3">
            <span className="text-ion-3">1.</span>
            <span>
              The official record is on and new picks are being written as{" "}
              <code className="rounded bg-titanium px-1 py-0.5 font-mono text-xs text-ion-1">
                isBootstrap=false
              </code>
              .
            </span>
          </li>
          <li className="flex gap-3">
            <span className="text-ion-3">2.</span>
            <span>
              At least{" "}
              <strong className="font-numerals tabular-nums text-ion-white">
                {minSettledPicksForLearning}
              </strong>{" "}
              official picks have settled with verified outcomes.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="text-ion-3">3.</span>
            <span>
              The platform's <code className="rounded bg-titanium px-1 py-0.5 font-mono text-xs text-ion-1">PERFORMANCE_STATS_ENABLED</code> readiness gate is set to true.
            </span>
          </li>
        </ol>
      </section>

      {/* What we will show once unlocked */}
      <section
        data-testid="bootstrap-what-we-show"
        className="mt-8 rounded-2xl border border-mineral bg-eclipse/40 p-6"
      >
        <h3 className="text-sm font-semibold uppercase tracking-widest text-ion-2">
          What you'll see once data is published
        </h3>
        <ul className="mt-4 space-y-2 text-sm text-ion-1">
          <li>• Sample size and period covered</li>
          <li>• Model version used during the period</li>
          <li>• Win / loss / push counts, computed only from official live-engine picks</li>
          <li>
            • Win rate computed as{" "}
            <code className="rounded bg-titanium px-1 py-0.5 font-mono text-xs text-ion-1">
              wins divided by decided outcomes
            </code>
            ; pushes are reported separately
          </li>
          <li>• Timestamp when the summary was last computed</li>
        </ul>
      </section>

      <div className="mt-8">
        <RiskDisclosure variant="card" includePastPerformance />
      </div>
    </div>
  );
}
