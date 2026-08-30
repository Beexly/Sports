/**
 * Graded projections provider — the wire that makes data drive every tool.
 *
 * It composes the real Player Intelligence model (process grade) + Expected
 * Fantasy Points (xFP) + Team Environment (per-team neutral-script EPA) + QB
 * Forward (forward-looking passing prior) into REAL graded players mapped onto
 * the Player shape the fantasy engines already read. Registered through the
 * existing founder-gated seam (registerProjectionsProvider + PROJECTIONS_PROVIDER
 * env), so the moment the founder flips it on, lineup / waivers / DFS / draft /
 * trade / autopilot all run on real nflverse-graded data via activePlayerPool() —
 * with ZERO changes to those tools.
 *
 * LICENSE BOUNDARY (2026-07-16): the ff_opportunity xFP data is CC-BY-SA-4.0
 * (share-alike) — a license class we exclude for PUBLISHED derivatives while the
 * SA question is open. The PUBLISHED pool therefore defaults to the pure
 * CC-BY-4.0 basis (player-model actual per-game + process grade) and does not
 * fetch ff_opportunity at all; an internal/owner surface may opt in with
 * `includeXfp: true`, in which case xFP is preferred over actual per-game.
 *
 * ENRICHMENT (never the value basis): real market ADP + bye weeks join from the
 * cleared FFC ADP API (`ffc-adp`, approved_api, once/day cache), position-
 * verified with a team cross-check so a same-named player can never inherit the
 * wrong row. The Sleeper injury flag is DISPLAY-ONLY in the strict sense: it is
 * clearance-checked (`sleeper-api`, public_logged_off_fact_extract) and wrapped
 * in the rights envelope, joined by name+position+team, and lands on the
 * `injuryDisplay` field that only the UI badges read — `Player.injury` stays
 * "healthy" on live rows, so NO scoring/recommendation/trade/waiver/lineup
 * number moves with or without the flag (the sleeper-api registry posture:
 * commercial_display_allowed=false, never the value basis, never the sole basis
 * of a paid feature). Enrichment failures degrade gracefully: bye 0 / no ADP /
 * no flag, never invented.
 *
 * No fabrication: a player without the inputs
 * is excluded, not invented. schemeFit is the player's TEAM offensive environment
 * (within-league percentile of neutral-script offensive EPA) and falls back to a
 * neutral 0.6 when the team has no environment row — never an invented number.
 * The floor/ceiling band and usage are clearly model-derived. Names are REAL here
 * (grades are real facts), unlike the illustrative pool. Gated by design — a
 * deliberate go-live decision.
 */

import { registerProjectionsProvider, type PlayerProjection, type ProjectionsProvider } from "./projections";
import type { Player } from "../fantasy/players";
import { loadPlayerModel, type PlayerProfile } from "../intelligence/player-model";
import { FF_OPPORTUNITY_ATTRIBUTION, type ExpectedPointsRow } from "../intelligence/expected-points";
import { normName, percentileRanks } from "../intelligence/qb-consensus";
import type { TeamEnvironmentRow } from "../intelligence/team-environment";
import type { QbForwardRow } from "../intelligence/qb-forward";
import { adpByNormName, adpJoinKey, loadFfcAdp, FFC_ATTRIBUTION, type FfcAdpRow } from "../fantasy/adp-source";
import { checkClearance, wrapExtractedRecord, type ExtractedRecord } from "../scraping/clearance-engine";

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

const SEASON_GAMES = 17;
const NEUTRAL_SCHEME_FIT = 0.6; // honest neutral when we have no team environment

// Bounded, clearly model-derived QB Forward nudges. Forward grade is a 0-100
// within-pool percentile; we only act on it near the extremes so the nudge is a
// principled "elite passing environment" signal, not noise.
const QB_FORWARD_ELITE = 75; // forwardGrade at/above this counts as an elite forward prior
const QB_CEILING_NUDGE_MAX = 0.08; // up to +8% ceiling for an elite QB (the QB himself)
const PASS_CATCHER_NUDGE_MAX = 0.05; // up to +5% ceiling for a WR/TE in an elite passing env

