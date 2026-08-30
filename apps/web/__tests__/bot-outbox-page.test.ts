import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(__dirname, "..", "..", "..");
const page = fs.readFileSync(
  path.join(repoRoot, "apps/web/app/cockpit/bot-outbox/page.tsx"),
  "utf8",
);
const layout = fs.readFileSync(
  path.join(repoRoot, "apps/web/app/cockpit/layout.tsx"),
  "utf8",
);

describe("cockpit bot outbox page", () => {
  it("loads draft outbox items through the bot outbox loader", () => {
    expect(page).toContain("loadBotOutboxDrafts");
    expect(page).toContain("lookbackMinutes: 180");
    expect(page).toContain("limitPerKind: 20");
    expect(page).toContain("Draft Event Planner");
  });

  it("shows draft-only counts and avoids delivery controls", () => {
    expect(page).toContain("Draft items");
    expect(page).toContain("Ready");
    expect(page).toContain("Blocked");
    expect(page).toContain("idempotencyKey");
    expect(page).not.toMatch(/deliverNow|retryNow|webhookUrl|bearerToken|postTo/i);
  });

  it("is discoverable from the cockpit nav", () => {
    expect(layout).toContain('href: "/cockpit/bot-outbox"');
    expect(layout).toContain("Bot Outbox");
  });
});
