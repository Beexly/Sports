import { describe, expect, it } from "vitest";
import {
  creditScopeCovers,
  evaluateCreditSnapshotAdmissibility,
  isCreditGrantSnapshotExpired,
  isCreditGrantSnapshotFresh,
  validateCreditGrantSnapshot,
  type CreditGrantSnapshot,
  type CreditScopeRequest,
  type CreditSnapshotViolation,
} from "@/lib/opportunity-engine";

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

/** Deterministic fixture — all times are fixed ISO strings, never Date.now. */
const VALID_SNAPSHOT: CreditGrantSnapshot = {
  programId: "gcp-startup-credits",
  applicationId: "app-2026-0042",
  grantId: "grant-2026-0042",
  provider: "google_cloud",
  billingAccountId: "billing-acct-01",
  billingProjectId: "proj-nova",
  currency: "USD",
  originalAwardMinorUnits: 25_000_000,
  remainingMinorUnits: 18_000_000,
  reservedMinorUnits: 3_000_000,
  grantState: "partially_consumed",
  activatedAt: "2026-01-15T00:00:00.000Z",
  expiresAt: "2027-01-15T00:00:00.000Z",
  eligibleProducts: ["vertex-ai", "compute-engine"],
  eligibleModels: ["*"],
  eligibleRegions: ["us-central1", "us-east1"],
  exclusions: ["marketplace-third-party"],
  cashOverageBehavior: "converts_to_paid_usage",
  observedAt: "2026-07-21T10:00:00.000Z",
  recordedAt: "2026-07-21T10:00:05.000Z",
  freshnessHorizonMs: SIX_HOURS_MS,
  sourceReceiptId: "receipt-8842",
  sourceReceiptHash: "sha256:2f1a9c",
  reconciliationState: "reconciled",
  attestedBy: "nova-reconciler@2026-07",
  schemaVersion: "credit-grant-snapshot@1",
  policyVersion: "credit-policy@1",
};

/** Two hours after `observedAt` — inside the six-hour freshness horizon. */
const EVAL_AT = "2026-07-21T12:00:00.000Z";

const COVERED_REQUEST: CreditScopeRequest = {
  product: "vertex-ai",
  model: "gemini-3-pro",
  region: "us-central1",
};

function snap(overrides: Partial<CreditGrantSnapshot>): CreditGrantSnapshot {
  return { ...VALID_SNAPSHOT, ...overrides };
}

