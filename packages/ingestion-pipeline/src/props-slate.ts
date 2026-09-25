/**
 * Props slate â€” GSE 4-Beat live path.
 *
 * Wires gse-four-beat (shinDevig, gateProp, buildPassList, kellyStake,
 * monteCarloProp, buildBoard, autopsySettled) into a callable slate the
 * cron/board can run. Fail-closed on missing inputs. No invented odds.
 */

import {
  gseShinDevig,
  gateProp,
  buildPassList,
  kellyStake,
  monteCarloProp,
  buildBoard,
  autopsySettled,
  kalmanUpdate,
  GATE_THRESHOLDS,
  firePostedProp,
  pricePropAgainstMarket,
  shopPostedPrices,
  edgeClearsPosted,
  type BookOdds,
  type PlayerProp,
  type GateResult,
  type PassListEntry,
  type BoardEntry,
  type AutopsyRecord,
  type KalmanState,
  type PropBookQuote,
  type ShopBook,
  type FireOpen,
  type FireClosed,
  type FireDenied,
  type PropEdgeResult,
  type ShopPick,
  type ShopDenied,
  type JuiceFloorResult,
  type JuiceFloorDenied,
  reasonAnytimeTd,
  type PlayerRoleContext,
  type MarketPrice,
} from "@sports/prediction-engine";

export type PropFireRow = {
  readonly propId: string;
  readonly pOver: number;
  readonly fire: FireOpen | FireClosed | FireDenied;
  readonly priced: PropEdgeResult;
  readonly shop: ShopPick | ShopDenied;
  readonly juice: JuiceFloorResult | JuiceFloorDenied;
};

export interface PropsSlateResult {
  readonly ok: boolean;
  readonly propsConsidered: number;
  readonly passed: number;
  readonly board: readonly BoardEntry[];
  readonly passList: readonly PassListEntry[];
  readonly gateResults: readonly GateResult[];
  readonly fireRows: readonly PropFireRow[];
  readonly fired: readonly BoardEntry[];
  readonly anytimeTdRows: readonly AnytimeTdRow[];
  readonly errors: readonly string[];
  readonly note: string;
}

export interface PropsSlateInput {
  readonly props: readonly PlayerProp[];
  /** Model P(over) per prop, keyed by `${playerId}:${propType}`. */
  readonly modelProbOver: Readonly<Record<string, number>>;
  readonly lineFreshnessMinutes: number;
  readonly bankroll: number;
  readonly projectedMean: number;
  readonly projectedStdDev: number;
  /**
   * Optional rolling-role contexts for anytime-TD props. Keyed by playerId.
   * Missing entries stay missing — never imputed.
   */
  readonly roleContexts?: Readonly<Record<string, PlayerRoleContext>>;
}

export type AnytimeTdRow = {
  readonly propId: string;
  readonly playerId: string;
  readonly ok: boolean;
  readonly probability: number | null;
  readonly ev: number | null;
  readonly reason: string | null;
};

/**
 * Run the GSE 4-Beat props pipeline over a prop slate.
 *
 * Beat 1: shin-devig the book odds (no invented prices).
 * Beat 2: gate each prop (EV, sample, calibration, line integrity).
 * Beat 3: build the pass list.
 * Beat 4: build the board + Monte Carlo sanity.
 */
