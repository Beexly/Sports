/**
 * Player Dossier — the full-spectrum synthesis for ONE player.
 *
 * The coverage doc flagged a real gap: we ingest a deep NFL data stack (the GSE
 * Rating, Next Gen tracking, PFR pressure/coverage charting, FTN play-design,
 * snap share, scoring-zone, the combine athletic prior, the injury report, the
 * Sleeper market) — but nothing JOINED it for a single player. Every surface was
 * a leaderboard. This module is the join: given one player id, it assembles EVERY
 * available signal we hold on that player into one serializable `PlayerDossier`.
 *
 * THE SPINE is the GSE Rating. We resolve the player from the canonical player
 * model (loadPlayerModel) — we never recompute the grade; the number and its
 * buy/sell signal are owned by player-model.ts. ratingWhy() narrates it. Then we
 * hang each domain section off that identity.
 *
 * JOIN KEYS — honest about the two id namespaces in the stack:
 *   • GSIS id (the player model's playerId): Next Gen Stats, scoring-zone,
 *     injury report all key on the same gsis id, so those join directly.
 *   • PFR id / name-only sources: PFR pressure-coverage + snap-share are keyed by
 *     pfr_player_id (a DIFFERENT namespace), and the combine + Sleeper carry no
 *     gsis id at all. Those join on a normalized name (+ team where present). A
 *     name join is best-effort; when it can't resolve we show an honest gap, never
 *     a guessed row.
 *
 * INTEGRITY: no fabricated data. Every domain section is nullable; a missing
 * source or an unresolved join yields `null` (the page renders an honest empty
 * state), not a zero or an invented value. canPublishProjections stays false —
 * this is a synthesis of what HAS happened, not a forward projection or a pick.
 *
 * SERVER MODULE: composes the existing server loaders (each does its own fetch +
 * failover + cache) and returns a flat serializable result. No functions cross
 * the RSC boundary; the page owns all render functions.
 */

import { latestNflverseInspectionSeason } from "@/lib/trends/nflverse-readiness";
import { ratingTier, type RatingTierLabel, type SignalTone } from "./colors";
import { ratingWhy } from "./rating-why";
import { normalizePlayerName } from "@/lib/nflverse/entities";
import {
  loadPlayerModel,
  type ModelPosition,
  type PlayerProfile,
  type ProcessSignal,
} from "./player-model";
import {
  loadNflverseNextGenStats,
  type NgsReceivingLine,
  type NgsPassingLine,
  type NgsRushingLine,
} from "@/lib/nflverse/next-gen-stats";
import {
  loadNflversePressureCoverage,
  type QbPressureRow,
  type ReceivingAdvancedRow,
} from "@/lib/nflverse/pressure-coverage";
import { loadPlayDesign, type PlayDesignQbRow } from "./play-design";
import { loadNflverseSnapShare, type SnapShareRow } from "@/lib/nflverse/snap-share";
import { loadScoringZone, type ScoringZoneRow } from "./scoring-zone";
import { loadNflverseCombine, type CombineRow } from "@/lib/nflverse/combine";
import { loadNflverseInjuryReport, type InjuryRow } from "@/lib/nflverse/injury-report";
import {
  loadSleeperMarketSignal,
  type SleeperTrendingPlayer,
} from "@/lib/sleeper/market-signal";

// ── Serializable section shapes ──────────────────────────────────────────────
// Every field a number | string | null so the whole dossier crosses the RSC
// boundary cleanly. Null always means "we don't hold this", never zero.

/** The GSE Rating headline — the spine. Always present when the player resolves. */
export interface DossierRating {
  readonly grade: number;
  readonly tierLabel: RatingTierLabel;
  readonly tierTone: SignalTone;
  readonly productionPct: number;
  readonly signal: ProcessSignal;
  /** The result-framed "why" sentence — narrated from real drivers, never recomputed. */
  readonly why: string;
  /** The model's own one-line note (buy/sell/in-line). */
  readonly note: string;
}

