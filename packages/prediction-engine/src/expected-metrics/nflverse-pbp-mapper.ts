/**
 * nflverse play-by-play → expected-metrics mapper (EP / WP / Success / Drives).
 *
 * Pure, deterministic, zero-I/O translation of projected nflverse pbp row
 * records (the exact `Readonly<Record<string, string>>` shape `parseCsv`
 * emits) into the engine's play contracts: EpPlay, WpPlay, SuccessPlay,
 * DrivePlay — plus the index-aligned REFEREE arrays (`ep`/`wp`) and the
 * before→after transition pairs (`epa`/`wpa`) the validation join consumes.
 *
 * The mapper never invents feature values: a missing value maps to the
 * engine's documented sentinel (null → impute / pick'em), corrupt text maps
 * to NaN (the engine's corrupt-drop path), and everything else passes
 * through untouched. nflverse `ep`/`epa`/`wp`/`wpa` are carried ONLY as
 * calibration referee values — they are never emitted as a metric.
 *
 * GRAIN: single season, REG only. Rows outside the resolved season, non-REG
 * rows, and rows without a finite `play_id` are dropped and counted.
 *
 * REFEREE-JOIN DISCIPLINE: `epRef[i]` is pushed in the same loop iteration
 * as `epPlays[i]` (likewise wp), so the two sides are equal length BY
 * CONSTRUCTION — exclusions are expressed as NaN masking on the referee
 * side (terminal scoring rows), never as filtering one side.
 * `buildPlayGrainCalibration` drops non-finite PAIRS internally, so a NaN
 * mask excludes the play from the correlation on both sides at once.
 */

import { deriveNextScore, type EpPlay, type RawScoringContext } from "./expected-points.js";
import { type WpPlay } from "./win-probability.js";
import { isSuccessfulPlay, type SuccessPlay } from "./success-rate.js";
import { type DrivePlay, type DriveResult } from "./drives.js";

/**
 * The ONLY pbp columns this wiring reads. 40 of ~372 (OOM defense — pass to
 * `parseCsv(text, { columns })` so the projecting parser never materializes
 * the full token matrix).
 *
 * Deliberately excludes ALL FTN-charting / participation columns
 * (CC-BY-SA-4.0 — not ingested) and `sp` (a binary scoring-play INDICATOR,
 * not a point value — see the DrivePlay.pointsScored contract in drives.ts).
 * Because the projection physically drops every non-allowlisted column at
 * parse time, mapping `sp` or an FTN column is structurally unreachable.
 */
export const NFLVERSE_PBP_EXPECTED_METRICS_COLUMNS = [
  // identity / grain
  "game_id", "play_id", "season", "season_type",
  "home_team", "away_team", "posteam", "defteam",
  // ordering / clock
  "game_half", "half_seconds_remaining", "game_seconds_remaining",
  // EP situation
  "down", "ydstogo", "yardline_100", "goal_to_go",
  // next-score labelling
  "touchdown", "td_team", "field_goal_result", "safety",
  // ACTUAL point deltas (the not-`sp` rule)
  "posteam_score", "defteam_score", "posteam_score_post", "defteam_score_post",
  // WP situation + label
  "score_differential", "posteam_timeouts_remaining", "defteam_timeouts_remaining",
  "spread_line", "result",
  // success rate
  "play_type", "yards_gained", "interception", "fumble_lost",
  "rusher_player_id", "receiver_player_id",
  // drives
  "fixed_drive", "fixed_drive_result",
  // REFEREE ONLY — y-axis of calibration, never a served metric
  "ep", "epa", "wp", "wpa",
] as const;

/** One projected pbp row record, exactly as `parseCsv` emits it. */
export type PbpRow = Readonly<Record<string, string>>;

/** One before→after transition for EPA/WPA. Indices point into the sibling plays array. */
export interface TransitionPair {
  readonly beforeIndex: number;
  readonly afterIndex: number;
  /** posteam(after) !== posteam(before) — drives the NEGATE (EP) vs COMPLEMENT (WP) branch. */
  readonly possessionChanged: boolean;
  /**
   * nflverse referee value for this transition (`epa` resp. `wpa` of the
   * BEFORE row); NaN when missing/non-finite — buildPlayGrainCalibration
   * drops the pair, lengths stay equal.
   */
  readonly refDelta: number;
}