function round(v: number, d = 0): number {
  const f = 10 ** d;
  return Math.round(v * f) / f;
}
function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

/**
 * Normalize a team abbreviation for cross-source joins. The model, team
 * environment, and QB forward all read nflverse `recent_team` / `posteam`, so the
 * codes already align in the common case — this just upper-cases and folds the
 * handful of historical relocations / spelling variants so a join never silently
 * misses (e.g. a stale "OAK" row against a current "LV" player). Unknown codes
 * pass through unchanged.
 */
function normTeam(team: string | undefined | null): string {
  const t = (team ?? "").trim().toUpperCase();
  const aliases: Record<string, string> = {
    OAK: "LV",
    SD: "LAC",
    STL: "LA",
    LAR: "LA",
    WAS: "WSH",
    WSH: "WSH",
    JAX: "JAX",
    JAC: "JAX",
    ARZ: "ARI",
    BLT: "BAL",
    CLV: "CLE",
    HST: "HOU",
  };
  return aliases[t] ?? t;
}

/**
 * Build a team -> schemeFit (0..1) map from team-environment rows. schemeFit is
 * the team's within-league OFFENSIVE quality, expressed 0..1.
 *
 * team-environment already publishes `offEpaPct` (a within-league percentile of
 * neutral-script offensive EPA/play). To be robust to the exact set of teams that
 * qualified in the current sample, we RE-RANK the supplied rows here with the
 * shared `percentileRanks` helper over offensive EPA/play and average that with
 * success-rate rank — two correlated-but-distinct reads of offensive quality —
 * so a single noisy metric can't dominate. Result is 0..1 (percentile/100).
 */
function buildSchemeFitByTeam(teamEnv: readonly TeamEnvironmentRow[]): Map<string, number> {
  const out = new Map<string, number>();
  if (teamEnv.length === 0) return out;
  const epaPcts = percentileRanks(teamEnv.map((r) => r.offEpaPerPlay));
  const successPcts = percentileRanks(teamEnv.map((r) => r.offSuccessRate));
  teamEnv.forEach((r, i) => {
    const blended = ((epaPcts[i] ?? 0) + (successPcts[i] ?? 0)) / 2; // 0..100
    out.set(normTeam(r.team), clamp01(blended / 100));
  });
  return out;
}

/** Build a team -> QB forwardGrade (0-100) map, keeping the team's best forward grade. */
function buildQbGradeByTeam(qbForward: readonly QbForwardRow[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const r of qbForward) {
    const team = normTeam(r.team);
    const prev = out.get(team);
    if (prev == null || r.forwardGrade > prev) out.set(team, r.forwardGrade);
  }
  return out;
}

/**
 * Map graded profiles (+ xFP, + team environment, + QB forward) to the rich
 * Player shape. Pure + testable.
 *
 * Projection basis is unchanged: xFP-per-game x 17 when available, else actual
 * per-game; trend from the buy/sell signal; a model-derived band + usage.
 *
 * schemeFit (0..1) is the player's TEAM offensive environment, joined by team
 * abbreviation. When `teamEnv` is absent or the team has no row, schemeFit falls
 * back to the neutral 0.6 (never fabricated).
 *
 * QB Forward is a passing-environment nudge applied to the CEILING only (never the
 * floor), and only when present:
 *   • QB whose own team forwardGrade is elite (>= 75): ceiling x (1 + up to +8%),
 *     scaled linearly from the elite threshold to a perfect 100 grade.
 *   • WR/TE on a team with an elite QB forward grade: ceiling x (1 + up to +5%),
 *     same linear scaling — a modest team-passing tailwind for pass-catchers.
 * Nudges are bounded, clearly model-derived, and fully graceful (no qbForward ->
 * no nudge).
 */