/** Usage / opportunity — how big is the role. */
export interface DossierUsage {
  readonly games: number;
  readonly touches: number;
  readonly wopr: number | null;
  readonly targetShare: number | null;
  readonly snapSharePct: number | null; // 0..1 (name+team join → PFR snap counts)
  readonly snapsPerGame: number | null;
  readonly rzShare: number | null; // 0..1 share of team scoring-zone looks
}

/** Efficiency + tracking — the quality of the role's output. */
export interface DossierEfficiency {
  readonly epaPerPlay: number; // from the model (always present)
  readonly dakota: number | null;
  readonly pacr: number | null;
  // Next Gen tracking, by role (only the relevant block is populated):
  readonly avgSeparation: number | null; // receivers — yards of separation
  readonly avgYacAboveExpectation: number | null; // receivers — YAC over expected
  readonly catchPct: number | null; // receivers
  readonly cpoe: number | null; // QBs — completion % over expected
  readonly avgTimeToThrow: number | null; // QBs — seconds
  readonly ryoePerAtt: number | null; // RBs — rush yards over expected / attempt
  readonly pctStackedBox: number | null; // RBs — % vs 8+ box
  // PFR receiver charting (name+team join):
  readonly adot: number | null; // average depth of target
  readonly dropPct: number | null; // 0..1
}

/** Role / scheme — how the offense uses this player (QB-centric, via play-design). */
export interface DossierRole {
  readonly playActionRate: number | null; // 0..1
  readonly rpoRate: number | null; // 0..1
  readonly screenRate: number | null; // 0..1
  readonly motionRate: number | null; // 0..1
  readonly noHuddleRate: number | null; // 0..1
  readonly avgBlitzersFaced: number | null;
  // QB pressure environment (name+team join → PFR pass charting):
  readonly pressurePct: number | null; // 0..1 share of dropbacks pressured
  readonly pocketTime: number | null; // seconds
  readonly paPassAtt: number | null; // play-action attempts (count)
}

/** Situational — scoring-zone (inside the 20) equity, the TD-driver context. */
export interface DossierSituational {
  readonly rzCarries: number;
  readonly rzTargets: number;
  readonly inside5: number; // the highest-equity looks
  readonly rzTds: number;
  readonly tdRate: number; // 0..1 raw
  readonly expectedTdRate: number; // 0..1 regressed
  readonly signal: "buy" | "sell" | "in-line";
  readonly rzEpaPerOpp: number | null;
}

/** Athletic prior — the combine measurements (name+position join; no id in source). */
export interface DossierAthletic {
  readonly draftYear: number;
  readonly heightIn: string;
  readonly weight: number | null;
  readonly forty: number | null;
  readonly vertical: number | null;
  readonly broadJump: number | null;
  readonly cone: number | null;
  readonly shuttle: number | null;
  readonly bench: number | null;
}

/** Availability — the official injury designation (gsis id join). */
export interface DossierAvailability {
  readonly reportStatus: "Out" | "Doubtful" | "Questionable" | "Other";
  readonly primaryInjury: string;
  readonly practiceStatus: string;
  readonly week: number | null;
}

/** Market — live Sleeper crowd sentiment (name+team join). */
export interface DossierMarket {
  readonly direction: "adding" | "dropping";
  readonly count: number; // leagues moving the player in the window
  readonly lookbackHours: number;
}

/** A domain whose underlying source could not be reached vs. one with no row. */
export type SectionState = "ok" | "missing" | "source-error";

/** A nullable section paired with WHY it is null — so the page can distinguish
 *  "the source is down" from "we hold nothing for this player here". */
export interface DossierSection<T> {
  readonly state: SectionState;
  readonly value: T | null;
}

