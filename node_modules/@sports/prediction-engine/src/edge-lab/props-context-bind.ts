/**
 * IC8 · props-context-bind — rest / body-clock / weather INTO the props stack.
 *
 * GAP RESOLVED
 * The schedule-derived context features already exist as game-market EvalRow
 * builders (`nfl-body-clock.ts`, `nfl-weather.ts`, `schedule-features.ts`) but
 * nothing feeds them into the props stack — they ride the walk-forward / grader
 * rails only. This module is the honest seam: given a request for a team at a
 * kickoff, it binds the three context cells that are SCHEDULE-FACT or
 * PRE-CUTOFF FORECAST, never market-derived, never observed-weather.
 *
 * This is a REQUEST/ADVISE layer, not a predictor. It does NOT emit a model `p`.
 * It does NOT touch `q`, closing lines, or any market quantity. Each cell is
 * priced:false and CANDIDATE; the §5 trials registry / IC9 decides admission.
 *
 * LEAK SAFETY (enforced in code, same rails as the sibling NFL features)
 *   - rest_days: value = (kickoffMs − prevEndMs) / day where prevEndMs is the end
 *     time of the team's LATEST completed game strictly before the decision
 *     cutoff (kickoff − 1h). Week-1 / thin-history ⇒ refuse `no_prior_game` —
 *     a 7-day default is NEVER emitted. This is the card's "3.0 yards" constant:
 *     an invented rest assumption is a fabricated prior.
 *   - body_clock_shift_h: venue zone = HOME team's UTC offset (standard-time);
 *     value = bodyClockShiftHours(teamOffset, venueOffset) = venue − team.
 *     Either code missing after alias resolution ⇒ refuse `unknown_team`.
 *     Schedule fact — knowable months ahead. knownAtIso = kickoff − lead.
 *   - wx_total_suppression: forecast from `weatherByGame` (caller-supplied
 *     archive — this module performs NO I/O). Forecast issued AFTER the decision
 *     cutoff ⇒ refuse `leaky_forecast`; the 1ms boundary is strict
 *     (`issuedMs > decisionMs` refuses, `===` binds). Dome ⇒ 0; outdoor with
 *     any null field ⇒ refuse `missing_outdoor_fields` (never a fabricated
 *     neutral). knownAtIso = forecastIssuedAt.
 *
 * ALL-OR-REFUSE: every requested field must bind; the first failing field (in
 * request order) refuses the WHOLE request with that field named. A batch
 * survives one bad row — that row refuses, the others bind, index-aligned.
 *
 * Pure, deterministic, no I/O, no clock, no MODEL_VERSION.
 */

import type { GameRow } from "./game-row.js";
import {
  type GameWeatherForecast,
  totalSuppressionIndex,
} from "./features/nfl-weather.js";
import { NFL_TEAM_UTC_OFFSET, bodyClockShiftHours } from "./features/nfl-body-clock.js";

/** Method tag for provenance stamping — mirrors IC3/IC4 tag convention. */
export const CONTEXT_BIND_METHOD_TAG = "props_context_bind_v1" as const;

/** The three context cells this bind admits. Ordered by the request list. */
export type ContextField = "rest_days" | "body_clock_shift_h" | "wx_total_suppression";

export interface ContextCell {
  readonly field: ContextField;
  readonly value: number;
  /** Temporal grain: bound to the kickoff instant, known pre-decision. */
  readonly grain: "pregame_for_kickoff";
  /** Origin of the value — never a market-derived source. */
  readonly provenance: "schedule_fact" | "forecast_pre_cutoff";
  /**
   * Honest knowable-at instant for this cell — the as-of join key downstream.
   * Per-field source instant; assert all three differ in a mixed fixture.
   */
  readonly knownAtIso: string;
  /** LOCAL literal; bus registration is post-#555 integration. Never "L0". */
  readonly layer: "L3";
}

export interface ContextBindRequest {
  readonly team: string;
  readonly gameId: string;
  readonly kickoffIso: string;
  readonly isHome: boolean;
  /** The other team at this kickoff — used to resolve the venue zone. */
  readonly opponentTeam: string;
  /** ALL fields must bind or the request refuses. Order = request iteration. */
  readonly fields: readonly ContextField[];
}

