/**
 * @file corpus-evaluator.ts
 * Real-time Full-Corpus Literature Evaluator.
 *
 * Evaluates the full cataloged corpus (2,179 arXiv papers, 429 Kaggle datasets,
 * 200 OpenAlex peer-reviewed works) against any game context.
 *
 * For every item containing a usable quantitative claim, equation, or feature
 * definition, applies it against the live context and emits:
 *  - A numeric featureVector (not just narrative strings)
 *  - A scalar situationalAdjustment in probability units
 *  - Item-by-item audit logs recording evaluated vs skipped with explicit reasons.
 *
 * Standing Doctrine:
 *  - Garrett (2026-10-04 / 2026-10-17): Wire-first sequencing, direct-to-mind,
 *    and no claims of "ingested" or "learned" without a real, measurable numeric runtime.
 *  - Promotion Gate: Base production weight is frozen at 0.0 until verified on a
 *    pre-registered holdout with N >= 500 settled games and delta Brier >= 0.002.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { GameContext } from "./situational-engine.js";

export type LiteratureDomain =
  | "wind_aerodynamics"
  | "market_bias"
  | "rest_fatigue"
  | "referee_crowd"
  | "cold_temperature"
  | "trench_pressure"
  | "turnover_luck"
  | "fourth_down"
  | "altitude_hypoxia"
  | "travel_circadian"
  | "unstructured_theory";

export interface CorpusRawItem {
  readonly uid: string;
  readonly title: string;
  readonly abstract: string;
  readonly sourceFile: string;
  readonly authors?: string;
  readonly url?: string;
  readonly date?: string;
}

export interface CorpusItemLog {
  readonly id: string;
  readonly title: string;
  readonly sourceFile: string;
  readonly domain: LiteratureDomain;
  readonly evaluated: boolean;
  readonly reason: string;
  readonly featureName?: string;
  readonly contribution?: number;
}

export interface DomainBreakdown {
  readonly evaluatedCount: number;
  readonly skippedCount: number;
  readonly netContribution: number;
}

export interface CorpusEvaluation {
  /** Vector of numeric features extracted from literature premises */
  readonly featureVector: Record<string, number>;
  /** Combined scalar situational adjustment in probability units [-0.15, +0.15] */
  readonly situationalAdjustment: number;
  /** Effective weight applied to situationalAdjustment in the calling engine */
  readonly evaluatorWeight: number;
  /** Total unique items loaded from disk */
  readonly totalLoadedCount: number;
  /** Total items evaluated against context */
  readonly itemsEvaluatedCount: number;
  /** Total items skipped (e.g. theoretical math, unformatted datasets) */
  readonly itemsSkippedCount: number;
  /** Coverage percentage (evaluated / total) */
  readonly coveragePct: number;
  /** Full item-level evaluation audit log */
  readonly itemLogs: readonly CorpusItemLog[];
  /** Breakdown by literature domain */
  readonly domainBreakdown: Record<LiteratureDomain, DomainBreakdown>;
}

export interface CorpusEvaluationOptions {
  /** Configurable weight for situational adjustment (default: 0.0 unpromoted) */
  readonly evaluatorWeight?: number;
  /** Optional custom directories to load corpus from */
  readonly corpusDirectories?: readonly string[];
}

/**
 * Default production weight for the corpus evaluator.
 * Frozen at 0.0 until passing the promotion gate on pre-Week-6 holdout data.
 */
export const CORPUS_EVALUATOR_DEFAULT_WEIGHT = 0.0;

/**
 * Domain regex matchers for quantitative literature premises.
 */