export function runPropsSlate(input: PropsSlateInput): PropsSlateResult {
  const errors: string[] = [];
  const props = input.props;
  if (!Array.isArray(props) || props.length === 0) {
    return {
      ok: false,
      propsConsidered: 0,
      passed: 0,
      board: [],
      passList: [],
      gateResults: [],
      errors: ["props slate is empty"],
      fireRows: [],
      fired: [],
      anytimeTdRows: [],
      note: "no props — nothing minted (fail-closed)",
    };
  }

  const gateResults: GateResult[] = [];
  for (const prop of props) {
    const key = `${prop.playerId}:${prop.propType}`;
    const modelProbOver = input.modelProbOver[key];
    if (modelProbOver == null || !Number.isFinite(modelProbOver)) {
      errors.push(`${key}: missing modelProbOver â€” not imputed`);
      continue;
    }
    try {
      const g = gateProp(prop, modelProbOver, input.lineFreshnessMinutes);
      gateResults.push(g);
    } catch (err) {
      errors.push(
        `${key}: gateProp threw â€” ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  let passList: readonly PassListEntry[] = [];
  try {
    passList = buildPassList(gateResults, props);
  } catch (err) {
    errors.push(`buildPassList threw â€” ${err instanceof Error ? err.message : String(err)}`);
    passList = [];
  }

  let board: readonly BoardEntry[] = [];
  try {
    // buildBoard uses the first gated prop's model prob / projection as the
    // slate-level projection. Fail-closed when no gate results exist.
    const firstProb = gateResults.length > 0 ? input.modelProbOver[gateResults[0]!.propId] : null;
    if (firstProb != null) {
      board = buildBoard(
        gateResults,
        props,
        input.bankroll,
        firstProb,
        input.projectedMean,
        input.projectedStdDev,
      );
    }
  } catch (err) {
    errors.push(`buildBoard threw — ${err instanceof Error ? err.message : String(err)}`);
    board = [];
  }

  // Fire/price gates after buildBoard. Every row fail-closes on a missing
  // two-way quote. Nothing is imputed. fired holds only FireOpen rows.
  const fireRows: PropFireRow[] = [];
  const fired: BoardEntry[] = [];
  const anytimeTdRows: AnytimeTdRow[] = [];
  const propsById = new Map(props.map((p) => [`${p.playerId}:${p.propType}`, p]));

  // Anytime-TD reasoning (W4 MIT) for player-prop picks. Fail-open on the
  // slate; missing role context is recorded, never imputed.
  for (const prop of props) {
    if (!isAnytimeTdProp(prop.propType)) continue;
    const key = `${prop.playerId}:${prop.propType}`;
    const ctx = input.roleContexts?.[prop.playerId];
    if (ctx == null) {
      anytimeTdRows.push({
        propId: key,
        playerId: prop.playerId,
        ok: false,
        probability: null,
        ev: null,
        reason: "role context missing — not imputed",
      });
      continue;
    }
    const price = anytimeTdPrice(prop.odds);
    try {
      const r = reasonAnytimeTd(ctx, price);
      if (r.ok) {
        const data = r.data as {
          probability: number;
          ev: number | null;
          failClosed: boolean;
          reason?: string;
        };
        anytimeTdRows.push({
          propId: key,
          playerId: prop.playerId,
          ok: !data.failClosed,
          probability: data.probability,
          ev: data.ev,
          reason: data.failClosed ? (data.reason ?? "anytime TD fail-closed") : null,
        });
      } else {
        anytimeTdRows.push({
          propId: key,
          playerId: prop.playerId,
          ok: false,
          probability: null,
          ev: null,
          reason: r.reason,
        });
      }
    } catch (err) {
      anytimeTdRows.push({
        propId: key,
        playerId: prop.playerId,
        ok: false,
        probability: null,
        ev: null,
        reason: err instanceof Error ? err.message : String(err),
      });
    }
  }

  for (const entry of board) {
    const key = entry.propId;
    const prop = propsById.get(key);
    const modelP = input.modelProbOver[key];
    const pOver =
      modelP == null || !Number.isFinite(modelP)
        ? undefined
        : entry.recommendedPick === "OVER"
          ? modelP
          : 1 - modelP;
    if (prop == null || pOver == null || !Number.isFinite(pOver)) {
      fireRows.push({
        propId: key,
        pOver: Number.isFinite(pOver) ? pOver : Number.NaN,
        fire: {
          ok: false,
          fire: false,
          methodTag: "props_fire_gate_v1",
          priced: false,
          refuse: "bad_p",
        },
        priced: {
          ok: false,
          source: "props_hb",
          pOver: Number.isFinite(pOver) ? pOver : null,
          qOver: null,
          edgeOver: null,
          priced: false,
          reason: "missing model p or board prop — not imputed",
        },
        shop: {
          ok: false,
          methodTag: "props_line_shop_v1",
          surplus: null,
          clears: false,
          priced: false,
          refuse: "no_books",
          considered: 0,
        },
        juice: {
          ok: false,
          methodTag: "props_juice_floor_v1",
          surplus: null,
          clears: false,
          priced: false,
          refuse: "bad_p",
        },
      });
      continue;
    }

    const quote = twoWayQuote(prop.odds);
    const books = shopBooksFromOdds(prop.odds);
    const priced = pricePropAgainstMarket(pOver, quote);
    const shop = shopPostedPrices(pOver, books);
    const juice =
      quote && Number.isFinite(quote.overAmerican)
        ? edgeClearsPosted(pOver, quote.overAmerican)
        : {
            ok: false as const,
            methodTag: "props_juice_floor_v1" as const,
            surplus: null,
            clears: false,
            priced: false,
            refuse: "bad_price" as const,
          };
    const fire = firePostedProp(pOver, quote, books);
    fireRows.push({ propId: key, pOver, fire, priced, shop, juice });
    if (fire.ok && fire.fire) {
      fired.push(entry);
    }
  }

  return {
    ok: errors.length === 0,
    propsConsidered: props.length,
    passed: passList.length,
    board,
    passList,
    gateResults,
    fireRows,
    fired,
    anytimeTdRows,
    errors,
    note:
      errors.length === 0
        ? `4-beat complete: ${passList.length}/${props.length} passed gates, ${fired.length}/${board.length} fired`
        : `4-beat finished with ${errors.length} error(s); fail-closed on those rows`,
  };
}

function isAnytimeTdProp(propType: string): boolean {
  const t = propType.toLowerCase().replace(/[\s_-]/g, "");
  return t.includes("anytimetd") || t.includes("anytimetouchdown") || t === "atd" || t.includes("anytimescorer");
}

function anytimeTdPrice(odds: readonly BookOdds[]): MarketPrice | undefined {
  const sharp = odds.find((o) => o.isSharp) ?? odds[0];
  if (sharp == null || !Number.isFinite(sharp.overOdds) || sharp.overOdds === 0) {
    return undefined;
  }
  // American → decimal. Negative American: 1 + 100/|odds|. Positive: 1 + odds/100.
  const a = sharp.overOdds;
  const decimal = a > 0 ? 1 + a / 100 : 1 + 100 / Math.abs(a);
  return { decimalOdds: Number.isFinite(decimal) && decimal > 1 ? decimal : null };
}

function twoWayQuote(odds: readonly BookOdds[]): PropBookQuote | null {
  const sharp = odds.find((o) => o.isSharp) ?? odds[0];
  if (
    sharp == null ||
    !Number.isFinite(sharp.overOdds) ||
    !Number.isFinite(sharp.underOdds) ||
    sharp.overOdds === 0 ||
    sharp.underOdds === 0
  ) {
    return null;
  }
  return { overAmerican: sharp.overOdds, underAmerican: sharp.underOdds };
}

function shopBooksFromOdds(odds: readonly BookOdds[]): readonly ShopBook[] {
  return odds
    .filter((o) => Number.isFinite(o.overOdds) && o.overOdds !== 0)
    .map((o) => ({ book: o.bookmaker, american: o.overOdds }));
}

/**
 * Devig a two-way prop book using the GSE shin method.
 * Fail-closed when either side is missing â€” never invents a price.
 */
export function devigPropBook(
  overOdds: number | null,
  underOdds: number | null,
): ReturnType<typeof gseShinDevig> | null {
  if (
    overOdds == null ||
    underOdds == null ||
    !Number.isFinite(overOdds) ||
    !Number.isFinite(underOdds) ||
    overOdds <= 1 ||
    underOdds <= 1
  ) {
    return null;
  }
  return gseShinDevig(overOdds, underOdds);
}

/**
 * Kelly stake for a passed prop. Returns null when edge is absent or
 * inputs are invalid â€” never invents a stake.
 */
export function propKellyStake(
  modelProb: number | null,
  impliedProb: number | null,
  bankroll: number,
  fraction = 0.25,
): { stakePct: number; stakeDollars: number } | null {
  if (
    modelProb == null ||
    impliedProb == null ||
    !Number.isFinite(modelProb) ||
    !Number.isFinite(impliedProb) ||
    modelProb <= 0 ||
    modelProb >= 1 ||
    impliedProb <= 0 ||
    impliedProb >= 1 ||
    !Number.isFinite(bankroll) ||
    bankroll <= 0
  ) {
    return null;
  }
  try {
    return kellyStake(modelProb, impliedProb, bankroll, fraction);
  } catch {
    return null;
  }
}

/**
 * Monte Carlo a prop distribution. Returns null on invalid inputs.
 */
export function propMonteCarlo(
  projectedMean: number,
  projectedStdDev: number,
  line: number,
  isOver: boolean,
  simulations = 10000,
): ReturnType<typeof monteCarloProp> | null {
  if (
    !Number.isFinite(projectedMean) ||
    !Number.isFinite(projectedStdDev) ||
    projectedStdDev <= 0 ||
    !Number.isFinite(line) ||
    !Number.isFinite(simulations) ||
    simulations <= 0
  ) {
    return null;
  }
  try {
    return monteCarloProp(projectedMean, projectedStdDev, line, isOver, simulations);
  } catch {
    return null;
  }
}

export {
  gseShinDevig,
  gateProp,
  buildPassList,
  kellyStake,
  monteCarloProp,
  buildBoard,
  autopsySettled,
  kalmanUpdate,
  GATE_THRESHOLDS,
};
export type {
  BookOdds,
  PlayerProp,
  GateResult,
  PassListEntry,
  BoardEntry,
  AutopsyRecord,
  KalmanState,
};
