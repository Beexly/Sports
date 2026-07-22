import { describe, it, expect, vi } from "vitest";

// `@/lib/auth/actor` (the TrustedActor constructors) imports the NextAuth
// module for session resolution; mock it so importing serviceActor stays pure.
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
import {
  resolveEnvClass,
  resolveCostMode,
  effectiveMode,
  isRecognizedCostMode,
  LEGACY_COST_MODE_ALIASES,
  type AiEnvClass,
  type CostMode,
} from "@/lib/ai-control-plane/cost-mode";
import {
  ConfigurationError,
  Unauthenticated,
  Forbidden,
  InvalidInput,
  PolicyBlocked,
  BudgetBlocked,
  ProviderUnavailable,
  ProviderRejected,
  AmbiguousCharge,
  TelemetryDegraded,
  StoreUnavailable,
  isAiControlPlaneError,
  type AiErrorCode,
} from "@/lib/ai-control-plane/errors";
import { executeAiTask } from "@/lib/ai-control-plane";
import { serviceActor } from "@/lib/auth/actor";

/**
 * Phase 2 PR-A — fail-closed cost-mode resolver + contracts + typed errors.
 *
 * Deterministic clock everywhere: `now` is always injected, never Date.now().
 */
const NOW = new Date("2026-07-22T12:00:00.000Z");
const FUTURE = "2026-07-23T12:00:00.000Z"; // +24h
const PAST = "2026-07-21T12:00:00.000Z"; // -24h

const ENV_CLASSES: readonly AiEnvClass[] = [
  "production",
  "preview",
  "development",
  "test",
];

const CANONICAL: readonly CostMode[] = [
  "NO_BILLABLE_EXTERNAL",
  "CONFIRMED_CREDITS_ONLY",
  "BUDGETED_CASH",
  // EMERGENCY_RELIABILITY handled separately (needs until+reason).
];

describe("resolveEnvClass", () => {
  it("explicit valid AI_ENV_CLASS wins with source 'explicit'", () => {
    for (const ec of ENV_CLASSES) {
      expect(resolveEnvClass({ AI_ENV_CLASS: ec })).toEqual({
        envClass: ec,
        source: "explicit",
      });
    }
  });

  it("explicit wins even when derivation signals disagree", () => {
    expect(
      resolveEnvClass({
        AI_ENV_CLASS: "development",
        VERCEL_ENV: "production",
        NODE_ENV: "test",
      }),
    ).toEqual({ envClass: "development", source: "explicit" });
  });

  it("invalid explicit AI_ENV_CLASS fails closed (ConfigurationError)", () => {
    expect(() => resolveEnvClass({ AI_ENV_CLASS: "prod" })).toThrow(
      ConfigurationError,
    );
    expect(() => resolveEnvClass({ AI_ENV_CLASS: "staging" })).toThrow(
      ConfigurationError,
    );
  });

  it("derives production from VERCEL_ENV=production", () => {
    expect(resolveEnvClass({ VERCEL_ENV: "production" })).toEqual({
      envClass: "production",
      source: "derived",
    });
  });

  it("derives test from NODE_ENV=test", () => {
    expect(resolveEnvClass({ NODE_ENV: "test" })).toEqual({
      envClass: "test",
      source: "derived",
    });
  });

  it("derives development otherwise", () => {
    expect(resolveEnvClass({})).toEqual({
      envClass: "development",
      source: "derived",
    });
    expect(resolveEnvClass({ NODE_ENV: "production", VERCEL_ENV: "preview" })).toEqual(
      { envClass: "development", source: "derived" },
    );
  });

  it("VERCEL_ENV=production takes precedence over NODE_ENV=test in derivation", () => {
    expect(
      resolveEnvClass({ VERCEL_ENV: "production", NODE_ENV: "test" }),
    ).toEqual({ envClass: "production", source: "derived" });
  });

  it("treats empty/whitespace AI_ENV_CLASS as unset (derives)", () => {
    expect(resolveEnvClass({ AI_ENV_CLASS: "   " })).toEqual({
      envClass: "development",
      source: "derived",
    });
  });
});

describe("resolveCostMode — unset mode matrix", () => {
  it("production + unset → ConfigurationError (deploy-failing)", () => {
    expect(() => resolveCostMode({ envClass: "production", now: NOW })).toThrow(
      ConfigurationError,
    );
    expect(() =>
      resolveCostMode({ envClass: "production", rawMode: "", now: NOW }),
    ).toThrow(ConfigurationError);
    expect(() =>
      resolveCostMode({ envClass: "production", rawMode: "   ", now: NOW }),
    ).toThrow(ConfigurationError);
  });

  it("preview/development/test + unset → NO_BILLABLE_EXTERNAL", () => {
    for (const ec of ["preview", "development", "test"] as const) {
      expect(resolveCostMode({ envClass: ec, now: NOW })).toBe(
        "NO_BILLABLE_EXTERNAL",
      );
      expect(resolveCostMode({ envClass: ec, rawMode: "", now: NOW })).toBe(
        "NO_BILLABLE_EXTERNAL",
      );
    }
  });
});

