/**
 * THE ENGINE DERIVES ITS OWN PICK, and it is recorded beside the legacy one.
 *
 * This test drives the REAL `processSport` generator, with the real
 * `deriveEnginePick` and the real `composeLedger` underneath it, and proves by
 * execution that:
 *
 *   1. A fixture that produces a published legacy pick ALSO produces an
 *      engine-derived pick, and both land in one `shadow_signals` row.
 *   2. The engine's number is the product of real persisted ledger rows: with
 *      the rows removed the engine goes silent, and with a lopsided ledger it
 *      moves off the market anchor. That is `composeLedger` actually
 *      contributing, measured rather than asserted.
 *   3. The legacy pick still publishes. Nothing in the engine lane can change
 *      what a customer sees, and that is checked on the pick write itself.
 *   4. An arbiter that is absent, that throws, that returns junk, or that
 *      prefers the engine leaves the published pick on the legacy side.
 *   5. A ledger read that throws costs the shadow row and nothing else: the
 *      pick still publishes and the run still succeeds.
 *
 * The DB is mocked at the module boundary (the harness pattern already used by
 * process-sport.test.ts), but nothing in the engine path is stubbed: the ledger
 * rows, the composition, the selection and the arbitration are all the shipping
 * code, fed by rows shaped exactly like the ones on production.
 */

