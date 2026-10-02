/**
 * Human-readable renderer for a `ReasoningTrace`.
 *
 * Pure formatting: it reads the trace and prints it. It computes no value that
 * is not already in the trace object, and it never smooths over a suppression,
 * an exclusion, or a failed reconciliation. A trace that did not reconcile
 * renders with a loud FAIL banner rather than a tidy number.
 *
 * The renderer deliberately shows the SUPPRESSED section even when it is long,
 * because the suppressed half is the reason this module exists: a factor list
 * cannot express "we read it and it did not fire".
 */

import type {
  ConfidenceArithmetic,
  FiredSignal,
  ReasoningTrace,
  SuppressedSignal,
} from "./reasoning-trace.js";

function pct(p: number): string {
  return `${(p * 100).toFixed(1)}%`;
}

function sign(v: number): string {
  return v >= 0 ? "+" : "-";
}

function num(v: number): string {
  return Number.isInteger(v) ? String(Math.abs(v)) : Math.abs(v).toFixed(4);
}

function rule(char = "─", width = 78): string {
  return char.repeat(width);
}

function renderFired(signals: readonly FiredSignal[]): string[] {
  const out: string[] = [];
  if (signals.length === 0) {
    out.push("  (no factors fired)");
    return out;
  }
  const included = signals.filter((s) => s.enteredConfidenceSum);
  const excluded = signals.filter((s) => !s.enteredConfidenceSum);

  out.push(`  FIRED — ${included.length} signal(s) carried weight into the confidence sum:`);
  for (const s of included) {
    out.push(`    ${sign(s.weight)}${num(s.weight).padStart(7)}  ${s.name}  [${s.impact}]`);
    out.push(`             ${s.description}`);
    if (s.fedBy.length > 0) out.push(`             fed by: ${s.fedBy.join(", ")}`);
  }
  if (excluded.length > 0) {
    out.push("");
    out.push(`  FIRED BUT NOT IN THE CONFIDENCE SUM — ${excluded.length} context-only factor(s):`);
    for (const s of excluded) {
      out.push(`    ${sign(s.weight)}${num(s.weight).padStart(7)}  ${s.name}  [${s.impact}]`);
      out.push(`             ${s.description}`);
      if (s.fedBy.length > 0) out.push(`             fed by: ${s.fedBy.join(", ")}`);
      if (s.exclusionReason) out.push(`             WHY EXCLUDED: ${s.exclusionReason}`);
    }
  }
  return out;
}

function renderSuppressed(signals: readonly SuppressedSignal[]): string[] {
  const out: string[] = [];
  if (signals.length === 0) {
    out.push("  (every signal field present in the input produced a factor)");
    return out;
  }
  out.push(
    `  ${signals.length} input signal(s) were PRESENT and produced NO factor. Each one is listed because`,
  );
  out.push(`  silence here is a real engine decision, not an absence of one:`);
  out.push("");
  for (const s of signals) {
    out.push(`    ✗ ${s.signal}   [${s.reason}]`);
    out.push(`      input field : ${s.field}`);
    out.push(`      input value : ${s.inputValue}`);
    if (s.computedScore != null) out.push(`      scored      : ${sign(s.computedScore)}${num(s.computedScore)}`);
    out.push(`      why no factor: ${s.explanation}`);
    out.push("");
  }
  return out;
}

function renderArithmetic(a: ConfidenceArithmetic): string[] {
  const out: string[] = [];
  out.push("  Terms that ENTERED the confidence sum:");
  for (const t of a.terms.filter((x) => x.enteredSum)) {
    out.push(`    ${sign(t.value)}${num(t.value).padStart(7)}  ${t.label}`);
    out.push(`              source: ${t.source}`);
  }
  out.push(`    ${sign(a.base)}${num(a.base).padStart(7)}  Board-quality base (flat, always present)`);
  out.push(`    ${"─".repeat(50)}`);
  out.push(`    = ${num(a.includedSum)}  sum of included terms`);
  out.push(`    + ${num(a.base)}  base  = ${num(a.includedSum + a.base)}`);
  out.push(`    clamp(0, 100)          = ${num(a.clampedSum)}`);
  out.push(`    round(...)             = ${Math.round(a.clampedSum)}`);
  out.push(`    pick.confidence        = ${a.pickConfidence}`);

  const verdict = a.reconciles
    ? "RECONCILES ✓ — the trace's arithmetic reproduces the published number exactly."
    : `DOES NOT RECONCILE ✗ — residual ${a.residual}. The engine's arithmetic differs from the term set this trace can read. Reported, not hidden.`;
  out.push("");
  out.push(`  ${verdict}`);

  const excluded = a.terms.filter((x) => !x.enteredSum);
  if (excluded.length > 0) {
    out.push("");
    out.push(`  Terms EXCLUDED from the confidence sum (${excluded.length}):`);
    for (const t of excluded) {
      out.push(`    ${sign(t.value)}${num(t.value).padStart(7)}  ${t.label}`);
      if (t.exclusionReason) out.push(`             ${t.exclusionReason}`);
    }
  }
  return out;
}

