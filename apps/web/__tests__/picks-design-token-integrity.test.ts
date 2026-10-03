import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(__dirname, "..", "..", "..");

const checkedFiles = [
  "apps/web/components/picks/pick-card.tsx",
  "apps/web/components/picks/evidence-audit-drawer.tsx",
  "packages/types/src/index.ts",
] as const;

const rawColorClassPattern =
  /\b(?:bg|text|border|shadow|hover:bg|hover:text|hover:border)-(?:green|yellow|emerald|orange|red|blue|purple|violet|cyan|amber|gold)-/;

function readRepoFile(path: string): string {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

describe("picks design-token integrity", () => {
  it("does not reintroduce raw casino or off-system Tailwind color classes", () => {
    for (const path of checkedFiles) {
      expect(readRepoFile(path), path).not.toMatch(rawColorClassPattern);
    }
  });

  it("uses token classes directly in scanned pick components for Tailwind JIT", () => {
    const componentSrc = [
      readRepoFile("apps/web/components/picks/pick-card.tsx"),
      readRepoFile("apps/web/components/picks/evidence-audit-drawer.tsx"),
    ].join("\n");

    for (const tokenClass of [
      "text-verify",
      "bg-verify/10",
      "text-alert",
      "bg-alert/10",
      "text-ion-blue",
      "bg-ion-blue/10",
      "text-ultraviolet",
      "bg-ultraviolet/10",
      "text-plasma",
      "bg-plasma/10",
    ]) {
      expect(componentSrc).toContain(tokenClass);
    }
  });

  it("keeps exported pick label metadata on design-token classes", () => {
    const typesSrc = readRepoFile("packages/types/src/index.ts");

    expect(typesSrc).toContain('color: "text-verify"');
    expect(typesSrc).toContain('color: "text-alert"');
    expect(typesSrc).toContain('color: "text-ion-blue"');
    expect(typesSrc).toContain('color: "text-ultraviolet"');
    expect(typesSrc).toContain('color: "text-plasma"');
  });
});
