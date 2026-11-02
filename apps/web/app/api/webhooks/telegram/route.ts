import { NextResponse } from "next/server";
import { sendTelegramMessage } from "@/lib/integrations/telegram";
import { LIVE_PACKAGE_CATALOG } from "@/lib/packages/catalog";
import { LIVE_SLATE_COACH_WRITEUPS, LIVE_WEEK8_2026_BOARD } from "@/lib/writeups/coach-writeup-engine";
import { verifyPackagePurchase } from "@/lib/packages/verify-purchase";

/**
 * Server-side verified Telegram buyer chat ledger.
 * A chatId is ONLY added here after passing `verifyPackagePurchase` via `/unlock <token>`.
 */
const VERIFIED_VIP_CHAT_IDS = new Set<string>();

export function isTelegramChatUnlocked(chatId: string): boolean {
  return VERIFIED_VIP_CHAT_IDS.has(String(chatId));
}

export async function POST(req: Request) {
  try {
    const update = await req.json().catch(() => ({}));
    const message = update.message || update.edited_message;

    if (!message || !message.chat || !message.text) {
      return NextResponse.json({ ok: true, note: "No text message in update." });
    }

    const chatId = String(message.chat.id);
    const text = message.text.trim();
    const [command, ...args] = text.split(/\s+/);
    const cleanCmd = (command || "").toLowerCase();
    const vipUnlocked = isTelegramChatUnlocked(chatId);

    let reply = "";

    switch (cleanCmd) {
      case "/start": {
        reply = [
          `🌌 *Welcome to Galaxy Sports Edge (GSE) Intelligence Bot*`,
          `Calibrated tactical edge with no subscription required. Tamper-evident receipts sealed before kickoff.`,
          ``,
          `*Available Commands:*`,
          `• \`/picks\` — Game Environment & Pace Teaser (VIP: Official Side & Total Calls)`,
          `• \`/props\` — N_eff Target Concentration Teaser (VIP: Exact Prop Lines & Directions)`,
          `• \`/parlays\` — Correlated SGP Edge Summary (VIP: Full Multi-Leg Tickets)`,
          `• \`/dfs\` — Slate Ownership & Stack Thesis (VIP: Captain, Cash Core & GPP Stacks)`,
          `• \`/packages\` — Purchase Galaxy Picks`,
          `• \`/unlock <sessionId | whopToken>\` — Verify purchase & unlock VIP picks in this chat`,
          ``,
          `Status: ${vipUnlocked ? "🔓 *VIP UNLOCKED*" : "🔒 *FREE TEASER TIER (Use /packages or /unlock)*"}`,
        ].join("\n");
        break;
      }

      case "/picks": {
        if (!vipUnlocked) {
          const teaserList = LIVE_WEEK8_2026_BOARD.slice(0, 6).map((w) =>
            [
              `🏈 *${w.matchup}* (${w.windowSlot})`,
              `• Posted: *${w.postedDetails}* · Total *${w.postedTotal}*`,
              `• 🔒 *[LOCKED — Official 10,000-Sim Side & Total Calls]*`,
            ].join("\n"),
          ).join("\n\n");
          reply = [
            `🎯 *Week 8 Game Environment Teaser (LOCKED)*`,
            ``,
            teaserList,
            ``,
            `🔒 *Unlock Official Calibrated Picks:*`,
            `👉 https://www.galaxysportsedge.com/packages`,
          ].join("\n");
        } else {
          const vipList = LIVE_SLATE_COACH_WRITEUPS.slice(0, 6).map((w) =>
            [
              `🏈 *${w.matchup}* (${w.windowSlot})`,
              `• Official Side: *${w.sideTotalCall.sideSelection}* (Conf: *${w.sideTotalCall.sideConfidence}*, +${(w.sideTotalCall.sideExpectedClv * 100).toFixed(1)}% CLV)`,
              `• Official Total: *${w.sideTotalCall.totalSelection}* (Conf: *${w.sideTotalCall.totalConfidence}*, +${(w.sideTotalCall.totalExpectedClv * 100).toFixed(1)}% CLV)`,
              `• Pace & Scheme: ${w.paceOfPlay.neutralSecPerSnap}s/snap · ${w.schemeMatchup.coverageShell}`,
            ].join("\n"),
          ).join("\n\n");
          reply = [
            `🔓 *VIP UNLOCKED — Official 2026 Week 8 10,000-Sim Game Picks*`,
            ``,
            vipList,
          ].join("\n");
        }
        break;
      }

      case "/props": {
        if (!vipUnlocked) {
          reply = [
            `🎯 *Week 8 N_eff Player Props Teaser (LOCKED)*`,
            `• 42 Calibrated Receiving, Rushing & Passing Props across 14 Week 8 Games`,
            `• 🔒 *[LOCKED — Verify with /unlock or purchase at https://www.galaxysportsedge.com/packages]*`,
          ].join("\n");
        } else {
          const propLines = LIVE_SLATE_COACH_WRITEUPS.slice(0, 5).map((w) => {
            const p = w.topProps[0]!;
            return `• *${w.matchup}*: *${p.playerName} ${p.side} ${p.line} ${p.propType}* (Conf: *${p.confidence}*) — ${p.nEffTargetNotes}`;
          }).join("\n");
          reply = [
            `🔓 *VIP UNLOCKED — Official N_eff Player Props*`,
            ``,
            propLines,
          ].join("\n");
        }
        break;
      }

      case "/parlays":
      case "/dfs": {
        if (!vipUnlocked) {
          reply = [
            `🔒 *LOCKED — Verify purchase with /unlock or at https://www.galaxysportsedge.com/packages*`,
          ].join("\n");
        } else {
          const tnf = LIVE_SLATE_COACH_WRITEUPS[0]!;
          reply = [
            `🔓 *VIP UNLOCKED — ${tnf.matchup} SGP & DFS Dossier*`,
            `• SGP (${tnf.correlatedSgpTicket.fairOdds} Fair vs ${tnf.correlatedSgpTicket.marketOdds} Market): ${tnf.correlatedSgpTicket.legs.map((l) => l.selection).join(" + ")}`,
            `• Captain: ${tnf.dfsStacks.captainPicks.map((c) => c.player).join(", ")}`,
          ].join("\n");
        }
        break;
      }

      case "/packages": {
        const packageList = LIVE_PACKAGE_CATALOG.map((p) => {
          const price = (p.standardPriceCents / 100).toFixed(2);
          return `• *${p.title}* ($${price})\n  ${p.description}\n  👉 https://www.galaxysportsedge.com/packages/${p.slug}`;
        }).join("\n\n");

        reply = [
          `📦 *Available Galaxy Picks:*`,
          ``,
          packageList,
        ].join("\n");
        break;
      }

      case "/unlock": {
        const token = args[0];
        if (!token) {
          reply = `⚠️ Please provide a paid Stripe Session ID or Whop Token:\nUsage: \`/unlock <stripe_session_id_or_whop_token>\``;
          break;
        }

        const check = await verifyPackagePurchase({
          sessionId: token.startsWith("cs_") ? token : null,
          whopToken: !token.startsWith("cs_") ? token : null,
        });

        if (check.authorized) {
          VERIFIED_VIP_CHAT_IDS.add(chatId);
          reply = [
            `🔓 *VIP Access Verified (${check.authSource.toUpperCase()})!*`,
            `Your chat is now unlocked. Type \`/picks\`, \`/props\`, \`/parlays\`, or \`/dfs\` to view all unlocked plays directly in this chat, or open on web:`,
            `👉 https://www.galaxysportsedge.com/packages/tnf-all-in-prime-pack?session_id=${encodeURIComponent(token)}`,
          ].join("\n");
        } else {
          reply = `❌ Token or Session ID could not be verified as paid. Complete checkout at https://www.galaxysportsedge.com/packages first.`;
        }
        break;
      }

      default: {
        reply = `Unknown command. Type \`/start\` to view available GSE commands.`;
        break;
      }
    }

    const result = await sendTelegramMessage(chatId, reply);

    return NextResponse.json({
      ok: true,
      command: cleanCmd,
      vipUnlocked: isTelegramChatUnlocked(chatId),
      delivered: result.ok,
      messageId: result.messageId,
      previewReply: reply,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Telegram webhook error" },
      { status: 500 },
    );
  }
}
