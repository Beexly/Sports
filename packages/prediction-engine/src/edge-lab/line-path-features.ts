/**
 * CL5 · line-path-features — decision-time feature vector.
 *
 * Doctrine C6.2 (docs/data/CARDS_CLOSING_LINE.md §CL5).
 * Depends on CL3 (path-stats), game-row (americanToDecimal), devig (shinDevig).
 *
 * Input is one game's rows for ONE prop market across ALL books — the
 * cross-book features (book_disp_line_now, consensus_qover_now) need the full
 * book set for that market.
 *
 * HARD RULE (as-of discipline, masterplan §6): every feature is computed
 * exclusively from rows with `capturedAt <= decisionAt`, and
 * `decisionAt <= commenceTime - minLeadMs` else refuse `decision_after_cutoff`.
 *
 * Feature keys (never match /clos|final_line|settle/i — I7):
 *   open_line, open_dec_over, line_now, dec_over_now, drift_line,
 *   vel_line_per_hr, max_step_line, jump_flag, steps_n,
 *   ttk_hours, book_disp_line_now, consensus_qover_now, qover_now
 *
 * priced: false. layer: MARKET_PROP. q-side timing/execution only.
 */
import { latestAtOrBefore, maxAbsStep, rangeSpread, slopePerHour, type PathPoint } from "./path-stats.js";
import { americanToDecimal } from "./game-row.js";
import { shinDevig } from "./devig.js";

export interface ArchiveRow {
  readonly gameId: string;
  readonly capturedAt: string;
  readonly phase: "OPEN" | "INTERIM" | "CLOSE";
  readonly book: string;
  readonly market: string;
  readonly side: string;
  readonly price: number;
  readonly line: number | null;
  readonly source: string;
}

/** A captured snapshot at a point in the path, keyed by capturedAt-ms. */
interface SampledRow {
  readonly capturedAt: string;
  readonly capturedAtMs: number;
  readonly price: number;
  readonly line: number | null;
  readonly phase: string;
  readonly inputIndex: number;
}

export interface DecisionFeatures {
  readonly ok: true;
  readonly features: ReadonlyMap<string, number>;
  readonly decisionCapturedAt: string;
  readonly decisionDecimalOver: number;
  readonly decisionDecimalUnder: number | null;
  readonly qOverDecision: number | null;
  readonly priced: false;
  readonly layer: "MARKET_PROP";
}

export type FeatureRefuse =
  | "no_decision_snapshot"
  | "decision_after_cutoff"
  | "bad_price"
  | "no_opener"
  | "not_a_prop_market";

export interface FeatureRefusal {
  readonly ok: false;
  readonly refuse: FeatureRefuse;
}

/** Default minimum lead time: 3 hours before kickoff. */
export const DEFAULT_MIN_LEAD_MS = 3 * 3600_000;

const PAIR_TOLERANCE_MS = 20 * 60_000; // CL4 default

const CLOSING_KEY_PATTERN = /clos|final_line|settle/i;

function parseIsoOrThrow(iso: string, label: string): number {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) {
    throw new RangeError(`line-path-features: ${label} is not a valid ISO instant: ${iso}`);
  }
  return ms;
}

/**
 * Decode a prop market: must contain exactly one "|" with non-empty halves.
 * Returns null for non-prop markets (no "|") — those are skipped silently.
 * Returns a "malformed" marker for markets with "|" but wrong structure —
 * handled by the caller as a refusal.
 */
type PropMarket = { family: string; playerSlug: string };

function decodePropMarket(market: string): PropMarket | null {
  const parts = market.split("|");
  if (parts.length !== 2) return null;
  const family = parts[0];
  const playerSlug = parts[1];
  if (!family || !playerSlug) return null;
  return { family, playerSlug };
}

/**
 * Build the decision-time feature vector for one prop market, one execution book.
 *
 * Every feature uses ONLY rows with capturedAt <= decisionAt.
 * decisionAt must be <= commenceTime - minLeadMs, else refuse.
 *
 * Omitted keys (when < 2 points, one-sided, etc.) are absent from the Map —
 * trainCloseDistiller mean-imputes them by design.
 */
