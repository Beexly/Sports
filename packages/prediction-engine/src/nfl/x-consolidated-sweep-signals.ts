/**
 * GSE 2026 X Consolidated Sweep Signals & High-Leverage Analytics Module
 * =======================================================================
 * Implements all 7 high-leverage and previously deferred analytical engines from
 * `docs/data-sources/research/2026-10-29/X-ALL-SWEEPS-CONSOLIDATED.md`:
 *
 * 1. `@BeatTheRecords` Rush Concept Splits (`computeRushConceptZoneGapMatchup`):
 *    - Zone vs Man/Gap YPC Allowed & RB concept scheme fit (e.g. GB allows 5.29 YPC
 *      vs Zone #4 highest vs 2.57 YPC vs Man/Gap #32 lowest; CAR allows 5.71 YPC vs Man/Gap #1).
 *    - Baseline league YPC: 4.30.
 *
 * 2. `@BeatTheRecords` WR Alignment Yards Allowed (`computeWrAlignmentSlotOutsideMatchup`):
 *    - Outside WR vs Slot WR allowed yardage funnels (e.g. DAL allows 84.5 slot YPG #1
 *      vs 84.2 outside YPG #26; JAX/HOU/ATL bleed perimeter WR yards at 156.8, 136.5, 132.3 YPG).
 *    - Baseline league: 54.0 slot YPG, 98.0 outside YPG.
 *
 * 3. `@RyanPaganetti` 2nd-and-1 Sneak Opportunity Tax & Base Defense Trap
 *    (`evaluateSecondAndOneSneakAndBaseDefenseTrap`):
 *    - 2nd-and-1 sneak converts >90% but burns the highest-EV deep shot in football (-0.18 EPA/opp).
 *    - Base Defense vs Heavy Personnel mismatch (e.g. CHI Base allows >7.5 YPP #32 when forced into Base).
 *
 * 4. `@ihartitz` Mismatch Manifesto Combined Metrics (`computeMismatchManifestoCombinedYbcAndExplosive`):
 *    - Combined RB Yards Before Contact per carry (baseline: 2.45) + Combined Explosive Play Rate (baseline: 11.2%).
 *
 * 5. `@mockingboardapp` Altitude Split-Half Reliability Shrinkage & Box Score Scout xFP
 *    (`applyAltitudeSplitHalfReliabilityShrinkage`):
 *    - De-noises single-game volatility using empirical split-half reliabilities (QB: 0.147, TE: 0.449, WR: 0.356, RB: 0.307)
 *      under the doctrine "delete provable luck, never add identity".
 *    - Baseline opportunity xFP from routes run, air yards, red zone targets, and inside-the-5 carries.
 *
 * 6. `@RyNoonan` Tackle-Prop Edge Engine & In-House Referee Crew Mix (C-297)
 *    (`evaluateTacklePropAndInHouseRefereeCrewMix`):
 *    - Tackle props evaluated against >= 5% edge threshold from Ry Noonan's 939-742 (+95.5u) audited record.
 *    - C-297 In-House Referee penalty mix (offensive holding vs DPI drive-extension variance & home-bias whistle).
 *
 * 7. `@thelocktalk` 1Q Structures — The Script, The Stop & The 1Q Math (`computeFirstQuarterScriptStopMath`):
 *    - 1Q accounts for ~20% of full-game scoring but ~37% of the full-game home-field edge.
 *    - Scripted drive EPA edge + 1st-drive stop rate suppression.
 */

// ============================================================================
// 1. Rush Concept Splits (Zone vs Man/Gap) — @BeatTheRecords
// ============================================================================

export type PrimaryExploitConcept = "ZONE_BLEED" | "MAN_GAP_BLEED" | "BALANCED";

export interface RushConceptZoneGapInput {
  offZoneSharePct: number;
  offGapSharePct: number;
  offZoneYpc: number;
  offGapYpc: number;
  defZoneYpcAllowed: number;
  defGapYpcAllowed: number;
  projectedCarries: number;
}

