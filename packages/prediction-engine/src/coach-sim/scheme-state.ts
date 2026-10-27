/**
 * FTN scheme layer, joined to EPA.
 *
 * Class A. Play selection inside the drive. Not an injury overlay.
 * This file is not read by the Tuesday hash. It does not reallocate shares.
 *
 * Source: ftn charting 2024–2026 joined to regular-season EPA, 103,810 plays.
 * Every flag below is a feature. The unconditional EPA gap is one column.
 * A small gap is not a reason to drop the flag.
 *
 * The drive's measured yards already include these plays. The term added to a
 * play is the centered contrast, delta * (on - rate), so the mean of the drive
 * does not move and the play still moves when the flag fires.
 * Yards use the same 10 yards per EPA convention the blitz cell already uses.
 * That conversion is field-position dependent and remains a named gap.
 *
 * What was not in the join, and is not invented here:
 * - P(pass | box)
 * - P(play action | blitz)
 * - no-huddle seconds
 * The box still sets a play-type signal. The blitz and play-action mains are
 * both applied when both fire. No product coefficient is added.
 */

export const SCHEME_YARDS_PER_EPA = 10;

/** Stated charting coverage. Not a fitted rate. */
export const BOX_CHARTED_SHARE = 23000 / 103000;

export const JOINED_PLAYS = 103810;

export type SchemeFamily = "dropback" | "run";

export type SchemeFlagId =
  | "play_action"
  | "rpo"
  | "qb_out_of_pocket"
  | "no_huddle"
  | "blitz"
  | "box"
  | "motion";

export type SchemeRole = "call" | "state" | "clock" | "interaction" | "play_type" | "tell";

export interface SchemeFlagDraw {
  readonly id: SchemeFlagId;
  readonly role: SchemeRole;
  readonly applies: boolean;
  readonly on: boolean;
  readonly deltaEpa: number;
  readonly centeredEpa: number;
  readonly rate: number;
  readonly nOn: number;
  readonly nOff: number;
}

export interface SchemePlay {
  readonly family: SchemeFamily;
  readonly flags: readonly SchemeFlagDraw[];
  readonly deltaEpa: number;
  readonly yards: number;
  readonly box: "stacked" | "light" | "unobserved";
  readonly playTypeSignal: "run_committed" | "play_action_opportunity" | null;
  readonly blitzAndPlayAction: boolean;
}

interface FlagSpec {
  readonly id: SchemeFlagId;
  readonly role: SchemeRole;
  readonly subset: "dropback" | "all" | "box" | "blitz";
  readonly deltaEpa: number;
  readonly nOn: number;
  readonly nOff: number;
}

/**
 * Unconditional contrasts. delta = EPA(on) - EPA(off), as measured.
 * Box is 8+ versus 6- on runs. Blitz is 5+ rushers versus 4 on dropbacks.
 */
export const SCHEME_FLAGS: readonly FlagSpec[] = [
  { id: "play_action", role: "call", subset: "dropback", deltaEpa: 0.0978, nOn: 10941, nOff: 36822 },
  { id: "rpo", role: "call", subset: "all", deltaEpa: -0.0657, nOn: 3943, nOff: 99867 },
  { id: "qb_out_of_pocket", role: "state", subset: "dropback", deltaEpa: -0.0357, nOn: 9381, nOff: 38382 },
  { id: "no_huddle", role: "clock", subset: "all", deltaEpa: 0.0262, nOn: 8882, nOff: 94928 },
  { id: "blitz", role: "interaction", subset: "blitz", deltaEpa: -0.0135, nOn: 13103, nOff: 32703 },
  { id: "box", role: "play_type", subset: "box", deltaEpa: 0.009, nOn: 2962, nOff: 20044 },
  { id: "motion", role: "tell", subset: "all", deltaEpa: 0.0016, nOn: 44044, nOff: 59766 },
] as const;

/** Disclosed rows only. Not a 32-team prior. */
export const QB_DECISION_DISCLOSED = [
  { team: "IND", interceptionWorthy: 0.0447, qbFaultSack: 0.0161, catchable: 0.617 },
  { team: "CLE", interceptionWorthy: 0.041, qbFaultSack: 0.0259, catchable: 0.57 },
  { team: "SEA", interceptionWorthy: 0.0397, qbFaultSack: 0.0355, catchable: 0.669 },
  { team: "DET", interceptionWorthy: 0.0164, qbFaultSack: 0.0205, catchable: 0.689 },
  { team: "WAS", interceptionWorthy: 0.0193, qbFaultSack: 0.0276, catchable: 0.591 },
] as const;

/** Receiver-side separation, yards. Disclosed ends of the table only. */
export const SEPARATION_DISCLOSED = [
  { team: "KC", yards: 3.45 },
  { team: "BUF", yards: 3.43 },
  { team: "CHI", yards: 3.34 },
  { team: "ARI", yards: 2.74 },
  { team: "PHI", yards: 2.8 },
  { team: "CIN", yards: 2.81 },
] as const;

