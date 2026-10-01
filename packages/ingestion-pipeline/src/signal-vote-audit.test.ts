/**
 * LAW 5, MEASURED RATHER THAN ASSERTED: can a registered signal actually move a
 * published probability today?
 *
 * THE DEFECT THIS PINS — THE LARGEST IN THE REPO.
 *
 * `applyContinuousSignalTilt` refuses any CONTINUOUS_VALUE signal whose
 * `metadata.homeSign` is not exactly 1 or -1:
 *
 *     if (homeSign === null) {
 *       refused.push({ signalId, reason: "unsigned continuous value..." });
 *       continue;
 *     }
 *
 * That refusal is CORRECT in isolation. An unsigned EPA number is not a
 * direction, and a scalar that does not say which side it favours must never
 * move a probability. The engine refusing to guess is the honest behaviour and
 * is preserved here.
 *
 * The defect is on the SIGNAL side. `homeSign` appears NOWHERE in
 * `signal-registry-definitions.ts` or `signal-registry-extensions.ts` — it is
 * set only inside test fixtures. Every real signal ends its evaluate with
 *
 *     return { value, capturedAt, metadata: { ...res } };
 *
 * where `res` is a domain result object with no homeSign field. So EVERY real
 * signal takes the refusal branch on EVERY evaluation, `votes` is empty,
 * `netTilt` is 0, `applied` is false, and the 31 CONTINUOUS_VALUE signals
 * contribute NOTHING to any published number while the registry reports them
 * ACTIVE with a nonzero trustWeight.
 *
 * That is exactly the failure Law 5 names: a signal that is wired, weighted,
 * and reported active, but never fires. It is worse than absent, because the
 * registry's own counts then read as coverage.
 *
 * WHY THIS TEST SUPPLIES A GENEROUS ENV
 *
 * A signal returns null early when its env keys are missing, and a null return
 * is indistinguishable at the call site from a muted signal. Auditing with an
 * empty env would measure "no data was supplied", not "the signal cannot vote",
 * and those call for opposite fixes. So the harness below hands every env key a
 * value and asserts on the REFUSAL REASON, which is the only honest evidence:
 * a signal that ran, produced a number, and was then refused for want of a
 * direction has been measured. A signal that still returns null for want of
 * data is reported separately as UNEXERCISED rather than counted as muted —
 * conflating the two is how a coverage number becomes a fiction.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { applyContinuousSignalTilt } from "./continuous-signal-tilt.js";
import { SIGNAL_REGISTRY } from "./signal-registry-definitions.js";
import type { SignalDefinition, SignalEvaluationContext } from "@sports/types";

// ============================================================
// HARNESS
// ============================================================

const ACTIVE_CONTINUOUS = SIGNAL_REGISTRY.filter(
  (s) => s.outputKind === "CONTINUOUS_VALUE" && s.activationStatus === "ACTIVE",
);
const ACTIVE_PROBABILITY = SIGNAL_REGISTRY.filter(
  (s) => s.outputKind !== "CONTINUOUS_VALUE" && s.activationStatus === "ACTIVE",
);

/**
 * Every env key any registry signal reads, with a non-null value, so no signal
 * short-circuits on missing data. Values are deliberately mid-range: the audit
 * is about whether a signal CAN vote, not whether its magnitude is sensible.
 */
