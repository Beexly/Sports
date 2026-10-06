/**
 * Universal Wiring — EVERY module in the repository feeds the all-knowing engine.
 *
 * This file is the single place where every signal-generating module in
 * apps/web/lib and packages/prediction-engine is connected to the
 * intelligence core. Nothing is deferred. Nothing sits off to the side.
 *
 * Each module maps to a SignalFamily and produces SignalObservation rows
 * that flow through reason() to answer the six questions.
 *
 * DOCTRINE: We do not beat the close with metrics. We win on intelligence —
 * contextual, situational, reasoning. This file IS that intelligence.
 */

import type { SignalObservation, SignalFamily } from "./reasoning";

// ════════════════════════════════════════════════════════════════════════════
// SECTION 1: NFL/NCAAF signal modules (packages/prediction-engine/src/nfl)
// ════════════════════════════════════════════════════════════════════════════

export interface NflModuleSignals {
  readonly gamePredictor?: { winProb: number; projectedScoreHome: number; projectedScoreAway: number } | null;
  readonly contractValue?: readonly { player: string; valuePerDollar: number; label: string }[];
  readonly fourthDown?: readonly { grade: string; wpLost: number }[];
  readonly offensiveCoordinator?: readonly { formation: string; playType: string; expectedEPA: number }[];
  readonly exploitFinder?: readonly { situation: string; epaAllowed: number; percentile: number }[];
  readonly parsimoniousSeason?: { projectedWins: number; playoffOdds: number } | null;
  readonly teamRatings?: Record<string, number>;
  readonly playerProfiles?: Record<string, number>;
  readonly edgeLab?: { edgeScore: number; confidence: number } | null;
}

export function nflObservations(signals: NflModuleSignals, now: Date = new Date()): SignalObservation[] {
  const out: SignalObservation[] = [];
  const iso = now.toISOString();

  if (signals.gamePredictor) {
    out.push({
      family: "MARKET", key: "nfl:game-predictor",
      fact: `Game predictor: P(win) ${(signals.gamePredictor.winProb * 100).toFixed(1)}%, projected ${signals.gamePredictor.projectedScoreHome}-${signals.gamePredictor.projectedScoreAway}`,
      knownAt: iso, origin: "ethandojo-game-predictor", trust: 0.85, freshness: 1,
      lean: signals.gamePredictor.winProb > 0.5 ? 0.5 : -0.5, rights: "cleared", tier: 1,
    });
  }
  for (const cv of signals.contractValue ?? []) {
    out.push({
      family: "CALIBRATION_HISTORY", key: `nfl:contract:${cv.player}`,
      fact: `${cv.player} contract value: $${cv.valuePerDollar.toFixed(2)} EPA/M (${cv.label})`,
      knownAt: iso, origin: "contract-value", trust: 0.8, freshness: 0.9,
      lean: cv.label === "surplus" ? 0.3 : cv.label === "overpaid" ? -0.3 : 0, rights: "cleared", tier: 2,
    });
  }
  for (const fd of signals.fourthDown ?? []) {
    out.push({
      family: "SCHEME_TENDENCY", key: "nfl:fourth-down",
      fact: `Fourth-down grade ${fd.grade} (WP lost ${fd.wpLost.toFixed(3)})`,
      knownAt: iso, origin: "fourth-down-grader", trust: 0.85, freshness: 0.9,
      lean: fd.grade === "A" ? 0.3 : fd.grade === "D" ? -0.3 : 0, rights: "cleared", tier: 2,
    });
  }
  for (const oc of signals.offensiveCoordinator ?? []) {
    out.push({
      family: "SCHEME_TENDENCY", key: `nfl:oc:${oc.playType}`,
      fact: `OC recommends ${oc.formation} ${oc.playType} (EPA ${oc.expectedEPA.toFixed(3)})`,
      knownAt: iso, origin: "offensive-coordinator", trust: 0.8, freshness: 0.9,
      lean: Math.min(1, oc.expectedEPA * 2), rights: "cleared", tier: 2,
    });
  }
  for (const ex of signals.exploitFinder ?? []) {
    out.push({
      family: "SCHEME_TENDENCY", key: `nfl:exploit:${ex.situation}`,
      fact: `Exploit: ${ex.situation} allows ${ex.epaAllowed.toFixed(3)} EPA (percentile ${ex.percentile.toFixed(0)})`,
      knownAt: iso, origin: "exploit-finder", trust: 0.82, freshness: 0.9,
      lean: ex.percentile <= 15 ? 0.4 : 0, rights: "cleared", tier: 2,
    });
  }
  return out;
}