export interface PlayerDossier {
  readonly generatedAt: string;
  /** "ok" once the player resolves in the model; "not-found" / "source-error" otherwise. */
  readonly status: "ok" | "not-found" | "source-error";
  readonly season: number;
  readonly throughWeek: number | null;
  readonly playerId: string;
  readonly name: string;
  readonly team: string;
  readonly position: ModelPosition | null;
  readonly rating: DossierRating | null;
  readonly usage: DossierSection<DossierUsage>;
  readonly efficiency: DossierSection<DossierEfficiency>;
  readonly role: DossierSection<DossierRole>;
  readonly situational: DossierSection<DossierSituational>;
  readonly athletic: DossierSection<DossierAthletic>;
  readonly availability: DossierSection<DossierAvailability>;
  readonly market: DossierSection<DossierMarket>;
  readonly canPublishProjections: false;
  readonly note: string;
  readonly error: string | null;
}

// ── Join helpers ─────────────────────────────────────────────────────────────

/** Normalize a player name for the name-only joins (combine / Sleeper) and the
 *  PFR-id sources (pressure-coverage / snap-share), which live in a different id
 *  namespace than the gsis-keyed model. Canonical impl in lib/nflverse/entities. */
const nameKey = normalizePlayerName;

/** Wrap a loader result as a section: a thrown/rejected load → source-error,
 *  a resolved-but-empty match → missing, a real row → ok. */
function section<T>(state: SectionState, value: T | null): DossierSection<T> {
  return { state, value };
}

/** A settled load: ok carries the value, err carries the reason. Keeps one bad
 *  source from taking the whole dossier down (Promise.allSettled semantics). */
type Settled<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly reason: unknown };

function settle<T>(p: Promise<T>): Promise<Settled<T>> {
  return p.then(
    (value) => ({ ok: true as const, value }),
    (reason) => ({ ok: false as const, reason }),
  );
}

/** Resolve the canonical player profile by gsis id from the loaded model. */
function findProfile(profiles: readonly PlayerProfile[], playerId: string): PlayerProfile | null {
  return profiles.find((p) => p.playerId === playerId) ?? null;
}

// ── Section builders ─────────────────────────────────────────────────────────
// Each takes the settled load + the resolved profile and returns a DossierSection.
// They NEVER fabricate: an unreachable source → source-error; a reached source
// with no matching row → missing; a real match → ok.

function buildUsage(
  profile: PlayerProfile,
  snaps: Settled<Awaited<ReturnType<typeof loadNflverseSnapShare>>>,
  rz: ScoringZoneRow | null,
): DossierSection<DossierUsage> {
  // Snap share lives on PFR snap counts (pfr id) → name+team join.
  let snapRow: SnapShareRow | null = null;
  if (snaps.ok && snaps.value.status !== "source-error") {
    const key = nameKey(profile.name);
    const team = profile.team;
    const groups = snaps.value.leaders;
    for (const pos of Object.keys(groups) as (keyof typeof groups)[]) {
      const hit = groups[pos].find((r) => nameKey(r.playerName) === key && (!team || r.team === team));
      if (hit) {
        snapRow = hit;
        break;
      }
    }
  }

  const value: DossierUsage = {
    games: profile.games,
    touches: profile.touches,
    wopr: profile.wopr,
    targetShare: profile.targetShare,
    snapSharePct: snapRow?.snapSharePct ?? null,
    snapsPerGame: snapRow?.snapsPerGame ?? null,
    rzShare: rz?.rzShare ?? null,
  };
  // Usage is always meaningful: the model itself supplies games / touches / WOPR /
  // target share, so the section is "ok". A missing snap-share or RZ join shows as
  // an honest dash inside the card rather than failing the whole section.
  return section("ok", value);
}