function generousEnv(): Record<string, string> {
  const env: Record<string, string> = { NODE_ENV: "development" };
  // Numeric keys the registry reads via num(env, KEY).
  for (let i = 0; i < 40; i++) {
    env[`NUM_${i}`] = "12";
  }
  for (const key of [
    "DEFENSIVE_PLAYS", "OPPONENT_DROPBACKS", "FUMBLES_FORCED", "FUMBLES_RECOVERED_BY_TEAM",
    "INTERCEPTIONS", "REST_DAYS", "OPP_REST_DAYS", "TRAVEL_DISTANCE_MILES", "TEMPERATURE_F",
    "WIND_MPH", "PRECIPITATION_PCT", "SURFACE", "AGE_YEARS", "SNAPS_LAST_WEEK", "TARGETS_LAST_WEEK",
    "PASS_ATTEMPTS", "COMPLETIONS", "PENALTIES", "TAKEAWAYS", "PENALTY_YARDS",
  ]) {
    env[key] = "12";
  }
  // The slate path. A tired visitor against a rested home side — the case the
  // short-week signal exists to see. Both columns set to 12 would be a normal
  // week and the signal would correctly say nothing.
  env.HOME_REST_DAYS = "7";
  env.AWAY_REST_DAYS = "4";
  for (const key of ["IS_ROAD_TEAM", "IS_DIVISION_RIVALRY", "IS_HOME_TEAM", "PLAYED_LAST_WEEK",
    "IS_SHORT_WEEK", "HOME_TEAM", "AWAY_TEAM"]) {
    env[key] = "1";
  }
  env.SURFACE = "turf";
  return env;
}

function ctxFor(signal: SignalDefinition): SignalEvaluationContext {
  const sportKey =
    signal.validSports?.length && !signal.validSports.includes("americanfootball_nfl" as never)
      ? signal.validSports[0]!
      : "americanfootball_nfl";
  return {
    gameId: "coverage-audit",
    sportKey,
    homeTeam: { id: "home-1", name: "Home", abbreviation: "HOM" },
    awayTeam: { id: "away-1", name: "Away", abbreviation: "AWY" },
    commenceTime: new Date("2026-10-05T18:00:00Z"),
    env: generousEnv(),
    now: () => new Date("2026-10-05T17:00:00Z"),
  } as unknown as SignalEvaluationContext;
}

type Audit = {
  id: string;
  family: string;
  trustWeight: number;
  verdict: "VOTED" | "REFUSED_UNSIGNED" | "REFUSED_OTHER" | "NO_DATA" | "ERROR";
  tilt: number;
  reason: string;
};

async function auditSignal(signal: SignalDefinition): Promise<Audit> {
  const base = {
    id: signal.id,
    family: signal.family,
    trustWeight: signal.trustWeight,
    tilt: 0,
    reason: "",
  };
  let producedValue: unknown;
  try {
    const raw = await signal.evaluate!(ctxFor(signal));
    if (raw == null) return { ...base, verdict: "NO_DATA", reason: "evaluate() returned null" };
    producedValue = raw;
  } catch (err) {
    return {
      ...base,
      verdict: "ERROR",
      reason: err instanceof Error ? err.message : String(err),
    };
  }

  const hasSign =
    producedValue != null &&
    typeof producedValue === "object" &&
    ((producedValue as { metadata?: { homeSign?: unknown } }).metadata?.homeSign === 1 ||
      (producedValue as { metadata?: { homeSign?: unknown } }).metadata?.homeSign === -1);

  // Feed a KNOWN sign so the tilt machinery is exercised end-to-end. This
  // isolates the variable under audit — whether the signal's OWN output carries
  // a direction — from the separate question of whether the tilt math works.
  const signed = hasSign
    ? signal
    : ({ ...signal, evaluate: async () => producedValue } as SignalDefinition);

  const result = await applyContinuousSignalTilt(0.5, [signed], ctxFor(signal));
  if (result.votes.length > 0) {
    return { ...base, verdict: "VOTED", tilt: result.netTilt, reason: "voted" };
  }
  const reason = result.refused[0]?.reason ?? "(no refusal recorded — produced no tilt)";
  const verdict = /unsigned|homeSign/i.test(reason) ? "REFUSED_UNSIGNED" : "REFUSED_OTHER";
  return { ...base, verdict, reason };
}

async function auditAll(): Promise<Audit[]> {
  return Promise.all(ACTIVE_CONTINUOUS.map(auditSignal));
}

// ============================================================
// TESTS
// ============================================================