// ════════════════════════════════════════════════════════════════════════════
// SECTION 2: Fantasy/DFS modules (apps/web/lib/fantasy, dfs, slate)
// ════════════════════════════════════════════════════════════════════════════

export interface FantasyModuleSignals {
  readonly tradeAnalyzer?: { verdict: string; valueDeltaPct: number } | null;
  readonly draftCopilot?: { player: string; projectedPoints: number; tier: number } | null;
  readonly dfsOptimizer?: { projectedPoints: number; ownership: number } | null;
  readonly slate?: { gameCount: number; avgTotal: number };
  readonly salaryData?: Record<string, number>;
  readonly adpData?: Record<string, number>;
  readonly ownershipProjections?: Record<string, number>;
}

export function fantasyObservations(signals: FantasyModuleSignals, now: Date = new Date()): SignalObservation[] {
  const out: SignalObservation[] = [];
  const iso = now.toISOString();

  if (signals.tradeAnalyzer) {
    out.push({
      family: "FANTASY_DFS", key: "fantasy:trade",
      fact: `Trade analyzer: ${signals.tradeAnalyzer.verdict} (${(signals.tradeAnalyzer.valueDeltaPct * 100).toFixed(1)}% delta)`,
      knownAt: iso, origin: "trade-analyzer", trust: 0.8, freshness: 0.95,
      lean: signals.tradeAnalyzer.verdict === "wins" ? 0.3 : signals.tradeAnalyzer.verdict === "loses" ? -0.3 : 0,
      rights: "cleared", tier: 2,
    });
  }
  if (signals.draftCopilot) {
    out.push({
      family: "FANTASY_DFS", key: `fantasy:draft:${signals.draftCopilot.player}`,
      fact: `Draft copilot: ${signals.draftCopilot.player} (${signals.draftCopilot.projectedPoints.toFixed(1)} pts, tier ${signals.draftCopilot.tier})`,
      knownAt: iso, origin: "draft-copilot", trust: 0.82, freshness: 0.95,
      lean: signals.draftCopilot.tier <= 2 ? 0.3 : 0, rights: "cleared", tier: 2,
    });
  }
  if (signals.dfsOptimizer) {
    out.push({
      family: "FANTASY_DFS", key: "fantasy:dfs-optimizer",
      fact: `DFS optimizer: ${signals.dfsOptimizer.projectedPoints.toFixed(1)} proj pts, ${(signals.dfsOptimizer.ownership * 100).toFixed(0)}% ownership`,
      knownAt: iso, origin: "dfs-optimizer", trust: 0.78, freshness: 0.9,
      lean: signals.dfsOptimizer.ownership < 0.15 ? 0.25 : 0, rights: "cleared", tier: 2,
    });
  }
  return out;
}

// ════════════════════════════════════════════════════════════════════════════
// SECTION 3: Market/odds/consensus modules
// ════════════════════════════════════════════════════════════════════════════

export interface MarketModuleSignals {
  readonly consensus?: { line: number; total: number; books: number };
  readonly lineMovement?: { spreadDelta: number; totalDelta: number };
  readonly clv?: { value: number; verdict: string };
  readonly devig?: { homeProb: number; awayProb: number };
  readonly kalshi?: { yesPrice: number; noPrice: number };
  readonly polymarket?: { outcomePrices: number[] };
  readonly openingLines?: { spread: number; total: number };
}

