import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  SPORTS_DATA_CANDIDATES,
  findUngatedCandidates,
  requiredApiKeyEnvVars,
  getCandidateSummary,
} from "@/lib/scraping/sports-data-candidates";

const REPO_ROOT = resolve(__dirname, "../../..");

describe("sports-data-candidates: gate", () => {
  it("no candidate claims automation / commercial / production approval", () => {
    expect(findUngatedCandidates()).toEqual([]);
    for (const c of SPORTS_DATA_CANDIDATES) {
      expect(c.automationApproved).toBe(false);
      expect(c.commercialUseApproved).toBe(false);
      expect(c.productionApproved).toBe(false);
    }
  });

  it("every keyed candidate documents an env-var NAME and never a key value", () => {
    const keyValuePattern = /[A-Za-z0-9]{20,}|[0-9a-f]{8}-[0-9a-f]{4}/; // long token / uuid-ish
    for (const c of SPORTS_DATA_CANDIDATES) {
      if (c.keyRequired) {
        expect(c.apiKeyEnvVar, c.id).toMatch(/^[A-Z][A-Z0-9_]+$/);
      } else {
        expect(c.apiKeyEnvVar, c.id).toBeNull();
      }
      // The env-var field is a NAME, not a secret value.
      if (c.apiKeyEnvVar) expect(keyValuePattern.test(c.apiKeyEnvVar)).toBe(false);
    }
  });

  it("the candidate source contains no secret-SHAPED tokens (env-var names only)", () => {
    // Match secret SHAPES, not literal values — so this guard never embeds a key itself.
    const src = readFileSync(
      resolve(REPO_ROOT, "apps/web/lib/scraping/sports-data-candidates.ts"),
      "utf8",
    );
    const uuidKey = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
    const base64Secret = /[A-Za-z0-9]{18,}[+/][A-Za-z0-9+/]{8,}/; // long token containing + or /
    expect(uuidKey.test(src), "a UUID-shaped key must not appear in source").toBe(false);
    expect(base64Secret.test(src), "a base64-shaped secret must not appear in source").toBe(false);
  });

  it("every keyed env-var name is documented in .env.example", () => {
    const example = readFileSync(resolve(REPO_ROOT, ".env.example"), "utf8");
    const documented = new Set(
      example
        .split(/\r?\n/)
        .map((l) => l.match(/^#?\s*([A-Z][A-Z0-9_]+)=/)?.[1])
        .filter((v): v is string => Boolean(v)),
    );
    for (const envVar of requiredApiKeyEnvVars()) {
      expect(documented.has(envVar), `${envVar} must be in .env.example`).toBe(true);
    }
  });

  it("summary is internally consistent", () => {
    const s = getCandidateSummary();
    expect(s.total).toBe(SPORTS_DATA_CANDIDATES.length);
    expect(s.needKey + s.noKey).toBe(s.total);
    expect(s.alreadyRegistered).toBeGreaterThan(0);
  });
});
