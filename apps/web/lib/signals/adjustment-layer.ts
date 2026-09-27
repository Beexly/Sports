/**
 * Total-signal adjustment layer v1 — the piece the spec calls the highest
 * leverage build, because it improves PROJECTIONS, and every consumer
 * (optimizer, picks, props, parlays) eats projections.
 *
 * THE SPEC'S SHAPE, KEPT LITERALLY. Every rule is
 *   TRIGGER -> AFFECTED -> DIRECTION -> MAGNITUDE -> LOG.
 * The repo checked before building: there is NO injury->projection logic in the
 * codebase today (`git grep` for an adjustment layer over injuries/depth charts
 * returns nothing), so this is new code, not a rewrite.
 *
 * THE ONE RULE THIS MODULE WILL NOT BREAK. Magnitudes here are
 * `DEFAULT_MAGNITUDES` — STRUCTURED DEFAULTS, explicitly labelled uncalibrated,
 * and every emitted adjustment carries `calibrated: false`. They are the shape
 * the spec fixes; the backtest is what fixes the numbers. A caller that has a
 * measured magnitude passes it in and the flag flips to true. Nothing here may
 * present an uncalibrated magnitude to a customer as a measurement — see
 * `grounded-reasoning.ts` for the same rule on the narration side.
 *
 * Pure and db-free: rows in, adjustments out, no wall clock (a caller injects
 * `now` so the same inputs replay identically).
 */

/** Spec taxonomy §"Signal taxonomy v1". */
export type AdjustmentCategory =
  | "OL_INJURY"
  | "SECONDARY_INJURY"
  | "PASS_RUSH_INJURY"
  | "DEPTH_CHART"
  | "WEATHER"
  | "GAME_SCRIPT";

/** What a trigger does to an affected entity. */
export type AdjustmentDirection = "UP" | "DOWN" | "NONE";

/** Spec §1-§7 named the metric each rule moves. Kept as a closed union so a
 * typo is a compile error rather than a silently-unmatched adjustment. */
export type AdjustmentTarget =
  | "passing_yards"
  | "passing_tds"
  | "pass_attempts"
  | "rushing_yards"
  | "rushing_attempts"
  | "target_share"
  | "checkdown_share"
  | "team_pass_rate"
  | "implied_total"
  | "fantasy_points"
  | "time_to_throw"
  | "defense_points_allowed";

export type Position = "QB" | "RB" | "WR" | "TE" | "OL" | "S" | "CB" | "EDGE" | "DST" | "UNK";

/**
 * What the caller can see about a player on a given week. Structurally typed so
 * the loaded rows satisfy it without importing a DB type.
 */
export interface PlayerContext {
  readonly playerId: string;
  readonly name?: string | null;
  readonly position?: string | null;
  readonly team?: string | null;
  readonly opponent?: string | null;
  /** 0 = season-aggregate, otherwise a real game week. */
  readonly season?: number | null;
  readonly week?: number | null;
  /** True when the player is absent (ruled out). */
  readonly isOut?: boolean;
  /** True when the player is limited/doubtful/questionable. */
  readonly isLimited?: boolean;
  /** True when the player is a full participant. */
  readonly isActive?: boolean;
  /** Depth-chart rank; 1 = starter. */
  readonly depthRank?: number | null;
  /** Snap share, 0..1. */
  readonly snapShare?: number | null;
}

export interface InjuryContext {
  readonly playerId: string;
  readonly status: "OUT" | "DOUBTFUL" | "QUESTIONABLE" | "PROBABLE" | "ACTIVE" | "UNKNOWN";
  readonly position?: string | null;
  readonly team?: string | null;
  readonly primaryInjury?: string | null;
  readonly reportStatus?: string | null;
  readonly practiceStatus?: string | null;
}

export interface Adjustment {
  /** Stable id so the same trigger logs the same key twice. */
  readonly id: string;
  readonly rule: string;
  readonly category: AdjustmentCategory;
  /** The player/entity the adjustment MOVES. */
  readonly affectedPlayerId: string;
  readonly affectedName?: string | null;
  readonly affectedPosition: Position;
  readonly target: AdjustmentTarget;
  readonly direction: AdjustmentDirection;
  /**
   * The proposed change in the target's natural unit, signed by direction.
   * Uncalibrated unless `calibrated` is true.
   */
  readonly magnitude: number;
  /**
   * FALSE unless the caller supplied a measured magnitude. The consumer must
   * not present a false one as a measurement.
   */
  readonly calibrated: boolean;
  /** The spec's LOG: what fired, and what it was derived from. */
  readonly evidence: AdjustmentEvidence;
}