export interface RushConceptZoneGapResult {
  expectedConceptYpc: number;
  conceptYpcDelta: number;
  rushYardsAdjustment: number;
  primaryExploitConcept: PrimaryExploitConcept;
}

export function computeRushConceptZoneGapMatchup(
  input: RushConceptZoneGapInput,
): RushConceptZoneGapResult {
  const zoneWeight = Math.max(0, Math.min(1, input.offZoneSharePct / 100));
  const gapWeight = Math.max(0, Math.min(1, input.offGapSharePct / 100));
  const normSum = Math.max(1e-6, zoneWeight + gapWeight);
  const wZone = zoneWeight / normSum;
  const wGap = gapWeight / normSum;

  const expectedConceptYpc =
    wZone * ((input.offZoneYpc + input.defZoneYpcAllowed) / 2) +
    wGap * ((input.offGapYpc + input.defGapYpcAllowed) / 2);

  const conceptYpcDelta = Number((expectedConceptYpc - 4.3).toFixed(3));
  const rushYardsAdjustment = Number(
    (conceptYpcDelta * input.projectedCarries * 0.65).toFixed(2),
  );

  const zoneGapDiff = input.defZoneYpcAllowed - input.defGapYpcAllowed;
  const primaryExploitConcept: PrimaryExploitConcept =
    zoneGapDiff >= 0.6
      ? "ZONE_BLEED"
      : input.defGapYpcAllowed - input.defZoneYpcAllowed >= 0.6
        ? "MAN_GAP_BLEED"
        : "BALANCED";

  return {
    expectedConceptYpc: Number(expectedConceptYpc.toFixed(3)),
    conceptYpcDelta,
    rushYardsAdjustment,
    primaryExploitConcept,
  };
}

// ============================================================================
// 2. WR Alignment Yards Allowed (Outside vs Slot) — @BeatTheRecords
// ============================================================================

export type AlignmentFunnelTag = "SLOT_BLEED" | "PERIMETER_BLEED" | "BALANCED";

export interface WrAlignmentSlotOutsideInput {
  wrSlotSnapSharePct: number;
  wrOutsideSnapSharePct: number;
  defSlotYpgAllowed: number;
  defOutsideYpgAllowed: number;
  baseProjectedRecYards: number;
}

export interface WrAlignmentSlotOutsideResult {
  slotRatio: number;
  outsideRatio: number;
  receivingYardsAdjustment: number;
  alignmentFunnelTag: AlignmentFunnelTag;
}

export function computeWrAlignmentSlotOutsideMatchup(
  input: WrAlignmentSlotOutsideInput,
): WrAlignmentSlotOutsideResult {
  const slotRatio = input.defSlotYpgAllowed / 54.0;
  const outsideRatio = input.defOutsideYpgAllowed / 98.0;

  const wSlot = Math.max(0, Math.min(1, input.wrSlotSnapSharePct / 100));
  const wOut = Math.max(0, Math.min(1, input.wrOutsideSnapSharePct / 100));

  const blendedMultiplier = wSlot * slotRatio + wOut * outsideRatio;
  const receivingYardsAdjustment = Number(
    ((blendedMultiplier - 1.0) * input.baseProjectedRecYards * 0.55).toFixed(2),
  );

  const alignmentFunnelTag: AlignmentFunnelTag =
    slotRatio >= 1.25
      ? "SLOT_BLEED"
      : outsideRatio >= 1.25
        ? "PERIMETER_BLEED"
        : "BALANCED";

  return {
    slotRatio: Number(slotRatio.toFixed(3)),
    outsideRatio: Number(outsideRatio.toFixed(3)),
    receivingYardsAdjustment,
    alignmentFunnelTag,
  };
}

// ============================================================================
// 3. 2nd & 1 Sneak Negative EPA & Base Defense Trap — @RyanPaganetti
// ============================================================================

