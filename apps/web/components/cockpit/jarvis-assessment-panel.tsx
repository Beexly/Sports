import type { JarvisAssessment, JarvisHealth } from "@/lib/cockpit/jarvis";
import type { PublicPerformancePolicy } from "@/lib/performance/public-performance-policy";
import { launchStatusStyle, healthTone } from "@/lib/cockpit/status-styles";

/**
 * JarvisAssessmentPanel — reusable rendering of a synthesized
 * JarvisAssessment + the paired PublicPerformancePolicy.
 *
 * The cockpit page composes its own layout currently; this component is
 * available for the next refactor that wants a single import to replace
 * a long block of JSX.
 *
 * Pure presentation. No I/O. Suitable for both server and client
 * components.
 */

export interface JarvisAssessmentPanelProps {
  readonly assessment: JarvisAssessment;
  readonly policy: PublicPerformancePolicy;
  readonly className?: string;
}

export function JarvisAssessmentPanel({
  assessment,
  policy,
  className,
}: JarvisAssessmentPanelProps) {
  const style = launchStatusStyle(assessment.launchStatus);
  const sectional: Array<[string, JarvisHealth]> = [
    ["Public surface", assessment.publicSurfaceStatus],
    ["Customer dashboard", assessment.customerDashboardStatus],
    ["Picks", assessment.picksStatus],
    ["Performance", assessment.performanceStatus],
    ["Cockpit", assessment.cockpitStatus],
    ["Historical picks", assessment.historicalPickStatus],
    ["Ingestion", assessment.ingestionStatus],
    ["Settlement", assessment.settlementStatus],
    ["Canonical history", assessment.canonicalHistoryStatus],
    ["Bootstrap", assessment.bootstrapStatus],
    ["Signal coverage", assessment.signalCoverageStatus],
  ];

  return (
    <section
      data-testid="jarvis-assessment-panel"
      className={[
        "rounded-2xl border border-titanium/40 bg-eclipse/40 p-5",
        className ?? "",
      ].join(" ")}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-ion-2">
            Jarvis launch assessment
          </h2>
          <p className="mt-1 text-sm text-ion-1">
            {assessment.oneSentenceAssessment}
          </p>
          <p className="mt-1 text-label text-ion-3">
            {assessment.version} · assessed {assessment.assessedAt} · confidence{" "}
            {assessment.confidenceLevel.toLowerCase()}
          </p>
        </div>
        <span
          data-testid="jarvis-launch-status"
          className={["rounded-full px-3 py-1 text-label font-bold uppercase tracking-widest ring-1", style.tone].join(" ")}
        >
          {style.label}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-label-lg sm:grid-cols-3 lg:grid-cols-6">
        {sectional.map(([label, health]) => (
          <div
            key={label}
            className="rounded-lg border border-titanium/40 bg-obsidian/50 px-3 py-2"
          >
            <p className="text-label uppercase tracking-widest text-ion-3">{label}</p>
            <p className={["mt-1 font-bold", healthTone(health)].join(" ")}>{health}</p>
          </div>
        ))}
      </div>

      <div className="mt-5">
        <h3 className="text-label font-semibold uppercase tracking-widest text-ion-3">
          Public-performance policy
        </h3>
        <p className="mt-1 text-label-lg text-ion-1">{policy.publicMessage}</p>
        <p className="mt-1 text-label text-ion-3">{policy.operatorMessage}</p>
      </div>

      {assessment.safetyWarnings.length > 0 && (
        <div className="mt-5">
          <h3 className="text-label font-semibold uppercase tracking-widest text-alert">Safety warnings</h3>
          <ul className="mt-2 space-y-1 text-label-lg text-alert">
            {assessment.safetyWarnings.map((w) => (
              <li key={w}>• {w}</li>
            ))}
          </ul>
        </div>
      )}

      {assessment.recommendedNextActions.length > 0 && (
        <div className="mt-5">
          <h3 className="text-label font-semibold uppercase tracking-widest text-ion-3">
            Recommended next actions
          </h3>
          <ol className="ml-5 mt-2 list-decimal space-y-1 text-label-lg text-ion-1">
            {assessment.recommendedNextActions.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}