export interface AdjustmentEvidence {
  readonly rule: string;
  readonly triggered: boolean;
  readonly triggerDetail: string;
  /** The entity that caused the trigger (the absent player), when different. */
  readonly triggerPlayerId?: string | null;
  readonly triggerPlayerName?: string | null;
  readonly inputs: Readonly<Record<string, string | number | boolean | null>>;
  /** True when the rule matched but the resulting magnitude is zero. */
  readonly inert?: boolean;
}

// ── Position parsing ───────────────────────────────────────────────────────

const POSITION_MAP: Readonly<Record<string, Position>> = {
  QB: "QB", PG: "QB",
  RB: "RB", HB: "RB", FB: "RB",
  WR: "WR", FL: "WR",
  TE: "TE",
  // Offensive line
  LT: "OL", RT: "OL", LG: "OL", RG: "OL", C: "OL", OL: "OL", T: "OL", G: "OL",
  // Secondary
  S: "S", FS: "S", SS: "S", DB: "S", CB: "CB",
  // Pass rush
  EDGE: "EDGE", DE: "EDGE", DL: "EDGE", OLB: "EDGE", LB: "EDGE",
  K: "DST", P: "DST", DST: "DST",
};

export function parsePosition(raw: string | null | undefined): Position {
  if (!raw) return "UNK";
  return POSITION_MAP[raw.trim().toUpperCase()] ?? "UNK";
}

// ── Structured default magnitudes (UNCALIBRATED — see the header) ──────────

/**
 * Spec §1-§7. These are the SHAPE of the effect, not its measured size. Every
 * one is `calibrated: false` until a backtest replaces it. Overriding any of
 * them through `magnitudes` is how a caller supplies a measured number.
 */
export const DEFAULT_MAGNITUDES = {
  /** §1 starting OL out: more pressure, slightly less passing efficiency. */
  OL_INJURY_QB_PASSING_YARDS: -3.0,
  OL_INJURY_RB_YBC_EFFICIENCY: -0.04,
  /** §1 the pressure outlet: a checkdown to the back is worth a little. */
  OL_INJURY_RB_CHECKDOWN: 0.02,
  OL_INJURY_TEAM_PASS_RATE: -0.01,

  /** §2 starting safety out: more throwing lanes, a softer secondary. */
  SECONDARY_INJURY_QB_PASSING_YARDS: 3.5,
  SECONDARY_INJURY_WR_FANTASY: 2.5,
  SECONDARY_INJURY_TE_FANTASY: 1.5,
  SECONDARY_INJURY_DST_ALLOWED: 3.0,
  SECONDARY_INJURY_OPP_IMPLIED_TOTAL: 0.5,

  /** §3 pass-rush injury: more time to throw for the opposing passer. */
  PASS_RUSH_INJURY_QB_PASSING_YARDS: 2.5,
  PASS_RUSH_INJURY_WR_FANTASY: 2.0,
  PASS_RUSH_INJURY_TIME_TO_THROW: -0.02,

  /** §4 a promoted backup inherits the starter's share, not all of it. */
  DEPTH_CHART_PROMOTION_SHARE: 0.12,

  /** §5 sustained wind. Spec: pass attempts down, run rate up. */
  WEATHER_WIND_PASS_ATTEMPTS: -0.04,
  WEATHER_WIND_RUN_RATE: 0.05,

  /** §6 garbage time is NOT role change, so the magnitude stays small. */
  GAME_SCRIPT_TRAILING_PASS_UP: 0.04,
} as const;

export type MagnitudeKey = keyof typeof DEFAULT_MAGNITUDES;
export type Magnitudes = Partial<Record<MagnitudeKey, number>> & Record<string, number | undefined>;

// ── Rule engine ────────────────────────────────────────────────────────────

