import { round, rankAverage } from "./numeric.js";
import { computeFeatureSchemaHash, type ExpectedMetricProvenance } from "./types.js";
import { isSuccessfulPlay, type SuccessPlay } from "./success-rate.js";

export const PASS_DEFENSE_FRAGILITY_VERSION = "gse-pass-def-fragility-v1";

const FRAGILITY_FEATURE_KEYS = [
  "epa", "success", "yards_per_attempt", "completion_percent",
  "passer_rating", "pass_td_rate", "int_rate"
] as const;

export interface FragilityPassPlay {
  readonly playId: string;
  readonly gameId: string;
  readonly week: number;
  readonly defteam: string;
  readonly epa: number | null;
  readonly successPlay: SuccessPlay | null;
  readonly sack: 0 | 1;
  readonly qbSpike: 0 | 1;
  readonly completePass: 0 | 1;
  readonly passingYards: number | null;
  readonly passTouchdown: 0 | 1;
  readonly interception: 0 | 1;
}

export type FragilityWindowType = "season-to-date" | "last-4" | "last-8";

export interface PassDefenseFragilityProfile {
  readonly defteam: string;
  readonly targetWeek: number;
  readonly targetGameId: string;
  readonly windowType: FragilityWindowType;

  readonly distinctGames: number;
  readonly dropbacks: number;
  readonly attempts: number;
  readonly completions: number;
  readonly passingYards: number;
  readonly passTds: number;
  readonly ints: number;
  readonly epaExcludedDropbacks: number;

  readonly epaPerDropback: number | null;
  readonly successRate: number | null;
  readonly yardsPerAttempt: number | null;
  readonly completionPercent: number | null;
  readonly passerRating: number | null;
  readonly passTdRate: number | null;
  readonly intRate: number | null;

  readonly epaPerDropbackPercentile: number | null;
  readonly successRatePercentile: number | null;
  readonly yardsPerAttemptPercentile: number | null;
  readonly completionPercentPercentile: number | null;
  readonly passerRatingPercentile: number | null;
  readonly passTdRatePercentile: number | null;
  readonly intRatePercentile: number | null;

  readonly compositeFragility: number | null;

  readonly provenance: ExpectedMetricProvenance;
}

function computeRawStats(plays: readonly FragilityPassPlay[]) {
  const distinctGamesSet = new Set<string>();
  let dropbacks = 0;
  let attempts = 0;
  let completions = 0;
  let passingYards = 0;
  let passTds = 0;
  let ints = 0;

  let epaSum = 0;
  let epaExcludedDropbacks = 0;

  let successRatable = 0;
  let successes = 0;

  for (const play of plays) {
    distinctGamesSet.add(play.gameId);
    dropbacks++;

    const isSack = play.sack === 1;
    const isSpike = play.qbSpike === 1;
    if (!isSack && !isSpike) {
      attempts++;
      if (play.completePass === 1) {
        completions++;
      }
      // Documented: missing passing yards on a completion count as 0
      passingYards += play.passingYards ?? 0;
      if (play.passTouchdown === 1) passTds++;
      if (play.interception === 1) ints++;
    }

    if (play.epa !== null && Number.isFinite(play.epa)) {
      epaSum += play.epa;
    } else {
      epaExcludedDropbacks++;
    }

    if (play.successPlay !== null) {
      const isSucc = isSuccessfulPlay(play.successPlay);
      if (isSucc !== null) {
        successRatable++;
        if (isSucc) successes++;
      }
    }
  }

  const distinctGames = distinctGamesSet.size;

  let epaPerDropback: number | null = null;
  const epaIncluded = dropbacks - epaExcludedDropbacks;
  if (epaIncluded > 0) {
    epaPerDropback = round(epaSum / epaIncluded, 4);
  }

  let successRate: number | null = null;
  if (successRatable > 0) {
    successRate = round(successes / successRatable, 4);
  }

  let yardsPerAttempt: number | null = null;
  let completionPercent: number | null = null;
  let passerRating: number | null = null;
  let passTdRate: number | null = null;
  let intRate: number | null = null;

  if (attempts > 0) {
    yardsPerAttempt = round(passingYards / attempts, 4);
    completionPercent = round(completions / attempts, 4);
    passTdRate = round(passTds / attempts, 4);
    intRate = round(ints / attempts, 4);

    const a = Math.max(0, Math.min(2.375, ((completions / attempts) - 0.3) * 5));
    const b = Math.max(0, Math.min(2.375, ((passingYards / attempts) - 3) * 0.25));
    const c = Math.max(0, Math.min(2.375, (passTds / attempts) * 20));
    const d = Math.max(0, Math.min(2.375, 2.375 - ((ints / attempts) * 25)));
    passerRating = Math.min(158.3, round(((a + b + c + d) / 6) * 100, 4));
  }

  return {
    distinctGames,
    dropbacks,
    attempts,
    completions,
    passingYards,
    passTds,
    ints,
    epaExcludedDropbacks,
    epaPerDropback,
    successRate,
    yardsPerAttempt,
    completionPercent,
    passerRating,
    passTdRate,
    intRate,
  };
}