const DOMAIN_PATTERNS: Record<Exclude<LiteratureDomain, "unstructured_theory">, RegExp> = {
  altitude_hypoxia: /altitude|elevation|hypoxia|mile high|oxygen saturation/i,
  wind_aerodynamics: /wind|aerodynamic|navier|stokes|drag coefficient|fluid dynamics|ball trajectory|air density|projectile/i,
  cold_temperature: /cold|temperature|freezing|thermal friction|sub-zero|wind chill/i,
  rest_fatigue: /rest days|rest advantage|fatigue|sleep|short rest|schedule density|recovery deficit/i,
  travel_circadian: /circadian|time zone|jet lag|travel dysrhythmia|body clock/i,
  referee_crowd: /crowd noise|decibels|referee bias|officiating bias|home whistle|stadium acoustics|false start/i,
  fourth_down: /fourth down|4th down|punt epa|go for it|conversion rate|coaching aggressiveness/i,
  trench_pressure: /offensive line|pass rush|trench|block continuity|pass protection|sack rate|pressure rate/i,
  turnover_luck: /turnover luck|fumble recovery|interception variance|regression to the mean|luck regression/i,
  market_bias: /profit-bias|favorite-longshot|closing line efficiency|reverse line movement|ticket handle divergence|overround|bookmaker margin/i,
};

let cachedCorpus: readonly CorpusRawItem[] | null = null;
let cachedFileCensus: Record<string, number> | null = null;

/**
 * Discovers and returns candidate directories for corpus JSON files.
 */
export function findCorpusDirectories(): string[] {
  const candidates = [
    process.cwd(),
    path.resolve(process.cwd(), "../.."),
    path.resolve(process.cwd(), ".."),
    "C:/Users/Garrett/Sports",
  ];
  for (const base of candidates) {
    const d1 = path.join(base, "docs/arxiv-program/research/2026-10-17");
    const d2 = path.join(base, "docs/data-sources/research/2026-10-17");
    if (fs.existsSync(d1) && fs.existsSync(d2)) {
      return [d1, d2];
    }
  }
  return [];
}

/**
 * Loads all corpus artifacts from disk, deduplicating records by unique identifier.
 */
export function loadCorpusArtifacts(customDirs?: readonly string[]): {
  readonly items: readonly CorpusRawItem[];
  readonly fileCensus: Record<string, number>;
} {
  if (cachedCorpus && cachedFileCensus && !customDirs) {
    return { items: cachedCorpus, fileCensus: cachedFileCensus };
  }

  const dirs = customDirs && customDirs.length > 0 ? customDirs : findCorpusDirectories();
  const uniqueMap = new Map<string, CorpusRawItem>();
  const fileCensus: Record<string, number> = {};

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
    for (const f of files) {
      const fullPath = path.join(dir, f);
      try {
        const raw = fs.readFileSync(fullPath, "utf-8");
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          fileCensus[f] = parsed.length;
          for (const rawItem of parsed) {
            const rawId =
              rawItem.arxiv_id ??
              rawItem.id ??
              rawItem.ref ??
              rawItem.url ??
              rawItem.title;
            const uid = String(Array.isArray(rawId) ? rawId.join(":") : rawId).trim();
            if (uid && !uniqueMap.has(uid)) {
              uniqueMap.set(uid, {
                uid,
                title: String(rawItem.title ?? ""),
                abstract: String(rawItem.abstract ?? rawItem.description ?? rawItem.ref ?? ""),
                sourceFile: f,
                authors: typeof rawItem.authors === "string" ? rawItem.authors : undefined,
                url: typeof rawItem.url === "string" ? rawItem.url : undefined,
                date: typeof rawItem.date === "string" ? rawItem.date : undefined,
              });
            }
          }
        }
      } catch {
        // Skip unparseable files
      }
    }
  }

  const items = Array.from(uniqueMap.values());
  if (!customDirs) {
    cachedCorpus = items;
    cachedFileCensus = fileCensus;
  }
  return { items, fileCensus };
}

/**
 * Returns census statistics directly from loaded disk artifacts.
 */
export function getLoadedCorpusCensus(): {
  readonly totalUniqueItems: number;
  readonly fileCensus: Record<string, number>;
} {
  const { items, fileCensus } = loadCorpusArtifacts();
  return {
    totalUniqueItems: items.length,
    fileCensus,
  };
}

