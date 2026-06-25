/**
 * GALILEO WEEK — atlas builder.
 *
 * Turns a week of DecisionFieldFrames (+ settled cards + a ledger series) into the eight atlases. Every
 * atlas is a VIEW over data the organism already produced — source races, clocks, emitted/suppressed
 * cards, missed/over observations, loop outcomes, and the FDR-disciplined Intelligence Ledger. Pure.
 */

import type { DecisionFieldFrame } from "@sports/decision-field-runtime";
import {
  type SettledCard,
  type LedgerSample,
  runProductIntelligenceLoop,
  buildIntelligenceLedger,
} from "@sports/decision-factory";
import type {
  SourceRaceAtlas,
  MarketAbsorptionAtlas,
  FantasyAbsorptionAtlas,
  DecisionCardAtlas,
  ScarAtlas,
  IntelligenceDeltaAtlas,
  MissedObservationAtlas,
  OverObservationAtlas,
  WeekIntelligenceAtlas,
} from "./galileo-week-types.js";

const FANTASY_TYPES = new Set(["platform_projection", "roster_pct", "add_drop_velocity", "adp", "start_pct"]);
const INJURY_TYPES = new Set(["injury_report", "practice_status"]);

const avg = (xs: readonly number[]): number => (xs.length === 0 ? 0 : Number((xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(4)));

export interface WeekInputs {
  readonly week: string;
  readonly frames: readonly DecisionFieldFrame[];
  readonly settled: readonly SettledCard[];
  readonly ledgerSamples: readonly LedgerSample[];
}

export function buildWeekAtlas(w: WeekInputs): WeekIntelligenceAtlas {
  const { frames } = w;

  // 1. Source Race.
  const allRaces = frames.flatMap((f) => f.sourceRaces);
  const sourceRace: SourceRaceAtlas = {
    races: allRaces.map((r) => ({ factType: r.factType, entityId: r.entityId, winner: r.winner, laggards: r.laggards, contradictionSignal: r.contradictionSignal })),
    fastestSource: allRaces[0]?.winner ?? null,
    note: `${allRaces.length} race(s); ${allRaces.filter((r) => r.contradictionSignal).length} carried a contradiction signal.`,
  };

  // 2. Market Absorption.
  const observerCount = new Set(allRaces.flatMap((r) => r.sources.map((s) => s.sourceId))).size;
  const marketAbsorption: MarketAbsorptionAtlas = {
    observerCount,
    avgVelocity: avg(frames.map((f) => f.clocks.marketClock.velocity)),
    bookLagDetected: frames.some((f) => f.clocks.marketClock.bookLagDetected),
    note: `${observerCount} market observer(s); book lag ${frames.some((f) => f.clocks.marketClock.bookLagDetected) ? "detected" : "not detected"}.`,
  };

  // 3. Fantasy Absorption.
  const fantasyAbsorption: FantasyAbsorptionAtlas = {
    avgAbsorptionGap: avg(frames.map((f) => f.clocks.footballFantasyClock.fantasyAbsorptionGap)),
    crowdMoved: frames.some((f) => f.clocks.footballFantasyClock.crowdMoved),
    note: "How far fantasy belief lagged football reality across the week.",
  };

  // 4. Decision Card.
  const emittedCards = frames.flatMap((f) => f.emittedCards);
  const byState: Record<string, number> = {};
  for (const c of emittedCards) byState[c.decisionState] = (byState[c.decisionState] ?? 0) + 1;
  const decisionCard: DecisionCardAtlas = {
    emitted: emittedCards.length,
    suppressed: frames.reduce((n, f) => n + f.suppressedCards.length, 0),
    byState,
    headlines: emittedCards.slice(0, 5).map((c) => ({ title: c.title, state: c.decisionState, strength: c.maxPermittedStrength })),
    note: `${emittedCards.length} card(s) a user would have seen; ${frames.reduce((n, f) => n + f.suppressedCards.length, 0)} suppressed.`,
  };

  // 5. Scar.
  const trapsAvoided: { subject: string; verdict: string }[] = [];
  const processHeld: { subject: string; verdict: string }[] = [];
  for (const s of w.settled) {
    const loop = runProductIntelligenceLoop(s);
    if (loop.loopAction === "GHOST") trapsAvoided.push({ subject: s.subject, verdict: loop.verdict });
    else processHeld.push({ subject: s.subject, verdict: loop.verdict });
  }
  const scar: ScarAtlas = {
    trapsAvoided,
    processHeld,
    note: `${trapsAvoided.length} trap(s) filed as ghosts; ${processHeld.length} sound process held (no overreaction).`,
  };

  // 6. Intelligence Delta.
  const ledger = buildIntelligenceLedger(w.ledgerSamples);
  const improvingLedgers = Object.values(ledger.ledgers).filter((l) => l.improving).map((l) => l.ledger);
  const intelligenceDelta: IntelligenceDeltaAtlas = {
    improvingCount: ledger.improvingCount,
    intelligenceDelta: ledger.intelligenceDelta,
    improvingLedgers,
    note: `${ledger.improvingCount}/7 ledgers genuinely improving under BH-FDR; delta ${ledger.intelligenceDelta}.`,
  };

  // 7. Missed Observation (what to buy).
  const gaps = frames.flatMap((f) => f.missedObservations.map((m) => ({ entityId: m.entityId, missingFactGroup: m.missingFactGroup })));
  const missedObservation: MissedObservationAtlas = {
    gaps,
    toBuy: [...new Set(gaps.map((g) => g.missingFactGroup))].map((g) => `Acquire a source for "${g}".`),
    note: `${gaps.length} decision(s) capped by a missing fact — the demand side of what to buy.`,
  };

  // 8. Over Observation (what to stop buying).
  const noise = frames.flatMap((f) => f.overObservations.map((o) => ({ factType: o.factType, sourceId: o.sourceId })));
  const overObservation: OverObservationAtlas = {
    noise,
    toStopBuying: [...new Set(noise.map((n) => n.sourceId))],
    note: `${noise.length} fact(s) changed no decision — candidates to stop ingesting.`,
  };

  // The public moment.
  const pit = frames.flatMap((f) => f.facts.pointInTime);
  const fantasySignals = pit.filter((x) => FANTASY_TYPES.has(x.factType)).length;
  const injurySources = new Set(pit.filter((x) => INJURY_TYPES.has(x.factType)).map((x) => x.sourceId)).size;
  const publicMoment = `GSE checked ${observerCount} market observer(s), ${fantasySignals} fantasy signal(s), ${injurySources} injury source(s) — here are the ${emittedCards.length} reads that mattered.`;

  return {
    week: w.week,
    mode: "PREVIEW_FIXTURES",
    sourceRace,
    marketAbsorption,
    fantasyAbsorption,
    decisionCard,
    scar,
    intelligenceDelta,
    missedObservation,
    overObservation,
    publicMoment,
  };
}