function buildEfficiency(
  profile: PlayerProfile,
  ngs: Settled<Awaited<ReturnType<typeof loadNflverseNextGenStats>>>,
  pc: Settled<Awaited<ReturnType<typeof loadNflversePressureCoverage>>>,
): DossierSection<DossierEfficiency> {
  // Next Gen tracking joins on gsis id; pick the block that matches the role.
  let rec: NgsReceivingLine | null = null;
  let pass: NgsPassingLine | null = null;
  let rush: NgsRushingLine | null = null;
  let ngsErrored = false;
  if (!ngs.ok || ngs.value.status === "source-error") {
    ngsErrored = true;
  } else {
    const id = profile.playerId;
    rec = ngs.value.receiving.find((r) => r.playerId === id) ?? null;
    pass = ngs.value.passing.find((r) => r.playerId === id) ?? null;
    rush = ngs.value.rushing.find((r) => r.playerId === id) ?? null;
  }

  // PFR receiver charting joins on a normalized name (pfr id namespace).
  let recAdv: ReceivingAdvancedRow | null = null;
  let pcErrored = false;
  if (!pc.ok || pc.value.status === "source-error") {
    pcErrored = true;
  } else {
    const key = nameKey(profile.name);
    recAdv =
      pc.value.receivingAdvanced.find((r) => nameKey(r.name) === key && (!profile.team || r.team === profile.team)) ??
      null;
  }

  const value: DossierEfficiency = {
    epaPerPlay: profile.epaPerPlay,
    dakota: profile.dakota,
    pacr: profile.pacr,
    avgSeparation: rec?.avgSeparation ?? null,
    avgYacAboveExpectation: rec?.avgYacAboveExpectation ?? null,
    catchPct: rec?.catchPct ?? null,
    cpoe: pass?.cpoe ?? null,
    avgTimeToThrow: pass?.avgTimeToThrow ?? null,
    ryoePerAtt: rush?.ryoePerAtt ?? null,
    pctStackedBox: rush?.pctStackedBox ?? null,
    adot: recAdv?.adot ?? null,
    dropPct: recAdv?.dropPct ?? null,
  };
  // The model always supplies epaPerPlay, so the section is "ok"; flag source-error
  // only if BOTH tracking sources were unreachable (then the deep fields are dark).
  return section(ngsErrored && pcErrored ? "source-error" : "ok", value);
}

function buildRole(
  profile: PlayerProfile,
  design: Settled<Awaited<ReturnType<typeof loadPlayDesign>>>,
  pc: Settled<Awaited<ReturnType<typeof loadNflversePressureCoverage>>>,
): DossierSection<DossierRole> {
  // Play design + QB pressure are QB-centric reads. For non-QBs there is no
  // per-player scheme attribution, so the section is an honest "missing".
  if (profile.position !== "QB") {
    return section<DossierRole>("missing", null);
  }

  let qbDesign: PlayDesignQbRow | null = null;
  let designErrored = false;
  if (!design.ok || design.value.status === "source-error") {
    designErrored = true;
  } else {
    qbDesign = design.value.qbs.find((q) => q.playerId === profile.playerId) ?? null;
  }

  let qbPressure: QbPressureRow | null = null;
  let pcErrored = false;
  if (!pc.ok || pc.value.status === "source-error") {
    pcErrored = true;
  } else {
    const key = nameKey(profile.name);
    qbPressure =
      pc.value.qbPressure.find((r) => nameKey(r.name) === key && (!profile.team || r.team === profile.team)) ?? null;
  }

  if (qbDesign == null && qbPressure == null) {
    return section<DossierRole>(designErrored && pcErrored ? "source-error" : "missing", null);
  }

  const value: DossierRole = {
    playActionRate: qbDesign?.playActionRate ?? null,
    rpoRate: qbDesign?.rpoRate ?? null,
    screenRate: qbDesign?.screenRate ?? null,
    motionRate: qbDesign?.motionRate ?? null,
    noHuddleRate: qbDesign?.noHuddleRate ?? null,
    avgBlitzersFaced: qbDesign?.avgBlitzersFaced ?? null,
    pressurePct: qbPressure?.pressurePct ?? null,
    pocketTime: qbPressure?.pocketTime ?? null,
    paPassAtt: qbPressure?.paPassAtt ?? null,
  };
  return section("ok", value);
}

function buildSituational(rz: ScoringZoneRow | null, errored: boolean): DossierSection<DossierSituational> {
  if (rz == null) return section<DossierSituational>(errored ? "source-error" : "missing", null);
  const value: DossierSituational = {
    rzCarries: rz.rzCarries,
    rzTargets: rz.rzTargets,
    inside5: rz.inside5,
    rzTds: rz.rzTds,
    tdRate: rz.tdRate,
    expectedTdRate: rz.expectedTdRate,
    signal: rz.signal,
    rzEpaPerOpp: rz.rzEpaPerOpp,
  };
  return section("ok", value);
}