export interface AdjustmentContext {
  /** Injured/absent players, already reduced to this week. */
  readonly injuries?: readonly InjuryContext[];
  /** Players on the slate, with depth/snap context where known. */
  readonly players?: readonly PlayerContext[];
  /** One entry per starter in a position group, when a depth chart exists. */
  readonly starters?: readonly PlayerContext[];
  /** Weather already measured by the ingestion lane; never invented here. */
  readonly weather?: { readonly sustainedWindMph?: number | null } | null;
  /** Vegas/game-script context, when a measured line exists. */
  readonly gameScript?: { readonly spread?: number | null; readonly total?: number | null } | null;
  /** Measured magnitudes, by key. Anything here flips `calibrated` to true. */
  readonly magnitudes?: Magnitudes;
  /** Injected clock. Never `new Date()` inside this module. */
  readonly now: string;
}

const DEFAULT_CTX: Omit<AdjustmentContext, "now"> = {
  injuries: [], players: [], starters: [], weather: null, gameScript: null,
};

/** Is the absence severe enough for the rule to fire at full strength? */
function absenceStrength(status: InjuryContext["status"]): number {
  switch (status) {
    case "OUT": return 1;
    // §1-§3 treat a limited player as a partial version of the same problem.
    case "DOUBTFUL": return 0.6;
    case "QUESTIONABLE": return 0.4;
    case "PROBABLE": return 0.15;
    default: return 0;
  }
}

function isOffensiveLine(pos: Position): boolean { return pos === "OL"; }
function isSecondary(pos: Position): boolean { return pos === "S" || pos === "CB"; }
function isPassRush(pos: Position): boolean { return pos === "EDGE"; }