export interface SecondAndOneSneakAndBaseDefenseInput {
  secondAndOneSneakRatePct: number;
  offHeavyPersonnelRatePct: number;
  defBasePersonnelYppAllowed: number;
  defNickelYppAllowed: number;
}

export interface SecondAndOneSneakAndBaseDefenseResult {
  sneakOpportunityTaxEpa: number;
  baseVsNickelYppGap: number;
  heavyPersonnelExploitPts: number;
  isBaseDefenseTrap: boolean;
}

export function evaluateSecondAndOneSneakAndBaseDefenseTrap(
  input: SecondAndOneSneakAndBaseDefenseInput,
): SecondAndOneSneakAndBaseDefenseResult {
  const sneakOpportunityTaxEpa = Number(
    (-0.18 * (input.secondAndOneSneakRatePct / 100)).toFixed(4),
  );
  const baseVsNickelYppGap = Number(
    (input.defBasePersonnelYppAllowed - input.defNickelYppAllowed).toFixed(3),
  );

  const heavyPersonnelExploitPts =
    input.defBasePersonnelYppAllowed >= 6.4 &&
    input.offHeavyPersonnelRatePct >= 24
      ? Number(
          (
            (input.defBasePersonnelYppAllowed - 5.6) *
            (input.offHeavyPersonnelRatePct / 100) *
            2.4
          ).toFixed(2),
        )
      : 0;

  const isBaseDefenseTrap =
    input.defBasePersonnelYppAllowed >= 6.5 && baseVsNickelYppGap >= 0.8;

  return {
    sneakOpportunityTaxEpa,
    baseVsNickelYppGap,
    heavyPersonnelExploitPts,
    isBaseDefenseTrap,
  };
}

// ============================================================================
// 4. Mismatch Manifesto Combined YBC & Explosive Plays — @ihartitz
// ============================================================================

export interface MismatchManifestoCombinedInput {
  offYbcPerCarry: number;
  defYbcAllowedPerCarry: number;
  offExplosivePlayRatePct: number;
  defExplosivePlayRateAllowedPct: number;
}

export interface MismatchManifestoCombinedResult {
  combinedYbcPerCarry: number;
  combinedYbcEdge: number;
  combinedExplosiveRatePct: number;
  totalPointsAdjustment: number;
}

export function computeMismatchManifestoCombinedYbcAndExplosive(
  input: MismatchManifestoCombinedInput,
): MismatchManifestoCombinedResult {
  const combinedYbcPerCarry = Number(
    ((input.offYbcPerCarry + input.defYbcAllowedPerCarry) / 2).toFixed(3),
  );
  const combinedYbcEdge = Number((combinedYbcPerCarry - 2.45).toFixed(3));
  const combinedExplosiveRatePct = Number(
    (
      (input.offExplosivePlayRatePct + input.defExplosivePlayRateAllowedPct) /
      2
    ).toFixed(2),
  );
  const totalPointsAdjustment = Number(
    (
      (combinedExplosiveRatePct - 11.2) * 0.45 +
      combinedYbcEdge * 1.1
    ).toFixed(2),
  );

  return {
    combinedYbcPerCarry,
    combinedYbcEdge,
    combinedExplosiveRatePct,
    totalPointsAdjustment,
  };
}

// ============================================================================
// 5. Altitude Split-Half Reliability Shrinkage & xFP — @mockingboardapp
// ============================================================================

export type AltitudePosition = "QB" | "TE" | "WR" | "RB";

export interface AltitudeSplitHalfInput {
  position: AltitudePosition;
  observedSingleGameMetric: number;
  priorBaselineMetric: number;
  routesRun?: number;
  airYards?: number;
  redZoneTargets?: number;
  insideFiveCarries?: number;
}

export interface AltitudeSplitHalfResult {
  position: AltitudePosition;
  reliabilityWeight: number;
  shrunkMetric: number;
  xFpOpportunityScore: number;
}