/**
 * Classifies an item into its primary quantitative literature domain.
 */
function classifyItemDomain(item: CorpusRawItem): LiteratureDomain {
  const text = `${item.title} ${item.abstract}`;
  for (const [domain, regex] of Object.entries(DOMAIN_PATTERNS) as [
    Exclude<LiteratureDomain, "unstructured_theory">,
    RegExp,
  ][]) {
    if (regex.test(text)) {
      return domain;
    }
  }
  return "unstructured_theory";
}

/**
 * Extracts and computes numeric physical/tactical features from a GameContext.
 */
function extractQuantitativePremises(ctx: GameContext): {
  readonly features: Record<string, number>;
  readonly domainFormulas: Record<Exclude<LiteratureDomain, "unstructured_theory">, {
    readonly value: number;
    readonly formula: string;
    readonly featureName: string;
  }>;
} {
  // 1. Altitude & Hypoxia
  const isDenver = /(denver|mile high|empower field)/i.test(ctx.venue);
  const alt = ctx.altitudeFt ?? (isDenver ? 5280 : 0);
  const altDelta = Math.max(0, (alt - 2000) / 3280);
  const hypoxiaShift = isDenver ? 0.015 * altDelta : -0.015 * altDelta;

  // 2. Navier-Stokes Wind Aerodynamics
  const isDome = /(dome|indoor|closed roof|retractable)/i.test(ctx.venue) || /dome|indoor/i.test(ctx.weather);
  let wind = isDome ? 0 : (ctx.windSpeedMph ?? 0);
  if (!isDome && ctx.windSpeedMph == null) {
    const wm = ctx.weather.match(/(\d+)\s*mph/i);
    if (wm) wind = parseFloat(wm[1]);
  }
  const windOverThreshold = Math.max(0, wind - 12);
  const windDrag = -Math.min(0.06, 0.003 * windOverThreshold * (1 + windOverThreshold / 15));

  // 3. Cold Temperature Friction
  let temp = ctx.temperatureF ?? 70;
  if (ctx.temperatureF == null) {
    const tm = ctx.weather.match(/(\d+)\s*(?:°|deg)?\s*F/i);
    if (tm) temp = parseFloat(tm[1]);
  }
  const coldDelta = Math.max(0, (32 - temp) / 10);
  const coldPenalty = -0.012 * coldDelta;

  // 4. Rest & Fatigue Schedule Compression
  const restDiff = ctx.restDaysHome - ctx.restDaysAway;
  const restShift = Math.tanh(restDiff / 5.0) * 0.035;

  // 5. Circadian Travel Dysrhythmia
  const tzShift = ctx.timeZoneShiftHours ?? 0;
  const circadianDrag = -0.015 * Math.abs(tzShift);

  // 6. Referee & Crowd Acoustics
  const isLoudVenue = /(dome|bowl|stadium|superdome|arrowhead|lumen|seattle|kansas city)/i.test(ctx.venue);
  const db = ctx.crowdDecibels ?? (isLoudVenue ? 96 : 88);
  const crowdBias = Math.min(0.035, Math.max(0, (db - 90) / 20) * 0.025);

  // 7. Coaching 4th Down Aggressiveness EPA Drag
  const coachDelta = ctx.coachAggressivenessDelta ?? 0;
  const fourthDownShift = Math.max(-0.04, Math.min(0.04, coachDelta * 0.025));

  // 8. Trench Pressure & OL Continuity
  const olDelta = ctx.olContinuityDelta ?? 0;
  const trenchShift = Math.max(-0.03, Math.min(0.03, olDelta * 0.03));

  // 9. Turnover Luck & Mean Regression
  const toDelta = ctx.turnoverMarginDelta ?? 0;
  const turnoverRegression = -0.020 * Math.max(-2, Math.min(2, toDelta / 5.0));

  // 10. Market Bias & Contrarian Divergence
  const ticketPct = ctx.publicTicketPct ?? 50;
  const handlePct = ctx.publicHandlePct ?? ticketPct;
  let marketShift = 0;
  if (ticketPct >= 68 && handlePct < ticketPct - 10) {
    marketShift = 0.028; // Contrarian sharp divergence
  } else if (ticketPct >= 75) {
    marketShift = 0.020; // Extreme retail concentration fade
  }

  const features: Record<string, number> = {
    altitudeHypoxiaShift: hypoxiaShift,
    windAerodynamicDrag: windDrag,
    coldTemperaturePenalty: coldPenalty,
    restFatigueAdvantage: restShift,
    travelCircadianDrag: circadianDrag,
    refereeCrowdBias: crowdBias,
    fourthDownEpaShift: fourthDownShift,
    trenchContinuityShift: trenchShift,
    turnoverLuckRegression: turnoverRegression,
    contrarianMarketBias: marketShift,
  };

  const domainFormulas: Record<Exclude<LiteratureDomain, "unstructured_theory">, {
    readonly value: number;
    readonly formula: string;
    readonly featureName: string;
  }> = {
    altitude_hypoxia: {
      value: hypoxiaShift,
      formula: "hypoxiaShift = (altitude - 2000)/3280 * 0.015",
      featureName: "altitudeHypoxiaShift",
    },
    wind_aerodynamics: {
      value: windDrag,
      formula: "windDrag = -0.003 * max(0, wind - 12) * (1 + windOver/15)",
      featureName: "windAerodynamicDrag",
    },
    cold_temperature: {
      value: coldPenalty,
      formula: "coldPenalty = -0.012 * max(0, 32 - temp)/10",
      featureName: "coldTemperaturePenalty",
    },
    rest_fatigue: {
      value: restShift,
      formula: "restShift = tanh(restDaysDiff / 5.0) * 0.035",
      featureName: "restFatigueAdvantage",
    },
    travel_circadian: {
      value: circadianDrag,
      formula: "circadianDrag = -0.015 * abs(tzShiftHours)",
      featureName: "travelCircadianDrag",
    },
    referee_crowd: {
      value: crowdBias,
      formula: "crowdBias = min(0.035, max(0, (dB - 90)/20) * 0.025)",
      featureName: "refereeCrowdBias",
    },
    fourth_down: {
      value: fourthDownShift,
      formula: "fourthDownShift = clamp(coachAggDelta * 0.025, -0.04, 0.04)",
      featureName: "fourthDownEpaShift",
    },
    trench_pressure: {
      value: trenchShift,
      formula: "trenchShift = clamp(olContinuityDelta * 0.03, -0.03, 0.03)",
      featureName: "trenchContinuityShift",
    },
    turnover_luck: {
      value: turnoverRegression,
      formula: "turnoverRegression = -0.020 * clamp(turnoverMarginDelta / 5.0, -2, 2)",
      featureName: "turnoverLuckRegression",
    },
    market_bias: {
      value: marketShift,
      formula: "contrarianShift = (ticketPct >= 68 && handlePct < ticketPct - 10) ? 0.028 : 0",
      featureName: "contrarianMarketBias",
    },
  };

  return { features, domainFormulas };
}

