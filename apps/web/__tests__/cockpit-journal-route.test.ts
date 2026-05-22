import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(__dirname, "..", "..", "..");
const page = fs.readFileSync(path.join(repoRoot, "apps/web/app/cockpit/journal/page.tsx"), "utf8");
const entryPage = fs.readFileSync(path.join(repoRoot, "apps/web/app/cockpit/journal/[entryId]/page.tsx"), "utf8");
const editor = fs.readFileSync(path.join(repoRoot, "apps/web/app/cockpit/journal/[entryId]/journal-entry-editor.tsx"), "utf8");
const saveRoute = fs.readFileSync(path.join(repoRoot, "apps/web/app/api/cockpit/journal/[id]/route.ts"), "utf8");
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
    expect(loader).toMatch(/db\.modelJournalEntry\s*\.\s*findUnique/);
    expect(loader).toContain("REVIEW_PENDING");
    expect(loader).toContain("PUBLISHED");
    expect(loader).toContain("RETRACTED");
  });

  it("ships a per-entry editor shell with preview and evidence rails", () => {
    expect(entryPage).toContain("loadJournalEntryDetail");
    expect(entryPage).toContain("JournalEntryEditor");
    expect(editor).toContain("Markdown editor");
    expect(editor).toContain("Run compliance scan");
    expect(editor).toContain("Submit for publish");
    expect(entryPage).toContain("Referenced Picks");
    expect(entryPage).toContain("Cited Autopsies");
    expect(editor).toContain("Body edits are disabled");
  });

  it("prevents body edits after publication or retraction", () => {
    expect(loader).toContain('row.status === "DRAFT" || row.status === "REVIEW_PENDING"');
    expect(editor).toContain("readOnly={!isBodyEditable}");
  });

  it("wires draft save through an admin-only cockpit API route", () => {
    expect(editor).toContain('method: "PATCH"');
    expect(editor).toContain("Save draft");
    expect(saveRoute).toMatch(/from\s+["']@\/lib\/auth["']/);
    expect(saveRoute).toMatch(/role\s*!==\s*"ADMIN"/);
    expect(saveRoute).toContain("EDITABLE_STATUSES");
    expect(saveRoute).toContain("modelJournalEntry.update");
    expect(saveRoute).toContain("bodyMarkdown");
    expect(saveRoute).not.toMatch(/emailDigest|twitterClient|postToSlack|sendgrid|mailchimp/i);
  });

  it("adds the Journal route to cockpit navigation", () => {
    expect(layout).toContain('href: "/cockpit/journal"');
    expect(layout).toContain("Weekly model essay");
  });
});
