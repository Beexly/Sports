/**
 * DECISION FIELD RUNTIME — the conductor.
 *
 * runDecisionFieldFrame() is the heartbeat: it filters facts through the light cone, races the
 * observers, computes field stress, classifies the regime, audits required stats, prosecutes each
 * candidate through the council-role prosecutors, computes the permission gradient, claim-bounds the
 * card, routes it, attaches a deferred autopsy hook, proposes (never executes) the next move, and
 * records the Conscience snapshot. Every organ it calls is a tested function in @sports/engine or
 * @sports/data-intelligence. Pure + deterministic: no I/O, no clock, no network.
 */

import {
  type TemporalFact,
  type FactType,
  knowableAt,
  pointInTimeFacts,
  computeDataLeverage,
} from "@sports/data-intelligence";
import {
  type RegimeInputs,
  type GhostCluster,
  type CandidateShape,
  type TradabilityInputs,
  type ChannelConservation,
  classifyRegime,
  assessAgainstGhosts,
  assessTradability,
  roleVsProduction,
  checkOpportunityConservation,
} from "@sports/engine";

import {
  type DecisionState,
  type MaxPermittedStrength,
  STAT_CONTRACTS,
  auditRequiredStats,
  strengthMin,
  rankOf,
} from "./decision-state-stat-contract.js";
import { type CardClaim, claim, cardStrengthFromClaims } from "./card-claim.js";
import { type FieldStress, computeFieldStress } from "./field-stress.js";
import { buildSourceRaces, detectContradictionSignals } from "./source-race.js";
import { computePermissionGradient, tradabilityActionability, tradabilityStrengthCeiling } from "./decision-permission-gradient.js";
import {
  type AuthorityContext,
  DEFAULT_AUTHORITY,
  authorityCeiling,
  isPublicSafe,
} from "./decision-authority-gate.js";
import { prosecuteCard } from "./card-prosecution-trace.js";
import { type MissedObservation, detectMissedObservations } from "./missed-observation.js";
import { detectOverObservations } from "./over-observation.js";
import { buildMetaSnapshot } from "./meta-intelligence-snapshot.js";
import {
  type AutopsyHook,
  type CardUpgrade,
  type DecisionCard,
  type SuppressedDecision,
  type ConfidenceLabel,
  type EvidenceClass,
  type LightConeStatus,
  type RouteTo,
} from "./decision-card.js";
import {
  type OperatingPlan,
  type AutonomousAction,
  proposeAction,
} from "./operating-plan.js";
import type {
  DecisionFieldFrame,
  DecisionCandidate,
  DetectedChange,
  SourceRentSummary,
} from "./decision-field-frame.js";

export interface SubjectInput {
  readonly entityId: string;
  readonly subjectLabel: string;
  readonly decisionState: DecisionState;
  readonly candidateShape: CandidateShape;
  readonly ghostClusters: readonly GhostCluster[];
  readonly tradability: TradabilityInputs;
  readonly conservation?: ChannelConservation;
  readonly roleQuality: number;
  readonly normalizedProduction: number;
  readonly proofQuality: number;
  readonly rightsClearedForPublic: boolean;
  readonly realityDelta: number;
  readonly marketVelocity: number;
  readonly fantasyAbsorptionGap: number;
  readonly deadlinePressure: number;
  readonly userContextWeight: number;
  readonly marketAlreadyCaughtUp: boolean;
  readonly lockTime?: string;
}

export interface DecisionFieldInput {
  readonly frameId: string;
  readonly week: string;
  readonly capturedAt: string;
  readonly decisionTime: string;
  readonly facts: readonly TemporalFact[];
  readonly subjects: readonly SubjectInput[];
  readonly regimeInputs: RegimeInputs;
  /** Where the data came from + what the model/publication is authorized to do. Defaults fail-closed to FIXTURE. */
  readonly authority?: AuthorityContext;
}

const ROLE_TYPES: readonly FactType[] = ["route_rate", "snap_share", "target_share", "carry_share"];
const MARKET_TYPES: readonly FactType[] = ["player_prop", "spread", "total", "moneyline"];
const FANTASY_SNAPSHOT_TYPES: readonly FactType[] = ["platform_projection", "roster_pct", "adp", "start_pct"];