describe("resolveCostMode — invalid mode is ConfigurationError in every env", () => {
  for (const ec of ENV_CLASSES) {
    it(`${ec} + invalid → ConfigurationError`, () => {
      expect(() =>
        resolveCostMode({ envClass: ec, rawMode: "totally-bogus", now: NOW }),
      ).toThrow(ConfigurationError);
      expect(() =>
        resolveCostMode({ envClass: ec, rawMode: "FREE", now: NOW }),
      ).toThrow(ConfigurationError);
    });
  }
});

describe("resolveCostMode — canonical modes pass through in every env", () => {
  for (const ec of ENV_CLASSES) {
    for (const mode of CANONICAL) {
      it(`${ec} + ${mode} → ${mode}`, () => {
        expect(resolveCostMode({ envClass: ec, rawMode: mode, now: NOW })).toBe(
          mode,
        );
      });
    }
  }
});

describe("resolveCostMode — legacy aliases map to canonical", () => {
  const cases: ReadonlyArray<readonly [string, CostMode]> = [
    ["zero-cash", "NO_BILLABLE_EXTERNAL"],
    ["credits-only", "CONFIRMED_CREDITS_ONLY"],
    ["normal", "BUDGETED_CASH"],
  ];
  for (const [alias, canonical] of cases) {
    it(`"${alias}" → ${canonical}`, () => {
      expect(
        resolveCostMode({ envClass: "production", rawMode: alias, now: NOW }),
      ).toBe(canonical);
    });
  }

  it("alias map export matches", () => {
    expect(LEGACY_COST_MODE_ALIASES).toEqual({
      "zero-cash": "NO_BILLABLE_EXTERNAL",
      "credits-only": "CONFIRMED_CREDITS_ONLY",
      normal: "BUDGETED_CASH",
    });
  });

  it("isRecognizedCostMode covers canonical + aliases, rejects junk", () => {
    expect(isRecognizedCostMode("BUDGETED_CASH")).toBe(true);
    expect(isRecognizedCostMode("normal")).toBe(true);
    expect(isRecognizedCostMode("EMERGENCY_RELIABILITY")).toBe(true);
    expect(isRecognizedCostMode("nope")).toBe(false);
  });
});

describe("resolveCostMode — EMERGENCY_RELIABILITY", () => {
  // §8.6: env vars may only REFERENCE a durable owner-decision receipt.
  const OVERRIDE_ID = "ovr-2026-07-22-primary-outage";

  it("valid: mode + future until + reason + override-id reference → EMERGENCY_RELIABILITY", () => {
    expect(
      resolveCostMode({
        envClass: "production",
        rawMode: "EMERGENCY_RELIABILITY",
        emergencyUntil: FUTURE,
        emergencyReason: "primary provider outage",
        emergencyOverrideId: OVERRIDE_ID,
        now: NOW,
      }),
    ).toBe("EMERGENCY_RELIABILITY");
  });

  it("missing override-id reference → ConfigurationError (env cannot create authority)", () => {
    expect(() =>
      resolveCostMode({
        envClass: "production",
        rawMode: "EMERGENCY_RELIABILITY",
        emergencyUntil: FUTURE,
        emergencyReason: "outage",
        now: NOW,
      }),
    ).toThrow(ConfigurationError);
    expect(() =>
      resolveCostMode({
        envClass: "production",
        rawMode: "EMERGENCY_RELIABILITY",
        emergencyUntil: FUTURE,
        emergencyReason: "outage",
        emergencyOverrideId: "   ",
        now: NOW,
      }),
    ).toThrow(/EMERGENCY_OVERRIDE_ID/);
  });

  it("expired until → ConfigurationError", () => {
    expect(() =>
      resolveCostMode({
        envClass: "production",
        rawMode: "EMERGENCY_RELIABILITY",
        emergencyUntil: PAST,
        emergencyReason: "outage",
        emergencyOverrideId: OVERRIDE_ID,
        now: NOW,
      }),
    ).toThrow(ConfigurationError);
  });

  it("until exactly == now → expired (ConfigurationError)", () => {
    expect(() =>
      resolveCostMode({
        envClass: "production",
        rawMode: "EMERGENCY_RELIABILITY",
        emergencyUntil: NOW.toISOString(),
        emergencyReason: "outage",
        emergencyOverrideId: OVERRIDE_ID,
        now: NOW,
      }),
    ).toThrow(ConfigurationError);
  });

  it("missing reason → ConfigurationError", () => {
    expect(() =>
      resolveCostMode({
        envClass: "production",
        rawMode: "EMERGENCY_RELIABILITY",
        emergencyUntil: FUTURE,
        now: NOW,
      }),
    ).toThrow(ConfigurationError);
    expect(() =>
      resolveCostMode({
        envClass: "production",
        rawMode: "EMERGENCY_RELIABILITY",
        emergencyUntil: FUTURE,
        emergencyReason: "   ",
        now: NOW,
      }),
    ).toThrow(ConfigurationError);
  });

  it("missing until → ConfigurationError", () => {
    expect(() =>
      resolveCostMode({
        envClass: "production",
        rawMode: "EMERGENCY_RELIABILITY",
        emergencyReason: "outage",
        emergencyOverrideId: OVERRIDE_ID,
        now: NOW,
      }),
    ).toThrow(ConfigurationError);
  });

  it("unparseable until → ConfigurationError", () => {
    expect(() =>
      resolveCostMode({
        envClass: "production",
        rawMode: "EMERGENCY_RELIABILITY",
        emergencyUntil: "not-a-date",
        emergencyReason: "outage",
        emergencyOverrideId: OVERRIDE_ID,
        now: NOW,
      }),
    ).toThrow(ConfigurationError);
  });

  it("cannot be reached via any legacy alias (no alias exists)", () => {
    expect(isRecognizedCostMode("emergency")).toBe(false);
    expect(isRecognizedCostMode("emergency-reliability")).toBe(false);
  });
});

