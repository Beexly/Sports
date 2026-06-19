import { describe, it, expect } from "vitest";
import {
  GOVERNED_SERVICES,
  resolveService,
  evaluateSpendGovernor,
  metProofSignals,
  evaluateUpgrade,
  SPEND_BANDS,
  PROOF_SIGNALS,
  isEnvPresent,
  isEnvTrue,
  type Env,
  type GovernedService,
} from "@/lib/spend/spend-governor";

const EMPTY: Env = {};

function byId(id: string): GovernedService {
  const s = GOVERNED_SERVICES.find((x) => x.id === id);
  if (!s) throw new Error(`missing service ${id}`);
  return s;
}

describe("spend-governor — env presence helpers", () => {
  it("isEnvPresent is true only for non-empty values", () => {
    expect(isEnvPresent("X", { X: "abc" })).toBe(true);
    expect(isEnvPresent("X", { X: "  " })).toBe(false);
    expect(isEnvPresent("X", {})).toBe(false);
  });

  it("isEnvTrue is true only for the literal 'true'", () => {
    expect(isEnvTrue("X", { X: "true" })).toBe(true);
    expect(isEnvTrue("X", { X: "TRUE" })).toBe(true);
    expect(isEnvTrue("X", { X: "1" })).toBe(false);
    expect(isEnvTrue("X", {})).toBe(false);
  });
});

describe("spend-governor — default (empty env) is zero-spend", () => {
  it("no service spends real money with an empty env", () => {
    const report = evaluateSpendGovernor(EMPTY);
    expect(report.zeroSpend).toBe(true);
    expect(report.spendingServices).toEqual([]);
  });

  it("the free keyless pools are FREE_ONLY and active by default", () => {
    for (const id of ["llm_free_pool", "image_free_pool", "voice_browser"]) {
      const st = resolveService(byId(id), EMPTY);
      expect(st.mode).toBe("FREE_ONLY");
      expect(st.active).toBe(true);
      expect(st.spends).toBe(false);
    }
  });

  it("owner-paid services sit OWNER_APPROVAL_REQUIRED until flagged", () => {
    for (const id of ["llm_anthropic", "image_higgsfield", "email_provider", "payments_stripe"]) {
      expect(resolveService(byId(id), EMPTY).mode).toBe("OWNER_APPROVAL_REQUIRED");
    }
  });

  it("paid data + paid ads are DISABLED by default (hard gate)", () => {
    expect(resolveService(byId("sports_data_paid"), EMPTY).mode).toBe("DISABLED");
    expect(resolveService(byId("ads_paid"), EMPTY).mode).toBe("DISABLED");
  });

  it("never returns an env value — only flag names that are present", () => {
    const st = resolveService(byId("payments_stripe"), { STRIPE_SECRET_KEY: "sk_live_SECRET" });
    expect(st.enabledFlagsPresent).toEqual(["STRIPE_SECRET_KEY"]);
    expect(JSON.stringify(st)).not.toContain("sk_live_SECRET");
  });
});