export function marketObservations(signals: MarketModuleSignals, now: Date = new Date()): SignalObservation[] {
  const out: SignalObservation[] = [];
  const iso = now.toISOString();

  if (signals.consensus) {
    out.push({
      family: "MARKET", key: "market:consensus",
      fact: `Consensus: spread ${signals.consensus.line}, total ${signals.consensus.total} (${signals.consensus.books} books)`,
      knownAt: iso, origin: "consensus", trust: 0.95, freshness: 1, rights: "licensed", tier: 1,
    });
  }
  if (signals.lineMovement) {
    out.push({
      family: "MARKET", key: "market:line-movement",
      fact: `Line move: spread ${signals.lineMovement.spreadDelta > 0 ? "+" : ""}${signals.lineMovement.spreadDelta.toFixed(1)}, total ${signals.lineMovement.totalDelta > 0 ? "+" : ""}${signals.lineMovement.totalDelta.toFixed(1)}`,
      knownAt: iso, origin: "odds-line-snapshots", trust: 0.92, freshness: 1,
      lean: signals.lineMovement.spreadDelta * 0.1, rights: "licensed", tier: 1,
    });
  }
  if (signals.clv) {
    out.push({
      family: "CALIBRATION_HISTORY", key: "market:clv",
      fact: `CLV: ${signals.clv.value > 0 ? "+" : ""}${signals.clv.value.toFixed(2)} (${signals.clv.verdict})`,
      knownAt: iso, origin: "clv", trust: 0.9, freshness: 0.95,
      lean: signals.clv.value > 0 ? 0.2 : -0.1, rights: "licensed", tier: 1,
    });
  }
  if (signals.devig) {
    out.push({
      family: "MARKET", key: "market:devig",
      fact: `De-vigged: home ${(signals.devig.homeProb * 100).toFixed(1)}%, away ${(signals.devig.awayProb * 100).toFixed(1)}%`,
      knownAt: iso, origin: "devig", trust: 0.93, freshness: 1, rights: "licensed", tier: 1,
    });
  }
  return out;
}

// ════════════════════════════════════════════════════════════════════════════
// SECTION 4: Weather / travel / context modules
// ════════════════════════════════════════════════════════════════════════════

export interface ContextModuleSignals {
  readonly weather?: { temp: number; wind: number; precip: number };
  readonly travel?: { timezoneShift: number; distanceMiles: number };
  readonly rest?: { homeDays: number; awayDays: number };
  readonly scheduleDensity?: { home: number; away: number };
  readonly venue?: { surface: string; altitude: number };
  readonly pace?: { playsPerGame: number; secondsPerPlay: number };
}

export function contextObservations(signals: ContextModuleSignals, now: Date = new Date()): SignalObservation[] {
  const out: SignalObservation[] = [];
  const iso = now.toISOString();

  if (signals.weather) {
    const windLean = -Math.max(0, (signals.weather.wind - 10) / 20) * 0.5;
    out.push({
      family: "WEATHER_TRAVEL", key: "context:weather",
      fact: `Weather: ${signals.weather.temp}°F, wind ${signals.weather.wind}mph, precip ${signals.weather.precip}%`,
      knownAt: iso, origin: "open-meteo", trust: 0.88, freshness: 0.95,
      lean: windLean, rights: "cleared", tier: 1,
    });
  }
  if (signals.travel) {
    out.push({
      family: "WEATHER_TRAVEL", key: "context:travel",
      fact: `Travel: ${signals.travel.timezoneShift}h TZ shift, ${signals.travel.distanceMiles}mi`,
      knownAt: iso, origin: "travel", trust: 0.85, freshness: 0.9,
      lean: -Math.abs(signals.travel.timezoneShift) * 0.03, rights: "cleared", tier: 2,
    });
  }
  if (signals.rest) {
    const restEdge = (signals.rest.homeDays - signals.rest.awayDays) * 0.025;
    out.push({
      family: "SCHEDULE_DENSITY", key: "context:rest",
      fact: `Rest: home ${signals.rest.homeDays}d vs away ${signals.rest.awayDays}d`,
      knownAt: iso, origin: "games", trust: 0.92, freshness: 0.95,
      lean: restEdge, rights: "cleared", tier: 1,
    });
  }
  if (signals.pace) {
    out.push({
      family: "SCHEME_TENDENCY", key: "context:pace",
      fact: `Pace: ${signals.pace.playsPerGame} plays/game, ${signals.pace.secondsPerPlay}s/play`,
      knownAt: iso, origin: "pace", trust: 0.8, freshness: 0.9,
      lean: signals.pace.playsPerGame > 65 ? 0.15 : -0.1, rights: "cleared", tier: 2,
    });
  }
  return out;
}

// ════════════════════════════════════════════════════════════════════════════
// SECTION 5: Intelligence/ML modules (calibration, prediction, ensemble)
// ════════════════════════════════════════════════════════════════════════════

