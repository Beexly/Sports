import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(__dirname, "..", "..", "..");
const schema = fs.readFileSync(path.join(repoRoot, "packages/db/prisma/schema.prisma"), "utf8");
const migration = fs.readFileSync(
  path.join(repoRoot, "packages/db/prisma/migrations/20260523001000_add_creator_assets/migration.sql"),
  "utf8"
);
const route = fs.readFileSync(
  path.join(repoRoot, "apps/web/app/api/cockpit/studio/generate/route.ts"),
  "utf8"
);
const creatorAssetBlock = schema.match(/model CreatorAsset \{[\s\S]*?\n\}/)?.[0] ?? "";

describe("Studio creator asset persistence", () => {
  it("adds the CreatorAsset schema without publish automation fields", () => {
    expect(schema).toContain("model CreatorAsset");
    expect(schema).toContain("enum CreatorAssetKind");
    expect(schema).toContain("enum CreatorAssetComplianceStatus");
    expect(schema).toContain("@@map(\"creator_assets\")");
    expect(schema).toContain("SPONSOR_SAFE_BLURB");
    expect(schema).toContain("YOUTUBE_TITLE_IDEAS");
    expect(creatorAssetBlock).not.toContain("publishedAt");
    expect(creatorAssetBlock).not.toContain("externalPostId");
  });

  it("ships a forward migration for internal Studio draft history", () => {
    expect(migration).toContain("CREATE TABLE \"creator_assets\"");
    expect(migration).toContain("ON DELETE CASCADE");
    expect(migration).toContain("ON DELETE SET NULL");
  });

  it("persists generated drafts while keeping the route export-only", () => {
    expect(route).toContain("db.creatorAsset.create");
    expect(route).toContain("markdownForStudioDraft");
    expect(route).toContain("exportOnly");
    expect(route).not.toMatch(/publishToTwitter|postToSlack|sendgrid|mailchimp/i);
  });
});
