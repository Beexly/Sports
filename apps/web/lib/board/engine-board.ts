/**
 * Engine derived-board projections — loader for the /board surface.
 *
 * DATA FLOW (this branch): the EDGE#5 derived-board scanner
 * (intelligence side, fleet-run) prices every game on a slate from the
 * engine's own equations — projected margin, projected total, projected
 * team totals, split and alt lines — and writes a board artifact
 * (`edge5_board_<date>.json`). A snapshot of the freshest artifact is
 * bundled next to this module (`engine-board.snapshot.json`) so the
 * surface builds and typechecks without a live database. The view-model
 * mapping below is the whole contract: when the production read path
 * lands (scanner artifact ingested to Neon, read through the freshness
 * gate), `loadEngineBoard` swaps its source and neither the page nor
 * the card changes.
 *
 * SNAPSHOT PROVENANCE, stated plainly: as of this build, the scanner's
 * board artifact has no verified home inside this repository — the
 * `dfs/edge5/` path it was reported under does not exist on main or on
 * this branch's lineage (checked by full-tree listing, 2026-10-12), and
 * no Neon table carries the derived board. The bundled snapshot is
 * therefore an EMPTY board envelope: the surface renders its honest
 * states until a real artifact is dropped in. Nothing here invents a
 * slate to fill the space.
 *
 * PUBLIC-SURFACE RULES (Garrett's, non-negotiable):
 * - The public view model carries ONLY the engine's projections:
 *   matchup, kickoff, projected margin, projected total, projected team
 *   totals. The scanner diffs its prices against book prices; those
 *   book numbers, the diffs, and every edge-shaped figure stay internal
 *   and never cross this boundary — they are simply never read.
 * - This surface has no pick mode. Classification runs through the
 *   board's own machinery (`classifyBoardState` +
 *   `classifyDegradationCharacter`), and the founder flag
 *   (`LIVE_BOARD`, read by `liveBoardOn` in ./state) rules: flag off,
 *   the board is held and no rows render, however fresh the artifact.
 *   This module never flips the flag.
 * - Honest states: a game renders only while it is upcoming and the
 *   artifact is fresh. Expired or absent projections render the stale /
 *   empty states — never rows reconstructed from a finished slate.
 * - Fail closed: an artifact that asserts it is a pick or an edge claim
 *   (`is_pick` / `is_edge_claim` present and not exactly false) is
 *   refused outright, as is any malformed shape.
 */

import snapshotJson from "./engine-board.snapshot.json";
import {
  classifyBoardState,
  type ClassifiedBoardState,
} from "./classify-board-state";
import {
  classifyDegradationCharacter,
  type DegradationCharacter,
} from "./degradation-character";
import { liveBoardOn } from "./state";

/** Oldest an artifact may be before a still-upcoming slate reads stale. */
const MAX_ARTIFACT_AGE_MS = 72 * 60 * 60 * 1000;

export interface EngineGameProjection {
  readonly eventId: string;
  readonly matchup: string;
  readonly homeTeam: string;
  readonly awayTeam: string;
  readonly kickoffIso: string;
  /** Engine-projected game total (points, both teams). */
  readonly projectedTotal: number;
  /**
   * Engine-projected margin from the HOME team's perspective:
   * negative means the home team is projected to win by that many.
   */
  readonly projectedMarginHome: number;
  readonly projectedHomeTotal: number;
  readonly projectedAwayTotal: number;
}

export type EngineBoardState =
  | "live"
  | "stale"
  | "empty"
  | "held"
  | "invalid";

export interface EngineBoardPayload {
  readonly data: {
    readonly games: readonly EngineGameProjection[];
    readonly generatedAt: string | null;
  };
  readonly meta: {
    readonly state: EngineBoardState;
    readonly dataError: "ARTIFACT_INVALID" | null;
    /** The board's own classification of this source, for the page. */
    readonly boardClass: ClassifiedBoardState | null;
    readonly character: DegradationCharacter | null;
  };
}

/* ── Raw artifact shape (only the fields this loader consumes) ────── */
/*
 * The scanner's board artifact, as documented by its own run reports:
 * one entry per game carrying the engine's derived lines. Book lines
 * and derived-vs-book diffs exist in the artifact and are NOT declared
 * here — an allowlist reads what it names and nothing else.
 */

interface RawGame {
  readonly event_id?: unknown;
  readonly id?: unknown;
  readonly name?: unknown;
  readonly matchup?: unknown;
  readonly commence_time?: unknown;
  readonly kickoff?: unknown;
  readonly home_team?: unknown;
  readonly away_team?: unknown;
  readonly derived?: unknown;
  readonly engine?: unknown;
}

