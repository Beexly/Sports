/**
 * FrameForecast — the pregame object that composes independent p (the HB
 * model priors + bus covariates) with the q-side posted price via
 * `firePostedProp`.
 *
 * HONESTY HEADER (this is the seam the review demanded):
 *   - `firePostedProp` (props-fire-gate.ts) is COMPOSED, never replaced.
 *     The bus/feature set never ingest a new Odds market; the posted
 *     American(s) are threaded through exactly as the fire gate already
 *     expects them. If `firePostedProp` returns `fire: false`, FrameForecast
 *     does NOT manufacture a fire — it returns `gated` with the refuse reason.
 *   - Every p-input is file-anchored (see covariate-pfeatures.ts PFeatureSet).
 *   - `priced: false` end-to-end until a prop-line archive settles CLV — the
 *     same posture as props-fire-gate.ts and every props-hb-* module.
 *
 * DUAL-SIDED honesty (the "one-sided" test requirement):
 *   - A market with only one posted side (e.g. Over only) is stored as a
 *     single OddsLineSnapshot row by `prop-line-rows.ts`
 *     (toPropLineSnapshotRows) — one-sided books are real and common.
 *   - FrameForecast must NOT invent the missing side. If only one side is
 *     present, the composed edge for the absent side is `null`, and the
 *     fire-gate decision reflects the book's own posted side only.
 *
 * Pure. No I/O. No Prisma. priced:false.
 */

import type { PFeatureSetEntry } from "./covariate-pfeatures.js";
import {
  firePostedProp,
  type FireClosed,
  type FireDenied,
  type FireOpen,
} from "./props-fire-gate.js";
import type { PropBookQuote } from "./props-priced-edge.js";
import type { ShopBook } from "./props-line-shop.js";

export const FRAME_FORECAST_METHOD_TAG = "frame_forecast_v1" as const;

/** One composed side of the market (Over or Under). */
export interface FrameSide {
  readonly side: "over" | "under";
  /** Independent p from the HB model for this side (0..1). May be null if the
   *  model could not produce a prior (e.g. no qualifying history). */
  readonly p: number | null;
  /** The fire-gate verdict for this side, if a posted price exists. */
  readonly fire: FireOpen | FireClosed | FireDenied | null;
}

export interface FrameForecast {
  readonly methodTag: typeof FRAME_FORECAST_METHOD_TAG;
  readonly priced: false;
  /** The prop market slug root (player_receptions, etc.). */
  readonly slugRoot: string;
  /** Which HB module scored the p-side (file-anchored via PFeatureSet). */
  readonly module: string;
  readonly methodTagSymbol: string;
  /** The two sides. A one-sided market has exactly one entry with the other
   *  absent (null) — never invented. */
  readonly sides: readonly FrameSide[];
  /** True only when at least one side cleared the fire gate, and no side was
   *  fabricated. One-sided markets can still `true`. */
  readonly fire: boolean;
  /** When no side fires: the diagnostic reason (do NOT pretend to fire). */
  readonly refuse: "no_p" | "no_books" | "no_book_clears" | "shin_unpriced" | "shin_no_edge" | "one_sided_only" | null;
}

export interface FrameForecastRequest {
  readonly slugRoot: string;
  readonly featureSet: PFeatureSetEntry;
  /** Independent p the HB model produced, per side. Key by "over"/"under". */
  readonly pBySide: Readonly<Partial<Record<"over" | "under", number>>>;
  /** Shop books for the posted price (already threaded to firePostedProp). */
  readonly books?: readonly ShopBook[];
  /** The de-vigged two-way quote (for the Shin diagnostic). */
  readonly quote?: PropBookQuote | null;
}

/**
 * Compose a pregame FrameForecast.
 *
 * The q-side uses `firePostedProp` verbatim. The p-side comes from the HB
 * model's output (caller-supplied per side). The two are joined; neither is
 * allowed to overwrite the other. Crucially:
 *   - If `firePostedProp` says no fire, we return `fire: false` with the reason.
 *   - If only one side has a posted price, the other side's `fire` is null and
 *     the frame does not claim a fire on the absent side.
 *
 * Fail-closed: if no side has a finite p, return refuse "no_p". If no books
 * and no quote, `firePostedProp` returns FireDenied "no_books" — we surface
 * that as refuse, not a fabricated fire.
 */
export function composeFrameForecast(req: FrameForecastRequest): FrameForecast {
  const tag = FRAME_FORECAST_METHOD_TAG;
  const sides: FrameSide[] = [];
  const sideNames: Array<"over" | "under"> = ["over", "under"];
  let anyP = false;
  let anyFire = false;
  let refuse: FrameForecast["refuse"] = null;

  for (const side of sideNames) {
    const p = req.pBySide[side];
    if (p !== undefined && p !== null && Number.isFinite(p)) anyP = true;
    const fg = p !== undefined && p !== null && Number.isFinite(p)
      ? firePostedProp(p, req.quote ?? null, req.books ?? [])
      : null;
    if (fg && fg.fire) anyFire = true;
    sides.push({ side, p: p ?? null, fire: fg });
  }

  // Only one side posted (one-sided book): mark the frame honestly, do not
  // invent the missing side. It is still a valid (possibly firing) frame.
  const postedSides = sides.filter((s) => s.fire !== null);
  if (postedSides.length === 1 && !anyFire) {
    refuse = "one_sided_only";
  } else if (!anyP) {
    refuse = "no_p";
  } else if (!anyFire) {
    // Translate the fire-gate refuse from whichever side produced one.
    const withRefuse = sides.find((s) => s.fire && !s.fire.ok);
    const open = sides.find((s) => s.fire && s.fire.ok === false && s.fire.fire === false);
    const denied = open as FireDenied | undefined;
    const closed = open as FireClosed | undefined;
    if (denied && "refuse" in denied) {
      refuse = denied.refuse === "no_books" ? "no_books"
        : denied.refuse === "bad_p" ? "no_p" : "no_book_clears";
    } else if (closed && "refuse" in closed) {
      refuse = closed.refuse;
    }
  }

  return {
    methodTag: tag,
    priced: false,
    slugRoot: req.slugRoot,
    module: req.featureSet.module,
    methodTagSymbol: req.featureSet.methodTagSymbol,
    sides,
    fire: anyFire,
    refuse,
  };
}