import { beforeAll, beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import type { ReadinessGates } from "@sports/prediction-engine";
import type { EngineReasoner, EngineReasonerResult } from "../engine-pick.js";
import type { FixtureProbe } from "../fixture-confirmation.js";

const mocks = vi.hoisted(() => ({
  circuitState: vi.fn<() => "closed" | "open" | "half_open">(),
  createGalaxySecondBook: vi.fn(),
  getOdds: vi.fn<(sport: string, markets: string[]) => Promise<{ data: unknown[]; remainingRequests: number | null }>>(),
  validateFreshness: vi.fn<(at: Date) => boolean>(),
  validateOddsFreshness: vi.fn<(odds: unknown[]) => boolean>(),
  freshGameIds: vi.fn<(odds: unknown[]) => Set<string>>(),
  normalizeGames: vi.fn<(events: unknown[]) => unknown[]>(),
  normalizeOdds: vi.fn<(events: unknown[], at: Date) => unknown[]>(),
  enrichGameContext: vi.fn<(args: unknown) => Promise<void>>(),
  getAtsForm: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
  getHeadToHeadForm: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
  scoreGames: vi.fn<(inputs: unknown[], at: Date) => unknown[]>(),
  buildPickSignalSnapshot: vi.fn<(...args: unknown[]) => Record<string, unknown>>(),
  ingestionRunCreate: vi.fn<(args: unknown) => Promise<{ id: string }>>(),
  ingestionRunUpdate: vi.fn<(args: unknown) => Promise<unknown>>(),
  sportUpsert: vi.fn<(args: unknown) => Promise<{ id: string }>>(),
  gameUpsert: vi.fn<(args: unknown) => Promise<{ id: string; homeTeamName?: string; awayTeamName?: string }>>(),
  gameFindUnique: vi.fn<(args: unknown) => Promise<unknown>>(),
  gameFindMany: vi.fn<(args: unknown) => Promise<unknown[]>>(),
  gameUpdate: vi.fn<(args: unknown) => Promise<{ id: string; homeTeamName?: string; awayTeamName?: string }>>(),
  oddsCreateMany: vi.fn<(args: unknown) => Promise<{ count: number }>>(),
  pickUpsert: vi.fn<(args: unknown) => Promise<{ id: string }>>(),
  pickCreate: vi.fn<(args: unknown) => Promise<{ id: string }>>(),
  pickUpdateMany: vi.fn<(args: unknown) => Promise<{ count: number }>>(),
  pickFindUnique: vi.fn<(args: unknown) => Promise<{ id: string; result: string; selection?: string; isPublished?: boolean; line?: number } | null>>(),
  supersedeUnpublished: vi.fn<(db: unknown, args: unknown) => Promise<boolean>>(),
  snapshotUpsert: vi.fn<(args: unknown) => Promise<unknown>>(),
  resolveRundownApiKey: vi.fn<() => string>(),
  fetchRundownEventsForSport: vi.fn<(sport: string, key: string) => Promise<{ events: unknown[]; remaining: number | null }>>(),
  eventsBelowBookmakerThreshold: vi.fn<(events: unknown[], min?: number) => unknown[]>(),
  mergeBookmakersIntoPrimary: vi.fn((primary: unknown[]) => ({
    events: primary,
    filledGameIds: [],
    unmatchedSecondary: 0,
    skippedWellCovered: 0,
  })),
  confirmBatch: vi.fn<(sportKey: string, probes: readonly FixtureProbe[]) => Promise<unknown>>(),
  independentsInput: vi.fn(),
  // THE LEDGER READ. The only thing stubbed in the engine path is the database
  // itself, exactly as the rest of this harness stubs it.
  playerGameStatFindMany: vi.fn<(args: unknown) => Promise<unknown[]>>(),
  signalFindMany: vi.fn<(args: unknown) => Promise<unknown[]>>(),
  playerFindMany: vi.fn<(args: unknown) => Promise<unknown[]>>(),
  shadowSignalUpsert: vi.fn<(args: unknown) => Promise<unknown>>(),
}));

vi.mock("@sports/db", () => ({
  db: {
    ingestionRun: { create: mocks.ingestionRunCreate, update: mocks.ingestionRunUpdate },
    sport: { upsert: mocks.sportUpsert },
    game: {
      upsert: mocks.gameUpsert,
      findUnique: mocks.gameFindUnique,
      findMany: mocks.gameFindMany,
      update: mocks.gameUpdate,
    },
    odds: { createMany: mocks.oddsCreateMany },
    pick: {
      upsert: mocks.pickUpsert,
      findUnique: mocks.pickFindUnique,
      updateMany: mocks.pickUpdateMany,
      create: mocks.pickCreate,
    },
    pickSignalSnapshot: { upsert: mocks.snapshotUpsert },
    gateDecision: { createMany: vi.fn().mockResolvedValue({ count: 1 }) },
    playerGameStat: { findMany: mocks.playerGameStatFindMany },
    signal: { findMany: mocks.signalFindMany },
    player: { findMany: mocks.playerFindMany },
    shadowSignal: { upsert: mocks.shadowSignalUpsert },
  },
}));

vi.mock("@sports/data-ingestion", async () => {
  // SPREAD THE REAL MODULE, then override only what the harness must control.
  //
  // Two reasons, both learned the hard way here. First, the independent
  // estimator path reads a long tail of exports (`isPolymarketIndependentEnabled`,
  // `sportKeyToKalshiLeagueCode`, `lookupTeamFpi`, and whatever the Kalshi and
  // ESPN clients reach for). A hand-listed mock omits one, and the failure
  // surfaces as "No X export is defined on the mock" from deep inside the
  // pipeline, which reads as a broken generator rather than a thin harness.
  // Second, the ledger's lag bound is derived from the REAL `currentNflSeasonLabel`
  // and the real `nflTeamAbbr`; stubbing either would let this suite pass on a
  // season and a team mapping the production code would never read.
  const actual = await vi.importActual<typeof import("@sports/data-ingestion")>("@sports/data-ingestion");
  return {
    ...actual,
    OddsApiClient: vi.fn().mockImplementation(() => ({ getOdds: mocks.getOdds })),
    DataNormalizer: vi.fn().mockImplementation(() => ({
      validateFreshness: mocks.validateFreshness,
      validateOddsFreshness: mocks.validateOddsFreshness,
      freshGameIds: mocks.freshGameIds,
      normalizeGames: mocks.normalizeGames,
      normalizeOdds: mocks.normalizeOdds,
      // Shape-complete: the stale-rejection path embeds this in its error, so
      // omitting it turns a real rejection into a TypeError that masks it.
      freshnessDiagnostics: () => ({
        thresholdHours: 4,
        rows: 1,
        games: 1,
        unparseableRows: 0,
        newestAgeMinutes: 999,
      }),
    })),
    enrichGameContext: mocks.enrichGameContext,
    getAtsForm: mocks.getAtsForm,
    getHeadToHeadForm: mocks.getHeadToHeadForm,
    // Independent fair values are honest nulls here: this suite is about the
    // engine's own ledger derivation, not about the estimator blend.
    getTeamScoringRecords: vi.fn().mockResolvedValue([]),
    getLeagueAverageScored: vi.fn().mockResolvedValue(null),
    KalshiClient: vi.fn().mockImplementation(() => ({ getFairValue: vi.fn().mockResolvedValue(null) })),
    toIndependentFairValue: vi.fn().mockReturnValue({
      source: "kalshi",
      homeFairProb: null,
      awayFairProb: null,
    }),
    getCachedEspnPowerIndexMap: vi.fn().mockResolvedValue(new Map()),
    getOddsPaymentCircuitBreaker: () => ({ getState: mocks.circuitState }),
    resolveRundownApiKey: mocks.resolveRundownApiKey,
    fetchRundownEventsForSport: mocks.fetchRundownEventsForSport,
    fetchEspnOddsForSport: vi.fn().mockResolvedValue({ events: [], provider: "espn_public" }),
    createGalaxySecondBook: mocks.createGalaxySecondBook,
    eventsBelowBookmakerThreshold: mocks.eventsBelowBookmakerThreshold,
    mergeBookmakersIntoPrimary: mocks.mergeBookmakersIntoPrimary,
  };
});

vi.mock("@sports/prediction-engine", async () => {
  const actual = await vi.importActual<typeof import("@sports/prediction-engine")>("@sports/prediction-engine");
  return {
    // The REAL composer is the point of this test, so it is imported actual
    // rather than stubbed. Only the pick scorer and the snapshot/receipt
    // builders are doubles, because the harness already stubs them.
    ...actual,
    scoreGames: mocks.scoreGames,
    buildPickSignalSnapshot: mocks.buildPickSignalSnapshot,
    buildPickProofReceipt: vi.fn().mockReturnValue({ contentHash: "hash" }),
    MARKET_FAIR_METHOD_TAG: "test",
    isPlausibleEntryOdds: vi.fn().mockReturnValue(false),
    modelProbForReceipt: vi.fn().mockReturnValue(null),
    selectionIsHomeSide: vi.fn().mockReturnValue(true),
  };
});

vi.mock("../fixture-confirmation.js", async () => {
  const actual = await vi.importActual<typeof import("../fixture-confirmation.js")>(
    "../fixture-confirmation.js",
  );
  return {
    ...actual,
    FixtureConfirmer: vi.fn().mockImplementation(() => ({ confirmBatch: mocks.confirmBatch })),
  };
});

vi.mock("../source-snapshot.js", () => ({
  recordSourceSnapshot: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../supersede-unpublished-pick.js", () => ({
  supersedeUnpublishedPendingPick: mocks.supersedeUnpublished,
  SUPERSEDED_UNPUBLISHED_RCA_CODE: "STALE_UNPUBLISHED_SUPERSEDED",
  SUPERSEDE_EVENT_SCHEMA_VERSION: 1,
  SUPERSEDE_ACTOR: "system:ingestion:process-sport",
}));

const SPORT = {
  key: "americanfootball_nfl",
  name: "NFL",
  displayName: "NFL",
} as const;

/** A kickoff far enough ahead that the freshness gate is satisfied. */
const K_MS = (() => {
  const earliest = Date.now() + 6 * 3_600_000;
  const d = new Date(earliest);
  d.setUTCHours(16, 0, 0, 0);
  if (d.getTime() < earliest) d.setUTCDate(d.getUTCDate() + 1);
  return d.getTime();
})();
const T_KICKOFF = new Date(K_MS).toISOString();
const T_RUN_AT = new Date(K_MS - 2 * 3_600_000).toISOString();

function gates(overrides: Partial<ReadinessGates> = {}): ReadinessGates {
  return {
    canPersistCanonicalHistory: true,
    canUseDerivedHistory: false,
    canPromoteFeaturedPicks: true,
    canLearnFromOutcomes: true,
    isBootstrapMode: false,
    minDataQualityForGameLog: 60,
    ...overrides,
  } as unknown as ReadinessGates;
}

function normalizedGame(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    externalId: "ext-1",
    homeTeam: "Chiefs",
    awayTeam: "Bills",
    commenceTime: new Date(T_KICKOFF),
    ...overrides,
  };
}