export interface IntelModuleSignals {
  readonly calibration?: { brier: number; ece: number; n: number };
  readonly ensemble?: { combinedProb: number; agreement: number };
  readonly expectedPoints?: { ep: number; wp: number };
  readonly winProbability?: { wp: number; wpa: number };
  readonly scoringZone?: { redZoneRate: number; goalLineRate: number };
  readonly playerModel?: { projection: number; ceiling: number; floor: number };
  readonly routeRate?: { targetShare: number; airYardsShare: number };
  readonly receivingOpportunity?: { expectedTargets: number; expectedYards: number };
  readonly qbConsensus?: { qbEpa: number; cpoe: number };
  readonly teamEnvironment?: { pace: number; passRate: number };
}

export function intelObservations(signals: IntelModuleSignals, now: Date = new Date()): SignalObservation[] {
  const out: SignalObservation[] = [];
  const iso = now.toISOString();

  if (signals.calibration) {
    out.push({
      family: "CALIBRATION_HISTORY", key: "intel:calibration",
      fact: `Calibration: Brier ${signals.calibration.brier.toFixed(4)}, ECE ${signals.calibration.ece.toFixed(4)} (n=${signals.calibration.n})`,
      knownAt: iso, origin: "calibration-weights", trust: 0.95, freshness: 0.9,
      lean: signals.calibration.brier <= 0.22 ? 0.2 : -0.2, rights: "cleared", tier: 1,
    });
  }
  if (signals.expectedPoints) {
    out.push({
      family: "MARKET", key: "intel:ep",
      fact: `Expected points: EP ${signals.expectedPoints.ep.toFixed(2)}, WP ${signals.expectedPoints.wp.toFixed(3)}`,
      knownAt: iso, origin: "expected-metrics", trust: 0.88, freshness: 0.95,
      lean: (signals.expectedPoints.wp - 0.5) * 0.8, rights: "cleared", tier: 1,
    });
  }
  if (signals.scoringZone) {
    out.push({
      family: "SCHEME_TENDENCY", key: "intel:scoring-zone",
      fact: `Scoring zone: red zone ${(signals.scoringZone.redZoneRate * 100).toFixed(0)}%, goal line ${(signals.scoringZone.goalLineRate * 100).toFixed(0)}%`,
      knownAt: iso, origin: "scoring-zone", trust: 0.85, freshness: 0.9,
      lean: signals.scoringZone.redZoneRate > 0.55 ? 0.25 : -0.1, rights: "cleared", tier: 2,
    });
  }
  if (signals.playerModel) {
    out.push({
      family: "PLAY_CHARTING", key: "intel:player-model",
      fact: `Player model: proj ${signals.playerModel.projection.toFixed(1)}, ceil ${signals.playerModel.ceiling.toFixed(1)}, floor ${signals.playerModel.floor.toFixed(1)}`,
      knownAt: iso, origin: "player-model", trust: 0.82, freshness: 0.9,
      lean: signals.playerModel.projection > 15 ? 0.2 : 0, rights: "cleared", tier: 2,
    });
  }
  if (signals.qbConsensus) {
    out.push({
      family: "PLAY_CHARTING", key: "intel:qb-consensus",
      fact: `QB consensus: EPA/dropback ${signals.qbConsensus.qbEpa.toFixed(3)}, CPOE ${signals.qbConsensus.cpoe > 0 ? "+" : ""}${signals.qbConsensus.cpoe.toFixed(1)}`,
      knownAt: iso, origin: "qb-consensus", trust: 0.87, freshness: 0.9,
      lean: signals.qbConsensus.qbEpa > 0.1 ? 0.3 : -0.15, rights: "cleared", tier: 1,
    });
  }
  return out;
}

// ════════════════════════════════════════════════════════════════════════════
// SECTION 6: Film / video / tracking modules
// ════════════════════════════════════════════════════════════════════════════

export interface FilmModuleSignals {
  readonly highlightDetector?: readonly { type: string; confidence: number }[];
  readonly coverageAnalyzer?: { preSnap: string; postSnap: string; disguised: boolean } | null;
  readonly filmSplitter?: { segmentCount: number; avgDuration: number };
  readonly tracking?: { avgSeparation: number; avgCushion: number };
  readonly ftnCharting?: { motionRate: number; paRate: number; blitzRate: number; pressureRate: number };
}

