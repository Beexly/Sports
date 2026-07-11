/**
 * Founder-gated LIVE MLB fantasy boards — the first customer-shaped surface of
 * the glass-box engine, computed end-to-end through the rights machinery:
 *
 *   clearance gate (fantasy-mlb-gate) → SourceClearanceProof → adapters
 *   (@sports/data-ingestion, live-verified schemas) → engine
 *   (@sports/fantasy-engine SMASH / BURR / RVS) → boards.
 *
 * RIGHTS POSTURE (registry: mlb-statsapi, baseball-savant — derived-analytics
 * ONLY): raw payloads are fetched, mapped, and DISCARDED in this function —
 * nothing raw is persisted or returned. The boards below are derived scores we
 * compute, which are our own work product. Attribution from the clearance
 * proofs is part of the board payload and MUST be rendered by every consumer.
 *
 * NON-BULK DISCIPLINE: one bounded snapshot per source, memoized in-process
 * for BOARD_TTL_MS. The page is cockpit-only (ADMIN), so pull frequency is
 * bounded by founder visits per serverless instance — well inside the
 * one-pull-per-surface-per-day posture the registry documents.
 *
 * HONESTY: a refused clearance means NO fetch (blocked state, with codes); a
 * failed fetch means an unavailable board (with the reason) — never an empty
 * board dressed as a quiet day, and SMASH vs BURR/RVS degrade independently.
 */

import {
  computeBurr,
  computeHitterSmash,
  computePitcherSmash,
  computeRvs,
  type BurrScore,
  type RvsScore,
  type SmashScore,
} from "@sports/fantasy-engine";
import {
  buildRelieverSeasons,
  buildTeamBullpenCategories,
  buildTeamStatcastAllowed,
  consolidateByPlayer,
  fetchMlbPitcherSeasons,
  fetchSavantSmashLeaderboard,
  relieverPidToTeam,
  toHitterSkillInputs,
  toPitcherSkillInputs,
  type AdapterRelieverRow,
  type SavantCustomRow,
} from "@sports/data-ingestion";
import { baseballSavantGate, mlbStatsApiGate } from "@/lib/ingestion/fantasy-mlb-gate";

// ── Board types ───────────────────────────────────────────────────────────────

export interface SmashBoardRow {
  readonly name: string;
  readonly playerId: number;
  readonly pa: number;
  readonly score: SmashScore;
}

export interface RvsBoardRow {
  readonly playerName: string;
  readonly teamName: string | null;
  readonly score: RvsScore;
}

export type BoardSection<T> =
  | { readonly status: "ok"; readonly data: T }
  | { readonly status: "blocked"; readonly blocks: readonly string[] }
  | { readonly status: "unavailable"; readonly reason: string };

export interface MlbFantasyBoards {
  readonly season: number;
  readonly computedAt: string;
  /** Attribution strings from the clearance proofs — render them, always. */
  readonly attributions: readonly string[];
  readonly hitters: BoardSection<readonly SmashBoardRow[]>;
  readonly pitchers: BoardSection<readonly SmashBoardRow[]>;
  readonly bullpens: BoardSection<readonly BurrScore[]>;
  readonly relievers: BoardSection<readonly RvsBoardRow[]>;
}

// ── Season resolution ─────────────────────────────────────────────────────────

/** MLB season = calendar year once spring training is underway (March+). */
export function resolveMlbSeason(now: Date): number {
  return now.getUTCMonth() >= 2 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
}

// ── Compute (uncached, injectable transport for tests) ───────────────────────

function unavailable(err: unknown): { status: "unavailable"; reason: string } {
  return {
    status: "unavailable",
    reason: err instanceof Error ? err.message : String(err),
  };
}

function toSmashBoard(
  rows: ReadonlyArray<{ playerId: number; name: string; pa: number }>,
  scores: readonly SmashScore[],
): SmashBoardRow[] {
  return rows
    .map((r, i) => ({ name: r.name, playerId: r.playerId, pa: r.pa, score: scores[i]! }))
    .sort((a, b) => {
      const av = Number.isFinite(a.score.smash) ? a.score.smash : -Infinity;
      const bv = Number.isFinite(b.score.smash) ? b.score.smash : -Infinity;
      return bv - av;
    });
}

/**
 * Compute all four boards through gates → adapters → engine (uncached).
 * `fetchImpl` injects the transport for tests; production uses the adapters'
 * default noStoreFetch. Sections degrade independently and honestly.
 */
