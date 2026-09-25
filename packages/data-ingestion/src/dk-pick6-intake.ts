/**
 * DraftKings Pick6 intake.
 *
 * No-auth Pick6 board/market/payout data via api.draftkings.com. The Pick6
 * web app ships its endpoint inventory in its JS bundle
 * (https://pick6.draftkings.com/assets/endpoints-*.js — the hash rotates with
 * deploys; re-fetch the bundle to re-discover the inventory).
 *
 * IMPORTANT: the bundle names both `/public/pick6/...` and `/pick6/...`
 * constants. The `/public` variants 404 — the working prefix is `/pick6/`.
 *
 * VERIFIED LIVE 2026-09-25 (curl, this VM):
 *   GET /pick6/v1/pickgroups/main?format=json              -> 200, 82,446 bytes
 *   GET /pick6/v1/pickgroups/identifier?format=json        -> 200, 78,363 bytes
 *   GET /pick6/v1/sportleague/glossaries?format=json      -> 200, 412,101 bytes
 *   GET /pick6/v1/pickgroups/1-1?format=json              -> 200 (NFL groups)
 *   GET /pick6/v1/pickgroups/153812/category/pickcards?format=json -> 200, 150,682 bytes
 *     (28 NFL cards, e.g. Jonathan Taylor Rushing Yards 39.5)
 *   GET /pick6/v1/entrydetails/153812?format=json         -> 200 (pick-set sizes 2-8,
 *     payout multipliers, e.g. 2-pick 3x, 3-pick 6x, 4-pick 10x)
 *
 * COMPOSES WITH: props-layer (prop-line inputs), prop-line-movement.
 *
 * External ingestion is env-gated, no-store, fail-closed. No secrets in code.
 */

import { envFlagEnabled } from "./fail-closed-env.js";

export const DK_PICK6_INTAKE_ENABLED_ENV = "DK_PICK6_INTAKE_ENABLED";

export const DK_API_BASE = "https://api.draftkings.com";
export const DK_PICK6_PATH_PREFIX = "/pick6/v1";

export function dkPick6IntakeEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return envFlagEnabled(env, DK_PICK6_INTAKE_ENABLED_ENV);
}

export type IntakeResult<T> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly reason: string };

/** A normalized More/Less line from a Pick6 pick card. */
export interface DkPick6Line {
  readonly pickableId: number;
  readonly pickGroupId: number;
  readonly playerDkId: number;
  readonly playerName: string;
  readonly marketId: number;
  readonly marketName: string;
  /** The target value offered (e.g. 39.5). */
  readonly targetValue: number;
  readonly paused: boolean;
  readonly live: boolean;
  readonly asOf: string;
  readonly source: string;
}

/** A payout tier for a pick-set size. */
export interface DkPick6PayoutTier {
  readonly pickGroupId: number;
  readonly pickSetSize: number;
  readonly numberOfPicksCorrect: number;
  readonly guaranteedMultiplier: number;
  readonly asOf: string;
  readonly source: string;
}

export const DK_PICK6_SOURCE = "dk-pick6-api";

function asString(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}