export interface MappedExpectedMetricsPlays {
  readonly season: number;
  readonly seasonType: "REG";

  readonly epPlays: readonly EpPlay[];
  /**
   * nflverse `ep`, INDEX-ALIGNED with epPlays (epRef.length === epPlays.length,
   * invariant). Terminal (scoring) rows carry NaN — the non-terminal-only
   * validation join is achieved by NaN-masking, not filtering, so lengths
   * never diverge (validation.ts throws on mismatch).
   */
  readonly epRef: readonly number[];
  /** Indices into epPlays; refDelta = nflverse `epa` of the before row. */
  readonly epaPairs: readonly TransitionPair[];

  readonly wpPlays: readonly WpPlay[];
  /** nflverse `wp`, index-aligned with wpPlays (full play grain, no mask). */
  readonly wpRef: readonly number[];
  /** Indices into wpPlays; refDelta = nflverse `wpa` of the before row. */
  readonly wpaPairs: readonly TransitionPair[];

  readonly successPlays: readonly SuccessPlay[];
  /** epa: null on every play (fit-free mapper; attach post-fit via attachOwnEpa). */
  readonly drivePlays: readonly DrivePlay[];

  readonly counts: {
    readonly sourceRows: number;
    readonly regRows: number;
    readonly droppedNonReg: number;
    readonly droppedOffSeason: number;
    readonly droppedNoPlayId: number;
    readonly epEligible: number;
    readonly wpEligible: number;
    readonly tieGamesExcludedFromWp: number;
    /** Drive yardline_100 fills (§ yardline fill — display aggregates only). */
    readonly yardlineFilled: number;
  };
}

// ── Numeric parsing helpers (semantics identical to apps/web/lib/nflverse/expected-metrics.ts) ──

function num(value: string | undefined): number {
  if (value === undefined || value === "") return NaN;
  return Number(value);
}

function bin(value: string | undefined): 0 | 1 {
  return value === "1" ? 1 : 0;
}

/**
 * "" / absent → null (the engine's documented impute / pick'em sentinel);
 * anything else → Number(...) — corrupt text becomes NaN, the engine's
 * corrupt-drop path. NEVER coerces garbage to a fabricated finite value.
 */
function numOrNull(value: string | undefined): number | null {
  if (value === undefined || value === "") return null;
  return Number(value);
}

// ── Scoring-event detection (next-score labelling + terminal masking) ──────────

interface ScoringEvent {
  readonly scoreType: "TD" | "FG" | "SAFETY";
  readonly scoringTeam: string;
}

/**
 * The scoring event ON a row, first match wins. PAT / two-point rows are NOT
 * scoring events for labelling — EP_OUTCOME_VALUES.TD = +7 already folds in
 * the expected PAT (documented v1 convention, expected-points.ts).
 */
function scoringEventOf(row: PbpRow): ScoringEvent | null {
  if (row["touchdown"] === "1") {
    // td_team handles defensive/return touchdowns (scoring team ≠ posteam).
    return { scoreType: "TD", scoringTeam: (row["td_team"] || row["posteam"]) ?? "" };
  }
  if (row["field_goal_result"] === "made") {
    return { scoreType: "FG", scoringTeam: row["posteam"] ?? "" };
  }
  if (row["safety"] === "1") {
    // A safety scores for the DEFENSE; deriveNextScore maps the conceding
    // possession team's frame to OPP_SAFETY.
    return { scoreType: "SAFETY", scoringTeam: row["defteam"] ?? "" };
  }
  return null;
}

/** `game_half` → half bucket: Half1→1, Half2→2, anything else (incl. Overtime)→3. */
function halfOf(row: PbpRow): number {
  const h = row["game_half"];
  if (h === "Half1") return 1;
  if (h === "Half2") return 2;
  return 3;
}

// ── THE POINT-DELTA DERIVATION RULE (`pointsScored` — never `sp`) ───────────────

