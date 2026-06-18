import { describe, it, expect } from "vitest";
import {
  VALUE_TIERS,
  getValueTier,
  getLiveValueTiers,
  POSITIONING,
  EMOTIONAL_VALUE,
} from "@/lib/pricing/value-architecture";
import {
  FEATURE_GATES,
  isFeatureUnlocked,
  featuresForTier,
  freeVisibleFeatures,
} from "@/lib/pricing/feature-gates";
import { PROMO_CODES, getPromoCode, getActivePromoCodes } from "@/lib/pricing/promo-codes";
import { getPricingPhase } from "@/lib/pricing/pricing-phases";

// Banned betting-hype / guaranteed-outcome phrases (owner brief §12).
const BANNED = [
  "guaranteed", "free money", "risk-free", "risk free", "can't lose", "cant lose",
  "sharp lock", "whale play", "retirement play", "mortgage play", "guaranteed profit",
  "easy cash", "safe bet", "sure thing", "lock of the",
];

function scan(text: string, label: string) {
  const lower = text.toLowerCase();
  for (const phrase of BANNED) {
    expect(lower.includes(phrase), `${label} contains banned phrase "${phrase}"`).toBe(false);
  }
}

describe("value architecture — ladder shape", () => {
  it("has exactly four tiers in Free < Pro < Elite < Operator order", () => {
    expect(VALUE_TIERS.map((t) => t.id)).toEqual(["FREE", "PRO", "ELITE", "OPERATOR"]);
    for (let i = 1; i < VALUE_TIERS.length; i++) {
      expect(VALUE_TIERS[i]!.order).toBeGreaterThan(VALUE_TIERS[i - 1]!.order);
    }
  });

  it("Free and Pro explain why the next tier exists; Elite (top public) and Operator (hidden) need not", () => {
    for (const t of VALUE_TIERS) {
      if (t.id === "FREE" || t.id === "PRO") {
        expect(t.whyNextTier && t.whyNextTier.length, `${t.id} whyNextTier`).toBeGreaterThan(0);
      }
    }
    expect(getValueTier("ELITE").whyNextTier).toBeNull();
    expect(getValueTier("OPERATOR").whyNextTier).toBeNull();
  });

  it("every tier has a promise, audience, and CTA", () => {
    for (const t of VALUE_TIERS) {
      expect(t.promise.length, `${t.id} promise`).toBeGreaterThan(0);
      expect(t.forWho.length, `${t.id} forWho`).toBeGreaterThan(0);
      expect(t.ctaLabel.length, `${t.id} cta`).toBeGreaterThan(0);
    }
  });

  it("Operator is hidden; Free/Pro/Elite are the live, public tiers", () => {
    expect(getValueTier("OPERATOR").status).toBe("hidden");
    expect(getLiveValueTiers().map((t) => t.id)).toEqual(["FREE", "PRO", "ELITE"]);
  });
});

describe("value architecture — Free must not leak the paid product", () => {
  const free = getValueTier("FREE");

  it("Free is priced at $0", () => {
    expect(free.price.monthly).toBe(0);
    expect(free.price.annual).toBe(0);
  });

  it("Free explicitly gates the full board, full reasoning, confidence, and alerts", () => {
    const gatedText = free.gated.join(" ").toLowerCase();
    expect(gatedText).toContain("full board");
    expect(gatedText).toMatch(/reasoning|confidence/);
    expect(gatedText).toContain("alert");
  });

  it("Free's unlocks are previews/education/samples only — never the full product", () => {
    const unlocks = free.unlocks.join(" ").toLowerCase();
    // Free may mention a *partial* board, but never the full board / full reasoning.
    expect(unlocks).not.toMatch(/full (daily )?board/);
    expect(unlocks).not.toContain("full reasoning");
  });
});

describe("value architecture — prices come from pricing-phases (no drift)", () => {
  it("Pro/Elite founding prices match pricing-phases FOUNDING exactly", () => {
    const founding = getPricingPhase("FOUNDING");
    expect(getValueTier("PRO").price.monthly).toBe(founding.pro.monthly);
    expect(getValueTier("PRO").price.annual).toBe(founding.pro.annual);
    expect(getValueTier("ELITE").price.monthly).toBe(founding.elite.monthly);
    expect(getValueTier("ELITE").price.annual).toBe(founding.elite.annual);
  });
});

describe("value architecture — copy is compliance-safe", () => {
  it("no banned hype phrases anywhere in customer-facing tier copy", () => {
    scan(POSITIONING, "POSITIONING");
    scan(EMOTIONAL_VALUE, "EMOTIONAL_VALUE");
    for (const t of VALUE_TIERS) {
      scan([t.name, t.promise, t.forWho, t.ctaLabel, t.whyNextTier ?? "", ...t.unlocks, ...t.gated].join(" "), t.id);
    }
  });
});

