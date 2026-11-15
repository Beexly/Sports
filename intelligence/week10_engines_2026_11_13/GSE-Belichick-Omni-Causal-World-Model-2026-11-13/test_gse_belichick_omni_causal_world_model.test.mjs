/**
 * Self-contained Node.js (`node --test`) verification suite for
 * `gse_belichick_omni_causal_world_model.ts`.
 *
 * Dynamically strips TypeScript annotations from `./gse_belichick_omni_causal_world_model.ts`
 * in memory so `node --test test_gse_belichick_omni_causal_world_model.test.mjs` runs
 * standalone in any environment without requiring global `tsc` or `tsx`.
 */

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function findMatchingDelim(s, start, openCh, closeCh) {
  let depth = 0;
  let inStr = null;
  for (let i = start; i < s.length; i++) {
    const ch = s[i];
    if (inStr) {
      if (ch === "\\") {
        i++;
        continue;
      }
      if (ch === inStr) inStr = null;
    } else {
      if (ch === "'" || ch === '"' || ch === "`") inStr = ch;
      else if (ch === openCh) depth++;
      else if (ch === closeCh) {
        depth--;
        if (depth === 0) return i;
      }
    }
  }
  throw new Error(`Unmatched ${openCh} at ${start}`);
}

function stripTsToMjs(src) {
  let s = src;
  while (true) {
    const m = /\bexport\s+interface\s+\w+\s*\{/.exec(s);
    if (!m) break;
    const bOpen = s.indexOf("{", m.index);
    const bClose = findMatchingDelim(s, bOpen, "{", "}");
    s = s.slice(0, m.index) + s.slice(bClose + 1);
  }
  s = s.replace(/\bexport\s+type\s+\w+\s*=[^;]+;/g, "");
  s = s.replace(/^\s*(?:private|public)\s+(?:readonly\s+)?\w+\s*:\s*[^;=]+;\s*$/gm, "");
  s = s.replace(/^\s*(?:public|private)\s+/gm, "  ");
  s = s.replace(/\s+as\s+const\b/g, "");
  s = s.replace(/\bnew\s+(Array|Set|Map)\s*<[^>()]+>\s*\(/g, "new $1(");
  s = s.replace(/(function\s+\w+)\s*<[^>{}()]+>\s*\(/g, "$1(");

  const headerPat = /((?:export\s+)?function\s+\w+|constructor|solveMatchup)\s*\(/g;
  let pos = 0;
  const chunks = [];
  let m;
  while ((m = headerPat.exec(s)) !== null) {
    if (m.index < pos) continue;
    chunks.push(s.slice(pos, m.index));
    const prefix = m[1];
    const pOpen = m.index + m[0].length - 1;
    const pClose = findMatchingDelim(s, pOpen, "(", ")");
    const rawParams = s.slice(pOpen + 1, pClose);

    const parts = [];
    let dp = 0, da = 0, db = 0, dk = 0;
    let cur = "";
    for (const ch of rawParams) {
      if (ch === "(") dp++;
      else if (ch === ")") dp--;
      else if (ch === "{") db++;
      else if (ch === "}") db--;
      else if (ch === "[") dk++;
      else if (ch === "]") dk--;
      else if (ch === "<") da++;
      else if (ch === ">" && da > 0) da--;
      if (ch === "," && dp === 0 && db === 0 && dk === 0 && da === 0) {
        parts.push(cur);
        cur = "";
      } else cur += ch;
    }
    if (cur) parts.push(cur);

    const cleanP = [];
    for (let p of parts) {
      p = p.trim();
      if (!p) continue;
      let eqIdx = -1;
      dp = 0; db = 0; dk = 0; da = 0;
      for (let i = 0; i < p.length; i++) {
        const ch = p[i];
        if (ch === "(") dp++;
        else if (ch === ")") dp--;
        else if (ch === "{") db++;
        else if (ch === "}") db--;
        else if (ch === "[") dk++;
        else if (ch === "]") dk--;
        else if (ch === "<") da++;
        else if (ch === ">" && da > 0) da--;
        else if (ch === "=" && dp === 0 && db === 0 && dk === 0 && da === 0 && p[i + 1] !== ">") {
          eqIdx = i;
          break;
        }
      }
      let lhs = p;
      let defSuffix = "";
      if (eqIdx !== -1) {
        lhs = p.slice(0, eqIdx).trim();
        defSuffix = " = " + p.slice(eqIdx + 1).trim();
      }
      const cIdx = lhs.indexOf(":");
      if (cIdx !== -1) lhs = lhs.slice(0, cIdx).trim();
      lhs = lhs.replace(/\?$/, "");
      cleanP.push(lhs + defSuffix);
    }

    let k = pClose + 1;
    while (k < s.length && /\s/.test(s[k])) k++;
    if (s[k] === ":") {
      k++;
      while (k < s.length && /\s/.test(s[k])) k++;
      if (s[k] === "{") {
        k = findMatchingDelim(s, k, "{", "}") + 1;
        while (k < s.length && s[k] !== "{") k++;
      } else {
        while (k < s.length && s[k] !== "{") k++;
      }
    }
    chunks.push(`${prefix}(${cleanP.join(", ")}) `);
    pos = k;
    headerPat.lastIndex = pos;
  }
  chunks.push(s.slice(pos));
  let res = chunks.join("");
  res = res.replace(/\b(const|let)\s+(\w+)\s*:\s*[^=;\n]+(?=\s*=)/g, "$1 $2");
  res = res.replace(/\((\w+)\s*:\s*[^()=]+\)\s*=>/g, "($1) =>");
  return res;
}

const tsSource = fs.readFileSync(path.join(__dirname, "gse_belichick_omni_causal_world_model.ts"), "utf8");
const mjsCode = stripTsToMjs(tsSource);
const gse = await import(`data:text/javascript;base64,${Buffer.from(mjsCode, "utf8").toString("base64")}`);

test("1. Belichick Level-k Recursive Mind & Class-A Book Firewall", () => {
  const mind = new gse.BelichickCoordinatorMind(1.5, 7.0);
  const ocPrior = {
    UNDER_CENTER_PA_SHOT: 0.24,
    QUICK_GAME_SIGHT_ADJUST: 0.22,
    SPREAD_INTERMEDIATE_DAGGER: 0.20,
    CONDENSED_OUTSIDE_ZONE_RUN: 0.24,
    SCREEN_DELAY_DRAW: 0.10,
  };
  const dcPrior = {
    BASE_SINGLE_HIGH_COVER_1_3: 0.48,
    NICKEL_SPLIT_SAFETY_QUARTERS: 0.18,
    SIMULATED_PRESSURE_CREEPER: 0.12,
    ZERO_ALL_OUT_BLITZ: 0.12,
    BELICHICK_OPTION1_BRACKET: 0.10,
  };
  const profile = {
    coordinatorId: "OC_CHI",
    scriptedEpaPerPlay: 0.24,
    unscriptedEpaPerPlay: 0.06,
    scriptedPlaysSample: 120,
    unscriptedPlaysSample: 480,
    halftimeRescriptEpaBoost: 0.07,
    treePriorCliffDelta: -0.11,
    rolling3WkTopTendencyRate: 0.64,
    isPostByeOrDivisional: false,
  };
  const state = {
    playNumberInGame: 8, quarter: 1, quarterPlayIndex: 8,
    secondsRemainingHalf: 1420, secondsRemainingGame: 3220, scoreDiffOffense: 0,
    down: 1, yardsToGo: 10, yardline100: 65, offenseTimeouts: 3, defenseTimeouts: 3,
    offenseReceivesQ3Kickoff: true, probQuickPressureSub2s: 0.08, acousticCrowdSplDb: 84,
    playClockRemainingSec: 18, motionRate: 0.82, tightSplitRate: 0.76,
    coachAggressionIndex: 0.72, coachAnimusScore: 0.80,
  };
  const eq = mind.solveMatchup({ ocLevelK: 2, dcLevelK: 2, ocHabitPrior: ocPrior, dcHabitPrior: dcPrior, ocScriptProfile: profile, state });
  assert.ok(eq.ocPolicy.UNDER_CENTER_PA_SHOT > 0);
  assert.ok(eq.coordinatorScriptCliffDelta < -0.12);
  assert.throws(
    () => mind.solveMatchup({ ocLevelK: 1, dcLevelK: 1, ocHabitPrior: ocPrior, dcHabitPrior: dcPrior, ocScriptProfile: profile, state, classAEnvelopeGuard: { spread_line: -3.0 } }),
    gse.ClassAFirewallViolationError
  );
});

test("2. Rulebook Clock Leverage & Fourth-Down Causal WPA", () => {
  const fd = gse.evaluateFourthDownCausalWpa({
    conversionProb: 0.61, wpIfConvert: 0.64, wpIfFail: 0.33, wpIfPunt: 0.41,
    wpIfFieldGoal: 0.56, fgMakeProb: 0.48, coachAggressionIndex: 0.85, coachAnimusScore: 0.80,
  });
  assert.equal(fd.optimalAction, "GO");
  assert.ok(Math.abs(fd.deltaWpGoVsAlt - 0.0787) < 1e-4);

  const clock = gse.evaluateRulebookClockLeverage({
    playNumberInGame: 58, quarter: 4, quarterPlayIndex: 14,
    secondsRemainingHalf: 75, secondsRemainingGame: 75, scoreDiffOffense: 6,
    down: 1, yardsToGo: 10, yardline100: 45, offenseTimeouts: 2, defenseTimeouts: 0,
    offenseReceivesQ3Kickoff: false, probQuickPressureSub2s: 0.05, acousticCrowdSplDb: 88,
    playClockRemainingSec: 25, motionRate: 0.2, tightSplitRate: 0.8,
    coachAggressionIndex: 0.7, coachAnimusScore: 0.2,
  });
  assert.equal(clock.victoryKneeldownDeterministic, true);
});

test("3. Stage A 288-Bit Situational Bitmask & Honest DataGapError Refusal", () => {
  const ctx = {
    gameId: "2026-10-22-NE-CHI-401873010", league: "NFL",
    validTimeUnix: 1792709100, txTimeUnix: 1792709120, decisionTimeUnix: 1792710000, kickoffTimeUnix: 1792714500,
    temperatureF: 59.5, windSpeedMph: 5.1, precipitationRateMmHr: 0.0, altitudeFt: 594, surfaceTractionCoeff: 0.88,
    isDome: false, daysRestHome: 4, daysRestAway: 4, timezoneShiftHours: 1.0,
    homeInteriorOlOutCount: 0, awayInteriorOlOutCount: 2,
    homeIlb1Out: true, homeIlb2Out: true, awayIlb1Out: false, awayIlb2Out: false,
    homeProjectedSackRate: 0.032, awayProjectedSackRate: 0.068,
    homeCb1Out: false, awayCb1Out: true, homeNickelCbActive: true, awayNickelCbActive: true,
    homeTwoHighShellRate: 0.58, awayTwoHighShellRate: 0.56,
    totalSteamMovePts: 3.5, spreadLineAbs: 3.0, offensivePaceSec: 25.8, combinedProe: 0.045,
    coachAggressivenessDelta: 0.14, officiatingPenaltyRate: 13.33, homeQbYpa: 8.1, awayQbYpa: 7.9,
    homeAcwr: 1.18, awayAcwr: 1.22, crowdDecibels: 98.5,
    homeRookieRouteRampInflection: true, awayRookieRouteRampInflection: true, qbRushPropHookInDangerZone: true,
  };
  const mask = gse.buildContextualBitmask288(ctx);
  assert.equal(mask.words.length, 9);
  assert.equal(mask.secondOrderFlags.mutualDefSpineVoid, true);
  assert.equal(mask.secondOrderFlags.ilbVoidNickelActiveTeRbFunnel, true);
  assert.throws(() => gse.buildContextualBitmask288({ ...ctx, windSpeedMph: Number.NaN }), gse.DataGapError);
});

test("4. Stage B Shpitser-Pearl ID, HCID Mediator Expansion, Napkin RATIO & VanderWeele E-Value", () => {
  const bow = { nodes: ["X", "Y"], directed: [["X", "Y"]], bidirected: [["X", "Y"]] };
  assert.equal(gse.runShpitserPearlID(new Set(["Y"]), new Set(["X"]), bow).identifiable, false);

  const expanded = gse.expandEdgeWithHcidMediator(bow, ["X", "Y"], "M");
  assert.equal(gse.runShpitserPearlID(new Set(["Y"]), new Set(["X"]), expanded).formulaClass, "FRONT_DOOR_OR_C_COMPONENT_FACTORIZATION");

  const napkin = {
    nodes: ["W", "Z", "X", "Y"],
    directed: [["W", "Z"], ["Z", "X"], ["X", "Y"]],
    bidirected: [["W", "X"], ["W", "Y"]],
  };
  const napRes = gse.runShpitserPearlID(new Set(["Y"]), new Set(["X"]), napkin);
  assert.equal(napRes.formulaClass, "TIAN_C_FACTOR_RATIO");
  assert.equal(napRes.formula?.kind, "RATIO");

  const treated = Array.from({ length: 40 }, (_, i) => 0.85 + 0.35 * Math.sin(i + 1));
  const control = Array.from({ length: 40 }, (_, i) => 0.00 + 0.35 * Math.cos(i + 1));
  const ev = gse.computeVanderWeeleEValue(treated, control);
  assert.equal(ev.passed, true);
  assert.ok(ev.eValuePoint >= 1.35);
});

test("5. Stage C & D FWL Orthogonalization, Baranchik JS+ & Murphy Brier Partition", () => {
  const mAnch = Array.from({ length: 30 }, (_, i) => [Math.sin(i + 1) * 3.0]);
  const xSig = Array.from({ length: 30 }, (_, i) => [0.8 * mAnch[i][0] + Math.cos(i + 2)]);
  const yOut = Array.from({ length: 30 }, (_, i) => 2.0 + 1.1 * mAnch[i][0] + 2.25 * xSig[i][0]);
  const fwl = gse.frischWaughLovellOrthogonalize(xSig, mAnch, yOut);
  assert.ok(fwl.maxAnchorOrthogonalityError < 1e-11);
  assert.ok(Math.abs(fwl.tauHat[0] - 2.25) < 1e-9);

  const js = gse.positivePartJamesStein([0.02, -0.01, 0.015, -0.012, 0.008], [0.01, 0.01, 0.01, 0.01, 0.01]);
  assert.equal(js.shrinkageFactor, 0.0);

  const mb = gse.murphyBrierDecomposition(
    [0.12, 0.18, 0.33, 0.37, 0.52, 0.58, 0.74, 0.79, 0.88, 0.91],
    [0, 0, 0, 1, 0, 1, 1, 1, 1, 1],
    5
  );
  assert.ok(mb.partitionIdentityError < 1e-14);
});

test("6. Subsystem 3 SiriusXM Channel 87 Bayesian Audio Claim Veracity Updater", () => {
  const speakerPriors = {
    HC_SHANAHAN_ARCHETYPE: { speakerId: "HC_SHANAHAN_ARCHETYPE", injuryAlpha: 10, injuryBeta: 14, schemeAlpha: 22, schemeBeta: 4 },
  };
  const resSmoke = gse.evaluateSiriusXMAudioClaims({
    subjectPlayerId: "GB-WR-GOLDEN", priorAvailabilityProb: 0.50, speakerPriors, decisionTimeUnix: 1793200100,
    utterances: [{
      utteranceId: "u1", channelId: 87, showOrSource: "SiriusXM Ch 87",
      speakerId: "HC_SHANAHAN_ARCHETYPE", speakerRole: "HEAD_COACH", subjectPlayerId: "GB-WR-GOLDEN",
      transcriptText: "We are working through it with Matthew, we are hopeful and day-to-day.",
      deepgramModel: "nova-2-general", wordConfidenceMean: 0.96, validTimeUnix: 1793200000, txTimeUnix: 1793200005,
    }],
  });
  assert.equal(resSmoke.governanceAction, "COACHSPEAK_MUTED");
  assert.equal(resSmoke.appliedLogOddsDelta, 0.0);
});
