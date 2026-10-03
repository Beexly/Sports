/**
 * Deploy-time Stripe price gate — regression pins.
 *
 * THE BUG THIS LOCKS SHUT
 * -----------------------
 * `docs/ops/GO_LIVE_RUNBOOK.md` Phase 5 told the operator to create Stripe
 * products at **Pro $19/mo** and **Elite $49/mo**. Those figures have never
 * been the advertised prices — the FOUNDING phase in
 * `apps/web/lib/pricing/pricing-phases.ts` sells Pro at $14.99/mo and Elite at
 * $24.99/mo. `apps/web/lib/stripe.ts` fails CLOSED on that disagreement
 * (GSE-SEC-024): it returns an empty price id and the checkout route 503s. So
 * following the runbook produced a silent, total revenue outage at launch.
 *
 * The readiness script was supposed to catch it and did not — it fetched the
 * price and printed `$19.00/month` as a GREEN line, and skipped the FANTASY
 * pair entirely. These tests pin the fixed behaviour: a mismatched
 * `unit_amount` FAILS, a matching one passes, and all six env vars are covered.
 *
 * The predicate under test is the same .mjs lib the ops script imports, so
 * what is asserted here is literally what the operator runs.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { resolve } from "node:path";
import { readFileSync } from "node:fs";
import {
  STRIPE_PRICE_ENV_MATRIX,
  ADVERTISED_CURRENCY,
  loadPriceIdHelpers,
  evaluateStripePrice,
  intervalMatchesAd,
  currencyMatchesAd,
  formatCents,
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore — plain .mjs ops lib, imported by relative path from the repo root.
} from "../../../scripts/lib/stripe-price-check.mjs";

const REPO_ROOT = resolve(__dirname, "../../..");

type PaidTier = "FANTASY" | "PRO" | "ELITE";
type Interval = "month" | "year";
type StripePriceLike = {
  unit_amount: number | null;
  recurring?: { interval?: string | null } | null;
};

/** The subset of price-ids.ts the deploy gate depends on. */
type PriceIdHelpers = {
  advertisedPhaseUnitAmountCents(tier: PaidTier, interval: Interval): number;
  stripePriceAmountMatchesAd(price: StripePriceLike, tier: PaidTier, interval: Interval): boolean;
  splitPriceIds(raw: string | undefined): string[];
  /** Added by PR #612; optional until that lands on main. */
  stripePriceIntervalMatchesAd?: (price: StripePriceLike, interval: Interval) => boolean;
};

// The real helpers out of apps/web/lib/billing/price-ids.ts, loaded exactly the
// way the ops script loads them. If this cross-boundary bridge breaks, every
// test below fails — which is the point: the gate must never silently degrade
// into "couldn't check, looks fine".
let helpers!: PriceIdHelpers;
beforeAll(async () => {
  helpers = await loadPriceIdHelpers(REPO_ROOT);
});

function price(unitAmount: number | null, interval: string | null = "month") {
  return {
    unit_amount: unitAmount,
    recurring: interval === null ? null : { interval },
  };
}

describe("the cross-workspace bridge to price-ids.ts", () => {
  it("loads the REAL advertised amounts, not a copy", () => {
    // FOUNDING (the live phase) — pricing-phases.ts is the source of truth.
    expect(helpers.advertisedPhaseUnitAmountCents("PRO", "month")).toBe(1499);
    expect(helpers.advertisedPhaseUnitAmountCents("PRO", "year")).toBe(9900);
    expect(helpers.advertisedPhaseUnitAmountCents("ELITE", "month")).toBe(2499);
    expect(helpers.advertisedPhaseUnitAmountCents("ELITE", "year")).toBe(17900);
    expect(helpers.advertisedPhaseUnitAmountCents("FANTASY", "month")).toBe(499);
    expect(helpers.advertisedPhaseUnitAmountCents("FANTASY", "year")).toBe(4900);
  });

  it("exposes the checkout guard's own comparison helper", () => {
    expect(typeof helpers.stripePriceAmountMatchesAd).toBe("function");
    expect(typeof helpers.splitPriceIds).toBe("function");
  });
});

