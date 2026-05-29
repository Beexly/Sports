/**
 * Galaxy Reports Registry — typed manifest of all report types.
 *
 * Drives: /reports hub, /reports/[type] detail pages, sitemap.
 * No methodology content here — only structural + presentational metadata.
 */

export type ReportTypeId =
  | "orbit"
  | "edge"
  | "mirage"
  | "signal"
  | "season"
  | "nobet";

export interface ReportType {
  readonly id: ReportTypeId;
  readonly name: string;
  readonly cadence: string;
  readonly description: string;
  /** Tailwind border + bg accent for the card on /reports */
  readonly accentClass: string;
  /** Tailwind text color for the type label */
  readonly labelClass: string;
  /** Tailwind bg for the dot indicator */
  readonly dotClass: string;
  /** Short label used in the detail page eyebrow and OG images */
  readonly eyebrowLabel: string;
  /** Whether this report type is gated to Pro/Elite tier */
  readonly tier: "all" | "pro";
  /** One-paragraph anatomy of what this report contains */
  readonly anatomy: string;
}

export const REPORT_TYPES: ReadonlyArray<ReportType> = [
  {
    id: "orbit",
    name: "Orbit Report",
    cadence: "Weekly",
    eyebrowLabel: "ORBIT",
    description: "Weekly intelligence synthesis. What the model saw, what it skipped, what changed.",
    accentClass: "border-blue-600/40 bg-blue-950/10",
    labelClass: "text-blue-400",
    dotClass: "bg-blue-500",
    tier: "pro",
    anatomy:
      "Each Orbit Report covers one full week of model activity: which slates were gated, which were passed, factor shifts across sports, and any notable calibration events. Written as operator-grade intelligence, not editorial opinion.",
  },
  {
    id: "edge",
    name: "Edge Report",
    cadence: "Signal-triggered",
    eyebrowLabel: "EDGE",
    description: "When a significant market opportunity appears that the model scored highly.",
    accentClass: "border-emerald-600/40 bg-emerald-950/10",
    labelClass: "text-emerald-400",
    dotClass: "bg-emerald-500",
    tier: "pro",
    anatomy:
      "Edge Reports publish only when the model's edge score clears a defined threshold — not on a calendar. Each report includes the pick, the scored factors, the market context at time of publication, and the line at close. Past-performance disclaimer included.",
  },
  {
    id: "mirage",
    name: "Market Mirage",
    cadence: "Irregular",
    eyebrowLabel: "MARKET MIRAGE",
    description: "Identifying when public narrative diverges from actual market signals.",
    accentClass: "border-amber-600/40 bg-amber-950/10",
    labelClass: "text-amber-400",
    dotClass: "bg-amber-500",
    tier: "pro",
    anatomy:
      "Market Mirage reports map the gap between public consensus (news volume, social signal, public betting percentages) and actual market behavior (line movement, limits, steam). The report does not predict outcomes — it documents the divergence.",
  },
  {
    id: "signal",
    name: "Signal Report",
    cadence: "Monthly per sport",
    eyebrowLabel: "SIGNAL",
    description: "Sport-specific deep dives: a single factor, explained with data.",
    accentClass: "border-violet-600/40 bg-violet-950/10",
    labelClass: "text-violet-400",
    dotClass: "bg-violet-500",
    tier: "pro",
    anatomy:
      "Signal Reports focus on one factor per sport per month: how it is measured, what the historical correlation looks like, and where the current market seems to under- or over-weight it. Factor weights and thresholds are not disclosed.",
  },
  {
    id: "season",
    name: "Season Preview",
    cadence: "Pre-season",
    eyebrowLabel: "SEASON PREVIEW",
    description: "Pre-season analysis: team changes, coaching shifts, market implications.",
    accentClass: "border-slate-600/40 bg-slate-900/40",
    labelClass: "text-slate-300",
    dotClass: "bg-slate-500",
    tier: "pro",
    anatomy:
      "Season Previews cover roster construction, coaching staff changes, schedule strength, and how the model's factor inputs are likely to behave in the first six weeks. No win-total picks. Sample data labeled in pre-season calibration window.",
  },
  {
    id: "nobet",
    name: "No-Bet Report",
    cadence: "As warranted",
    eyebrowLabel: "NO-BET",
    description: "Why the model passed. Transparent about what didn't clear the gate.",
    accentClass: "border-rose-600/30 bg-rose-950/10",
    labelClass: "text-rose-400",
    dotClass: "bg-rose-500",
    tier: "all",
    anatomy:
      "No-Bet Reports are the discipline layer made visible. Each one names the slate, the gate that was not cleared, and the factor that caused the pass. The goal is to make restraint legible, not to rationalize after the fact.",
  },
] as const;

/** @deprecated — use REPORT_TYPES from kernel. Kept for one-cycle rollback. */
export const LEGACY_REPORT_TYPES = REPORT_TYPES;

export function getReportType(id: string): ReportType | undefined {
  return REPORT_TYPES.find((r) => r.id === id);
}

export function isValidReportTypeId(id: string): id is ReportTypeId {
  return REPORT_TYPES.some((r) => r.id === id);
}