describe("feature gating", () => {
  it("every feature has a valid tier, status, and customer explanation", () => {
    const tiers = new Set(["FREE", "PRO", "ELITE", "OPERATOR"]);
    const statuses = new Set(["live", "demo", "preview", "waitlist", "planned", "disabled"]);
    for (const f of FEATURE_GATES) {
      expect(tiers.has(f.minTier), `${f.key} minTier`).toBe(true);
      expect(statuses.has(f.status), `${f.key} status`).toBe(true);
      expect(f.customerExplanation.length, `${f.key} explanation`).toBeGreaterThan(0);
    }
  });

  it("feature keys are unique", () => {
    const keys = FEATURE_GATES.map((f) => f.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("the full daily board is Pro+ (not Free)", () => {
    expect(isFeatureUnlocked("FREE", "daily-board-full")).toBe(false);
    expect(isFeatureUnlocked("PRO", "daily-board-full")).toBe(true);
    expect(isFeatureUnlocked("FREE", "signal-reasoning")).toBe(false);
  });

  it("Elite-first restructure: signal-reasoning and parlay-mri are Elite-only (not Pro)", () => {
    for (const key of ["signal-reasoning", "parlay-mri"]) {
      expect(isFeatureUnlocked("PRO", key), `${key} should be Elite-only now`).toBe(false);
      expect(isFeatureUnlocked("ELITE", key), `${key} at Elite`).toBe(true);
    }
  });

  it("confidence stays a Pro feature (the entry-tier value anchor)", () => {
    expect(isFeatureUnlocked("FREE", "confidence")).toBe(false);
    expect(isFeatureUnlocked("PRO", "confidence")).toBe(true);
    expect(isFeatureUnlocked("ELITE", "confidence")).toBe(true);
  });

  it("the new Elite money-features (Trend Lab, ask-the-model, line-movement) are Elite-only", () => {
    for (const key of ["trend-lab", "ask-the-model", "line-movement"]) {
      expect(isFeatureUnlocked("PRO", key), `${key} should be Elite-only`).toBe(false);
      expect(isFeatureUnlocked("ELITE", key), `${key} at Elite`).toBe(true);
    }
  });

  it("Galaxy Twin, CLV, and deeper market movement are Elite+ (not Pro)", () => {
    for (const key of ["galaxy-twin", "clv-tracking", "market-movement"]) {
      expect(isFeatureUnlocked("PRO", key), `${key} should be Elite+`).toBe(false);
      expect(isFeatureUnlocked("ELITE", key), `${key} at Elite`).toBe(true);
    }
  });

  it("Operator features (exports, scenario, exposure) unlock only at Operator", () => {
    for (const key of ["exports", "scenario-analysis", "exposure-tracking"]) {
      expect(isFeatureUnlocked("ELITE", key), `${key} should be Operator-only`).toBe(false);
      expect(isFeatureUnlocked("OPERATOR", key)).toBe(true);
    }
  });

  it("education, No-Bet examples, and proof preview are open to Free", () => {
    for (const key of ["methodology", "academy-basics", "no-bet-examples", "proof-ledger-preview"]) {
      expect(isFeatureUnlocked("FREE", key), `${key} should be Free`).toBe(true);
    }
  });

  it("each tier unlocks a strict superset of the tier below", () => {
    const order = ["FREE", "PRO", "ELITE", "OPERATOR"] as const;
    for (let i = 1; i < order.length; i++) {
      const below = new Set(featuresForTier(order[i - 1]!).map((f) => f.key));
      const here = new Set(featuresForTier(order[i]!).map((f) => f.key));
      for (const k of below) expect(here.has(k), `${order[i]} missing ${k}`).toBe(true);
      expect(here.size).toBeGreaterThan(below.size);
    }
  });

  it("Free sees value previews but blurred/hidden features never include the full board", () => {
    const free = freeVisibleFeatures().map((f) => f.key);
    expect(free).toContain("board-preview");
    expect(free).toContain("no-bet-examples");
    // The fully-unlocked-at-Free set excludes the paid core.
    const fullyFree = featuresForTier("FREE").map((f) => f.key);
    expect(fullyFree).not.toContain("daily-board-full");
    expect(fullyFree).not.toContain("galaxy-twin");
  });

  it("no banned hype phrases in feature copy", () => {
    for (const f of FEATURE_GATES) scan(`${f.displayName} ${f.customerExplanation}`, f.key);
  });
});

describe("promo codes — safe by default", () => {
  it("no promo is active until live coupon infra exists — even owner-approved ones stay inactive", () => {
    for (const p of PROMO_CODES) {
      expect(p.active, `${p.code} active`).toBe(false);
    }
    // FOUNDING50 is owner-approved but still inactive (no Stripe coupon wired).
    expect(getActivePromoCodes()).toHaveLength(0);
    expect(PROMO_CODES.some((p) => p.ownerApproved)).toBe(true);
  });

  it("no promo is stackable and each carries compliance + kill-switch copy", () => {
    for (const p of PROMO_CODES) {
      expect(p.stackable).toBe(false);
      expect(p.complianceCopy.length, `${p.code} compliance`).toBeGreaterThan(0);
      expect(p.killSwitchMetric.length, `${p.code} kill switch`).toBeGreaterThan(0);
      expect(p.eligiblePlans.length, `${p.code} eligible plans`).toBeGreaterThan(0);
    }
  });

  it("codes resolve case-insensitively", () => {
    expect(getPromoCode("galaxyfounding")?.code).toBe("GALAXYFOUNDING");
    expect(getPromoCode("NOPE")).toBeUndefined();
  });

  it("no banned hype phrases in promo copy", () => {
    for (const p of PROMO_CODES) scan(`${p.audience} ${p.offer} ${p.complianceCopy}`, p.code);
  });
});
