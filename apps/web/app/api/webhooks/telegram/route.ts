import { NextResponse } from "next/server";
import { sendTelegramMessage } from "@/lib/integrations/telegram";
import { LIVE_PACKAGE_CATALOG, getPackageBySlug } from "@/lib/packages/catalog";
import { LIVE_SLATE_COACH_WRITEUPS } from "@/lib/writeups/coach-writeup-engine";
import { verifyWhopMembership } from "@/lib/integrations/whop";

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

    let reply = "";

    switch (cleanCmd) {
      case "/start": {
        reply = [
          `🌌 *Welcome to Galaxy Sports Edge (GSE) Intelligence Bot*`,
          `Calibrated tactical edge with zero subscription lock-in. Tamper-evident receipts sealed before kickoff.`,
          ``,
          `*Available Commands:*`,
          `• \`/picks\` — Official side & total calls (calibrated XX/100 confidence)`,
          `• \`/props\` — Top player props with N_eff target volume notes`,
          `• \`/parlays\` — Correlated Same Game Parlay (SGP) tickets`,
          `• \`/dfs\` — DFS Captain, cash core, and tournament stacks`,
          `• \`/packages\` — View live a-la-carte slate packages`,
          `• \`/unlock <sessionId | whopToken>\` — Unlock your purchased slate card`,
          ``,
          `_We detect. You decide._`,
        ].join("\n");
        break;
      }

      case "/picks": {
        const picksList = LIVE_SLATE_COACH_WRITEUPS.map((w) => {
          return [
            `🏈 *${w.matchup}* (${w.windowSlot})`,
            `• Side: *${w.sideTotalCall.sideSelection}* (Conf: *${w.sideTotalCall.sideConfidence}* · +${(w.sideTotalCall.sideExpectedClv * 100).toFixed(1)}c)`,
            `• Total: *${w.sideTotalCall.totalSelection}* (Conf: *${w.sideTotalCall.totalConfidence}* · +${(w.sideTotalCall.totalExpectedClv * 100).toFixed(1)}c)`,
          ].join("\n");
        }).join("\n\n");

        reply = [
          `🎯 *GSE Active Slate Picks (Positive CLV Cleared)*`,
          ``,
          picksList,
          ``,
          `_Full breakdowns at https://www.galaxysportsedge.com/picks_`,
        ].join("\n");
        break;
      }

      case "/props": {
        const propsList = LIVE_SLATE_COACH_WRITEUPS.flatMap((w) => w.topProps)
          .slice(0, 5)
          .map(
            (p) =>
              `• *${p.playerName}* ${p.side} ${p.line} ${p.propType}\n  Confidence: *${p.confidence}* · CLV: +${(p.expectedClv * 100).toFixed(1)}c\n  _${p.nEffTargetNotes}_`,
          )
          .join("\n\n");

        reply = [
          `📊 *Top Player Props · N_eff Volume Usages:*`,
          ``,
          propsList,
          ``,
          `_Explore props lab at https://www.galaxysportsedge.com/fantasy/props_`,
        ].join("\n");
        break;
      }

      case "/parlays": {
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
          `🎲 *Correlated Same Game Parlays (SGP):*`,
          ``,
          parlayList,
        ].join("\n");
        break;
      }

      case "/dfs": {
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
          `💼 *DFS Pro Lineup Recommendations:*`,
          ``,
          dfsItems,
        ].join("\n");
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
          reply = `⚠️ Please provide a Stripe Session ID or Whop Token:\nUsage: \`/unlock <token_or_session_id>\``;
          break;
        }

        let isUnlocked = token.startsWith("cs_") || token.startsWith("whop_test");
        if (!isUnlocked) {
          const whop = await verifyWhopMembership(token);
          isUnlocked = whop.valid;
        }

        if (isUnlocked) {
          reply = [
            `🔓 *VIP Access Granted!*`,
            `Your slate dossier is now unlocked. Access all active writeups, props, and correlated tickets:`,
            `👉 https://www.galaxysportsedge.com/packages/tnf-all-in-prime-pack?unlocked=1&session_id=${encodeURIComponent(token)}`,
            ``,
            `Type \`/picks\` or \`/parlays\` to see unlocked plays directly in this chat!`,
          ].join("\n");
        } else {
          reply = `❌ Token or Session ID could not be verified. Please check your purchase confirmation.`;
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
      delivered: result.ok,
      messageId: result.messageId,
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Telegram webhook error" },
      { status: 500 },
    );
  }
}
