import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, join, relative } from "node:path";

/**
 * Adversarial contract: every Vercel cron route handler must validate
 * the CRON_SECRET Bearer token before doing any work. A cron route
 * without this check is publicly invocable — an attacker can trigger
 * side effects (score settling, snapshot writes) without any secret.
 *
 * Pattern enforced:
 *   - File must read CRON_SECRET from process.env
 *   - File must check the Authorization header against the secret
 *   - File must return a 401 on mismatch
 */

const repoRoot = resolve(__dirname, "..");
const CRON_DIR = resolve(repoRoot, "app/api/cron");

function findRouteFiles(dir: string): string[] {
  const acc: string[] = [];
  try {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      const s = statSync(p);
      if (s.isDirectory()) acc.push(...findRouteFiles(p));
      else if (name === "route.ts") acc.push(p);
    }
  } catch {
    // directory doesn't exist
  }
  return acc;
}

const CRON_ROUTES = findRouteFiles(CRON_DIR);

describe("/api/cron/** routes — CRON_SECRET auth contract", () => {
  it("at least one cron route file exists", () => {
    expect(CRON_ROUTES.length).toBeGreaterThanOrEqual(1);
  });

  for (const file of CRON_ROUTES) {
    const rel = relative(repoRoot, file);
    it(`${rel} validates CRON_SECRET Bearer token`, () => {
      const src = readFileSync(file, "utf8");

      // Must read CRON_SECRET from env
      expect(src, `${rel} must read CRON_SECRET from process.env`).toMatch(
        /CRON_SECRET/
      );

      // Must check Authorization header
      expect(src, `${rel} must check Authorization/authorization header`).toMatch(
        /authorization|Authorization/
      );

      // Must return 401 on bad token
      expect(src, `${rel} must return 401 on auth failure`).toMatch(
        /status:\s*401/
      );
    });
  }
});

describe("Stripe webhook route — signature verification contract", () => {
  const WEBHOOK_FILE = resolve(repoRoot, "app/api/webhooks/stripe/route.ts");

  it("Stripe webhook uses constructEvent for signature validation", () => {
    const src = readFileSync(WEBHOOK_FILE, "utf8");
    expect(src).toMatch(/constructEvent/);
    expect(src).toMatch(/STRIPE_WEBHOOK_SECRET/);
    expect(src).toMatch(/stripe-signature/);
  });

  it("Stripe webhook returns 400 on invalid signature", () => {
    const src = readFileSync(WEBHOOK_FILE, "utf8");
    expect(src).toMatch(/status:\s*400/);
  });
});