export type ContextRefuse =
  | "no_fields"
  | "unknown_team"
  | "no_prior_game"
  | "no_forecast"
  | "leaky_forecast"
  | "missing_outdoor_fields"
  | "bad_kickoff";

export type ContextBindResult =
  | {
      readonly ok: true;
      readonly cells: readonly ContextCell[];
      readonly priced: false;
      readonly methodTag: typeof CONTEXT_BIND_METHOD_TAG;
    }
  | {
      readonly ok: false;
      readonly refuse: ContextRefuse;
      /** The field that failed (in request order), or null for whole-request refusals. */
      readonly field: ContextField | null;
      readonly priced: false;
      readonly methodTag: typeof CONTEXT_BIND_METHOD_TAG;
    };

// ── Constants (mirror schedule-features.ts / nfl-team-form.ts) ───────────────

/** Decision cutoff: features frozen this long before kickoff. */
const DECISION_LEAD_MS = 60 * 60_000;
/** Assumed game duration for stamping "this result is now knowable". */
const GAME_DURATION_MS = 4 * 3_600_000;
const DAY_MS = 86_400_000;

/** Canonical franchise codes — OAK→LV, SD→LAC, STL→LA (mirror nfl-team-form). */
const TEAM_CODE_ALIASES: Readonly<Record<string, string>> = {
  OAK: "LV",
  SD: "LAC",
  STL: "LA",
};

function canonicalTeam(team: string): string {
  return TEAM_CODE_ALIASES[team] ?? team;
}

const iso = (ms: number): string => new Date(ms).toISOString();

/**
 * Bind a team's context cells for one kickoff.
 *
 * The schedule array is scanned for the team's completed games (both scores
 * present) whose end time is strictly before the decision cutoff; the latest
 * such game's end stamps rest_days. The venue zone is the home team's offset.
 * Weather is pulled from the caller-supplied `weatherByGame` map keyed by the
 * featured gameId.
 *
 * Throws NEVER — data problems are refusals, including malformed kickoff ISO
 * (bad_kickoff). A batch must survive one bad row.
 */
