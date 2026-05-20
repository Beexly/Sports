import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Source-level checks for the publish-readiness checklist on
 * /cockpit/history. The checklist drives the operator's decision about
 * when to flip PERFORMANCE_STATS_ENABLED — losing any of the rows or
 * the ready-state explanation would silently lower the bar.
 */

const repoRoot = resolve(__dirname, "..");
const src = readFileSync(resolve(repoRoot, "app/cockpit/history/page.tsx"), "utf8");

describe("/cockpit/history publish-readiness checklist", () => {
  it("renders a data-testid the smoke layer can target", () => {
    expect(src).toMatch(/data-testid="history-publish-readiness"/);
  });

  it("includes every expected checklist row", () => {
    for (const label of [
      "Canonical history enabled",
      "Public-eligible canonical picks:",
      "Sample meets minimum",
      "Bootstrap mode disabled",
    ]) {
      expect(src, `Missing checklist row: ${label}`).toContain(label);
    }
  });

  it("renders a progress bar bound to ratio of settled vs minimum", () => {
    expect(src).toMatch(/Progress to sample minimum/);
    expect(src).toMatch(/width:\s*`\$\{pct\}%`/);
  });

  it("conditional ready-to-flip explanation references the env flag", () => {
    expect(src).toMatch(/PERFORMANCE_STATS_ENABLED=true/);
  });

  it("warns when gate is open and sample dropped below minimum", () => {
    expect(src).toMatch(/already OPEN[\s\S]+drops below the minimum/);
  });

  it("ChecklistRow is imported from the shared cockpit primitive", () => {
    expect(src).toMatch(/import\s+\{\s*ChecklistRow\s*\}\s+from\s+["']@\/components\/cockpit\/checklist-row["']/);
  });

  it("shared ChecklistRow primitive branches on `ok` and marks the icon aria-hidden", () => {
    const primitive = readFileSync(
      resolve(repoRoot, "components/cockpit/checklist-row.tsx"),
      "utf8"
    );
    expect(primitive).toMatch(/export\s+function\s+ChecklistRow/);
    expect(primitive).toMatch(/aria-hidden="true"/);
    expect(primitive).toMatch(/ok\s*\?\s*"bg-green-700/);
  });
});
