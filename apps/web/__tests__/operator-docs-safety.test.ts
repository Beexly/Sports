import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(__dirname, "..", "..", "..");
const operatorPlaybook = readFileSync(
  resolve(repoRoot, "docs/operator-playbook.md"),
  "utf8",
);
const launchQaChecklist = readFileSync(
  resolve(repoRoot, "docs/launch-qa-checklist.md"),
  "utf8",
);

describe("operator docs safety", () => {
  it("requires deploy-readiness and cockpit evidence before gate flips in operator playbook", () => {
    expect(operatorPlaybook).toMatch(/npm run deploy:ready/);
    expect(operatorPlaybook).toMatch(/Jarvis/i);
    expect(operatorPlaybook).toMatch(/\/cockpit\/history/);
  });

  it("does not tell the operator to run stripe:seed from the day-by-day playbook", () => {
    expect(operatorPlaybook).not.toMatch(/npm run stripe:seed/);
  });

  it("routes paid-launch verification through the checklist instead of inline seeding instructions", () => {
    expect(operatorPlaybook).toMatch(/docs\/launch-qa-checklist\.md/);
    expect(launchQaChecklist).toMatch(/checkout/i);
    expect(launchQaChecklist).toMatch(/live products/i);
  });
});