export async function computeMlbFantasyBoards(
  opts: { readonly now?: Date; readonly fetchImpl?: typeof globalThis.fetch } = {},
): Promise<MlbFantasyBoards> {
  const now = opts.now ?? new Date();
  const season = resolveMlbSeason(now);

  const savantGate = baseballSavantGate(now);
  const statsGate = mlbStatsApiGate(now);
  const attributions = [
    ...(savantGate.ok && savantGate.proof.attributionText ? [savantGate.proof.attributionText] : []),
    ...(statsGate.ok && statsGate.proof.attributionText ? [statsGate.proof.attributionText] : []),
  ];

  // ── Savant populations (SMASH hitters + pitchers) ──────────────────────────
  let hitters: MlbFantasyBoards["hitters"];
  let pitchers: MlbFantasyBoards["pitchers"];
  let savantPitcherRows: readonly SavantCustomRow[] | null = null;
  if (!savantGate.ok) {
    hitters = { status: "blocked", blocks: savantGate.blocks };
    pitchers = { status: "blocked", blocks: savantGate.blocks };
  } else {
    try {
      const [batterRows, pitcherRows] = await Promise.all([
        fetchSavantSmashLeaderboard(
          { year: season, type: "batter" },
          savantGate.proof,
          opts.fetchImpl,
        ),
        fetchSavantSmashLeaderboard(
          { year: season, type: "pitcher" },
          savantGate.proof,
          opts.fetchImpl,
        ),
      ]);
      savantPitcherRows = pitcherRows;
      const h = toHitterSkillInputs(batterRows);
      const p = toPitcherSkillInputs(pitcherRows);
      hitters = { status: "ok", data: toSmashBoard(h, computeHitterSmash(h.map((r) => r.input))) };
      pitchers = { status: "ok", data: toSmashBoard(p, computePitcherSmash(p.map((r) => r.input))) };
    } catch (err) {
      hitters = unavailable(err);
      pitchers = unavailable(err);
    }
  }

  // ── statsapi reliever pool (RVS) + team bullpens (BURR) ─────────────────────
  let bullpens: MlbFantasyBoards["bullpens"];
  let relievers: MlbFantasyBoards["relievers"];
  if (!statsGate.ok) {
    bullpens = { status: "blocked", blocks: statsGate.blocks };
    relievers = { status: "blocked", blocks: statsGate.blocks };
  } else {
    try {
      const stintLines = await fetchMlbPitcherSeasons(season, statsGate.proof, opts.fetchImpl);
      const consolidated = consolidateByPlayer(stintLines);
      const { relievers: pool, fipConstant } = buildRelieverSeasons(consolidated);

      const byId = new Map<string, AdapterRelieverRow>(pool.map((r) => [r.season.id, r]));
      relievers = {
        status: "ok",
        data: computeRvs(pool.map((r) => r.season))
          .map((score) => {
            const meta = byId.get(score.id)!;
            return { playerName: meta.playerName, teamName: meta.teamName, score };
          })
          .sort((a, b) => b.score.rvs - a.score.rvs),
      };

      // BURR needs the Savant team-Statcast join; without it the three Statcast
      // categories are NaN → neutral, which computeBurr handles honestly — the
      // board still renders, from 11 of 14 categories, and says nothing false.
      const teamStatcast =
        savantPitcherRows !== null
          ? buildTeamStatcastAllowed(savantPitcherRows, relieverPidToTeam(consolidated))
          : new Map<string, never>();
      const categories = buildTeamBullpenCategories(stintLines, fipConstant, teamStatcast);
      bullpens = {
        status: "ok",
        data: [...computeBurr(categories)].sort((a, b) => a.rank - b.rank),
      };
    } catch (err) {
      bullpens = unavailable(err);
      relievers = unavailable(err);
    }
  }

  return {
    season,
    computedAt: now.toISOString(),
    attributions,
    hitters,
    pitchers,
    bullpens,
    relievers,
  };
}

// ── In-process memo (non-bulk discipline; derived output only) ───────────────

export const BOARD_TTL_MS = 20 * 60 * 60 * 1000;

let memo: { readonly season: number; readonly at: number; readonly boards: MlbFantasyBoards } | null =
  null;

/**
 * Cached loader for the cockpit page. Memoizes the DERIVED boards (never raw
 * payloads) per serverless instance. Boards where every section failed are
 * not memoized — the next visit retries instead of pinning a dead board for
 * 20 hours.
 */
export async function loadMlbFantasyBoards(now = new Date()): Promise<MlbFantasyBoards> {
  const season = resolveMlbSeason(now);
  if (memo && memo.season === season && now.getTime() - memo.at < BOARD_TTL_MS) {
    return memo.boards;
  }
  const boards = await computeMlbFantasyBoards({ now });
  const anyOk =
    boards.hitters.status === "ok" ||
    boards.pitchers.status === "ok" ||
    boards.bullpens.status === "ok" ||
    boards.relievers.status === "ok";
  if (anyOk) memo = { season, at: now.getTime(), boards };
  return boards;
}

/** Test hook — clears the in-process memo. */
export function resetMlbFantasyBoardsMemo(): void {
  memo = null;
}