export function applyAltitudeSplitHalfReliabilityShrinkage(
  input: AltitudeSplitHalfInput,
): AltitudeSplitHalfResult {
  const reliabilityWeight =
    input.position === "QB"
      ? 0.147
      : input.position === "TE"
        ? 0.449
        : input.position === "WR"
          ? 0.356
          : 0.307;

  const shrunkMetric = Number(
    (
      input.priorBaselineMetric +
      reliabilityWeight *
        (input.observedSingleGameMetric - input.priorBaselineMetric)
    ).toFixed(4),
  );

  const xFpOpportunityScore = Number(
    (
      (input.routesRun ?? 0) * 0.22 +
      (input.airYards ?? 0) * 0.065 +
      (input.redZoneTargets ?? 0) * 1.85 +
      (input.insideFiveCarries ?? 0) * 2.4
    ).toFixed(2),
  );

  return {
    position: input.position,
    reliabilityWeight,
    shrunkMetric,
    xFpOpportunityScore,
  };
}

// ============================================================================
// 6. Tackle Prop >=5% Edge Engine & In-House Referee Crew Mix (C-297) — @RyNoonan
// ============================================================================

export type TacklePropDecision = "PLAY_OVER" | "PLAY_UNDER" | "PASS";

export interface TacklePropRefereeMixInput {
  projectedDefensiveSnaps: number;
  playerTacklePerSnapRate: number;
  tackleAssistConversionFactor: number;
  marketTackleLine: number;
  crewOffHoldingPerGame: number;
  crewDpiPerGame: number;
  crewHomeFlagDifferential: number;
}

export interface TacklePropRefereeMixResult {
  projectedTackles: number;
  tackleEdgePct: number;
  tacklePropDecision: TacklePropDecision;
  crewTotalPointsDelta: number;
  crewSpreadHomeDelta: number;
}

export function evaluateTacklePropAndInHouseRefereeCrewMix(
  input: TacklePropRefereeMixInput,
): TacklePropRefereeMixResult {
  const projectedTackles = Number(
    (
      input.projectedDefensiveSnaps *
      input.playerTacklePerSnapRate *
      input.tackleAssistConversionFactor
    ).toFixed(2),
  );

  const tackleEdgePct = Number(
    (
      ((projectedTackles - input.marketTackleLine) /
        Math.max(1, input.marketTackleLine)) *
      100
    ).toFixed(2),
  );

  const tacklePropDecision: TacklePropDecision =
    Math.abs(tackleEdgePct) >= 5.0
      ? tackleEdgePct > 0
        ? "PLAY_OVER"
        : "PLAY_UNDER"
      : "PASS";

  const crewTotalPointsDelta = Number(
    (
      (input.crewDpiPerGame - 1.1) * 1.65 -
      (input.crewOffHoldingPerGame - 2.6) * 0.95
    ).toFixed(2),
  );

  const crewSpreadHomeDelta = Number(
    (-input.crewHomeFlagDifferential * 0.35).toFixed(2),
  );

  return {
    projectedTackles,
    tackleEdgePct,
    tacklePropDecision,
    crewTotalPointsDelta,
    crewSpreadHomeDelta,
  };
}

// ============================================================================
// 7. 1Q Structures: The Script, The Stop & The 1Q Math — @thelocktalk
// ============================================================================

export type ScriptStopVerdict = "1Q_HOME_SCRIPT" | "1Q_UNDER_STOP" | "PASS";

export interface FirstQuarterScriptStopInput {
  fullGameSpreadHome: number;
  fullGameTotal: number;
  homeOpeningScriptEpaPerPlay: number;
  awayOpeningScriptEpaPerPlay: number;
  homeFirstDriveStopRatePct: number;
  awayFirstDriveStopRatePct: number;
}