export interface GradedPoolEnrichment {
  /** FFC ADP rows keyed by `adpJoinKey(name, pos)` (see adp-source.adpByNormName). */
  readonly adpByName?: ReadonlyMap<string, FfcAdpRow>;
  /**
   * Sleeper injury flag keyed by `injuryDisplayJoinKey(name, pos, team)` —
   * DISPLAY-ONLY enrichment mapped to `Player.injuryDisplay` and consumed
   * solely by the UI badges. It never reaches `Player.injury`, so no scoring /
   * recommendation function can read it: every paid number is identical with
   * or without the flag (sleeper-api registry posture).
   */
  readonly injuryDisplayByKey?: ReadonlyMap<string, Player["injury"]>;
}

/**
 * Join key for the Sleeper display flag: normName + position + normalized team.
 * A name alone is not identity — a stale flag must never attach to a same-named
 * player at another position or on another team.
 */
export function injuryDisplayJoinKey(name: string, pos: string, team: string): string {
  return `${normName(name)}|${pos.toUpperCase()}|${normTeam(team)}`;
}

export function buildGradedPool(
  profiles: readonly PlayerProfile[],
  xfp: readonly ExpectedPointsRow[],
  teamEnv: readonly TeamEnvironmentRow[] = [],
  qbForward: readonly QbForwardRow[] = [],
  enrich: GradedPoolEnrichment = {},
): Player[] {
  const xfpByName = new Map(xfp.map((r) => [normName(r.name), r.xfpPerGame]));
  const schemeFitByTeam = buildSchemeFitByTeam(teamEnv);
  const qbGradeByTeam = buildQbGradeByTeam(qbForward);

  return profiles
    .map((p): Player | null => {
      const xfpPg = xfpByName.get(normName(p.name));
      const basis = xfpPg != null && xfpPg > 0 ? xfpPg : p.fppg; // prefer expected (predictive) over actual
      if (!(basis > 0)) return null; // no usable input -> exclude, never invent
      const proj = round(basis * SEASON_GAMES);
      const trend: Player["trend"] = p.signal === "buy-low" ? "up" : p.signal === "sell-high" ? "down" : "flat";
      const usage = p.position === "QB" ? 0 : clamp01(p.touches / Math.max(1, p.games * 18));

      // schemeFit from the team's offensive environment; neutral 0.6 fallback.
      const teamKey = normTeam(p.team);
      const teamFit = schemeFitByTeam.get(teamKey);
      const schemeFit = teamFit ?? NEUTRAL_SCHEME_FIT;

      // QB Forward passing-environment nudge -> ceiling only.
      const teamQbGrade = qbGradeByTeam.get(teamKey);
      // Linear ramp from the elite threshold (0) to a perfect 100 grade (1).
      const eliteScale =
        teamQbGrade != null && teamQbGrade >= QB_FORWARD_ELITE
          ? clamp01((teamQbGrade - QB_FORWARD_ELITE) / (100 - QB_FORWARD_ELITE))
          : 0;
      const ceilingMult =
        p.position === "QB"
          ? 1 + QB_CEILING_NUDGE_MAX * eliteScale
          : p.position === "WR" || p.position === "TE"
            ? 1 + PASS_CATCHER_NUDGE_MAX * eliteScale
            : 1;
      const ceiling = round(proj * 1.4 * ceilingMult);

      // Surface the environment context in the role / note where natural.
      const fitPct = Math.round(schemeFit * 100);
      const envBit = teamFit != null ? ` · ${teamKey} off env ${fitPct}%` : "";
      const qbBit =
        eliteScale > 0
          ? p.position === "QB"
            ? " · elite forward prior"
            : p.position === "WR" || p.position === "TE"
              ? " · elite passing env"
              : ""
          : "";
      const role = `${p.position}${p.signal === "buy-low" ? " · rising" : p.signal === "sell-high" ? " · regressing" : ""}${envBit}${qbBit}`;
      const note =
        teamFit != null
          ? `${p.note} Team offensive environment: ${teamKey} ${fitPct}th pct (neutral-script EPA).`
          : p.note;

      // Enrichment joins (facts, never the value basis): bye week + market ADP
      // from the FFC feed, keyed by name+position with a team cross-check when
      // both sides carry one — a same-named player at another position/team
      // attaches nothing. The Sleeper flag joins by name+position+team onto the
      // DISPLAY-ONLY field. Missing/mismatched join -> honest defaults (bye 0 /
      // no adp / no flag), never invented.
      const adpCandidate = enrich.adpByName?.get(adpJoinKey(p.name, p.position));
      const adpRow =
        adpCandidate != null &&
        (adpCandidate.team === "" || p.team === "" || normTeam(adpCandidate.team) === normTeam(p.team))
          ? adpCandidate
          : undefined;
      const injuryDisplay = enrich.injuryDisplayByKey?.get(injuryDisplayJoinKey(p.name, p.position, p.team));

      return {
        id: p.playerId,
        name: p.name,
        pos: p.position,
        team: p.team,
        bye: adpRow != null && adpRow.bye > 0 ? adpRow.bye : 0, // FFC bye when joined; tools' bye logic no-ops on 0
        proj,
        floor: round(proj * 0.75), // floor is never nudged
        ceiling,
        usage: Math.round(usage * 100) / 100,
        schemeFit: Math.round(schemeFit * 100) / 100,
        role,
        trend,
        // Scorers read `injury`; live rows are always "healthy" here so the
        // Sleeper join can never modulate a recommendation/trade/waiver/lineup
        // number. The live flag rides on `injuryDisplay` for the UI badge only.
        injury: "healthy",
        note,
        ...(injuryDisplay != null && injuryDisplay !== "healthy" ? { injuryDisplay } : {}),
        ...(adpRow != null ? { adp: adpRow.adp } : {}),
      };
    })
    .filter((p): p is Player => p !== null)
    .sort((a, b) => b.proj - a.proj)
    // Our-value-vs-market delta needs the final overall rank (by proj), so it is
    // computed after the sort: positive = market drafts him later than we rank
    // him (value); negative = a market reach relative to our rank.
    .map((p, i) => (p.adp != null ? { ...p, adpDelta: round(p.adp - (i + 1), 1) } : p));
}