describe("effectiveMode — task restricts below env (ok), never escalates above", () => {
  it("task restricts below env → the lower task mode", () => {
    expect(effectiveMode("BUDGETED_CASH", ["NO_BILLABLE_EXTERNAL"])).toBe(
      "NO_BILLABLE_EXTERNAL",
    );
    expect(effectiveMode("BUDGETED_CASH", ["CONFIRMED_CREDITS_ONLY"])).toBe(
      "CONFIRMED_CREDITS_ONLY",
    );
  });

  it("task equals env → env mode", () => {
    expect(effectiveMode("CONFIRMED_CREDITS_ONLY", ["CONFIRMED_CREDITS_ONLY"])).toBe(
      "CONFIRMED_CREDITS_ONLY",
    );
  });

  it("picks the highest task mode that does not exceed env", () => {
    expect(
      effectiveMode("BUDGETED_CASH", [
        "NO_BILLABLE_EXTERNAL",
        "CONFIRMED_CREDITS_ONLY",
      ]),
    ).toBe("CONFIRMED_CREDITS_ONLY");
    expect(
      effectiveMode("CONFIRMED_CREDITS_ONLY", [
        "NO_BILLABLE_EXTERNAL",
        "CONFIRMED_CREDITS_ONLY",
        "BUDGETED_CASH",
      ]),
    ).toBe("CONFIRMED_CREDITS_ONLY");
  });

  it("task tries to escalate above env → ConfigurationError (blocked)", () => {
    expect(() =>
      effectiveMode("NO_BILLABLE_EXTERNAL", ["BUDGETED_CASH"]),
    ).toThrow(ConfigurationError);
    expect(() =>
      effectiveMode("CONFIRMED_CREDITS_ONLY", ["BUDGETED_CASH"]),
    ).toThrow(ConfigurationError);
  });

  it("mixed permitted where only some exceed env → clamps to admissible max", () => {
    expect(
      effectiveMode("CONFIRMED_CREDITS_ONLY", [
        "NO_BILLABLE_EXTERNAL",
        "BUDGETED_CASH",
      ]),
    ).toBe("NO_BILLABLE_EXTERNAL");
  });

  it("empty permittedModes → ConfigurationError", () => {
    expect(() => effectiveMode("BUDGETED_CASH", [])).toThrow(ConfigurationError);
  });
});