/**
 * ACTUAL offense-framed points scored on a row, derived from the real score
 * deltas — never from `sp` (a 0/1 indicator that would total a TD+PAT drive
 * as 1+1=2 and misclassify it, the exact failure documented in drives.ts).
 *
 *  - posDelta > 0 → posDelta (TD 6, FG 3, PAT/XP 1, two-point 2)
 *  - safety === "1" && defDelta === 2 → 2 (the contract's enumerated safety)
 *  - else 0. Opponent defensive TDs (posDelta 0, defDelta 6) map to 0 — an
 *    opponent's points must never enter this drive's total, or the ≥6→TD
 *    fallback would misclassify a turnover drive. Result classification for
 *    those drives comes from terminalOutcome ("Opp touchdown"), which is
 *    authoritative. Defensive two-point returns (defDelta 2, safety!=1) → 0,
 *    documented limitation. Non-finite deltas → 0, never NaN into points.
 */
function pointsScoredOf(row: PbpRow): number {
  const posDelta = num(row["posteam_score_post"]) - num(row["posteam_score"]);
  const defDelta = num(row["defteam_score_post"]) - num(row["defteam_score"]);
  if (Number.isFinite(posDelta) && posDelta > 0) return posDelta;
  if (row["safety"] === "1" && defDelta === 2) return 2;
  return 0;
}

// ── fixed_drive_result → DriveResult ────────────────────────────────────────────

/**
 * Map nflverse `fixed_drive_result` to the engine's DriveResult. "Opp
 * touchdown" disambiguates by whether the drive contains a punt row (punt
 * returned for TD — possession ended with a punt) vs a pick-six/fumble-six.
 * Empty → undefined (engine's point fallback runs); unknown → OTHER.
 */
function mapDriveResult(fdr: string, driveHasPunt: boolean): DriveResult | undefined {
  switch (fdr) {
    case "": return undefined;
    case "Touchdown": return "TD";
    case "Field goal": return "FG";
    case "Punt": return "PUNT";
    case "Turnover": return "TURNOVER";
    case "Turnover on downs": return "TURNOVER_ON_DOWNS";
    case "Safety": return "SAFETY";
    case "Missed field goal": return "MISSED_FG";
    case "End of half": return "END_OF_HALF";
    case "End of game": return "END_OF_GAME";
    case "Opp touchdown": return driveHasPunt ? "PUNT" : "TURNOVER";
    default: return "OTHER";
  }
}

// ── Transition-pair construction ────────────────────────────────────────────────

interface EligibleEntry {
  /** Index of the row within the game's ordered rows. */
  readonly rowIdx: number;
  /** Index of the emitted play in the GLOBAL plays array. */
  readonly globalIdx: number;
}

/**
 * Build before→after pairs over consecutive eligible rows of one game. The
 * "after" state is simply row j's own emitted play — nflverse expresses every
 * row from its own possession team's frame (yardline_100 to that team's
 * target end zone, score_differential posteam-framed), which is exactly the
 * "after-play possession team's frame" the engine's EPA/WPA caller contracts
 * demand. No re-framing arithmetic here; only `possessionChanged`, and the
 * engine applies NEGATE (EP) vs COMPLEMENT (WP).
 *
 * A pair requires: same game_half (the next-score frame resets at halftime),
 * no scoring event on row i (v1 covers non-terminal down-to-down transitions
 * only), no scoring event on any raw row strictly between i and j (a
 * kickoff-return score on a down-less row must not be silently spanned), and
 * both posteams non-empty.
 */
function buildTransitionPairs(
  eligible: readonly EligibleEntry[],
  rows: readonly PbpRow[],
  scoring: readonly (ScoringEvent | null)[],
  refColumn: "epa" | "wpa",
): TransitionPair[] {
  const pairs: TransitionPair[] = [];
  for (let a = 0; a + 1 < eligible.length; a++) {
    const before = eligible[a]!;
    const after = eligible[a + 1]!;
    const rowI = rows[before.rowIdx]!;
    const rowJ = rows[after.rowIdx]!;
    if (rowI["game_half"] !== rowJ["game_half"]) continue;
    if (scoring[before.rowIdx] !== null) continue;
    let spansScore = false;
    for (let m = before.rowIdx + 1; m < after.rowIdx; m++) {
      if (scoring[m] !== null) { spansScore = true; break; }
    }
    if (spansScore) continue;
    const posI = rowI["posteam"] ?? "";
    const posJ = rowJ["posteam"] ?? "";
    if (posI === "" || posJ === "") continue;
    pairs.push({
      beforeIndex: before.globalIdx,
      afterIndex: after.globalIdx,
      possessionChanged: posI !== posJ,
      refDelta: num(rowI[refColumn]),
    });
  }
  return pairs;
}

