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
  it("the committed snapshot hashes to its pinned digest (tamper-evident fixture)", () => {
    const raw = read("lib/resource-intelligence/radar/generated/2026-07-11.json");
    const digest = createHash("sha256").update(raw, "utf8").digest("hex");
    // Pinned at import time. A new founder-verified snapshot updates this pin
    // in the same commit — silent fixture edits fail here.
    expect(`sha256:${digest}`).toBe(
      "sha256:74dcddc01c0f07aa26f22868773248d9c424ba2d7a65f422910bf3e96f38f619"
    );
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