const entityOf = (f: TemporalFact): string => f.entityIds[0]?.id ?? "_";

export function runDecisionFieldFrame(input: DecisionFieldInput): DecisionFieldFrame {
  const { facts, decisionTime, frameId } = input;
  const authority = input.authority ?? DEFAULT_AUTHORITY;
  const authorityCeil = authorityCeiling(authority);

  // ── Light cone: partition facts (fail-closed). ─────────────────────────────
  const pit = pointInTimeFacts(facts, decisionTime);
  const futureLeaked = facts.filter((f) => knowableAt(f, decisionTime).verdict === "NOT_YET_KNOWABLE");
  const rightsBlocked = facts.filter((f) => knowableAt(f, decisionTime).verdict === "RIGHTS_BLOCKED");

  // ── Source races + cross-class contradiction signals (over creditable facts). ──
  const rawRaces = buildSourceRaces(pit);
  const contradictions = detectContradictionSignals(pit);
  const contradictionEntities = new Set(contradictions.map((c) => c.entityId));
  const sourceRaces = rawRaces.map((r) => ({
    ...r,
    contradictionSignal: contradictionEntities.has(r.entityId),
    note: contradictionEntities.has(r.entityId) ? `${r.note} Disagreement is a contradiction signal, not noise.` : r.note,
  }));

  // ── Regime (global). ───────────────────────────────────────────────────────
  const regime = classifyRegime(input.regimeInputs);
  const regimeSafety = regime.suppressAction ? 0 : 1;

  const fieldStress: FieldStress[] = [];
  const detectedChanges: DetectedChange[] = [];
  const decisionCandidates: DecisionCandidate[] = [];
  const emittedCards: DecisionCard[] = [];
  const suppressedCards: SuppressedDecision[] = [];
  const missedObservations: MissedObservation[] = [];
  const autopsyHooks: AutopsyHook[] = [];
  const contributingFactIds = new Set<string>();
  const sourceRent = new Map<string, { facts: number; leverage: number }>();
  let scarSuppressions = 0;

  for (const s of input.subjects) {
    const entFacts = pit.filter((f) => entityOf(f) === s.entityId);
    const creditableTypes = new Set<FactType>(entFacts.map((f) => f.factType));
    const hasContradiction = contradictionEntities.has(s.entityId);

    // Engine organs.
    const role = roleVsProduction(s.roleQuality, s.normalizedProduction);
    const ghost = assessAgainstGhosts(s.candidateShape, s.ghostClusters);
    if (ghost.suppressed) scarSuppressions += 1;
    const trad = assessTradability(s.tradability);
    const conservation = s.conservation ? checkOpportunityConservation(s.conservation) : null;
    const actionability = tradabilityActionability(trad.status);
    const leverage = computeDataLeverage({
      factId: `${s.entityId}:primary`,
      pDecisionChanges: 0.6,
      evOfCorrectChange: 0.5,
      proofQuality: s.proofQuality,
      freshness: 0.9,
      repeatability: 0.6,
      uniqueness: 0.7,
      cost: 0.1,
      rightsRisk: 0,
      latency: 0.1,
      complexity: 0.2,
      falseConfidenceRisk: role.signal === "box_score_fraud" ? 0.6 : 0.1,
    });

    // Required-stat audit.
    const contract = STAT_CONTRACTS[s.decisionState];
    const statAudit = auditRequiredStats(s.decisionState, creditableTypes);
    const totalGroups = contract.requiredGroups.length;
    const requiredStatCompleteness = totalGroups > 0 ? (totalGroups - statAudit.missingGroups.length) / totalGroups : 1;

    // Claims.
    const hasRoleFact = ROLE_TYPES.some((t) => creditableTypes.has(t));
    const hasMarketFact = MARKET_TYPES.some((t) => creditableTypes.has(t));
    const hasFantasySnapshot = FANTASY_SNAPSHOT_TYPES.some((t) => creditableTypes.has(t));
    const claims: CardClaim[] = [
      claim(
        "role",
        "ROLE",
        `${s.subjectLabel}'s role is rising.`,
        !hasRoleFact ? "BLOCKED" : role.signal === "box_score_fraud" ? "CONFLICTED" : "SUPPORTED",
        true,
      ),
    ];
    if (hasMarketFact) {
      claims.push(claim("market", "MARKET", "The market is starting to move.", s.marketAlreadyCaughtUp ? "INFERRED" : "SUPPORTED", false));
    }
    claims.push(
      claim(
        "fantasy_late",
        "FANTASY",
        "The fantasy market is late.",
        hasFantasySnapshot ? (hasContradiction ? "SUPPORTED" : "INFERRED") : "BLOCKED",
        false,
      ),
    );
    const claimStrength = cardStrengthFromClaims(claims);

    // Permission gradient (fail-closed conjunction).
    const permission = computePermissionGradient({
      proofQuality: s.proofQuality,
      rightsClearance: 1, // creditable facts already exclude rights-blocked
      lightConeCreditable: entFacts.length > 0 ? 1 : 0,
      requiredStatCompleteness,
      ghostSafety: 1 - ghost.maxPenalty,
      actionability,
      regimeSafety,
    });

    // Field stress (light-cone-invariant + conservation-bounded).
    const stress = computeFieldStress({
      entityId: s.entityId,
      realityDelta: s.realityDelta,
      observerDisagreement: hasContradiction ? 0.6 : 0.2,
      marketVelocity: s.marketVelocity,
      fantasyAbsorptionGap: s.fantasyAbsorptionGap,
      sourceConflictSeverity: hasContradiction ? 0.5 : 0.1,
      deadlinePressure: s.deadlinePressure,
      userContextWeight: s.userContextWeight,
      proofCompleteness: s.proofQuality,
      ...(conservation ? { conservationResidual: conservation.residual } : {}),
    });
    fieldStress.push(stress);

    // Detected change + contributing facts + source rent.
    if (hasRoleFact) {
      detectedChanges.push({
        id: `chg:${s.entityId}:role`,
        entityId: s.entityId,
        factType: "route_rate",
        kind: "role_change",
        magnitude: s.realityDelta,
        note: `${s.subjectLabel}'s role rose; production/market not yet aligned.`,
      });
    }
    const relevantTypes = new Set<FactType>([...contract.requiredGroups.flatMap((g) => [...g.anyOf]), ...contract.optionalStrengtheners]);
    for (const f of entFacts) {
      if (relevantTypes.has(f.factType)) {
        contributingFactIds.add(f.factId);
        const rent = sourceRent.get(f.sourceId) ?? { facts: 0, leverage: 0 };
        rent.facts += 1;
        rent.leverage += Math.max(0, leverage.leverage) * f.confidence;
        sourceRent.set(f.sourceId, rent);
      }
    }

    // Missed observations (the OVI demand side).
    missedObservations.push(...detectMissedObservations(s.entityId, statAudit));

    // Prosecution (council-role reuse).
    const requestedStrength = claimStrength;
    const permittedBeforeProsecution = strengthMin(permission.bucket, statAudit.maxStrength);
    const prosecution = prosecuteCard({
      hasCreditableFacts: entFacts.length > 0,
      anyRequiredRightsBlocked: rightsBlocked.some((f) => entityOf(f) === s.entityId),
      roleSignal: role.signal,
      tradabilityStatus: trad.status,
      marketAlreadyCaughtUp: s.marketAlreadyCaughtUp,
      ghostMaxPenalty: ghost.maxPenalty,
      ghostSuppressed: ghost.suppressed,
      rightsClearedForPublic: s.rightsClearedForPublic,
      cardText: `${s.subjectLabel} role rising; market starting to move; watch, do not chase.`,
      requestedStrength,
      permittedStrength: permittedBeforeProsecution,
    });

    // Pre-authority strength = lattice meet of every EVIDENCE gate (incl. tradability tier ceiling, so
    // EXECUTABLE_SHADOW can't drive PUBLIC_ACTION). The authority gate (data mode / model / publication /
    // readiness) is then meet-ed on top — fixtures cap at INFO_ONLY, shadow at WATCH, public needs live.
    const tradeCeil = tradabilityStrengthCeiling(trad.status);
    const preAuthorityStrength = [claimStrength, statAudit.maxStrength, permission.bucket, prosecution.strengthCap, tradeCeil].reduce((a, b) => strengthMin(a, b));
    const finalStrength = strengthMin(preAuthorityStrength, authorityCeil);

    decisionCandidates.push({
      entityId: s.entityId,
      subject: s.subjectLabel,
      decisionState: s.decisionState,
      claims,
      statAudit,
      claimStrength,
    });

    // Deferred autopsy hook (process over outcome).
    const autopsyHook: AutopsyHook = {
      hookId: `autopsy:${frameId}:${s.entityId}`,
      cardId: `card:${frameId}:${s.entityId}`,
      subject: s.subjectLabel,
      decisionState: s.decisionState,
      maxPermittedStrength: finalStrength,
      candidateShape: { marketFamily: s.candidateShape.marketFamily, structure: s.candidateShape.structure, ...(s.candidateShape.regime ? { regime: s.candidateShape.regime } : {}) },
      decisionTime,
      settled: false,
      note: "Deferred grading; a single outcome cannot move a weight.",
    };
    autopsyHooks.push(autopsyHook);

    // Suppress only when there is NO evidential basis (failed prosecution, or the evidence itself caps at
    // INFO_ONLY). A card whose evidence supports more but is held down by the AUTHORITY gate (e.g. fixture
    // data) is still emitted — as an honest INFO_ONLY, admin-only, non-public card — so the reasoning is
    // visible without ever implying it's live or actionable.
    if (prosecution.anyFail || preAuthorityStrength === "INFO_ONLY") {
      suppressedCards.push({
        entityId: s.entityId,
        decisionState: s.decisionState,
        reason: prosecution.anyFail ? prosecution.downgradeReasons.join("; ") : `Capped at INFO_ONLY (${permission.bindingFactor} / ${statAudit.missingGroups.join(",") || "claims"}).`,
        maxPermittedStrength: finalStrength,
      });
      continue;
    }

    emittedCards.push(
      buildCard({
        frameId,
        decisionTime,
        subject: s,
        finalStrength,
        preAuthorityStrength,
        authority,
        claims,
        prosecution,
        statAudit,
        permissionBinding: permission.bindingFactor,
        ghostPenalty: ghost.maxPenalty,
        roleSignal: role.signal,
        hasContradiction,
        hasFantasySnapshot,
        stress: stress.stress,
        sourceCount: new Set(entFacts.map((f) => f.sourceId)).size,
        anyDropped: futureLeaked.some((f) => entityOf(f) === s.entityId) || rightsBlocked.some((f) => entityOf(f) === s.entityId),
        winnerLine: winnerSummary(sourceRaces, s.entityId),
        regimeTag: regime.regime,
        autopsyHook,
      }),
    );
  }

  // Over-observations (the OVI supply side).
  const overObservations = detectOverObservations(pit, contributingFactIds);

  const sourceRentSummary: SourceRentSummary[] = [...sourceRent.entries()].map(([sourceId, v]) => ({
    sourceId,
    factsContributed: v.facts,
    decisionLeverageCreated: Number(v.leverage.toFixed(4)),
    note: v.leverage > 0 ? "Paid rent — created decision leverage." : "No decision leverage this cycle.",
  }));

  const autonomyPlan = buildPlan(frameId, missedObservations);

  const proof = {
    totalFacts: facts.length,
    pointInTimeFacts: pit.length,
    rightsBlockedCount: rightsBlocked.length,
    futureLeakedCount: futureLeaked.length,
    pointInTimeShare: facts.length > 0 ? Number((pit.length / facts.length).toFixed(4)) : 0,
    note: `${pit.length}/${facts.length} facts creditable at decision time; ${futureLeaked.length} future-leaked, ${rightsBlocked.length} rights-blocked, all excluded.`,
  };

  const conscience = buildMetaSnapshot({
    frameId,
    factsIngested: facts.length,
    pointInTimeFacts: pit.length,
    futureLeakedDropped: futureLeaked.length,
    rightsBlockedDropped: rightsBlocked.length,
    cardsEmitted: emittedCards.length,
    cardsSuppressed: suppressedCards.length,
    sourceRaces,
    scarSuppressions,
    missedObservations,
    overObservations,
  });

  return {
    frameId,
    sport: "NFL",
    week: input.week,
    capturedAt: input.capturedAt,
    decisionTime,
    clocks: {
      marketClock: {
        velocity: Math.max(0, ...input.subjects.map((s) => s.marketVelocity)),
        bookLagDetected: sourceRaces.some((r) => r.laggards.length > 0),
        bestNumberDecaying: input.subjects.some((s) => s.marketAlreadyCaughtUp),
      },
      footballFantasyClock: {
        roleDelta: Math.max(0, ...input.subjects.map((s) => s.realityDelta)),
        fantasyAbsorptionGap: Math.max(0, ...input.subjects.map((s) => s.fantasyAbsorptionGap)),
        crowdMoved: false,
      },
      learningClock: {
        settledOutcomesPending: 0,
        ghostUpdatesPending: autopsyHooks.length,
        note: "Slow clock: outcomes settle later; no weight moves this cycle.",
      },
    },
    regime,
    fieldStress,
    facts: { rawSeen: facts, pointInTime: pit, rightsBlocked, futureLeaked },
    sourceRaces,
    sourceRent: sourceRentSummary,
    detectedChanges,
    conflicts: contradictions,
    knowledgeGaps: missedObservations.map((m) => `${m.entityId}: ${m.missingFactGroup} — ${m.note}`),
    missedObservations,
    overObservations,
    decisionCandidates,
    emittedCards,
    suppressedCards,
    proof,
    autonomyPlan,
    learning: { autopsyHooks, loopOutcomes: [], theoryTransitions: [], ghostUpdates: [] },
    conscience,
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function routeFor(state: DecisionState): RouteTo {
  switch (state) {
    case "ROLE_UP_FANTASY_LATE":
    case "ROLE_MASS_MISALLOCATED":
    case "DFS_SALARY_LAG":
    case "OWNERSHIP_OVERREACTION":
      return "GAMEPLAN";
    case "GOOD_IDEA_BAD_PRICE":
    case "PUBLIC_OVERREACTION":
      return "EDGE";
    case "DATA_CONFLICT":
    case "NEEDS_LIVE_DATA":
      return "ADMIN_ONLY";
    case "TOO_LATE":
    case "WATCHLIST":
    case "ACTIONABLE":
      return "TODAY";
    default:
      return "TODAY";
  }
}

function winnerSummary(races: readonly { entityId: string; winner: string | null; laggards: readonly string[] }[], entityId: string): string {
  const race = races.find((r) => r.entityId === entityId && r.winner !== null);
  if (!race || race.winner === null) return "Single observer — no race.";
  return race.laggards.length > 0 ? `${race.winner} saw it first; ${race.laggards.join(", ")} lagged.` : `${race.winner} saw it first.`;
}

interface BuildCardArgs {
  readonly frameId: string;
  readonly decisionTime: string;
  readonly subject: SubjectInput;
  readonly finalStrength: MaxPermittedStrength;
  readonly preAuthorityStrength: MaxPermittedStrength;
  readonly authority: AuthorityContext;
  readonly claims: readonly CardClaim[];
  readonly prosecution: ReturnType<typeof prosecuteCard>;
  readonly statAudit: ReturnType<typeof auditRequiredStats>;
  readonly permissionBinding: string;
  readonly ghostPenalty: number;
  readonly roleSignal: string;
  readonly hasContradiction: boolean;
  readonly hasFantasySnapshot: boolean;
  readonly stress: number;
  readonly sourceCount: number;
  readonly anyDropped: boolean;
  readonly winnerLine: string;
  readonly regimeTag: string;
  readonly autopsyHook: AutopsyHook;
}

function buildCard(a: BuildCardArgs): DecisionCard {
  const s = a.subject;
  const whatToDo = strengthToAction(a.finalStrength);
  const whyNot = buildWhyNot(a);
  const confidenceLabel: ConfidenceLabel =
    a.finalStrength === "INFO_ONLY" ? "BLOCKED" : a.statAudit.satisfied && !a.prosecution.anyWarn ? "CLEAN" : !a.statAudit.satisfied ? "THIN" : "MIXED";
  const evidenceClass: EvidenceClass =
    a.finalStrength === "INFO_ONLY" ? "INSUFFICIENT" : a.hasContradiction ? "CONFLICTED" : a.roleSignal === "silent_breakout" || a.roleSignal === "aligned" ? "DIRECT" : "INFERRED";
  const lightConeStatus: LightConeStatus = a.sourceCount === 0 ? "BLOCKED" : a.anyDropped ? "PARTIAL" : "INSIDE";

  return {
    id: `card:${a.frameId}:${s.entityId}`,
    title: `${s.subjectLabel}: role rising`,
    subject: s.subjectLabel,
    context: `${s.decisionState} — ${a.regimeTag} regime`,
    decisionState: s.decisionState,
    whatChanged: `${s.subjectLabel}'s role stepped up (routes/targets), ahead of production and the fantasy market.`,
    whatItMeans: "The job got bigger before the points — a role-up that the fantasy market hasn't priced.",
    whatToDo,
    whyNot,
    receiptRef: `receipt:${a.frameId}:${s.entityId}`,
    maxPermittedStrength: a.finalStrength,
    // Public-safe is the conjunction of EVERY public gate (live data, readiness, public-authorized model
    // + publication, rights). Fixture/shadow data is never public-safe, regardless of rights.
    publicSafe: isPublicSafe(a.authority, a.finalStrength, s.rightsClearedForPublic),
    personalizationRequired: !s.rightsClearedForPublic || a.authority.dataMode !== "LIVE_REAL",
    confidenceLabel,
    evidenceClass,
    lightConeStatus,
    // An authority-capped INFO_ONLY card (e.g. fixture data) is admin-only — it never reaches a public surface.
    routeTo: a.finalStrength === "INFO_ONLY" ? "ADMIN_ONLY" : routeFor(s.decisionState),
    decisionTime: a.decisionTime,
    ...(s.lockTime ? { lockTime: s.lockTime } : {}),
    sourceCount: a.sourceCount,
    ghostSimilarity: a.ghostPenalty,
    noticeabilityIndex: Number((a.stress * (1 - a.ghostPenalty)).toFixed(4)),
    cognitiveLoadScore: a.claims.length + a.prosecution.downgradeReasons.length,
    regimeTag: a.regimeTag,
    upgrade: buildUpgrade(a),
    claims: a.claims,
    prosecution: a.prosecution,
    proofDrawer: {
      whatChanged: `${s.subjectLabel}'s route/target share rose at ${a.decisionTime}.`,
      whatTheMarketDid: s.marketAlreadyCaughtUp ? "The prop started to move — the market is catching up." : "The prop has not yet moved to match the role.",
      whatFantasyDid: a.hasFantasySnapshot ? "The fantasy projection has not kept pace." : "We have no timestamped fantasy projection snapshot to cite.",
      whatTheCrowdDid: "Sleeper add/drop is still quiet — the crowd hasn't reacted.",
      whyNot,
      redFlags: a.prosecution.downgradeReasons,
      dataUsed: a.claims.map((c) => `${c.claimType}: ${c.proofStatus}`),
      sourceRaceSummary: a.winnerLine,
      requiredStatStatus: a.statAudit.note,
      whatWouldChangeOurMind: a.hasFantasySnapshot ? "A market move that fully prices the role would make this TOO_LATE." : "A timestamped fantasy projection confirming the lag would upgrade this from watch to add.",
      receiptRefs: [`receipt:${a.frameId}:${s.entityId}`],
      rightsStatus: s.rightsClearedForPublic ? "cleared (public)" : "personalized only",
      lightConeStatus,
    },
    autopsyHook: a.autopsyHook,
    updatedAt: a.decisionTime,
  };
}

function strengthToAction(strength: MaxPermittedStrength): string {
  switch (strength) {
    case "PUBLIC_ACTION":
    case "ACTION":
      return "Act on it now while the number holds.";
    case "PERSONALIZED":
      return "Worth it for your roster — check your context first.";
    case "WAIT":
      return "Wait for one confirmation before acting.";
    case "WATCH":
      return "Watch — don't chase the price yet.";
    case "INFO_ONLY":
      return "For your awareness only; nothing to do.";
  }
}

function buildWhyNot(a: BuildCardArgs): string {
  // If the AUTHORITY gate (not the evidence) is what's holding the card down, say so plainly.
  if (rankOf(a.finalStrength) < rankOf(a.preAuthorityStrength) && a.authority.dataMode !== "LIVE_REAL") {
    const mode = a.authority.dataMode === "FIXTURE" ? "an illustrative fixture" : "shadow (real but unpublished) data";
    return `Why not stronger? This is running on ${mode}, so it stays at ${a.finalStrength.toLowerCase().replace(/_/g, " ")} — it can't go further until it's on live, readiness-cleared inputs.`;
  }
  if (!a.hasFantasySnapshot && a.statAudit.missingGroups.includes("fantasy_belief_snapshot")) {
    return "Why not add aggressively now? The role is clearly rising and the market is starting to move, but we don't yet have a fantasy projection snapshot to prove the fantasy market is actually behind — and this rhymes with a past box-score trap. So: watch, not add.";
  }
  if (a.prosecution.downgradeReasons.length > 0) {
    return `Why not go stronger? ${a.prosecution.downgradeReasons[0]}.`;
  }
  return "Why not stronger? The evidence supports exactly this much and no more.";
}

// Plain-English labels for the fact groups a card is missing — what we'd need to go stronger.
const GROUP_LABELS: Readonly<Record<string, string>> = {
  role_delta: "a usage/role signal (snaps, routes, targets)",
  fantasy_belief_snapshot: "a fantasy projection snapshot",
  edge_basis: "a role or injury read",
  live_price: "a live price",
  crowd_move: "a crowd-movement signal",
  reality_check: "a role/injury reality check",
  any_signal: "a credible signal",
  any_credible_fact: "a credible fact",
};

/** Tie the strength cap to exactly what we'd need to acquire to go stronger. */
function buildUpgrade(a: BuildCardArgs): CardUpgrade {
  const dataNeeded = a.statAudit.missingGroups.map((g) => GROUP_LABELS[g] ?? g);
  // Live data is required to go stronger whenever we're not already on live inputs, or a fact is missing.
  const requiresLiveData = a.authority.dataMode !== "LIVE_REAL" || a.statAudit.missingGroups.length > 0;
  const reason =
    dataNeeded.length > 0
      ? `Capped at ${a.finalStrength.toLowerCase()} because we don't have ${dataNeeded.join(" and ")} yet.`
      : a.prosecution.downgradeReasons.length > 0
        ? `Capped at ${a.finalStrength.toLowerCase()}: ${a.prosecution.downgradeReasons[0]}.`
        : `The evidence supports exactly ${a.finalStrength.toLowerCase()} and no more.`;
  return { cappedAt: a.finalStrength, reason, dataNeeded, requiresLiveData };
}

function buildPlan(frameId: string, missed: readonly MissedObservation[]): OperatingPlan {
  const proposed: AutonomousAction[] = [
    proposeAction(`act:observe:${frameId}`, "OBSERVE", "Re-observe the field next cycle", "Field stress is live; keep watching.", true),
    proposeAction(`act:ingest:${frameId}`, "INGEST_FREE", "Pull more free role data (nflverse/Sleeper)", "Strengthen the role read with free, rights-clear sources.", true),
  ];
  if (missed.length > 0) {
    proposed.push(
      proposeAction(
        `act:paid:${frameId}`,
        "PROPOSE_PAID_SOURCE",
        "Evaluate a licensed fantasy projection feed (OVI-ranked)",
        `Fill the missed observation "${missed[0]!.missingFactGroup}" — would unlock a stronger card. Cost preview only; no spend.`,
        true,
        "--plan: preview credit cost before any spend",
      ),
    );
  }
  const ownerApprovalsNeeded = proposed.filter((p) => p.authority === "OWNER_GATE");
  return {
    frameId,
    proposedActions: proposed,
    ownerApprovalsNeeded,
    note: `${proposed.length} action(s) proposed; ${ownerApprovalsNeeded.length} owner-gated. Nothing executed — propose-only by construction.`,
  };
}