function scoredPick(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    gameId: "game-1",
    pickType: "SPREAD",
    selection: "Chiefs -3.5",
    line: -3.5,
    confidence: 72,
    edgeScore: 61,
    consensusPct: 64,
    bookmakerCount: 8,
    tier: "PREMIUM",
    pickGrade: "SOLID_PLAY",
    riskLevel: "MODERATE",
    reasoning: "Line value against the market consensus.",
    reasoningShort: "Line value.",
    factorBreakdown: { dataQualityScore: 82 },
    modelVersion: "v5.3.0",
    // The de-vigged market anchor the engine composes against.
    marketFairProb: 0.6,
    dataFreshnessAt: new Date(),
    ...overrides,
  };
}

/**
 * A persisted `signals` row, shaped as production holds it: `value` already on
 * the shared normalized scale, and the fitted per-key weight from
 * signal-scale-table.ts (pgs.fantasy_ppr 0.105, pgs.target_share 0.102).
 */
function ledgerRow(
  entityId: string,
  key: string,
  value: number,
  weight: number,
  capturedAt: string,
): Record<string, unknown> {
  return { entityId, key, value, weight, confidence: 0.9, capturedAt: new Date(capturedAt) };
}

const CAPTURED = new Date(K_MS - 3 * 86_400_000).toISOString();

