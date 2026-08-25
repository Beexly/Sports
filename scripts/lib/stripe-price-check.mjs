/**
 * Deploy-time Stripe price validation — the pure decision logic.
 *
 * WHY THIS EXISTS
 * ---------------
 * `scripts/check-deploy-readiness.mjs` used to fetch each configured Stripe
 * Price and print `$${amount}/${interval}` as a GREEN line. It never compared
 * that amount to what the site actually advertises. So an operator who created
 * a Stripe Price at the wrong figure (for years `docs/ops/GO_LIVE_RUNBOOK.md`
 * told them to create "Pro $19/mo" and "Elite $49/mo", which have never been
 * the advertised prices) got a green readiness gate — and then every Pro/Elite
 * checkout 503'd in production, because `apps/web/lib/stripe.ts` fails CLOSED
 * on exactly that mismatch (GSE-SEC-024). Green gate, zero revenue, no signal.
 *
 * This module closes that hole at DEPLOY time. It is the same predicate the
 * runtime checkout guard uses — imported from
 * `apps/web/lib/billing/price-ids.ts`, never reimplemented — so the gate and
 * the checkout path can never disagree about what "correct amount" means.
 *
 * WHY A SEPARATE .mjs LIB
 * -----------------------
 * Same reason as `scripts/lib/gate-flip-readiness.mjs`: an .mjs lib can be
 * imported both by the plain-Node ops script the operator runs and by the
 * Vitest suite, so the predicate that is tested is literally the predicate that
 * ships. This module performs no network I/O; the caller does the fetching.
 */

import { existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

/**
 * Every Stripe price env var checkout can resolve, with the tier × interval it
 * is supposed to hold and the legacy var (if any) that still falls back for it.
 *
 * SOURCE OF TRUTH: `checkoutPriceId()` in apps/web/lib/billing/price-ids.ts.
 *   - PRO/month   → STRIPE_PRO_MONTHLY_PRICE_ID,   falls back to STRIPE_PRO_PRICE_ID
 *   - PRO/year    → STRIPE_PRO_ANNUAL_PRICE_ID,    NO fallback
 *   - ELITE/month → STRIPE_ELITE_MONTHLY_PRICE_ID, falls back to STRIPE_ELITE_PRICE_ID
 *   - ELITE/year  → STRIPE_ELITE_ANNUAL_PRICE_ID,  NO fallback
 *   - FANTASY/*   → STRIPE_FANTASY_{MONTHLY,ANNUAL}_PRICE_ID, NO fallback
 *
 * The old readiness loop covered only the first four — the entire FANTASY tier
 * could be misconfigured or absent and the gate still went green.
 */
export const STRIPE_PRICE_ENV_MATRIX = Object.freeze([
  Object.freeze({ env: "STRIPE_PRO_MONTHLY_PRICE_ID", tier: "PRO", interval: "month", legacyEnv: "STRIPE_PRO_PRICE_ID" }),
  Object.freeze({ env: "STRIPE_PRO_ANNUAL_PRICE_ID", tier: "PRO", interval: "year", legacyEnv: null }),
  Object.freeze({ env: "STRIPE_ELITE_MONTHLY_PRICE_ID", tier: "ELITE", interval: "month", legacyEnv: "STRIPE_ELITE_PRICE_ID" }),
  Object.freeze({ env: "STRIPE_ELITE_ANNUAL_PRICE_ID", tier: "ELITE", interval: "year", legacyEnv: null }),
  Object.freeze({ env: "STRIPE_FANTASY_MONTHLY_PRICE_ID", tier: "FANTASY", interval: "month", legacyEnv: null }),
  Object.freeze({ env: "STRIPE_FANTASY_ANNUAL_PRICE_ID", tier: "FANTASY", interval: "year", legacyEnv: null }),
]);

/**
 * Import the REAL billing helpers out of `apps/web` so this gate and the
 * runtime checkout guard share one definition of the advertised amount.
 *
 * The module lives in TypeScript and imports its pricing source of truth via
 * the `@/` path alias, so two things are arranged here:
 *   1. Node's native type stripping loads the `.ts` (Node >= 22.18; earlier
 *      Node cannot, and this throws — the caller must then FAIL, never skip).
 *   2. A tiny in-thread resolve hook maps `@/…` → `apps/web/…` so the alias
 *      resolves outside webpack/vitest.
 *
 * Throws on any failure. Callers must treat a throw as a hard readiness
 * FAILURE: a gate that cannot verify the charged amount has not verified it.
 *
 * @param {string} repoRoot absolute path to the repository root
 */
let hooksRegistered = false;

export async function loadPriceIdHelpers(repoRoot) {
  const webRoot = join(repoRoot, "apps", "web");
  const target = join(webRoot, "lib", "billing", "price-ids.ts");
  if (!existsSync(target)) {
    throw new Error(`price-ids.ts not found at ${target}`);
  }

  const { registerHooks } = await import("node:module");
  if (typeof registerHooks !== "function") {
    throw new Error(
      `node:module.registerHooks unavailable on Node ${process.version} — ` +
        "re-run this check on Node >= 22.18 (registerHooks landed in 22.15 and " +
        "TypeScript type-stripping is on by default from 22.18; both are needed " +
        "to load the billing helpers)",
    );
  }

  // Register once per process — repeated calls would stack duplicate hooks.
  if (!hooksRegistered) {
    registerHooks({
      resolve(specifier, context, nextResolve) {
        if (specifier.startsWith("@/")) {
          const base = join(webRoot, specifier.slice(2));
          for (const ext of [".ts", ".tsx", ".mjs", ".js", ""]) {
            if (existsSync(base + ext)) {
              return { url: pathToFileURL(base + ext).href, shortCircuit: true };
            }
          }
        }
        return nextResolve(specifier, context);
      },
    });
    hooksRegistered = true;
  }

  // apps/web/package.json has no `"type": "module"` (it is a Next app, not an ESM
  // package), so Node prints a MODULE_TYPELESS_PACKAGE_JSON warning while stripping
  // types off these .ts files. That is noise in the middle of an operator's go/no-go
  // checklist and says nothing about readiness — mute exactly that code, and restore
  // the real emitter immediately (finally) so nothing else is ever swallowed.
  const realEmitWarning = process.emitWarning;
  process.emitWarning = function mutedEmitWarning(warning, ...rest) {
    const code =
      rest[0] && typeof rest[0] === "object"
        ? rest[0].code
        : typeof rest[1] === "string"
          ? rest[1]
          : undefined;
    if (code === "MODULE_TYPELESS_PACKAGE_JSON") return;
    return realEmitWarning.call(process, warning, ...rest);
  };

  let mod;
  try {
    mod = await import(pathToFileURL(target).href);
  } finally {
    process.emitWarning = realEmitWarning;
  }

  for (const fn of ["advertisedPhaseUnitAmountCents", "stripePriceAmountMatchesAd", "splitPriceIds"]) {
    if (typeof mod[fn] !== "function") {
      throw new Error(`price-ids.ts did not export ${fn}() — refusing to validate prices with a partial helper`);
    }
  }
  return mod;
}

/**
 * Does the Stripe price's recurring interval match the interval this env var is
 * supposed to hold?
 *
 * PR #612 (`claude/stripe-price-and-dunning-guards`) adds
 * `stripePriceIntervalMatchesAd()` to price-ids.ts as the RUNTIME interval
 * guard. This deploy-time gate prefers that helper whenever it is present so
 * both gates share one predicate; until #612 lands on main the same
 * fail-closed comparison is applied here. Once #612 is merged the fallback
 * branch is unreachable and can be deleted.
 *
 * Fails CLOSED for one-time prices (`recurring` null/absent) — a price with no
 * recurring block can never satisfy a subscription interval.
 */
export function intervalMatchesAd(helpers, price, interval) {
  if (helpers && typeof helpers.stripePriceIntervalMatchesAd === "function") {
    return helpers.stripePriceIntervalMatchesAd(price, interval);
  }
  const actual = price?.recurring?.interval;
  if (actual == null) return false;
  return actual === interval;
}

/**
 * The currency `pricing-phases.ts` quotes in. Every `TierPrice` there is
 * documented as USD ("Recurring monthly price in USD") and every public surface
 * renders it with a `$` (`PRICE_DISPLAY` in apps/web/lib/stripe.ts), so a Stripe
 * Price in any other currency is mispriced no matter what its `unit_amount` says
 * — 1499 minor units of EUR is not $14.99.
 *
 * This is a DEPLOY-TIME-ONLY axis: #612's runtime guard checks amount + interval,
 * and a gate that is *stricter* than runtime can only ever block a deploy, never
 * wave a bad price through. `unit_amount` alone is compared by the shared helper;
 * this sits beside it, not instead of it.
 */
export const ADVERTISED_CURRENCY = "usd";

/**
 * Does the Stripe price's currency match the currency we advertise in?
 * Absent currency (a hand-built fixture) is not treated as a mismatch — the
 * amount and interval axes already fail closed on a malformed price.
 */
export function currencyMatchesAd(price) {
  const actual = price?.currency;
  if (actual == null) return true;
  return String(actual).toLowerCase() === ADVERTISED_CURRENCY;
}

/** Format cents as a dollar string for operator-facing output. */
export function formatCents(cents) {
  if (cents == null || Number.isNaN(cents)) return "(no amount)";
  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * Evaluate ONE fetched Stripe Price object against the advertised phase price
 * for the tier × interval its env var is supposed to hold.
 *
 * Three axes, all fail-closed: amount, recurring interval, currency.
 *
 * The amount/interval comparisons are NOT reimplemented here — they delegate to
 * `stripePriceAmountMatchesAd()` (and, for the interval,
 * `stripePriceIntervalMatchesAd()` when available), the exact helpers
 * `apps/web/lib/stripe.ts` uses to fail checkout closed. Deploy-time and runtime
 * therefore agree by construction. Currency is the one deploy-time-only axis
 * (see ADVERTISED_CURRENCY) — stricter than runtime, which is the safe direction
 * for a gate.
 *
 * Every reason is reported at once, so an operator fixing a miswired var sees
 * the whole story in one run rather than one axis per round-trip.
 *
 * @param {object} args
 * @param {object} args.helpers   module returned by loadPriceIdHelpers()
 * @param {"FANTASY"|"PRO"|"ELITE"} args.tier
 * @param {"month"|"year"} args.interval
 * @param {{unit_amount: number|null, currency?: string|null, recurring?: {interval?: string|null}|null}} args.price
 * @returns {{ok: boolean, detail: string, reasons: string[]}}
 */
export function evaluateStripePrice({ helpers, tier, interval, price }) {
  const expectedCents = helpers.advertisedPhaseUnitAmountCents(tier, interval);
  const actualCents = price?.unit_amount ?? null;
  const actualInterval = price?.recurring?.interval ?? null;

  const reasons = [];
  if (!helpers.stripePriceAmountMatchesAd(price ?? { unit_amount: null }, tier, interval)) {
    reasons.push(
      `amount mismatch — Stripe charges ${formatCents(actualCents)} but ${tier} ` +
        `is advertised at ${formatCents(expectedCents)}/${interval} ` +
        `(apps/web/lib/pricing/pricing-phases.ts, phase ${currentPhaseLabel()})`,
    );
  }
  if (!intervalMatchesAd(helpers, price ?? {}, interval)) {
    reasons.push(
      `interval mismatch — Stripe price recurs "${actualInterval ?? "(one-time)"}" but this var must hold a "${interval}" price`,
    );
  }
  if (!currencyMatchesAd(price)) {
    reasons.push(
      `currency mismatch — Stripe price is in "${String(price?.currency).toLowerCase()}" but every advertised ` +
        `figure is ${ADVERTISED_CURRENCY.toUpperCase()} (apps/web/lib/pricing/pricing-phases.ts)`,
    );
  }

  if (reasons.length > 0) {
    return {
      ok: false,
      reasons,
      detail:
        `${reasons.join("; ")}. Checkout would 503 on this price ` +
        `(apps/web/lib/stripe.ts fails CLOSED — GSE-SEC-024).`,
    };
  }
  return {
    ok: true,
    reasons: [],
    detail: `${formatCents(actualCents)}/${actualInterval} — matches the advertised ${tier} price`,
  };
}

/** The PRICING_PHASE the advertised amounts are being read from (for messages). */
function currentPhaseLabel() {
  const raw = process.env["PRICING_PHASE"];
  const known = ["FOUNDING", "PROVEN", "ESTABLISHED", "AUTHORITY"];
  return known.includes(raw ?? "") ? raw : "FOUNDING (default)";
}
