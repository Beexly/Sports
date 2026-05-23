import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(__dirname, "..", "..", "..");
const page = fs.readFileSync(path.join(repoRoot, "apps/web/app/cockpit/journal/page.tsx"), "utf8");
const newPage = fs.readFileSync(path.join(repoRoot, "apps/web/app/cockpit/journal/new/page.tsx"), "utf8");
const newForm = fs.readFileSync(path.join(repoRoot, "apps/web/app/cockpit/journal/new/journal-new-form.tsx"), "utf8");
const entryPage = fs.readFileSync(path.join(repoRoot, "apps/web/app/cockpit/journal/[entryId]/page.tsx"), "utf8");
const editor = fs.readFileSync(path.join(repoRoot, "apps/web/app/cockpit/journal/[entryId]/journal-entry-editor.tsx"), "utf8");
const createRoute = fs.readFileSync(path.join(repoRoot, "apps/web/app/api/cockpit/journal/route.ts"), "utf8");
const weekDataRoute = fs.readFileSync(path.join(repoRoot, "apps/web/app/api/cockpit/journal/week-data/route.ts"), "utf8");
const saveRoute = fs.readFileSync(path.join(repoRoot, "apps/web/app/api/cockpit/journal/[id]/route.ts"), "utf8");
const scanRoute = fs.readFileSync(path.join(repoRoot, "apps/web/app/api/cockpit/journal/[id]/scan/route.ts"), "utf8");
const submitRoute = fs.readFileSync(path.join(repoRoot, "apps/web/app/api/cockpit/journal/[id]/submit/route.ts"), "utf8");
const retractRoute = fs.readFileSync(path.join(repoRoot, "apps/web/app/api/cockpit/journal/[id]/retract/route.ts"), "utf8");
const loader = fs.readFileSync(path.join(repoRoot, "apps/web/lib/journal/load.ts"), "utf8");
const compliance = fs.readFileSync(path.join(repoRoot, "apps/web/lib/journal/compliance.ts"), "utf8");
const rules = fs.readFileSync(path.join(repoRoot, "apps/web/lib/compliance-scanner/rules.ts"), "utf8");
const layout = fs.readFileSync(path.join(repoRoot, "apps/web/app/cockpit/layout.tsx"), "utf8");

describe("Model Journal cockpit route", () => {
  it("ships a cockpit landing page with the required sections", () => {
    expect(page).toContain("Model Journal");
    expect(page).toContain("Operator Workspace");
    expect(page).toContain("Drafts Pending Review");
    expect(page).toContain("Published Entries");
    expect(page).toContain("Retracted Entries");
    expect(page).toContain('href="/cockpit/journal/new"');
    expect(page).toContain("Create draft");
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
    expect(editor).toContain("Submit for review");
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

  it("creates manual draft Journal entries without public distribution", () => {
    expect(newPage).toContain("Create Draft");
    expect(newPage).toContain("JournalNewForm");
    expect(newForm).toContain('fetch("/api/cockpit/journal"');
    expect(newForm).toContain("Create draft");
    expect(createRoute).toMatch(/from\s+["']@\/lib\/auth["']/);
    expect(createRoute).toMatch(/role\s*!==\s*"ADMIN"/);
    expect(createRoute).toContain("MODEL_VERSION");
    expect(createRoute).toContain("loadModelJournalWeekData");
    expect(createRoute).toContain("composeJournalDraftMarkdown");
    expect(createRoute).toContain("modelJournalEntry.create");
    expect(createRoute).toContain('status: "DRAFT"');
    expect(createRoute).toContain("referencedPickIds: []");
    expect(createRoute).toContain("externalDistribution: false");
    expect(createRoute).not.toMatch(/publishedAt\s*:\s*new Date|status:\s*"PUBLISHED"|twitterClient|sendgrid|mailchimp/i);
  });

  it("previews weekly Journal evidence from the draft creation form", () => {
    expect(newForm).toContain("loadEvidencePreview");
    expect(newForm).toContain("/api/cockpit/journal/week-data");
    expect(newForm).toContain("Load evidence");
    expect(newForm).toContain("settledPicks");
    expect(newForm).toContain("publicLossAutopsies");
    expect(weekDataRoute).toMatch(/from\s+["']@\/lib\/auth["']/);
    expect(weekDataRoute).toMatch(/role\s*!==\s*"ADMIN"/);
    expect(weekDataRoute).toContain("loadModelJournalWeekData");
    expect(weekDataRoute).toContain("externalDistribution: false");
    expect(weekDataRoute).not.toMatch(/modelJournalEntry\.create|modelJournalEntry\.update|twitterClient|sendgrid|mailchimp/i);
  });

  it("wires Journal compliance scan before publish transitions exist", () => {
    expect(editor).toContain("runComplianceScan");
    expect(editor).toContain('method: "POST"');
    expect(editor).toContain("Compliance:");
    expect(scanRoute).toMatch(/from\s+["']@\/lib\/auth["']/);
    expect(scanRoute).toMatch(/role\s*!==\s*"ADMIN"/);
    expect(scanRoute).toContain("scanModelJournalMarkdown");
    expect(scanRoute).not.toMatch(/modelJournalEntry\.update|twitterClient|sendgrid|mailchimp/i);
    expect(compliance).toContain('getRulesForTemplate("MODEL_JOURNAL")');
    expect(rules).toContain("MJ-FIRST-PERSON-CONFIDENCE");
  });

  it("wires a compliance-gated review-pending transition without public distribution", () => {
    expect(editor).toContain("submitForReview");
    expect(editor).toContain("/submit");
    expect(submitRoute).toMatch(/from\s+["']@\/lib\/auth["']/);
    expect(submitRoute).toMatch(/role\s*!==\s*"ADMIN"/);
    expect(submitRoute).toContain("scanModelJournalMarkdown");
    expect(submitRoute).toContain("compliance.publishAllowed");
    expect(submitRoute).toContain('status: "REVIEW_PENDING"');
    expect(submitRoute).not.toMatch(/publishedAt\s*:\s*new Date|status:\s*"PUBLISHED"|twitterClient|sendgrid|mailchimp/i);
  });

  it("wires published-entry retraction without outbound distribution", () => {
    expect(entryPage).toContain("status={entry.status}");
    expect(editor).toContain("retractEntry");
    expect(editor).toContain("/retract");
    expect(editor).toContain("Retraction reason");
    expect(retractRoute).toMatch(/from\s+["']@\/lib\/auth["']/);
    expect(retractRoute).toMatch(/role\s*!==\s*"ADMIN"/);
    expect(retractRoute).toContain('entry.status !== "PUBLISHED"');
    expect(retractRoute).toContain('status: "RETRACTED"');
    expect(retractRoute).toContain("retractedAt: new Date()");
    expect(retractRoute).toContain("retractionReason: reason");
    expect(retractRoute).toContain("externalDistribution: false");
    expect(retractRoute).not.toMatch(/publishedAt\s*:\s*new Date|status:\s*"PUBLISHED"|twitterClient|sendgrid|mailchimp/i);
  });

  it("adds the Journal route to cockpit navigation", () => {
    expect(layout).toContain('href: "/cockpit/journal"');
    expect(layout).toContain("Weekly model essay");
  });
});
