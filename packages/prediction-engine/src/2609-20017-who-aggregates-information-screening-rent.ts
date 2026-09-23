/**
 * arXiv:2609.20017 — Who Aggregates Information? Screening, Rent, and the Coexistence of CLOB and AMM Prediction Markets
 *
 * Screening-band book classifier: each book's signal band from recent volatility; books quoting inside the
 * band pre-news are pickoff-exposed (their subsequent moves are informative — follow them) vs books quoting
 * outside with persistent lines are screening (recreational — fade).
 *
 * Improvement: Build a screening-band line classifier over GSE's book-odds data: for each NFL game compute each book's signal band from recent volatility, classify books quoting inside the band pre-news as pickoff-exposed (their subsequent moves are informative - follow them) vs books quoting outside with persistent lines as screening (their lines reflect recreational positioning - fade or down-weight in consensus).
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: ADAPT is confirmed if inside-band book moves beat screened-book moves on close-direction prediction by >=4pp (p < 0.05) on the 2024 sample - i.e., the screening/pickoff distinction is real in sportsbook data; REJECT the classifier if both move types predict equally well (or equally poorly) - then book lines don't separate into informed vs recreational venues, and GSE should keep treating all line moves symmetrically.
 */

/** Book quote snapshot pre-news. */
export interface BookQuote {
  book: string;
  /** Current line (spread). */
  line: number;
  /** Recent line volatility (sd of moves). */
  vol: number;
  /** Line at the last update (persistence check). */
  prevLine: number;
}

/** Signal band for a book: consensus +/- k*vol. */
export function signalBand(consensus: number, vol: number, k = 1.5): [number, number] {
  if (vol < 0) throw new Error("signalBand: vol >= 0");
  return [consensus - k * vol, consensus + k * vol];
}

/**
 * Classify a book: "pickoff-exposed" if quoting inside its band (tight,
 * informative — will get picked off by news), "screening" if outside with a
 * persistent line (recreational positioning).
 */
export function classifyBook(
  q: BookQuote,
  consensus: number,
  k = 1.5,
): "pickoff-exposed" | "screening" {
  const [lo, hi] = signalBand(consensus, q.vol, k);
  const inside = q.line >= lo && q.line <= hi;
  const persistent = q.line === q.prevLine;
  return inside && !persistent ? "pickoff-exposed" : "screening";
}

/**
 * Close-direction hit rate of a book class's moves (the gate's comparison).
 */
export function classHitRate(
  moves: readonly { cls: "pickoff-exposed" | "screening"; predictedDir: 1 | -1; actualDir: 1 | -1 }[],
  cls: "pickoff-exposed" | "screening",
): number {
  const sub = moves.filter((m) => m.cls === cls);
  if (sub.length === 0) return NaN;
  return sub.filter((m) => m.predictedDir === m.actualDir).length / sub.length;
}