export function buildDecisionFeatures(args: {
  readonly rows: readonly ArchiveRow[];
  readonly gameId: string;
  readonly market: string;
  readonly book: string;
  readonly commenceTime: string;
  readonly decisionAt: string;
  readonly minLeadMs?: number;
}): DecisionFeatures | FeatureRefusal {
  const minLead = args.minLeadMs ?? DEFAULT_MIN_LEAD_MS;
  const decisionAtMs = parseIsoOrThrow(args.decisionAt, "decisionAt");
  const commenceMs = parseIsoOrThrow(args.commenceTime, "commenceTime");

  // Gate: decisionAt must be at least minLead before kickoff.
  if (decisionAtMs > commenceMs - minLead) {
    return { ok: false, refuse: "decision_after_cutoff" };
  }

  // Prop market check: market must contain exactly one "|" with non-empty halves.
  // Non-prop (no "|") → not_a_prop_market. Markets with wrong "|" structure → refuse.
  if (!marketHasSinglePipe(args.market)) {
    return { ok: false, refuse: "not_a_prop_market" };
  }
  const decoded = decodePropMarket(args.market);
  if (!decoded) {
    return { ok: false, refuse: "not_a_prop_market" };
  }

  // Filter to this market + execution book + over/under sides, pre-decision only.
  const execRows = filterRows(args.rows, args.market, args.book, decisionAtMs);

  // --- open_line / open_dec_over: earliest over-side row's line + decimal ---
  const overSamples = [...execRows.over];
  if (overSamples.length === 0) {
    return { ok: false, refuse: "no_decision_snapshot" };
  }
  overSamples.sort(compareSample); // stable ascending by capturedAtMs, then input order

  const opener = overSamples[0]!;
  const openLine = opener.line;
  const openDecOver = americanToDecimal(opener.price);
  if (openDecOver === null) {
    return { ok: false, refuse: "bad_price" };
  }

  // --- line_now / dec_over_now / drift_line / steps_n: over path up to decision ---
  const overPath: PathPoint[] = overSamples.map((s) => ({ t: s.capturedAtMs, v: s.line ?? 0 }));
  const lineNowSample = latestAtOrBefore(
    overSamples.map((s) => ({ t: s.capturedAtMs, v: s.line ?? 0 })),
    decisionAtMs,
  );
  if (!lineNowSample) {
    return { ok: false, refuse: "no_decision_snapshot" };
  }

  const velLine = slopePerHour(overPath); // null when < 2 points or zero variance
  const maxStep = maxAbsStep(overPath);   // null when < 2 points
  const lineNow = lineNowSample.v;
  // At decision time, the line is the over path's latest value; price comes from the SampledRow.
  const decisionSample = findLatestAtOrBefore(overSamples, decisionAtMs);
  if (!decisionSample) {
    return { ok: false, refuse: "no_decision_snapshot" };
  }
  const decOverNow = americanToDecimal(decisionSample.price);

  const features = new Map<string, number>();

  // open_line and open_dec_over
  if (openLine !== null) {
    features.set("open_line", openLine);
  }
  features.set("open_dec_over", openDecOver);

  // line_now and dec_over_now
  features.set("line_now", lineNow);
  if (decOverNow !== null) {
    features.set("dec_over_now", decOverNow);
  }

  // drift_line (only when both open and now lines are available)
  if (openLine !== null) {
    features.set("drift_line", lineNow - openLine);
  }

  // vel_line_per_hr, max_step_line, jump_flag, steps_n
  if (velLine !== null) {
    features.set("vel_line_per_hr", velLine);
  }
  if (maxStep !== null) {
    features.set("max_step_line", maxStep);
    features.set("jump_flag", maxStep >= 1.0 ? 1 : 0);
  }
  features.set("steps_n", overSamples.filter((s) => s.capturedAtMs <= decisionAtMs).length);

  // ttk_hours
  features.set("ttk_hours", (commenceMs - decisionAtMs) / 3_600_000);

  // --- Cross-book features: book_disp_line_now, consensus_qover_now, qover_now ---
  const allBooksRows = filterRowsAllBooks(args.rows, args.market, decisionAtMs);
  const execBookOver = execRows.over.filter((s) => s.capturedAtMs <= decisionAtMs);
  const execBookUnder = execRows.under.filter((s) => s.capturedAtMs <= decisionAtMs);

  // qover_now: execution book's Shin qOver at decision
  if (execBookOver.length > 0 && execBookUnder.length > 0) {
    const decNow = americanToDecimal(findLatestAtOrBefore(execBookOver, decisionAtMs)!.price);
    const decNowUnder = americanToDecimal(findLatestAtOrBefore(execBookUnder, decisionAtMs)!.price);
    if (decNow !== null && decNowUnder !== null) {
      const devigged = shinDevig([decNow, decNowUnder]);
      if (devigged) {
        features.set("qover_now", devigged.probs[0]!);
      }
    }
  }

  // book_disp_line_now: rangeSpread of line_now across books (>= 2 books)
  const linesAtDecision: number[] = [];
  for (const [b, sideData] of allBooksRows) {
    if (sideData.over.length > 0) {
      const latest = findLatestAtOrBefore(sideData.over, decisionAtMs);
      if (latest && latest.line !== null) linesAtDecision.push(latest.line);
    }
  }
  const bookDisp = rangeSpread(linesAtDecision);
  if (bookDisp !== null) {
    features.set("book_disp_line_now", bookDisp);
  }

  // consensus_qover_now: median Shin qOver across books, two-sided within tolerance
  const consensusQovers: number[] = [];
  for (const [b, sideData] of allBooksRows) {
    if (sideData.over.length > 0 && sideData.under.length > 0) {
      const oLatest = findLatestAtOrBefore(sideData.over, decisionAtMs);
      const uLatest = findLatestAtOrBefore(sideData.under, decisionAtMs);
      if (oLatest && uLatest) {
        const cycleDiff = Math.abs(oLatest.capturedAtMs - uLatest.capturedAtMs);
        if (cycleDiff <= PAIR_TOLERANCE_MS) {
          const decO = americanToDecimal(oLatest.price);
          const decU = americanToDecimal(uLatest.price);
          if (decO !== null && decU !== null) {
            const dev = shinDevig([decO, decU]);
            if (dev) consensusQovers.push(dev.probs[0]!);
          }
        }
      }
    }
  }
  if (consensusQovers.length >= 1) {
    consensusQovers.sort((a, b) => a - b);
    const mid = Math.floor(consensusQovers.length / 2);
    const median =
      consensusQovers.length % 2 === 1
        ? consensusQovers[mid]!
        : (consensusQovers[mid - 1]! + consensusQovers[mid]!) / 2;
    features.set("consensus_qover_now", median);
  }

  // decisionDecimalOver / qOverDecision / decisionDecimalUnder
  const decisionDecOver = americanToDecimal(decisionSample!.price);
  let qOverDecision: number | null = null;
  let decisionDecUnder: number | null = null;

  if (decisionDecOver !== null) {
    // Try to get the under price at decision time from the execution book
    const decUnderNow = execBookUnder.length > 0 ? americanToDecimal(execBookUnder[0]!.price) : null;
    if (decUnderNow !== null) {
      decisionDecUnder = decUnderNow;
      const dev = shinDevig([decisionDecOver, decUnderNow]);
      if (dev) qOverDecision = dev.probs[0]!;
    }
  }

  // Assert no key matches the closing pattern (I7)
  for (const k of features.keys()) {
    if (CLOSING_KEY_PATTERN.test(k)) {
      throw new RangeError(`line-path-features: key "${k}" matches closing-line pattern (I7 violation)`);
    }
  }

  const featureMap = features as ReadonlyMap<string, number>;

  const result: DecisionFeatures = {
    ok: true,
    features: featureMap,
    decisionCapturedAt: decisionSample.capturedAt,
    decisionDecimalOver: decisionDecOver ?? 0,
    decisionDecimalUnder: decisionDecUnder,
    qOverDecision,
    priced: false,
    layer: "MARKET_PROP",
  };

  // If we couldn't get a valid decision price, refuse
  if (decisionDecOver === null) {
    return { ok: false, refuse: "bad_price" };
  }

  return result;
}