describe("validateCreditGrantSnapshot (directive §11.2 invariants)", () => {
  it("accepts the fully-populated receipted snapshot", () => {
    expect(validateCreditGrantSnapshot(VALID_SNAPSHOT)).toEqual({ valid: true, violations: [] });
  });

  it("no receipt, no snapshot — a blank receipt id or hash invalidates", () => {
    for (const overrides of [
      { sourceReceiptId: "" },
      { sourceReceiptId: "   " },
      { sourceReceiptHash: "" },
      { sourceReceiptId: "", sourceReceiptHash: "" },
    ]) {
      const result = validateCreditGrantSnapshot(snap(overrides));
      expect(result.valid).toBe(false);
      expect(result.violations).toEqual(["missing_source_receipt"]);
    }
  });

  it("flags each blank identity field with its own violation code", () => {
    const cases: readonly [Partial<CreditGrantSnapshot>, CreditSnapshotViolation][] = [
      [{ programId: " " }, "missing_program_id"],
      [{ applicationId: "" }, "missing_application_id"],
      [{ grantId: "" }, "missing_grant_id"],
      [{ provider: "" }, "missing_provider"],
      [{ billingAccountId: "" }, "missing_billing_account"],
      [{ attestedBy: "" }, "missing_attestor"],
      [{ schemaVersion: "" }, "missing_schema_version"],
      [{ policyVersion: "" }, "missing_policy_version"],
    ];
    for (const [overrides, code] of cases) {
      const result = validateCreditGrantSnapshot(snap(overrides));
      expect(result.valid, code).toBe(false);
      expect(result.violations, code).toEqual([code]);
    }
  });

  it("requires an uppercase ISO-4217 currency code", () => {
    for (const currency of ["usd", "US", "USDX", "", "us1"]) {
      expect(validateCreditGrantSnapshot(snap({ currency })).violations).toEqual([
        "invalid_currency",
      ]);
    }
    expect(validateCreditGrantSnapshot(snap({ currency: "EUR" })).valid).toBe(true);
  });

  it("rejects negative, fractional, and non-finite minor-unit amounts", () => {
    expect(validateCreditGrantSnapshot(snap({ originalAwardMinorUnits: -1 })).violations).toContain(
      "invalid_original_award",
    );
    expect(validateCreditGrantSnapshot(snap({ remainingMinorUnits: 10.5 })).violations).toContain(
      "invalid_remaining",
    );
    expect(
      validateCreditGrantSnapshot(snap({ reservedMinorUnits: Number.NaN })).violations,
    ).toContain("invalid_reserved");
  });

  it("enforces reserved <= remaining <= original", () => {
    expect(
      validateCreditGrantSnapshot(
        snap({ reservedMinorUnits: 18_000_001 }),
      ).violations,
    ).toEqual(["reserved_exceeds_remaining"]);
    expect(
      validateCreditGrantSnapshot(
        snap({ remainingMinorUnits: 25_000_001, reservedMinorUnits: 0 }),
      ).violations,
    ).toEqual(["remaining_exceeds_original"]);
  });

  it("an exhausted grant must show zero remaining and zero reserved", () => {
    expect(
      validateCreditGrantSnapshot(snap({ grantState: "exhausted" })).violations,
    ).toEqual(["exhausted_with_remaining"]);
    expect(
      validateCreditGrantSnapshot(
        snap({ grantState: "exhausted", remainingMinorUnits: 0, reservedMinorUnits: 0 }),
      ),
    ).toEqual({ valid: true, violations: [] });
  });

  it("a consuming grant state requires a recorded activation instant", () => {
    for (const grantState of ["activated", "partially_consumed"] as const) {
      expect(
        validateCreditGrantSnapshot(snap({ grantState, activatedAt: null })).violations,
      ).toEqual(["missing_activation_for_state"]);
    }
    // An approved (not yet activated) grant may legitimately have none.
    expect(
      validateCreditGrantSnapshot(snap({ grantState: "approved", activatedAt: null })).valid,
    ).toBe(true);
  });

  it("rejects unparsable timestamps and recording before observation", () => {
    expect(validateCreditGrantSnapshot(snap({ activatedAt: "not-a-time" })).violations).toEqual([
      "invalid_activated_at",
    ]);
    expect(validateCreditGrantSnapshot(snap({ expiresAt: "someday" })).violations).toEqual([
      "invalid_expires_at",
    ]);
    expect(validateCreditGrantSnapshot(snap({ observedAt: "bogus" })).violations).toEqual([
      "invalid_observed_at",
    ]);
    expect(validateCreditGrantSnapshot(snap({ recordedAt: "bogus" })).violations).toEqual([
      "invalid_recorded_at",
    ]);
    expect(
      validateCreditGrantSnapshot(snap({ recordedAt: "2026-07-21T09:59:59.000Z" })).violations,
    ).toEqual(["recorded_before_observed"]);
  });

  it("requires a positive integer freshness horizon", () => {
    for (const freshnessHorizonMs of [0, -1, 1.5, Number.POSITIVE_INFINITY, Number.NaN]) {
      expect(validateCreditGrantSnapshot(snap({ freshnessHorizonMs })).violations).toEqual([
        "non_positive_freshness_horizon",
      ]);
    }
  });

  it("collects multiple violations exhaustively in deterministic order", () => {
    const broken = snap({ programId: "", currency: "usd", sourceReceiptId: "" });
    const first = validateCreditGrantSnapshot(broken);
    expect(first.violations).toEqual([
      "missing_program_id",
      "invalid_currency",
      "missing_source_receipt",
    ]);
    // Determinism: identical input, identical output.
    expect(validateCreditGrantSnapshot(broken)).toEqual(first);
  });
});

describe("isCreditGrantSnapshotFresh (directive §11.2 freshness)", () => {
  it("is fresh at the observation instant and at the exact horizon boundary", () => {
    expect(isCreditGrantSnapshotFresh(VALID_SNAPSHOT, "2026-07-21T10:00:00.000Z")).toBe(true);
    expect(isCreditGrantSnapshotFresh(VALID_SNAPSHOT, "2026-07-21T16:00:00.000Z")).toBe(true);
  });

  it("goes stale one millisecond past the horizon", () => {
    expect(isCreditGrantSnapshotFresh(VALID_SNAPSHOT, "2026-07-21T16:00:00.001Z")).toBe(false);
  });

  it("fails closed on clock inconsistency and unparsable inputs", () => {
    expect(isCreditGrantSnapshotFresh(VALID_SNAPSHOT, "2026-07-21T09:59:59.999Z")).toBe(false);
    expect(isCreditGrantSnapshotFresh(snap({ observedAt: "bogus" }), EVAL_AT)).toBe(false);
    expect(isCreditGrantSnapshotFresh(VALID_SNAPSHOT, "bogus")).toBe(false);
    expect(isCreditGrantSnapshotFresh(snap({ freshnessHorizonMs: 0 }), EVAL_AT)).toBe(false);
  });
});

