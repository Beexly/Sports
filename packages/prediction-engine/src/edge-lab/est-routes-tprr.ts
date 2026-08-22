/**
 * Estimated routes and targets-per-est-route (TPRR).
 *
 * Charting routes-run is CC-BY-SA (participation) or paid PFF. Legal proxy
 * uses only CC-BY snap_counts + PBP dropbacks:
 *   est_routes_i = snaps_i × team_dropbacks / team_snaps
 *
 * TPRR is an L1 exposure denominator, not catch rate. Not a MARKET_PROP.
 * WOPR / airYardsShare stay volume T. priced:false. Pure, no I/O.
 */

export const EST_ROUTES_METHOD_TAG = "est_routes_tprr_v1" as const;

export type EstRoutesInput = {
  readonly playerOffenseSnaps: number;
  readonly teamOffenseSnaps: number;
  readonly teamDropbacks: number;
  readonly targets?: number;
};

export type EstRoutesResult =
  | {
      readonly ok: true;
      readonly methodTag: typeof EST_ROUTES_METHOD_TAG;
      readonly priced: false;
      readonly estRoutes: number;
      readonly tprr: number | null;
      readonly layer: "L1";
    }
  | {
      readonly ok: false;
      readonly methodTag: typeof EST_ROUTES_METHOD_TAG;
      readonly priced: false;
      readonly refuse: "bad_input" | "zero_team_snaps";
    };

function finiteNonNeg(n: number): boolean {
  return Number.isFinite(n) && n >= 0;
}

/** Snap×dropback route proxy and optional TPRR. Never priced. */
export function estRoutesTprr(input: EstRoutesInput): EstRoutesResult {
  const tag = EST_ROUTES_METHOD_TAG;
  if (
    !finiteNonNeg(input.playerOffenseSnaps) ||
    !finiteNonNeg(input.teamOffenseSnaps) ||
    !finiteNonNeg(input.teamDropbacks)
  ) {
    return { ok: false, methodTag: tag, priced: false, refuse: "bad_input" };
  }
  if (input.teamOffenseSnaps === 0) {
    return { ok: false, methodTag: tag, priced: false, refuse: "zero_team_snaps" };
  }
  const estRoutes =
    (input.playerOffenseSnaps * input.teamDropbacks) / input.teamOffenseSnaps;
  const tprr =
    input.targets !== undefined && Number.isFinite(input.targets) && estRoutes > 0
      ? input.targets / estRoutes
      : null;
  return {
    ok: true,
    methodTag: tag,
    priced: false,
    estRoutes,
    tprr,
    layer: "L1",
  };
}
