import { describe, it, expect } from "vitest";
import { buildAirwaveIntakePlan } from "../lib/airwave/intake-contract";

const emptyEnv: Record<string, string | undefined> = {};

const fullEnv: Record<string, string | undefined> = {
  AIRWAVE_ENABLED: "true",
  AIRWAVE_SIRIUSXM_LEGAL_ACK: "true",
  AIRWAVE_TRANSCRIPT_IMPORT_ENABLED: "true",
  AIRWAVE_TRANSCRIPT_FILE_PATH: "/tmp/notes.csv",
  AIRWAVE_YOUTUBE_FEEDS_ENABLED: "true",
  AIRWAVE_PODCAST_RSS_ENABLED: "true",
  AIRWAVE_BEAT_REPORTS_ENABLED: "true",
  AIRWAVE_STUDIO_HANDOFF_ENABLED: "true",
};

const noLegalEnv: Record<string, string | undefined> = {
  AIRWAVE_ENABLED: "true",
  AIRWAVE_SIRIUSXM_LEGAL_ACK: "false",
  AIRWAVE_TRANSCRIPT_IMPORT_ENABLED: "true",
  AIRWAVE_TRANSCRIPT_FILE_PATH: "/tmp/notes.csv",
};

describe("Airwave Intake Contract", () => {
  describe("policy", () => {
    it("can never write database", () => {
      const plan = buildAirwaveIntakePlan(emptyEnv);
      expect(plan.policy.canWriteDatabase).toBe(false);
    });

    it("can never archive raw audio", () => {
      const plan = buildAirwaveIntakePlan(emptyEnv);
      expect(plan.policy.canArchiveRawAudio).toBe(false);
    });

    it("can never store verbatim transcript", () => {
      const plan = buildAirwaveIntakePlan(emptyEnv);
      expect(plan.policy.canStoreVerbatimTranscript).toBe(false);
    });

    it("can never auto-publish", () => {
      const plan = buildAirwaveIntakePlan(emptyEnv);
      expect(plan.policy.canAutoPublish).toBe(false);
    });

    it("can never capture without gate", () => {
      const plan = buildAirwaveIntakePlan(emptyEnv);
      expect(plan.policy.canCaptureWithoutGate).toBe(false);
    });
  });

  describe("default (empty env)", () => {
    it("all lanes are held or off by default", () => {
      const plan = buildAirwaveIntakePlan(emptyEnv);
      const activeLanes = plan.lanes.filter((l) => l.mode === "ACTIVE");
      expect(activeLanes).toHaveLength(0);
    });

    it("master switch is off by default", () => {
      const plan = buildAirwaveIntakePlan(emptyEnv);
      expect(plan.gates.masterEnabled).toBe(false);
    });

    it("legalAck is not granted by default", () => {
      const plan = buildAirwaveIntakePlan(emptyEnv);
      expect(plan.gates.siriusxmLegalAck).toBe(false);
    });
  });

  describe("CH87 lane", () => {
    it("CH87 requires legal acknowledgement", () => {
      const plan = buildAirwaveIntakePlan(emptyEnv);
      expect(plan.channel87.requiresLegalAck).toBe(true);
    });

    it("CH87 window is 05:00-23:00 CT", () => {
      const plan = buildAirwaveIntakePlan(emptyEnv);
      expect(plan.channel87.windowStartHour).toBe(5);
      expect(plan.channel87.windowEndHour).toBe(23);
    });

    it("CH87 timezone is America/Chicago", () => {
      const plan = buildAirwaveIntakePlan(emptyEnv);
      expect(plan.channel87.timezone).toBe("America/Chicago");
    });

    it("CH87 is HELD when no legal ACK", () => {
      const plan = buildAirwaveIntakePlan(noLegalEnv);
      expect(plan.channel87.legalAckGranted).toBe(false);
      expect(plan.channel87.laneStatus).toBe("LOCAL_LISTENER_HELD");
    });

    it("CH87 can be MANUAL_IMPORT_READY when legal ACK is set", () => {
      const plan = buildAirwaveIntakePlan(fullEnv);
      expect(plan.channel87.legalAckGranted).toBe(true);
      expect(plan.channel87.laneStatus).toBe("MANUAL_IMPORT_READY");
    });
  });

  describe("forbidden actions", () => {
    it("includes raw_audio_archive in forbidden actions", () => {
      const plan = buildAirwaveIntakePlan(emptyEnv);
      expect(plan.forbiddenActions).toContain("raw_audio_archive");
    });

    it("includes verbatim_transcript_storage_public in forbidden actions", () => {
      const plan = buildAirwaveIntakePlan(emptyEnv);
      expect(plan.forbiddenActions).toContain("verbatim_transcript_storage_public");
    });

    it("includes auto_publish in forbidden actions", () => {
      const plan = buildAirwaveIntakePlan(emptyEnv);
      expect(plan.forbiddenActions).toContain("auto_publish");
    });

    it("includes satellite_radio_scraping in forbidden actions", () => {
      const plan = buildAirwaveIntakePlan(emptyEnv);
      expect(plan.forbiddenActions).toContain("satellite_radio_scraping");
    });

    it("includes source_pointer_in_public_output in forbidden actions", () => {
      const plan = buildAirwaveIntakePlan(emptyEnv);
      expect(plan.forbiddenActions).toContain("source_pointer_in_public_output");
    });
  });

  describe("private fields", () => {
    it("source_pointer is always in private fields", () => {
      const plan = buildAirwaveIntakePlan(emptyEnv);
      expect(plan.privateFields).toContain("source_pointer");
    });

    it("file_path is always in private fields", () => {
      const plan = buildAirwaveIntakePlan(emptyEnv);
      expect(plan.privateFields).toContain("file_path");
    });

    it("raw_transcript_text is always in private fields", () => {
      const plan = buildAirwaveIntakePlan(emptyEnv);
      expect(plan.privateFields).toContain("raw_transcript_text");
    });
  });

  describe("ACTIVE mode gates", () => {
    it("ACTIVE mode cannot be returned for CH87 without legal ACK", () => {
      const envNoLegal = { ...fullEnv, AIRWAVE_SIRIUSXM_LEGAL_ACK: "false" };
      const plan = buildAirwaveIntakePlan(envNoLegal);
      const ch87Lane = plan.lanes.find((l) => l.laneId === "channel-87-siriusxm");
      expect(ch87Lane?.mode).not.toBe("ACTIVE");
    });
  });

  describe("GSE/GSN readiness", () => {
    it("GSE readiness summary is defined", () => {
      const plan = buildAirwaveIntakePlan(fullEnv);
      expect(plan.gseOutputReadiness.summary.length).toBeGreaterThan(0);
    });

    it("GSN readiness summary is defined", () => {
      const plan = buildAirwaveIntakePlan(fullEnv);
      expect(plan.gsnOutputReadiness.summary.length).toBeGreaterThan(0);
    });

    it("both GSE and GSN readiness are held when master switch is off", () => {
      const plan = buildAirwaveIntakePlan(emptyEnv);
      expect(plan.gseOutputReadiness.pickEvidenceCandidates).toBe(false);
      expect(plan.gsnOutputReadiness.showBriefs).toBe(false);
    });
  });

  describe("dry run plan", () => {
    it("can always dry-run", () => {
      const plan = buildAirwaveIntakePlan(emptyEnv);
      expect(plan.dryRunPlan.canDryRun).toBe(true);
    });

    it("dry run shows what is held when gates are closed", () => {
      const plan = buildAirwaveIntakePlan(emptyEnv);
      expect(plan.dryRunPlan.whatIsHeld.length).toBeGreaterThan(0);
    });
  });
});
