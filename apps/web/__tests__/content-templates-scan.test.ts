import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * apps/web/lib/content-engine/templates.ts may legitimately reference
 * banned-phrase *registry IDs* (e.g. "banned.guaranteed-outcome") as
 * `prohibitedClaimIds` — these tell the content engine which claims to
 * block. They are NOT the literal banned phrases.
 *
 * Pin: templates.ts contains only ID references like `banned.<slug>`,
 * never the literal banned-phrase strings.
 */

const repoRoot = resolve(__dirname, "..");
const src = readFileSync(resolve(repoRoot, "lib/content-engine/templates.ts"), "utf8");

describe("content-engine templates — banned-phrase IDs only, never literals", () => {
  // Strip every "banned.<id>" reference; whatever's left must not contain
  // a literal banned phrase from the registry.
  const stripped = src.replace(/"banned\.[a-z][a-z0-9-]*"/g, "");

  it("does not emit the literal 'guaranteed' anywhere outside a banned.* ID reference", () => {
    // Allow "guaranteed" inside a comment that explains the banned ID.
    // We strip ID references first, then check.
    expect(stripped).not.toMatch(/"guaranteed"/i);
  });

  it("does not emit other literal banned phrases", () => {
    for (const phrase of [
      '"risk-free"',
      '"sure thing"',
      '"easy money"',
      '"verified track record"',
    ]) {
      expect(stripped).not.toContain(phrase);
    }
  });

  it("`prohibitedClaimIds` arrays reference banned-claim IDs", () => {
    expect(src).toMatch(/prohibitedClaimIds:\s*\[[^\]]*"banned\./);
  });
});