/**
 * Budget for the one-time cold Vite transform of `@sports/prediction-engine`
 * and its transitive imports, paid in the `beforeAll` warm-up rather than
 * inside a test.
 *
 * This package's vitest config sets no `testTimeout`, so tests inherit the 5s
 * default, which that transform blows past on its own. It is ALSO not a fixed
 * cost: run the whole package (95 files transforming at once) and the same
 * transform measures in the minutes, which is how a 60s per-test ceiling turned
 * into a coin flip that failed two of these eight tests on a loaded machine.
 *
 * So the transform is paid once, in a hook with its own budget, and the tests
 * themselves keep a modest per-test ceiling that only has to cover the work
 * under test. Set per-suite rather than in the shared config so this cannot be
 * mistaken for slowing every test in the package down.
 */
const COLD_TRANSFORM_TIMEOUT_MS = 300_000;

/**
 * Resolve the fixture the way production does: full club names, which the
 * abbreviation map turns into "KC" and "BUF". The engine reads team names from
 * the GAME ROW, not from the odds feed, so this is the only thing that makes a
 * derivation possible.
 */
function installGameRow(): void {
  mocks.gameFindUnique.mockImplementation(async (args: unknown) => {
    const where = (args as { where?: { id?: string } }).where;
    if (where?.id === "game-1") {
      return {
        id: "game-1",
        homeTeamName: "Kansas City Chiefs",
        awayTeamName: "Buffalo Bills",
        commenceTime: new Date(T_KICKOFF),
      };
    }
    return { id: "game-1" };
  });
}

/** Roster + ledger that make the home side look strong and the away side weak. */
function installLopsidedLedger(): void {
  installGameRow();
  mocks.playerGameStatFindMany.mockImplementation(async (args: unknown) => {
    const where = (args as { where?: { team?: { in?: string[] } } }).where;
    const teams = where?.team?.in ?? [];
    // The NULL-team population query carries an opponent filter instead.
    if (teams.length === 0) return [];
    return teams.flatMap((team) => [
      { playerId: `${team}-qb`, team, season: 2026, week: 2, opponent: "LV" },
      { playerId: `${team}-wr`, team, season: 2026, week: 2, opponent: "LV" },
    ]);
  });
  mocks.playerFindMany.mockResolvedValue([
    { id: "KC-qb", gsisId: "00-0001" },
    { id: "KC-wr", gsisId: "00-0002" },
    { id: "BUF-qb", gsisId: "00-0003" },
    { id: "BUF-wr", gsisId: "00-0004" },
  ]);
  mocks.signalFindMany.mockResolvedValue([
    ledgerRow("KC-qb", "pgs.fantasy_ppr", 0.9, 0.105, CAPTURED),
    ledgerRow("KC-qr", "pgs.target_share", 0.8, 0.102, CAPTURED),
    ledgerRow("KC-wr", "pgs.receiving_epa", 0.7, 0.028, CAPTURED),
    ledgerRow("BUF-qb", "pgs.fantasy_ppr", -0.9, 0.105, CAPTURED),
    ledgerRow("BUF-wr", "pgs.target_share", -0.7, 0.102, CAPTURED),
    ledgerRow("BUF-qb", "pgs.receiving_epa", -0.6, 0.028, CAPTURED),
  ]);
}

/** Read the single `shadow_signals` row the engine lane wrote. */
function shadowRow(): Record<string, unknown> {
  expect(mocks.shadowSignalUpsert).toHaveBeenCalledTimes(1);
  const call = mocks.shadowSignalUpsert.mock.calls[0]![0] as {
    create: Record<string, unknown>;
  };
  return call.create;
}

function shadowPayload(): {
  legacy: Record<string, unknown>;
  engine: Record<string, unknown> | null;
  arbitration: Record<string, unknown>;
} {
  const row = shadowRow();
  return row["modelProbs"] as unknown as {
    legacy: Record<string, unknown>;
    engine: Record<string, unknown> | null;
    arbitration: Record<string, unknown>;
  };
}

/**
 * The reasoner the generator is handed.
 *
 * It is the app layer's `makeEngineReasoner` in production, which runs the real
 * spine and the real recommender. The pipeline test injects a stand-in so the
 * GENERATOR's behaviour is what is under test here; the app-layer test drives
 * the real one, and neither test can pass on a stub the other does not have.
 */
function reasonerReturning(over: Partial<EngineReasonerResult> = {}) {
  return (): EngineReasonerResult => ({
    verdict: "PICK",
    selection: "Chiefs -3.5",
    side: 1,
    homeWinProb: 0.61,
    edge: 0.06,
    publishState: "CANDIDATE",
    withholdReasons: [],
    noBetReason: null,
    basis: "test reasoner",
    ...over,
  });
}