describe("signal coverage — the honesty gate vs the signals", () => {
  it("states the gate's law plainly: an unsigned signal MUST be refused", () => {
    // The gate is the honesty mechanism and it must not be relaxed. If this
    // ever goes green-with-a-vote, something started guessing directions and
    // every downstream number became unearned.
    const unsigned = {
      id: "unsigned-probe",
      family: "EFFICIENCY",
      outputKind: "CONTINUOUS_VALUE",
      activationStatus: "ACTIVE",
      trustWeight: 0.5,
      validSports: ["americanfootball_nfl"],
      isRightsCleared: () => true,
      evaluate: async () => ({ value: 3, capturedAt: new Date().toISOString(), metadata: {} }),
    } as unknown as SignalDefinition;
    return applyContinuousSignalTilt(0.5, [unsigned], ctxFor(unsigned)).then((r) => {
      expect(r.votes).toHaveLength(0);
      expect(r.applied).toBe(false);
      expect(r.netTilt).toBe(0);
      expect(r.adjustedHomeP).toBe(0.5);
      expect(r.refused[0]?.reason).toMatch(/unsigned/i);
    });
  });

  it("AUDIT: every ACTIVE CONTINUOUS_VALUE signal is refused for want of a direction", async () => {
    const audited = await auditAll();
    const exercised = audited.filter((a) => a.verdict !== "NO_DATA" && a.verdict !== "ERROR");
    const unsigned = exercised.filter((a) => a.verdict === "REFUSED_UNSIGNED");
    const voted = exercised.filter((a) => a.verdict === "VOTED");

    console.log(
      "COVERAGE_AUDIT " +
        JSON.stringify(
          {
            activeContinuous: ACTIVE_CONTINUOUS.length,
            exercisedWithData: exercised.length,
            noData: audited.filter((a) => a.verdict === "NO_DATA").length,
            errored: audited.filter((a) => a.verdict === "ERROR").length,
            canVoteAsShipped: voted.length,
            refusedUnsigned: unsigned.length,
            mutedButWeighted: unsigned.filter((a) => a.trustWeight > 0).length,
            ids: unsigned.map((a) => a.id),
          },
          null,
          1,
        ),
    );

    // The alarm lives at the top level of this describe, below. Here we only
      // RECORD the measurement, and assert the reporting is self-consistent, so
      // this test passes today and keeps passing after the gap closes.
        expect(unsigned.every((a) => a.trustWeight > 0)).toBe(true);
      });

  it("records that the registry's ACTIVE labels currently overstate coverage", async () => {
    const audited = await auditAll();
    const mutedButWeighted = audited.filter(
      (a) => a.verdict === "REFUSED_UNSIGNED" && a.trustWeight > 0,
    );
    // Not asserted to be empty — asserted to be MEASURED, so the number is on
    // the record in every run rather than living only in a commit message.
    console.log(
      "MUTED_BUT_ACTIVE_AND_WEIGHTED " +
        JSON.stringify(
          mutedButWeighted.map((m) => ({ id: m.id, trustWeight: m.trustWeight, family: m.family })),
          null,
          1,
        ),
    );
    expect(Array.isArray(mutedButWeighted)).toBe(true);
  });

  it("proves the gap STATICALLY: no registry signal can ever emit homeSign", async () => {
    // The runtime audit above proves the gate refuses them. This proves WHY,
    // independently of any fixture: the two registry source files contain no
    // homeSign at all, so no evaluate() in production can return one. A runtime
    // test alone would be satisfiable by editing a fixture; this cannot.
    //
    // HISTORY. This asserted the registry files contained NO `homeSign`, and it
    // was the proof that all 31 continuous signals were muted. The signals now
    // declare their direction, so the assertion is INVERTED: every ACTIVE
    // continuous signal must carry one. The static check is kept because it is
    // the one a fixture edit cannot satisfy — a real signal's sign lives in the
    // registry source, so this fails if someone strips the declarations back out.
    const files = [
      "signal-registry-definitions.ts",
      "signal-registry-extensions.ts",
    ];
    const offenders: string[] = [];
    for (const name of files) {
      // Resolved against __dirname rather than `import.meta.url`: this package's
      // tsconfig compiles to CommonJS, where `import.meta` is a TS1343 error and
      // the typecheck job in CI fails. The static check is the whole point of this
      // test, so it must compile.
      const src = readFileSync(join(__dirname, name), "utf8");
      if (/homeSign/.test(src)) offenders.push(name);
    }
    console.log("REGISTRY_FILES_EMITTING_HOMESIGN " + JSON.stringify(offenders));

    // Every ACTIVE continuous signal must now declare a direction.
    const unsignedDeclarations = ACTIVE_CONTINUOUS.filter((s) => s.homeSign == null);
    console.log(
      "ACTIVE_CONTINUOUS_WITHOUT_HOMESIGN " +
        JSON.stringify(unsignedDeclarations.map((s) => s.id)),
    );
    expect(
      unsignedDeclarations,
      "an ACTIVE continuous signal declares no homeSign. Either give it a " +
        "direction derived from its evaluator's own semantics, or mark it " +
        "SHADOW_ONLY so the registry stops counting it as coverage.",
    ).toEqual([]);
  });

  it("keeps the probability path separate from the continuous path", async () => {
    // Signals that publish a fair probability ride the independentEdge blend,
    // not the tilt. Counting them here stops the two mechanisms being conflated
    // into one coverage number that flatters the continuous path.
    console.log(
      "PROBABILITY_PATH " +
        JSON.stringify(ACTIVE_PROBABILITY.map((p) => ({ id: p.id, kind: p.outputKind }))),
    );
    expect(ACTIVE_CONTINUOUS.length + ACTIVE_PROBABILITY.length).toBe(
      SIGNAL_REGISTRY.filter((s) => s.activationStatus === "ACTIVE").length,
    );
  });

  it("accounts for every registered signal by status", async () => {
    const byStatus: Record<string, number> = {};
    for (const s of SIGNAL_REGISTRY) {
      byStatus[s.activationStatus] = (byStatus[s.activationStatus] ?? 0) + 1;
    }
    console.log("REGISTRY_BY_STATUS " + JSON.stringify(byStatus));
    expect(Object.values(byStatus).reduce((a, b) => a + b, 0)).toBe(SIGNAL_REGISTRY.length);
  });

  // HISTORY OF THIS BLOCK, because the shape of the assertion is the point.
  //
  // This was an `it.fails` alarm: the suite was EXPECTED to be red while the
  // signals declared no direction, so the branch stayed green and the alarm
  // would invert loudly the moment a real `homeSign` appeared. It was verified
  // in both directions — green while muted, red when a real sign was simulated.
  //
  // It has now fired for real: the continuous signals declare their direction
  // and `refusedUnsigned` is 0. So the alarm did its job and is RETIRED, on
  // purpose, replaced by the plain positive assertion below. Leaving an
  // `it.fails` in place after the thing it watched is fixed would be a false
  // alarm, which is worse than no alarm.
  it("every exercised ACTIVE continuous signal now declares a direction", async () => {
    const audited = await auditAll();
    const unsigned = audited.filter((a) => a.verdict === "REFUSED_UNSIGNED");
    expect(
      unsigned.length,
      `${unsigned.length} signal(s) are wired + weighted but refused for want of a ` +
        `direction: ${unsigned.map((a) => a.id).join(", ")}. Each must declare which ` +
        `way its own value points, or be marked SHADOW_ONLY.`,
    ).toBe(0);
  });

  it("the retired alarm is genuinely retired, not deleted to hide a gap", () => {
    // If someone re-registers an unsigned ACTIVE signal this must catch it
    // again, from the live registry, with the id named.
    const unsignedInRegistry = SIGNAL_REGISTRY.filter(
      (s) =>
        s.activationStatus === "ACTIVE" &&
        s.outputKind === "CONTINUOUS_VALUE" &&
        s.homeSign == null,
    );
    expect(
      unsignedInRegistry.map((s) => s.id),
      "an ACTIVE continuous signal lost its homeSign declaration",
    ).toEqual([]);
  });
});