/**
 * EINSTEIN LAYER — Tradability Filter (Invention 19).
 *
 * Most "edges" die when they touch reality. A market can underreact — measurably, provably — and
 * still be unprofitable once bid-ask, vig, latency, and limits are paid. This converts a
 * THEORETICAL residual into an EXECUTABLE status by subtracting each friction in sequence and
 * recording exactly where (and whether) the edge dies. The system must never say "underreacted,
 * therefore edge" — only "underreacted; after friction, this is / is not actionable."
 *
 * Pure + deterministic. `rawEdge` and all frictions are in the same unit (e.g. expected return
 * fraction, or probability points) so the cascade is a simple, auditable subtraction.
 */

export interface TradabilityInputs {
  /** The theoretical edge before any friction (same unit throughout), > 0 to be interesting. */
  readonly rawEdge: number;
  readonly vig: number;
  readonly spread: number;
  /** Latency haircut (edge lost to the time it takes to execute). */
  readonly latencyCost: number;
  /** Minutes needed to execute vs the tradable window. */
  readonly executeMin: number;
  readonly windowMin: number;
  /** 0 (cannot bet) → 1 (full size). */
  readonly limitProxy: number;
  readonly correlationPenalty: number;
  /** Uncertainty haircut from model error. */
  readonly modelError: number;
  readonly dataQualityOk: boolean;
  /** Edge lost to the delay between detection and publication/action. */
  readonly publicationDelayCost: number;
  /** Minimum surviving edge to call it executable. Default 0. */
  readonly executableThreshold?: number;
}

export type TradabilityStatus =
  | "THEORETICAL_ONLY"
  | "WATCHLIST"
  | "EXECUTABLE_SHADOW"
  | "DATA_QUALITY_FAIL"
  | "FRICTION_KILLED"
  | "RESEARCH_ONLY";

export interface TradabilityResult {
  readonly status: TradabilityStatus;
  readonly edgeBeforeVig: number;
  readonly edgeAfterVig: number;
  readonly edgeAfterSpread: number;
  readonly edgeAfterLatency: number;
  readonly edgeAfterLimit: number;
  readonly edgeAfterCorrelation: number;
  readonly edgeAfterModelError: number;
  readonly edgeAfterPublicationDelay: number;
  readonly killStage: string | null;
  readonly note: string;
}

/** Assess whether a theoretical edge survives the full friction cascade. */
export function assessTradability(i: TradabilityInputs): TradabilityResult {
  const threshold = i.executableThreshold ?? 0;
  const stages: Array<{ name: string; cost: number }> = [
    { name: "vig", cost: i.vig },
    { name: "spread", cost: i.spread },
    { name: "latency", cost: i.latencyCost },
    { name: "correlation", cost: i.correlationPenalty },
    { name: "model_error", cost: i.modelError },
    { name: "publication_delay", cost: i.publicationDelayCost },
  ];

  if (!i.dataQualityOk) {
    return blank(i.rawEdge, "DATA_QUALITY_FAIL", "data_quality", "Data-quality failure invalidates the read.");
  }
  if (i.executeMin > i.windowMin) {
    return blank(i.rawEdge, "FRICTION_KILLED", "window", `Execution (${i.executeMin}m) exceeds the tradable window (${i.windowMin}m).`);
  }

  let edge = i.rawEdge;
  const snap: Record<string, number> = { edgeBeforeVig: edge };
  let killStage: string | null = null;
  for (const s of stages) {
    edge -= s.cost;
    snap[`edgeAfter_${s.name}`] = edge;
    if (edge <= 0 && killStage === null) killStage = s.name;
  }
  // limit is multiplicative on realized size, applied after the additive frictions.
  const edgeAfterLimit = Math.max(0, edge) * i.limitProxy;

  const result = {
    edgeBeforeVig: i.rawEdge,
    edgeAfterVig: snap["edgeAfter_vig"]!,
    edgeAfterSpread: snap["edgeAfter_spread"]!,
    edgeAfterLatency: snap["edgeAfter_latency"]!,
    edgeAfterCorrelation: snap["edgeAfter_correlation"]!,
    edgeAfterModelError: snap["edgeAfter_model_error"]!,
    edgeAfterPublicationDelay: snap["edgeAfter_publication_delay"]!,
    edgeAfterLimit,
  };

  if (killStage !== null) {
    return { ...result, status: "FRICTION_KILLED", killStage, note: `Edge died at the ${killStage} stage.` };
  }
  if (edgeAfterLimit <= threshold || i.limitProxy <= 0.05) {
    return { ...result, status: "THEORETICAL_ONLY", killStage: "limit", note: "Survives additive friction but limits make it non-executable — theoretical only." };
  }
  if (edge > threshold && edgeAfterLimit > threshold && edge < threshold + Math.abs(threshold) + 0.01) {
    return { ...result, status: "WATCHLIST", killStage: null, note: "Marginally positive after friction — watchlist, size small." };
  }
  return { ...result, status: "EXECUTABLE_SHADOW", killStage: null, note: "Positive after the full friction cascade — executable in shadow." };
}

function blank(raw: number, status: TradabilityStatus, killStage: string, note: string): TradabilityResult {
  return {
    status, killStage, note,
    edgeBeforeVig: raw, edgeAfterVig: raw, edgeAfterSpread: raw, edgeAfterLatency: raw,
    edgeAfterLimit: 0, edgeAfterCorrelation: raw, edgeAfterModelError: raw, edgeAfterPublicationDelay: raw,
  };
}