export function bindTeamContext(args: {
  readonly schedule: readonly GameRow[];
  readonly weatherByGame: ReadonlyMap<string, GameWeatherForecast>;
  readonly request: ContextBindRequest;
  readonly decisionLeadMs?: number;
}): ContextBindResult {
  const { schedule, weatherByGame, request } = args;
  const leadMs = args.decisionLeadMs ?? DECISION_LEAD_MS;

  // --- bad_kickoff: malformed ISO is a data problem, not a throw. ---
  const kickoffMs = Date.parse(request.kickoffIso);
  if (!Number.isFinite(kickoffMs)) {
    return refuse("bad_kickoff", null);
  }

  // --- no_fields: empty request list. ---
  if (request.fields.length === 0) {
    return refuse("no_fields", null);
  }

  const decisionMs = kickoffMs - leadMs;

  // --- rest_days: latest completed game (scores present) involving the team,
  //     strictly before the decision cutoff, by end time. ---
  // Canonicalize the request team so the scan matches relocated schedule codes
  // (e.g. a canonical LV request finds a prior game logged as OAK).
  const canonTeam = canonicalTeam(request.team);
  let prevEnd: number | null = null;
  for (const g of schedule) {
    const gHome = canonicalTeam(g.homeTeam);
    const gAway = canonicalTeam(g.awayTeam);
    if (gHome !== canonTeam && gAway !== canonTeam) continue;
    if (g.homeScore === null || g.awayScore === null) continue;
    const startMs = Date.parse(g.startTime);
    if (!Number.isFinite(startMs)) continue;
    const endMs = startMs + GAME_DURATION_MS;
    // Strict <: a game ending exactly at the decision cutoff is NOT strictly
    // pre-cutoff and cannot feed rest_days (honest as-of boundary).
    if (endMs < decisionMs) {
      if (prevEnd === null || endMs > prevEnd) prevEnd = endMs;
    }
  }

  // --- wx lookup for the featured gameId. ---
  const wx = weatherByGame.get(request.gameId);

  // --- Bind fields in request order; all-or-refuse on first failure. ---
  const cells: ContextCell[] = [];
  for (const field of request.fields) {
    const refusal = validateField(field);
    if (refusal !== null) return refusal;
    cells.push(emitCell(field));
  }

  return {
    ok: true,
    cells,
    priced: false,
    methodTag: CONTEXT_BIND_METHOD_TAG,
  };

  // ── Per-field validation: returns a refusal result or null (bound). ──────

  function validateField(field: ContextField): ContextBindResult | null {
    if (field === "rest_days") {
      if (prevEnd === null) return refuse("no_prior_game", "rest_days");
      return null;
    }
    if (field === "body_clock_shift_h") {
      // unknown_team only fails if body_clock_shift_h is actually requested.
      // venue = home team's zone (body-clock convention).
      const teamOff = NFL_TEAM_UTC_OFFSET[canonicalTeam(request.team)];
      const oppOff = NFL_TEAM_UTC_OFFSET[canonicalTeam(request.opponentTeam)];
      if (teamOff === undefined || oppOff === undefined) {
        return refuse("unknown_team", "body_clock_shift_h");
      }
      return null;
    }
    if (field === "wx_total_suppression") {
      if (!wx) return refuse("no_forecast", "wx_total_suppression");
      const issuedMs = Date.parse(wx.forecastIssuedAt);
      if (!Number.isFinite(issuedMs) || issuedMs > decisionMs) {
        return refuse("leaky_forecast", "wx_total_suppression");
      }
      if (!wx.isDome) {
        if (wx.windMph === null || wx.precipProbPct === null || wx.tempF === null) {
          return refuse("missing_outdoor_fields", "wx_total_suppression");
        }
      }
      return null;
    }
    return null;
  }

  function emitCell(field: ContextField): ContextCell {
    if (field === "rest_days") {
      return {
        field,
        value: (kickoffMs - prevEnd!) / DAY_MS,
        grain: "pregame_for_kickoff",
        provenance: "schedule_fact",
        knownAtIso: iso(prevEnd!),
        layer: "L3",
      };
    }
    if (field === "body_clock_shift_h") {
      // validated in validateField — team/opp offsets are concrete here.
      const homeOffset: number = NFL_TEAM_UTC_OFFSET[canonicalTeam(request.team)]!;
      const awayOffset: number = NFL_TEAM_UTC_OFFSET[canonicalTeam(request.opponentTeam)]!;
      const venueOffset: number = request.isHome ? homeOffset : awayOffset;
      return {
        field,
        value: bodyClockShiftHours(homeOffset, venueOffset),
        grain: "pregame_for_kickoff",
        provenance: "schedule_fact",
        knownAtIso: iso(decisionMs), // conservative latest bound, per body-clock module
        layer: "L3",
      };
    }
    // wx_total_suppression — validated in validateField: dome ok, outdoor fields present.
    const wxNow = wx!;
    if (wxNow.isDome) {
      return {
        field,
        value: 0,
        grain: "pregame_for_kickoff",
        provenance: "forecast_pre_cutoff",
        knownAtIso: iso(Date.parse(wxNow.forecastIssuedAt)),
        layer: "L3",
      };
    }
    // Outdoor: all three fields guaranteed non-null by validateField.
    const value = totalSuppressionIndex({
      isDome: false,
      windMph: wxNow.windMph!,
      precipProbPct: wxNow.precipProbPct!,
      tempF: wxNow.tempF!,
    });
    return {
      field,
      value,
      grain: "pregame_for_kickoff",
      provenance: "forecast_pre_cutoff",
      knownAtIso: iso(Date.parse(wxNow.forecastIssuedAt)),
      layer: "L3",
    };
  }
}

function refuse(refuseReason: ContextRefuse, fieldName: ContextField | null): ContextBindResult {
  return {
    ok: false,
    refuse: refuseReason,
    field: fieldName,
    priced: false,
    methodTag: CONTEXT_BIND_METHOD_TAG,
  };
}

/**
 * Batch — index-aligned, one bad row does not throw the batch.
 * bad_kickoff (malformed ISO) refuses per-row, never throws.
 */
export function bindTeamContextBatch(args: {
  readonly schedule: readonly GameRow[];
  readonly weatherByGame: ReadonlyMap<string, GameWeatherForecast>;
  readonly requests: readonly ContextBindRequest[];
  readonly decisionLeadMs?: number;
}): ContextBindResult[] {
  return args.requests.map((req) =>
    bindTeamContext({
      schedule: args.schedule,
      weatherByGame: args.weatherByGame,
      request: req,
      decisionLeadMs: args.decisionLeadMs,
    }),
  );
}
