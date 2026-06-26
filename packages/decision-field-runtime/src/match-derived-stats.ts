/**
 * GSE PROPRIETARY MATCH STATS — 20 soccer derived stats with passports.
 *
 * GSE does not show naked stats. Each derived stat carries a passport (formula, weakness, decision-use,
 * falsifier, earned lifecycle status) reusing `stat-foundry`'s discipline: on FIXTURE data nothing
 * exceeds EXPERIMENTAL. Computed deterministically from the `UniversalEventGenome` stat bag (Ecuador-
 * Germany). Zero-division safe; missing inputs degrade to null with an honest weakness. No live data.
 *
 * Pure + deterministic. Spec: docs/product/STAT_PASSPORTS.md.
 */

import type { DecisionState } from "./decision-state.js";
import type { UniversalEventGenome } from "./universal-event-genome.js";
import { statNum } from "./universal-event-genome.js";
import { type StatGenome, type StatStatus, clampStatus } from "./stat-foundry.js";

export interface MatchDerivedStat {
  readonly key: string;
  readonly name: string;
  readonly value: number | null;
  readonly formula: string;
  readonly explanation: string;
  readonly inputs: readonly string[];
  readonly weakness: string;
  readonly decisionUse: string;
  readonly passport: StatGenome;
  readonly publicSafe: boolean;
  readonly fixtureWatermarked: true;
}

// ── helpers ──
function safeDiv(a: number, b: number): number | null {
  return b === 0 ? null : a / b;
}
function r(x: number | null, places = 3): number | null {
  if (x === null || !Number.isFinite(x)) return null;
  const f = 10 ** places;
  return Math.round(x * f) / f;
}
/** Raw implied probability from decimal odds (NOT de-vigged — noted in weaknesses that use it). */
function impliedProb(decimal: number): number {
  return decimal > 0 ? 1 / decimal : 0;
}
function oddsFor(g: UniversalEventGenome, market: string, selectionIncludes: string): number | null {
  const o = g.odds.find((x) => x.market === market && x.selection.toLowerCase().includes(selectionIncludes.toLowerCase()));
  return o ? o.price : null;
}

function passport(p: {
  key: string;
  name: string;
  question: string;
  formula: string;
  unit: string;
  falsifier: string;
  failureModes: readonly string[];
  decisionStates: readonly DecisionState[];
  status?: StatStatus;
}): StatGenome {
  return {
    key: p.key,
    name: p.name,
    version: "0.1.0-fixture",
    questionAnswered: p.question,
    formula: p.formula,
    unit: p.unit,
    decisionStatesSupported: p.decisionStates,
    falsifier: p.falsifier,
    expectedFailureModes: p.failureModes,
    knownAtRequirement: "Post-match stats are known at full time; pre-match variants need the snapshot at decision time.",
    uncertaintyMethod: "single-fixture point value (deterministic); no interval until a sample exists",
    evidence: "FIXTURE",
    status: clampStatus(p.status ?? "EXPERIMENTAL", "FIXTURE"), // fixtures never exceed EXPERIMENTAL
    implemented: true,
  };
}

const WATCH_STATES: readonly DecisionState[] = ["WATCHLIST", "PUBLIC_OVERREACTION", "GOOD_IDEA_BAD_PRICE"];

