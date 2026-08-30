import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(__dirname, "..", "..", "..");
const schema = fs.readFileSync(path.join(repoRoot, "packages/db/prisma/schema.prisma"), "utf8");
const migration = fs.readFileSync(
  path.join(repoRoot, "packages/db/prisma/migrations/20260523002500_add_model_journal_entries/migration.sql"),
  "utf8"
);
const modelBlock = schema.match(/model ModelJournalEntry \{[\s\S]*?\n\}/)?.[0] ?? "";

describe("Model Journal schema", () => {
  it("persists weekly journal drafts with immutable public-state fields", () => {
    expect(schema).toContain("enum ModelJournalEntryStatus");
    expect(modelBlock).toContain("isoWeek");
    expect(modelBlock).toContain("isoYear");
    expect(modelBlock).toContain("bodyMarkdown");
    expect(modelBlock).toContain("publishedAt");
    expect(modelBlock).toContain("retractedAt");
    expect(modelBlock).toContain("@@unique([isoYear, isoWeek])");
    expect(modelBlock).toContain("@@map(\"model_journal_entries\")");
  });

  it("ships the forward migration for the journal table and indexes", () => {
    expect(migration).toContain("CREATE TYPE \"ModelJournalEntryStatus\"");
    expect(migration).toContain("CREATE TABLE \"model_journal_entries\"");
    expect(migration).toContain("model_journal_entries_slug_key");
    expect(migration).toContain("model_journal_entries_isoYear_isoWeek_key");
  });
});