describe("isCreditGrantSnapshotExpired (directive §11.2 expiry)", () => {
  it("is not expired before the boundary, expired at and after it", () => {
    expect(isCreditGrantSnapshotExpired(VALID_SNAPSHOT, "2027-01-14T23:59:59.999Z")).toBe(false);
    expect(isCreditGrantSnapshotExpired(VALID_SNAPSHOT, "2027-01-15T00:00:00.000Z")).toBe(true);
    expect(isCreditGrantSnapshotExpired(VALID_SNAPSHOT, "2027-06-01T00:00:00.000Z")).toBe(true);
  });

  it("null expiry is not KNOWN-expired (admission fails closed separately)", () => {
    expect(isCreditGrantSnapshotExpired(snap({ expiresAt: null }), EVAL_AT)).toBe(false);
  });

  it("fails closed (reads expired) on unparsable inputs", () => {
    expect(isCreditGrantSnapshotExpired(snap({ expiresAt: "someday" }), EVAL_AT)).toBe(true);
    expect(isCreditGrantSnapshotExpired(VALID_SNAPSHOT, "bogus")).toBe(true);
  });
});

describe("creditScopeCovers (directive §11.2: no covering scope, no admission)", () => {
  it("covers an exactly eligible product/model/region request", () => {
    expect(creditScopeCovers(VALID_SNAPSHOT, COVERED_REQUEST)).toBe(true);
  });

  it("an empty eligibility list covers nothing — unknown scope fails closed", () => {
    expect(creditScopeCovers(snap({ eligibleProducts: [] }), COVERED_REQUEST)).toBe(false);
    expect(creditScopeCovers(snap({ eligibleModels: [] }), COVERED_REQUEST)).toBe(false);
    expect(creditScopeCovers(snap({ eligibleRegions: [] }), COVERED_REQUEST)).toBe(false);
  });

  it("a null model/region means that dimension is not part of the request", () => {
    expect(
      creditScopeCovers(snap({ eligibleModels: [], eligibleRegions: [] }), {
        product: "vertex-ai",
        model: null,
        region: null,
      }),
    ).toBe(true);
  });

  it("the explicit wildcard attests an unrestricted dimension", () => {
    expect(
      creditScopeCovers(snap({ eligibleProducts: ["*"] }), {
        product: "any-product",
        model: null,
        region: null,
      }),
    ).toBe(true);
  });

  it("an exclusion beats any wildcard on every dimension", () => {
    const excluding = snap({
      eligibleProducts: ["*"],
      eligibleModels: ["*"],
      eligibleRegions: ["*"],
      exclusions: ["banned-product", "banned-model", "banned-region"],
    });
    expect(
      creditScopeCovers(excluding, { product: "banned-product", model: null, region: null }),
    ).toBe(false);
    expect(
      creditScopeCovers(excluding, { product: "ok", model: "banned-model", region: null }),
    ).toBe(false);
    expect(
      creditScopeCovers(excluding, { product: "ok", model: "ok", region: "banned-region" }),
    ).toBe(false);
    expect(creditScopeCovers(excluding, { product: "ok", model: "ok", region: "ok" })).toBe(true);
  });

  it("rejects uncovered values, blank products, and is case-sensitive by design", () => {
    expect(
      creditScopeCovers(VALID_SNAPSHOT, { product: "bigquery", model: null, region: null }),
    ).toBe(false);
    expect(creditScopeCovers(VALID_SNAPSHOT, { product: "  ", model: null, region: null })).toBe(
      false,
    );
    expect(
      creditScopeCovers(VALID_SNAPSHOT, { product: "Vertex-AI", model: null, region: null }),
    ).toBe(false);
    expect(
      creditScopeCovers(VALID_SNAPSHOT, {
        product: "vertex-ai",
        model: "gemini-3-pro",
        region: "eu-west4",
      }),
    ).toBe(false);
  });
});

