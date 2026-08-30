import { afterEach, describe, expect, it, vi } from "vitest";
import {
  deploymentSha,
  fromBreaker,
  fromFreshness,
  fromHealthCheck,
  fromSettlementBand,
  unknownCapability,
  type CapabilityState,
  type CapabilityStatus,
} from "@/lib/health/capability-state";

describe("capability-state adapters", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("fromHealthCheck", () => {
    it("maps ok -> healthy, evidence probe", () => {
      const result = fromHealthCheck("database", "ok", "database ping succeeded");
      expect(result.status).toBe("healthy");
      expect(result.evidence).toBe("probe");
      expect(result.capabilityId).toBe("database");
    });

    it("maps error -> unavailable, evidence probe", () => {
      const result = fromHealthCheck("database", "error", "database ping failed");
      expect(result.status).toBe("unavailable");
      expect(result.evidence).toBe("probe");
    });
  });

  describe("fromSettlementBand", () => {
    it("maps NO_DATA -> unknown, evidence none", () => {
      const result = fromSettlementBand("NO_DATA");
      expect(result.status).toBe("unknown");
      expect(result.evidence).toBe("none");
    });

    it("maps HEALTHY -> healthy", () => {
      expect(fromSettlementBand("HEALTHY").status).toBe("healthy");
    });

    it("maps DEGRADED -> degraded", () => {
      expect(fromSettlementBand("DEGRADED").status).toBe("degraded");
    });

    it("maps CRITICAL -> unavailable", () => {
      expect(fromSettlementBand("CRITICAL").status).toBe("unavailable");
    });
  });

  describe("fromFreshness", () => {
    it("maps ok -> healthy", () => {
      expect(fromFreshness("ingestion", "ok").status).toBe("healthy");
    });

    it("maps warn -> degraded", () => {
      expect(fromFreshness("ingestion", "warn").status).toBe("degraded");
    });

    it("maps stale -> stale", () => {
      expect(fromFreshness("ingestion", "stale").status).toBe("stale");
    });
  });

  describe("fromBreaker", () => {
    it("maps closed -> healthy", () => {
      expect(fromBreaker("odds-api", "closed").status).toBe("healthy");
    });

    it("maps degraded -> degraded", () => {
      expect(fromBreaker("odds-api", "degraded").status).toBe("degraded");
    });

    it("maps open -> unavailable", () => {
      expect(fromBreaker("odds-api", "open").status).toBe("unavailable");
    });
  });

  describe("unknownCapability", () => {
    it("returns status unknown with evidence none", () => {
      const result = unknownCapability("nflverse-reports", "no fetch attempted in this runtime");
      expect(result.status).toBe("unknown");
      expect(result.evidence).toBe("none");
      expect(result.reason).toBe("no fetch attempted in this runtime");
    });
  });

  // Invariant: "unknown" is the ONLY status paired with evidence "none", across
  // every adapter this module exposes.
  it("invariant: evidence 'none' occurs iff status is 'unknown'", () => {
    const samples: CapabilityState[] = [
      fromHealthCheck("database", "ok", "x"),
      fromHealthCheck("database", "error", "x"),
      fromSettlementBand("NO_DATA"),
      fromSettlementBand("HEALTHY"),
      fromSettlementBand("DEGRADED"),
      fromSettlementBand("CRITICAL"),
      fromFreshness("ingestion", "ok"),
      fromFreshness("ingestion", "warn"),
      fromFreshness("ingestion", "stale"),
      fromBreaker("odds-api", "closed"),
      fromBreaker("odds-api", "degraded"),
      fromBreaker("odds-api", "open"),
      unknownCapability("x", "y"),
    ];

    for (const sample of samples) {
      if (sample.evidence === "none") {
        expect(sample.status).toBe("unknown");
      }
      if (sample.status === "unknown") {
        expect(sample.evidence).toBe("none");
      }
    }
  });

  // Reasons must be static strings — never interpolate errors/hosts/secrets.
  // We can't exhaustively prove "never" for future callers, but we can pin
  // that none of this module's own fixed adapter outputs contain template
  // artifacts, and that unknownCapability/fromHealthCheck pass the caller's
  // reason through verbatim without mutation (i.e. this module itself never
  // appends error detail).
  it("adapter reasons are exactly the static string passed in (no interpolation added)", () => {
    const reason = "database ping failed";
    expect(fromHealthCheck("database", "error", reason).reason).toBe(reason);
    expect(unknownCapability("x", reason).reason).toBe(reason);
  });

  it("every CapabilityStatus is reachable from at least one adapter (exhaustiveness sanity)", () => {
    const allStatuses: CapabilityStatus[] = [
      "healthy",
      "degraded",
      "stale",
      "unavailable",
      "proof_gated",
      "owner_gated",
      "unknown",
    ];
    const reached = new Set<CapabilityStatus>([
      fromHealthCheck("x", "ok", "x").status,
      fromHealthCheck("x", "error", "x").status,
      fromSettlementBand("DEGRADED").status,
      fromFreshness("x", "stale").status,
      unknownCapability("x", "x").status,
    ]);
    // proof_gated / owner_gated are intentionally not produced by any adapter
    // in this module — they are constructed directly by callers that know a
    // capability is deliberately dark. Confirm the remaining five ARE reached.
    for (const status of allStatuses) {
      if (status === "proof_gated" || status === "owner_gated") continue;
      expect(reached.has(status)).toBe(true);
    }
  });
});

describe("deploymentSha", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns null when neither env var is set (never fabricates a value)", () => {
    vi.stubEnv("VERCEL_GIT_COMMIT_SHA", "");
    vi.stubEnv("GIT_COMMIT_SHA", "");
    // vi.stubEnv sets a string; explicitly delete to simulate "unset".
    delete process.env["VERCEL_GIT_COMMIT_SHA"];
    delete process.env["GIT_COMMIT_SHA"];
    expect(deploymentSha()).toBeNull();
  });

  it("prefers VERCEL_GIT_COMMIT_SHA when set", () => {
    vi.stubEnv("VERCEL_GIT_COMMIT_SHA", "abc123");
    expect(deploymentSha()).toBe("abc123");
  });

  it("falls back to GIT_COMMIT_SHA when VERCEL_GIT_COMMIT_SHA is unset", () => {
    delete process.env["VERCEL_GIT_COMMIT_SHA"];
    vi.stubEnv("GIT_COMMIT_SHA", "def456");
    expect(deploymentSha()).toBe("def456");
  });
});
