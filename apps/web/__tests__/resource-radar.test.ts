import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  RADAR_SNAPSHOT,
  validateSnapshot,
  getObservations,
  normalizeRepository,
  normalizePosture,
  effectiveDisposition,
  isLicenseVerified,
  scoreObservation,
  buildDossiers,
  buildRadarFeed,
  mostRestrictivePosture,
  highestRisk,
} from "@/lib/resource-intelligence/radar";
import { GATED_DISPOSITIONS, IMPLEMENTABLE_DISPOSITIONS } from "@/lib/resource-intelligence/types";

/**
 * R&D Radar — the 12 required invariant classes from the frontier packet.
 * The radar observes innovation without trusting it: deterministic, no
 * network, gated items never leak into action lists, no install path.
 */

const read = (rel: string) => readFileSync(join(__dirname, "..", rel), "utf8");
const AS_OF = RADAR_SNAPSHOT.observedAt; // same-day = nothing stale

describe("radar — 1. normalization determinism", () => {
  it("repository identity is deterministic and case-stable", () => {
    expect(normalizeRepository("NVIDIA/SkillSpector")).toBe("nvidia/skillspector");
    expect(normalizeRepository("  NVIDIA/SkillSpector.git ")).toBe("nvidia/skillspector");
    expect(normalizeRepository("Hugging Bay concept shown in screenshot")).toBe(
      "concept:hugging-bay-concept-shown-in-screenshot"
    );
  });

  it("posture normalization reduces every free-text posture to the enum", () => {
    expect(normalizePosture("PROTOTYPE_RIGHTS_CLEARED")).toBe("PROTOTYPE");
    expect(normalizePosture("REFERENCE_ONLY_UNTIL_CONSENT_LICENSE_REVIEW")).toBe("REFERENCE_ONLY");
    expect(normalizePosture("OWNER_LEGAL_REVIEW")).toBe("OWNER_REVIEW");
    expect(normalizePosture("QUARANTINE_RIGHTS")).toBe("QUARANTINE");
    expect(normalizePosture("ADOPT_PATTERNS_NOT_DEPENDENCY")).toBe("ADOPT_PATTERNS");
    expect(normalizePosture("EVALUATE")).toBe("OBSERVE");
  });

  it("G-4: REJECT variants match by prefix; unrecognized postures gate as OWNER_REVIEW, never watch-only", () => {
    expect(normalizePosture("REJECTED")).toBe("REJECT");
    expect(normalizePosture("REJECT_NOISE")).toBe("REJECT");
    // Fail-closed fallback: an unrecognized posture is an evidence defect —
    // it must gate (owner_review), not silently become OBSERVE/roadmap.
    expect(normalizePosture("SHIP_IT_NOW")).toBe("OWNER_REVIEW");
    expect(normalizePosture("")).toBe("OWNER_REVIEW");
  });

  it("the committed snapshot validates clean", () => {
    expect(validateSnapshot(RADAR_SNAPSHOT)).toEqual([]);
  });

  it("fixture normalization matches runtime normalization (no import-script drift)", () => {
    for (const o of getObservations()) {
      expect(o.normalizedRepository).toBe(normalizeRepository(o.repository));
      expect(o.normalizedPosture).toBe(normalizePosture(o.proposedPosture));
      expect(o.id).toBe(`${o.window}:${o.normalizedRepository}`);
    }
  });
});

describe("radar — 2. duplicate observation handling", () => {
  it("re-observations across windows merge into one dossier, all raw rows preserved", () => {
    const obs = getObservations();
    const pageAgent = obs.filter((o) => o.normalizedRepository === "alibaba/page-agent");
    expect(pageAgent.length).toBeGreaterThanOrEqual(2); // weekly + monthly in packet
    const dossiers = buildDossiers(obs, AS_OF);
    const d = dossiers.filter((x) => x.normalizedRepository === "alibaba/page-agent");
    expect(d.length).toBe(1);
    expect(d[0]!.observations.length).toBe(pageAgent.length);
  });

  it("merge is conservative: most restrictive posture wins", () => {
    expect(mostRestrictivePosture(["PROTOTYPE", "QUARANTINE"])).toBe("QUARANTINE");
    expect(mostRestrictivePosture(["ADOPT_PATTERNS", "OWNER_REVIEW"])).toBe("OWNER_REVIEW");
  });
});

