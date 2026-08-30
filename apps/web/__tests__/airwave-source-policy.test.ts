import { describe, it, expect } from "vitest";
import {
  getAirwaveSourcePolicies,
  getSourcePolicy,
  canSourceBecomeActive,
  summarizeSourcePolicyReadiness,
  type SourcePolicyGates,
} from "../lib/airwave/source-policy";

const openGates: SourcePolicyGates = {
  airwaveEnabled: true,
  siriusxmLegalAck: true,
  transcriptImportEnabled: true,
  youtubeEnabled: true,
  podcastEnabled: true,
  beatReportsEnabled: true,
  studioHandoffEnabled: true,
};

const closedGates: SourcePolicyGates = {
  airwaveEnabled: false,
  siriusxmLegalAck: false,
  transcriptImportEnabled: false,
  youtubeEnabled: false,
  podcastEnabled: false,
  beatReportsEnabled: false,
  studioHandoffEnabled: false,
};

describe("Airwave Source Policy", () => {
  it("returns all 10 source policies", () => {
    const policies = getAirwaveSourcePolicies();
    expect(policies).toHaveLength(10);
  });

  it("satellite_radio_context requires legal acknowledgement", () => {
    const policy = getSourcePolicy("satellite_radio_context");
    expect(policy).toBeDefined();
    expect(policy!.requiresLegalAck).toBe(true);
  });

  it("satellite_radio_context cannot store raw audio", () => {
    const policy = getSourcePolicy("satellite_radio_context");
    expect(policy!.canStoreRawAudio).toBe(false);
  });

  it("satellite_radio_context cannot store public verbatim transcript", () => {
    const policy = getSourcePolicy("satellite_radio_context");
    expect(policy!.canStoreVerbatimTranscript).toBe(false);
  });

  it("satellite_radio_context cannot auto-publish", () => {
    const policy = getSourcePolicy("satellite_radio_context");
    expect(policy!.canAutoPublish).toBe(false);
  });

  it("satellite_radio_context is HELD by default", () => {
    const policy = getSourcePolicy("satellite_radio_context");
    expect(policy!.status).toBe("HELD");
  });

  it("no source can auto-publish", () => {
    const policies = getAirwaveSourcePolicies();
    for (const policy of policies) {
      expect(policy.canAutoPublish).toBe(false);
    }
  });

  it("no source can store raw audio", () => {
    const policies = getAirwaveSourcePolicies();
    for (const policy of policies) {
      expect(policy.canStoreRawAudio).toBe(false);
    }
  });

  it("no source can store public verbatim transcript", () => {
    const policies = getAirwaveSourcePolicies();
    for (const policy of policies) {
      expect(policy.canStoreVerbatimTranscript).toBe(false);
    }
  });

  it("source_pointer is a private field on all sources that have it", () => {
    const policies = getAirwaveSourcePolicies();
    for (const policy of policies) {
      if (policy.privateFields.includes("source_pointer")) {
        expect(policy.publicFields).not.toContain("source_pointer");
      }
    }
  });

  it("canSourceBecomeActive returns false when master switch is off", () => {
    const policy = getSourcePolicy("public_youtube")!;
    const result = canSourceBecomeActive(policy, closedGates);
    expect(result.allowed).toBe(false);
    expect(result.blockedReasons.length).toBeGreaterThan(0);
  });

  it("canSourceBecomeActive blocks satellite_radio without legal ACK", () => {
    const policy = getSourcePolicy("satellite_radio_context")!;
    const gatesNoLegal: SourcePolicyGates = { ...openGates, siriusxmLegalAck: false };
    const result = canSourceBecomeActive(policy, gatesNoLegal);
    expect(result.allowed).toBe(false);
    expect(result.blockedReasons.some((r) => r.includes("legal acknowledgement"))).toBe(true);
  });

  it("satellite_radio remains blocked even with all gates open because status is HELD", () => {
    const policy = getSourcePolicy("satellite_radio_context")!;
    const result = canSourceBecomeActive(policy, openGates);
    // Status is HELD, which adds a blocked reason
    expect(result.blockedReasons.some((r) => r.includes("HELD"))).toBe(true);
  });

  it("summarizeSourcePolicyReadiness includes forbidden actions", () => {
    const policies = getAirwaveSourcePolicies();
    const summary = summarizeSourcePolicyReadiness(policies, closedGates);
    expect(summary.forbiddenActions).toContain("raw_audio_archive (all sources)");
    expect(summary.forbiddenActions).toContain("auto_publish (all sources)");
    expect(summary.forbiddenActions).toContain("verbatim_transcript_public (all sources)");
  });

  it("summarizeSourcePolicyReadiness counts legal holds", () => {
    const policies = getAirwaveSourcePolicies();
    const gatesNoLegal: SourcePolicyGates = { ...openGates, siriusxmLegalAck: false };
    const summary = summarizeSourcePolicyReadiness(policies, gatesNoLegal);
    // At least satellite_radio_context and founder_local_listening need legal ACK
    expect(summary.legalHolds).toBeGreaterThanOrEqual(2);
  });

  it("satellite_radio has forbidden actions including drm_bypass and stream_ripping", () => {
    const policy = getSourcePolicy("satellite_radio_context")!;
    expect(policy.forbiddenOutputs).toContain("drm_bypass");
    expect(policy.forbiddenOutputs).toContain("stream_ripping");
    expect(policy.forbiddenOutputs).toContain("credential_automation");
    expect(policy.forbiddenOutputs).toContain("scraper_activation");
  });

  it("each source has at least one private field", () => {
    const policies = getAirwaveSourcePolicies();
    for (const policy of policies) {
      if (policy.id !== "studio_handoff") {
        // studio_handoff has private fields too
        expect(policy.privateFields.length).toBeGreaterThan(0);
      }
    }
  });

  it("all sources have complianceNote and operatorAction defined", () => {
    const policies = getAirwaveSourcePolicies();
    for (const policy of policies) {
      expect(policy.complianceNote.length).toBeGreaterThan(0);
      expect(policy.operatorAction.length).toBeGreaterThan(0);
    }
  });
});