describe("effectiveMode — EMERGENCY_RELIABILITY ordering", () => {
  it("emergency env + task permits emergency → EMERGENCY_RELIABILITY", () => {
    expect(
      effectiveMode("EMERGENCY_RELIABILITY", ["EMERGENCY_RELIABILITY"]),
    ).toBe("EMERGENCY_RELIABILITY");
    expect(
      effectiveMode("EMERGENCY_RELIABILITY", [
        "BUDGETED_CASH",
        "EMERGENCY_RELIABILITY",
      ]),
    ).toBe("EMERGENCY_RELIABILITY");
  });

  it("emergency env + task opted out → highest ordered task mode", () => {
    expect(
      effectiveMode("EMERGENCY_RELIABILITY", [
        "NO_BILLABLE_EXTERNAL",
        "CONFIRMED_CREDITS_ONLY",
      ]),
    ).toBe("CONFIRMED_CREDITS_ONLY");
    expect(
      effectiveMode("EMERGENCY_RELIABILITY", ["NO_BILLABLE_EXTERNAL"]),
    ).toBe("NO_BILLABLE_EXTERNAL");
  });

  it("task may not self-escalate into emergency when env is not emergency", () => {
    expect(() =>
      effectiveMode("BUDGETED_CASH", ["EMERGENCY_RELIABILITY"]),
    ).toThrow(ConfigurationError);
    expect(() =>
      effectiveMode("NO_BILLABLE_EXTERNAL", [
        "NO_BILLABLE_EXTERNAL",
        "EMERGENCY_RELIABILITY",
      ]),
    ).toThrow(ConfigurationError);
  });
});

describe("typed errors — code + retriable flags", () => {
  const expectations: ReadonlyArray<{
    readonly instance: { code: AiErrorCode; retriable: boolean; name: string };
    readonly code: AiErrorCode;
    readonly retriable: boolean;
  }> = [
    { instance: new Unauthenticated("x"), code: "UNAUTHENTICATED", retriable: false },
    { instance: new Forbidden("x"), code: "FORBIDDEN", retriable: false },
    { instance: new InvalidInput("x"), code: "INVALID_INPUT", retriable: false },
    { instance: new ConfigurationError("x"), code: "CONFIGURATION_ERROR", retriable: false },
    { instance: new PolicyBlocked("x"), code: "POLICY_BLOCKED", retriable: false },
    { instance: new BudgetBlocked("x"), code: "BUDGET_BLOCKED", retriable: false },
    { instance: new ProviderUnavailable("x"), code: "PROVIDER_UNAVAILABLE", retriable: true },
    { instance: new ProviderRejected("x"), code: "PROVIDER_REJECTED", retriable: false },
    { instance: new AmbiguousCharge("x"), code: "AMBIGUOUS_CHARGE", retriable: false },
    { instance: new TelemetryDegraded("x"), code: "TELEMETRY_DEGRADED", retriable: true },
    { instance: new StoreUnavailable("x"), code: "STORE_UNAVAILABLE", retriable: true },
  ];

  for (const { instance, code, retriable } of expectations) {
    it(`${instance.name}: code=${code}, retriable=${retriable}`, () => {
      expect(instance.code).toBe(code);
      expect(instance.retriable).toBe(retriable);
      expect(isAiControlPlaneError(instance)).toBe(true);
      expect(instance).toBeInstanceOf(Error);
      // Name reflects the concrete subclass for logs.
      expect(instance.name).toBe(instance.constructor.name);
    });
  }

  it("the never-retry-with-same-funds invariant holds", () => {
    expect(new AmbiguousCharge("x").retriable).toBe(false);
    expect(new ProviderRejected("x").retriable).toBe(false);
    expect(new PolicyBlocked("x").retriable).toBe(false);
    expect(new BudgetBlocked("x").retriable).toBe(false);
  });

  it("isAiControlPlaneError rejects plain errors", () => {
    expect(isAiControlPlaneError(new Error("plain"))).toBe(false);
    expect(isAiControlPlaneError("nope")).toBe(false);
    expect(isAiControlPlaneError(null)).toBe(false);
  });

  it("preserves cause when provided", () => {
    const cause = new Error("root");
    const err = new ConfigurationError("wrap", { cause });
    expect((err as { cause?: unknown }).cause).toBe(cause);
  });
});

describe("executeAiTask — sealed production entry point fails closed pre-transport", () => {
  it("a fully valid request still fails closed before any provider call", async () => {
    // The public entry point takes NO dependency parameters (§8.2). In this
    // test env the sealed singleton resolves envClass=test → mode
    // NO_BILLABLE_EXTERNAL, under which the policy has no fundable ("local")
    // route — the executor refuses to dispatch (PolicyBlocked) BEFORE the
    // sealed dispatch seam (which itself throws until the stacked
    // invocation/attempt PR wires transport). No billable call can possibly
    // occur through this surface today.
    const actor = serviceActor({ subjectId: "service:test-harness" });
    await expect(
      executeAiTask({
        taskClass: "brief.daily-summary",
        requestId: "req-cost-mode-seal-check-001",
        actor,
        entity: "GSE",
        input: { date: "2026-07-22" },
      }),
    ).rejects.toThrow(/no fundable provider route/);
  });
});