describe("spend-governor — authorized paths", () => {
  it("Anthropic flips to PAID_ENABLED when its key is present", () => {
    const st = resolveService(byId("llm_anthropic"), { ANTHROPIC_API_KEY: "sk-ant-x" });
    expect(st.mode).toBe("PAID_ENABLED");
    expect(st.spends).toBe(true);
    expect(evaluateSpendGovernor({ ANTHROPIC_API_KEY: "sk-ant-x" }).zeroSpend).toBe(false);
  });

  it("Higgsfield requires BOTH flags before PAID_ENABLED", () => {
    expect(resolveService(byId("image_higgsfield"), { HIGGSFIELD_GENERATION_ENABLED: "true" }).mode).toBe(
      "OWNER_APPROVAL_REQUIRED",
    );
    const both = resolveService(byId("image_higgsfield"), {
      HIGGSFIELD_GENERATION_ENABLED: "true",
      OWNER_VISUAL_SPEND_APPROVED: "true",
    });
    expect(both.mode).toBe("PAID_ENABLED");
  });

  it("Stripe flips to PAID_ENABLED with its secret (revenue-coupled spend)", () => {
    expect(resolveService(byId("payments_stripe"), { STRIPE_SECRET_KEY: "sk_test_x" }).mode).toBe(
      "PAID_ENABLED",
    );
  });

  it("a free_quota service (Odds API) stays FREE_ONLY even when its key is present", () => {
    const st = resolveService(byId("sports_odds_api"), { THE_ODDS_API_KEY: "present" });
    expect(st.mode).toBe("FREE_ONLY");
    expect(st.spends).toBe(false);
  });

  it("a cap flag forces CAP_REACHED and blocks the service", () => {
    const st = resolveService(byId("sports_odds_api"), {
      THE_ODDS_API_KEY: "present",
      ODDS_API_CAP_REACHED: "true",
    });
    expect(st.mode).toBe("CAP_REACHED");
    expect(st.active).toBe(false);
  });

  it("email provider authorizes its free tier (FREE_ONLY) when a key is set", () => {
    expect(resolveService(byId("email_provider"), { RESEND_API_KEY: "re_x" }).mode).toBe("FREE_ONLY");
  });
});

describe("spend-governor — upgrade gates", () => {
  it("the band ladder is ordered and zero-spend is the floor", () => {
    expect(SPEND_BANDS[0]?.band).toBe("ZERO");
    expect(SPEND_BANDS[0]?.monthlyCeilingUsd).toBe(0);
  });

  it("metProofSignals only counts signals at/above threshold", () => {
    expect(metProofSignals({ paid_members_10: 9 })).toEqual([]);
    expect(metProofSignals({ paid_members_10: 10 })).toEqual(["paid_members_10"]);
    expect(metProofSignals({ emails_100: 250, revenue_100: 100 })).toEqual(
      expect.arrayContaining(["emails_100", "revenue_100"]),
    );
  });

  it("ZERO band is always allowed", () => {
    expect(evaluateUpgrade("ZERO", {}).allowed).toBe(true);
  });

  it("ESSENTIAL band needs owner approval", () => {
    expect(evaluateUpgrade("ESSENTIAL_0_25", {}).allowed).toBe(false);
    expect(evaluateUpgrade("ESSENTIAL_0_25", { owner_approval: 1 }).allowed).toBe(true);
  });

  it("PROVEN band unlocks on ANY proof signal", () => {
    expect(evaluateUpgrade("PROVEN_25_100", {}).allowed).toBe(false);
    expect(evaluateUpgrade("PROVEN_25_100", { emails_100: 100 }).allowed).toBe(true);
    expect(evaluateUpgrade("PROVEN_25_100", { ask_galaxy_25: 25 }).allowed).toBe(true);
  });

  it("FUNDED band needs revenue, sponsor, or owner approval — not just emails", () => {
    expect(evaluateUpgrade("FUNDED_100_PLUS", { emails_100: 1000 }).allowed).toBe(false);
    expect(evaluateUpgrade("FUNDED_100_PLUS", { revenue_100: 100 }).allowed).toBe(true);
    expect(evaluateUpgrade("FUNDED_100_PLUS", { sponsor_signed: 1 }).allowed).toBe(true);
  });

  it("every proof signal has a positive threshold", () => {
    for (const s of PROOF_SIGNALS) expect(s.threshold).toBeGreaterThan(0);
  });
});

describe("spend-governor — registry integrity", () => {
  it("service ids are unique", () => {
    const ids = GOVERNED_SERVICES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every service carries a gate reference and human copy", () => {
    for (const s of GOVERNED_SERVICES) {
      expect(s.gateRef.length).toBeGreaterThan(0);
      expect(s.unlocks.length).toBeGreaterThan(0);
      expect(s.freePathBlocks.length).toBeGreaterThan(0);
    }
  });
});
