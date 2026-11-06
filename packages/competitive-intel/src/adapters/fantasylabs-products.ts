/**
 * FantasyLabs product and price sheet adapter.
 *
 * GET https://www.fantasylabs.com/api/subscription/products/ returns every sellable SKU with
 * price in cents, trial length and price, whether a card is required, and the product family
 * handle. Unauthenticated. This is the commercial ladder written down: what a free tier buys,
 * how long a trial runs, which SKUs are comped to staff, which families they upsell.
 *
 * A price sheet is the most time-sensitive artifact in the whole set: it changes without a
 * deploy and without a changelog. Treat retrieved_at as a hard expiry, not metadata.
 */

import { z } from "zod";
import type { RawArtifact } from "../types.js";
import type { RivalAdapter } from "../adapter.js";
import type { LicenseClass } from "../types.js";

export const FANTASYLABS_PRODUCTS_URL = "https://www.fantasylabs.com/api/subscription/products/";

export interface RivalPrice {
  readonly productId: number;
  readonly name: string;
  readonly handle: string;
  readonly familyHandle: string;
  readonly familyName: string;
  readonly priceCents: number;
  readonly initialChargeCents: number;
  /** 0 when there is no trial at all. */
  readonly trialInterval: number;
  readonly trialIntervalUnit: number;
  readonly trialPriceCents: number;
  readonly requireCreditCard: boolean;
  /** Free and no initial charge: a comped SKU, which is how staff and testers get in. */
  readonly isComped: boolean;
  /** A trial that converts to a paid interval is the paywall funnel, not a free tier. */
  readonly isTrial: boolean;
  readonly archived: boolean;
  readonly createdAt: string;
}

const rawProduct = z
  .object({
    ID: z.number().int().positive(),
    Name: z.string(),
    Handle: z.string(),
    Description: z.string().optional(),
    PriceInCents: z.number().int().min(0),
    InitialChargeInCents: z.number().int().min(0),
    TrialPriceInCents: z.number().int().min(0),
    TrialInterval: z.number().int().min(0),
    TrialIntervalUnit: z.number().int(),
    Interval: z.number().int().min(0),
    IntervalUnit: z.number().int(),
    RequireCreditCard: z.boolean(),
    CreatedAt: z.string(),
    ArchivedAt: z.string(),
    ProductFamily: z
      .object({ ID: z.number().int(), Handle: z.string(), Name: z.string() })
      .passthrough(),
  })
  .passthrough();

export type RawProduct = z.infer<typeof rawProduct>;

export const rivalPriceSchema = z
  .object({
    productId: z.number().int().positive(),
    name: z.string(),
    handle: z.string(),
    familyHandle: z.string(),
    familyName: z.string(),
    priceCents: z.number().int().min(0),
    initialChargeCents: z.number().int().min(0),
    trialInterval: z.number().int().min(0),
    trialIntervalUnit: z.number().int(),
    trialPriceCents: z.number().int().min(0),
    requireCreditCard: z.boolean(),
    isComped: z.boolean(),
    isTrial: z.boolean(),
    archived: z.boolean(),
    createdAt: z.string(),
  })
  .strict();

/** The payload is an object keyed by product id, not an array. */
export function parseProducts(body: string): RawProduct[] {
  const trimmed = body.trim();
  if (!trimmed.startsWith("{")) throw new Error("products payload is not a JSON object");
  const parsed = z.record(z.string(), rawProduct).safeParse(JSON.parse(trimmed));
  if (!parsed.success) {
    throw new Error(`products payload failed shape: ${parsed.error.issues[0]?.message ?? "unknown"}`);
  }
  const rows = Object.values(parsed.data);
  if (rows.length === 0) throw new Error("products payload was empty");
  return rows;
}

const UNREAL = "0001-01-01";

export function toPrice(row: RawProduct): RivalPrice {
  return {
    productId: row.ID,
    name: row.Name,
    handle: row.Handle,
    familyHandle: row.ProductFamily.Handle,
    familyName: row.ProductFamily.Name,
    priceCents: row.PriceInCents,
    initialChargeCents: row.InitialChargeInCents,
    trialInterval: row.TrialInterval,
    trialIntervalUnit: row.TrialIntervalUnit,
    trialPriceCents: row.TrialPriceInCents,
    requireCreditCard: row.RequireCreditCard,
    isComped: row.PriceInCents === 0 && row.InitialChargeInCents === 0 && row.TrialInterval === 0,
    isTrial: row.TrialInterval > 0,
    archived: row.ArchivedAt !== UNREAL && !row.ArchivedAt.startsWith(UNREAL),
    createdAt: row.CreatedAt,
  };
}

export const fantasylabsProductsAdapter: RivalAdapter<RivalPrice> = {
  orgSlug: "fantasylabs",
  assetType: "price_sheet",
  tier: 3,
  sourceId: "fantasylabs-public-api",
  licenseClass: "tos_scraped" satisfies LicenseClass,
  commercialOk: false,
  url: FANTASYLABS_PRODUCTS_URL,
  schema: rivalPriceSchema,
  normalize(raw: RawArtifact): RivalPrice[] {
    return parseProducts(raw.body).map(toPrice);
  },
};

/** Cheapest paid entry point per family, the number a competitor actually prices against. */
export function entryPriceByFamily(rows: readonly RivalPrice[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const row of rows) {
    if (row.priceCents === 0 || row.archived) continue;
    const current = out.get(row.familyHandle);
    if (current === undefined || row.priceCents < current) out.set(row.familyHandle, row.priceCents);
  }
  return out;
}
