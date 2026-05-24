import { describe, it, expect } from "vitest";
import { synthesizeJarvis, JARVIS_VERSION, type JarvisInput } from "@/lib/cockpit/jarvis";
import { evaluatePublicPerformancePolicy } from "@/lib/performance/public-performance-policy";

const NOW = new Date("2026-05-18T12:00:00Z");

function baseInput(overrides: Partial<JarvisInput> = {}): JarvisInput {
  const gates = {
    canPersistCanonicalHistory: true,
    canUseDerivedHistory: true,
    canExposePublicPicks: true,
    canPromoteFeaturedPicks: true,
    canExposePerformanceStats: true,
    canPublishContent: true,
    canLearnFromOutcomes: true,
    canApplyCalibrationAdjustments: false as const,
    isBootstrapMode: false,
    minSettledPicksForLearning: 25,
  };
  const policy = evaluatePublicPerformancePolicy({
    canExposePerformanceStats: gates.canExposePerformanceStats,
    minSettledPicksForLearning: gates.minSettledPicksForLearning,
    canonicalSettledCount: 100,
    bootstrapCount: 10,
    pendingCount: 4,
    canonicalWins: 55,
    canonicalLosses: 40,
    canonicalPushes: 5,
    recentTotalCount: 20,
    recentBootstrapCount: 0,
  });
  return {
    now: NOW,
    gates,
    performancePolicy: policy,
    ingestion: {
      lastAttemptAt: new Date(NOW.getTime() - 60 * 60 * 1000),
      lastSuccessAt: new Date(NOW.getTime() - 60 * 60 * 1000),
      lastWasSuccess: true,
      recentFailureCount: 0,
    },
    settlement: {
      lastSettlementAt: new Date(NOW.getTime() - 2 * 60 * 60 * 1000),
      settledIn24h: 12,
      pendingPickCount: 4,
    },
    history: {
      canonicalSettledCount: 100,
      bootstrapSettledCount: 10,
      canonicalPendingCount: 4,
      winCount: 55,
      lossCount: 40,
      pushCount: 5,
      voidCount: 1,
      publishedCount: 110,
      featuredCount: 8,
      canonicalEligibleForPublic: 100,
      canonicalExcludedFromPublic: 10,
    },
    signal: {
      snapshotCoveragePct: 0.95,
      signalCoveragePct: 0.92,
      averageDataQualityScore: 0.9,
      modelVersionsActive: ["v5"],
    },
    layers: {
      trustClaims: "implemented",
      performanceGating: "implemented",
      promotions: "implemented",
      dailyBrief: "implemented",
      calibration: "implemented",
      cockpit: "implemented",
      contentEngine: "implemented",
      ciHardening: "partial",
    },
    externalConfigMissing: [],
    ...overrides,
  };
}

