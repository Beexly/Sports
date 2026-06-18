import type { JarvisAssessment, JarvisHealth, JarvisLaunchStatus } from "@/lib/cockpit/jarvis";
import type { PublicPerformancePolicy } from "@/lib/performance/public-performance-policy";

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

function launchStatusStyle(status: JarvisLaunchStatus): { label: string; tone: string } {
  switch (status) {
    case "LAUNCH_READY":
      return { label: "LAUNCH READY", tone: "bg-green-900/50 text-green-300 ring-green-700/40" };
    case "LAUNCH_READY_PENDING_EXTERNAL_CONFIG":
      return {
        label: "LAUNCH READY · pending external config",
        tone: "bg-yellow-900/40 text-yellow-300 ring-yellow-700/40",
      };
    case "NOT_READY_DATA":
      return { label: "NOT READY · data", tone: "bg-red-900/40 text-red-300 ring-red-700/40" };
    case "NOT_READY_VALIDATION":
      return { label: "NOT READY · validation", tone: "bg-orange-900/40 text-orange-300 ring-orange-700/40" };
    case "NOT_READY_SAFETY":
      return { label: "NOT READY · safety", tone: "bg-red-900/60 text-red-200 ring-red-700/40" };
    case "UNKNOWN":
    default:
      return { label: "UNKNOWN", tone: "bg-obsidian/70 text-ink-300 ring-titanium/40" };
  }
}

function healthTone(h: JarvisHealth): string {
  switch (h) {
    case "GREEN":
      return "text-green-400";
    case "AMBER":
      return "text-yellow-300";
    case "RED":
      return "text-red-400";
    case "UNKNOWN":
    default:
      return "text-ink-500";
  }
}

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
        "rounded-2xl border border-white/[0.06] bg-white/[0.04]/40 p-5",
        className ?? "",
      ].join(" ")}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-ink-400">
            Jarvis launch assessment
          </h2>
          <p className="mt-1 text-sm text-ink-300">
            {assessment.oneSentenceAssessment}
          </p>
          <p className="mt-1 text-[10px] text-ink-500">
            {assessment.version} · assessed {assessment.assessedAt} · confidence{" "}
            {assessment.confidenceLevel.toLowerCase()}
          </p>
        </div>
        <span
          data-testid="jarvis-launch-status"
          className={["rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest ring-1", style.tone].join(" ")}
        >
          {style.label}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-[11px] sm:grid-cols-3 lg:grid-cols-6">
        {sectional.map(([label, health]) => (
          <div
            key={label}
            className="rounded-lg border border-white/[0.06] bg-obsidian/50 px-3 py-2"
          >
            <p className="text-[10px] uppercase tracking-widest text-ink-500">{label}</p>
            <p className={["mt-1 font-bold", healthTone(health)].join(" ")}>{health}</p>
          </div>
        ))}
      </div>

      <div className="mt-5">
        <h3 className="text-[10px] font-semibold uppercase tracking-widest text-ink-500">
          Public-performance policy
        </h3>
        <p className="mt-1 text-[11px] text-ink-300">{policy.publicMessage}</p>
        <p className="mt-1 text-[10px] text-ink-500">{policy.operatorMessage}</p>
      </div>

      {assessment.safetyWarnings.length > 0 && (
        <div className="mt-5">
          <h3 className="text-[10px] font-semibold uppercase tracking-widest text-red-400">Safety warnings</h3>
          <ul className="mt-2 space-y-1 text-[11px] text-red-300">
            {assessment.safetyWarnings.map((w) => (
              <li key={w}>• {w}</li>
            ))}
          </ul>
        </div>
      )}

      {assessment.recommendedNextActions.length > 0 && (
        <div className="mt-5">
          <h3 className="text-[10px] font-semibold uppercase tracking-widest text-ink-500">
            Recommended next actions
          </h3>
          <ol className="ml-5 mt-2 list-decimal space-y-1 text-[11px] text-ink-300">
            {assessment.recommendedNextActions.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}