// ───────────────────────── the 20 stats ─────────────────────────
export function matchDerivedStats(g: UniversalEventGenome): readonly MatchDerivedStat[] {
  if (g.sport !== "soccer") return []; // these are soccer stats; other sports degrade to none (graceful)

  const xgH = statNum(g, "xgHome"), xgA = statNum(g, "xgAway");
  const xgTotal = xgH + xgA;
  const shotsH = statNum(g, "shotsHome"), shotsA = statNum(g, "shotsAway");
  const possH = statNum(g, "possessionHome"), possA = statNum(g, "possessionAway");
  const passH = statNum(g, "successfulPassesHome"), passA = statNum(g, "successfulPassesAway");
  const dangH = statNum(g, "dangerousAttacksHome"), dangA = statNum(g, "dangerousAttacksAway");
  const scoreMargin = g.scoreState.home - g.scoreState.away;
  const xgMargin = xgH - xgA;
  const xgShareGer = safeDiv(xgA, xgTotal) ?? 0; // away = Germany
  const xgShareEcu = safeDiv(xgH, xgTotal) ?? 0; // home = Ecuador

  const out: MatchDerivedStat[] = [];
  const add = (s: MatchDerivedStat) => out.push(s);

  // 1. Chance Density
  add({
    key: "chance_density", name: "Chance Density", value: r(safeDiv(xgTotal, shotsH + shotsA)),
    formula: "total xG / total shots", explanation: `${xgTotal.toFixed(2)} xG over ${shotsH + shotsA} shots.`,
    inputs: ["xgHome", "xgAway", "shotsHome", "shotsAway"],
    weakness: "Treats all shots equally; shot location/quality varies. One match.",
    decisionUse: "Reads how clinical the chances were vs their volume.", publicSafe: true, fixtureWatermarked: true,
    passport: passport({ key: "chance_density", name: "Chance Density", question: "How clinical were the chances?", formula: "Σ xG / Σ shots", unit: "xG/shot", falsifier: "If high density games don't convert at a higher rate over a sample, it's noise.", failureModes: ["ignores shot quality", "n=1"], decisionStates: WATCH_STATES }),
  });

  // 2. Possession Mirage Index — possession dominance not producing chance dominance
  const possDomSide = possA >= possH ? "away" : "home";
  const possShareDom = possDomSide === "away" ? possA : possH;
  const xgShareDom = possDomSide === "away" ? xgShareGer * 100 : xgShareEcu * 100;
  add({
    key: "possession_mirage_index", name: "Possession Mirage Index", value: r(possShareDom - xgShareDom, 1),
    formula: "possession% (dominant side) − xG share% (dominant side)",
    explanation: `The ${possDomSide === "away" ? "away" : "home"} side held ${possShareDom}% of the ball but only ${xgShareDom.toFixed(1)}% of the xG.`,
    inputs: ["possessionHome", "possessionAway", "xgHome", "xgAway"],
    weakness: "Possession can be a tactic, not a failure; some teams cede the ball by design. One match.",
    decisionUse: "Flags when the ball-dominant team did not actually threaten — a fade/under signal candidate.", publicSafe: true, fixtureWatermarked: true,
    passport: passport({ key: "possession_mirage_index", name: "Possession Mirage Index", question: "Did possession translate into threat?", formula: "poss% − xGshare% (dominant side)", unit: "points", falsifier: "If high-mirage teams still win/score at expected rates over a sample, it doesn't predict.", failureModes: ["possession-as-tactic", "n=1"], decisionStates: WATCH_STATES }),
  });

  // 3. Sterile Possession Index — passes per xG for the dominant side (higher = more sterile)
  const passDom = possDomSide === "away" ? passA : passH;
  const xgDom = possDomSide === "away" ? xgA : xgH;
  add({
    key: "sterile_possession_index", name: "Sterile Possession Index", value: r(safeDiv(passDom, xgDom), 0),
    formula: "successful passes / xG (dominant side)", explanation: `${passDom} successful passes per ${xgDom.toFixed(2)} xG.`,
    inputs: ["successfulPassesHome", "successfulPassesAway", "xgHome", "xgAway"],
    weakness: "Build-up styles differ; divides by xG (null if xG=0). One match.",
    decisionUse: "High value = lots of passing, little end product (sterile control).", publicSafe: true, fixtureWatermarked: true,
    passport: passport({ key: "sterile_possession_index", name: "Sterile Possession Index", question: "Was the passing productive or sterile?", formula: "passes / xG (dominant side)", unit: "passes/xG", falsifier: "If sterile teams convert at expected rates over a sample, it's not sterility.", failureModes: ["style-dependent", "xG=0 → null", "n=1"], decisionStates: WATCH_STATES }),
  });

  // 4. Dangerous Attack Yield — xG per dangerous attack (match)
  add({
    key: "dangerous_attack_yield", name: "Dangerous Attack Yield", value: r(safeDiv(xgTotal, dangH + dangA), 4),
    formula: "total xG / total dangerous attacks", explanation: `${xgTotal.toFixed(2)} xG from ${dangH + dangA} dangerous attacks.`,
    inputs: ["xgHome", "xgAway", "dangerousAttacksHome", "dangerousAttacksAway"],
    weakness: "‘Dangerous attack’ is a coarse provider label. One match.",
    decisionUse: "How much real threat each surge of pressure produced.", publicSafe: true, fixtureWatermarked: true,
    passport: passport({ key: "dangerous_attack_yield", name: "Dangerous Attack Yield", question: "Did pressure become threat?", formula: "Σ xG / Σ dangerous attacks", unit: "xG/attack", falsifier: "If yield doesn't relate to scoring over a sample, it's noise.", failureModes: ["coarse provider label", "n=1"], decisionStates: WATCH_STATES }),
  });

  // 5. Pass-to-Threat Yield — xG per 1000 successful passes
  add({
    key: "pass_to_threat_yield", name: "Pass-to-Threat Yield", value: r((safeDiv(xgTotal, passH + passA) ?? 0) * 1000, 2),
    formula: "(total xG / total successful passes) × 1000", explanation: `${xgTotal.toFixed(2)} xG per ${passH + passA} successful passes.`,
    inputs: ["xgHome", "xgAway", "successfulPassesHome", "successfulPassesAway"],
    weakness: "Possession-heavy styles deflate this by design. One match.",
    decisionUse: "Directness of the attack — threat per unit of passing.", publicSafe: true, fixtureWatermarked: true,
    passport: passport({ key: "pass_to_threat_yield", name: "Pass-to-Threat Yield", question: "How direct was the threat?", formula: "xG per 1000 successful passes", unit: "xG/1k passes", falsifier: "If it doesn't separate direct vs sterile teams over a sample, drop it.", failureModes: ["style bias", "n=1"], decisionStates: WATCH_STATES }),
  });

  // 6. xG Justice Score — alignment of xG margin and score margin
  add({
    key: "xg_justice_score", name: "xG Justice Score", value: r(1 - Math.min(1, Math.abs(xgMargin - scoreMargin) / (Math.abs(scoreMargin) + 1)), 2),
    formula: "1 − min(1, |xG margin − score margin| / (|score margin| + 1))",
    explanation: `xG margin ${xgMargin.toFixed(2)} vs score margin ${scoreMargin}.`,
    inputs: ["xgHome", "xgAway", "scoreState.home", "scoreState.away"],
    weakness: "xG models differ by provider; a single match is noisy.",
    decisionUse: "Did the scoreline match the chances? Low = lucky/unlucky result.", publicSafe: true, fixtureWatermarked: true,
    passport: passport({ key: "xg_justice_score", name: "xG Justice Score", question: "Did the result match the chances?", formula: "alignment of xG and score margins", unit: "0–1", falsifier: "If low-justice results don't regress over a sample, xG isn't informative here.", failureModes: ["provider xG variance", "n=1"], decisionStates: WATCH_STATES }),
  });

  // 7. Expected Points Justice — how well xP predicted the result for the home side
  const xpH = statNum(g, "expectedPointsHome");
  const resultPtsH = g.scoreState.final ? (scoreMargin > 0 ? 3 : scoreMargin === 0 ? 1 : 0) : null;
  add({
    key: "expected_points_justice", name: "Expected Points Justice", value: resultPtsH === null ? null : r(1 - Math.abs(resultPtsH - xpH) / 3, 2),
    formula: "1 − |result points − expected points| / 3 (home)", explanation: `xP ${xpH.toFixed(2)} vs result ${resultPtsH ?? "—"} pts.`,
    inputs: ["expectedPointsHome", "scoreState"],
    weakness: "xP is itself a model output; one match. Null pre-match.",
    decisionUse: "Whether the points won were earned by the underlying play.", publicSafe: true, fixtureWatermarked: true,
    passport: passport({ key: "expected_points_justice", name: "Expected Points Justice", question: "Were the points deserved?", formula: "alignment of result points and xP", unit: "0–1", falsifier: "If undeserved points don't regress over a sample, xP isn't informative.", failureModes: ["model-on-model", "pre-match → null", "n=1"], decisionStates: WATCH_STATES }),
  });

  // 8. Set-Piece Pressure Index — home share of set-piece volume
  const spH = statNum(g, "cornersHome") + statNum(g, "crossesHome") + statNum(g, "freeKicksHome");
  const spA = statNum(g, "cornersAway") + statNum(g, "crossesAway") + statNum(g, "freeKicksAway");
  add({
    key: "set_piece_pressure_index", name: "Set-Piece Pressure Index", value: r(safeDiv(spH, spH + spA), 2),
    formula: "(corners+crosses+free kicks) home share", explanation: `Home set-piece volume ${spH} vs away ${spA}.`,
    inputs: ["cornersHome", "crossesHome", "freeKicksHome", "cornersAway", "crossesAway", "freeKicksAway"],
    weakness: "Volume ≠ quality of set pieces; delivery matters. One match.",
    decisionUse: "Corners/cards-over and set-piece-goal market context.", publicSafe: true, fixtureWatermarked: true,
    passport: passport({ key: "set_piece_pressure_index", name: "Set-Piece Pressure Index", question: "Who owned the set-piece phase?", formula: "home share of set-piece volume", unit: "0–1", falsifier: "If it doesn't relate to set-piece goals/corners markets over a sample, drop it.", failureModes: ["volume≠quality", "n=1"], decisionStates: WATCH_STATES }),
  });

  // 9. Discipline Friction Index — match fouls + weighted cards
  const friction = statNum(g, "foulsHome") + statNum(g, "foulsAway") + 2 * (statNum(g, "yellowsHome") + statNum(g, "yellowsAway")) + 5 * (statNum(g, "redsHome") + statNum(g, "redsAway"));
  add({
    key: "discipline_friction_index", name: "Discipline Friction Index", value: friction,
    formula: "fouls + 2×yellows + 5×reds (match)", explanation: `Total friction ${friction} across both sides.`,
    inputs: ["foulsHome", "foulsAway", "yellowsHome", "yellowsAway", "redsHome", "redsAway"],
    weakness: "Referee tendency and match stakes are not adjusted here. One match.",
    decisionUse: "Cards-over/under and game-temperament market context.", publicSafe: true, fixtureWatermarked: true,
    passport: passport({ key: "discipline_friction_index", name: "Discipline Friction Index", question: "How niggly was the game?", formula: "fouls + 2·yellows + 5·reds", unit: "friction pts", falsifier: "If friction doesn't relate to cards markets over a sample with referee controls, drop it.", failureModes: ["no referee adjustment", "n=1"], decisionStates: WATCH_STATES }),
  });

  // 10. Goalkeeper Swing — saves + expected goals prevented (home GK)
  add({
    key: "goalkeeper_swing", name: "Goalkeeper Swing", value: r(statNum(g, "savesHome") + statNum(g, "expectedGoalsPreventedHome"), 2),
    formula: "saves + expected goals prevented (home GK)", explanation: `Home GK: ${statNum(g, "savesHome")} saves, xGP ${statNum(g, "expectedGoalsPreventedHome")}.`,
    inputs: ["savesHome", "expectedGoalsPreventedHome"],
    weakness: "xGP is a model output; shot difficulty varies. One match.",
    decisionUse: "Goalkeeper save props and clean-sheet context.", publicSafe: true, fixtureWatermarked: true,
    passport: passport({ key: "goalkeeper_swing", name: "Goalkeeper Swing", question: "How much did the keeper swing the game?", formula: "saves + xG prevented", unit: "goals-equiv", falsifier: "If swing doesn't relate to save props / results over a sample, drop it.", failureModes: ["xGP model variance", "n=1"], decisionStates: WATCH_STATES }),
  });

  // 11. Big Chance Conversion Pressure — converted big chances (home)
  const bcH = statNum(g, "bigChancesHome"), bcmH = statNum(g, "bigChancesMissedHome");
  add({
    key: "big_chance_conversion_pressure", name: "Big Chance Conversion Pressure", value: r(safeDiv(bcH - bcmH, bcH), 2),
    formula: "(big chances − big chances missed) / big chances (home)", explanation: `Home converted ${bcH - bcmH} of ${bcH} big chances.`,
    inputs: ["bigChancesHome", "bigChancesMissedHome"],
    weakness: "‘Big chance’ is a subjective provider tag; tiny counts are noisy.",
    decisionUse: "Finishing reliability context for player/team scoring markets.", publicSafe: true, fixtureWatermarked: true,
    passport: passport({ key: "big_chance_conversion_pressure", name: "Big Chance Conversion Pressure", question: "Did they finish their big chances?", formula: "converted / total big chances", unit: "0–1", falsifier: "If conversion doesn't regress to mean over a sample, finishing is being over-read.", failureModes: ["subjective tag", "tiny counts", "n=1"], decisionStates: WATCH_STATES }),
  });

  // 12. Rotation Risk Index — proxy from substitution volume
  add({
    key: "rotation_risk_index", name: "Rotation Risk Index", value: r(safeDiv(statNum(g, "subsHome") + statNum(g, "subsAway"), 22), 2),
    formula: "(subs home + away) / 22 (proxy)", explanation: `Proxy from ${statNum(g, "subsHome") + statNum(g, "subsAway")} total substitutions.`,
    inputs: ["subsHome", "subsAway"],
    weakness: "PROXY — true rotation risk needs pre-match lineup probabilities, not post-match subs.",
    decisionUse: "Pre-match lineup-uncertainty context (placeholder until lineup feed).", publicSafe: true, fixtureWatermarked: true,
    passport: passport({ key: "rotation_risk_index", name: "Rotation Risk Index", question: "How uncertain was the lineup?", formula: "sub-volume proxy", unit: "0–1", falsifier: "Replace with pre-match lineup-probability model; the proxy fails when subs are tactical, not rotational.", failureModes: ["proxy not the real quantity", "needs lineup feed"], decisionStates: ["NEEDS_LIVE_DATA", "WATCHLIST"], status: "CANDIDATE" }),
  });

  // 13. Elimination Pressure Index — from stage label
  const stagePressure: Record<string, number> = { Group: 0.4, "Round of 16": 0.7, "Quarter-final": 0.8, "Semi-final": 0.9, Final: 1.0 };
  add({
    key: "elimination_pressure_index", name: "Elimination Pressure Index", value: stagePressure[g.stage ?? "Group"] ?? 0.4,
    formula: "stage → pressure mapping", explanation: `Stage: ${g.stage ?? "Group"}.`,
    inputs: ["stage"],
    weakness: "Derived from the stage label only; real elimination math needs standings + scenarios.",
    decisionUse: "Tournament-state context for game-temperament and totals.", publicSafe: true, fixtureWatermarked: true,
    passport: passport({ key: "elimination_pressure_index", name: "Elimination Pressure Index", question: "How high were the stakes?", formula: "stage label → 0–1", unit: "0–1", falsifier: "Replace with standings-scenario math; label mapping fails for dead rubbers.", failureModes: ["label-only", "ignores live standings"], decisionStates: ["WATCHLIST"], status: "CANDIDATE" }),
  });

  // 14. Trend Fragility Score — no trend sample attached here
  add({
    key: "trend_fragility_score", name: "Trend Fragility Score", value: 1.0,
    formula: "1 = maximally fragile until a sized trend sample is attached", explanation: "No trend sample on the genome — see Trend Passports.",
    inputs: [],
    weakness: "Placeholder — real fragility is computed in the Trend Passport from sample size + overlap.",
    decisionUse: "Stops a trend from being treated as evidence before its sample is known.", publicSafe: true, fixtureWatermarked: true,
    passport: passport({ key: "trend_fragility_score", name: "Trend Fragility Score", question: "How fragile is the trend?", formula: "deferred to Trend Passport", unit: "0–1", falsifier: "A trend with a large independent sample should score low fragility; if not, the model is wrong.", failureModes: ["needs the trend sample"], decisionStates: ["WATCHLIST"], status: "CANDIDATE" }),
  });

  // 15. Prediction Process Score — evidence-completeness proxy
  const inputCount = Object.keys(g.stats).length;
  add({
    key: "prediction_process_score", name: "Prediction Process Score", value: r(Math.min(1, inputCount / 40), 2),
    formula: "evidence completeness proxy (inputs present / 40)", explanation: `${inputCount} stat inputs available.`,
    inputs: ["stats"],
    weakness: "PROXY — real process score is computed in the Prediction Court against a trial, separate from outcome.",
    decisionUse: "Rough read of how much evidence backed a read (full version in Prediction Court).", publicSafe: true, fixtureWatermarked: true,
    passport: passport({ key: "prediction_process_score", name: "Prediction Process Score", question: "Was the read well-evidenced?", formula: "evidence completeness proxy", unit: "0–1", falsifier: "Process must be scored vs a trial, not outcome; the proxy fails when rich data backs a bad read.", failureModes: ["proxy not the real quantity", "see Prediction Court"], decisionStates: ["WATCHLIST"], status: "CANDIDATE" }),
  });

  // 16. Good Pass Value — value of passing on the priced favorite (market vs xG)
  const gerOdds = oddsFor(g, "Match result", "Germany");
  const gpv = gerOdds === null ? null : impliedProb(gerOdds) - xgShareGer;
  add({
    key: "good_pass_value", name: "Good Pass Value", value: r(gpv, 3),
    formula: "implied P(favorite) − xG share(favorite)", explanation: gerOdds === null ? "No favorite odds in fixture." : `Market priced the favorite at ${(impliedProb(gerOdds) * 100).toFixed(0)}% but they earned ${(xgShareGer * 100).toFixed(0)}% of the xG.`,
    inputs: ["odds(Match result)", "xgHome", "xgAway"],
    weakness: "Single match; raw (vig-included) implied prob; real Good Pass Value needs settled decision history.",
    decisionUse: "Quantifies the value of restraint — passing on a mispriced favorite.", publicSafe: true, fixtureWatermarked: true,
    passport: passport({ key: "good_pass_value", name: "Good Pass Value", question: "Was passing the right call?", formula: "market implied − xG share (favorite)", unit: "prob points", falsifier: "If high-GPV passes don't beat acting over a settled sample, restraint isn't adding value.", failureModes: ["raw implied prob", "needs settled history", "n=1"], decisionStates: ["PASS", "GOOD_IDEA_BAD_PRICE"] }),
  });

  // 17. Observer Disagreement Index — market-implied vs xG-implied favorite
  add({
    key: "observer_disagreement_index", name: "Observer Disagreement Index", value: r(gpv === null ? null : Math.abs(gpv), 3),
    formula: "|implied P(favorite) − xG share(favorite)|", explanation: "How far the market and the underlying play disagreed.",
    inputs: ["odds", "xgHome", "xgAway"],
    weakness: "Two observers only (market vs xG); a full index adds fantasy/crowd/trend frames.",
    decisionUse: "High = the reality and the price tell different stories — a divergence to inspect.", publicSafe: true, fixtureWatermarked: true,
    passport: passport({ key: "observer_disagreement_index", name: "Observer Disagreement Index", question: "Do the observers disagree?", formula: "|market − reality| on the favorite", unit: "prob points", falsifier: "If divergence doesn't relate to mispricing over a sample, it's noise.", failureModes: ["only 2 frames here", "raw implied prob"], decisionStates: WATCH_STATES }),
  });

  // 18. Match State Volatility — goals + lead changes
  let leadChanges = 0; let sign = 0; let h = 0; let a = 0;
  for (const ev of g.timeline) {
    if (ev.type !== "GOAL") continue;
    if (ev.side === "HOME") h++; else if (ev.side === "AWAY") a++;
    const s = Math.sign(h - a);
    if (s !== 0 && s !== sign) { if (sign !== 0) leadChanges++; sign = s; }
  }
  add({
    key: "match_state_volatility", name: "Match State Volatility", value: r(safeDiv(h + a + leadChanges, 10), 2),
    formula: "(goals + lead changes) / 10", explanation: `${h + a} goals, ${leadChanges} lead change(s).`,
    inputs: ["timeline"],
    weakness: "Coarse; ignores chance swings without goals. One match.",
    decisionUse: "Live-betting and momentum context.", publicSafe: true, fixtureWatermarked: true,
    passport: passport({ key: "match_state_volatility", name: "Match State Volatility", question: "How swingy was the game?", formula: "(goals + lead changes)/10", unit: "0–1+", falsifier: "If volatility doesn't relate to live-market movement over a sample, drop it.", failureModes: ["goal-only", "n=1"], decisionStates: WATCH_STATES }),
  });

  // 19. Underdog Deservedness Score — underdog xG share minus implied prob
  const ecuOdds = oddsFor(g, "Match result", "Ecuador");
  const underdogDeserved = ecuOdds === null ? null : xgShareEcu - impliedProb(ecuOdds);
  add({
    key: "underdog_deservedness_score", name: "Underdog Deservedness Score", value: r(underdogDeserved, 3),
    formula: "xG share(underdog) − implied P(underdog)", explanation: ecuOdds === null ? "No underdog odds." : `Underdog created ${(xgShareEcu * 100).toFixed(0)}% of xG while priced at ${(impliedProb(ecuOdds) * 100).toFixed(0)}%.`,
    inputs: ["odds(Match result)", "xgHome", "xgAway"],
    weakness: "Single match; raw implied prob; doesn't prove repeatability.",
    decisionUse: "Whether an underdog result was earned (keep) or fluky (fade next time).", publicSafe: true, fixtureWatermarked: true,
    passport: passport({ key: "underdog_deservedness_score", name: "Underdog Deservedness Score", question: "Did the underdog deserve it?", formula: "xG share − implied prob (underdog)", unit: "prob points", falsifier: "If ‘deserved’ underdogs don't outperform price next time over a sample, it's noise.", failureModes: ["raw implied prob", "n=1"], decisionStates: WATCH_STATES }),
  });

  // 20. Stat Meaning Confidence — the honest meta-stat (n=1 fixture → low)
  add({
    key: "stat_meaning_confidence", name: "Stat Meaning Confidence", value: 0.2,
    formula: "fixed-low on a single fixture; rises only with sample + calibration", explanation: "One fixture, no settled sample — meaning confidence is deliberately low.",
    inputs: [],
    weakness: "By design this is low here; it is the discipline that stops one match from being treated as truth.",
    decisionUse: "Caps how much any of the above may drive a decision today.", publicSafe: true, fixtureWatermarked: true,
    passport: passport({ key: "stat_meaning_confidence", name: "Stat Meaning Confidence", question: "How much should we trust these stats for a decision?", formula: "low on n=1; grows with sample + calibration", unit: "0–1", falsifier: "If decisions made at high meaning-confidence don't outperform low, the confidence is miscalibrated.", failureModes: ["n=1 by construction"], decisionStates: ["WATCHLIST", "NEEDS_LIVE_DATA"] }),
  });

  return out;
}
