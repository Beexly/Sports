/**
 * GENESIS LAYER — Reflexive Product Risk (Invention 55).
 *
 * The more powerful GSE becomes, the more it must model ITSELF as a market participant. A widely
 * consumed recommendation can move roster %, ownership, waiver cost, price, limits, and narrative —
 * destroying the very edge it identified. This decides how an insight may be expressed: private,
 * personalized, educational, delayed, or safe-public. This protects the business. Pure + deterministic.
 */

export interface ReflexiveInputs {
  readonly audienceSize: number;        // 0..1
  readonly marketSensitivity: number;   // 0..1 (price/line moves on public action)
  readonly ownershipSensitivity: number;// 0..1 (DFS ownership crowding)
  readonly waiverSensitivity: number;   // 0..1
  readonly liquidity: number;           // 0..1 (high liquidity absorbs crowding)
  readonly publicness: number;          // 0..1 (how broadly it would be shared)
  readonly actionCrowding: number;      // 0..1 (how concentrated the resulting action)
}

export type ReflexiveDisposition = "PRIVATE_ONLY" | "PERSONALIZED_ONLY" | "EDUCATIONAL_ONLY" | "DELAYED_PUBLICATION" | "SAFE_PUBLIC";

export interface ReflexiveResult {
  readonly degradationRisk: number;
  readonly disposition: ReflexiveDisposition;
  readonly note: string;
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/** Decide how an insight may be expressed so GSE does not destroy its own edge. */
export function assessReflexiveRisk(i: ReflexiveInputs): ReflexiveResult {
  const meanSensitivity = (i.marketSensitivity + i.ownershipSensitivity + i.waiverSensitivity) / 3;
  const degradationRisk = clamp01((0.4 * i.audienceSize * i.publicness + 0.6 * meanSensitivity) * (1 - 0.5 * i.liquidity) * (0.5 + 0.5 * i.actionCrowding));

  let disposition: ReflexiveDisposition;
  if (degradationRisk >= 0.6) disposition = "PRIVATE_ONLY";
  else if (i.ownershipSensitivity >= 0.6 && degradationRisk >= 0.35) disposition = "PERSONALIZED_ONLY"; // broad publication would crush DFS leverage
  else if (degradationRisk >= 0.45) disposition = "PERSONALIZED_ONLY";
  else if (degradationRisk >= 0.3) disposition = "DELAYED_PUBLICATION";
  else if (degradationRisk >= 0.15) disposition = "EDUCATIONAL_ONLY";
  else disposition = "SAFE_PUBLIC";

  return {
    degradationRisk: Number(degradationRisk.toFixed(4)),
    disposition,
    note: disposition === "PRIVATE_ONLY"
      ? "Publishing would destroy the edge — keep internal."
      : disposition === "PERSONALIZED_ONLY"
        ? "Broad publication would crowd the action (e.g. DFS ownership) — personalize only."
        : disposition === "DELAYED_PUBLICATION"
          ? "Publish after the decision window closes."
          : disposition === "EDUCATIONAL_ONLY"
            ? "Share the concept, not the live edge."
            : "Low reflexive risk — safe to publish.",
  };
}