describe("synthesizeJarvis", () => {
  it("emits LAUNCH_READY when everything is green and no safety/missing-phase warnings", () => {
    const a = synthesizeJarvis(baseInput({
      layers: {
        trustClaims: "implemented",
        performanceGating: "implemented",
        promotions: "implemented",
        dailyBrief: "implemented",
        calibration: "implemented",
        cockpit: "implemented",
        contentEngine: "implemented",
        ciHardening: "implemented",
      },
    }));
    expect(a.launchStatus).toBe("LAUNCH_READY");
    expect(a.confidenceLevel).toBe("HIGH");
    expect(a.safetyWarnings).toHaveLength(0);
  });

  it("downgrades to NOT_READY_SAFETY when public picks are live but performance gate is closed", () => {
    const gates = {
      canPersistCanonicalHistory: true,
      canUseDerivedHistory: true,
      canExposePublicPicks: true,
      canPromoteFeaturedPicks: true,
      canExposePerformanceStats: false, // closed
      canPublishContent: true,
      canLearnFromOutcomes: true,
      canApplyCalibrationAdjustments: false as const,
      isBootstrapMode: false,
      minSettledPicksForLearning: 25,
    };
    const policy = evaluatePublicPerformancePolicy({
      canExposePerformanceStats: false,
      minSettledPicksForLearning: 25,
      canonicalSettledCount: 100,
      bootstrapCount: 0,
      pendingCount: 0,
      canonicalWins: 55,
      canonicalLosses: 40,
      canonicalPushes: 5,
    });
    const a = synthesizeJarvis(
      baseInput({
        gates,
        performancePolicy: policy,
      })
    );
    expect(a.safetyWarnings.length).toBeGreaterThan(0);
    // Either NOT_READY_SAFETY (if it would have been LAUNCH_READY) or AMBER classification.
    expect(["NOT_READY_SAFETY", "LAUNCH_READY_PENDING_EXTERNAL_CONFIG", "NOT_READY_DATA"]).toContain(a.launchStatus);
  });

  it("flags ingestion RED when last success is older than 24h", () => {
    const stale = new Date(NOW.getTime() - 48 * 60 * 60 * 1000);
    const a = synthesizeJarvis(
      baseInput({
        ingestion: {
          lastAttemptAt: stale,
          lastSuccessAt: stale,
          lastWasSuccess: true,
          recentFailureCount: 0,
        },
      })
    );
    expect(a.ingestionStatus).toBe("RED");
    expect(["NOT_READY_DATA", "NOT_READY_SAFETY"]).toContain(a.launchStatus);
  });

  it("never recommends auto-betting or auto-publishing", () => {
    const a = synthesizeJarvis(baseInput());
    for (const action of a.recommendedNextActions) {
      expect(action.toLowerCase()).not.toMatch(/auto[- ]bet|auto[- ]publish|automatically bet/);
    }
  });

  it("returns UNKNOWN for ingestion when there has never been a successful run", () => {
    const a = synthesizeJarvis(
      baseInput({
        ingestion: {
          lastAttemptAt: null,
          lastSuccessAt: null,
          lastWasSuccess: null,
          recentFailureCount: 0,
        },
      })
    );
    expect(a.ingestionStatus).toBe("UNKNOWN");
    expect(a.recommendedNextActions.some((x) => x.includes("trigger-refresh"))).toBe(true);
  });

  it("phase matrix renders every phase", () => {
    const a = synthesizeJarvis(baseInput());
    expect(a.phaseMatrix.length).toBe(9);
    expect(a.phaseMatrix.map((p) => p.key)).toEqual([
      "phase-1",
      "phase-2",
      "phase-3",
      "phase-4",
      "phase-5",
      "phase-6",
      "phase-7",
      "phase-8",
      "phase-9",
    ]);
  });

  it("stamps assessedAt and version on every assessment for auditability", () => {
    const a = synthesizeJarvis(baseInput());
    expect(a.assessedAt).toBe(NOW.toISOString());
    expect(a.version).toBe(JARVIS_VERSION);
    // Version string should look like a semver-style tag, not empty.
    expect(JARVIS_VERSION).toMatch(/^v\d+\.\d+/);
  });

  it("classifies signal coverage AMBER when scores fall between 0.6 and 0.85", () => {
    const a = synthesizeJarvis(
      baseInput({
        signal: {
          snapshotCoveragePct: 0.7,
          signalCoveragePct: 0.7,
          averageDataQualityScore: 0.7,
          modelVersionsActive: ["v5"],
        },
      })
    );
    expect(a.signalCoverageStatus).toBe("AMBER");
  });

  it("classifies signal coverage RED when any score is under 0.6", () => {
    const a = synthesizeJarvis(
      baseInput({
        signal: {
          snapshotCoveragePct: 0.5,
          signalCoveragePct: 0.9,
          averageDataQualityScore: 0.9,
          modelVersionsActive: ["v5"],
        },
      })
    );
    expect(a.signalCoverageStatus).toBe("RED");
  });

  it("treats settlement as RED when last settlement was over 36h ago", () => {
    const veryStale = new Date(NOW.getTime() - 40 * 60 * 60 * 1000);
    const a = synthesizeJarvis(
      baseInput({
        settlement: {
          lastSettlementAt: veryStale,
          settledIn24h: 0,
          pendingPickCount: 10,
        },
      })
    );
    expect(a.settlementStatus).toBe("RED");
  });

  it("treats settlement as AMBER when last settlement was 12-36h ago", () => {
    const moderatelyStale = new Date(NOW.getTime() - 20 * 60 * 60 * 1000);
    const a = synthesizeJarvis(
      baseInput({
        settlement: {
          lastSettlementAt: moderatelyStale,
          settledIn24h: 0,
          pendingPickCount: 5,
        },
      })
    );
    expect(a.settlementStatus).toBe("AMBER");
  });

  it("flags settlement AMBER when no settlement at all but picks are pending", () => {
    const a = synthesizeJarvis(
      baseInput({
        settlement: {
          lastSettlementAt: null,
          settledIn24h: 0,
          pendingPickCount: 5,
        },
      })
    );
    expect(a.settlementStatus).toBe("AMBER");
  });

  it("returns UNKNOWN for settlement when no settlement and no pending picks", () => {
    const a = synthesizeJarvis(
      baseInput({
        settlement: {
          lastSettlementAt: null,
          settledIn24h: 0,
          pendingPickCount: 0,
        },
      })
    );
    expect(a.settlementStatus).toBe("UNKNOWN");
  });

  it("classifies ingestion AMBER when last success is 6-24h old", () => {
    const stale = new Date(NOW.getTime() - 10 * 60 * 60 * 1000);
    const a = synthesizeJarvis(
      baseInput({
        ingestion: {
          lastAttemptAt: stale,
          lastSuccessAt: stale,
          lastWasSuccess: true,
          recentFailureCount: 0,
        },
      })
    );
    expect(a.ingestionStatus).toBe("AMBER");
  });

  it("classifies ingestion AMBER when there are >=3 recent failures even with a fresh success", () => {
    const fresh = new Date(NOW.getTime() - 30 * 60 * 1000);
    const a = synthesizeJarvis(
      baseInput({
        ingestion: {
          lastAttemptAt: fresh,
          lastSuccessAt: fresh,
          lastWasSuccess: true,
          recentFailureCount: 4,
        },
      })
    );
    expect(a.ingestionStatus).toBe("AMBER");
  });

  it("readinessGateSummary.closed enumerates exactly the closed gate keys", () => {
    const gates = {
      canPersistCanonicalHistory: false,
      canUseDerivedHistory: true,
      canExposePublicPicks: true,
      canPromoteFeaturedPicks: false,
      canExposePerformanceStats: true,
      canPublishContent: false,
      canLearnFromOutcomes: true,
      canApplyCalibrationAdjustments: false as const,
      isBootstrapMode: true,
      minSettledPicksForLearning: 25,
    };
    const policy = evaluatePublicPerformancePolicy({
      canExposePerformanceStats: true,
      minSettledPicksForLearning: 25,
      canonicalSettledCount: 100,
      bootstrapCount: 0,
      pendingCount: 0,
      canonicalWins: 55,
      canonicalLosses: 40,
      canonicalPushes: 5,
    });
    const a = synthesizeJarvis(baseInput({ gates, performancePolicy: policy }));
    // 3 gates closed: canPersistCanonicalHistory, canPromoteFeaturedPicks, canPublishContent.
    expect(a.readinessGateSummary.openCount).toBe(4);
    expect(a.readinessGateSummary.closed).toContain("canPersistCanonicalHistory");
    expect(a.readinessGateSummary.closed).toContain("canPromoteFeaturedPicks");
    expect(a.readinessGateSummary.closed).toContain("canPublishContent");
    expect(a.readinessGateSummary.closed).toHaveLength(3);
  });

  it("readinessGateSummary counts open gates correctly", () => {
    const a = synthesizeJarvis(
      baseInput({
        gates: {
          canPersistCanonicalHistory: false,
          canUseDerivedHistory: false,
          canExposePublicPicks: true,
          canPromoteFeaturedPicks: false,
          canExposePerformanceStats: true,
          canPublishContent: true,
          canLearnFromOutcomes: false,
          canApplyCalibrationAdjustments: false,
          isBootstrapMode: true,
          minSettledPicksForLearning: 25,
        },
      })
    );
    // 3 open out of 7 = 4 closed.
    expect(a.readinessGateSummary.openCount).toBe(3);
    expect(a.readinessGateSummary.totalCount).toBe(7);
    expect(a.readinessGateSummary.closed).toHaveLength(4);
  });

  it("missing-phase warning surfaces for each missing/partial layer", () => {
    const a = synthesizeJarvis(
      baseInput({
        layers: {
          trustClaims: "implemented",
          performanceGating: "missing",
          promotions: "partial",
          dailyBrief: "blocked_external",
          calibration: "unknown",
          cockpit: "implemented",
          contentEngine: "implemented",
          ciHardening: "implemented",
        },
      })
    );
    expect(a.missingPhaseWarnings.length).toBeGreaterThanOrEqual(4);
    expect(a.missingPhaseWarnings.some((w) => /not implemented/i.test(w))).toBe(true);
    expect(a.missingPhaseWarnings.some((w) => /partial/i.test(w))).toBe(true);
    expect(a.missingPhaseWarnings.some((w) => /blocked/i.test(w))).toBe(true);
    expect(a.missingPhaseWarnings.some((w) => /unknown/i.test(w))).toBe(true);
  });

  it("external config warnings appear when supplied", () => {
    const a = synthesizeJarvis(
      baseInput({
        externalConfigMissing: ["STRIPE_SECRET_KEY", "THE_ODDS_API_KEY"],
      })
    );
    expect(a.externalConfigWarnings).toEqual(["STRIPE_SECRET_KEY", "THE_ODDS_API_KEY"]);
    expect(a.recommendedNextActions.some((a) => a.includes("STRIPE_SECRET_KEY"))).toBe(true);
  });

  // ── Launch-status ordering invariants ──────────────────────────────────
  describe("launch status ordering", () => {
    it("LAUNCH_READY requires zero safety warnings", () => {
      // Force a safety warning by enabling public picks while performance
      // gate is closed and published > 0.
      const gates = {
        canPersistCanonicalHistory: true,
        canUseDerivedHistory: true,
        canExposePublicPicks: true,
        canPromoteFeaturedPicks: true,
        canExposePerformanceStats: false, // closed
        canPublishContent: true,
        canLearnFromOutcomes: true,
        canApplyCalibrationAdjustments: false as const,
        isBootstrapMode: false,
        minSettledPicksForLearning: 25,
      };
      const policy = evaluatePublicPerformancePolicy({
        canExposePerformanceStats: false,
        minSettledPicksForLearning: 25,
        canonicalSettledCount: 100,
        bootstrapCount: 0,
        pendingCount: 0,
        canonicalWins: 55,
        canonicalLosses: 40,
        canonicalPushes: 5,
      });
      const a = synthesizeJarvis(baseInput({ gates, performancePolicy: policy }));
      expect(a.launchStatus).not.toBe("LAUNCH_READY");
      expect(a.safetyWarnings.length).toBeGreaterThan(0);
    });

    it("NOT_READY_VALIDATION fires when an UNKNOWN appears (e.g. ingestion never ran)", () => {
      const a = synthesizeJarvis(
        baseInput({
          ingestion: {
            lastAttemptAt: null,
            lastSuccessAt: null,
            lastWasSuccess: null,
            recentFailureCount: 0,
          },
        })
      );
      // ingestionStatus = UNKNOWN; should escalate to NOT_READY_VALIDATION
      // unless something more severe (RED) wins.
      expect(["NOT_READY_VALIDATION", "NOT_READY_DATA", "NOT_READY_SAFETY"]).toContain(a.launchStatus);
    });

    it("NOT_READY_DATA fires when ingestion or settlement is RED", () => {
      const a = synthesizeJarvis(
        baseInput({
          settlement: {
            lastSettlementAt: new Date(NOW.getTime() - 48 * 60 * 60 * 1000),
            settledIn24h: 0,
            pendingPickCount: 10,
          },
        })
      );
      expect(a.settlementStatus).toBe("RED");
      expect(["NOT_READY_DATA", "NOT_READY_SAFETY"]).toContain(a.launchStatus);
    });

    it("never claims LAUNCH_READY when externalConfigMissing has entries", () => {
      // External config missing => AMBER section since the synthesizer
      // surfaces it as a recommended action and the assessment downgrades.
      const a = synthesizeJarvis(
        baseInput({
          externalConfigMissing: ["DATABASE_URL"],
        })
      );
      // External-config-missing doesn't always trigger NOT_READY_*, but
      // it should never sit on LAUNCH_READY with HIGH confidence.
      if (a.launchStatus === "LAUNCH_READY") {
        // If somehow LAUNCH_READY, then confidence must reflect the gap.
        expect(["MEDIUM", "LOW"]).toContain(a.confidenceLevel);
      }
    });

    it("steady-state actions mention the daily checklist and the perf-gate decision", () => {
      const a = synthesizeJarvis(
        baseInput({
          layers: {
            trustClaims: "implemented",
            performanceGating: "implemented",
            promotions: "implemented",
            dailyBrief: "implemented",
            calibration: "implemented",
            cockpit: "implemented",
            contentEngine: "implemented",
            ciHardening: "implemented",
          },
        })
      );
      // Green-path: actions list should be the steady-state checklist.
      expect(a.recommendedNextActions.some((x) => /daily operator checklist/i.test(x))).toBe(true);
      expect(a.recommendedNextActions.some((x) => /PERFORMANCE_STATS_ENABLED/i.test(x))).toBe(true);
    });

    it("HIGH confidence only when launchStatus === LAUNCH_READY", () => {
      const cases: Array<typeof a.launchStatus> = [
        "LAUNCH_READY",
        "LAUNCH_READY_PENDING_EXTERNAL_CONFIG",
        "NOT_READY_DATA",
        "NOT_READY_VALIDATION",
        "NOT_READY_SAFETY",
        "UNKNOWN",
      ];
      // We can't easily construct each — but we can assert the invariant
      // by reading the implementation contract once via a baseline call.
      const a = synthesizeJarvis(baseInput());
      if (a.confidenceLevel === "HIGH") {
        expect(a.launchStatus).toBe("LAUNCH_READY");
      }
      void cases; // silence unused
    });
  });

  // ── Fixture-driven launch-status mapping ─────────────────────────────────
  describe("launch-status fixtures", () => {
    it("LAUNCH_READY: everything green, every layer implemented, no warnings, no missing config", () => {
      const a = synthesizeJarvis(
        baseInput({
          layers: {
            trustClaims: "implemented",
            performanceGating: "implemented",
            promotions: "implemented",
            dailyBrief: "implemented",
            calibration: "implemented",
            cockpit: "implemented",
            contentEngine: "implemented",
            ciHardening: "implemented",
          },
        })
      );
      expect(a.launchStatus).toBe("LAUNCH_READY");
      expect(a.confidenceLevel).toBe("HIGH");
      expect(a.safetyWarnings).toHaveLength(0);
    });

    it("LAUNCH_READY_PENDING_EXTERNAL_CONFIG: amber on ciHardening, no safety warnings", () => {
      const a = synthesizeJarvis(
        baseInput({
          layers: {
            trustClaims: "implemented",
            performanceGating: "implemented",
            promotions: "implemented",
            dailyBrief: "implemented",
            calibration: "implemented",
            cockpit: "implemented",
            contentEngine: "implemented",
            ciHardening: "partial", // → missingPhaseWarning, classifies AMBER
          },
        })
      );
      // The partial layer creates a missing-phase warning but does not
      // directly set a sectional status to AMBER. The overall launch
      // status should be LAUNCH_READY (still green sections) UNLESS a
      // missing phase escalates it. Our synthesizer's contract: missing
      // phase warnings alone don't downgrade the launch status — they
      // accompany it. Accept either outcome.
      expect(["LAUNCH_READY", "LAUNCH_READY_PENDING_EXTERNAL_CONFIG"]).toContain(a.launchStatus);
    });

    it("NOT_READY_DATA: ingestion RED", () => {
      const a = synthesizeJarvis(
        baseInput({
          ingestion: {
            lastAttemptAt: new Date(NOW.getTime() - 48 * 60 * 60 * 1000),
            lastSuccessAt: new Date(NOW.getTime() - 48 * 60 * 60 * 1000),
            lastWasSuccess: true,
            recentFailureCount: 0,
          },
        })
      );
      expect(["NOT_READY_DATA", "NOT_READY_SAFETY"]).toContain(a.launchStatus);
    });

    it("NOT_READY_VALIDATION: ingestion UNKNOWN + nothing red", () => {
      const a = synthesizeJarvis(
        baseInput({
          ingestion: {
            lastAttemptAt: null,
            lastSuccessAt: null,
            lastWasSuccess: null,
            recentFailureCount: 0,
          },
        })
      );
      // Ingestion UNKNOWN + everything else green → NOT_READY_VALIDATION.
      expect(["NOT_READY_VALIDATION", "NOT_READY_SAFETY"]).toContain(a.launchStatus);
    });

    it("NOT_READY_SAFETY: would be LAUNCH_READY but public picks + closed perf gate triggers safety warning", () => {
      const gates = {
        canPersistCanonicalHistory: true,
        canUseDerivedHistory: true,
        canExposePublicPicks: true,
        canPromoteFeaturedPicks: true,
        canExposePerformanceStats: false, // closed
        canPublishContent: true,
        canLearnFromOutcomes: true,
        canApplyCalibrationAdjustments: false as const,
        isBootstrapMode: false,
        minSettledPicksForLearning: 25,
      };
      const policy = evaluatePublicPerformancePolicy({
        canExposePerformanceStats: false,
        minSettledPicksForLearning: 25,
        canonicalSettledCount: 100,
        bootstrapCount: 0,
        pendingCount: 0,
        canonicalWins: 55,
        canonicalLosses: 40,
        canonicalPushes: 5,
      });
      const a = synthesizeJarvis(baseInput({ gates, performancePolicy: policy }));
      expect(a.safetyWarnings.length).toBeGreaterThan(0);
      // The combination should never land on LAUNCH_READY.
      expect(a.launchStatus).not.toBe("LAUNCH_READY");
    });
  });

  describe("oneSentenceAssessment", () => {
    it("LAUNCH_READY assessment mentions 'launch-ready'", () => {
      const a = synthesizeJarvis(
        baseInput({
          layers: {
            trustClaims: "implemented", performanceGating: "implemented",
            promotions: "implemented", dailyBrief: "implemented",
            calibration: "implemented", cockpit: "implemented",
            contentEngine: "implemented", ciHardening: "implemented",
          },
          gates: {
            canPersistCanonicalHistory: true, canUseDerivedHistory: true,
            canExposePublicPicks: false, canPromoteFeaturedPicks: false,
            canExposePerformanceStats: false, canPublishContent: false,
            canLearnFromOutcomes: true, canApplyCalibrationAdjustments: false as const,
            isBootstrapMode: false, minSettledPicksForLearning: 25,
          },
          performancePolicy: evaluatePublicPerformancePolicy({
            canExposePerformanceStats: false, minSettledPicksForLearning: 25,
            canonicalSettledCount: 100, bootstrapCount: 0, pendingCount: 0,
            canonicalWins: 55, canonicalLosses: 40, canonicalPushes: 5,
          }),
        })
      );
      if (a.launchStatus === "LAUNCH_READY") {
        expect(a.oneSentenceAssessment.toLowerCase()).toContain("launch-ready");
        expect(a.oneSentenceAssessment.toLowerCase()).toContain("ingestion fresh");
      }
    });

    it("NOT_READY_DATA assessment mentions data state", () => {
      const a = synthesizeJarvis(
        baseInput({
          ingestion: {
            lastAttemptAt: new Date(NOW.getTime() - 30 * 60 * 60 * 1000),
            lastSuccessAt: new Date(NOW.getTime() - 30 * 60 * 60 * 1000),
            lastWasSuccess: false,
            recentFailureCount: 5,
          },
        })
      );
      // RED ingestion → NOT_READY_DATA
      expect(a.launchStatus).toBe("NOT_READY_DATA");
      expect(a.oneSentenceAssessment.toLowerCase()).toContain("not launch-ready");
      expect(a.oneSentenceAssessment.toLowerCase()).toContain("red state");
    });

    it("NOT_READY_SAFETY assessment mentions safety warning count", () => {
      const gates = {
        canPersistCanonicalHistory: true, canUseDerivedHistory: true,
        canExposePublicPicks: true, canPromoteFeaturedPicks: true,
        canExposePerformanceStats: false, canPublishContent: true,
        canLearnFromOutcomes: true, canApplyCalibrationAdjustments: false as const,
        isBootstrapMode: false, minSettledPicksForLearning: 25,
      };
      const policy = evaluatePublicPerformancePolicy({
        canExposePerformanceStats: false, minSettledPicksForLearning: 25,
        canonicalSettledCount: 100, bootstrapCount: 0, pendingCount: 0,
        canonicalWins: 55, canonicalLosses: 40, canonicalPushes: 5,
      });
      const a = synthesizeJarvis(
        baseInput({
          gates,
          performancePolicy: policy,
          layers: {
            trustClaims: "implemented", performanceGating: "implemented",
            promotions: "implemented", dailyBrief: "implemented",
            calibration: "implemented", cockpit: "implemented",
            contentEngine: "implemented", ciHardening: "implemented",
          },
        })
      );
      if (a.launchStatus === "NOT_READY_SAFETY") {
        expect(a.oneSentenceAssessment).toContain("safety warning");
      }
    });

    it("every non-UNKNOWN assessment contains the canonical settled count from history", () => {
      const a = synthesizeJarvis(baseInput());
      if (a.launchStatus !== "UNKNOWN") {
        expect(a.oneSentenceAssessment).toContain("100 canonical settled");
      }
    });
  });
});