function buildAthletic(
  profile: PlayerProfile,
  combine: Settled<Awaited<ReturnType<typeof loadNflverseCombine>>>,
): DossierSection<DossierAthletic> {
  if (!combine.ok || combine.value.status === "source-error") return section<DossierAthletic>("source-error", null);
  const key = nameKey(profile.name);
  // The combine file carries no team; match on name + position only, preferring
  // the most recent draft class when a name repeats.
  const pool: readonly CombineRow[] = combine.value.latestClass.concat(combine.value.fastestForty);
  const hits = pool
    .filter((r) => nameKey(r.name) === key && r.position.toUpperCase() === profile.position)
    .sort((a, b) => b.draftYear - a.draftYear);
  const hit = hits[0] ?? null;
  if (hit == null) return section<DossierAthletic>("missing", null);
  const value: DossierAthletic = {
    draftYear: hit.draftYear,
    heightIn: hit.heightIn,
    weight: hit.weight,
    forty: hit.forty,
    vertical: hit.vertical,
    broadJump: hit.broadJump,
    cone: hit.cone,
    shuttle: hit.shuttle,
    bench: hit.bench,
  };
  return section("ok", value);
}

function buildAvailability(
  profile: PlayerProfile,
  injury: Settled<Awaited<ReturnType<typeof loadNflverseInjuryReport>>>,
): DossierSection<DossierAvailability> {
  if (!injury.ok || injury.value.status === "source-error") return section<DossierAvailability>("source-error", null);
  // Injury report keys on gsis id (the same namespace as the model).
  const hit: InjuryRow | null = injury.value.rows.find((r) => r.playerId === profile.playerId) ?? null;
  if (hit == null) return section<DossierAvailability>("missing", null); // no designation == healthy/unreported
  const value: DossierAvailability = {
    reportStatus: hit.reportStatus,
    primaryInjury: hit.primaryInjury,
    practiceStatus: hit.practiceStatus,
    week: injury.value.week,
  };
  return section("ok", value);
}

function buildMarket(
  profile: PlayerProfile,
  market: Settled<Awaited<ReturnType<typeof loadSleeperMarketSignal>>>,
): DossierSection<DossierMarket> {
  if (!market.ok || market.value.status === "source-error") return section<DossierMarket>("source-error", null);
  const key = nameKey(profile.name);
  const matches = (r: SleeperTrendingPlayer): boolean =>
    nameKey(r.name) === key && (!profile.team || r.team === profile.team || r.team === "FA");
  const add = market.value.adds.find(matches) ?? null;
  const drop = market.value.drops.find(matches) ?? null;
  // Prefer whichever direction shows the larger crowd move; many players appear
  // on neither board (honest missing).
  if (add == null && drop == null) return section<DossierMarket>("missing", null);
  const useAdd = (add?.count ?? -1) >= (drop?.count ?? -1);
  const chosen = useAdd ? add : drop;
  if (chosen == null) return section<DossierMarket>("missing", null);
  const value: DossierMarket = {
    direction: useAdd ? "adding" : "dropping",
    count: chosen.count,
    lookbackHours: market.value.lookbackHours,
  };
  return section("ok", value);
}

// ── Public loader ────────────────────────────────────────────────────────────

/**
 * loadPlayerDossier — assemble the full dossier for one player id.
 *
 * Loads the canonical player model first (the spine + the join keys). If the
 * model can't be reached, the whole dossier is a source-error. If it loads but
 * the id isn't in the graded pool, the dossier is "not-found" (the page shows an
 * honest "not in the graded pool" state). Otherwise every domain source is loaded
 * in parallel (allSettled — one slow/broken source can't take the page down) and
 * joined onto the resolved profile.
 *
 * @param playerId the gsis player id (the model's playerId)
 */