interface WindowData {
  defteam: string;
  targetWeek: number;
  targetGameId: string;
  windowType: FragilityWindowType;
  stats: ReturnType<typeof computeRawStats>;
}

export function computePassDefenseFragility(
  plays: readonly FragilityPassPlay[]
): PassDefenseFragilityProfile[] {
  const playsByTeam = new Map<string, Map<string, FragilityPassPlay[]>>();
  const gameWeek = new Map<string, number>();

  for (const p of plays) {
    if (!playsByTeam.has(p.defteam)) {
      playsByTeam.set(p.defteam, new Map());
    }
    const teamGames = playsByTeam.get(p.defteam)!;
    if (!teamGames.has(p.gameId)) {
      teamGames.set(p.gameId, []);
    }
    teamGames.get(p.gameId)!.push(p);
    gameWeek.set(p.gameId, p.week);
  }

  const orderedGamesByTeam = new Map<string, string[]>();
  for (const [team, teamGames] of playsByTeam.entries()) {
    const games = Array.from(teamGames.keys());
    games.sort((a, b) => {
      const wA = gameWeek.get(a)!;
      const wB = gameWeek.get(b)!;
      if (wA !== wB) return wA - wB;
      return a < b ? -1 : a > b ? 1 : 0;
    });
    orderedGamesByTeam.set(team, games);
  }

  const allWindows: WindowData[] = [];

  for (const [team, games] of orderedGamesByTeam.entries()) {
    for (let i = 0; i < games.length; i++) {
      const targetGameId = games[i]!;
      const targetWeek = gameWeek.get(targetGameId)!;

      const teamGames = playsByTeam.get(team)!;
      const s2dPlays = games.slice(0, i + 1).flatMap(g => teamGames.get(g)!);
      const last4Plays = games.slice(Math.max(0, i + 1 - 4), i + 1).flatMap(g => teamGames.get(g)!);
      const last8Plays = games.slice(Math.max(0, i + 1 - 8), i + 1).flatMap(g => teamGames.get(g)!);

      allWindows.push({
        defteam: team, targetWeek, targetGameId, windowType: "season-to-date",
        stats: computeRawStats(s2dPlays)
      });
      allWindows.push({
        defteam: team, targetWeek, targetGameId, windowType: "last-4",
        stats: computeRawStats(last4Plays)
      });
      allWindows.push({
        defteam: team, targetWeek, targetGameId, windowType: "last-8",
        stats: computeRawStats(last8Plays)
      });
    }
  }

  const windowsByKey = new Map<string, WindowData[]>();
  for (const w of allWindows) {
    const key = `${w.targetWeek}:${w.windowType}`;
    if (!windowsByKey.has(key)) windowsByKey.set(key, []);
    windowsByKey.get(key)!.push(w);
  }

  const profiles: PassDefenseFragilityProfile[] = [];
  const provenance: ExpectedMetricProvenance = {
    modelVersion: PASS_DEFENSE_FRAGILITY_VERSION,
    method: "deterministic-rule",
    featureKeys: [...FRAGILITY_FEATURE_KEYS],
    featureSchemaHash: computeFeatureSchemaHash(FRAGILITY_FEATURE_KEYS),
    sampleSize: plays.length,
  };

  for (const [_, windows] of windowsByKey.entries()) {
    const eligible = windows.filter(w => w.stats.distinctGames >= 3 && w.stats.dropbacks >= 50);

    const rankAxis = (axisFn: (w: WindowData) => number | null, invert: boolean) => {
      const valid = eligible.map(w => ({ w, val: axisFn(w) })).filter(v => v.val !== null) as { w: WindowData, val: number }[];

      const values = valid.map(v => invert ? -v.val : v.val);
      const ranks = rankAverage(values);
      const n = valid.length;

      const percentiles = new Map<WindowData, number>();
      for (let i = 0; i < valid.length; i++) {
        const rank = ranks[i]!;
        const pct = n > 1 ? (rank - 1) / (n - 1) : 0;
        percentiles.set(valid[i]!.w, round(pct, 4));
      }
      return percentiles;
    };

    const pctEpa = rankAxis(w => w.stats.epaPerDropback, false);
    const pctSucc = rankAxis(w => w.stats.successRate, false);
    const pctYpa = rankAxis(w => w.stats.yardsPerAttempt, false);
    const pctComp = rankAxis(w => w.stats.completionPercent, false);
    const pctRtg = rankAxis(w => w.stats.passerRating, false);
    const pctTd = rankAxis(w => w.stats.passTdRate, false);
    const pctInt = rankAxis(w => w.stats.intRate, true);

    for (const w of windows) {
      const isEligible = w.stats.distinctGames >= 3 && w.stats.dropbacks >= 50;

      let pEpa: number | null = null;
      let pSucc: number | null = null;
      let pYpa: number | null = null;
      let pComp: number | null = null;
      let pRtg: number | null = null;
      let pTd: number | null = null;
      let pInt: number | null = null;
      let composite: number | null = null;

      if (isEligible) {
        pEpa = pctEpa.get(w) ?? null;
        pSucc = pctSucc.get(w) ?? null;
        pYpa = pctYpa.get(w) ?? null;
        pComp = pctComp.get(w) ?? null;
        pRtg = pctRtg.get(w) ?? null;
        pTd = pctTd.get(w) ?? null;
        pInt = pctInt.get(w) ?? null;

        const pcts = [pEpa, pSucc, pYpa, pComp, pRtg, pTd, pInt].filter(x => x !== null) as number[];
        if (pcts.length > 0) {
          composite = round(pcts.reduce((a, b) => a + b, 0) / pcts.length, 4);
        }
      }

      profiles.push({
        defteam: w.defteam,
        targetWeek: w.targetWeek,
        targetGameId: w.targetGameId,
        windowType: w.windowType,

        distinctGames: w.stats.distinctGames,
        dropbacks: w.stats.dropbacks,
        attempts: w.stats.attempts,
        completions: w.stats.completions,
        passingYards: w.stats.passingYards,
        passTds: w.stats.passTds,
        ints: w.stats.ints,
        epaExcludedDropbacks: w.stats.epaExcludedDropbacks,

        epaPerDropback: isEligible ? w.stats.epaPerDropback : null,
        successRate: isEligible ? w.stats.successRate : null,
        yardsPerAttempt: isEligible ? w.stats.yardsPerAttempt : null,
        completionPercent: isEligible ? w.stats.completionPercent : null,
        passerRating: isEligible ? w.stats.passerRating : null,
        passTdRate: isEligible ? w.stats.passTdRate : null,
        intRate: isEligible ? w.stats.intRate : null,

        epaPerDropbackPercentile: pEpa,
        successRatePercentile: pSucc,
        yardsPerAttemptPercentile: pYpa,
        completionPercentPercentile: pComp,
        passerRatingPercentile: pRtg,
        passTdRatePercentile: pTd,
        intRatePercentile: pInt,
        compositeFragility: composite,

        provenance,
      });
    }
  }

  profiles.sort((a, b) => {
    if (a.targetWeek !== b.targetWeek) return a.targetWeek - b.targetWeek;
    if (a.defteam !== b.defteam) return a.defteam < b.defteam ? -1 : 1;
    if (a.targetGameId !== b.targetGameId) return a.targetGameId < b.targetGameId ? -1 : 1;
    return a.windowType < b.windowType ? -1 : a.windowType > b.windowType ? 1 : 0;
  });

  return profiles;
}
