/**
 * Ethandojo Handoff Suite — engine-facing composition layer.
 *
 * Imports and exposes all 10 builds from the @ethandojo NFL handoff through a
 * single typed API. Every build is reachable through callable methods, not
 * just a list of names. Dependency injection for cross-package concerns
 * (e.g. OverTheCap salary adapter). No circular package dependencies.
 *
 * This is the canonical engine-facing entrypoint. It does NOT modify any
 * existing live path — live-path promotion is disabled under the
 * new-files-only constraint.
 */

// ─── Build 1: Game outcome predictor ─────────────────────────────────────────
import {
  type GamePredictorApi,
  createGamePredictor,
} from "../nfl/ethandojo-game-predictor.js";

// ─── Build 2: Highlight detector ─────────────────────────────────────────────
import {
  type HighlightDetectorApi,
  createHighlightDetector,
} from "../film/highlight-detector.js";

// ─── Build 3: Coverage analyzer ──────────────────────────────────────────────
import {
  type CoverageAnalyzerApi,
  createCoverageAnalyzer,
} from "../film/coverage-analyzer.js";

// ─── Build 4: Contract value analyzer ────────────────────────────────────────
import {
  type ContractValueApi,
  createContractValueAnalyzer,
} from "../nfl/contract-value.js";

// ─── Build 5: Fourth-down grader ─────────────────────────────────────────────
import {
  type FourthDownApi,
  createFourthDownGrader,
} from "../nfl/fourth-down-grader.js";

// ─── Build 6: Fantasy trade analyzer ─────────────────────────────────────────
import {
  type TradeApi,
  createTradeAnalyzer,
} from "../fantasy/trade-analyzer.js";

// ─── Build 7: Offensive coordinator ──────────────────────────────────────────
import {
  type OffensiveCoordinatorApi,
  createOffensiveCoordinator,
} from "../nfl/offensive-coordinator.js";

// ─── Build 8: Film splitter ──────────────────────────────────────────────────
import {
  type FilmSplitterApi,
  createFilmSplitter,
} from "../film/film-splitter.js";

// ─── Build 9: Opponent exploit finder ────────────────────────────────────────
import {
  type ExploitFinderApi,
  createExploitFinder,
} from "../nfl/exploit-finder.js";

// ─── Build 10: Draft copilot ─────────────────────────────────────────────────
import {
  type DraftCopilotApi,
  createDraftCopilot,
} from "../fantasy/draft-copilot.js";

// ─── Salary adapter interface (injected from data-ingestion) ─────────────────

/**
 * Salary data provider contract. The OverTheCap adapter in
 * `@sports/data-ingestion` implements this. Injected via DI — no circular
 * package dependency.
 */
export interface SalaryDataProvider {
  /** Fetch cap hit in millions for a player. Returns null if unknown. */
  getCapHitMillions(playerName: string, season: number): Promise<number | null>;
  /** Fetch all cap hits for a season, keyed by player name. */
  getAllCapHits(season: number): Promise<ReadonlyMap<string, number>>;
  /** True when the adapter is configured and usable. */
  isAvailable(): boolean;
}

// ─── Suite shape ─────────────────────────────────────────────────────────────

export interface EthandojoHandoffSuite {
  readonly gamePredictor: GamePredictorApi;
  readonly highlightDetector: HighlightDetectorApi;
  readonly coverageAnalyzer: CoverageAnalyzerApi;
  readonly contractValue: ContractValueApi;
  readonly fourthDown: FourthDownApi;
  readonly tradeAnalyzer: TradeApi;
  readonly offensiveCoordinator: OffensiveCoordinatorApi;
  readonly filmSplitter: FilmSplitterApi;
  readonly exploitFinder: ExploitFinderApi;
  readonly draftCopilot: DraftCopilotApi;
}

export interface EthandojoSuiteOptions {
  /** Injected salary adapter for contract-value analysis. */
  readonly salaryProvider?: SalaryDataProvider;
  /** Injected clock for deterministic time handling. */
  readonly now?: () => Date;
}

/**
 * Create the full handoff suite. Every build is instantiated and reachable.
 * Cross-package concerns (salary data) are injected, never hard-imported
 * from a live path.
 */
export function createEthandojoHandoffSuite(
  options: EthandojoSuiteOptions = {},
): EthandojoHandoffSuite {
  const now = options.now ?? (() => new Date());
  return {
    gamePredictor: createGamePredictor({ now }),
    highlightDetector: createHighlightDetector(),
    coverageAnalyzer: createCoverageAnalyzer(),
    contractValue: createContractValueAnalyzer({ salaryProvider: options.salaryProvider }),
    fourthDown: createFourthDownGrader(),
    tradeAnalyzer: createTradeAnalyzer(),
    offensiveCoordinator: createOffensiveCoordinator(),
    filmSplitter: createFilmSplitter(),
    exploitFinder: createExploitFinder(),
    draftCopilot: createDraftCopilot(),
  };
}

/**
 * Build registry — every build name mapped to its factory.
 * The composition test proves each entry is reachable.
 */
export const ETHANDOJO_BUILD_REGISTRY = {
  gamePredictor: createGamePredictor,
  highlightDetector: createHighlightDetector,
  coverageAnalyzer: createCoverageAnalyzer,
  contractValue: createContractValueAnalyzer,
  fourthDown: createFourthDownGrader,
  tradeAnalyzer: createTradeAnalyzer,
  offensiveCoordinator: createOffensiveCoordinator,
  filmSplitter: createFilmSplitter,
  exploitFinder: createExploitFinder,
  draftCopilot: createDraftCopilot,
} as const;

export type EthandojoBuildName = keyof typeof ETHANDOJO_BUILD_REGISTRY;

/** All 10 build names, in handoff order. */
export const ETHANDOJO_BUILD_NAMES: readonly EthandojoBuildName[] = [
  "gamePredictor",
  "highlightDetector",
  "coverageAnalyzer",
  "contractValue",
  "fourthDown",
  "tradeAnalyzer",
  "offensiveCoordinator",
  "filmSplitter",
  "exploitFinder",
  "draftCopilot",
] as const;