export async function loadPlayerDossier(
  playerId: string,
  { season = latestNflverseInspectionSeason() }: { season?: number } = {},
): Promise<PlayerDossier> {
  const now = new Date().toISOString();
  const empty = <T>(state: SectionState): DossierSection<T> => section<T>(state, null);

  // 1) The spine: the canonical model. Failure here is the only hard failure.
  let modelSettled: Settled<Awaited<ReturnType<typeof loadPlayerModel>>>;
  try {
    modelSettled = await settle(loadPlayerModel({ season }));
  } catch (error) {
    modelSettled = { ok: false, reason: error };
  }

  if (!modelSettled.ok || modelSettled.value.status === "source-error") {
    const error =
      !modelSettled.ok
        ? modelSettled.reason instanceof Error
          ? modelSettled.reason.message
          : "UNKNOWN"
        : modelSettled.value.error ?? "UNKNOWN";
    return {
      generatedAt: now,
      status: "source-error",
      season: 0,
      throughWeek: null,
      playerId,
      name: "",
      team: "",
      position: null,
      rating: null,
      usage: empty("source-error"),
      efficiency: empty("source-error"),
      role: empty("source-error"),
      situational: empty("source-error"),
      athletic: empty("source-error"),
      availability: empty("source-error"),
      market: empty("source-error"),
      canPublishProjections: false,
      note: "The player model could not load from nflverse, so the dossier shows an empty state instead of fabricated data.",
      error,
    };
  }

  const model = modelSettled.value;
  const profile = findProfile(model.profiles, playerId);
  if (profile == null) {
    return {
      generatedAt: now,
      status: "not-found",
      season: model.season,
      throughWeek: model.throughWeek,
      playerId,
      name: "",
      team: "",
      position: null,
      rating: null,
      usage: empty("missing"),
      efficiency: empty("missing"),
      role: empty("missing"),
      situational: empty("missing"),
      athletic: empty("missing"),
      availability: empty("missing"),
      market: empty("missing"),
      canPublishProjections: false,
      note: "This player isn't in the current graded pool — we only carry a GSE Rating for qualified skill players this season.",
      error: null,
    };
  }

  // 2) Every domain source in parallel; one failure cannot fail the dossier.
  const [ngs, pc, design, snaps, scoring, combine, injury, market] = await Promise.all([
    settle(loadNflverseNextGenStats({ season })),
    settle(loadNflversePressureCoverage({ season })),
    settle(loadPlayDesign({ season })),
    settle(loadNflverseSnapShare({ season })),
    settle(loadScoringZone({ season })),
    settle(loadNflverseCombine()),
    settle(loadNflverseInjuryReport({ season })),
    settle(loadSleeperMarketSignal()),
  ]);

  // Scoring-zone row is shared by usage (rzShare) and situational; resolve once.
  const scoringErrored = !scoring.ok || scoring.value.status === "source-error";
  const rzRow: ScoringZoneRow | null = scoringErrored
    ? null
    : scoring.value.rows.find((r) => r.playerId === profile.playerId) ?? null;

  const rating: DossierRating = {
    grade: profile.processGrade,
    tierLabel: ratingTier(profile.processGrade).label,
    tierTone: ratingTier(profile.processGrade).tone,
    productionPct: profile.productionPct,
    signal: profile.signal,
    why: ratingWhy(profile),
    note: profile.note,
  };

  return {
    generatedAt: now,
    status: "ok",
    season: model.season,
    throughWeek: model.throughWeek,
    playerId: profile.playerId,
    name: profile.name,
    team: profile.team,
    position: profile.position,
    rating,
    usage: buildUsage(profile, snaps, rzRow),
    efficiency: buildEfficiency(profile, ngs, pc),
    role: buildRole(profile, design, pc),
    situational: buildSituational(rzRow, scoringErrored),
    athletic: buildAthletic(profile, combine),
    availability: buildAvailability(profile, injury),
    market: buildMarket(profile, market),
    canPublishProjections: false,
    note: "Every signal we hold on this player, joined onto the GSE Rating. A synthesis of what has happened — not a projection or a pick.",
    error: null,
  };
}