export interface FirstQuarterScriptStopResult {
  fair1QSpreadHome: number;
  fair1QTotal: number;
  scriptEdgePtsHome: number;
  stopSuppressionPts: number;
  scriptStopVerdict: ScriptStopVerdict;
}

export function computeFirstQuarterScriptStopMath(
  input: FirstQuarterScriptStopInput,
): FirstQuarterScriptStopResult {
  const base1QTotal = input.fullGameTotal * 0.2;
  const base1QSpreadHome = input.fullGameSpreadHome * 0.23 - 0.37 * 1.5 * 0.25;

  const scriptEdgePtsHome =
    (input.homeOpeningScriptEpaPerPlay - input.awayOpeningScriptEpaPerPlay) *
    2.8;

  const stopSuppressionPts =
    ((input.homeFirstDriveStopRatePct + input.awayFirstDriveStopRatePct) / 2 -
      58.0) *
    0.045;

  const fair1QSpreadHome = Number(
    (base1QSpreadHome - scriptEdgePtsHome).toFixed(2),
  );
  const fair1QTotal = Number((base1QTotal - stopSuppressionPts).toFixed(2));

  const scriptStopVerdict: ScriptStopVerdict =
    scriptEdgePtsHome >= 0.45
      ? "1Q_HOME_SCRIPT"
      : stopSuppressionPts >= 0.4
        ? "1Q_UNDER_STOP"
        : "PASS";

  return {
    fair1QSpreadHome,
    fair1QTotal,
    scriptEdgePtsHome: Number(scriptEdgePtsHome.toFixed(2)),
    stopSuppressionPts: Number(stopSuppressionPts.toFixed(2)),
    scriptStopVerdict,
  };
}

// ============================================================================
// 8. SiriusXM Week 7 Reaction Monday (Jeff Mans / Elite Sports) Process & Injury Overlay
// ============================================================================

export interface SiriusXmRadioReactionInput {
  readonly away: string;
  readonly home: string;
}

export interface SiriusXmRadioReactionResult {
  readonly totalPointsDelta: number;
  readonly spreadHomeDelta: number;
  readonly processFadeFlag: string | null;
  readonly usageFloorBoostPlayer: string | null;
  readonly injuryBackfieldNote: string | null;
  readonly radioTakeawaySummary: string;
}