interface RawArtifact {
  readonly is_pick?: unknown;
  readonly is_edge_claim?: unknown;
  readonly generated_at?: unknown;
  readonly generatedAt?: unknown;
  readonly games?: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function firstNumber(
  record: Record<string, unknown>,
  keys: readonly string[],
): number | null {
  for (const key of keys) {
    const n = finiteNumber(record[key]);
    if (n !== null) return n;
  }
  return null;
}

function invalidPayload(): EngineBoardPayload {
  return {
    data: { games: [], generatedAt: null },
    meta: {
      state: "invalid",
      dataError: "ARTIFACT_INVALID",
      boardClass: null,
      character: null,
    },
  };
}

function parseGame(raw: unknown): EngineGameProjection | null {
  if (!isRecord(raw)) return null;
  const game = raw as RawGame;

  const homeTeam = typeof game.home_team === "string" ? game.home_team : null;
  const awayTeam = typeof game.away_team === "string" ? game.away_team : null;
  if (!homeTeam || !awayTeam) return null;

  const kickoffIso =
    typeof game.commence_time === "string"
      ? game.commence_time
      : typeof game.kickoff === "string"
        ? game.kickoff
        : null;
  if (kickoffIso === null || Number.isNaN(Date.parse(kickoffIso))) return null;

  // The engine's derived lines live under one block; both spellings the
  // scanner has used are accepted, and the block must be a record —
  // a game without derived lines is not a projection and is skipped,
  // never reconstructed from book numbers.
  const derived = isRecord(game.derived)
    ? game.derived
    : isRecord(game.engine)
      ? game.engine
      : null;
  if (derived === null) return null;

  const projectedMarginHome = firstNumber(derived, [
    "spread",
    "projected_spread",
    "margin",
  ]);
  const projectedTotal = firstNumber(derived, [
    "total",
    "projected_total",
  ]);
  const teamTotals = isRecord(derived["team_totals"])
    ? derived["team_totals"]
    : isRecord(derived["projected_team_totals"])
      ? derived["projected_team_totals"]
      : null;
  const projectedHomeTotal =
    teamTotals !== null ? finiteNumber(teamTotals["home"]) : null;
  const projectedAwayTotal =
    teamTotals !== null ? finiteNumber(teamTotals["away"]) : null;

  if (
    projectedMarginHome === null ||
    projectedTotal === null ||
    projectedHomeTotal === null ||
    projectedAwayTotal === null
  ) {
    return null;
  }

  return {
    eventId:
      typeof game.event_id === "string"
        ? game.event_id
        : typeof game.id === "string"
          ? game.id
          : kickoffIso,
    matchup:
      typeof game.name === "string"
        ? game.name
        : typeof game.matchup === "string"
          ? game.matchup
          : `${awayTeam} at ${homeTeam}`,
    homeTeam,
    awayTeam,
    kickoffIso,
    projectedTotal,
    projectedMarginHome,
    projectedHomeTotal,
    projectedAwayTotal,
  };
}

/**
 * Map a raw derived-board artifact to the public payload. Pure and
 * exported for tests; `loadEngineBoard` is the request-path wrapper.
 * The founder flag is an input, not a read, so tests never touch env.
 */
export function buildEngineBoardView(
  input: unknown,
  now: Date,
  options: { readonly liveBoardOn: boolean },
): EngineBoardPayload {
  if (!isRecord(input)) return invalidPayload();
  const artifact = input as RawArtifact;

  // Fail closed: this surface publishes projections, never picks. An
  // artifact claiming to be a pick or an edge claim is not reframed —
  // it is refused, and the surface stays honestly empty.
  if (
    (artifact.is_pick !== undefined && artifact.is_pick !== false) ||
    (artifact.is_edge_claim !== undefined && artifact.is_edge_claim !== false)
  ) {
    return invalidPayload();
  }
  if (!Array.isArray(artifact.games)) return invalidPayload();

  const generatedRaw =
    typeof artifact.generated_at === "string"
      ? artifact.generated_at
      : typeof artifact.generatedAt === "string"
        ? artifact.generatedAt
        : null;
  const generatedAt =
    generatedRaw !== null && !Number.isNaN(Date.parse(generatedRaw))
      ? generatedRaw
      : null;
  // A non-empty artifact with no trustworthy generation time cannot be
  // freshness-classified, so it cannot be shown. An empty envelope may
  // omit it: zero games is an honest state at any time.
  if (artifact.games.length > 0 && generatedAt === null) {
    return invalidPayload();
  }

  let anyValidGame = false;
  const upcoming: EngineGameProjection[] = [];
  for (const rawGame of artifact.games as readonly unknown[]) {
    const parsed = parseGame(rawGame);
    if (parsed === null) continue;
    anyValidGame = true;
    if (Date.parse(parsed.kickoffIso) <= now.getTime()) continue; // kicked
    upcoming.push(parsed);
  }
  upcoming.sort((a, b) => Date.parse(a.kickoffIso) - Date.parse(b.kickoffIso));

  const artifactStale =
    generatedAt !== null &&
    now.getTime() - Date.parse(generatedAt) > MAX_ARTIFACT_AGE_MS;
  const freshRows = artifactStale ? [] : upcoming;

  // The board's own classifier decides what this source may claim.
  const boardClass = classifyBoardState({
    liveBoardOn: options.liveBoardOn,
    bootstrap: false,
    rowCount: freshRows.length,
    dataError: null,
    suppressedReason: null,
  });

  let state: EngineBoardState;
  if (!options.liveBoardOn) {
    state = "held";
  } else if (freshRows.length > 0) {
    state = "live";
  } else if (anyValidGame || artifactStale) {
    state = "stale";
  } else {
    state = "empty";
  }

  const character = classifyDegradationCharacter({
    staleSuppressed: false,
    dbUnreachable: false,
    demoSuppressed: false,
    liveBoardOff: !options.liveBoardOn,
    rowCount: state === "live" ? freshRows.length : 0,
    schedulerLiveness: null,
    staleDetected: state === "stale",
  });

  return {
    data: {
      games: state === "live" ? freshRows : [],
      generatedAt,
    },
    meta: { state, dataError: null, boardClass, character },
  };
}

/**
 * Request-path loader. Reads the bundled scanner snapshot today; the
 * production source (the scanner's Neon home, read through the
 * freshness gate) replaces the snapshot import behind this signature.
 * The LIVE_BOARD flag is read here, once, by the board's own reader —
 * this loader never sets or overrides it.
 */
export function loadEngineBoard(now: Date = new Date()): EngineBoardPayload {
  try {
    return buildEngineBoardView(snapshotJson, now, {
      liveBoardOn: liveBoardOn(),
    });
  } catch {
    return invalidPayload();
  }
}
