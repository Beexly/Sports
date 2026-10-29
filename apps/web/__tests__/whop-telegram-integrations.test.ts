import { describe, it, expect } from "vitest";
import { createHmac } from "node:crypto";
import {
  verifyWhopWebhookSignature,
  verifyWhopMembership,
} from "@/lib/integrations/whop";
import {
  formatTelegramSlateBroadcast,
  sendTelegramMessage,
} from "@/lib/integrations/telegram";
import { LIVE_PACKAGE_CATALOG } from "@/lib/packages/catalog";
import { LIVE_SLATE_COACH_WRITEUPS } from "@/lib/writeups/coach-writeup-engine";
import { POST as whopWebhookRoute } from "@/app/api/webhooks/whop/route";
import { POST as telegramWebhookRoute } from "@/app/api/webhooks/telegram/route";

describe("Whop & Telegram Integrations Suite", () => {
  const secret = "test_whop_secret_key_12345";
  const pkg = LIVE_PACKAGE_CATALOG[0]!;
  const writeup = LIVE_SLATE_COACH_WRITEUPS[0]!;

  describe("Whop Webhook Signature & Membership Verification", () => {
    it("verifies authentic HMAC-SHA256 signatures and rejects tampered bodies or wrong secrets", () => {
      const rawPayload = JSON.stringify({ action: "payment.succeeded", id: "pay_1" });
      const validSig = createHmac("sha256", secret).update(rawPayload).digest("hex");

      // Authentic signature
      expect(verifyWhopWebhookSignature(rawPayload, validSig, secret)).toBe(true);

      // Header with v1= prefix
      expect(verifyWhopWebhookSignature(rawPayload, `v1=${validSig}`, secret)).toBe(true);

      // Tampered body
      expect(verifyWhopWebhookSignature(rawPayload + "tampered", validSig, secret)).toBe(false);

      // Wrong secret
      expect(verifyWhopWebhookSignature(rawPayload, validSig, "wrong_secret")).toBe(false);

      // Missing signature
      expect(verifyWhopWebhookSignature(rawPayload, null, secret)).toBe(false);
    });

    it("verifies Whop membership tokens properly", async () => {
      const valid = await verifyWhopMembership("whop_test_valid_membership");
      expect(valid.valid).toBe(true);

      const invalid = await verifyWhopMembership("whop_test_invalid_token");
      expect(invalid.valid).toBe(false);

      const empty = await verifyWhopMembership("");
      expect(empty.valid).toBe(false);
    });

    it("POST /api/webhooks/whop processes payment.succeeded and membership.went_valid events", async () => {
      const paymentEvent = {
        action: "payment.succeeded",
        data: {
          user_id: "user_whop_99",
          email: "buyer@example.com",
          product_id: "prod_whop_tnf",
          amount: 2500,
        },
      };

      const resPayment = await whopWebhookRoute(
        new Request("http://localhost/api/webhooks/whop", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(paymentEvent),
        }),
      );
      expect(resPayment.status).toBe(200);
      const dataPayment = await resPayment.json();
      expect(dataPayment.action).toBe("payment.unlocked");
      expect(dataPayment.userId).toBe("user_whop_99");
      expect(dataPayment.amountCents).toBe(2500);

      const membershipEvent = {
        action: "membership.went_valid",
        data: {
          id: "mem_100",
          user_id: "user_whop_99",
          plan_id: "plan_vip",
        },
      };

      const resMem = await whopWebhookRoute(
        new Request("http://localhost/api/webhooks/whop", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(membershipEvent),
        }),
      );
      expect(resMem.status).toBe(200);
      const dataMem = await resMem.json();
      expect(dataMem.action).toBe("membership.granted");
      expect(dataMem.membershipId).toBe("mem_100");
    });
  });

  describe("Telegram Formatting & Bot Webhook", () => {
    it("formats Telegram FREE_TEASER message without exposing locked confidence numbers", () => {
      const teaser = formatTelegramSlateBroadcast(pkg, writeup, "FREE_TEASER");

      expect(teaser).toContain("GSE SLATE TEASER");
      expect(teaser).toContain(writeup.matchup);
      expect(teaser).toContain(`${writeup.paceOfPlay.neutralSecPerSnap}s`);
      expect(teaser).toContain(writeup.schemeMatchup.coverageShell);
      expect(teaser).toContain("/packages/" + pkg.slug);
      expect(teaser).not.toContain("OFFICIAL CALIBRATED PICKS");
      expect(teaser).not.toMatch(/confidence:\s*\*\d+/i);
    });

    it("formats Telegram VIP_FULL_UNLOCK with XX/100 confidence (NEVER %) and complete tactical data", () => {
      const vip = formatTelegramSlateBroadcast(pkg, writeup, "VIP_FULL_UNLOCK");

      expect(vip).toContain("VIP UNLOCKED DOSSIER");
      expect(vip).toContain(writeup.sideTotalCall.sideSelection);
      expect(vip).toContain(writeup.sideTotalCall.sideConfidence);
      expect(vip).toContain(writeup.sideTotalCall.totalSelection);
      expect(vip).toContain(writeup.sideTotalCall.totalConfidence);
      expect(vip).toContain("N_eff");
      expect(vip).toContain(writeup.correlatedSgpTicket.title);
      expect(vip).toContain("DFS BLUEPRINT");

      // STRICT DOCTRINE CHECK: confidence must NEVER be formatted as %
      expect(vip).toContain(`${writeup.sideTotalCall.sideConfidence}`);
      expect(vip).toMatch(/\b\d{1,3}\/100\b/);
      expect(vip).not.toMatch(/confidence:\s*\*\d+%/i);
      expect(vip).not.toContain("%*");
    });

    it("sendTelegramMessage delivers deterministic mock in dev/test mode", async () => {
      const res = await sendTelegramMessage("12345678", "Test broadcast message");
      expect(res.ok).toBe(true);
      expect(res.messageId).toBeDefined();
    });

    it("POST /api/webhooks/telegram strictly gates /picks, /props, /parlays, /dfs until /unlock is verified", async () => {
      const chatId = 987654321;

      // /start
      const resStart = await telegramWebhookRoute(
        new Request("http://localhost/api/webhooks/telegram", {
          method: "POST",
          body: JSON.stringify({
            update_id: 1,
            message: { chat: { id: chatId }, text: "/start" },
          }),
        }),
      );
      expect(resStart.status).toBe(200);
      const dataStart = await resStart.json();
      expect(dataStart.command).toBe("/start");
      expect(dataStart.vipUnlocked).toBe(false);

      // /picks BEFORE unlock -> MUST BE LOCKED (no sideSelection leaked)
      const resPicksLocked = await telegramWebhookRoute(
        new Request("http://localhost/api/webhooks/telegram", {
          method: "POST",
          body: JSON.stringify({
            update_id: 2,
            message: { chat: { id: chatId }, text: "/picks" },
          }),
        }),
      );
      expect(resPicksLocked.status).toBe(200);
      const dataPicksLocked = await resPicksLocked.json();
      expect(dataPicksLocked.command).toBe("/picks");
      expect(dataPicksLocked.vipUnlocked).toBe(false);
      expect(dataPicksLocked.previewReply).toContain("LOCKED");
      expect(dataPicksLocked.previewReply).toContain("https://www.galaxysportsedge.com/packages");
      expect(dataPicksLocked.previewReply).not.toContain(writeup.sideTotalCall.sideSelection);

      // /props BEFORE unlock -> MUST BE LOCKED (no playerName leaked)
      const resPropsLocked = await telegramWebhookRoute(
        new Request("http://localhost/api/webhooks/telegram", {
          method: "POST",
          body: JSON.stringify({
            update_id: 3,
            message: { chat: { id: chatId }, text: "/props" },
          }),
        }),
      );
      expect(resPropsLocked.status).toBe(200);
      const dataPropsLocked = await resPropsLocked.json();
      expect(dataPropsLocked.command).toBe("/props");
      expect(dataPropsLocked.vipUnlocked).toBe(false);
      expect(dataPropsLocked.previewReply).toContain("LOCKED");
      expect(dataPropsLocked.previewReply).not.toContain(writeup.topProps[0]!.playerName);

      // /packages
      const resPackages = await telegramWebhookRoute(
        new Request("http://localhost/api/webhooks/telegram", {
          method: "POST",
          body: JSON.stringify({
            update_id: 4,
            message: { chat: { id: chatId }, text: "/packages" },
          }),
        }),
      );
      expect(resPackages.status).toBe(200);
      const dataPackages = await resPackages.json();
      expect(dataPackages.command).toBe("/packages");
      expect(dataPackages.previewReply).toContain("https://www.galaxysportsedge.com/packages");

      // /unlock with invalid token -> REJECTED
      const resUnlockBad = await telegramWebhookRoute(
        new Request("http://localhost/api/webhooks/telegram", {
          method: "POST",
          body: JSON.stringify({
            update_id: 5,
            message: { chat: { id: chatId }, text: "/unlock fake_token_999" },
          }),
        }),
      );
      expect(resUnlockBad.status).toBe(200);
      const dataUnlockBad = await resUnlockBad.json();
      expect(dataUnlockBad.vipUnlocked).toBe(false);

      // /unlock with verified token -> UNLOCKS VIP
      const resUnlock = await telegramWebhookRoute(
        new Request("http://localhost/api/webhooks/telegram", {
          method: "POST",
          body: JSON.stringify({
            update_id: 6,
            message: { chat: { id: chatId }, text: "/unlock cs_test_mock_123" },
          }),
        }),
      );
      expect(resUnlock.status).toBe(200);
      const dataUnlock = await resUnlock.json();
      expect(dataUnlock.command).toBe("/unlock");
      expect(dataUnlock.vipUnlocked).toBe(true);

      // /picks AFTER unlock -> UNLOCKED
      const resPicksUnlocked = await telegramWebhookRoute(
        new Request("http://localhost/api/webhooks/telegram", {
          method: "POST",
          body: JSON.stringify({
            update_id: 7,
            message: { chat: { id: chatId }, text: "/picks" },
          }),
        }),
      );
      const dataPicksUnlocked = await resPicksUnlocked.json();
      expect(dataPicksUnlocked.vipUnlocked).toBe(true);
      expect(dataPicksUnlocked.previewReply).toContain(writeup.sideTotalCall.sideSelection);
    });
  });
});