describe("evaluateStripePrice — a mismatched unit_amount FAILS the gate", () => {
  it("FAILS the exact misconfiguration the old runbook produced: Pro at $19/mo", () => {
    const verdict = evaluateStripePrice({
      helpers,
      tier: "PRO",
      interval: "month",
      price: price(1900, "month"),
    });
    expect(verdict.ok).toBe(false);
    expect(verdict.detail).toContain("$19.00");
    expect(verdict.detail).toContain("$14.99");
    expect(verdict.detail).toContain("503");
  });

  it("FAILS the other half of it: Elite at $49/mo", () => {
    const verdict = evaluateStripePrice({
      helpers,
      tier: "ELITE",
      interval: "month",
      price: price(4900, "month"),
    });
    expect(verdict.ok).toBe(false);
    expect(verdict.detail).toContain("$49.00");
    expect(verdict.detail).toContain("$24.99");
  });

  it("PASSES the correctly configured founding prices", () => {
    expect(
      evaluateStripePrice({ helpers, tier: "PRO", interval: "month", price: price(1499, "month") }).ok,
    ).toBe(true);
    expect(
      evaluateStripePrice({ helpers, tier: "PRO", interval: "year", price: price(9900, "year") }).ok,
    ).toBe(true);
    expect(
      evaluateStripePrice({ helpers, tier: "ELITE", interval: "month", price: price(2499, "month") }).ok,
    ).toBe(true);
    expect(
      evaluateStripePrice({ helpers, tier: "ELITE", interval: "year", price: price(17900, "year") }).ok,
    ).toBe(true);
  });

  it("fails CLOSED when Stripe reports no unit_amount at all", () => {
    const verdict = evaluateStripePrice({
      helpers,
      tier: "PRO",
      interval: "month",
      price: price(null, "month"),
    });
    expect(verdict.ok).toBe(false);
    expect(verdict.detail).toContain("amount mismatch");
  });

  it("FAILS an interval mismatch even when the amount is a legitimate advertised figure", () => {
    // A monthly $14.99 price id pasted into STRIPE_PRO_ANNUAL_PRICE_ID: the page
    // sells $99/yr, Stripe would bill $14.99/mo.
    const verdict = evaluateStripePrice({
      helpers,
      tier: "PRO",
      interval: "year",
      price: price(1499, "month"),
    });
    expect(verdict.ok).toBe(false);
    expect(verdict.reasons.some((r: string) => r.includes("interval mismatch"))).toBe(true);
  });

  it("FAILS a one-time (non-recurring) price", () => {
    const verdict = evaluateStripePrice({
      helpers,
      tier: "ELITE",
      interval: "month",
      price: price(2499, null),
    });
    expect(verdict.ok).toBe(false);
    expect(verdict.reasons.some((r: string) => r.includes("interval mismatch"))).toBe(true);
  });
});

describe("the FANTASY pair is now covered", () => {
  it("includes both FANTASY env vars in the matrix the script loops over", () => {
    const names = STRIPE_PRICE_ENV_MATRIX.map((e: { env: string }) => e.env);
    expect(names).toContain("STRIPE_FANTASY_MONTHLY_PRICE_ID");
    expect(names).toContain("STRIPE_FANTASY_ANNUAL_PRICE_ID");
    // All six, no more, no fewer — pro/elite/fantasy × monthly/annual.
    expect(names).toHaveLength(6);
    expect(names).toEqual([
      "STRIPE_PRO_MONTHLY_PRICE_ID",
      "STRIPE_PRO_ANNUAL_PRICE_ID",
      "STRIPE_ELITE_MONTHLY_PRICE_ID",
      "STRIPE_ELITE_ANNUAL_PRICE_ID",
      "STRIPE_FANTASY_MONTHLY_PRICE_ID",
      "STRIPE_FANTASY_ANNUAL_PRICE_ID",
    ]);
  });

  it("validates FANTASY amounts — $4.99/mo and $49/yr pass, anything else fails", () => {
    expect(
      evaluateStripePrice({ helpers, tier: "FANTASY", interval: "month", price: price(499, "month") }).ok,
    ).toBe(true);
    expect(
      evaluateStripePrice({ helpers, tier: "FANTASY", interval: "year", price: price(4900, "year") }).ok,
    ).toBe(true);
    const wrong = evaluateStripePrice({
      helpers,
      tier: "FANTASY",
      interval: "month",
      price: price(999, "month"),
    });
    expect(wrong.ok).toBe(false);
    expect(wrong.detail).toContain("$4.99");
  });

  it("records which vars have a legacy fallback and which do not", () => {
    const byEnv = Object.fromEntries(
      STRIPE_PRICE_ENV_MATRIX.map((e: { env: string; legacyEnv: string | null }) => [e.env, e.legacyEnv]),
    );
    // Only the two MONTHLY vars fall back (see checkoutPriceId in price-ids.ts).
    expect(byEnv["STRIPE_PRO_MONTHLY_PRICE_ID"]).toBe("STRIPE_PRO_PRICE_ID");
    expect(byEnv["STRIPE_ELITE_MONTHLY_PRICE_ID"]).toBe("STRIPE_ELITE_PRICE_ID");
    expect(byEnv["STRIPE_PRO_ANNUAL_PRICE_ID"]).toBeNull();
    expect(byEnv["STRIPE_ELITE_ANNUAL_PRICE_ID"]).toBeNull();
    expect(byEnv["STRIPE_FANTASY_MONTHLY_PRICE_ID"]).toBeNull();
    expect(byEnv["STRIPE_FANTASY_ANNUAL_PRICE_ID"]).toBeNull();
  });
});

