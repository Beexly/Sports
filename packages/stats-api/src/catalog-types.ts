import type { RightsEnvelope } from "./rights.js";

export type MetricStatus = "ACTIVE" | "CATALOG" | "DARK" | "BLOCKED";
export type MetricFamily =
  | "box"
  | "advanced"
  | "tracking"
  | "market"
  | "optical"
  | "proprietary"
  | "context"
  | "calibration"
  | "portfolio"
  | "fantasy"
  | "meta";

export type SportCode =
  | "NFL"
  | "NCAAF"
  | "NBA"
  | "NCAAB"
  | "MLB"
  | "NHL"
  | "MULTI"
  | "SOCCER";

export interface MetricDef {
  readonly id: string;
  readonly name: string;
  readonly sport: SportCode;
  readonly family: MetricFamily;
  readonly status: MetricStatus;
  readonly unit: string;
  readonly description: string;
  readonly formulaClass: string;
  readonly sourceIds: readonly string[];
  readonly rights: RightsEnvelope;
  readonly asOfRequired: boolean;
  readonly pitRequired: boolean;
  readonly publicApi: boolean;
}
