import test from "node:test";
import assert from "node:assert/strict";
import {
  ANTI_EVASION_POLICY,
  assertAuthorizedGseTarget,
  getAppSecAndCdnToolStatus,
} from "./gse-appsec-and-cdn-monitor.mjs";

test("allows only authorized GSE hosts and fails closed on third-party targets", () => {
  assert.equal(assertAuthorizedGseTarget("https://www.galaxysportsedge.com"), "https://www.galaxysportsedge.com");
  assert.equal(assertAuthorizedGseTarget("galaxysportsedge.com"), "https://galaxysportsedge.com");
  assert.equal(assertAuthorizedGseTarget("http://127.0.0.1:3000"), "http://127.0.0.1:3000");

  for (const blocked of [
    "https://www.pro-football-reference.com/",
    "https://pro-football-reference.com/years/2026/",
    "https://example.com",
    "http://169.254.169.254/latest/meta-data/",
    "https://user:pass@galaxysportsedge.com",
    "http://www.galaxysportsedge.com",
  ]) {
    assert.throws(() => assertAuthorizedGseTarget(blocked), /TARGET_NOT_IN_GSE_ALLOWLIST/);
  }
});

test("enforces anti-evasion policy and reports installed ProjectDiscovery and CloudflareST binaries", () => {
  assert.equal(ANTI_EVASION_POLICY.scraplingStealthBlocked, true);
  assert.equal(ANTI_EVASION_POLICY.turnstileBypassForbidden, true);
  assert.equal(ANTI_EVASION_POLICY.authorizedSelfAuditOnly, true);

  const status = getAppSecAndCdnToolStatus();
  assert.equal(status.selfAuditTemplateExists, true);
  for (const toolName of ["nuclei", "katana", "dnsx", "notify", "CloudflareST"]) {
    assert.equal(status.tools[toolName].available, true, `${toolName} should be available`);
  }
});