describe("currency — the deploy-time-only third axis", () => {
  it("FAILS a price whose amount and interval are right but whose currency is not USD", () => {
    // 1499 minor units of EUR is not $14.99. The runtime guard (#612) compares
    // amount + interval only, so this axis exists here and only here — a gate
    // stricter than runtime can block a deploy, never wave a bad price through.
    const verdict = evaluateStripePrice({
      helpers,
      tier: "PRO",
      interval: "month",
      price: { ...price(1499, "month"), currency: "eur" },
    });
    expect(verdict.ok).toBe(false);
    expect(verdict.reasons.some((r: string) => r.includes("currency mismatch"))).toBe(true);
  });

  it("PASSES a USD price, case-insensitively", () => {
    expect(currencyMatchesAd({ currency: "usd" })).toBe(true);
    expect(currencyMatchesAd({ currency: "USD" })).toBe(true);
    expect(currencyMatchesAd({ currency: "gbp" })).toBe(false);
    expect(ADVERTISED_CURRENCY).toBe("usd");
  });

  it("does not fail a fixture that simply omits currency", () => {
    // Absent currency is not evidence of a mismatch; the amount/interval axes
    // already fail closed on a malformed price.
    expect(currencyMatchesAd({})).toBe(true);
    expect(
      evaluateStripePrice({ helpers, tier: "PRO", interval: "month", price: price(1499, "month") }).ok,
    ).toBe(true);
  });

  it("reports EVERY failing axis at once, not just the first", () => {
    const verdict = evaluateStripePrice({
      helpers,
      tier: "ELITE",
      interval: "year",
      price: { unit_amount: 1900, currency: "eur", recurring: { interval: "month" } },
    });
    expect(verdict.ok).toBe(false);
    expect(verdict.reasons).toHaveLength(3);
  });
});

describe("intervalMatchesAd — prefers PR #612's runtime helper when present", () => {
  it("delegates to stripePriceIntervalMatchesAd when price-ids.ts exports it", () => {
    let called = false;
    const stub = {
      stripePriceIntervalMatchesAd: () => {
        called = true;
        return true;
      },
    };
    expect(intervalMatchesAd(stub, { recurring: { interval: "week" } }, "month")).toBe(true);
    expect(called).toBe(true);
  });

  it("applies the same fail-closed comparison when the helper is absent", () => {
    expect(intervalMatchesAd({}, { recurring: { interval: "month" } }, "month")).toBe(true);
    expect(intervalMatchesAd({}, { recurring: { interval: "month" } }, "year")).toBe(false);
    expect(intervalMatchesAd({}, { recurring: null }, "year")).toBe(false);
    expect(intervalMatchesAd({}, {}, "year")).toBe(false);
  });
});

describe("formatCents", () => {
  it("renders operator-facing dollar figures", () => {
    expect(formatCents(1499)).toBe("$14.99");
    expect(formatCents(17900)).toBe("$179.00");
    expect(formatCents(null)).toBe("(no amount)");
  });
});