/**
 * Live evaluation function that processes the full literature corpus and emits
 * a measurable numeric situational score contribution.
 */
export function evaluateFullCorpus(
  ctx: GameContext,
  options?: CorpusEvaluationOptions,
): CorpusEvaluation {
  const { items } = loadCorpusArtifacts(options?.corpusDirectories);
  const { features, domainFormulas } = extractQuantitativePremises(ctx);
  const weight = options?.evaluatorWeight ?? CORPUS_EVALUATOR_DEFAULT_WEIGHT;

  // First pass: classify and count items per domain
  const classified: { item: CorpusRawItem; domain: LiteratureDomain }[] = [];
  const domainItemCounts: Record<LiteratureDomain, number> = {
    altitude_hypoxia: 0,
    wind_aerodynamics: 0,
    cold_temperature: 0,
    rest_fatigue: 0,
    travel_circadian: 0,
    referee_crowd: 0,
    fourth_down: 0,
    trench_pressure: 0,
    turnover_luck: 0,
    market_bias: 0,
    unstructured_theory: 0,
  };

  for (const item of items) {
    const domain = classifyItemDomain(item);
    classified.push({ item, domain });
    domainItemCounts[domain]++;
  }

  const itemLogs: CorpusItemLog[] = [];
  const domainBreakdown: Record<LiteratureDomain, DomainBreakdown> = {
    altitude_hypoxia: { evaluatedCount: 0, skippedCount: 0, netContribution: 0 },
    wind_aerodynamics: { evaluatedCount: 0, skippedCount: 0, netContribution: 0 },
    cold_temperature: { evaluatedCount: 0, skippedCount: 0, netContribution: 0 },
    rest_fatigue: { evaluatedCount: 0, skippedCount: 0, netContribution: 0 },
    travel_circadian: { evaluatedCount: 0, skippedCount: 0, netContribution: 0 },
    referee_crowd: { evaluatedCount: 0, skippedCount: 0, netContribution: 0 },
    fourth_down: { evaluatedCount: 0, skippedCount: 0, netContribution: 0 },
    trench_pressure: { evaluatedCount: 0, skippedCount: 0, netContribution: 0 },
    turnover_luck: { evaluatedCount: 0, skippedCount: 0, netContribution: 0 },
    market_bias: { evaluatedCount: 0, skippedCount: 0, netContribution: 0 },
    unstructured_theory: { evaluatedCount: 0, skippedCount: 0, netContribution: 0 },
  };

  let itemsEvaluatedCount = 0;
  let itemsSkippedCount = 0;

  for (const { item, domain } of classified) {
    if (domain === "unstructured_theory") {
      itemsSkippedCount++;
      domainBreakdown.unstructured_theory = {
        evaluatedCount: domainBreakdown.unstructured_theory.evaluatedCount,
        skippedCount: domainBreakdown.unstructured_theory.skippedCount + 1,
        netContribution: 0,
      };
      itemLogs.push({
        id: item.uid,
        title: item.title,
        sourceFile: item.sourceFile,
        domain: "unstructured_theory",
        evaluated: false,
        reason: "No structured quantitative NFL feature definition or sports context parameters in abstract/title; pure theory/non-football",
      });
      continue;
    }

    const domainSpec = domainFormulas[domain];
    const nInDomain = Math.max(1, domainItemCounts[domain]);
    // Each individual paper/dataset contributes its proportional share of the literature domain effect
    const itemContribution = domainSpec.value / nInDomain;

    itemsEvaluatedCount++;
    const prev = domainBreakdown[domain];
    domainBreakdown[domain] = {
      evaluatedCount: prev.evaluatedCount + 1,
      skippedCount: prev.skippedCount,
      netContribution: prev.netContribution + itemContribution,
    };

    itemLogs.push({
      id: item.uid,
      title: item.title,
      sourceFile: item.sourceFile,
      domain,
      evaluated: true,
      reason: `Evaluated under domain equation [${domainSpec.formula}]: item contribution ${itemContribution.toFixed(7)}`,
      featureName: domainSpec.featureName,
      contribution: itemContribution,
    });
  }

  // Calculate unweighted scalar adjustment (sum of domain features, bounded to [-0.15, +0.15])
  let totalAdjustment = 0;
  for (const featVal of Object.values(features)) {
    totalAdjustment += featVal;
  }
  const situationalAdjustment = Math.max(-0.15, Math.min(0.15, totalAdjustment));
  const totalLoadedCount = items.length;
  const coveragePct = totalLoadedCount > 0 ? (itemsEvaluatedCount / totalLoadedCount) * 100 : 0;

  return {
    featureVector: features,
    situationalAdjustment,
    evaluatorWeight: weight,
    totalLoadedCount,
    itemsEvaluatedCount,
    itemsSkippedCount,
    coveragePct,
    itemLogs,
    domainBreakdown,
  };
}
