export interface ContentKpi {
  readonly views?: number;
  readonly watchTimeHours?: number;
  readonly averageViewDurationSeconds?: number;
  readonly clickThroughRate?: number;
  readonly comments?: number;
  readonly shares?: number;
  readonly saves?: number;
  readonly newsletterClicks?: number;
  readonly siteClicks?: number;
  readonly partnerClicks?: number;
  readonly subscribersGained?: number;
}

export interface ContentKpiScore {
  readonly score: number;
  readonly signals: readonly string[];
  readonly nextAction: "double_down" | "repurpose" | "revise_hook" | "archive" | "test_again";
}

export function scoreContentKpis(kpi: ContentKpi): ContentKpiScore {
  const engagement = scaled(kpi.comments, 20) + scaled(kpi.shares, 15) + scaled(kpi.saves, 15);
  const conversion = scaled(kpi.newsletterClicks, 20) + scaled(kpi.siteClicks, 20) + scaled(kpi.partnerClicks, 10) + scaled(kpi.subscribersGained, 20);
  const retention = scaled(kpi.watchTimeHours, 10) + scaled(kpi.averageViewDurationSeconds, 180) + scaled(kpi.clickThroughRate, 0.08);
  const reach = scaled(kpi.views, 2_000);
  const score = roundScore(Math.min(100, reach * 18 + engagement * 28 + conversion * 34 + retention * 20));
  const measured = hasMeasuredKpis(kpi);
  const signals: string[] = ["Scores are internal relative signals until real account analytics establish baselines."];
  if (!measured) signals.push("No analytics recorded yet; a zero score reflects absent data, not measured failure.");
  if ((kpi.newsletterClicks ?? 0) > 0 || (kpi.subscribersGained ?? 0) > 0) signals.push("Owned-audience conversion appeared.");
  if ((kpi.shares ?? 0) > 0 || (kpi.saves ?? 0) > 0) signals.push("Save/share behavior suggests repurposing value.");
  if ((kpi.clickThroughRate ?? 0) < 0.02 && (kpi.views ?? 0) > 500) signals.push("Reach without click-through suggests the hook or CTA needs revision.");
  return { nextAction: decideNextAction(score, kpi, measured), score, signals };
}

function decideNextAction(score: number, kpi: ContentKpi, measured: boolean): ContentKpiScore["nextAction"] {
  if (score >= 80) return "double_down";
  if (score >= 60) return "repurpose";
  if ((kpi.views ?? 0) > 500 && (kpi.clickThroughRate ?? 0) < 0.02) return "revise_hook";
  // Absence of analytics is not evidence of failure: never issue a definitive
  // "archive" verdict against a piece that simply has no measured data yet.
  if (!measured) return "test_again";
  if (score < 25) return "archive";
  return "test_again";
}

function hasMeasuredKpis(kpi: ContentKpi): boolean {
  return [
    kpi.views,
    kpi.watchTimeHours,
    kpi.averageViewDurationSeconds,
    kpi.clickThroughRate,
    kpi.comments,
    kpi.shares,
    kpi.saves,
    kpi.newsletterClicks,
    kpi.siteClicks,
    kpi.partnerClicks,
    kpi.subscribersGained,
  ].some((value) => typeof value === "number" && Number.isFinite(value));
}

function scaled(value: number | undefined, target: number): number {
  if (value === undefined || !Number.isFinite(value) || target <= 0) return 0;
  return Math.max(0, Math.min(1, value / target));
}

function roundScore(value: number): number {
  return Math.round(value * 100) / 100;
}