export function flagRate(nOn: number, nOff: number): number {
  const n = nOn + nOff;
  if (n <= 0) throw new Error("scheme: empty contrast");
  return nOn / n;
}

/** Centered contrast. Mean zero at the measured rate. Nonzero when the flag fires. */
export function centerEpa(deltaEpa: number, on: boolean, rate: number): number {
  return deltaEpa * ((on ? 1 : 0) - rate);
}

function spec(id: SchemeFlagId): FlagSpec {
  const found = SCHEME_FLAGS.find((row) => row.id === id);
  if (!found) throw new Error(`scheme: missing ${id}`);
  return found;
}

function genericDraw(row: FlagSpec, on: boolean, applies: boolean): SchemeFlagDraw {
  const rate = flagRate(row.nOn, row.nOff);
  return {
    id: row.id,
    role: row.role,
    applies,
    on: applies && on,
    deltaEpa: row.deltaEpa,
    centeredEpa: applies ? centerEpa(row.deltaEpa, on, rate) : 0,
    rate,
    nOn: row.nOn,
    nOff: row.nOff,
  };
}

export function drawSchemePlay(rand: () => number, family: SchemeFamily): SchemePlay {
  const flags: SchemeFlagDraw[] = [];

  for (const row of SCHEME_FLAGS) {
    if (row.subset === "all" || (row.subset === "dropback" && family === "dropback")) {
      const rate = flagRate(row.nOn, row.nOff);
      flags.push(genericDraw(row, rand() < rate, true));
      continue;
    }
    if (row.subset === "blitz") {
      if (family !== "dropback") {
        flags.push(genericDraw(row, false, false));
        continue;
      }
      const dropbacks = spec("play_action").nOn + spec("play_action").nOff;
      const contrast = row.nOn + row.nOff;
      const inContrast = rand() < contrast / dropbacks;
      if (!inContrast) {
        flags.push(genericDraw(row, false, false));
        continue;
      }
      flags.push(genericDraw(row, rand() < flagRate(row.nOn, row.nOff), true));
      continue;
    }
    if (row.subset === "box") {
      const charted = rand() < BOX_CHARTED_SHARE;
      if (!charted) {
        flags.push(genericDraw(row, false, false));
        continue;
      }
      const rate = flagRate(row.nOn, row.nOff);
      const stacked = rand() < rate;
      const draw = genericDraw(row, stacked, family === "run");
      flags.push(family === "run" ? draw : { ...draw, applies: true, on: stacked, centeredEpa: 0 });
      continue;
    }
    flags.push(genericDraw(row, false, false));
  }

  const boxFlag = flags.find((row) => row.id === "box");
  const resolvedBox: SchemePlay["box"] = !boxFlag || !boxFlag.applies ? "unobserved" : boxFlag.on ? "stacked" : "light";
  const playAction = flags.find((row) => row.id === "play_action");
  const blitz = flags.find((row) => row.id === "blitz");
  const deltaEpa = flags.reduce((sum, row) => sum + row.centeredEpa, 0);

  return {
    family,
    flags,
    deltaEpa,
    yards: deltaEpa * SCHEME_YARDS_PER_EPA,
    box: resolvedBox,
    playTypeSignal:
      resolvedBox === "unobserved" ? null : resolvedBox === "stacked" ? "run_committed" : "play_action_opportunity",
    blitzAndPlayAction: Boolean(playAction?.on && blitz?.on),
  };
}

export function schemeReasoningLine(play: SchemePlay): string {
  const parts = play.flags.map((row) => {
    const state = !row.applies ? "unobserved" : row.on ? "on" : "off";
    return `${row.id} ${row.role} ${state} centered ${row.centeredEpa.toFixed(4)} (contrast ${row.deltaEpa.toFixed(4)}, n ${row.nOn}/${row.nOff})`;
  });
  const signal =
    play.playTypeSignal === null
      ? "box unobserved; P(pass|box) was not in the join, so the pass coin is not rewritten"
      : `box signal ${play.playTypeSignal}; P(pass|box) was not in the join, so the pass coin is not rewritten`;
  const joint = play.blitzAndPlayAction
    ? "blitz and play action both on; mains only, no invented product"
    : "blitz and play action are not jointly on";
  const decision = QB_DECISION_DISCLOSED.map(
    (row) => `${row.team} int-worthy ${(row.interceptionWorthy * 100).toFixed(2)}%`,
  ).join(", ");
  const separation = SEPARATION_DISCLOSED.map((row) => `${row.team} ${row.yards.toFixed(2)}`).join(", ");
  return [
    `scheme ${play.family}: ${parts.join("; ")}`,
    signal,
    joint,
    `yards ${play.yards.toFixed(3)} at ${SCHEME_YARDS_PER_EPA} yd/EPA`,
    `int-worthy disclosed: ${decision}`,
    `separation disclosed: ${separation}`,
  ].join(". ");
}