// ── The mapper ──────────────────────────────────────────────────────────────────

export function mapNflversePbpToExpectedMetrics(
  records: readonly PbpRow[],
  options: { readonly season?: number } = {},
): MappedExpectedMetricsPlays {
  const sourceRows = records.length;
  let droppedNonReg = 0;
  let droppedOffSeason = 0;
  let droppedNoPlayId = 0;
  let tieGamesExcludedFromWp = 0;
  let yardlineFilled = 0;

  // 1. REG filter.
  const regCandidates: PbpRow[] = [];
  for (const r of records) {
    if (r["season_type"] !== "REG") { droppedNonReg++; continue; }
    regCandidates.push(r);
  }

  // 2. Season resolution: options.season, else the first finite `season` value
  //    seen (input order — deterministic for the real per-season asset, where
  //    every row carries the same season; pass options.season for mixed input).
  let resolvedSeason = options.season;
  if (resolvedSeason === undefined) {
    for (const r of regCandidates) {
      const s = num(r["season"]);
      if (Number.isFinite(s)) { resolvedSeason = s; break; }
    }
  }
  const season = resolvedSeason ?? NaN;

  // 3. Same-season + finite play_id grain guards.
  const usable: PbpRow[] = [];
  for (const r of regCandidates) {
    if (num(r["season"]) !== season) { droppedOffSeason++; continue; }
    if (!Number.isFinite(num(r["play_id"]))) { droppedNoPlayId++; continue; }
    usable.push(r);
  }

  // 4. Group by game_id (game keys sorted ascending), rows by numeric play_id.
  const byGame = new Map<string, PbpRow[]>();
  for (const r of usable) {
    const gameId = r["game_id"] ?? "";
    const bucket = byGame.get(gameId);
    if (bucket) bucket.push(r);
    else byGame.set(gameId, [r]);
  }
  const gameIds = [...byGame.keys()].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

  const epPlays: EpPlay[] = [];
  const epRef: number[] = [];
  const epaPairs: TransitionPair[] = [];
  const wpPlays: WpPlay[] = [];
  const wpRef: number[] = [];
  const wpaPairs: TransitionPair[] = [];
  const successPlays: SuccessPlay[] = [];
  const drivePlays: DrivePlay[] = [];

  for (const gameId of gameIds) {
    const rows = [...(byGame.get(gameId) ?? [])].sort(
      (a, b) => num(a["play_id"]) - num(b["play_id"]),
    );

    // (a) Next-score labelling over ALL ordered rows of the game (kickoff-return
    //     scores on down-less rows must be visible to the forward scan).
    const scoring = rows.map(scoringEventOf);
    const contexts: RawScoringContext[] = rows.map((row, k) => {
      const ev = scoring[k] ?? null;
      return {
        half: halfOf(row),
        posteam: row["posteam"] ?? "",
        scoringTeam: ev === null ? null : ev.scoringTeam,
        scoreType: ev === null ? null : ev.scoreType,
      };
    });
    const labels = deriveNextScore(contexts);

    // WP labellability of the whole game: a tied final (result === 0) makes
    // posteamWon unlabellable — every row of the game is excluded from wpPlays.
    let gameResult = NaN;
    for (const row of rows) {
      const v = num(row["result"]);
      if (Number.isFinite(v)) { gameResult = v; break; }
    }
    const gameWpLabellable = Number.isFinite(gameResult) && gameResult !== 0;
    if (Number.isFinite(gameResult) && gameResult === 0) tieGamesExcludedFromWp++;

    const epEligibleEntries: EligibleEntry[] = [];
    const wpEligibleEntries: EligibleEntry[] = [];

    for (let k = 0; k < rows.length; k++) {
      const row = rows[k]!;
      const playId = `${row["game_id"] ?? ""}-${row["play_id"] ?? ""}`;
      const down = num(row["down"]);
      const ydstogo = num(row["ydstogo"]);
      const yardline100 = num(row["yardline_100"]);
      const isScoringRow = scoring[k] !== null;

      // (b) EP series. Terminal scoring rows STAY in epPlays (the fit needs
      //     TD/FG-labelled states as positives) but are NaN-masked in epRef so
      //     they never enter the referee correlation (non-terminal-only join).
      const epEligible =
        Number.isInteger(down) && down >= 1 && down <= 4 &&
        Number.isFinite(ydstogo) &&
        Number.isFinite(yardline100) && yardline100 >= 1 && yardline100 <= 99;

      if (epEligible) {
        epEligibleEntries.push({ rowIdx: k, globalIdx: epPlays.length });
        epPlays.push({
          playId,
          down,
          ydstogo,
          yardline100,
          // "" → null (impute sentinel); corrupt text → NaN (corrupt-drop path).
          halfSecondsRemaining: numOrNull(row["half_seconds_remaining"]),
          goalToGo: bin(row["goal_to_go"]),
          nextScore: labels[k] ?? null,
        });
        epRef.push(isScoringRow ? NaN : num(row["ep"]));

        // (c) WP series — WP-eligible iff EP-eligible AND the WP columns are
        //     finite AND the game outcome is labellable.
        const scoreDifferential = num(row["score_differential"]);
        const gameSecondsRemaining = num(row["game_seconds_remaining"]);
        const posteamTimeouts = num(row["posteam_timeouts_remaining"]);
        const defteamTimeouts = num(row["defteam_timeouts_remaining"]);
        const posteam = row["posteam"] ?? "";
        const homeTeam = row["home_team"] ?? "";
        const awayTeam = row["away_team"] ?? "";
        const rowResult = num(row["result"]);
        const wpEligible =
          gameWpLabellable &&
          Number.isFinite(scoreDifferential) &&
          Number.isFinite(gameSecondsRemaining) &&
          Number.isFinite(posteamTimeouts) &&
          Number.isFinite(defteamTimeouts) &&
          posteam !== "" && (posteam === homeTeam || posteam === awayTeam) &&
          Number.isFinite(rowResult) && rowResult !== 0;

        if (wpEligible) {
          const spreadRaw = numOrNull(row["spread_line"]);
          wpEligibleEntries.push({ rowIdx: k, globalIdx: wpPlays.length });
          wpPlays.push({
            playId,
            scoreDifferential,
            gameSecondsRemaining,
            yardline100,
            down,
            ydstogo,
            posteamTimeouts,
            defteamTimeouts,
            // nflverse spread_line is HOME-framed (positive = home favored);
            // WpPlay wants the possession frame. null = pick'em sentinel.
            spreadLine: spreadRaw === null ? null : posteam === homeTeam ? spreadRaw : -spreadRaw,
            posteamWon: (rowResult > 0) === (posteam === homeTeam) ? 1 : 0,
          });
          wpRef.push(num(row["wp"]));
        }
      }

      // (e) Success series — scrimmage pass/run rows with a possession team.
      //     NaN / out-of-range downs pass through untouched; isSuccessfulPlay
      //     returns null for them (unratable, never a silent failure).
      const playType = row["play_type"];
      if ((playType === "pass" || playType === "run") && (row["posteam"] ?? "") !== "") {
        successPlays.push({
          playId,
          teamId: row["posteam"] ?? "",
          playerId: (row["rusher_player_id"] || row["receiver_player_id"]) ?? "",
          down,
          ydstogo,
          yardsGained: num(row["yards_gained"]),
          touchdown: bin(row["touchdown"]),
          turnover: row["interception"] === "1" || row["fumble_lost"] === "1" ? 1 : 0,
        });
      }
    }

    // (d) EPA/WPA transition pairs — after = row j's own emitted play.
    epaPairs.push(...buildTransitionPairs(epEligibleEntries, rows, scoring, "epa"));
    wpaPairs.push(...buildTransitionPairs(wpEligibleEntries, rows, scoring, "wpa"));

    // (f) Drive series — EVERY usable row (partition completeness at file grain).
    //     Pre-compute per-drive facts: punt presence (for "Opp touchdown") and
    //     the drive's terminal outcome (fixed_drive_result is drive-constant;
    //     stamped on every play — classifyResult reads the LAST play).
    const driveKeyOf = (row: PbpRow): number | null => {
      const fd = num(row["fixed_drive"]);
      return Number.isFinite(fd) ? fd : null;
    };
    const driveHasPunt = new Map<number | null, boolean>();
    const driveFdr = new Map<number | null, string>();
    for (const row of rows) {
      const key = driveKeyOf(row);
      if (row["play_type"] === "punt") driveHasPunt.set(key, true);
      const fdr = row["fixed_drive_result"] ?? "";
      if (fdr !== "" && !driveFdr.has(key)) driveFdr.set(key, fdr);
    }

    // Drive yardline fill: within each (game, fixed_drive) group in play order,
    // forward-fill then backward-fill a non-finite yardline_100 from the nearest
    // finite value in the SAME drive; a drive with zero finite values gets 0.
    // Display aggregates only (start/end yardline) — never a model feature.
    const yardlines: number[] = rows.map((row) => num(row["yardline_100"]));
    const filled: number[] = [...yardlines];
    const idxsByDrive = new Map<number | null, number[]>();
    for (let k = 0; k < rows.length; k++) {
      const key = driveKeyOf(rows[k]!);
      const bucket = idxsByDrive.get(key);
      if (bucket) bucket.push(k);
      else idxsByDrive.set(key, [k]);
    }
    for (const idxs of idxsByDrive.values()) {
      let lastFinite = NaN;
      for (const k of idxs) {
        if (Number.isFinite(filled[k]!)) lastFinite = filled[k]!;
        else if (Number.isFinite(lastFinite)) filled[k] = lastFinite;
      }
      lastFinite = NaN;
      for (let n = idxs.length - 1; n >= 0; n--) {
        const k = idxs[n]!;
        if (Number.isFinite(yardlines[k]!)) lastFinite = yardlines[k]!;
        else if (!Number.isFinite(filled[k]!) && Number.isFinite(lastFinite)) filled[k] = lastFinite;
      }
      for (const k of idxs) {
        if (!Number.isFinite(yardlines[k]!)) {
          yardlineFilled++;
          if (!Number.isFinite(filled[k]!)) filled[k] = 0;
        }
      }
    }

    for (let k = 0; k < rows.length; k++) {
      const row = rows[k]!;
      const playId = `${row["game_id"] ?? ""}-${row["play_id"] ?? ""}`;
      const key = driveKeyOf(row);
      const playType = row["play_type"];
      const isScrimmage = (playType === "pass" || playType === "run") && (row["posteam"] ?? "") !== "";
      const successPlay: SuccessPlay | null = isScrimmage
        ? {
            playId,
            teamId: row["posteam"] ?? "",
            playerId: (row["rusher_player_id"] || row["receiver_player_id"]) ?? "",
            down: num(row["down"]),
            ydstogo: num(row["ydstogo"]),
            yardsGained: num(row["yards_gained"]),
            touchdown: bin(row["touchdown"]),
            turnover: row["interception"] === "1" || row["fumble_lost"] === "1" ? 1 : 0,
          }
        : null;
      drivePlays.push({
        playId,
        gameId: row["game_id"] ?? "",
        driveId: key,
        posteam: row["posteam"] ?? "",
        playIndex: k,
        yardline100: filled[k]!,
        pointsScored: pointsScoredOf(row),
        isSuccess: successPlay === null ? null : isSuccessfulPlay(successPlay),
        epa: null, // fit-free mapper; attach post-fit via attachOwnEpa
        terminalOutcome: mapDriveResult(driveFdr.get(key) ?? "", driveHasPunt.get(key) === true),
      });
    }
  }

  return {
    season,
    seasonType: "REG",
    epPlays,
    epRef,
    epaPairs,
    wpPlays,
    wpRef,
    wpaPairs,
    successPlays,
    drivePlays,
    counts: {
      sourceRows,
      regRows: usable.length,
      droppedNonReg,
      droppedOffSeason,
      droppedNoPlayId,
      epEligible: epPlays.length,
      wpEligible: wpPlays.length,
      tieGamesExcludedFromWp,
      yardlineFilled,
    },
  };
}

/**
 * Post-fit helper: returns a NEW DrivePlay array with our OWN fitted EPA
 * attached by playId. Pure; ids missing from the map keep epa null (drives.ts
 * treats a null epa as 0 in epaTotal). Never mutates the input.
 */
export function attachOwnEpa(
  drivePlays: readonly DrivePlay[],
  epaByPlayId: ReadonlyMap<string, number>,
): DrivePlay[] {
  return drivePlays.map((p) => {
    const epa = epaByPlayId.get(p.playId);
    return epa === undefined ? { ...p } : { ...p, epa };
  });
}
