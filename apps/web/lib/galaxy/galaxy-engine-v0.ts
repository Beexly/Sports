/**
 * Galaxy Engine v0 (bible Phase 7) — minimal AI live-ops scaffold.
 *
 * Detects a sports trigger (e.g. an upset) from finished games and proposes a
 * quest/event plus a compliant Higgsfield asset brief. Generated content is
 * owner-approval gated (`approved: false`) — nothing AI-proposed goes live
 * without a human (bible §Phase 7 / §4.5). Pure + deterministic; the cron/wiring
 * that feeds it real games is a logged roadmap item.
 */

import { buildAssetBrief, assertBrandSafe, type AssetBrief } from "@sports/galaxy-engine";

export interface FinishedGame {
  readonly id: string;
  readonly sportKey: string;
  readonly homeTeam: string;
  readonly awayTeam: string;
  readonly homeScore: number;
  readonly awayScore: number;
  /** Home-perspective closing spread (negative = home favored). */
  readonly closingSpread: number;
}

export type TriggerKind = "UPSET" | "BLOWOUT" | "SHOOTOUT";

export interface SportsTrigger {
  readonly kind: TriggerKind;
  readonly gameId: string;
  readonly sportKey: string;
  readonly matchup: string;
  readonly detail: string;
}

/** Detect live-ops triggers from finished games. Deterministic + pure. */
export function detectTriggers(games: readonly FinishedGame[]): SportsTrigger[] {
  const triggers: SportsTrigger[] = [];
  for (const g of games) {
    const matchup = `${g.awayTeam} @ ${g.homeTeam}`;
    const margin = g.homeScore - g.awayScore;
    const total = g.homeScore + g.awayScore;
    const homeWasFavored = g.closingSpread < 0;
    const homeWon = margin > 0;

    // Upset: the favorite lost outright by more than a field goal of cushion.
    if (Math.abs(g.closingSpread) >= 3 && homeWasFavored !== homeWon) {
      triggers.push({
        kind: "UPSET",
        gameId: g.id,
        sportKey: g.sportKey,
        matchup,
        detail: `The ${Math.abs(g.closingSpread)}-point favorite went down. The crowd's read collapsed.`,
      });
      continue;
    }
    // Blowout.
    if (Math.abs(margin) >= 21) {
      triggers.push({
        kind: "BLOWOUT",
        gameId: g.id,
        sportKey: g.sportKey,
        matchup,
        detail: `A ${Math.abs(margin)}-point statement. Momentum swung hard.`,
      });
      continue;
    }
    // Shootout.
    if (total >= 55) {
      triggers.push({
        kind: "SHOOTOUT",
        gameId: g.id,
        sportKey: g.sportKey,
        matchup,
        detail: `${total} combined points — a true shootout.`,
      });
    }
  }
  return triggers;
}

export interface GeneratedQuestDraft {
  readonly key: string;
  readonly title: string;
  readonly description: string;
  readonly surface: "WAR_ROOM" | "DEPTHS" | "BLACKTOP";
  readonly sportKey: string;
  readonly rewardCredits: number;
  readonly rewardXp: number;
  /** Owner-approval gate (bible §Phase 7) — never auto-published. */
  readonly approved: false;
  readonly generated: true;
}

export interface GeneratedEvent {
  readonly trigger: SportsTrigger;
  readonly quest: GeneratedQuestDraft;
  readonly assetBrief: AssetBrief;
}

const TITLE: Record<TriggerKind, string> = {
  UPSET: "Reading the Upset",
  BLOWOUT: "Riding the Surge",
  SHOOTOUT: "Pace & the Total",
};

/** Propose a quest + Higgsfield brief from a trigger. Owner-approval gated. */
export function generateEvent(trigger: SportsTrigger): GeneratedEvent {
  const title = `${TITLE[trigger.kind]} — ${trigger.matchup}`;
  const description = `${trigger.detail} Run a Signal Check on what it means going forward.`;
  // Brand safety on generated copy before it can ever reach an approval queue.
  assertBrandSafe(`${title} ${description}`, "generated quest");

  const quest: GeneratedQuestDraft = {
    key: `gen-${trigger.kind.toLowerCase()}-${trigger.gameId}`,
    title,
    description,
    surface: trigger.kind === "UPSET" ? "DEPTHS" : "WAR_ROOM",
    sportKey: trigger.sportKey,
    rewardCredits: 75,
    rewardXp: 110,
    approved: false,
    generated: true,
  };

  const assetBrief = buildAssetBrief({
    kind: "ui_scene",
    subject: `${TITLE[trigger.kind]} event scene for ${trigger.matchup}`,
    directives: ["dramatic momentum, scoreboard-as-stat-geometry, night arena energy"],
    seed: `event:${trigger.kind}:${trigger.gameId}`,
  });

  return { trigger, quest, assetBrief };
}