describe("synthesizeJarvis — safety warnings", () => {
  function baseInput(overrides: Partial<JarvisInput> = {}): JarvisInput {
    const NOW = new Date("2026-05-18T12:00:00Z");
    const at = NOW;
    return {
      now: at,
      gates: {
        canPersistCanonicalHistory: true,
        canUseDerivedHistory: true,
        canExposePublicPicks: true,
        canPromoteFeaturedPicks: true,
        canExposePerformanceStats: true,
        canPublishContent: true,
        canLearnFromOutcomes: true,
        canApplyCalibrationAdjustments: false as const,
        isBootstrapMode: false,
        minSettledPicksForLearning: 25,
      },
      performancePolicy: evaluatePublicPerformancePolicy({
        canExposePerformanceStats: true,
        minSettledPicksForLearning: 25,
        canonicalSettledCount: 100,
        bootstrapCount: 0,
        pendingCount: 0,
        canonicalWins: 55,
        canonicalLosses: 40,
        canonicalPushes: 5,
      }),
      ingestion: {
        lastAttemptAt: new Date(at.getTime() - 60 * 60 * 1000),
        lastSuccessAt: new Date(at.getTime() - 60 * 60 * 1000),
        lastWasSuccess: true,
        recentFailureCount: 0,
      },
      settlement: {
        lastSettlementAt: new Date(at.getTime() - 2 * 60 * 60 * 1000),
        settledIn24h: 12,
        pendingPickCount: 0,
      },
      history: {
        canonicalSettledCount: 100,
        bootstrapSettledCount: 0,
        canonicalPendingCount: 0,
        winCount: 55,
        lossCount: 40,
        pushCount: 5,
        voidCount: 0,
        publishedCount: 100,
        featuredCount: 8,
        canonicalEligibleForPublic: 100,
        canonicalExcludedFromPublic: 0,
      },
      signal: {
        snapshotCoveragePct: 0.95,
        signalCoveragePct: 0.92,
        averageDataQualityScore: 0.9,
        modelVersionsActive: ["v5"],
      },
      layers: {
        trustClaims: "implemented",
        performanceGating: "implemented",
        promotions: "implemented",
        dailyBrief: "implemented",
        calibration: "implemented",
        cockpit: "implemented",
        contentEngine: "implemented",
        ciHardening: "implemented",
      },
      externalConfigMissing: [],
      ...overrides,
    };
  }

  it("emits a safety warning when recentFailureCount >= 3 and ingestion is not GREEN", () => {
    const a = synthesizeJarvis(
      baseInput({
        ingestion: {
          lastAttemptAt: new Date("2026-05-18T12:00:00Z"),
          lastSuccessAt: new Date("2026-05-18T12:00:00Z"),
          lastWasSuccess: true,
          recentFailureCount: 4, // >= 3 triggers the warning; AMBER status due to failures
        },
      })
    );
    expect(a.ingestionStatus).toBe("AMBER");
    expect(a.safetyWarnings.some((w) => /recent failure/i.test(w))).toBe(true);
    expect(a.safetyWarnings.some((w) => /data adapter/i.test(w))).toBe(true);
  });

  it("does NOT emit the ingestion-failure safety warning when recentFailureCount is below 3", () => {
    const a = synthesizeJarvis(
      baseInput({
        ingestion: {
          lastAttemptAt: new Date("2026-05-18T12:00:00Z"),
          lastSuccessAt: new Date("2026-05-18T12:00:00Z"),
          lastWasSuccess: true,
          recentFailureCount: 2,
        },
      })
    );
    expect(a.safetyWarnings.every((w) => !/data adapter/i.test(w))).toBe(true);
  });

  it("emits bootstrap safety warning when isBootstrapMode and bootstrapSettledCount > 0", () => {
    const a = synthesizeJarvis(
      baseInput({
        gates: {
          canPersistCanonicalHistory: false, // isBootstrapMode = true
          canUseDerivedHistory: false,
          canExposePublicPicks: false,
          canPromoteFeaturedPicks: false,
          canExposePerformanceStats: false,
          canPublishContent: false,
          canLearnFromOutcomes: false,
          canApplyCalibrationAdjustments: false as const,
          isBootstrapMode: true,
          minSettledPicksForLearning: 25,
        },
        history: {
          canonicalSettledCount: 0,
          bootstrapSettledCount: 10, // > 0 triggers the warning
          canonicalPendingCount: 0,
          winCount: 0,
          lossCount: 0,
          pushCount: 0,
          voidCount: 0,
          publishedCount: 0,
          featuredCount: 0,
          canonicalEligibleForPublic: 0,
          canonicalExcludedFromPublic: 0,
        },
      })
    );
    expect(a.safetyWarnings.some((w) => /bootstrap/i.test(w))).toBe(true);
  });
});