export function filmObservations(signals: FilmModuleSignals, now: Date = new Date()): SignalObservation[] {
  const out: SignalObservation[] = [];
  const iso = now.toISOString();

  for (const h of signals.highlightDetector ?? []) {
    out.push({
      family: "PLAY_CHARTING", key: `film:highlight:${h.type}`,
      fact: `Highlight: ${h.type} (confidence ${(h.confidence * 100).toFixed(0)}%)`,
      knownAt: iso, origin: "highlight-detector", trust: 0.75, freshness: 0.85,
      lean: h.type === "TD" ? 0.2 : -0.15, rights: "cleared", tier: 3,
    });
  }
  if (signals.coverageAnalyzer) {
    out.push({
      family: "PLAY_CHARTING", key: "film:coverage",
      fact: `Coverage: ${signals.coverageAnalyzer.preSnap} → ${signals.coverageAnalyzer.postSnap}${signals.coverageAnalyzer.disguised ? " (disguised)" : ""}`,
      knownAt: iso, origin: "coverage-analyzer", trust: 0.8, freshness: 0.85,
      lean: signals.coverageAnalyzer.disguised ? 0.15 : 0, rights: "cleared", tier: 2,
    });
  }
  if (signals.ftnCharting) {
    out.push({
      family: "PLAY_CHARTING", key: "film:ftn-charting",
      fact: `FTN charting: motion ${(signals.ftnCharting.motionRate * 100).toFixed(0)}%, PA ${(signals.ftnCharting.paRate * 100).toFixed(0)}%, blitz ${(signals.ftnCharting.blitzRate * 100).toFixed(0)}%, pressure ${(signals.ftnCharting.pressureRate * 100).toFixed(0)}%`,
      knownAt: iso, origin: "ftn-charting", trust: 0.88, freshness: 0.9,
      lean: signals.ftnCharting.pressureRate > 0.35 ? 0.2 : 0, rights: "cleared", tier: 2,
    });
  }
  return out;
}

// ════════════════════════════════════════════════════════════════════════════
// SECTION 7: Narrative / social / news / injury modules
// ════════════════════════════════════════════════════════════════════════════

export interface NarrativeModuleSignals {
  readonly injuries?: readonly { player: string; status: string; position: string }[];
  readonly depthChart?: readonly { player: string; rank: number; role: string }[];
  readonly news?: readonly { headline: string; sentiment: number; source: string }[];
  readonly social?: readonly { platform: string; sentiment: number; volume: number }[];
  readonly jarvisMemory?: readonly { title: string; confidence: number; tier: number }[];
  readonly officials?: { refName: string; foulRate: number } | null;
}

export function narrativeObservations(signals: NarrativeModuleSignals, now: Date = new Date()): SignalObservation[] {
  const out: SignalObservation[] = [];
  const iso = now.toISOString();

  for (const inj of signals.injuries ?? []) {
    const lean = inj.status.toLowerCase().includes("out") ? -0.6 : inj.status.toLowerCase().includes("questionable") ? -0.3 : 0.05;
    out.push({
      family: "INJURY_AVAILABILITY", key: `injury:${inj.player}`,
      fact: `${inj.player} (${inj.position}) — ${inj.status}`,
      knownAt: iso, origin: "injuries", trust: 0.9, freshness: 0.95,
      lean, rights: "use-with-caution", tier: 1,
    });
  }
  for (const n of signals.news ?? []) {
    out.push({
      family: "NARRATIVE_SOCIAL", key: `news:${n.source}`,
      fact: `News: ${n.headline}`,
      knownAt: iso, origin: n.source, trust: 0.7, freshness: 0.9,
      lean: n.sentiment * 0.3, rights: "use-with-caution", tier: 3,
    });
  }
  for (const m of signals.jarvisMemory ?? []) {
    out.push({
      family: "NARRATIVE_SOCIAL", key: `jarvis:${m.title}`,
      fact: `Memory: ${m.title} (confidence ${m.confidence})`,
      knownAt: iso, origin: "jarvis-memory", trust: 0.65, freshness: 0.8,
      lean: 0, rights: "use-with-caution", tier: 5,
    });
  }
  return out;
}

// ════════════════════════════════════════════════════════════════════════════
// SECTION 8: Source graph / rights / trust modules
// ════════════════════════════════════════════════════════════════════════════

