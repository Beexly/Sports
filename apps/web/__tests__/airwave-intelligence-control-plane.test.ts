import { describe, it, expect } from "vitest";
import { readIntelligenceControlPlane } from "../lib/airwave/intelligence-control-plane";

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

describe("Intelligence Control Plane", () => {
  describe("policy enforcement", () => {
    it("never exposes secret values", () => {
      const plane = readIntelligenceControlPlane(emptyEnv);
      expect(plane.policy.exposesSecretValues).toBe(false);
    });

    it("never exposes local file paths", () => {
      const plane = readIntelligenceControlPlane(emptyEnv);
      expect(plane.policy.exposesLocalFilePaths).toBe(false);
    });

    it("never exposes source pointers", () => {
      const plane = readIntelligenceControlPlane(emptyEnv);
      expect(plane.policy.exposesSourcePointers).toBe(false);
    });

    it("never captures on request", () => {
      const plane = readIntelligenceControlPlane(emptyEnv);
      expect(plane.policy.capturesOnRequest).toBe(false);
    });

    it("never archives raw audio", () => {
      const plane = readIntelligenceControlPlane(emptyEnv);
      expect(plane.policy.archivesRawAudio).toBe(false);
    });

    it("never stores verbatim transcripts", () => {
      const plane = readIntelligenceControlPlane(emptyEnv);
      expect(plane.policy.storesVerbatimTranscripts).toBe(false);
    });

    it("never auto-publishes", () => {
      const plane = readIntelligenceControlPlane(emptyEnv);
      expect(plane.policy.autoPublishes).toBe(false);
    });
  });

  describe("CH87 lane", () => {
    it("CH87 always requires legal ACK", () => {
      const plane = readIntelligenceControlPlane(emptyEnv);
      expect(plane.operatorSurface.ch87RequiresLegalAck).toBe(true);
    });

    it("CH87 legal ACK is not granted by default", () => {
      const plane = readIntelligenceControlPlane(emptyEnv);
      expect(plane.operatorSurface.legalAckGranted).toBe(false);
    });

    it("CH87 contract window is 05:00-23:00", () => {
      const plane = readIntelligenceControlPlane(emptyEnv);
      expect(plane.channel87Contract.window.startHour).toBe(5);
      expect(plane.channel87Contract.window.endHour).toBe(23);
    });

    it("CH87 contract cannot auto-capture", () => {
      const plane = readIntelligenceControlPlane(emptyEnv);
      expect(plane.channel87Contract.policy.canAutoCapture).toBe(false);
    });

    it("CH87 contract cannot scrape schedule", () => {
      const plane = readIntelligenceControlPlane(emptyEnv);
      expect(plane.channel87Contract.policy.canScrapeSchedule).toBe(false);
    });
  });

  describe("source policy summary", () => {
    it("includes 10 source policies", () => {
      const plane = readIntelligenceControlPlane(emptyEnv);
      expect(plane.sourcePolicySummary.total).toBe(10);
    });

    it("includes forbidden actions list", () => {
      const plane = readIntelligenceControlPlane(emptyEnv);
      expect(plane.sourcePolicySummary.forbiddenActions.length).toBeGreaterThan(0);
    });

    it("counts legal holds when no ACK", () => {
      const plane = readIntelligenceControlPlane(emptyEnv);
      expect(plane.sourcePolicySummary.legalHolds).toBeGreaterThanOrEqual(2);
    });
  });

  describe("operator surface", () => {
    it("provides next operator actions", () => {
      const plane = readIntelligenceControlPlane(emptyEnv);
      expect(plane.operatorSurface.nextOperatorActions.length).toBeGreaterThan(0);
    });

    it("provides forbidden actions", () => {
      const plane = readIntelligenceControlPlane(emptyEnv);
      expect(plane.operatorSurface.forbiddenActions.length).toBeGreaterThan(0);
    });

    it("provides private fields list", () => {
      const plane = readIntelligenceControlPlane(emptyEnv);
      expect(plane.operatorSurface.privateFields).toContain("source_pointer");
    });

    it("reports manual import not ready when no transcript config", () => {
      const plane = readIntelligenceControlPlane(emptyEnv);
      expect(plane.operatorSurface.manualImportReady).toBe(false);
    });
  });

  describe("base control plane composability", () => {
    it("includes base control plane", () => {
      const plane = readIntelligenceControlPlane(emptyEnv);
      expect(plane.base).toBeDefined();
      expect(plane.base.lanes.length).toBeGreaterThan(0);
    });

    it("does not break base control plane policy", () => {
      const plane = readIntelligenceControlPlane(emptyEnv);
      expect(plane.base.policy.archivesRawAudio).toBe(false);
      expect(plane.base.policy.autoPublishes).toBe(false);
      expect(plane.base.policy.storesVerbatimQuotes).toBe(false);
    });
  });

  describe("JSON serialization safety", () => {
    it("serialized output does not contain env var values", () => {
      const envWithSecrets: Record<string, string | undefined> = {
        ...fullEnv,
        AIRWAVE_TRANSCRIPT_FILE_PATH: "/secret/path/to/file.csv",
      };
      const plane = readIntelligenceControlPlane(envWithSecrets);
      const json = JSON.stringify(plane);
      // File path should not appear in the serialized intelligence plane
      expect(json).not.toContain("/secret/path/to/file.csv");
    });

    it("serialized output does not contain AIRWAVE_SIRIUSXM_LEGAL_ACK value", () => {
      const plane = readIntelligenceControlPlane(fullEnv);
      const json = JSON.stringify(plane);
      // The env value "true" might appear for other booleans, but
      // the specific secret key name should not leak as a value
      expect(json).not.toContain("AIRWAVE_SIRIUSXM_LEGAL_ACK=true");
    });
  });

  describe("snapshot source / generatedAt fabrication", () => {
    it("marks the default (master off) snapshot as FALLBACK with null generatedAt", () => {
      const plane = readIntelligenceControlPlane(emptyEnv);
      expect(plane.snapshotSource).toBe("FALLBACK");
      expect(plane.generatedAt).toBeNull();
    });

    it("marks a master-on snapshot as LIVE with a real generatedAt", () => {
      const fixedNow = new Date("2026-06-05T10:00:00.000Z");
      const plane = readIntelligenceControlPlane(
        { ...fullEnv, AIRWAVE_ENABLED: "true" },
        fixedNow,
      );
      expect(plane.snapshotSource).toBe("LIVE");
      expect(plane.generatedAt).toBe("2026-06-05T10:00:00.000Z");
    });

    it("serialised fallback snapshot does not fabricate a prediction-time timestamp", () => {
      const plane = readIntelligenceControlPlane(emptyEnv);
      const json = JSON.parse(JSON.stringify(plane)) as Record<string, unknown>;
      expect(json["snapshotSource"]).toBe("FALLBACK");
      expect(json["generatedAt"]).toBeNull();
    });
  });
});
