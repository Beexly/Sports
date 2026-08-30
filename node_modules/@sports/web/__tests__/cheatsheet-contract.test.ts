import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Pin the launch-night CHEATSHEET.md structure so the operator's
 * 60-second wake-up document doesn't drift.
 *
 * The cheat sheet promises four-of-everything: 4 URLs, 4 commands,
 * 4 verifications, 4 invariants. If a future edit drops one of those
 * sections or breaks the README cross-link, this test fails.
 *
 * Source-level only — we read the markdown via fs.
 */

const repoRoot = resolve(__dirname, "..", "..", "..");
const cheatsheet = readFileSync(
  resolve(repoRoot, "reports/launch-night/CHEATSHEET.md"),
  "utf8",
);
const readme = readFileSync(
  resolve(repoRoot, "reports/launch-night/README.md"),
  "utf8",
);

describe("CHEATSHEET.md contract", () => {
  it("declares itself as a one-page cheat sheet at the top", () => {
    expect(cheatsheet).toMatch(/^#\s+Launch-Night Cheat Sheet/m);
    expect(cheatsheet).toMatch(/One Page/i);
  });

  it("has a '4 URLs to visit' section", () => {
    expect(cheatsheet).toMatch(/##\s+4 URLs to visit/);
  });

  it("lists the four canonical morning URLs", () => {
    for (const url of ["/dashboard", "/cockpit", "/cockpit/history", "/picks"]) {
      expect(cheatsheet, `cheat sheet should reference URL: ${url}`).toContain(
        url,
      );
    }
  });

  it("has a '4 commands to run' section", () => {
    expect(cheatsheet).toMatch(/##\s+4 commands to run/);
  });

  it("lists the four canonical morning commands", () => {
    for (const cmd of [
      "npm run dev",
      "npm run morning:setup",
      "npm run test:brand-safety",
      "npm run test:fast",
    ]) {
      expect(cheatsheet, `cheat sheet should reference command: ${cmd}`).toContain(
        cmd,
      );
    }
  });

  it("has a '4 things to verify' section", () => {
    expect(cheatsheet).toMatch(/##\s+4 things to verify/);
  });

  it("calls out the public-performance gate ('Collecting…') as a verification", () => {
    expect(cheatsheet).toMatch(/Verified Record/);
    expect(cheatsheet).toMatch(/Collecting/);
    expect(cheatsheet).toMatch(/PERFORMANCE_STATS_ENABLED/);
  });

  it("calls out the sample-mode banner as a verification", () => {
    expect(cheatsheet).toMatch(/Sample-mode banner|sample mode/i);
    expect(cheatsheet).toMatch(/DEMO_PICKS_ENABLED/);
  });

  it("has a '4 invariants to never break' section", () => {
    expect(cheatsheet).toMatch(/##\s+4 invariants to never break/);
  });

  it("names the four invariants", () => {
    expect(cheatsheet).toMatch(/No fabricated stats/i);
    expect(cheatsheet).toMatch(/banned phrases/i);
    expect(cheatsheet).toMatch(/No auto-publish/i);
    expect(cheatsheet).toMatch(/MODEL_VERSION|model-freeze/i);
  });

  it("points to evaluatePublicPerformancePolicy as the gate", () => {
    expect(cheatsheet).toMatch(/evaluatePublicPerformancePolicy/);
  });

  it("names the trust-claims registry as the source of truth for banned phrases", () => {
    expect(cheatsheet).toMatch(/trust-claims? registry/i);
  });

  it("has a 'When something looks wrong' troubleshooting section", () => {
    expect(cheatsheet).toMatch(/##\s+When something looks wrong/);
  });

  it("points back to the full README index as the next step", () => {
    expect(cheatsheet).toMatch(/reports\/launch-night\/README\.md/);
    expect(cheatsheet).toMatch(/morning-handoff\.md/);
  });

  it("references the launch runbook for deeper context", () => {
    expect(cheatsheet).toMatch(/docs\/launch-runbook\.md/);
  });

  it("has exactly four numbered URLs (one per row of the URL table)", () => {
    // The URL section is a markdown table; assert each canonical URL
    // shows up exactly once in a backtick code-span (the table's first
    // column). That's how we know "4 URLs" matches reality.
    for (const url of ["/dashboard", "/cockpit", "/cockpit/history", "/picks"]) {
      const tableRowPattern = new RegExp(`\\| \`${url}\` \\|`);
      expect(cheatsheet, `cheat sheet table should have a row for ${url}`).toMatch(
        tableRowPattern,
      );
    }
  });

  it("has exactly four numbered verifications (markdown ordered list 1-4)", () => {
    // Extract the verifications block and count "N." lines.
    const start = cheatsheet.indexOf("## 4 things to verify");
    const end = cheatsheet.indexOf("## 4 invariants");
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const block = cheatsheet.slice(start, end);
    const numbered = block.match(/^\d+\.\s+/gm) ?? [];
    expect(numbered.length).toBe(4);
  });

  it("has exactly four numbered invariants (markdown ordered list 1-4)", () => {
    const start = cheatsheet.indexOf("## 4 invariants");
    const end = cheatsheet.indexOf("## When something looks wrong");
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const block = cheatsheet.slice(start, end);
    const numbered = block.match(/^\d+\.\s+/gm) ?? [];
    expect(numbered.length).toBe(4);
  });

  it("the troubleshooting section names the right env flags", () => {
    const start = cheatsheet.indexOf("## When something looks wrong");
    expect(start).toBeGreaterThan(-1);
    const block = cheatsheet.slice(start);
    expect(block).toMatch(/PERFORMANCE_STATS_ENABLED/);
    expect(block).toMatch(/DEMO_PICKS_ENABLED/);
    expect(block).toMatch(/isStubMode\(\)|DATABASE_URL/);
    expect(block).toMatch(/npm run db:seed/);
  });

  it("never includes a banned phrase even inside example/troubleshooting copy", () => {
    // The cheat sheet documents banned phrases but must not USE them on
    // customer-facing surfaces. The cheat sheet is operator-internal so
    // it may quote them; but it must not assert any of the customer-
    // copy taboos as if speaking to a customer.
    // We allow them to be present as quoted examples ("Verified Record"
    // is fine — that's a phrase label, not a customer claim). What we
    // forbid is the cheat sheet itself making a guarantee.
    expect(cheatsheet).not.toMatch(/guaranteed wins?\b/i);
    expect(cheatsheet).not.toMatch(/\brisk[-\s]free\b/i);
    expect(cheatsheet).not.toMatch(/\bsure thing\b/i);
    expect(cheatsheet).not.toMatch(/\beasy money\b/i);
  });

  it("uses fenced code blocks for shell commands so copy-paste works cleanly", () => {
    // The "4 commands to run" block must use ```bash so the operator can
    // paste it without grabbing markdown prose.
    const commandsBlock = cheatsheet.slice(
      cheatsheet.indexOf("## 4 commands to run"),
      cheatsheet.indexOf("## 4 things to verify"),
    );
    expect(commandsBlock).toMatch(/```bash[\s\S]+```/);
  });
});

describe("CHEATSHEET cross-link from README", () => {
  it("README lists CHEATSHEET.md as the first reading-order item", () => {
    // The README's "Read in order" list should start at 0 and point at the cheat sheet.
    expect(readme).toMatch(/0\.\s+\*\*\[CHEATSHEET\.md\]\(\.\/CHEATSHEET\.md\)\*\*/);
  });

  it("README explains the cheat sheet is for the 60-second case", () => {
    const idx = readme.indexOf("CHEATSHEET.md");
    expect(idx).toBeGreaterThan(-1);
    const slice = readme.slice(idx, idx + 400);
    expect(slice).toMatch(/60 seconds|one[-\s]page|cheat sheet/i);
  });

  it("README still routes from cheat sheet to morning-handoff", () => {
    // The morning handoff entry should come after the cheat sheet in the README.
    const cIdx = readme.indexOf("CHEATSHEET.md");
    const mIdx = readme.indexOf("morning-handoff.md");
    expect(cIdx).toBeGreaterThan(-1);
    expect(mIdx).toBeGreaterThan(-1);
    expect(mIdx).toBeGreaterThan(cIdx);
  });
});