export function evaluateSiriusXmRadioReactionSignals(
  input: SiriusXmRadioReactionInput,
): SiriusXmRadioReactionResult {
  const pair = `${input.away}@${input.home}`;
  switch (pair) {
    case "CAR@GB":
      return {
        totalPointsDelta: -0.65,
        spreadHomeDelta: -0.15,
        processFadeFlag: "Josh Jacobs raw YPC box-score chase (pass-game checkdowns carried W7 fantasy line)",
        usageFloorBoostPlayer: "Christian Watson (WR1 81% W7 snaps) & Tucker Kraft (TE1 88% W7 snaps)",
        injuryBackfieldNote: "Jayden Reed (IR since W2) & Matthew Golden (W8 DNP - Shoulder) out; LaFleur/Campbell W7 20-17 mutual-conservative script reinforces UNDER 47.5.",
        radioTakeawaySummary:
          "GB-DET W7 produced 37 total points as LaFleur bypassed high-variance plays and leaned on controlled clock + pass-catching backfield touches.",
      };
    case "MIN@DET":
      return {
        totalPointsDelta: -0.85,
        spreadHomeDelta: -0.25,
        processFadeFlag: "Vikings 6-0 offensive box-score perception (offense 4th-fewest yards, 150 pass yds in W7)",
        usageFloorBoostPlayer: "Jordan Mason (MIN RB1, 55% W7 snaps, 15 carries / 68 yds)",
        injuryBackfieldNote: "Aaron Jones aggravated prior MCL in W7 (left early, 28% snaps, DNP early W8); Jordan Mason is the primary early-down carrier.",
        radioTakeawaySummary:
          "Minnesota's 6-0 record is driven by Brian Flores' championship-caliber defense (16-10 W7 win) while the offense remains stagnant; DET-GB W7 also stayed under (20-17).",
      };
    case "LV@NYJ":
      return {
        totalPointsDelta: -0.35,
        spreadHomeDelta: 0.15,
        processFadeFlag: "Raiders downfield pocket attack (immobile pocket limiting rushing lanes)",
        usageFloorBoostPlayer: "Ashton Jeanty (8 rush / 15 yds + 8 rec / 61 yds / 1 TD = 21.6 PPR in W7)",
        injuryBackfieldNote: "Ashton Jeanty 8-target receiving funnel insulates his yardage floor regardless of rushing YPC.",
        radioTakeawaySummary:
          "Ashton Jeanty's elite receiving involvement (8 catches, 61 rec yds in W7) provides a high-floor checkdown outlet against NYJ's 4-man pass rush.",
      };
    case "TEN@CIN":
      return {
        totalPointsDelta: -0.2,
        spreadHomeDelta: -0.2,
        processFadeFlag: "Tony Pollard W7 3-TD box-score mirage (25 carries, 129 yds, 3 TDs at 35% DFS ownership vs CLE)",
        usageFloorBoostPlayer: "Chase Brown & Ja'Marr Chase (CIN positive script)",
        injuryBackfieldNote: "Fade public recency bias chasing Tony Pollard's 3-TD Week 7 outlier in a +10.0 road underdog script at Cincinnati.",
        radioTakeawaySummary:
          "Tony Pollard's 3-TD Week 7 explosion was flagged as textbook bad-process box-score chasing; do not pay a recency tax on TEN rushing in a double-digit road dog script.",
      };
    case "BAL@BUF":
      return {
        totalPointsDelta: -0.45,
        spreadHomeDelta: -0.3,
        processFadeFlag: "Uncapped Baltimore offensive ceiling on Lamar Jackson's first game back from 3-week high-ankle sprain",
        usageFloorBoostPlayer: "Derrick Henry & James Cook",
        injuryBackfieldNote: "Lamar Jackson missed 3 consecutive games (high ankle sprain; CIN 35-13 whitewash over Tyler Huntley in W7) and returns at Highmark Stadium.",
        radioTakeawaySummary:
          "Baltimore was routed 35-13 in W7 without Lamar Jackson; even with Jackson returning in W8, post-ankle-sprain mobility warrants pass discipline on the full-game spread.",
      };
    case "KC@DEN":
      return {
        totalPointsDelta: 0.25,
        spreadHomeDelta: 0.2,
        processFadeFlag: null,
        usageFloorBoostPlayer: "Bo Nix (62-yard W7 scramble + first-play seam to Courtland Sutton)",
        injuryBackfieldNote: "Bo Nix unlocked designed/scramble rushing equity in W7, giving Denver live backdoor/dog resilience at altitude.",
        radioTakeawaySummary:
          "Bo Nix finally activated his rushing legs (62-yard run in W7) alongside early vertical shots to Courtland Sutton.",
      };
    case "CHI@SEA":
      return {
        totalPointsDelta: 0.3,
        spreadHomeDelta: 0.25,
        processFadeFlag: null,
        usageFloorBoostPlayer: "Caleb Williams & Rome Odunze / D'Andre Swift",
        injuryBackfieldNote: "Caleb Williams graded as legitimate top-5 trajectory under Ben Johnson's motion/play-action crossers.",
        radioTakeawaySummary:
          "Caleb Williams continues his ascent into top-tier pocket + play-action efficiency, keeping Chicago live inside the number at Seattle.",
      };
    default:
      return {
        totalPointsDelta: 0.0,
        spreadHomeDelta: 0.0,
        processFadeFlag: null,
        usageFloorBoostPlayer: null,
        injuryBackfieldNote: null,
        radioTakeawaySummary: "Process-over-results discipline enforced across Week 8.",
      };
  }
}
