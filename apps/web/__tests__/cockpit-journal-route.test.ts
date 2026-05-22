import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(__dirname, "..", "..", "..");
const page = fs.readFileSync(path.join(repoRoot, "apps/web/app/cockpit/journal/page.tsx"), "utf8");
const loader = fs.readFileSync(path.join(repoRoot, "apps/web/lib/journal/load.ts"), "utf8");
const layout = fs.readFileSync(path.join(repoRoot, "apps/web/app/cockpit/layout.tsx"), "utf8");

describe("Model Journal cockpit route", () => {
  it("ships a cockpit landing page with the required sections", () => {
    expect(page).toContain("Model Journal");
    expect(page).toContain("Operator Workspace");
    expect(page).toContain("Drafts Pending Review");
    expect(page).toContain("Published Entries");
    expect(page).toContain("Retracted Entries");
  });

  it("loads journal entries from the new persistence model", () => {
    expect(loader).toMatch(/db\.modelJournalEntry\s*\.\s*findMany/);
    expect(loader).toContain("REVIEW_PENDING");
    expect(loader).toContain("PUBLISHED");
    expect(loader).toContain("RETRACTED");
  });

  it("adds the Journal route to cockpit navigation", () => {
    expect(layout).toContain('href: "/cockpit/journal"');
    expect(layout).toContain("Weekly model essay");
  });
});
