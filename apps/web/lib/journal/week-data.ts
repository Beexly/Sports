import { db } from "@sports/db";

const SETTLED_RESULTS = ["WIN", "LOSS", "PUSH"] as const;
const SEED_MODEL_VERSION = "v5.0.0-seed";

export interface IsoWeekDateRange {
  readonly start: Date;
  readonly end: Date;
}

export interface JournalWeekPickEvidence {
  readonly id: string;
  readonly gameId: string;
  readonly matchup: string;
  readonly sportId: string;
  readonly leagueId: string | null;
  readonly selection: string;
  readonly pickType: string;
  readonly tier: string;
  readonly pickGrade: string;
  readonly confidence: number;
  readonly edgeScore: number;
  readonly consensusPct: number;
  readonly bookmakerCount: number;
  readonly result: typeof SETTLED_RESULTS[number];
  readonly settledAt: string;
  readonly modelVersion: string;
  readonly reasoning: string;
  readonly factorBreakdown: unknown;
  readonly signalSnapshot: {
    readonly id: string;
    readonly capturedAt: string;
    readonly eligibleForLearning: boolean;
    readonly settlementResult: string | null;
  } | null;
}

export interface JournalWeekAutopsyEvidence {
  readonly id: string;
  readonly pickId: string;
  readonly headline: string;
  readonly rootCause: string;
  readonly lessonTags: readonly string[];
  readonly whatWeLearned: string;
  readonly authoredAt: string;
  readonly modelVersion: string | null;
}

export interface JournalWeekData {
  readonly isoWeek: number;
  readonly isoYear: number;
  readonly rangeStart: string;
  readonly rangeEnd: string;
  readonly picks: readonly JournalWeekPickEvidence[];
  readonly lossAutopsies: readonly JournalWeekAutopsyEvidence[];
  readonly counts: {
    readonly settledPicks: number;
    readonly wins: number;
    readonly losses: number;
    readonly pushes: number;
    readonly publicLossAutopsies: number;
  };
}

export function getIsoWeekDateRange(isoYear: number, isoWeek: number): IsoWeekDateRange {
  const janFourth = new Date(Date.UTC(isoYear, 0, 4));
  const janFourthDay = janFourth.getUTCDay() || 7;
  const weekOneMonday = new Date(janFourth);
  weekOneMonday.setUTCDate(janFourth.getUTCDate() - janFourthDay + 1);

  const start = new Date(weekOneMonday);
  start.setUTCDate(weekOneMonday.getUTCDate() + (isoWeek - 1) * 7);
  start.setUTCHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 7);

  return { start, end };
}

export async function loadModelJournalWeekData(
  isoYear: number,
  isoWeek: number
): Promise<JournalWeekData> {
  const { start, end } = getIsoWeekDateRange(isoYear, isoWeek);

  const picks = await db.pick
    .findMany({
      where: {
        isPublished: true,
        isBootstrap: false,
        result: { in: [...SETTLED_RESULTS] },
        settledAt: {
          gte: start,
          lt: end,
        },
        NOT: { modelVersion: SEED_MODEL_VERSION },
      },
      orderBy: [{ settledAt: "asc" }, { generatedAt: "asc" }],
      select: {
        id: true,
        gameId: true,
        pickType: true,
        selection: true,
        tier: true,
        pickGrade: true,
        confidence: true,
        edgeScore: true,
        consensusPct: true,
        bookmakerCount: true,
        result: true,
        settledAt: true,
        modelVersion: true,
        reasoning: true,
        factorBreakdown: true,
        game: {
          select: {
            sportId: true,
            leagueId: true,
            homeTeamName: true,
            awayTeamName: true,
          },
        },
        signalSnapshot: {
          select: {
            id: true,
            capturedAt: true,
            eligibleForLearning: true,
            settlementResult: true,
          },
        },
      },
    })
    .catch(() => []);

  const pickIds = picks.map((pick) => pick.id);
  const lossAutopsies = pickIds.length === 0
    ? []
    : await db.lossAutopsy
      .findMany({
        where: {
          pickId: { in: pickIds },
          status: "PUBLISHED",
          isPublic: true,
        },
        orderBy: [{ authoredAt: "asc" }],
        select: {
          id: true,
          pickId: true,
          headline: true,
          rootCause: true,
          lessonTags: true,
          whatWeLearned: true,
          authoredAt: true,
          modelVersion: true,
        },
      })
      .catch(() => []);

  const evidencePicks: JournalWeekPickEvidence[] = picks
    .filter((pick) => pick.settledAt !== null && SETTLED_RESULTS.includes(pick.result as typeof SETTLED_RESULTS[number]))
    .map((pick) => ({
      id: pick.id,
      gameId: pick.gameId,
      matchup: `${pick.game.awayTeamName} @ ${pick.game.homeTeamName}`,
      sportId: pick.game.sportId,
      leagueId: pick.game.leagueId,
      selection: pick.selection,
      pickType: pick.pickType,
      tier: pick.tier,
      pickGrade: pick.pickGrade,
      confidence: pick.confidence,
      edgeScore: pick.edgeScore,
      consensusPct: pick.consensusPct,
      bookmakerCount: pick.bookmakerCount,
      result: pick.result as typeof SETTLED_RESULTS[number],
      settledAt: pick.settledAt?.toISOString() ?? "",
      modelVersion: pick.modelVersion,
      reasoning: pick.reasoning,
      factorBreakdown: pick.factorBreakdown,
      signalSnapshot: pick.signalSnapshot
        ? {
          id: pick.signalSnapshot.id,
          capturedAt: pick.signalSnapshot.capturedAt.toISOString(),
          eligibleForLearning: pick.signalSnapshot.eligibleForLearning,
          settlementResult: pick.signalSnapshot.settlementResult,
        }
        : null,
    }));

  const evidenceAutopsies: JournalWeekAutopsyEvidence[] = lossAutopsies.map((autopsy) => ({
    id: autopsy.id,
    pickId: autopsy.pickId,
    headline: autopsy.headline,
    rootCause: autopsy.rootCause,
    lessonTags: autopsy.lessonTags,
    whatWeLearned: autopsy.whatWeLearned,
    authoredAt: autopsy.authoredAt.toISOString(),
    modelVersion: autopsy.modelVersion,
  }));

  return {
    isoWeek,
    isoYear,
    rangeStart: start.toISOString(),
    rangeEnd: end.toISOString(),
    picks: evidencePicks,
    lossAutopsies: evidenceAutopsies,
    counts: {
      settledPicks: evidencePicks.length,
      wins: evidencePicks.filter((pick) => pick.result === "WIN").length,
      losses: evidencePicks.filter((pick) => pick.result === "LOSS").length,
      pushes: evidencePicks.filter((pick) => pick.result === "PUSH").length,
      publicLossAutopsies: evidenceAutopsies.length,
    },
  };
}