describe("radar — 3. score determinism", () => {
  it("same observation → identical score object", () => {
    const o = getObservations()[0]!;
    expect(scoreObservation(o)).toEqual(scoreObservation({ ...o }));
  });

  it("whole feed is deterministic: same inputs → deep-equal output", () => {
    expect(buildRadarFeed(AS_OF)).toEqual(buildRadarFeed(AS_OF));
  });
});

describe("radar — 4. blocked override beats any score", () => {
  it("BLOCKED risk maps to quarantine regardless of posture or license", () => {
    expect(effectiveDisposition("PROTOTYPE", "BLOCKED", "MIT")).toBe("quarantine");
    expect(effectiveDisposition("ADOPT_PATTERNS", "BLOCKED", "Apache-2.0")).toBe("quarantine");
  });

  it("blocked dossiers carry blockedOverride so no UI can rank them by score", () => {
    const blocked = buildDossiers(getObservations(), AS_OF).filter((d) => d.risk === "BLOCKED");
    expect(blocked.length).toBeGreaterThan(0);
    for (const d of blocked) {
      expect(d.score.blockedOverride).toBe(true);
      expect(d.effectiveDisposition).toBe("quarantine");
    }
  });
});

describe("radar — 5+6. gated items never leak into action lists", () => {
  it("no quarantine or owner-review dossier appears in recommendedExperiments", () => {
    const feed = buildRadarFeed(AS_OF);
    const gatedRepos = new Set(
      feed.dossiers
        .filter((d) => (GATED_DISPOSITIONS as readonly string[]).includes(d.effectiveDisposition))
        .map((d) => d.normalizedRepository)
    );
    expect(gatedRepos.size).toBeGreaterThan(0); // packet contains both classes
    for (const e of feed.recommendedExperiments) {
      expect(gatedRepos.has(e.normalizedRepository), `${e.normalizedRepository} leaked`).toBe(false);
    }
  });

  it("gated counts are populated (counts-only surfacing works)", () => {
    const feed = buildRadarFeed(AS_OF);
    expect(feed.gatedCounts.quarantine).toBeGreaterThan(0);
    expect(feed.gatedCounts.ownerReview).toBeGreaterThan(0);
  });

  it("CRITICAL risk caps at owner_review even when the posture looks actionable", () => {
    expect(effectiveDisposition("PILOT", "CRITICAL", "Apache-2.0")).toBe("owner_review");
  });
});

describe("radar — 7. unknown license can never become implementable", () => {
  it("license gate blocks prototype/pilot without a verified license", () => {
    expect(isLicenseVerified("VERIFY")).toBe(false);
    expect(isLicenseVerified(null)).toBe(false);
    expect(isLicenseVerified("CUSTOM")).toBe(false);
    expect(effectiveDisposition("PROTOTYPE", "HIGH", "VERIFY")).toBe("owner_review");
    expect(effectiveDisposition("PILOT", "MEDIUM", null)).toBe("owner_review");
  });

  it("nothing the radar emits is ever approved_direct", () => {
    for (const d of buildDossiers(getObservations(), AS_OF)) {
      expect(d.effectiveDisposition).not.toBe("approved_direct");
    }
  });

  it("every implementable dossier carries a verified license and non-critical risk", () => {
    for (const d of buildDossiers(getObservations(), AS_OF)) {
      if ((IMPLEMENTABLE_DISPOSITIONS as readonly string[]).includes(d.effectiveDisposition)) {
        expect(d.licenseUnverified, d.normalizedRepository).toBe(false);
        expect(["LOW", "MEDIUM", "HIGH"]).toContain(d.risk);
      }
    }
  });
});

describe("radar — 8. self-claims are labeled", () => {
  it("dossier payload separates popularity facts from claims", () => {
    const d = buildDossiers(getObservations(), AS_OF)[0]!;
    // whyRelevant is claim-typed in the contract; the page copy states the
    // facts-vs-claims rule verbatim so the reader always sees it.
    expect(typeof d.whyRelevant).toBe("string");
    const page = read("app/cockpit/sources/radar/page.tsx");
    expect(page).toMatch(/facts about popularity|popularity facts/i);
    expect(page).toMatch(/claim until GSE reproduces it/i);
  });

  it("every dossier says why it is NOT ready (never a bare recommendation)", () => {
    for (const d of buildDossiers(getObservations(), AS_OF)) {
      expect(d.whyNotReady.length, d.normalizedRepository).toBeGreaterThan(0);
    }
  });
});

