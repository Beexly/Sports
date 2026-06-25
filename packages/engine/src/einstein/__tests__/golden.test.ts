/**
 * Golden scenarios — the Einstein pipeline end-to-end through the real engines.
 *   A) a confirmed injury shock with a lagging derivative prop  → EXECUTABLE_SHADOW
 *   B) a public overreaction with no causal conservation support → WATCHLIST (attention-contaminated)
 *   C) an apparent stale book killed by spread/latency/friction  → FRICTION_KILLED
 */
import { describe, it, expect } from "vitest";
import { evaluateLightCone, type ShockTimeline } from "../information-light-cone.js";
import { expectShock, diagnoseShock } from "../shock-calculus.js";
import { checkMovementWithoutParent } from "../conservation-law.js";
import { assessTradability } from "../tradability-filter.js";
import { convene, type BeliefTransitionEvidence } from "../self-disproof-court.js";
import { assembleBeliefTransition } from "../belief-transition.js";

const timeline: ShockTimeline = {
  eventId: "wr1-out", eventType: "inactive",
  eventTime: "2024-09-08T16:30:00Z", sourceFirstSeenTime: "2024-09-08T16:35:00Z", sourceConfirmedTime: "2024-09-08T16:40:00Z",
  marketFamilyAbsorptionTime: { player_props: "2024-09-08T17:10:00Z", spread: "2024-09-08T16:50:00Z" },
};
const decisionTime = "2024-09-08T16:45:00Z";
const cleanCourt: BeliefTransitionEvidence = {
  bookDnaNoisyOrdering: false, shockAlreadyPriced: false, conservationViolationReal: true,
  lightConeStatus: "inside_window", tradabilityStatus: "EXECUTABLE_SHADOW", clvBeatSharpClose: true,
  survivesSeparation: true, dataRightsCleared: true, publishingErodesTrust: false,
};

describe("Scenario A — injury shock, lagging derivative prop", () => {
  it("assembles to EXECUTABLE_SHADOW: knowable, coherent, court-clear, survives friction", () => {
    const lightCone = evaluateLightCone(timeline, { decisionTime, marketFamily: "player_props" });
    expect(lightCone.status).toBe("inside_window");
    const diag = diagnoseShock(expectShock("inactive"), [{ market: "that_player_props", moved: false }]);
    expect(diag[0]!.diagnosis).toBe("stale_book");
    const trad = assessTradability({ rawEdge: 0.06, vig: 0.01, spread: 0.005, latencyCost: 0.005, executeMin: 3, windowMin: 25, limitProxy: 0.7, correlationPenalty: 0.005, modelError: 0.005, dataQualityOk: true, publicationDelayCost: 0.005 });
    expect(trad.status).toBe("EXECUTABLE_SHADOW");
    const court = convene({ ...cleanCourt, lightConeStatus: lightCone.status, tradabilityStatus: trad.status });
    const bt = assembleBeliefTransition({
      id: "A", marketKey: "player_reception_yds:WR2", decisionTime,
      whatChanged: "WR1 ruled out", whatShouldHaveChanged: "WR2 receptions/yards rise", whatFailedToChange: "WR2 reception line unmoved",
      fleshStateTrigger: "WR1 inactive", marketStateTrigger: "derivative prop lag",
      shockDiagnoses: diag, provenance: { discoveredBy: "shock-calculus" },
      lightCone, dataQualityStatus: "ok", rightsStatus: "cleared", tradability: trad, court,
      graveyard: { matched: false, deadEdge: null, suppressionNote: null }, immuneSurvived: true,
    });
    expect(bt.disposition).toBe("EXECUTABLE_SHADOW");
  });
});

describe("Scenario B — public overreaction, no causal conservation support", () => {
  it("a market that moved with no causal parent is not chased — capped at WATCHLIST", () => {
    const conservation = checkMovementWithoutParent(["team_total:KC"], new Set()); // no justified parent
    expect(conservation[0]!.law).toBe("movement_without_parent");
    const lightCone = evaluateLightCone(timeline, { decisionTime, marketFamily: "team_total" });
    const trad = assessTradability({ rawEdge: 0.06, vig: 0.01, spread: 0.005, latencyCost: 0.005, executeMin: 3, windowMin: 25, limitProxy: 0.6, correlationPenalty: 0.005, modelError: 0.005, dataQualityOk: true, publicationDelayCost: 0.005 });
    // The court flags the conservation as a possible low-liquidity artifact (no confirmed real violation).
    const court = convene({ ...cleanCourt, conservationViolationReal: false, conservationLowLiquidity: true, clvBeatSharpClose: false, lightConeStatus: lightCone.status, tradabilityStatus: trad.status, survivesSeparation: false });
    expect(court.survives).toBe(false); // ModelProsecutor FAIL (survivesSeparation false)
    const bt = assembleBeliefTransition({
      id: "B", marketKey: "team_total:KC", decisionTime,
      whatChanged: "team total spiked", whatShouldHaveChanged: "nothing — no shock", whatFailedToChange: "no causal parent moved",
      attentionStateTrigger: "primetime public flood", conservationViolations: conservation,
      provenance: { discoveredBy: "conservation-law" },
      lightCone, dataQualityStatus: "ok", rightsStatus: "cleared", tradability: trad, court,
      graveyard: { matched: false, deadEdge: null, suppressionNote: null }, immuneSurvived: true,
    });
    expect(bt.disposition).toBe("WATCHLIST");
  });
});

describe("Scenario C — apparent stale book killed by friction", () => {
  it("a structurally-clean candidate dies in the friction cascade → FRICTION_KILLED", () => {
    const lightCone = evaluateLightCone(timeline, { decisionTime, marketFamily: "player_props" });
    const trad = assessTradability({ rawEdge: 0.02, vig: 0.012, spread: 0.012, latencyCost: 0.004, executeMin: 4, windowMin: 20, limitProxy: 0.3, correlationPenalty: 0.004, modelError: 0.004, dataQualityOk: true, publicationDelayCost: 0.004 });
    expect(trad.status).toBe("FRICTION_KILLED");
    const court = convene({ ...cleanCourt, lightConeStatus: lightCone.status, tradabilityStatus: trad.status });
    const bt = assembleBeliefTransition({
      id: "C", marketKey: "total:OVER", decisionTime,
      whatChanged: "consensus moved", whatShouldHaveChanged: "softbook follows", whatFailedToChange: "softbook stale",
      marketStateTrigger: "book lag", provenance: { discoveredBy: "book-genome" },
      lightCone, dataQualityStatus: "ok", rightsStatus: "cleared", tradability: trad, court,
      graveyard: { matched: false, deadEdge: null, suppressionNote: null }, immuneSurvived: true,
    });
    expect(bt.disposition).toBe("FRICTION_KILLED");
  });
});