export function computeAdjustments(ctx: AdjustmentContext): Adjustment[] {
  const c: Omit<AdjustmentContext, "now"> = { ...DEFAULT_CTX, ...ctx };
  const out: Adjustment[] = [];
  const players = c.players ?? [];
  const starters = c.starters ?? [];
  // The magnitude is the CALLER's value when supplied, else the labelled
  // UNCALIBRATED default. It deliberately does not read `calibratedKeys`:
  // whether a value is calibrated is reported per adjustment by `isCal`, and a
  // magnitude lookup that could see the calibration set would be a second,
  // quieter place where that claim is made.
  const mag = (k: MagnitudeKey): number => c.magnitudes?.[k] ?? DEFAULT_MAGNITUDES[k];
  // A key counts as calibrated only when the caller EXPLICITLY supplied it.
  const calibratedKeys = new Set(Object.keys(c.magnitudes ?? {}));
  const isCal = (k: string) => calibratedKeys.has(k);

  const byTeam = new Map<string, PlayerContext[]>();
  // Rules §2 and §3 adjust the OPPOSING offense, so they need a roster keyed
  // by the team a player is FACING, not by the team they play for. Indexing
  // only by `p.team` silently produced an empty opponent set and the rules
  // never fired.
  const byOpponent = new Map<string, PlayerContext[]>();
  for (const p of players) {
    if (p.team) {
      const arr = byTeam.get(p.team);
      if (arr) arr.push(p); else byTeam.set(p.team, [p]);
    }
    if (p.opponent) {
      const arr = byOpponent.get(p.opponent);
      if (arr) arr.push(p); else byOpponent.set(p.opponent, [p]);
    }
  }
  const outById = new Map(players.map((p) => [p.playerId, p]));

  const mk = (a: Omit<Adjustment, "calibrated"> & { magKey: string }): Adjustment => {
    const { magKey, ...rest } = a;
    return { ...rest, calibrated: isCal(magKey) };
  };

  for (const inj of c.injuries ?? []) {
    const strength = absenceStrength(inj.status);
    if (strength <= 0) continue;
    const pos = parsePosition(inj.position);
    const team = inj.team ?? null;
    if (!team) continue;
    const mates = byTeam.get(team) ?? [];
    const triggerName = outById.get(inj.playerId)?.name ?? null;

    // ── §1 Offensive-line injuries ────────────────────────────────────────
    if (isOffensiveLine(pos)) {
      for (const m of mates) {
        const mp = parsePosition(m.position);
        if (mp === "QB") {
          out.push(mk({
            id: `ol:${inj.playerId}:qb:${m.playerId}`,
            rule: "OL_INJURY_QB", category: "OL_INJURY",
            affectedPlayerId: m.playerId, affectedName: m.name, affectedPosition: mp,
            target: "passing_yards", direction: "DOWN",
            magnitude: mag("OL_INJURY_QB_PASSING_YARDS") * strength,
            evidence: {
              rule: "spec §1 — starting lineman absent reduces QB passing efficiency",
              triggered: true,
              triggerDetail: `${pos} absent (${inj.status}), strength ${strength.toFixed(2)}`,
              triggerPlayerId: inj.playerId, triggerPlayerName: triggerName,
              inputs: { position: pos, status: inj.status, strength },
            },
          
        magKey: "OL_INJURY_QB_PASSING_YARDS",}));
        } else if (mp === "RB") {
          out.push(mk({
            id: `ol:${inj.playerId}:rb:${m.playerId}`,
            rule: "OL_INJURY_RB", category: "OL_INJURY",
            affectedPlayerId: m.playerId, affectedName: m.name, affectedPosition: mp,
            target: "checkdown_share", direction: "UP",
            magnitude: mag("OL_INJURY_RB_CHECKDOWN") * strength,
            evidence: {
              rule: "spec §1 — pressure outlet: a missing blocker moves a little share to the back",
              triggered: true,
              triggerDetail: `${pos} absent (${inj.status}), strength ${strength.toFixed(2)}`,
              triggerPlayerId: inj.playerId, triggerPlayerName: triggerName,
              inputs: { position: pos, status: inj.status, strength },
            },
          
        magKey: "OL_INJURY_RB_CHECKDOWN",}));
        }
      }
      out.push(mk({
        id: `ol:${inj.playerId}:team:${team}`,
        rule: "OL_INJURY_TEAM_PASS_RATE", category: "OL_INJURY",
        affectedPlayerId: `team:${team}`, affectedName: team, affectedPosition: "UNK",
        target: "team_pass_rate", direction: "DOWN",
        magnitude: mag("OL_INJURY_TEAM_PASS_RATE") * strength,
        evidence: {
          rule: "spec §1 — less protection, a tick less willingness to throw",
          triggered: true,
          triggerDetail: `${pos} absent (${inj.status})`,
          triggerPlayerId: inj.playerId, triggerPlayerName: triggerName,
          inputs: { position: pos, status: inj.status, team },
        },
      
        magKey: "OL_INJURY_TEAM_PASS_RATE",}));
      continue;
    }

    // ── §2 Defensive secondary injuries ────────────────────────────────────
    if (isSecondary(pos)) {
      // The AFFECTED side is the opponent's offense.
      for (const m of byOpponent.get(team) ?? []) {
        if (m.team && m.team !== team) {
          const mp = parsePosition(m.position);
          if (mp === "QB") {
            out.push(mk({
              id: `sec:${inj.playerId}:qb:${m.playerId}`,
              rule: "SECONDARY_INJURY_QB", category: "SECONDARY_INJURY",
              affectedPlayerId: m.playerId, affectedName: m.name, affectedPosition: mp,
              target: "passing_yards", direction: "UP",
              magnitude: mag("SECONDARY_INJURY_QB_PASSING_YARDS") * strength,
              evidence: {
                rule: "spec §2 — a missing DB opens throwing lanes",
                triggered: true,
                triggerDetail: `${pos} absent (${inj.status}) vs ${m.team}`,
                triggerPlayerId: inj.playerId, triggerPlayerName: triggerName,
                inputs: { position: pos, status: inj.status, strength },
              },
            
        magKey: "SECONDARY_INJURY_QB_PASSING_YARDS",}));
          } else if (mp === "WR" || mp === "TE") {
            out.push(mk({
              id: `sec:${inj.playerId}:rec:${m.playerId}`,
              rule: "SECONDARY_INJURY_REC", category: "SECONDARY_INJURY",
              affectedPlayerId: m.playerId, affectedName: m.name, affectedPosition: mp,
              target: "fantasy_points", direction: "UP",
              magnitude: (mag(mp === "WR" ? "SECONDARY_INJURY_WR_FANTASY" : "SECONDARY_INJURY_TE_FANTASY")) * strength,
              magKey: mp === "WR" ? "SECONDARY_INJURY_WR_FANTASY" : "SECONDARY_INJURY_TE_FANTASY",
              evidence: {
                rule: "spec §2 — softer coverage shell, more targets for the affected receiver",
                triggered: true,
                triggerDetail: `${pos} absent (${inj.status}) vs ${m.team}`,
                triggerPlayerId: inj.playerId, triggerPlayerName: triggerName,
                inputs: { position: pos, status: inj.status, strength },
              },
            }));
          }
        }
      }
      // The defense itself grades worse.
      out.push(mk({
        id: `sec:${inj.playerId}:dst:${team}`,
        rule: "SECONDARY_INJURY_DST", category: "SECONDARY_INJURY",
        affectedPlayerId: `dst:${team}`, affectedName: team, affectedPosition: "DST",
        target: "defense_points_allowed", direction: "UP",
        magnitude: mag("SECONDARY_INJURY_DST_ALLOWED") * strength,
        evidence: {
          rule: "spec §2 — the DST that lost a starting DB allows more",
          triggered: true,
          triggerDetail: `${pos} absent (${inj.status})`,
          triggerPlayerId: inj.playerId, triggerPlayerName: triggerName,
          inputs: { position: pos, status: inj.status },
        },
      
        magKey: "SECONDARY_INJURY_DST_ALLOWED",}));
      continue;
    }

    // ── §3 Pass-rush injuries (mirror of §2 for the front seven) ───────────
    if (isPassRush(pos)) {
      for (const m of byOpponent.get(team) ?? []) {
        if (m.team && m.team !== team) {
          const mp = parsePosition(m.position);
          if (mp === "QB") {
            out.push(mk({
              id: `pr:${inj.playerId}:qb:${m.playerId}`,
              rule: "PASS_RUSH_INJURY_QB", category: "PASS_RUSH_INJURY",
              affectedPlayerId: m.playerId, affectedName: m.name, affectedPosition: mp,
              target: "time_to_throw", direction: "UP",
              magnitude: Math.abs(mag("PASS_RUSH_INJURY_TIME_TO_THROW")) * strength,
              evidence: {
                rule: "spec §3 — fewer rushers means more time in the pocket",
                triggered: true,
                triggerDetail: `${pos} absent (${inj.status}) vs ${m.team}`,
                triggerPlayerId: inj.playerId, triggerPlayerName: triggerName,
                inputs: { position: pos, status: inj.status, strength },
              },
            
        magKey: "PASS_RUSH_INJURY_TIME_TO_THROW",}));
          } else if (mp === "WR") {
            out.push(mk({
              id: `pr:${inj.playerId}:wr:${m.playerId}`,
              rule: "PASS_RUSH_INJURY_WR", category: "PASS_RUSH_INJURY",
              affectedPlayerId: m.playerId, affectedName: m.name, affectedPosition: mp,
              target: "fantasy_points", direction: "UP",
              magnitude: mag("PASS_RUSH_INJURY_WR_FANTASY") * strength,
              evidence: {
                rule: "spec §3 — extended drives feed the receiver",
                triggered: true,
                triggerDetail: `${pos} absent (${inj.status}) vs ${m.team}`,
                triggerPlayerId: inj.playerId, triggerPlayerName: triggerName,
                inputs: { position: pos, status: inj.status, strength },
              },
            
        magKey: "PASS_RUSH_INJURY_WR_FANTASY",}));
          }
        }
      }
    }
  }

  // ── §4 Skill-position depth chart movement ──────────────────────────────
  // A player the depth chart ranks behind a STARTER who is absent inherits
  // part of the share — not all of it, which is the calibrated default.
  const startersByTeamPos = new Map<string, PlayerContext[]>();
  for (const s of starters) {
    if (!s.team) continue;
    const key = `${s.team}:${parsePosition(s.position)}`;
    const arr = startersByTeamPos.get(key);
    if (arr) arr.push(s); else startersByTeamPos.set(key, [s]);
  }
  const absentIds = new Set((c.injuries ?? []).filter((i) => absenceStrength(i.status) > 0).map((i) => i.playerId));
  for (const p of players) {
    if (absentIds.has(p.playerId)) continue;
    if (!p.team) continue;
    const pos = parsePosition(p.position);
    if (pos !== "RB" && pos !== "WR" && pos !== "TE") continue;
    // Depth 2+ behind a starter who is out.
    if (p.depthRank === null || p.depthRank === undefined || p.depthRank <= 1) continue;
    const group = startersByTeamPos.get(`${p.team}:${pos}`) ?? [];
    const starterOut = group.some((s) => absentIds.has(s.playerId));
    if (!starterOut) continue;
    out.push(mk({
      id: `dc:${p.playerId}:promoted`,
      rule: "DEPTH_CHART_PROMOTION", category: "DEPTH_CHART",
      affectedPlayerId: p.playerId, affectedName: p.name, affectedPosition: pos,
      target: "target_share", direction: "UP",
      magnitude: mag("DEPTH_CHART_PROMOTION_SHARE"),
      evidence: {
        rule: "spec §4 — a promoted backup inherits part of the starter's share",
        triggered: true,
        triggerDetail: `depth ${p.depthRank} at ${pos}, starter absent`,
        inputs: { depthRank: p.depthRank, position: pos, snapShare: p.snapShare ?? null },
      },
    
        magKey: "DEPTH_CHART_PROMOTION_SHARE",}));
  }

  // ── §5 Weather (already a DFS gate upstream; encode it here) ─────────────
  const wind = c.weather?.sustainedWindMph;
  if (typeof wind === "number" && Number.isFinite(wind) && wind >= 15) {
    // Above 15mph the effect grows with the wind rather than switching on.
    const t = Math.min(1, (wind - 15) / 15);
    for (const p of players) {
      const pos = parsePosition(p.position);
      if (pos === "QB") {
        out.push(mk({
          id: `wx:${p.playerId}:att`,
          rule: "WEATHER_WIND", category: "WEATHER",
          affectedPlayerId: p.playerId, affectedName: p.name, affectedPosition: pos,
          target: "pass_attempts", direction: "DOWN",
          magnitude: mag("WEATHER_WIND_PASS_ATTEMPTS") * t,
          evidence: {
            rule: "spec §5 — sustained wind suppresses pass volume",
            triggered: true, triggerDetail: `${wind} mph sustained`,
            inputs: { sustainedWindMph: wind },
          },
        
        magKey: "WEATHER_WIND_PASS_ATTEMPTS",}));
      } else if (pos === "RB") {
        out.push(mk({
          id: `wx:${p.playerId}:run`,
          rule: "WEATHER_WIND", category: "WEATHER",
          affectedPlayerId: p.playerId, affectedName: p.name, affectedPosition: pos,
          target: "rushing_attempts", direction: "UP",
          magnitude: mag("WEATHER_WIND_RUN_RATE") * t,
          evidence: {
            rule: "spec §5 — sustained wind lifts the run rate",
            triggered: true, triggerDetail: `${wind} mph sustained`,
            inputs: { sustainedWindMph: wind },
          },
        
        magKey: "WEATHER_WIND_RUN_RATE",}));
      }
    }
  }

  // ── §6 Game script / Vegas (measured line only) ──────────────────────────
  const spread = c.gameScript?.spread;
  if (typeof spread === "number" && Number.isFinite(spread) && Math.abs(spread) >= 7) {
    // The SIGN of the spread says which side is favoured, but attributing it to
    // a specific player needs a team-side lookup this context does not carry.
    // Rather than guess a side, the rule fires at HALF strength for every QB and
    // says so in the evidence. A caller with team context should pass it in and
    // this becomes directional.
    for (const p of players) {
      const pos = parsePosition(p.position);
      if (pos !== "QB") continue;
      out.push(mk({
        id: `gs:${p.playerId}:pace`,
        rule: "GAME_SCRIPT", category: "GAME_SCRIPT",
        affectedPlayerId: p.playerId, affectedName: p.name, affectedPosition: pos,
        target: "pass_attempts", direction: "UP",
        magnitude: mag("GAME_SCRIPT_TRAILING_PASS_UP") * 0.5,
        evidence: {
          rule: "spec §6 — a large spread implies more passing; side unattributed so halved, garbage-time discount applied",
          triggered: true, triggerDetail: `spread ${spread}`,
          inputs: { spread, sideAttributed: false },
        },
      
        magKey: "GAME_SCRIPT_TRAILING_PASS_UP",}));
    }
  }

  return out;
}

/** Roll a set of adjustments up per player, as a signed net per target. */
export function rollUpByPlayer(
  adjustments: readonly Adjustment[],
): Map<string, { target: AdjustmentTarget; net: number }[]> {
  const m = new Map<string, { target: AdjustmentTarget; net: number }[]>();
  for (const a of adjustments) {
    const signed = a.direction === "UP" ? a.magnitude : a.direction === "DOWN" ? -a.magnitude : 0;
    const arr = m.get(a.affectedPlayerId) ?? [];
    const hit = arr.find((x) => x.target === a.target);
    if (hit) hit.net += signed;
    else arr.push({ target: a.target, net: signed });
    m.set(a.affectedPlayerId, arr);
  }
  return m;
}
