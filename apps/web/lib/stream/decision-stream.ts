/**
 * Public Decision Stream — append-only timeline of every Galaxy decision.
 *
 * Sources:
 *  - Published picks (Pick.isPublished + generatedAt)
 *  - Gated games (GateDecision)
 *  - Settled outcomes (Pick.result + settledAt)
 *  - Model version transitions (Pick.modelVersion change points)
 *
 * Public-safe projection. No methodology fields, no PII. Constitution-
 * aligned: this is what Galaxy did, when, and how.
 */

import { db, isStubMode } from "@sports/db";
import { isFeatureEnabled } from "@/lib/release/feature-flags";

export type DecisionStreamEventKind =
  | "pick-published"
  | "pick-settled"
  | "game-gated"
  | "model-version-bump";

export interface DecisionStreamEvent {
  readonly id: string;
  readonly kind: DecisionStreamEventKind;
  readonly at: string;
  readonly headline: string;
  readonly sub: string;
  readonly accent: "ion-blue" | "amber" | "emerald" | "cyan" | "rose" | "gray";
}

export interface DecisionStreamPayload {
  readonly enabled: boolean;
  readonly events: ReadonlyArray<DecisionStreamEvent>;
  readonly hasMore: boolean;
}

export async function loadDecisionStream(limit = 50): Promise<DecisionStreamPayload> {
  const enabled = isFeatureEnabled("DECISION_STREAM_ENABLED");
  if (!enabled || isStubMode()) {
    return { enabled, events: [], hasMore: false };
  }

  const [published, settled, gated] = await Promise.all([
    db.pick
      .findMany({
        where: { isPublished: true, isBootstrap: false, NOT: { modelVersion: "v5.0.0-seed" } },
        include: { game: { include: { sport: { select: { name: true } } } } },
        orderBy: { generatedAt: "desc" },
        take: limit,
      })
      .catch(() => []),
    db.pick
      .findMany({
        where: {
          isPublished: true,
          isBootstrap: false,
          result: { in: ["WIN", "LOSS", "PUSH"] },
          NOT: { modelVersion: "v5.0.0-seed" },
        },
        include: { game: { include: { sport: { select: { name: true } } } } },
        orderBy: { settledAt: "desc" },
        take: limit,
      })
      .catch(() => []),
    db.gateDecision
      .findMany({
        where: { status: "GATED", isBootstrap: false },
        include: { game: { include: { sport: { select: { name: true } } } } },
        orderBy: { evaluatedAt: "desc" },
        take: limit,
      })
      .catch(() => []),
  ]);

  const events: DecisionStreamEvent[] = [];

  for (const p of published) {
    events.push({
      id: `published-${p.id}`,
      kind: "pick-published",
      at: p.generatedAt.toISOString(),
      headline: `Pick published: ${p.selection}`,
      sub: `${p.game.awayTeamName} @ ${p.game.homeTeamName} · ${p.game.sport.name} · confidence ${p.confidence}`,
      accent: "ion-blue",
    });
  }

  for (const p of settled) {
    if (!p.settledAt) continue;
    events.push({
      id: `settled-${p.id}`,
      kind: "pick-settled",
      at: p.settledAt.toISOString(),
      headline: `Settled ${p.result}: ${p.selection}`,
      sub: `${p.game.awayTeamName} @ ${p.game.homeTeamName} · ${p.game.sport.name}`,
      accent: p.result === "WIN" ? "emerald" : p.result === "LOSS" ? "rose" : "gray",
    });
  }

  for (const g of gated) {
    events.push({
      id: `gated-${g.id}`,
      kind: "game-gated",
      at: g.evaluatedAt.toISOString(),
      headline: `Game gated: ${g.game.awayTeamName} @ ${g.game.homeTeamName}`,
      sub: `${g.game.sport.name} · no pick published — model passed`,
      accent: "amber",
    });
  }

  events.sort((a, b) => (a.at < b.at ? 1 : -1));

  const limited = events.slice(0, limit);
  return {
    enabled: true,
    events: limited,
    hasMore: events.length > limit,
  };
}