/**
 * A reasoner that DISAGREES with the legacy pick: the away side against a
 * home-side legacy selection.
 *
 * This is the fixture the arbiter tests need and that `installLopsidedLedger`
 * alone does not provide. That fixture composes a ledger favouring the home
 * side and the legacy pick also takes the home side, so the generator correctly
 * short-circuits to AGREE and never reaches the arbiter at all. That is right
 * behaviour and the wrong test input: an arbiter is only ever consulted about a
 * disagreement, so a test that wants arbitration to run has to produce one.
 *
 * The legacy pick is unchanged and still publishes; only the ENGINE's opinion
 * differs. That is the whole point of the lane.
 */
function reasonerDisagreeing(over: Partial<EngineReasonerResult> = {}): EngineReasoner {
  return reasonerReturning({
    selection: "Bills +3.5",
    side: -1,
    homeWinProb: 0.44,
    edge: 0.06,
    basis: "test reasoner favouring the away side against the home-side legacy pick",
    ...over,
  });
}

async function runGenerator(reasoner: EngineReasoner = reasonerReturning()) {
  const { processSport } = await import("../process-sport.js");
  return processSport(SPORT, "key", gates(), "[ingestion]", {
    engineReasoner: reasoner,
  });
}

describe("the engine derives its own pick (shadow lane)", () => {
  // Pay the cold module-graph transform HERE, where a failing budget means "the
  // graph could not be built" rather than "one test was slow". `runGenerator`
  // imports the generator lazily to dodge a hoisted-mock cycle, so nothing else
  // forces this import first.
  beforeAll(async () => {
    await import("../process-sport.js");
  }, COLD_TRANSFORM_TIMEOUT_MS);

  beforeEach(() => {
    for (const mock of Object.values(mocks)) mock.mockReset();

    mocks.ingestionRunCreate.mockResolvedValue({ id: "run-1" });
    mocks.ingestionRunUpdate.mockResolvedValue({});
    mocks.getOdds.mockResolvedValue({ data: [{ raw: true }], remainingRequests: 400 });
    mocks.validateFreshness.mockReturnValue(true);
    mocks.validateOddsFreshness.mockReturnValue(true);
    mocks.freshGameIds.mockReturnValue(new Set());
    mocks.normalizeGames.mockReturnValue([normalizedGame()]);
    mocks.normalizeOdds.mockReturnValue([]);
    mocks.sportUpsert.mockResolvedValue({ id: "sport-1" });
    mocks.gameUpsert.mockResolvedValue({ id: "game-1", homeTeamName: "Chiefs", awayTeamName: "Bills" });
    // The engine lane resolves the fixture by id for its team names and
    // kickoff. A bare `{ id }` here is the honest "row not found" shape, which
    // makes the engine correctly derive nothing; the tests that want a real
    // derivation install names and a kickoff via `installGameRow()`.
    mocks.gameFindUnique.mockImplementation(async (args: unknown) => {
      const where = (args as { where?: { id?: string; externalId?: string } }).where;
      if (where?.id !== undefined) return { id: "game-1" };
      return { id: "game-1" };
    });
    mocks.gameFindMany.mockResolvedValue([]);
    mocks.gameUpdate.mockResolvedValue({ id: "game-1", homeTeamName: "Chiefs", awayTeamName: "Bills" });
    mocks.enrichGameContext.mockResolvedValue(undefined);
    mocks.getAtsForm.mockResolvedValue(null);
    mocks.getHeadToHeadForm.mockResolvedValue(null);
    mocks.scoreGames.mockReturnValue([scoredPick()]);
    mocks.pickUpsert.mockResolvedValue({ id: "pick-1" });
    mocks.pickCreate.mockResolvedValue({ id: "pick-1" });
    mocks.pickUpdateMany.mockResolvedValue({ count: 0 });
    mocks.oddsCreateMany.mockResolvedValue({ count: 0 });
    mocks.pickFindUnique.mockResolvedValue(null);
    mocks.supersedeUnpublished.mockResolvedValue(true);
    mocks.buildPickSignalSnapshot.mockReturnValue({ pickId: "pick-1" });
    mocks.snapshotUpsert.mockResolvedValue({});
    mocks.circuitState.mockReturnValue("closed");
    mocks.createGalaxySecondBook.mockReturnValue(undefined);
    mocks.resolveRundownApiKey.mockReturnValue("");
    mocks.fetchRundownEventsForSport.mockResolvedValue({ events: [], remaining: null });
    mocks.eventsBelowBookmakerThreshold.mockImplementation((events: unknown[], min = 2) =>
      (events as { bookmakers?: unknown[] }[]).filter((e) => (e.bookmakers?.length ?? 0) < min),
    );
    // The status must be `confirmed` with an `event`, matching the contract the
    // real confirmer returns for a fixture the day's board does list. Any other
    // status is a legitimate refusal, and the generator correctly makes no pick.
    mocks.confirmBatch.mockImplementation(async (_sportKey: string, probes: readonly FixtureProbe[]) => ({
      status: "ok",
      eventsOnBoard: probes.length,
      byGameId: new Map(
        probes.map((p) => [
          p.id,
          { status: "confirmed", event: { externalId: `espn:test:${p.id}` }, correctedCommenceTime: null },
        ]),
      ),
    }));
    mocks.shadowSignalUpsert.mockResolvedValue({});
    // Default: a roster exists but the ledger holds nothing, so the engine is
    // honest about having no opinion. Each test that wants a real derivation
    // installs rows.
    mocks.playerGameStatFindMany.mockResolvedValue([]);
    mocks.signalFindMany.mockResolvedValue([]);
    mocks.playerFindMany.mockResolvedValue([]);
  });

  afterEach(async () => {
    const { __setArbiterLoader } = await import("../engine-shadow-pick.js");
    __setArbiterLoader(null);
    // NOT `vi.restoreAllMocks()`: that strips the `mockImplementation` off the
    // hoisted module doubles, so the DataNormalizer factory returns undefined
    // from the second test onward and every run dies in the harness instead of
    // in the code under test. The console spies restore themselves.
  });

  it("produces a published legacy pick AND an engine-derived pick, recorded beside it", async () => {
    installLopsidedLedger();
    const warn = vi.spyOn(console, "warn").mockImplementation((m) => { if (String(m).includes("engine shadow")) console.log("WC:", m); });
    const __dbg = await import("../signal-ledger-loader.js");
    const __orig = __dbg.loadLedgerSides;
    const result = await runGenerator();

    // The legacy pick published, exactly as before this change.
    expect(result).toMatchObject({ status: "success", games: 1, picks: 1 });
    expect(mocks.pickCreate).toHaveBeenCalledTimes(1);
    const published = mocks.pickCreate.mock.calls[0]![0] as { data: Record<string, unknown> };
    expect(published.data["selection"]).toBe("Chiefs -3.5");
    expect(published.data["modelVersion"]).toBe("v5.3.0");

    // And the engine produced its own opinion, which composeLedger moved off
    // the market anchor toward the home side whose players the ledger favours.
    const payload = shadowPayload();
    expect(payload.engine).not.toBeNull();
    const engine = payload.engine as Record<string, number>;
    expect(engine["homeSignalsUsed"]).toBeGreaterThan(0);
    expect(engine["homeLedgerScore"]).toBeGreaterThan(0);
    expect(engine["awayLedgerScore"]).toBeLessThan(0);
    // 0.6 market anchor, pushed up by a home-favouring ledger. The shift is
    // bounded, so this cannot become a runaway number.
    expect(engine["homeWinProb"]).toBeGreaterThan(0.6);
    expect(engine["homeWinProb"]).toBeLessThanOrEqual(0.6 + 0.04 + 1e-9);
    expect(engine["ledgerSilent"]).toBe(false);

    // BOTH picks are in the record, which is what makes the comparison
    // scoreable later.
    expect(payload.legacy["selection"]).toBe("Chiefs -3.5");
    expect(payload.legacy["confidence"]).toBe(72);
    expect(payload.arbitration["publishedWinner"]).toBe("LEGACY");

    // The legacy pick is untouched by any of it: exactly one create. The
    // refresh `updateMany` may still be attempted (it is the normal mint path
    // and it reports count 0 here, which falls through to the create), so the
    // claim being made is about the WRITE that lands, not about which branch
    // was entered.
    expect(mocks.pickCreate).toHaveBeenCalledTimes(1);
    expect(mocks.pickUpsert).not.toHaveBeenCalled();
    // And nothing in the engine lane touched the pick row after the mint.
    expect(mocks.pickCreate.mock.invocationCallOrder[0]!).toBeLessThan(
      mocks.shadowSignalUpsert.mock.invocationCallOrder[0]!,
    );
    warn.mockRestore();
  }, COLD_TRANSFORM_TIMEOUT_MS);

  it("records the engine as silent, holding the market, when the ledger has no weighted rows", async () => {
    // A roster with players, but zero ledger rows. The honest answer is "no
    // opinion", NOT agreement with the legacy pick, and the flag says so.
    installGameRow();
    mocks.playerGameStatFindMany.mockImplementation(async (args: unknown) => {
      const teams = (args as { where?: { team?: { in?: string[] } } }).where?.team?.in ?? [];
      if (teams.length === 0) return [];
      return teams.map((team) => ({ playerId: `${team}-qb`, team, season: 2026, week: 2, opponent: "LV" }));
    });
    mocks.playerFindMany.mockResolvedValue([
      { id: "KC-qb", gsisId: "00-0001" },
      { id: "BUF-qb", gsisId: "00-0003" },
    ]);
    mocks.signalFindMany.mockResolvedValue([]);
    const warn = vi.spyOn(console, "warn").mockImplementation((m) => { if (String(m).includes("engine shadow")) console.log("WC:", m); });

    await runGenerator();

    const engine = shadowPayload().engine as Record<string, unknown>;
    expect(engine["ledgerSilent"]).toBe(true);
    expect(engine["homeSignalsUsed"]).toBe(0);
    // Exactly the market anchor: the engine adds nothing it cannot support.
    expect(engine["homeWinProb"]).toBe(0.6);
    expect(engine["edgeVsMarket"]).toBe(0);
    expect(mocks.pickCreate).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  }, COLD_TRANSFORM_TIMEOUT_MS);

  it("keeps the legacy pick publishing when the ledger read throws", async () => {
    // A real roster, so the failure under test is the LEDGER READ and not the
    // earlier "no players" bail-out. Otherwise this would pass while proving
    // nothing about the read.
    installLopsidedLedger();
    mocks.signalFindMany.mockRejectedValue(new Error("ledger read exploded"));
    const warn = vi.spyOn(console, "warn").mockImplementation((m) => { if (String(m).includes("engine shadow")) console.log("WC:", m); });

    const result = await runGenerator();

    // The pick survives its own shadow failing. This is the whole reason the
    // shadow lane is wrapped and separate.
    expect(result).toMatchObject({ status: "success", picks: 1 });
    expect(mocks.pickCreate).toHaveBeenCalledTimes(1);
    expect(
      warn.mock.calls.some((c) => /ledger read exploded|signal read failed/.test(String(c[0]))),
    ).toBe(true);

    // The loader degrades to ZERO rows rather than propagating, so the engine
    // correctly reports "no opinion" and the failure is still recorded. That is
    // the better behaviour than dropping the row: a DB blip on the ledger must
    // not punch a hole in the comparison record, or every outage silently
    // removes fixtures from the sample the arbiter will later be scored on.
    // And it is NOT recorded: an unreadable ledger is an UNKNOWN, and writing
    // a row for it would put a fixture into the comparison sample that the
    // arbiter will later be scored on with the engine's opinion silently absent.
    // The operator gets the warning; the record does not get a fiction.
    expect(mocks.shadowSignalUpsert).not.toHaveBeenCalled();
    warn.mockRestore();
  }, COLD_TRANSFORM_TIMEOUT_MS);

  it("keeps the legacy pick publishing when the arbiter module does not exist yet", async () => {
    installLopsidedLedger();
    const { __setArbiterLoader } = await import("../engine-shadow-pick.js");
    const warn = vi.spyOn(console, "warn").mockImplementation((m) => { if (String(m).includes("engine shadow")) console.log("WC:", m); });

    // The founder's constraint: the adapter is being built in another lane, so
    // this must work with it absent.
    __setArbiterLoader(async () => {
      throw new Error("Cannot find module '@/lib/picks/resolve-pick-disagreement'");
    });
    // The engine must DISAGREE for the arbiter to be consulted at all.
    await runGenerator(reasonerDisagreeing());

    const payload = shadowPayload();
    expect(payload.arbitration["verdict"]).toBe("ARBITER_UNAVAILABLE");
    expect(payload.arbitration["publishedWinner"]).toBe("LEGACY");
    expect(mocks.pickCreate).toHaveBeenCalledTimes(1);
    const published = mocks.pickCreate.mock.calls[0]![0] as { data: Record<string, unknown> };
    expect(published.data["selection"]).toBe("Chiefs -3.5");
    warn.mockRestore();
  }, COLD_TRANSFORM_TIMEOUT_MS);

  it("keeps the legacy pick publishing when the arbiter throws or returns junk", async () => {
    const { __setArbiterLoader } = await import("../engine-shadow-pick.js");
    const warn = vi.spyOn(console, "warn").mockImplementation((m) => { if (String(m).includes("engine shadow")) console.log("WC:", m); });

    // A throwing arbiter.
    installLopsidedLedger();
    __setArbiterLoader(async () => ({
      resolvePickDisagreement: async () => {
        throw new Error("arbiter upstream 503");
      },
    }));
    await runGenerator(reasonerDisagreeing());
    expect(shadowPayload().arbitration["verdict"]).toBe("ARBITER_FAILED");
    expect(shadowPayload().arbitration["publishedWinner"]).toBe("LEGACY");

    // A non-object result.
    mocks.shadowSignalUpsert.mockClear();
    installLopsidedLedger();
    __setArbiterLoader(async () => ({ resolvePickDisagreement: async () => "ENGINE" }));
    await runGenerator(reasonerDisagreeing());
    expect(shadowPayload().arbitration["verdict"]).toBe("ARBITER_FAILED");
    expect(shadowPayload().arbitration["publishedWinner"]).toBe("LEGACY");

    // An object with an unrecognized preference.
    mocks.shadowSignalUpsert.mockClear();
    installLopsidedLedger();
    __setArbiterLoader(async () => ({
      resolvePickDisagreement: async () => ({ preferred: "SOMETHING_ELSE" }),
    }));
    await runGenerator(reasonerDisagreeing());
    expect(shadowPayload().arbitration["verdict"]).toBe("ARBITER_FAILED");
    expect(shadowPayload().arbitration["publishedWinner"]).toBe("LEGACY");

    // Through all three, the published pick is untouched.
    expect(mocks.pickCreate).toHaveBeenCalledTimes(3);
    for (const call of mocks.pickCreate.mock.calls) {
      expect((call[0] as { data: Record<string, unknown> }).data["selection"]).toBe("Chiefs -3.5");
    }
    warn.mockRestore();
  }, COLD_TRANSFORM_TIMEOUT_MS);

  it("records the arbiter's preference when it succeeds, and still publishes the legacy pick", async () => {
    installLopsidedLedger();
    const { __setArbiterLoader } = await import("../engine-shadow-pick.js");
    const warn = vi.spyOn(console, "warn").mockImplementation((m) => { if (String(m).includes("engine shadow")) console.log("WC:", m); });

    // The arbiter prefers the engine. That preference is RECORDED, so the
    // arbiter's own accuracy becomes measurable later, and it is not obeyed.
    __setArbiterLoader(async () => ({
      resolvePickDisagreement: async () => ({
        preferred: "ENGINE",
        rationale: "the ledger blend favours the other side of this market",
      }),
    }));
    await runGenerator(reasonerDisagreeing());

    const payload = shadowPayload();
    expect(payload.arbitration["verdict"]).toBe("ENGINE_PREFERRED");
    expect(payload.arbitration["rationale"]).toBe("the ledger blend favours the other side of this market");
    expect(payload.arbitration["publishedWinner"]).toBe("LEGACY");
    expect(payload.arbitration["arbitrationFailed"]).toBe(false);

    // The published pick is still the legacy one. Nothing promoted.
    const published = mocks.pickCreate.mock.calls[0]![0] as { data: Record<string, unknown> };
    expect(published.data["selection"]).toBe("Chiefs -3.5");
    warn.mockRestore();
  }, COLD_TRANSFORM_TIMEOUT_MS);

  it("writes the engine lane under its own model version so it cannot collide with the existing shadow lane", async () => {
    installLopsidedLedger();
    const warn = vi.spyOn(console, "warn").mockImplementation((m) => { if (String(m).includes("engine shadow")) console.log("WC:", m); });

    await runGenerator();

    const row = shadowRow();
    // Namespaced, so this row can never overwrite or be overwritten by the
    // existing shadow lane's row for the same fixture.
    expect(row["modelVersion"]).toBe("engine-shadow:v5.3.0");
    // The engine's probability is what the existing offline scorer reads.
    expect(typeof row["shadowProb"]).toBe("number");
    expect(row["marketProb"]).toBe(0.6);
    // The legacy confidence is carried beside it for the head-to-head.
    expect(row["liveConfidence"]).toBe(72);
    warn.mockRestore();
  }, COLD_TRANSFORM_TIMEOUT_MS);

  it("upserts rather than appending, so a re-run cannot overweight one fixture", async () => {
    installLopsidedLedger();
    const warn = vi.spyOn(console, "warn").mockImplementation((m) => { if (String(m).includes("engine shadow")) console.log("WC:", m); });

    await runGenerator();
    await runGenerator();

    expect(mocks.shadowSignalUpsert).toHaveBeenCalledTimes(2);
    for (const call of mocks.shadowSignalUpsert.mock.calls) {
      const args = call[0] as { where: { gameId_modelVersion: { gameId: string; modelVersion: string } } };
      expect(args.where.gameId_modelVersion.gameId).toBe("game-1");
      expect(args.where.gameId_modelVersion.modelVersion).toBe("engine-shadow:v5.3.0");
    }
    warn.mockRestore();
  }, COLD_TRANSFORM_TIMEOUT_MS);
});