describe("radar — 9. admin-only API", () => {
  it("route checks the admin session before anything else and gates on the flag", () => {
    const route = read("app/api/cockpit/resource-intelligence/radar/route.ts");
    expect(route).toMatch(/session\?\.user \|\| session\.user\.role !== "ADMIN"/);
    expect(route).toMatch(/status: 403/);
    expect(route).toMatch(/isRadarEnabled\(\)/);
    // Auth check must come BEFORE the flag check — the flag is not a secret,
    // but unauthenticated callers learn nothing either way.
    expect(route.indexOf('role !== "ADMIN"')).toBeLessThan(route.indexOf("isRadarEnabled()"));
  });
});

describe("radar — 10. no secrets in payload", () => {
  it("snapshot and feed contain no env-var-shaped or key-shaped strings", () => {
    const json = JSON.stringify(buildRadarFeed(AS_OF));
    // Key-shaped: "sk-" + 16+ chars, not preceded by a letter (so prose like
    // "task-specific" cannot trip it).
    expect(json).not.toMatch(/(?<![A-Za-z])sk-[A-Za-z0-9]{16,}/);
    expect(json).not.toMatch(/(API_KEY|SECRET|TOKEN|PASSWORD)\s*[=:]/i);
    expect(json).not.toMatch(/postgres(ql)?:\/\//i);
  });
});

describe("radar — 11. empty and disabled states are distinct from error", () => {
  it("page renders a deliberate disabled state and a deliberate empty state", () => {
    const page = read("app/cockpit/sources/radar/page.tsx");
    expect(page).toContain("radar-disabled-state");
    expect(page).toContain("radar-empty-state");
    expect(page).toMatch(/deliberate off state, not an error/i);
    expect(page).toMatch(/honest state/i);
  });

  it("flag defaults off", () => {
    // Unit env has no RESOURCE_RADAR_V2_ENABLED: the module must read false.
    expect(process.env["RESOURCE_RADAR_V2_ENABLED"]).toBeUndefined();
  });

  it("no install affordance exists on any radar surface", () => {
    const page = read("app/cockpit/sources/radar/page.tsx");
    const route = read("app/api/cockpit/resource-intelligence/radar/route.ts");
    for (const src of [page, route]) {
      expect(src.toLowerCase()).not.toMatch(/npm install|npx |git clone|pip install/);
    }
    expect(page).toMatch(/Nothing below is approved to install/i);
  });
});

describe("radar — 12. fixture integrity", () => {
  it("the runtime pointer (latest.json) hashes to its pinned digest", () => {
    const raw = read("lib/resource-intelligence/radar/generated/latest.json");
    const digest = createHash("sha256").update(raw, "utf8").digest("hex");
    // Pinned at import time. A new founder-verified snapshot updates this pin
    // in the same commit — silent fixture edits fail here.
    expect(`sha256:${digest}`).toBe(
      "sha256:74dcddc01c0f07aa26f22868773248d9c424ba2d7a65f422910bf3e96f38f619"
    );
  });

  it("latest.json equals its dated history copy, and the runtime imports latest", () => {
    // Codex P2 on #76: the importer rewrites latest.json so a new snapshot
    // goes live without editing snapshot.ts. The dated copy is provenance.
    const latest = read("lib/resource-intelligence/radar/generated/latest.json");
    const dated = read("lib/resource-intelligence/radar/generated/2026-07-11.json");
    expect(latest).toBe(dated);
    const snapshotSrc = read("lib/resource-intelligence/radar/snapshot.ts");
    expect(snapshotSrc).toContain('from "./generated/latest.json"');
  });

  it("snapshot carries the source CSV's sha256 for provenance", () => {
    const csv = readFileSync(
      join(__dirname, "..", "..", "..", "docs", "rnd", "radar-snapshots", "2026-07-11.csv"),
      "utf8"
    );
    const digest = createHash("sha256").update(csv, "utf8").digest("hex");
    expect(RADAR_SNAPSHOT.sourceSha256).toBe(digest);
  });

  it("all 43 packet observations are preserved", () => {
    expect(RADAR_SNAPSHOT.observationCount).toBe(43);
    expect(getObservations().length).toBe(43);
  });
});

describe("radar — Codex #76 regressions", () => {
  const mk = (over: Partial<ReturnType<typeof getObservations>[number]>) => ({
    ...getObservations()[0]!,
    ...over,
  });

  it("license allowlist rejects non-evidence values", () => {
    for (const bad of ["NOASSERTION", "Other", "TBD", "Proprietary", "SEE LICENSE IN FILE"]) {
      expect(isLicenseVerified(bad), bad).toBe(false);
    }
    expect(isLicenseVerified("MIT")).toBe(true);
    expect(isLicenseVerified("Apache-2.0")).toBe(true);
  });

  it("conservative license merge: any unverified row keeps the dossier unverified", () => {
    const a = mk({
      id: "weekly:example/repo", window: "weekly" as const,
      repository: "example/repo", normalizedRepository: "example/repo",
      normalizedPosture: "PROTOTYPE" as const, risk: "MEDIUM" as const, license: "MIT",
    });
    const b = mk({
      id: "monthly:example/repo", window: "monthly" as const,
      repository: "example/repo", normalizedRepository: "example/repo",
      normalizedPosture: "PROTOTYPE" as const, risk: "MEDIUM" as const, license: "VERIFY",
    });
    const [d] = buildDossiers([a, b], AS_OF).filter((x) => x.normalizedRepository === "example/repo");
    expect(d!.licenseUnverified).toBe(true);
    // The open gap caps the disposition: prototype demoted to owner review.
    expect(d!.effectiveDisposition).toBe("owner_review");
  });

  it("merged hard risk voids the score even when the scored row was tame", () => {
    const rich = mk({
      id: "weekly:example/blocked", window: "weekly" as const,
      repository: "example/blocked", normalizedRepository: "example/blocked",
      normalizedPosture: "PROTOTYPE" as const, risk: "MEDIUM" as const,
      license: "MIT", totalStars: 50000, trendGain: 9000,
    });
    const blockedSparse = mk({
      id: "monthly:example/blocked", window: "monthly" as const,
      repository: "example/blocked", normalizedRepository: "example/blocked",
      normalizedPosture: "PROTOTYPE" as const, risk: "BLOCKED" as const,
      license: "MIT", totalStars: null, trendGain: null,
    });
    const [d] = buildDossiers([rich, blockedSparse], AS_OF).filter(
      (x) => x.normalizedRepository === "example/blocked"
    );
    expect(d!.risk).toBe("BLOCKED");
    expect(d!.score.blockedOverride).toBe(true);
    expect(d!.effectiveDisposition).toBe("quarantine");
  });

  it("unknown risk labels fail closed to quarantine", () => {
    expect(
      effectiveDisposition("PROTOTYPE", "BLOCKED_RIGHTS" as never, "MIT")
    ).toBe("quarantine");
  });

  it("G-3: unknown POSTURE labels fail closed to quarantine (was: undefined fell through open)", () => {
    expect(
      effectiveDisposition("ADOPT_NOW" as never, "LOW", "MIT")
    ).toBe("quarantine");
  });

  it("G-3: unknown labels rank most restrictive in cross-window merges", () => {
    expect(mostRestrictivePosture(["PROTOTYPE", "ADOPT_NOW" as never])).toBe("ADOPT_NOW");
    expect(highestRisk(["LOW", "BLOCKED_RIGHTS" as never])).toBe("BLOCKED_RIGHTS");
  });

  it("the importer validates risk against the closed set", () => {
    const importer = readFileSync(
      join(__dirname, "..", "..", "..", "scripts", "resource-radar-import.mjs"),
      "utf8"
    );
    expect(importer).toMatch(/RISKS = \["LOW", "MEDIUM", "HIGH", "CRITICAL", "BLOCKED"\]/);
    expect(importer).toMatch(/Unknown risk/);
    expect(importer).toMatch(/process\.exit\(1\)/);
  });

  it("validateSnapshot rejects unknown enum values in a hand-edited fixture", () => {
    const tampered = {
      ...RADAR_SNAPSHOT,
      observations: [
        { ...getObservations()[0]!, risk: "BLOCKED_RIGHTS" as never },
        ...getObservations().slice(1),
      ],
    };
    const problems = validateSnapshot(tampered);
    expect(problems.some((p) => p.includes("unknown risk"))).toBe(true);
  });

  it("G-3: validateSnapshot is WIRED at module load and getObservations fails closed on problems", () => {
    // The committed snapshot is clean, so the throw can't fire in-process;
    // pin the wiring itself (same pattern as the importer scan above) so
    // validation can never silently become dead code again.
    const src = read("lib/resource-intelligence/radar/snapshot.ts");
    expect(src).toMatch(/const SNAPSHOT_PROBLEMS[^=]*= validateSnapshot\(RADAR_SNAPSHOT\)/);
    expect(src).toMatch(/if \(SNAPSHOT_PROBLEMS\.length > 0\) \{\s*\n\s*throw new Error/);
  });
});