describe("evaluateCreditSnapshotAdmissibility (directive §11.2/§11.3 primitive)", () => {
  it("admits a valid, consumable, unexpired, fresh, covering, reconciled, funded snapshot", () => {
    expect(
      evaluateCreditSnapshotAdmissibility(VALID_SNAPSHOT, COVERED_REQUEST, EVAL_AT),
    ).toEqual({ admissible: true, reasons: [] });
  });

  it("an activated (not yet consumed) grant also admits", () => {
    expect(
      evaluateCreditSnapshotAdmissibility(snap({ grantState: "activated" }), COVERED_REQUEST, EVAL_AT)
        .admissible,
    ).toBe(true);
  });

  it("refuses an invalid snapshot (no receipt) with snapshot_invalid", () => {
    const result = evaluateCreditSnapshotAdmissibility(
      snap({ sourceReceiptHash: "" }),
      COVERED_REQUEST,
      EVAL_AT,
    );
    expect(result.admissible).toBe(false);
    expect(result.reasons).toEqual(["snapshot_invalid"]);
  });

  it("only activated/partially_consumed grants can admit", () => {
    for (const grantState of ["approved", "expired", "revoked"] as const) {
      const result = evaluateCreditSnapshotAdmissibility(
        snap({ grantState }),
        COVERED_REQUEST,
        EVAL_AT,
      );
      expect(result.admissible, grantState).toBe(false);
      expect(result.reasons, grantState).toContain("grant_state_not_consumable");
    }
  });

  it("unknown expiry fails closed as grant_expiry_unknown", () => {
    expect(
      evaluateCreditSnapshotAdmissibility(snap({ expiresAt: null }), COVERED_REQUEST, EVAL_AT)
        .reasons,
    ).toEqual(["grant_expiry_unknown"]);
  });

  it("an expired grant refuses even while the snapshot is still fresh", () => {
    expect(
      evaluateCreditSnapshotAdmissibility(
        snap({ expiresAt: "2026-07-21T11:00:00.000Z" }),
        COVERED_REQUEST,
        EVAL_AT,
      ).reasons,
    ).toEqual(["grant_expired"]);
  });

  it("a stale snapshot refuses even though the grant itself is unexpired", () => {
    expect(
      evaluateCreditSnapshotAdmissibility(
        VALID_SNAPSHOT,
        COVERED_REQUEST,
        "2026-07-22T12:00:00.000Z",
      ).reasons,
    ).toEqual(["snapshot_stale"]);
  });

  it("an uncovered scope refuses with scope_not_covered", () => {
    expect(
      evaluateCreditSnapshotAdmissibility(
        VALID_SNAPSHOT,
        { product: "bigquery", model: null, region: null },
        EVAL_AT,
      ).reasons,
    ).toEqual(["scope_not_covered"]);
  });

  it("drifted and failed_closed reconciliation refuse; unreconciled may bootstrap", () => {
    expect(
      evaluateCreditSnapshotAdmissibility(
        snap({ reconciliationState: "drifted" }),
        COVERED_REQUEST,
        EVAL_AT,
      ).reasons,
    ).toEqual(["reconciliation_drifted"]);
    expect(
      evaluateCreditSnapshotAdmissibility(
        snap({ reconciliationState: "failed_closed" }),
        COVERED_REQUEST,
        EVAL_AT,
      ).reasons,
    ).toEqual(["reconciliation_failed_closed"]);
    expect(
      evaluateCreditSnapshotAdmissibility(
        snap({ reconciliationState: "unreconciled" }),
        COVERED_REQUEST,
        EVAL_AT,
      ).admissible,
    ).toBe(true);
  });

  it("a fully reserved balance refuses with no_spendable_balance", () => {
    expect(
      evaluateCreditSnapshotAdmissibility(
        snap({ remainingMinorUnits: 3_000_000, reservedMinorUnits: 3_000_000 }),
        COVERED_REQUEST,
        EVAL_AT,
      ).reasons,
    ).toEqual(["no_spendable_balance"]);
  });

  it("accumulates every refusal reason in deterministic check order", () => {
    const wreck = snap({
      sourceReceiptId: "",
      grantState: "approved",
      expiresAt: null,
      reconciliationState: "drifted",
      remainingMinorUnits: 1_000_000,
      reservedMinorUnits: 1_000_000,
    });
    const result = evaluateCreditSnapshotAdmissibility(
      wreck,
      { product: "bigquery", model: null, region: null },
      "2026-07-22T12:00:00.000Z",
    );
    expect(result.admissible).toBe(false);
    expect(result.reasons).toEqual([
      "snapshot_invalid",
      "grant_state_not_consumable",
      "grant_expiry_unknown",
      "snapshot_stale",
      "scope_not_covered",
      "reconciliation_drifted",
      "no_spendable_balance",
    ]);
    // Determinism: identical inputs, identical decision.
    expect(
      evaluateCreditSnapshotAdmissibility(
        wreck,
        { product: "bigquery", model: null, region: null },
        "2026-07-22T12:00:00.000Z",
      ),
    ).toEqual(result);
  });
});
