/**
 * FantasyLabs filter catalogue adapter.
 *
 * GET https://www.fantasylabs.com/api/filters/ returns 968 feature definitions with their
 * warehouse table, property name and description template. Unauthenticated, 674 KB, no bot
 * wall. This is the closest thing to a published feature taxonomy a rival gives away, so it
 * is the first adapter: it proves the contract and it is immediately useful for coverage
 * comparison.
 *
 * Licence posture: ToS-scraped, commercial_ok false until a terms read lands. Registry entry
 * `fantasylabs-public-api` is permission_required, so `assertIngestible` is the caller's job
 * before `fetchArtifact`.
 */

import { z } from "zod";
import type { SignalFamily } from "@sports/types";
import type { RawArtifact, RivalAssetType } from "../types.js";
import type { LicenseClass } from "../types.js";
import { familyForFeature, subjectForTable } from "../family-map.js";
import type { RivalAdapter } from "../adapter.js";

export const FANTASYLABS_FILTERS_URL = "https://www.fantasylabs.com/api/filters/";

/** One normalized feature. Mirrors the source field names where they exist. */
export interface RivalFeature {
  readonly featureId: number;
  readonly name: string;
  /**
   * "none" is the honest name for the rows whose source filter type is an empty string.
   * `source` and `excludelist-rev` are live values the first fixture missed.
   */
  readonly filterType: "range" | "list" | "list-rev" | "daterange" | "excludelist-rev" | "source" | "none";
  readonly dataItemType: number;
  readonly property: string;
  readonly table: string;
  readonly subject: "player" | "team" | "game" | "other";
  readonly family: SignalFamily;
  readonly description: string;
  readonly isRank: boolean;
  readonly isMatchup: boolean;
}

const rawRow = z
  .object({
    // One live row keys on 0, so zero is legal even though it looks like a null sentinel.
    DataItemId: z.number().int().nonnegative(),
    DataItemName: z.string().min(1),
    FilterType: z.enum(["range", "list", "list-rev", "daterange", "excludelist-rev", "source", ""]),
    DataItemType: z.number().int(),
    HelpId: z.string(),
    Description: z.string().nullable().optional(),
    IsRank: z.boolean(),
    IsMatchup: z.boolean(),
    DataItemMode: z.number().int(),
    SelectField: z.string(),
    ColumnDetails: z.string(),
    PropertyName: z.string(),
    SlatePropertyName: z.string().optional(),
    Table: z.string(),
  })
  .passthrough();

export type RawFilterRow = z.infer<typeof rawRow>;

/** Strict output schema. No coercion, no optional family. */
export const rivalFeatureSchema = z
  .object({
    featureId: z.number().int().nonnegative(),
    name: z.string().min(1),
    filterType: z.enum(["range", "list", "list-rev", "daterange", "excludelist-rev", "source", "none"]),
    dataItemType: z.number().int(),
    property: z.string(),
    table: z.string(),
    subject: z.enum(["player", "team", "game", "other"]),
    family: z.enum([
      "MARKET",
      "EFFICIENCY",
      "TRENCHES",
      "LUCK",
      "SITUATIONAL",
      "NARRATIVE",
      "MICROCLIMATE",
      "MARKET_MICROSTRUCTURE",
    ]),
    description: z.string(),
    isRank: z.boolean(),
    isMatchup: z.boolean(),
  })
  .strict();

/**
 * Parse the raw payload. Throws with the payload index when the outer shape is wrong, so a
 * silent zero-row harvest cannot pass for an empty catalogue.
 */
export function parseFilters(body: string): RawFilterRow[] {
  const trimmed = body.trim();
  if (!trimmed.startsWith("[")) {
    throw new Error("filters payload is not a JSON array");
  }
  const parsed = z.array(rawRow).safeParse(JSON.parse(trimmed));
  if (!parsed.success) {
    throw new Error(`filters payload failed shape: ${parsed.error.issues[0]?.message ?? "unknown"}`);
  }
  return parsed.data;
}

export function toFeature(row: RawFilterRow): RivalFeature {
  return {
    featureId: row.DataItemId,
    name: row.DataItemName,
    filterType: row.FilterType === "" ? "none" : row.FilterType,
    dataItemType: row.DataItemType,
    property: row.PropertyName,
    table: row.Table,
    subject: subjectForTable(row.Table),
    family: familyForFeature(row.DataItemName),
    description: row.Description ?? "",
    isRank: row.IsRank,
    isMatchup: row.IsMatchup,
  };
}

export const fantasylabsFiltersAdapter: RivalAdapter<RivalFeature> = {
  orgSlug: "fantasylabs",
  assetType: "projection_file" satisfies RivalAssetType,
  tier: 3,
  sourceId: "fantasylabs-public-api",
  licenseClass: "tos_scraped" satisfies LicenseClass,
  commercialOk: false,
  url: FANTASYLABS_FILTERS_URL,
  schema: rivalFeatureSchema,
  normalize(raw: RawArtifact): RivalFeature[] {
    return parseFilters(raw.body).map(toFeature);
  },
};

/** Count features per family, for the coverage comparison the brief calls a gap list. */
export function familyHistogram(rows: readonly RivalFeature[]): Record<SignalFamily, number> {
  const out: Record<SignalFamily, number> = {
    MARKET: 0,
    EFFICIENCY: 0,
    TRENCHES: 0,
    LUCK: 0,
    SITUATIONAL: 0,
    NARRATIVE: 0,
    MICROCLIMATE: 0,
    MARKET_MICROSTRUCTURE: 0,
  };
  for (const row of rows) out[row.family] += 1;
  return out;
}