function marketHasSinglePipe(market: string): boolean {
  const parts = market.split("|");
  if (parts.length !== 2) return false;
  const family = parts[0];
  const playerSlug = parts[1];
  if (!family || !playerSlug) return false;
  return true;
}

interface BookSides {
  over: SampledRow[];
  under: SampledRow[];
}

function filterRows(rows: readonly ArchiveRow[], market: string, book: string, decisionAtMs: number): BookSides {
  const over: SampledRow[] = [];
  const under: SampledRow[] = [];
  let idx = 0;
  for (const r of rows) {
    if (r.market !== market || r.book !== book) continue;
    const ms = parseIsoOrThrow(r.capturedAt, "capturedAt");
    if (ms > decisionAtMs) continue;
    const sample: SampledRow = { capturedAt: r.capturedAt, capturedAtMs: ms, price: r.price, line: r.line, phase: r.phase, inputIndex: idx++ };
    if (r.side === "over") over.push(sample);
    else if (r.side === "under") under.push(sample);
  }
  return { over, under };
}

function filterRowsAllBooks(rows: readonly ArchiveRow[], market: string, decisionAtMs: number): Map<string, BookSides> {
  const byBook = new Map<string, BookSides>();
  let idx = 0;
  for (const r of rows) {
    if (r.market !== market) continue;
    const ms = parseIsoOrThrow(r.capturedAt, "capturedAt");
    if (ms > decisionAtMs) continue;
    let entry = byBook.get(r.book);
    if (!entry) {
      entry = { over: [], under: [] };
      byBook.set(r.book, entry);
    }
    const sample: SampledRow = { capturedAt: r.capturedAt, capturedAtMs: ms, price: r.price, line: r.line, phase: r.phase, inputIndex: idx++ };
    if (r.side === "over") entry.over.push(sample);
    else if (r.side === "under") entry.under.push(sample);
  }
  return byBook;
}

function compareSample(a: SampledRow, b: SampledRow): number {
  if (a.capturedAtMs !== b.capturedAtMs) return a.capturedAtMs - b.capturedAtMs;
  return a.inputIndex - b.inputIndex;
}

function findLatestAtOrBefore(rows: readonly SampledRow[], t: number): SampledRow | null {
  let best: SampledRow | null = null;
  for (const r of rows) {
    if (r.capturedAtMs <= t) {
      if (!best || r.capturedAtMs > best.capturedAtMs || (r.capturedAtMs === best.capturedAtMs && r.inputIndex > best.inputIndex)) {
        best = r;
      }
    }
  }
  return best;
}
