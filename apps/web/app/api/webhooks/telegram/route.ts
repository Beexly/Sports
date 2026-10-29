import { NextResponse } from "next/server";
import { sendTelegramMessage } from "@/lib/integrations/telegram";
import { LIVE_PACKAGE_CATALOG } from "@/lib/packages/catalog";
import { LIVE_SLATE_COACH_WRITEUPS } from "@/lib/writeups/coach-writeup-engine";
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
          `Calibrated tactical edge with zero subscription lock-in. Tamper-evident receipts sealed before kickoff.`,
          ``,
          `*Available Commands:*`,
          `• \`/picks\` — Game Environment & Pace Teaser (VIP: Official Side & Total Calls)`,
          `• \`/props\` — N_eff Target Concentration Teaser (VIP: Exact Prop Lines & Directions)`,
          `• \`/parlays\` — Correlated SGP Edge Summary (VIP: Full Multi-Leg Tickets)`,
          `• \`/dfs\` — Slate Ownership & Stack Thesis (VIP: Captain, Cash Core & GPP Stacks)`,
          `• \`/packages\` — Purchase Instant A-La-Carte Slate Packages`,
          `• \`/unlock <sessionId | whopToken>\` — Verify purchase & unlock VIP picks in this chat`,
          ``,
          `Status: ${vipUnlocked ? "🔓 *VIP UNLOCKED*" : "🔒 *FREE TEASER TIER (Use /packages or /unlock)*"}`,
        ].join("\n");
        break;
      }

      case "/picks": {
        if (!vipUnlocked) {
          const teaserList = LIVE_SLATE_COACH_WRITEUPS.map((w) => {
            return [
              `🏈 *${w.matchup}* (${w.windowSlot})`,
              `• Neutral Pace: *${w.paceOfPlay.neutralSecPerSnap}s/snap* · Pass EPA: *${w.paceOfPlay.passEpaPlay > 0 ? `+${w.paceOfPlay.passEpaPlay}` : w.paceOfPlay.passEpaPlay}*`,
              `• Scheme Read: _${w.schemeMatchup.coverageShell}_`,
              `• Side Call: 🔒 *[LOCKED — Conf ${w.sideTotalCall.sideConfidence} · +${(w.sideTotalCall.sideExpectedClv * 100).toFixed(1)}c CLV]*`,
              `• Total Call: 🔒 *[LOCKED — Conf ${w.sideTotalCall.totalConfidence} · +${(w.sideTotalCall.totalExpectedClv * 100).toFixed(1)}c CLV]*`,
            ].join("\n");
          }).join("\n\n");

          reply = [
            `🎯 *GSE Slate Environment & Pace Teaser (Picks Locked)*`,
            ``,
            teaserList,
            ``,
            `🔒 *Official Side & Total selections are gated to package buyers.*`,
            `👉 *Unlock Instant Package ($25–$35):* https://www.galaxysportsedge.com/packages`,
            `🔑 _Already purchased? Reply_ \`/unlock <your_stripe_session_id>\``,
          ].join("\n");
        } else {
          const picksList = LIVE_SLATE_COACH_WRITEUPS.map((w) => {
            return [
              `🏈 *${w.matchup}* (${w.windowSlot})`,
              `• Side: *${w.sideTotalCall.sideSelection}* (Conf: *${w.sideTotalCall.sideConfidence}* · +${(w.sideTotalCall.sideExpectedClv * 100).toFixed(1)}c)`,
              `• Total: *${w.sideTotalCall.totalSelection}* (Conf: *${w.sideTotalCall.totalConfidence}* · +${(w.sideTotalCall.totalExpectedClv * 100).toFixed(1)}c)`,
            ].join("\n");
          }).join("\n\n");

          reply = [
            `🔓 *VIP UNLOCKED — GSE Official Slate Picks*`,
            ``,
            picksList,
          ].join("\n");
        }
        break;
      }

      case "/props": {
        if (!vipUnlocked) {
          const propTeasers = LIVE_SLATE_COACH_WRITEUPS.map((w) => {
            return [
              `📊 *${w.matchup}* (${w.windowSlot}) — *${w.topProps.length} Cleared Positive-CLV Props*`,
              ...w.topProps.map(
                (p, idx) =>
                  `  • Prop #${idx + 1} (${p.propType}): 🔒 *[PLAYER, DIRECTION & LINE LOCKED — Conf ${p.confidence} · +${(p.expectedClv * 100).toFixed(1)}c CLV]*`,
              ),
            ].join("\n");
          }).join("\n\n");

          reply = [
            `📊 *GSE Player Prop N_eff Target Concentration Teaser (Locked)*`,
            ``,
            propTeasers,
            ``,
            `🔒 *Player names, Over/Under directions, and lines require package unlock.*`,
            `👉 *Unlock Now:* https://www.galaxysportsedge.com/packages`,
            `🔑 _Reply_ \`/unlock <your_stripe_session_id>\` _after checkout._`,
          ].join("\n");
        } else {
          const propsList = LIVE_SLATE_COACH_WRITEUPS.flatMap((w) => w.topProps)
            .slice(0, 5)
            .map(
              (p) =>
                `• *${p.playerName}* ${p.side} ${p.line} ${p.propType}\n  Confidence: *${p.confidence}* · CLV: +${(p.expectedClv * 100).toFixed(1)}c\n  _${p.nEffTargetNotes}_`,
            )
            .join("\n\n");

          reply = [
            `🔓 *VIP UNLOCKED — Top Player Props · N_eff Volume Edges:*`,
            ``,
            propsList,
          ].join("\n");
        }
        break;
      }

      case "/parlays": {
        if (!vipUnlocked) {
          const sgpTeasers = LIVE_SLATE_COACH_WRITEUPS.map((w) => {
            const ticket = w.correlatedSgpTicket;
            return [
              `🔥 *${w.matchup} — Correlated SGP Structure*`,
              `• Legs: 🔒 *[${ticket.legs.length} Correlated Legs LOCKED]*`,
              `• Pricing Edge: Fair *${ticket.fairOdds}* vs Market *${ticket.marketOdds}* (+${(ticket.edgeScore * 100).toFixed(1)}% Copula Edge)`,
            ].join("\n");
          }).join("\n\n");

          reply = [
            `🎲 *Correlated Same Game Parlay (SGP) Edge Preview (Locked)*`,
            ``,
            sgpTeasers,
            ``,
            `🔒 *Exact SGP legs are gated to package buyers.*`,
            `👉 *Unlock Now:* https://www.galaxysportsedge.com/packages`,
          ].join("\n");
        } else {
          const parlayList = LIVE_SLATE_COACH_WRITEUPS.map((w) => {
            const ticket = w.correlatedSgpTicket;
            const legs = ticket.legs.map((l) => `  - ${l.description} (Conf: *${l.confidence}*)`).join("\n");
            return [
              `🔥 *${ticket.title}*`,
              legs,
              `Odds: Fair *${ticket.fairOdds}* vs Market *${ticket.marketOdds}* (Edge: +${(ticket.edgeScore * 100).toFixed(1)}%)`,
              `_${ticket.correlationRationale}_`,
            ].join("\n");
          }).join("\n\n");

          reply = [
            `🔓 *VIP UNLOCKED — Correlated Same Game Parlays (SGP):*`,
            ``,
            parlayList,
          ].join("\n");
        }
        break;
      }

      case "/dfs": {
        if (!vipUnlocked) {
          const dfsTeasers = LIVE_SLATE_COACH_WRITEUPS.slice(0, 3).map((w) => {
            return [
              `⚡ *${w.matchup} (${w.windowSlot}) DFS Architecture:*`,
              `• Captain (1.5x): 🔒 *[LOCKED]*`,
              `• Cash Core (${w.dfsStacks.cashCore.length} Players): 🔒 *[LOCKED]*`,
              `• GPP Leverage Stack: 🔒 *[QB + Pass Catchers + Bring-Back LOCKED]*`,
            ].join("\n");
          }).join("\n\n");

          reply = [
            `💼 *GSE DFS Pro Lineup & Leverage Preview (Locked)*`,
            ``,
            dfsTeasers,
            ``,
            `🔒 *Unlock the Sunday DFS Pro 20-Max Pack ($29) or All-In Package:*`,
            `👉 https://www.galaxysportsedge.com/packages`,
          ].join("\n");
        } else {
          const dfsItems = LIVE_SLATE_COACH_WRITEUPS.slice(0, 3).map((w) => {
            const cap = w.dfsStacks.captainPicks[0];
            const gpp = w.dfsStacks.gppStacks[0];
            return [
              `⚡ *${w.matchup} DFS Blueprint:*`,
              `• Captain: *${cap?.player}* (${cap?.position}) — ${cap?.leverageNote}`,
              `• GPP: *${gpp?.primaryStack.qb}* + ${gpp?.primaryStack.passCatchers.join(", ")} (Bring: *${gpp?.bringBack}*)`,
            ].join("\n");
          }).join("\n\n");

          reply = [
            `🔓 *VIP UNLOCKED — DFS Pro Lineup Recommendations:*`,
            ``,
            dfsItems,
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
          `📦 *Available A-La-Carte Pick Packages:*`,
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
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Telegram webhook error" },
      { status: 500 },
    );
  }
}
