/**
 * Edge diagnostic — pure aggregator.
 *
 * The blended win rate hides everything. A market-tracking model lands near 50%
 * by construction, and a 250-pick win-rate sample is too noisy to tell edge from
 * variance. This module turns a flat list of SETTLED canonical pick records into
 * the read that actually matters:
 *
 *   - split by TIER (the FREE teaser picks vs the PREMIUM picks customers pay
 *     for — the blended number conflates them),
 *   - split by conviction GRADE, by SPORT, by MODEL VERSION,
 *   - and, above all, CLOSING-LINE VALUE (CLV) — the leading indicator of a
 *     real edge. A pick that consistently beats the closing line is winning
 *     against the sharpest version of the market, which predicts long-run profit
 *     long before a noisy win-rate sample can confirm it.
 *
 * Pure + exported so the read is unit-tested; the runner (diagnose-edge.mjs)
 * supplies the rows from Postgres. No I/O here, no fabrication: every number is
 * a direct count over real settled picks.
 *
 * @typedef {Object} PickRow
 * @property {"WIN"|"LOSS"|"PUSH"|string} result
 * @property {"FREE"|"PREMIUM"|string|null} tier
 * @property {number|null} confidence
 * @property {string|null} pickGrade
 * @property {string|null} modelVersion
 * @property {string|null} sport
 * @property {number|null} clvValue
 * @property {"BEAT_CLOSE"|"MATCHED_CLOSE"|"LOST_TO_CLOSE"|string|null} clvVerdict
 */

/** -110 break-even. A win rate below this LOSES money at standard juice. */
export const BREAK_EVEN_WIN_RATE = 0.524;
/** Below this many CLV-graded picks, the CLV read is noise — say so, don't guess. */
export const MIN_CLV_SAMPLE = 30;
/** Picks at/above this confidence are tagged PREMIUM (see PREMIUM_CONFIDENCE_THRESHOLD). */
export const HIGH_CONFIDENCE_THRESHOLD = 70;

const CLV_VERDICTS = new Set(["BEAT_CLOSE", "MATCHED_CLOSE", "LOST_TO_CLOSE"]);

/** Format a 0–1 rate as a percentage string, or "—" when null. */
export function pct(x) {
  return x === null || x === undefined ? "—" : `${(x * 100).toFixed(1)}%`;
}

/**
 * Reduce a set of rows to one segment summary. Win rate excludes pushes
 * (decided = wins + losses); CLV stats are over the CLV-graded subset only.
 * @param {string} label
 * @param {PickRow[]} rows
 */
export function summarize(label, rows) {
  let wins = 0;
  let losses = 0;
  let pushes = 0;
  let clvGraded = 0;
  let clvBeat = 0;
  let clvLost = 0;
  let clvSum = 0;

  for (const r of rows) {
    if (r.result === "WIN") wins += 1;
    else if (r.result === "LOSS") losses += 1;
    else if (r.result === "PUSH") pushes += 1;

    if (r.clvVerdict && CLV_VERDICTS.has(r.clvVerdict)) {
      clvGraded += 1;
      if (r.clvVerdict === "BEAT_CLOSE") clvBeat += 1;
      else if (r.clvVerdict === "LOST_TO_CLOSE") clvLost += 1;
      if (typeof r.clvValue === "number" && Number.isFinite(r.clvValue)) clvSum += r.clvValue;
    }
  }

  const decided = wins + losses;
  return {
    label,
    n: rows.length,
    wins,
    losses,
    pushes,
    winRate: decided > 0 ? wins / decided : null,
    clvGraded,
    clvBeat,
    clvLost,
    clvBeatRate: clvGraded > 0 ? clvBeat / clvGraded : null,
    avgClv: clvGraded > 0 ? clvSum / clvGraded : null,
  };
}

function groupSegments(rows, keyFn) {
  const map = new Map();
  for (const r of rows) {
    const k = String(keyFn(r) ?? "—");
    const bucket = map.get(k);
    if (bucket) bucket.push(r);
    else map.set(k, [r]);
  }
  return [...map.entries()]
    .map(([k, group]) => summarize(k, group))
    .sort((a, b) => b.n - a.n);
}

/**
 * The honest one-line read. CLV — not win rate — is the edge signal, and only
 * once there are enough graded picks to believe it.
 * @param {ReturnType<typeof summarize>} overall
 */
export function edgeVerdict(overall) {
  if (overall.n === 0) return "No settled canonical picks yet — nothing to read.";
  if (overall.clvGraded < MIN_CLV_SAMPLE) {
    return (
      `CLV sample too small (${overall.clvGraded} graded, need ${MIN_CLV_SAMPLE}+). ` +
      `Win rate alone (${pct(overall.winRate)}) is noise at this size — accumulate more ` +
      `CLV-graded picks before judging edge.`
    );
  }
  const beat = overall.clvBeatRate;
  if (beat > 0.55) {
    return (
      `POSITIVE CLV: beating the close ${pct(beat)} of the time (avg ${overall.avgClv?.toFixed(3)}). ` +
      `A real edge is plausible — keep accumulating and validate forward before scaling claims.`
    );
  }
  if (beat >= 0.5) {
    return (
      `MARGINAL CLV: beating the close ${pct(beat)} of the time — roughly even with the market. ` +
      `No demonstrable edge yet.`
    );
  }
  return (
    `NEGATIVE CLV: beating the close only ${pct(beat)} of the time (avg ${overall.avgClv?.toFixed(3)}). ` +
    `The picks get WORSE prices than the close — no edge, consistent with a market-tracking model.`
  );
}

/**
 * Build the full segmented diagnostic from settled canonical pick rows.
 * @param {PickRow[]} rows
 */
export function buildEdgeDiagnostic(rows) {
  const overall = summarize("Overall", rows);
  return {
    overall,
    byTier: groupSegments(rows, (r) => r.tier),
    byGrade: groupSegments(rows, (r) => r.pickGrade),
    bySport: groupSegments(rows, (r) => r.sport),
    byModelVersion: groupSegments(rows, (r) => r.modelVersion),
    highlights: {
      // What customers actually pay for — must be read on its own, not blended.
      premium: summarize("PREMIUM (paid)", rows.filter((r) => r.tier === "PREMIUM")),
      highConfidence: summarize(
        `Confidence >= ${HIGH_CONFIDENCE_THRESHOLD}`,
        rows.filter((r) => typeof r.confidence === "number" && r.confidence >= HIGH_CONFIDENCE_THRESHOLD)
      ),
    },
    verdict: edgeVerdict(overall),
  };
}
