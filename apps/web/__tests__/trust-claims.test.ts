import { describe, it, expect } from "vitest";
import {
  TRUST_CLAIMS,
  getClaim,
  getApprovedClaims,
  getBannedClaims,
  getBannedPhraseList,
  INTERNAL_VOCABULARY,
  scanForBannedPhrases,
} from "@/lib/trust-claims";

describe("Trust Claim Registry — shape", () => {
  it("exports at least one approved claim per non-banned category we rely on", () => {
    expect(getApprovedClaims("METHODOLOGY").length).toBeGreaterThanOrEqual(3);
    expect(getApprovedClaims("RISK_DISCLOSURE").length).toBeGreaterThanOrEqual(2);
    expect(getApprovedClaims("DATA_TRANSPARENCY").length).toBeGreaterThanOrEqual(1);
    expect(getApprovedClaims("PRICING").length).toBeGreaterThanOrEqual(1);
  });

  it("every claim has a stable id, copy, status, category, evidence, visibility, and review date", () => {
    for (const claim of TRUST_CLAIMS) {
      expect(claim.id).toMatch(/^[a-z][a-z0-9.-]+$/);
      expect(claim.copy.length).toBeGreaterThan(0);
      expect(["APPROVED", "GATED", "BANNED"]).toContain(claim.status);
      expect([
        "METHODOLOGY",
        "DATA_TRANSPARENCY",
        "PERFORMANCE",
        "PRICING",
        "SOCIAL_PROOF",
        "RISK_DISCLOSURE",
      ]).toContain(claim.category);
      expect([
        "ENGINE_BEHAVIOR",
        "DATA_MODEL",
        "PUBLIC_DOC",
        "BILLING_POLICY",
        "REGULATORY",
        "NONE",
      ]).toContain(claim.evidence);
      expect(["PUBLIC", "DASHBOARD", "ADMIN", "INTERNAL"]).toContain(
        claim.visibility
      );
      expect(claim.lastReviewedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(claim.reviewNote.length).toBeGreaterThan(0);
    }
  });

  it("BANNED claims are not visible publicly and carry evidence=NONE", () => {
    for (const claim of getBannedClaims()) {
      expect(claim.visibility).toBe("INTERNAL");
      expect(claim.evidence).toBe("NONE");
    }
  });

  it("GATED claims declare a requiredGate", () => {
    const gated = TRUST_CLAIMS.filter((c) => c.status === "GATED");
    expect(gated.length).toBeGreaterThan(0);
    for (const claim of gated) {
      expect(claim.requiredGate).toBeTruthy();
    }
  });

  it("getClaim() resolves known ids and returns undefined for unknown ones", () => {
    expect(getClaim("methodology.odds-ingestion")?.status).toBe("APPROVED");
    expect(getClaim("performance.public-stats-gated")?.status).toBe("GATED");
    expect(getClaim("does-not-exist")).toBeUndefined();
  });
});

describe("Banned-phrase scanner", () => {
  it("flags each banned phrase when it appears verbatim", () => {
    const cases = [
      "Trusted by thousands of bettors!",
      "Our model is trusted by serious bettors.",
      "These picks are guaranteed winners.",
      "This is a sure thing tonight.",
      "Pick our risk-free promo.",
      "Make easy money on football.",
      "We have a verified track record across 7 sports.",
      "You can't lose with these picks.",
      "This is a lock.",
      "Guaranteed profit by Sunday.",
    ];
    for (const text of cases) {
      const hits = scanForBannedPhrases(text);
      expect(
        hits.length,
        `expected at least one hit in: "${text}"`
      ).toBeGreaterThan(0);
    }
  });

  it("returns hits with line numbers and snippets", () => {
    const hits = scanForBannedPhrases("line one\nrisk-free pick here\nline three");
    expect(hits.length).toBeGreaterThan(0);
    const hit = hits[0]!;
    expect(hit.line).toBe(2);
    expect(hit.snippet).toContain("risk-free");
    expect(hit.claimId).toBe("banned.risk-free");
  });

  it("does NOT flag the word 'lock' inside larger words (block, unlock, clock, padlock)", () => {
    const benign = [
      "We use a block to wrap content",
      "Click here to unlock with Pro",
      "Clock-based picks",
      "Padlock icon shown to free users",
    ];
    for (const text of benign) {
      const hits = scanForBannedPhrases(text).filter(
        (h) => h.claimId === "banned.lock"
      );
      expect(hits.length, `unexpected lock match in: "${text}"`).toBe(0);
    }
  });

  it("does NOT flag 'guarantee' (noun, e.g. money-back guarantee) — only 'guaranteed' (-ed form)", () => {
    const benign = "All paid plans include a 7-day money-back guarantee.";
    const hits = scanForBannedPhrases(benign).filter((h) =>
      h.claimId.startsWith("banned.guaranteed")
    );
    expect(hits.length).toBe(0);
  });

  it("is case-insensitive", () => {
    const hits = scanForBannedPhrases("RISK-FREE pick of the day");
    expect(hits.some((h) => h.claimId === "banned.risk-free")).toBe(true);
  });

  it("returns an empty array for clean text", () => {
    expect(
      scanForBannedPhrases(
        "Our model favors the Chiefs based on bookmaker consensus. Sports betting involves risk."
      )
    ).toEqual([]);
  });

  it("catches phrases typed with smart quotes / fancy hyphens (cannot slip the gate)", () => {
    // U+2019 curly apostrophe — the default from Word / Google Docs / macOS.
    expect(scanForBannedPhrases("You can’t lose with this play.").some((h) => h.claimId === "banned.cant-lose")).toBe(true);
    // U+2011 non-breaking hyphen and U+2013 en-dash forms of risk-free.
    expect(scanForBannedPhrases("totally risk‑free pick").some((h) => h.claimId === "banned.risk-free")).toBe(true);
    expect(scanForBannedPhrases("a risk–free angle").some((h) => h.claimId === "banned.risk-free")).toBe(true);
    // Straight-apostrophe form still flagged (no regression).
    expect(scanForBannedPhrases("you can't lose").some((h) => h.claimId === "banned.cant-lose")).toBe(true);
  });

  it("flags the certainty term 'lock' conservatively in every context (over-block is safe)", () => {
    expect(scanForBannedPhrases("this is a lock").some((h) => h.claimId === "banned.lock")).toBe(true);
    expect(scanForBannedPhrases("see the line at lock").some((h) => h.claimId === "banned.lock")).toBe(true);
    // Word-boundary still spares 'block'/'unlock'/'clock'.
    expect(scanForBannedPhrases("the matchup is a roadblock to unlock").some((h) => h.claimId === "banned.lock")).toBe(false);
  });
});

// ── Public exports needed by other tests and helpers ──────────────────────
describe("Public exports", () => {
  it("getBannedPhraseList returns a non-empty array of strings", () => {
    const phrases = getBannedPhraseList();
    expect(Array.isArray(phrases)).toBe(true);
    expect(phrases.length).toBeGreaterThanOrEqual(5);
    for (const p of phrases) {
      expect(typeof p).toBe("string");
      expect(p.length).toBeGreaterThan(0);
    }
  });

  it("getBannedPhraseList contains the canonical sports-picks banned terms", () => {
    const phrases = getBannedPhraseList().map((p) => p.toLowerCase());
    for (const required of ["guaranteed", "risk-free", "sure thing", "easy money"]) {
      expect(
        phrases.some((p) => p.includes(required)),
        `getBannedPhraseList must include "${required}"`
      ).toBe(true);
    }
  });

  it("INTERNAL_VOCABULARY exports the engine terms callers must keep out of customer copy", () => {
    expect(INTERNAL_VOCABULARY).toContain("canonical");
    expect(INTERNAL_VOCABULARY).toContain("bootstrap");
    expect(INTERNAL_VOCABULARY).toContain("modelVersion");
    expect(INTERNAL_VOCABULARY.length).toBeGreaterThanOrEqual(8);
  });

  it("INTERNAL_VOCABULARY does NOT overlap with the customer-safe approved-claim copy", () => {
    // No approved claim copy should casually drop an internal term.
    for (const claim of getApprovedClaims()) {
      const lower = claim.copy.toLowerCase();
      for (const term of INTERNAL_VOCABULARY) {
        expect(
          new RegExp(`\\b${term}\\b`, "i").test(lower),
          `APPROVED claim ${claim.id} contains internal term "${term}": "${claim.copy}"`
        ).toBe(false);
      }
    }
  });
});

// ── Visibility audit ──────────────────────────────────────────────────────
describe("Trust Claim Registry — visibility audit", () => {
  it("a public-visible PERFORMANCE claim must exist alongside the past-performance disclaimer", () => {
    const performancePublic = getApprovedClaims("PERFORMANCE").filter(
      (c) => c.visibility === "PUBLIC"
    );
    if (performancePublic.length > 0) {
      // If we expose any public performance claim, the disclaimer MUST be
      // available to pair with it.
      const disclaimer = TRUST_CLAIMS.find(
        (c) => c.id === "risk.past-performance" && c.status === "APPROVED"
      );
      expect(
        disclaimer,
        "Performance claims are PUBLIC but the past-performance disclaimer (risk.past-performance) is missing or not APPROVED."
      ).toBeDefined();
    }
  });

  it("a public-visible PRICING claim must exist alongside an APPROVED cancel-anytime claim", () => {
    const pricingPublic = getApprovedClaims("PRICING").filter(
      (c) => c.visibility === "PUBLIC"
    );
    if (pricingPublic.length > 0) {
      const cancel = TRUST_CLAIMS.find(
        (c) => c.id === "pricing.cancel-anytime" && c.status === "APPROVED"
      );
      expect(
        cancel,
        "Pricing claims are PUBLIC but no APPROVED cancel-anytime claim is available."
      ).toBeDefined();
    }
  });

  it("RISK_DISCLOSURE claims are not marked as INTERNAL — they must be visible somewhere", () => {
    for (const claim of getApprovedClaims("RISK_DISCLOSURE")) {
      expect(
        claim.visibility,
        `RISK_DISCLOSURE claim ${claim.id} is marked INTERNAL — that defeats its purpose.`
      ).not.toBe("INTERNAL");
    }
  });

  it("every GATED claim documents a requiredGate", () => {
    const gated = TRUST_CLAIMS.filter((c) => c.status === "GATED");
    for (const claim of gated) {
      expect(
        claim.requiredGate,
        `GATED claim ${claim.id} must reference a readiness-gate key in requiredGate.`
      ).toBeTruthy();
    }
  });

  it("no BANNED claim has visibility=PUBLIC (they should never render)", () => {
    for (const claim of TRUST_CLAIMS.filter((c) => c.status === "BANNED")) {
      expect(
        claim.visibility,
        `BANNED claim ${claim.id} is marked PUBLIC — that's a configuration error.`
      ).not.toBe("PUBLIC");
    }
  });

  it("APPROVED claims have a non-NONE evidence type (NONE is for BANNED only)", () => {
    for (const claim of getApprovedClaims()) {
      expect(
        claim.evidence,
        `APPROVED claim ${claim.id} has evidence=NONE — should be one of ENGINE_BEHAVIOR/DATA_MODEL/PUBLIC_DOC/BILLING_POLICY/REGULATORY.`
      ).not.toBe("NONE");
    }
  });

  it("TRUST_CLAIMS has no duplicate IDs (catches copy/paste regressions)", () => {
    const ids = TRUST_CLAIMS.map((c) => c.id);
    const seen = new Set<string>();
    const dups: string[] = [];
    for (const id of ids) {
      if (seen.has(id)) dups.push(id);
      seen.add(id);
    }
    expect(
      dups,
      `Duplicate trust-claim IDs: ${dups.join(", ")}`
    ).toEqual([]);
  });

  it("TRUST_CLAIMS IDs follow the dot-namespaced lowercase convention", () => {
    for (const claim of TRUST_CLAIMS) {
      expect(
        claim.id,
        `Trust-claim id "${claim.id}" should match ^[a-z][a-z0-9.-]+$`
      ).toMatch(/^[a-z][a-z0-9.-]+$/);
      // Namespaced: must contain at least one dot.
      expect(
        claim.id.includes("."),
        `Trust-claim id "${claim.id}" must be dot-namespaced (e.g. "risk.no-guarantee")`
      ).toBe(true);
    }
  });

  it("risk.gamble-responsibly claim references the canonical NCPG helpline number", () => {
    const claim = getClaim("risk.gamble-responsibly");
    expect(claim, "trust-claim risk.gamble-responsibly must exist").toBeDefined();
    // Canonical U.S. National Problem Gambling Helpline number.
    expect(claim!.copy).toContain("1-800-522-4700");
    expect(claim!.status).toBe("APPROVED");
  });

  it("no other trust-claim hardcodes a phone number (registry is the single source)", () => {
    const phonePattern = /\d-\d{3}-\d{3}-\d{4}/;
    for (const c of TRUST_CLAIMS) {
      if (c.id === "risk.gamble-responsibly") continue;
      expect(
        phonePattern.test(c.copy),
        `Claim ${c.id} hardcodes a phone number — should reference risk.gamble-responsibly instead.`
      ).toBe(false);
    }
  });

  it("every BANNED claim copy is distinct (no two banned phrases share the exact string)", () => {
    const copies = getBannedClaims().map((c) => c.copy.toLowerCase());
    const seen = new Set<string>();
    const dups: string[] = [];
    for (const c of copies) {
      if (seen.has(c)) dups.push(c);
      seen.add(c);
    }
    expect(
      dups,
      `Duplicate banned-phrase copy values: ${dups.join(", ")}`
    ).toEqual([]);
  });

  // ── Enum-shape audit ─────────────────────────────────────────────────────
  it("every claim category is one of the canonical six", () => {
    const allowed = new Set([
      "METHODOLOGY",
      "DATA_TRANSPARENCY",
      "PERFORMANCE",
      "PRICING",
      "SOCIAL_PROOF",
      "RISK_DISCLOSURE",
    ]);
    for (const claim of TRUST_CLAIMS) {
      expect(
        allowed.has(claim.category),
        `Claim ${claim.id} has unknown category: ${claim.category}`
      ).toBe(true);
    }
  });

  it("every claim status is one of the canonical three", () => {
    const allowed = new Set(["APPROVED", "GATED", "BANNED"]);
    for (const claim of TRUST_CLAIMS) {
      expect(
        allowed.has(claim.status),
        `Claim ${claim.id} has unknown status: ${claim.status}`
      ).toBe(true);
    }
  });

  it("every claim visibility is one of the canonical four", () => {
    const allowed = new Set(["PUBLIC", "DASHBOARD", "ADMIN", "INTERNAL"]);
    for (const claim of TRUST_CLAIMS) {
      expect(
        allowed.has(claim.visibility),
        `Claim ${claim.id} has unknown visibility: ${claim.visibility}`
      ).toBe(true);
    }
  });

  it("every claim evidence is one of the canonical six", () => {
    const allowed = new Set([
      "ENGINE_BEHAVIOR",
      "DATA_MODEL",
      "PUBLIC_DOC",
      "BILLING_POLICY",
      "REGULATORY",
      "NONE",
    ]);
    for (const claim of TRUST_CLAIMS) {
      expect(
        allowed.has(claim.evidence),
        `Claim ${claim.id} has unknown evidence: ${claim.evidence}`
      ).toBe(true);
    }
  });

  it("every claim lastReviewedAt parses as a valid date", () => {
    for (const claim of TRUST_CLAIMS) {
      const d = new Date(claim.lastReviewedAt);
      expect(
        Number.isFinite(d.getTime()),
        `Claim ${claim.id} has invalid lastReviewedAt: ${claim.lastReviewedAt}`
      ).toBe(true);
    }
  });

  it("no APPROVED or GATED claim has lastReviewedAt older than 365 days (catches stale registry entries)", () => {
    // Stale claims silently drift away from current legal/compliance
    // guidance. A failure here is the right time to re-review the
    // affected claim and bump lastReviewedAt.
    const now = Date.now();
    const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
    const stale: Array<{ id: string; ageDays: number }> = [];
    for (const claim of TRUST_CLAIMS) {
      if (claim.status !== "APPROVED" && claim.status !== "GATED") continue;
      const t = new Date(claim.lastReviewedAt).getTime();
      const age = now - t;
      if (age > ONE_YEAR_MS) {
        stale.push({ id: claim.id, ageDays: Math.floor(age / (24 * 60 * 60 * 1000)) });
      }
    }
    expect(
      stale,
      `These trust-claims have not been reviewed in over a year:\n${stale
        .map((s) => `  - ${s.id} (${s.ageDays} days)`)
        .join("\n")}`
    ).toEqual([]);
  });
});