export function renderReasoningTrace(trace: ReasoningTrace): string {
  const L: string[] = [];

  L.push(rule("═"));
  L.push(`REASONING TRACE — ${trace.pickType}  ${trace.selection}`);
  L.push(rule("═"));
  L.push(`game       : ${trace.gameId}  (${trace.sport})`);
  L.push(`matchup    : ${trace.awayTeam} @ ${trace.homeTeam}`);
  L.push(`picked side: ${trace.pickedSide}`);
  L.push(`line       : ${trace.line}`);
  L.push(`model      : ${trace.modelVersion}    as of ${trace.dataFreshnessAt}`);
  L.push("");

  L.push(`MARKET READ`);
  L.push(rule());
  L.push(
    `  ${trace.market.bookmakerCount} books pricing this market · consensus ${pct(
      trace.market.consensusPct,
    )}`,
  );
  L.push(
    `  market fair (${trace.market.marketFairMethod ?? "n/a"}): ${
      trace.market.marketFairProb == null ? "n/a" : pct(trace.market.marketFairProb)
    }   Shin (display only): ${
      trace.market.marketFairShinProb == null ? "n/a" : pct(trace.market.marketFairShinProb)
    }`,
  );
  L.push(
    `  entry price: ${
      trace.market.entryPrice == null
        ? "n/a"
        : trace.market.entryPrice > 0
          ? `+${trace.market.entryPrice}`
          : String(trace.market.entryPrice)
    }   Edge Index: ${trace.market.edgeScore}/100   data quality: ${trace.market.dataQualityScore}/100`,
  );
  L.push(
    `  two-way implied sum (overround): ${
      trace.market.twoSidedImpliedSum == null
        ? "n/a"
        : trace.market.twoSidedImpliedSum.toFixed(4)
    } → market ${trace.market.marketConsistent ? "CONSISTENT (≥1)" : "SUB-VIG (<1) — no positive edge credited (scoring.ts:369)"}`,
  );
  if (trace.market.books.length > 0) {
    const sample = trace.market.books
      .slice(0, 4)
      .map((b) => `${b.bookmaker}${b.line != null ? `@${b.line}` : ""}${b.price != null ? ` ${b.price > 0 ? `+${b.price}` : b.price}` : ""}`)
      .join("  ");
    L.push(
      `  books      : ${trace.market.books.map((b) => b.bookmaker).join(", ")}${
        trace.market.books.length > 4 ? ` (+${trace.market.books.length - 4} more)` : ""
      }`,
    );
    L.push(`  e.g.        ${sample}`);
  }
  L.push("");

  L.push("SIGNALS THAT FIRED");
  L.push(rule());
  L.push(...renderFired(trace.fired));
  L.push("");

  L.push("SIGNALS THAT DID NOT FIRE (present in the input, produced no factor)");
  L.push(rule());
  L.push(...renderSuppressed(trace.suppressed));
  L.push("");

  L.push("CONFIDENCE ARITHMETIC");
  L.push(rule());
  L.push(...renderArithmetic(trace.arithmetic));
  L.push("");

  L.push("INDEPENDENT EDGE");
  L.push(rule());
  const ie = trace.independentEdge;
  if (!ie.assessed) {
    L.push(`  NOT ASSESSED. No independent fair value was blended for this ${trace.pickType} pick.`);
    L.push(
      `  The honest default: with no independent estimate the engine declines rather than manufacture an`,
    );
    L.push(`  edge from the market's own price (edge-engine.ts:35-37, :152-166).`);
  } else {
    L.push(`  decision        : ${ie.decision}     agreement: ${ie.agreement}`);
    L.push(`  sources consulted: ${ie.sourcesConsulted.join(", ") || "(none)"}`);
    for (const s of ie.sourceProbabilities) {
      L.push(
        `    · ${s.source.padEnd(22)} independent P(${trace.pickedSide}) = ${
          s.prob == null ? "null — dropped, never guessed" : pct(s.prob)
        }`,
      );
    }
    L.push(
      `  blended         : ${
        ie.blendedProbability == null ? "n/a" : pct(ie.blendedProbability)
      }   (weights default to 1, scoring.ts:230)`,
    );
    L.push(
      `  market fair     : ${
        ie.marketFairProbability == null ? "n/a" : pct(ie.marketFairProbability)
      }`,
    );
    L.push(`  raw edge        : ${ie.rawEdge == null ? "n/a" : `${(ie.rawEdge * 100).toFixed(2)} pts`}`);
    L.push(`  shrunk edge     : ${ie.shrunkEdge == null ? "n/a" : `${(ie.shrunkEdge * 100).toFixed(2)} pts`}`);
    L.push(
      `  expected CLV    : ${ie.expectedClv == null ? "n/a" : `${(ie.expectedClv * 100).toFixed(2)} pts`}   conviction: ${
        ie.conviction == null ? "n/a" : `${ie.conviction}/100`
      }`,
    );
    L.push(`  priced into rank: ${ie.priced ? "YES" : "no — surfaced only"}`);
    L.push(`  withhold gate   : pricesWorseThanMarket = ${ie.pricesWorseThanMarket}`);
    if (ie.rationale) L.push(`  rationale       : ${ie.rationale}`);
  }
  if (ie.sourcesNotConsulted.length > 0) {
    L.push(`  sources NOT consulted by this ${trace.pickType} scorer: ${ie.sourcesNotConsulted.join(", ")}`);
  }
  L.push("");

  L.push("CALIBRATION SEAM");
  L.push(rule());
  const s = trace.calibrationSeam;
  L.push(`  seam present    : ${s.present ? "YES" : "NO"}`);
  L.push(`  fitted here     : ${s.fittedAtRuntime ? "YES" : "NO — and it never can be"}`);
  L.push(
    `  before seam     : ${s.beforeSeam == null ? "n/a" : s.beforeSeam.toFixed(4)}`,
  );
  L.push(`  after seam      : ${s.afterSeam == null ? "n/a" : s.afterSeam.toFixed(4)}`);
  L.push(`  delta           : ${s.delta == null ? "n/a" : s.delta.toFixed(4)}`);
  L.push(`  moved the value : ${s.changedValue ? "YES" : "NO"}`);
  L.push("");
  for (const line of wrap(s.note, 74)) L.push(`  ${line}`);
  L.push("");

  L.push("RANKING PATH");
  L.push(rule());
  L.push(`  rankingScore  : ${trace.ranking.rankingScore}`);
  L.push(`  rankingP      : ${trace.ranking.rankingP == null ? "n/a" : trace.ranking.rankingP.toFixed(4)}`);
  L.push(`  rankingSource : ${trace.ranking.source}`);
  L.push(
    `  blend terms   : confidence/100 = ${trace.ranking.confidenceAsProbability.toFixed(4)}` +
      (trace.ranking.independentTrueProb == null
        ? "  ·  independent trueProb = n/a"
        : `  ·  independent trueProb = ${trace.ranking.independentTrueProb.toFixed(4)}  (weight ${trace.ranking.independentWeight})`),
  );
  if (trace.ranking.blendedFormula) L.push(`  formula       : ${trace.ranking.blendedFormula}`);
  L.push(`  priced        : ${trace.ranking.priced ? "YES — independents drove the ranking key" : "no — confidence alone ranked"}`);
  L.push("");

  L.push("FINAL PICK");
  L.push(rule());
  L.push(`  ${trace.selection}`);
  L.push(
    `  confidence ${trace.pick.confidence}/100 → tier ${trace.pick.tier}, grade ${trace.pick.pickGrade}, risk ${trace.pick.riskLevel}`,
  );
  L.push(`  engine prose: ${trace.pick.reasoning}`);
  L.push("");

  if (trace.unresolved.length > 0) {
    L.push("UNRESOLVED — what this trace could NOT source");
    L.push(rule());
    for (const u of trace.unresolved) {
      for (const line of wrap(u, 74)) L.push(`  ${line}`);
      L.push("");
    }
  } else {
    L.push("UNRESOLVED: none. Every field in this trace traces to real scored output.");
    L.push("");
  }

  L.push(rule("═"));
  return L.join("\n");
}

function wrap(text: string, width: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    if (line.length === 0) line = word;
    else if (line.length + 1 + word.length <= width) line += ` ${word}`;
    else {
      lines.push(line);
      line = word;
    }
  }
  if (line.length > 0) lines.push(line);
  return lines;
}