function toProjection(p: Player): PlayerProjection {
  return { playerId: p.id, name: p.name, pos: p.pos, team: p.team, proj: p.proj, floor: p.floor, ceiling: p.ceiling, source: "live" };
}

const NFLVERSE_ATTRIBUTION = "Data via nflverse (CC-BY-4.0)";

/** Build a live ProjectionsProvider from an already-loaded graded pool. Pure. */
export function buildGradedProvider(pool: readonly Player[], fetchedAt?: string, attribution: string = NFLVERSE_ATTRIBUTION): ProjectionsProvider {
  return {
    name: "Graded · nflverse process model",
    live: true,
    fetchedAt,
    attribution,
    list: () => pool.map(toProjection),
    players: () => pool,
  };
}

export interface GradedPoolResult {
  readonly status: "live" | "source-error";
  readonly season: number;
  readonly count: number;
  readonly players: readonly Player[];
  /** Source-license attribution for every surface that displays the pool. */
  readonly attribution: string;
  readonly error: string | null;
}

/** Sleeper injury_status -> the pool's display flag. Facts only, conservative. */
function mapSleeperInjury(status: string | null | undefined): Player["injury"] {
  const s = (status ?? "").trim().toLowerCase();
  if (!s) return "healthy";
  if (s === "questionable" || s === "doubtful") return "questionable";
  return "out"; // Out / IR / PUP / Sus / NA / DNR — anything flagged harder than doubtful
}

/** Sleeper roster statuses whose stale injury_status must never flag anyone. */
function isInactiveSleeperStatus(status: string | null | undefined): boolean {
  const s = (status ?? "").trim().toLowerCase();
  return s === "inactive" || s === "retired";
}