function asFiniteNumber(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

interface PickCardsPayload {
  readonly pickCardByPickableId?: Record<
    string,
    {
      readonly pickableId?: unknown;
      readonly entities?: readonly { readonly dkId?: unknown }[];
      readonly activePickableMarkets?: readonly {
        readonly pickableMarketId?: unknown;
        readonly pickSixMarketId?: unknown;
        readonly targetValue?: unknown;
        readonly isPaused?: unknown;
        readonly isLive?: unknown;
      }[];
    }
  >;
  readonly entityInfoByDkId?: Record<string, { readonly fullName?: unknown; readonly name?: unknown }>;
  readonly pickSixMarketById?: Record<string, { readonly name?: unknown }>;
}

/**
 * Ingest a raw `/pickgroups/{pickGroupId}/category/pickcards` payload into
 * normalized More/Less lines. Paused markets are kept but flagged (the
 * provider can pause a line without removing it).
 */
export function ingestDkPick6PickCards(
  pickGroupId: number,
  payload: PickCardsPayload,
  asOfTime: string,
  env: NodeJS.ProcessEnv = process.env,
): IntakeResult<{
  readonly accepted: readonly DkPick6Line[];
  readonly rejected: readonly { readonly index: number; readonly reason: string }[];
}> {
  if (!dkPick6IntakeEnabled(env)) {
    return {
      ok: false,
      reason: `dk pick6 intake disabled — set ${DK_PICK6_INTAKE_ENABLED_ENV}=true to enable`,
    };
  }
  if (!Number.isInteger(pickGroupId) || pickGroupId <= 0) {
    return { ok: false, reason: "invalid pickGroupId" };
  }
  const t = Date.parse(asOfTime);
  if (!Number.isFinite(t)) {
    return { ok: false, reason: "invalid asOfTime" };
  }
  if (!payload || typeof payload.pickCardByPickableId !== "object") {
    return { ok: false, reason: "payload.pickCardByPickableId must be an object" };
  }

  const accepted: DkPick6Line[] = [];
  const rejected: { index: number; reason: string }[] = [];
  let idx = 0;

  for (const key of Object.keys(payload.pickCardByPickableId)) {
    const card = payload.pickCardByPickableId[key]!;
    const pickableId = asFiniteNumber(card?.pickableId);
    const dkId = asFiniteNumber(card?.entities?.[0]?.dkId);
    const entity = dkId !== null ? payload.entityInfoByDkId?.[String(dkId)] : undefined;
    const playerName = asString(entity?.fullName) ?? asString(entity?.name);

    for (const market of card?.activePickableMarkets ?? []) {
      const marketId = asFiniteNumber(market?.pickSixMarketId);
      const targetValue = asFiniteNumber(market?.targetValue);
      const marketName =
        marketId !== null
          ? (asString(payload.pickSixMarketById?.[String(marketId)]?.name) ?? "unknown")
          : "unknown";

      if (pickableId === null || dkId === null || !playerName || marketId === null || targetValue === null) {
        rejected.push({ index: idx, reason: "missing card/market/player fields" });
        idx += 1;
        continue;
      }
      accepted.push({
        pickableId,
        pickGroupId,
        playerDkId: dkId,
        playerName,
        marketId,
        marketName,
        targetValue,
        paused: market?.isPaused === true,
        live: market?.isLive === true,
        asOf: asOfTime,
        source: DK_PICK6_SOURCE,
      });
      idx += 1;
    }
  }

  return { ok: true, data: { accepted, rejected } };
}

interface EntryDetailsPayload {
  readonly payoutPackages?: readonly {
    readonly pickSetSize?: unknown;
    readonly payoutTiers?: readonly {
      readonly numberOfPicksCorrect?: unknown;
      readonly guaranteedMultiplier?: unknown;
    }[];
  }[];
}

/**
 * Ingest a raw `/entrydetails/{pickGroupId}` payload into normalized payout
 * tiers (pick-set size -> guaranteed multiplier table).
 */
export function ingestDkPick6Payouts(
  pickGroupId: number,
  payload: EntryDetailsPayload,
  asOfTime: string,
  env: NodeJS.ProcessEnv = process.env,
): IntakeResult<{ readonly accepted: readonly DkPick6PayoutTier[] }> {
  if (!dkPick6IntakeEnabled(env)) {
    return {
      ok: false,
      reason: `dk pick6 intake disabled — set ${DK_PICK6_INTAKE_ENABLED_ENV}=true to enable`,
    };
  }
  if (!Number.isInteger(pickGroupId) || pickGroupId <= 0) {
    return { ok: false, reason: "invalid pickGroupId" };
  }
  const t = Date.parse(asOfTime);
  if (!Number.isFinite(t)) {
    return { ok: false, reason: "invalid asOfTime" };
  }
  if (!payload || !Array.isArray(payload.payoutPackages)) {
    return { ok: false, reason: "payload.payoutPackages must be an array" };
  }

  const accepted: DkPick6PayoutTier[] = [];
  for (const pkg of payload.payoutPackages) {
    const pickSetSize = asFiniteNumber(pkg?.pickSetSize);
    if (pickSetSize === null) continue;
    for (const tier of pkg?.payoutTiers ?? []) {
      const n = asFiniteNumber(tier?.numberOfPicksCorrect);
      const mult = asFiniteNumber(tier?.guaranteedMultiplier);
      if (n === null || mult === null) continue;
      accepted.push({
        pickGroupId,
        pickSetSize: Math.trunc(pickSetSize),
        numberOfPicksCorrect: Math.trunc(n),
        guaranteedMultiplier: mult,
        asOf: asOfTime,
        source: DK_PICK6_SOURCE,
      });
    }
  }

  return { ok: true, data: { accepted } };
}