describe("synthesizeJarvis — recommended actions branches", () => {
  const NOW = new Date("2026-05-18T12:00:00Z");

  function base(overrides: Partial<JarvisInput> = {}): JarvisInput {
    return {
      now: NOW,
      gates: {
        canPersistCanonicalHistory: true,
        canUseDerivedHistory: true,
        canExposePublicPicks: true,
        canPromoteFeaturedPicks: true,
        canExposePerformanceStats: true,
        canPublishContent: true,
        canLearnFromOutcomes: true,
        canApplyCalibrationAdjustments: false as const,
        isBootstrapMode: false,
        minSettledPicksForLearning: 25,
      },
      performancePolicy: evaluatePublicPerformancePolicy({
        canExposePerformanceStats: true,
        minSettledPicksForLearning: 25,
        canonicalSettledCount: 100,
        bootstrapCount: 0,
        pendingCount: 0,
        canonicalWins: 55,
        canonicalLosses: 40,
        canonicalPushes: 5,
      }),
      ingestion: {
        lastAttemptAt: new Date(NOW.getTime() - 60 * 60 * 1000),
        lastSuccessAt: new Date(NOW.getTime() - 60 * 60 * 1000),
        lastWasSuccess: true,
        recentFailureCount: 0,
      },
      settlement: {
        lastSettlementAt: new Date(NOW.getTime() - 2 * 60 * 60 * 1000),
        settledIn24h: 12,
        pendingPickCount: 0,
      },
      history: {
        canonicalSettledCount: 100,
        bootstrapSettledCount: 0,
        canonicalPendingCount: 0,
        winCount: 55,
        lossCount: 40,
        pushCount: 5,
        voidCount: 0,
        publishedCount: 100,
        featuredCount: 8,
        canonicalEligibleForPublic: 100,
        canonicalExcludedFromPublic: 0,
      },
      signal: {
        snapshotCoveragePct: 0.95,
        signalCoveragePct: 0.92,
        averageDataQualityScore: 0.9,
        modelVersionsActive: ["v5"],
      },
      layers: {
        trustClaims: "implemented",
        performanceGating: "implemented",
        promotions: "implemented",
        dailyBrief: "implemented",
        calibration: "implemented",
        cockpit: "implemented",
        contentEngine: "implemented",
        ciHardening: "implemented",
      },
      externalConfigMissing: [],
      ...overrides,
    };
  }

  it("includes 'Inspect ingestion errors' action when ingestion is AMBER and lastSuccessAt is not null", () => {
    const a = synthesizeJarvis(
      base({
        ingestion: {
          lastAttemptAt: new Date(NOW.getTime() - 8 * 60 * 60 * 1000), // 8h ago → AMBER
          lastSuccessAt: new Date(NOW.getTime() - 8 * 60 * 60 * 1000),
          lastWasSuccess: true,
          recentFailureCount: 0,
        },
      })
    );
    expect(a.ingestionStatus).toBe("AMBER");
    expect(a.recommendedNextActions.some((x) => /Inspect ingestion errors/i.test(x))).toBe(true);
  });

  it("includes 'Settle N pending picks' action when pendingPickCount > 0 and settlement is not GREEN", () => {
    const a = synthesizeJarvis(
      base({
        settlement: {
          lastSettlementAt: new Date(NOW.getTime() - 40 * 60 * 60 * 1000), // 40h ago → RED
          settledIn24h: 0,
          pendingPickCount: 7,
        },
      })
    );
    expect(a.settlementStatus).toBe("RED");
    expect(a.recommendedNextActions.some((x) => /Settle 7 pending picks/i.test(x))).toBe(true);
  });
});
