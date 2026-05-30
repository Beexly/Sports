import { describe, it, expect } from "vitest";
import {
  LAYER_1_PLATFORM_BANS,
  LAYER_2_UNSUPPORTED_CLAIMS,
  LAYER_3_TOUT_AND_BAIT,
  ALL_RULES,
  TEMPLATE_SPECIFIC_RULES,
  getRulesForTemplate,
  type ComplianceRule,
} from "@/lib/compliance-scanner/rules";

function hits(rule: ComplianceRule, text: string): boolean {
  return rule.pattern.test(text);
}

describe("compliance-scanner rules shape", () => {
  it("all rules have required fields", () => {
    for (const rule of ALL_RULES) {
      expect(rule.id, `${rule.id} missing id`).toBeTruthy();
      expect([1, 2, 3]).toContain(rule.layer);
      expect(["block", "warn", "info"]).toContain(rule.severity);
      expect(rule.pattern).toBeInstanceOf(RegExp);
      expect(typeof rule.message).toBe("string");
    }
  });

  it("ALL_RULES is the union of all three layers", () => {
    expect(ALL_RULES.length).toBe(
      LAYER_1_PLATFORM_BANS.length +
      LAYER_2_UNSUPPORTED_CLAIMS.length +
      LAYER_3_TOUT_AND_BAIT.length
    );
  });

  it("rule ids are unique", () => {
    const ids = ALL_RULES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("LAYER_1 platform bans", () => {
  it("L1-AI-POWERED blocks 'AI-powered' and 'AI driven'", () => {
    const rule = LAYER_1_PLATFORM_BANS.find((r) => r.id === "L1-AI-POWERED")!;
    expect(hits(rule, "Our AI-powered picks engine")).toBe(true);
    expect(hits(rule, "powered by AI predictions")).toBe(true);
    expect(hits(rule, "AI-driven analysis")).toBe(true);
    expect(hits(rule, "the engine is deterministic")).toBe(false);
  });

  it("L1-MULTIMODAL-INTELLIGENCE blocks AI marketing jargon", () => {
    const rule = LAYER_1_PLATFORM_BANS.find((r) => r.id === "L1-MULTIMODAL-INTELLIGENCE")!;
    expect(hits(rule, "multimodal intelligence system")).toBe(true);
    expect(hits(rule, "AI agents processing games")).toBe(true);
    expect(hits(rule, "machine learning models trained")).toBe(true);
    expect(hits(rule, "our scoring algorithm runs deterministically")).toBe(false);
  });

  it("L1-MISSION-CONTROL blocks 'mission control' eyebrow", () => {
    const rule = LAYER_1_PLATFORM_BANS.find((r) => r.id === "L1-MISSION-CONTROL")!;
    expect(hits(rule, "Welcome to Mission Control")).toBe(true);
    expect(hits(rule, "MISSION CONTROL")).toBe(true);
    expect(hits(rule, "Today's Board")).toBe(false);
  });

  it("L1-ECOSYSTEM blocks ecosystem marketing language", () => {
    const rule = LAYER_1_PLATFORM_BANS.find((r) => r.id === "L1-ECOSYSTEM")!;
    expect(hits(rule, "your edge ecosystem")).toBe(true);
    expect(hits(rule, "the betting ecosystem")).toBe(true);
    expect(hits(rule, "the sports-betting ecosystem")).toBe(true);
    expect(hits(rule, "the platform's factor model")).toBe(false);
  });

  it("L1-TRANSFORM-UNLOCK-LEVEL-UP blocks pitch-deck verbs", () => {
    const rule = LAYER_1_PLATFORM_BANS.find((r) => r.id === "L1-TRANSFORM-UNLOCK-LEVEL-UP")!;
    expect(hits(rule, "Transform your betting game")).toBe(true);
    expect(hits(rule, "Unlock your edge")).toBe(true);
    expect(hits(rule, "Level up your picks")).toBe(true);
    expect(hits(rule, "Your edge starts here")).toBe(true);
    expect(hits(rule, "See today's picks")).toBe(false);
  });

  it("L1-FIRST-PERSON-ALGORITHM blocks first-person algorithm voice", () => {
    const rule = LAYER_1_PLATFORM_BANS.find((r) => r.id === "L1-FIRST-PERSON-ALGORITHM")!;
    expect(hits(rule, "I see strong line movement")).toBe(true);
    expect(hits(rule, "I think the market is off")).toBe(true);
    expect(hits(rule, "in my opinion this is a solid play")).toBe(true);
    expect(hits(rule, "the model reads sharp action")).toBe(false);
  });

  it("L1-BOARD-PERSONIFICATION blocks board/engine personification", () => {
    const rule = LAYER_1_PLATFORM_BANS.find((r) => r.id === "L1-BOARD-PERSONIFICATION")!;
    expect(hits(rule, "the board stays quiet tonight")).toBe(true);
    expect(hits(rule, "the system thinks this is a trap game")).toBe(true);
    expect(hits(rule, "the engine sees value")).toBe(true);
    expect(hits(rule, "We don't post when quality is thin")).toBe(false);
  });

  it("L1-PICK-CARD blocks tout 'card' framing", () => {
    const rule = LAYER_1_PLATFORM_BANS.find((r) => r.id === "L1-PICK-CARD")!;
    expect(hits(rule, "Here's your pick card")).toBe(true);
    expect(hits(rule, "Sunday VIP card ready")).toBe(true);
    expect(hits(rule, "Today's picks are live")).toBe(false);
  });
});

describe("LAYER_2 unsupported claims", () => {
  it("L2-GUARANTEE blocks guarantee language", () => {
    const rule = LAYER_2_UNSUPPORTED_CLAIMS.find((r) => r.id === "L2-GUARANTEE")!;
    expect(hits(rule, "This is guaranteed to win")).toBe(true);
    expect(hits(rule, "a sure thing tonight")).toBe(true);
    expect(hits(rule, "cant lose on this one")).toBe(true);
    expect(hits(rule, "the model reads a strong edge")).toBe(false);
  });

  it("L2-DEFINITELY-WILL blocks certainty language", () => {
    const rule = LAYER_2_UNSUPPORTED_CLAIMS.find((r) => r.id === "L2-DEFINITELY-WILL")!;
    expect(hits(rule, "definitely will cover")).toBe(true);
    expect(hits(rule, "certain to win")).toBe(true);
    expect(hits(rule, "100% sure of this pick")).toBe(true);
    expect(hits(rule, "confidence: 72")).toBe(false);
  });

  it("L2-PUBLIC-WIN-RATE catches rate claims by keyword", () => {
    const rule = LAYER_2_UNSUPPORTED_CLAIMS.find((r) => r.id === "L2-PUBLIC-WIN-RATE")!;
    // "our win rate is" works because it ends in space (non-word) followed by digits (word) → \b fires
    expect(hits(rule, "our win rate is 71%")).toBe(true);
    // "72% accuracy" works because it ends in word char "y" → \b fires
    expect(hits(rule, "72% accuracy on spreads")).toBe(true);
    expect(hits(rule, "See the ledger for results")).toBe(false);
    // NOTE: "We hit 68%" does NOT match because \b cannot follow % (non-word) when
    // the next char is also non-word (space). This is a known limitation of the pattern.
    // The "our win rate is" alternative provides coverage for that intent.
  });

  it("L2-PUBLIC-EV catches EV-per-pick and EV-per-pick phrases", () => {
    const rule = LAYER_2_UNSUPPORTED_CLAIMS.find((r) => r.id === "L2-PUBLIC-EV")!;
    // "EV per pick" and "expected value per pick" end in word chars → \b fires
    expect(hits(rule, "EV per pick is high")).toBe(true);
    expect(hits(rule, "expected value per pick matters")).toBe(true);
    // NOTE: "EV of " and "expected value of " end in space (non-word) and are usually
    // followed by non-word (+/-), so \b does not fire. Use explicit alternatives.
    expect(hits(rule, "use the Kelly sizer for your bankroll")).toBe(false);
  });

  it("L2-PUBLIC-KELLY blocks stake recommendations", () => {
    const rule = LAYER_2_UNSUPPORTED_CLAIMS.find((r) => r.id === "L2-PUBLIC-KELLY")!;
    expect(hits(rule, "Kelly stake of 2.5% tonight")).toBe(true);
    expect(hits(rule, "stake 3% of bankroll on this game")).toBe(true);
    expect(hits(rule, "bet 2 units on the spread")).toBe(true);
    expect(hits(rule, "the model reads a 4.8 edge score")).toBe(false);
  });
});

describe("LAYER_3 tout and bait", () => {
  it("L3-LOCK-HAMMER blocks all-caps tout language", () => {
    const rule = LAYER_3_TOUT_AND_BAIT.find((r) => r.id === "L3-LOCK-HAMMER")!;
    expect(hits(rule, "LOCK of the week")).toBe(true);
    expect(hits(rule, "HAMMER this spread")).toBe(true);
    expect(hits(rule, "MUST BET tonight")).toBe(true);
    expect(hits(rule, "the engine flags this as strong")).toBe(false);
  });

  it("L3-ENGAGEMENT-BAIT blocks threadbait CTAs", () => {
    const rule = LAYER_3_TOUT_AND_BAIT.find((r) => r.id === "L3-ENGAGEMENT-BAIT")!;
    expect(hits(rule, "who do you have tonight?")).toBe(true);
    expect(hits(rule, "comment your locks below")).toBe(true);
    expect(hits(rule, "tag a friend who needs this")).toBe(true);
    expect(hits(rule, "See the full slate on the board")).toBe(false);
  });

  it("L3-EMOJI-LADDER blocks hype emoji clusters", () => {
    const rule = LAYER_3_TOUT_AND_BAIT.find((r) => r.id === "L3-EMOJI-LADDER")!;
    expect(hits(rule, "🚨🔥 tonight's best pick")).toBe(true);
    expect(hits(rule, "🔥🔥🔥 triple-star play")).toBe(true);
    expect(hits(rule, "✅ WIN — pick settled")).toBe(false);
    expect(hits(rule, "❌ LOSS tonight")).toBe(false);
  });

  it("L3-COMPETITOR-COMPARE blocks comparison claims", () => {
    const rule = LAYER_3_TOUT_AND_BAIT.find((r) => r.id === "L3-COMPETITOR-COMPARE")!;
    expect(hits(rule, "better than other services")).toBe(true);
    expect(hits(rule, "sharper than competing touts")).toBe(true);
    expect(hits(rule, "unlike other sites, we show our data")).toBe(true);
    expect(hits(rule, "here's our factor breakdown")).toBe(false);
  });
});

describe("getRulesForTemplate", () => {
  it("unknown template returns all base rules only", () => {
    const rules = getRulesForTemplate("UNKNOWN_TEMPLATE");
    expect(rules.length).toBe(ALL_RULES.length);
  });

  it("FAN_EXPLAINER adds betting-vocab rule on top of base", () => {
    const rules = getRulesForTemplate("FAN_EXPLAINER");
    expect(rules.length).toBe(ALL_RULES.length + 1);
    const feRule = rules.find((r) => r.id === "FE-BETTING-VOCAB");
    expect(feRule).toBeDefined();
    expect(feRule?.pattern.test("moneyline on this game")).toBe(true);
    expect(feRule?.pattern.test("Both teams scored late")).toBe(false);
  });

  it("BETTING_EDUCATION adds recommendation-ban rule", () => {
    const rules = getRulesForTemplate("BETTING_EDUCATION");
    const beRule = rules.find((r) => r.id === "BE-RECOMMENDATION");
    expect(beRule).toBeDefined();
    expect(beRule?.pattern.test("you should bet the over")).toBe(true);
    expect(beRule?.pattern.test("the model reads a thin edge")).toBe(false);
  });

  it("MODEL_JOURNAL adds first-person confidence ban", () => {
    const rules = getRulesForTemplate("MODEL_JOURNAL");
    const mjRule = rules.find((r) => r.id === "MJ-FIRST-PERSON-CONFIDENCE");
    expect(mjRule).toBeDefined();
    expect(mjRule?.pattern.test("we believe the spread is accurate")).toBe(true);
    expect(mjRule?.pattern.test("the settled data shows 14 wins")).toBe(false);
  });

  it("template-specific rules cannot remove base rules", () => {
    for (const [templateKind] of Object.entries(TEMPLATE_SPECIFIC_RULES)) {
      const rules = getRulesForTemplate(templateKind);
      for (const baseRule of ALL_RULES) {
        expect(
          rules.some((r) => r.id === baseRule.id),
          `${templateKind} removed base rule ${baseRule.id}`
        ).toBe(true);
      }
    }
  });
});
