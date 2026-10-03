export interface ModelParliamentPrediction {
  readonly id: string;
  readonly modelId: string;
  readonly modelName: string;
  readonly family: "market-anchor" | "tweedie" | "ensemble" | "conformal" | "experimental";
  readonly position: string;
  readonly predictedFantasyPoints: number;
  readonly actualFantasyPoints: number;
  readonly modelStdDev?: number | null;
  readonly marketFantasyPoints?: number | null;
  readonly marketStdDev?: number | null;
  readonly preGameCommittedAt?: string | null;
  readonly settledAt?: string | null;
}

export interface ModelParliamentRow {
  readonly rank: number;
  readonly modelId: string;
  readonly modelName: string;
  readonly family: ModelParliamentPrediction["family"];
  readonly sampleSize: number;
  readonly positions: readonly string[];
  readonly crps: number;
  readonly mae: number;
  readonly marketCrps: number | null;
  readonly crpsEdgeVsMarket: number | null;
  readonly preGameCommitRate: number;
  readonly eligibleForPublicDraft: boolean;
  readonly priced: false;
  readonly status: "shadow";
}

export interface ModelParliamentPublicRow {
  readonly rank: number;
  readonly modelName: string;
  readonly family: ModelParliamentPrediction["family"];
  readonly sampleSize: number;
  readonly crps: number;
  readonly crpsEdgeVsMarket: number | null;
}

export interface ModelParliamentPublicFeed {
  readonly flagKey: "MODEL_PARLIAMENT_PUBLIC_FEED";
  readonly status: "FLAGGED_OFF" | "DRAFT_ONLY";
  readonly enabled: false;
  readonly rows: readonly ModelParliamentPublicRow[];
  readonly note: string;
}

export interface ModelParliamentFeed {
  readonly generatedAt: string;
  readonly leaderboard: readonly ModelParliamentRow[];
  readonly publicFeed: ModelParliamentPublicFeed;
  readonly excludedSampleIds: readonly string[];
  readonly minPublicSampleSize: number;
  readonly priced: false;
  readonly status: "shadow";
  readonly draftOnly: true;
}

export interface ModelParliamentOptions {
  readonly generatedAt?: string;
  readonly minPublicSampleSize?: number;
}

const NORMAL_90_Z = 1.6448536269514722;

function round(value: number, digits = 3): number {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

function finite(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function erf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const abs = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * abs);
  const y =
    1 -
    (((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t +
      0.254829592) *
      t *
      Math.exp(-abs * abs));
  return sign * y;
}

function normalPdf(value: number): number {
  return Math.exp(-0.5 * value ** 2) / Math.sqrt(2 * Math.PI);
}

function normalCdf(value: number): number {
  return 0.5 * (1 + erf(value / Math.SQRT2));
}

function normalCrps(mean: number, stdev: number, actual: number): number {
  const sigma = Math.max(0.1, stdev);
  const z = (actual - mean) / sigma;
  return Math.max(
    0,
    sigma * (z * (2 * normalCdf(z) - 1) + 2 * normalPdf(z) - 1 / Math.sqrt(Math.PI)),
  );
}

function stdevFor(mean: number, explicit: number | null | undefined): number {
  if (finite(explicit) && explicit > 0) return explicit;
  return Math.max(1, Math.abs(mean) * 0.25, NORMAL_90_Z);
}

function mean(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  return round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function isScorable(row: ModelParliamentPrediction): boolean {
  if (!finite(row.predictedFantasyPoints) || !finite(row.actualFantasyPoints)) return false;
  if (!row.preGameCommittedAt) return false;
  if (!row.settledAt) return true;
  return new Date(row.preGameCommittedAt).getTime() < new Date(row.settledAt).getTime();
}

function rowFor(
  rank: number,
  modelId: string,
  rows: readonly ModelParliamentPrediction[],
  minPublicSampleSize: number,
): ModelParliamentRow {
  const first = rows[0];
  if (!first) throw new Error("model parliament row requires at least one sample");
  const crpsValues = rows.map((row) =>
    normalCrps(row.predictedFantasyPoints, stdevFor(row.predictedFantasyPoints, row.modelStdDev), row.actualFantasyPoints),
  );
  const marketRows = rows.filter((row) => finite(row.marketFantasyPoints));
  const marketCrps = mean(
    marketRows.map((row) =>
      normalCrps(
        row.marketFantasyPoints ?? 0,
        stdevFor(row.marketFantasyPoints ?? row.predictedFantasyPoints, row.marketStdDev ?? row.modelStdDev),
        row.actualFantasyPoints,
      ),
    ),
  );
  const crps = mean(crpsValues) ?? 0;
  const mae =
    mean(rows.map((row) => Math.abs(row.predictedFantasyPoints - row.actualFantasyPoints))) ?? 0;
  const positions = Array.from(new Set(rows.map((row) => row.position))).sort();
  const preGameCommitRate = rows.filter(isScorable).length / rows.length;
  const crpsEdgeVsMarket = marketCrps == null ? null : round(marketCrps - crps);

  return {
    rank,
    modelId,
    modelName: first.modelName,
    family: first.family,
    sampleSize: rows.length,
    positions,
    crps,
    mae,
    marketCrps,
    crpsEdgeVsMarket,
    preGameCommitRate: round(preGameCommitRate),
    eligibleForPublicDraft:
      rows.length >= minPublicSampleSize && crpsEdgeVsMarket != null && crpsEdgeVsMarket > 0,
    priced: false,
    status: "shadow",
  };
}

export function buildModelParliamentFeed(
  input: readonly ModelParliamentPrediction[],
  options: ModelParliamentOptions = {},
): ModelParliamentFeed {
  const minPublicSampleSize = options.minPublicSampleSize ?? 50;
  const scorable = input.filter(isScorable);
  const excludedSampleIds = input.filter((row) => !isScorable(row)).map((row) => row.id).sort();
  const byModel = new Map<string, ModelParliamentPrediction[]>();
  for (const row of scorable) {
    const rows = byModel.get(row.modelId) ?? [];
    rows.push(row);
    byModel.set(row.modelId, rows);
  }
  const ranked = Array.from(byModel.entries())
    .map(([modelId, rows]) => rowFor(0, modelId, rows, minPublicSampleSize))
    .sort((a, b) => a.crps - b.crps || b.sampleSize - a.sampleSize || a.modelName.localeCompare(b.modelName))
    .map((row, index) => ({ ...row, rank: index + 1 }));

  return {
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    leaderboard: ranked,
    publicFeed: {
      flagKey: "MODEL_PARLIAMENT_PUBLIC_FEED",
      status: "FLAGGED_OFF",
      enabled: false,
      rows: ranked.map((row) => ({
        rank: row.rank,
        modelName: row.modelName,
        family: row.family,
        sampleSize: row.sampleSize,
        crps: row.crps,
        crpsEdgeVsMarket: row.crpsEdgeVsMarket,
      })),
      note: "Public model-parliament feed is prepared but flagged off until owner/data approval.",
    },
    excludedSampleIds,
    minPublicSampleSize,
    priced: false,
    status: "shadow",
    draftOnly: true,
  };
}