export interface SleeperInjuryDisplay {
  /** Non-healthy DISPLAY flags keyed by `injuryDisplayJoinKey(name, pos, team)`. */
  readonly byKey: ReadonlyMap<string, Player["injury"]>;
  /** Rights envelope (RightsSnapshot inside) for the extraction; null on skip/failure. */
  readonly record: ExtractedRecord | null;
}

/**
 * Injury DISPLAY flags from Sleeper's (shared, cached) player map — enrichment
 * ONLY, per the `sleeper-api` registry posture: attribution required, never the
 * value basis, never the sole basis of a paid feature.
 *
 * Rights posture, enforced in order (mirrors the FFC adapter):
 *   1. assertIngestible("sleeper") — the legacy source-registry verdict.
 *   2. checkClearance() BEFORE any fetch — a block returns the empty map
 *      (graceful degrade, no fetch, nothing invented).
 *   3. wrapExtractedRecord() — the extraction carries a RightsSnapshot
 *      captured at extraction time.
 *
 * Join safety: keys are name+position+team, and Inactive/Retired Sleeper rows
 * are skipped so a stale injury_status can never flag an active same-named
 * player. Fully guarded — any failure returns an empty map, never invented.
 */
export async function loadSleeperInjuryDisplay(fetcher: FetchLike): Promise<SleeperInjuryDisplay> {
  const byKey = new Map<string, Player["injury"]>();
  try {
    const { assertIngestible } = await import("@sports/data-ingestion/src/source-registry");
    assertIngestible("sleeper");
    const clearance = checkClearance({
      source_id: "sleeper-api",
      mode: "public_logged_off_fact_extract",
      tool_id: "fetch-native",
      intents: ["storage", "derived_analytics"],
    });
    if (!clearance.allowed) return { byKey, record: null }; // rights gate: degrade, never bypass
    const { fetchSleeperPlayers, SLEEPER_PLAYERS_URL } = await import("../sleeper/source");
    const players = await fetchSleeperPlayers({ fetcher });
    for (const p of Object.values(players)) {
      const name = p.full_name ?? [p.first_name, p.last_name].filter(Boolean).join(" ");
      const pos = (p.position ?? "").toUpperCase();
      const team = (p.team ?? "").trim().toUpperCase();
      if (!name || !(pos === "QB" || pos === "RB" || pos === "WR" || pos === "TE")) continue;
      if (!team) continue; // no team on the Sleeper side -> no team-verified join target
      if (isInactiveSleeperStatus(p.status)) continue; // stale flags never attach
      const injury = mapSleeperInjury(p.injury_status);
      if (injury !== "healthy") byKey.set(injuryDisplayJoinKey(name, pos, team), injury);
    }
    // Envelope: the extracted facts carry the RightsSnapshot captured at
    // extraction time (throws if clearance were not granted).
    // flagged pool data is factual (player pool stats); pass "fact" so the
    // DATA_RULES gate in wrapExtractedRecord is consulted — GSE-SEC-055.
    const record = wrapExtractedRecord(clearance, SLEEPER_PLAYERS_URL, {
      flagged: Object.fromEntries(byKey),
    }, "fact");
    return { byKey, record };
  } catch {
    // enrichment only — a Sleeper failure never blocks the pool
    return { byKey: new Map(), record: null };
  }
}

/**
 * Load the model (+ optionally xFP) + QB forward + enrichment and build the
 * graded pool (no registration).
 *
 * `includeXfp` defaults FALSE — the PUBLISHED pool. ff_opportunity xFP is
 * CC-BY-SA-4.0 (share-alike), which this platform excludes for published
 * derivatives while the SA question is open, so the published basis is the pure
 * CC-BY-4.0 player model (actual per-game + process grade) and ff_opportunity is
 * not even fetched. An INTERNAL/owner surface may pass `includeXfp: true` to
 * compute the xFP-preferred basis (internal analysis is cleared by the
 * `ffverse-ffopportunity` registry entry).
 */
