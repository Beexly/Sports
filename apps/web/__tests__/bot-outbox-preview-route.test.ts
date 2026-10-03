import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(__dirname, "..", "..", "..");
const route = fs.readFileSync(
  path.join(repoRoot, "apps/web/app/api/cockpit/bot-outbox/preview/route.ts"),
  "utf8",
);

describe("bot outbox preview route", () => {
  it("is admin-gated and accepts only known preview event kinds", () => {
    expect(route).toMatch(/from\s+["']@\/lib\/auth["']/);
    expect(route).toMatch(/role\s*!==\s*["']ADMIN["']/);
    expect(route).toContain("PICK_PUBLICATION");
    expect(route).toContain("SLATE_STATE_GATED");
    expect(route).toContain("SETTLEMENT");
    expect(route).toContain("invalid-event-kind");
  });

  it("uses the draft-only outbox planners and exposes no delivery client", () => {
    expect(route).toContain("loadBotOutboxDrafts");
    expect(route).toContain("planPickPublicationOutbox");
    expect(route).toContain("planSettlementOutbox");
    expect(route).toContain("planGatedSlateOutbox");
    expect(route).toContain("draftOnly");
    expect(route).toContain("externalDelivery");
    expect(route).toContain("persistence");
    expect(route).not.toMatch(/TwitterApi|DiscordApi|webhookUrl|bearerToken|postTo/i);
  });

  it("validates payload shapes before rendering drafts", () => {
    expect(route).toContain("lookbackMinutes");
    expect(route).toContain("limitPerKind");
    expect(route).toContain("parsePickPublicationPayload");
    expect(route).toContain("parseSettlementPayload");
    expect(route).toContain("parseGatedSlatePayload");
    expect(route).toContain("invalid-payload");
    expect(route).toContain("startsWith(\"https://\")");
  });
});