describe("the ops script actually uses this validated predicate", () => {
  // Guards the "tested lib, untested script" gap: the readiness script must
  // import and call these, not carry its own quiet copy of the loop.
  const source = readFileSync(resolve(REPO_ROOT, "scripts/check-deploy-readiness.mjs"), "utf8");

  it("imports the matrix, loader and evaluator", () => {
    expect(source).toContain("STRIPE_PRICE_ENV_MATRIX");
    expect(source).toContain("loadPriceIdHelpers");
    expect(source).toContain("evaluateStripePrice");
    expect(source).toContain("./lib/stripe-price-check.mjs");
  });

  it("FAILS (never warns) when a price cannot be validated", () => {
    // The verdict is reported through bad(), which increments `failures` and
    // exits non-zero — not warn().
    expect(source).toMatch(/verdict\.ok\s*\)\s*ok\(/);
    expect(source).toMatch(/else bad\(which, `\$\{verdict\.detail\}/);
  });

  it("loops the shared matrix rather than its own hardcoded list of vars", () => {
    expect(source).toMatch(/of STRIPE_PRICE_ENV_MATRIX\)/);
  });
});

describe("the runbook itself — regression pin on the money-path figures", () => {
  // The doc IS the artifact that broke: docs/ops/CANONICAL.md lists
  // GO_LIVE_RUNBOOK among the runbooks that still gate go-live, and an operator
  // follows it literally. Pin the corrected claims so a future edit cannot
  // quietly reintroduce a figure the code will reject.
  const runbook = readFileSync(resolve(REPO_ROOT, "docs/ops/GO_LIVE_RUNBOOK.md"), "utf8");

  it("no longer names the never-advertised Pro/Elite pair", () => {
    // $19 in any form: the old "Pro ($19/mo)" instruction. ($179 is the real
    // Elite annual figure and does not match this pattern.)
    expect(runbook).not.toMatch(/\$19(?!\d)/);
    // $49/mo: the old Elite monthly. Bare "$49" is legitimate — it is the
    // FOUNDING Fantasy annual price — so only the /mo form is forbidden.
    expect(runbook).not.toMatch(/\$\s*49\s*\/\s*(mo|month)/i);
  });

  it("no longer describes the free tier as one pick a day", () => {
    expect(runbook).not.toMatch(/1 pick\s*\/\s*day/i);
    expect(runbook).not.toMatch(/one pick\s*\/\s*day/i);
    expect(runbook).toContain("dailyPickLimit: isPro ? null : 2");
  });

  it("quotes only figures that exist in the current pricing phase", () => {
    const advertised = new Set(
      (["PRO", "ELITE", "FANTASY"] as PaidTier[]).flatMap((tier) =>
        (["month", "year"] as Interval[]).map((iv) => helpers.advertisedPhaseUnitAmountCents(tier, iv)),
      ),
    );
    // Every dollar figure in the runbook's price table must be a real advertised
    // amount. This is what keeps "it rotted once" from happening twice.
    const tableStart = runbook.indexOf("| Tier | Monthly | Annual |");
    expect(tableStart).toBeGreaterThan(-1);
    const table = runbook.slice(tableStart, tableStart + 400);
    const quoted = [...table.matchAll(/\$(\d+(?:\.\d{2})?)/g)].map((m) => Math.round(Number(m[1]) * 100));
    expect(quoted.length).toBeGreaterThanOrEqual(6);
    for (const cents of quoted) expect([...advertised]).toContain(cents);
  });

  it("points the operator at pricing-phases.ts as the source of truth", () => {
    expect(runbook).toContain("apps/web/lib/pricing/pricing-phases.ts");
  });

  it("names all six price env vars and both legacy fallbacks", () => {
    for (const { env } of STRIPE_PRICE_ENV_MATRIX as ReadonlyArray<{ env: string }>) {
      expect(runbook).toContain(env);
    }
    expect(runbook).toContain("STRIPE_PRO_PRICE_ID");
    expect(runbook).toContain("STRIPE_ELITE_PRICE_ID");
  });

  it("documents the PREPEND-never-replace grandfathering rule", () => {
    expect(runbook).toMatch(/PREPEND, never replace/i);
    expect(runbook).toContain("tierForPriceId()");
    expect(runbook).toMatch(/downgrades founding members to FREE/i);
  });
});