export async function loadGradedPool({ fetcher = fetch, includeXfp = false }: { fetcher?: FetchLike; includeXfp?: boolean } = {}): Promise<GradedPoolResult> {
  const model = await loadPlayerModel({ fetcher });
  if (model.status === "source-error") {
    return { status: "source-error", season: 0, count: 0, players: [], attribution: NFLVERSE_ATTRIBUTION, error: model.error };
  }
  // Season-consistent composition: the (internal-only) expected-points basis and
  // the QB forward prior must describe the SAME season as the process grade. They
  // publish on different cadences (nflverse player_stats vs ffverse
  // ff_opportunity), so we pin each to the model's season and only feed it when
  // status === "live" AND the season matches exactly — otherwise we drop it (xFP
  // basis falls back to the model's own per-game; no QB nudge). We never pair a
  // grade from one season with a signal from another.
  //
  // DELIBERATELY NOT loaded here: team-environment (neutral-script EPA). It reads
  // play-by-play (~40MB), which is far too heavy to fetch+parse on a serverless
  // cold start / per request — it times out in production. schemeFit therefore
  // falls back to its documented neutral default on the live path. The richer
  // team-environment schemeFit returns via a precomputed snapshot refresh (where
  // the heavy load runs with an extended budget), not on this hot path.
  const { loadQbForward } = await import("../intelligence/qb-forward");

  // Downstream loads are cheap; run them concurrently, each guarded. Enrichment
  // (FFC ADP + Sleeper injuries) is fact-joins for the UPCOMING season's draft
  // market — a failure of either degrades to no enrichment, never an error.
  const [xfp, qbForward, ffcAdp, sleeperInjury] = await Promise.all([
    includeXfp
      ? import("../intelligence/expected-points").then((m) => m.loadExpectedPoints({ fetcher, season: model.season }))
      : Promise.resolve(null),
    loadQbForward({ fetcher, season: model.season }),
    loadFfcAdp({ fetcher }),
    loadSleeperInjuryDisplay(fetcher),
  ]);

  const xfpRows = xfp && xfp.status === "live" && xfp.season === model.season ? xfp.rows : [];
  const qbForwardRows = qbForward.status === "live" && qbForward.season === model.season ? qbForward.rows : [];
  const adpByName = ffcAdp.status === "live" ? adpByNormName(ffcAdp.rows) : new Map<string, FfcAdpRow>();
  const injuryDisplayByKey = sleeperInjury.byKey;

  // teamEnv intentionally [] on the live path (see note above) -> neutral schemeFit.
  const pool = buildGradedPool(model.profiles, xfpRows, [], qbForwardRows, { adpByName, injuryDisplayByKey });
  // Attribution composes from the sources ACTUALLY joined — a failed join must
  // not over-credit, and the ffverse CC-BY-SA line rides on every (internal)
  // pool that used the xFP basis, per the registry's propagation requirement.
  const attribution = [
    NFLVERSE_ATTRIBUTION,
    ...(xfpRows.length > 0 ? [FF_OPPORTUNITY_ATTRIBUTION] : []),
    ...(adpByName.size > 0 ? [FFC_ATTRIBUTION] : []),
    ...(injuryDisplayByKey.size > 0 ? ["rosters/injury via Sleeper"] : []),
  ].join(" · ");
  return { status: "live", season: model.season, count: pool.length, players: pool, attribution, error: null };
}

/**
 * Founder/server hook: load + register the graded provider so the tools go live
 * (only takes effect when PROJECTIONS_PROVIDER is also set — the env gate). A
 * source-error model registers nothing (the tools stay on the illustrative pool).
 * Always the PUBLISHED pool: xFP stays excluded (see loadGradedPool).
 */
export async function loadAndRegisterGradedProvider({ fetcher = fetch }: { fetcher?: FetchLike } = {}): Promise<GradedPoolResult> {
  const result = await loadGradedPool({ fetcher });
  registerProjectionsProvider(result.status === "live" && result.players.length > 0 ? buildGradedProvider(result.players, new Date().toISOString(), result.attribution) : null);
  return result;
}