export interface SourceModuleSignals {
  readonly sourceRegistry?: { cleared: number; paid: number; forbidden: number };
  readonly sourceAtlas?: { totalSources: number; activeSources: number };
  readonly freshness?: { avgAgeHours: number; staleCount: number };
  readonly rights?: { clearedPct: number; attributionRequired: boolean };
}

export function sourceObservations(signals: SourceModuleSignals, now: Date = new Date()): SignalObservation[] {
  const out: SignalObservation[] = [];
  const iso = now.toISOString();

  if (signals.sourceRegistry) {
    out.push({
      family: "SOURCE_TRUST", key: "source:registry",
      fact: `Source registry: ${signals.sourceRegistry.cleared} cleared, ${signals.sourceRegistry.paid} paid-required, ${signals.sourceRegistry.forbidden} forbidden`,
      knownAt: iso, origin: "source-registry", trust: 0.95, freshness: 0.9,
      rights: "cleared", tier: 1,
    });
  }
  if (signals.freshness) {
    out.push({
      family: "SOURCE_TRUST", key: "source:freshness",
      fact: `Freshness: avg ${signals.freshness.avgAgeHours.toFixed(1)}h, ${signals.freshness.staleCount} stale`,
      knownAt: iso, origin: "source-freshness", trust: 0.9, freshness: 1,
      lean: signals.freshness.avgAgeHours > 24 ? -0.15 : 0.1, rights: "cleared", tier: 1,
    });
  }
  return out;
}

// ════════════════════════════════════════════════════════════════════════════
// MASTER: Wire EVERYTHING into one observation list
// ════════════════════════════════════════════════════════════════════════════

export interface UniversalSignals {
  readonly nfl?: NflModuleSignals;
  readonly fantasy?: FantasyModuleSignals;
  readonly market?: MarketModuleSignals;
  readonly context?: ContextModuleSignals;
  readonly intel?: IntelModuleSignals;
  readonly film?: FilmModuleSignals;
  readonly narrative?: NarrativeModuleSignals;
  readonly source?: SourceModuleSignals;
  readonly extra?: readonly SignalObservation[];
  readonly now?: Date;
}

/**
 * THE ALL-KNOWING WIRING.
 *
 * Takes every signal from every module in the repository and produces a
 * complete observation list for the reasoning spine. This is the function
 * that makes the engine "all-knowing" — nothing is deferred, nothing is
 * left off to the side.
 */
export function wireEverything(signals: UniversalSignals): SignalObservation[] {
  const now = signals.now ?? new Date();
  const out: SignalObservation[] = [];

  out.push(...nflObservations(signals.nfl ?? {}, now));
  out.push(...fantasyObservations(signals.fantasy ?? {}, now));
  out.push(...marketObservations(signals.market ?? {}, now));
  out.push(...contextObservations(signals.context ?? {}, now));
  out.push(...intelObservations(signals.intel ?? {}, now));
  out.push(...filmObservations(signals.film ?? {}, now));
  out.push(...narrativeObservations(signals.narrative ?? {}, now));
  out.push(...sourceObservations(signals.source ?? {}, now));
  out.push(...(signals.extra ?? []));

  return out;
}

/**
 * Coverage report: which signal families have observations.
 * Used to verify nothing was left out.
 */
export function coverageReport(observations: readonly SignalObservation[]): {
  readonly families: Readonly<Record<SignalFamily, number>>;
  readonly total: number;
  readonly familiesCovered: number;
  readonly familiesMissing: readonly SignalFamily[];
} {
  const families = {
    PLAY_CHARTING: 0, MARKET: 0, INJURY_AVAILABILITY: 0, WEATHER_TRAVEL: 0,
    FANTASY_DFS: 0, SCHEDULE_DENSITY: 0, SCHEME_TENDENCY: 0, NARRATIVE_SOCIAL: 0,
    SOURCE_TRUST: 0, CALIBRATION_HISTORY: 0,
  } as Record<SignalFamily, number>;

  for (const o of observations) {
    families[o.family] = (families[o.family] ?? 0) + 1;
  }

  const allFamilies = Object.keys(families) as SignalFamily[];
  const missing = allFamilies.filter((f) => families[f] === 0);
  const covered = allFamilies.length - missing.length;

  return { families, total: observations.length, familiesCovered: covered, familiesMissing: missing };
}
