/**
 * GSE Decision Ontology — one connected graph, not isolated tools.
 *
 * The product's future depends on a single shared vocabulary: a Player on
 * Today's Board, in a DFS lineup, in a draft, in a trade, and in an autopsy is
 * the SAME player entity, with the same source/confidence/freshness obligations
 * everywhere. This module declares the entities, their decision-relevant
 * requirements, and the relationships that connect them, so every surface speaks
 * the same graph.
 *
 * Implementation note: this is the typed CONTRACT layer. It intentionally does
 * not propose database migrations — the existing Prisma schema is the runtime
 * source of truth; this is the conceptual graph the next agent reconciles
 * against it.
 *
 * Companion doc: docs/research/GSE_2026_DECISION_GRAPH_ONTOLOGY.md
 */

export type OntologyDomain =
  | "core"
  | "market"
  | "decision"
  | "fantasy"
  | "content"
  | "trust"
  | "revenue"
  | "agents";

export type EntityVisibility = "public" | "dashboard" | "internal";

export interface EntitySpec {
  readonly kind: string;
  readonly domain: OntologyDomain;
  readonly summary: string;
  readonly fields: readonly string[];
  /** Must every instance cite a source? */
  readonly sourceRequired: boolean;
  /** Must every instance carry a confidence/uncertainty signal? */
  readonly confidenceRequired: boolean;
  /** Must every instance carry a freshness timestamp? */
  readonly freshnessRequired: boolean;
  readonly visibility: EntityVisibility;
  /** Must mutations be audited / append-only? */
  readonly auditRequired: boolean;
  readonly uiSurfaces: readonly string[];
  readonly downstreamSystems: readonly string[];
}

/** Compact factory with safe defaults so 50+ entities stay readable. */
function entity(
  kind: string,
  domain: OntologyDomain,
  summary: string,
  opts: Partial<Omit<EntitySpec, "kind" | "domain" | "summary">> = {},
): EntitySpec {
  return {
    kind,
    domain,
    summary,
    fields: opts.fields ?? ["id"],
    sourceRequired: opts.sourceRequired ?? false,
    confidenceRequired: opts.confidenceRequired ?? false,
    freshnessRequired: opts.freshnessRequired ?? false,
    visibility: opts.visibility ?? "internal",
    auditRequired: opts.auditRequired ?? false,
    uiSurfaces: opts.uiSurfaces ?? [],
    downstreamSystems: opts.downstreamSystems ?? [],
  };
}

export const ONTOLOGY_ENTITIES: readonly EntitySpec[] = [
  // ── core ──────────────────────────────────────────────────────────────────
  entity("Sport", "core", "Top-level sport (NFL, NBA, …).", { fields: ["id", "name", "active"], visibility: "public" }),
  entity("League", "core", "A league within a sport.", { fields: ["id", "sportId", "name"], visibility: "public" }),
  entity("Season", "core", "A season of a league.", { fields: ["id", "leagueId", "year"], visibility: "public" }),
  entity("Week", "core", "A scheduling period within a season.", { fields: ["id", "seasonId", "number"], visibility: "public" }),
  entity("Slate", "core", "A set of games grouped for a contest/board.", { fields: ["id", "weekId", "gameIds", "lockAt"], freshnessRequired: true, visibility: "dashboard" }),
  entity("Game", "core", "A single matchup.", { fields: ["id", "slateId", "homeTeamId", "awayTeamId", "startAt", "status"], sourceRequired: true, freshnessRequired: true, visibility: "public", uiSurfaces: ["/today", "/room/[gameId]"], downstreamSystems: ["signal", "projection"] }),
  entity("Team", "core", "A team.", { fields: ["id", "leagueId", "name", "abbr"], visibility: "public" }),
  entity("Player", "core", "A player.", { fields: ["id", "teamId", "name", "position", "status"], sourceRequired: true, freshnessRequired: true, visibility: "public", uiSurfaces: ["/players"], downstreamSystems: ["projection", "ownership", "lineup", "draft"] }),
  entity("Coach", "core", "A coach (intent inference target).", { fields: ["id", "teamId", "name", "role"], confidenceRequired: true }),
  entity("Injury", "core", "An injury/status record.", { fields: ["id", "playerId", "status", "designation", "reportedAt"], sourceRequired: true, freshnessRequired: true, confidenceRequired: true, visibility: "dashboard", downstreamSystems: ["projection", "lineup"] }),
  entity("DepthChart", "core", "Team depth ordering.", { fields: ["id", "teamId", "entries", "asOf"], freshnessRequired: true }),
  entity("PracticeReport", "core", "Practice participation report.", { fields: ["id", "playerId", "participation", "date"], sourceRequired: true, freshnessRequired: true }),
  entity("NewsItem", "core", "A news item (facts only).", { fields: ["id", "summary", "sourceId", "at"], sourceRequired: true, freshnessRequired: true, visibility: "dashboard" }),

  // ── market ─────────────────────────────────────────────────────────────────
  entity("Market", "market", "A bettable market on a game.", { fields: ["id", "gameId", "type"], sourceRequired: true }),
  entity("Book", "market", "A sportsbook.", { fields: ["id", "name"], visibility: "public" }),
  entity("OddsSnapshot", "market", "A point-in-time odds capture.", { fields: ["id", "marketId", "bookId", "price", "capturedAt"], sourceRequired: true, freshnessRequired: true, auditRequired: true, downstreamSystems: ["signal", "line_movement"] }),
  entity("Prop", "market", "A player/game prop market.", { fields: ["id", "gameId", "playerId", "type", "line"], sourceRequired: true, freshnessRequired: true }),
  entity("LineMovement", "market", "Derived movement across snapshots.", { fields: ["id", "marketId", "from", "to", "window"], confidenceRequired: true }),
  entity("Projection", "market", "A modeled projection (labeled modeled).", { fields: ["id", "playerId", "stat", "distribution", "modelRunId"], confidenceRequired: true, freshnessRequired: true, visibility: "dashboard", downstreamSystems: ["lineup", "signal"] }),
  entity("OwnershipProjection", "market", "Modeled DFS ownership.", { fields: ["id", "playerId", "slateId", "estimate", "modelRunId"], confidenceRequired: true, freshnessRequired: true, downstreamSystems: ["lineup"] }),
  entity("ModelRun", "market", "A versioned model execution.", { fields: ["id", "modelVersion", "inputsRef", "ranAt"], auditRequired: true, downstreamSystems: ["projection", "recommendation"] }),
  entity("Signal", "market", "A detected edge candidate.", { fields: ["id", "gameId", "thesis", "confidence", "modelRunId"], sourceRequired: true, confidenceRequired: true, freshnessRequired: true, visibility: "dashboard", downstreamSystems: ["recommendation"] }),
  entity("NarrativeSignal", "market", "Bounded narrative impact.", { fields: ["id", "subjectRef", "impactType", "magnitude"], confidenceRequired: true, downstreamSystems: ["projection", "ownership"] }),
  entity("BeatReport", "market", "Summarized beat reporting (facts only).", { fields: ["id", "subjectRef", "summary", "sourceId"], sourceRequired: true, freshnessRequired: true }),

  // ── decision / evidence ─────────────────────────────────────────────────────
  entity("Evidence", "decision", "Support for a claim.", { fields: ["evidenceId", "supportsClaim", "kind", "strength", "sourceId"], sourceRequired: true, confidenceRequired: true, freshnessRequired: true, downstreamSystems: ["recommendation"] }),
  entity("CounterEvidence", "decision", "Challenge to a claim.", { fields: ["counterId", "challengesClaim", "severity", "sourceId"], sourceRequired: true, freshnessRequired: true, downstreamSystems: ["recommendation"] }),
  entity("Falsifier", "decision", "Condition that flips a claim.", { fields: ["falsifierId", "forClaim", "condition", "likelihood", "monitored"], confidenceRequired: true, downstreamSystems: ["recommendation", "monitoring"] }),
  entity("RiskFlag", "decision", "A named risk on a decision.", { fields: ["id", "label", "level"], visibility: "dashboard" }),
  entity("Recommendation", "decision", "A verdict with its case.", { fields: ["id", "claimRef", "action", "confidence", "fragility", "modelRunId"], sourceRequired: true, confidenceRequired: true, freshnessRequired: true, auditRequired: true, visibility: "dashboard", uiSurfaces: ["/today"], downstreamSystems: ["trust_receipt", "user_decision", "autopsy"] }),
  entity("UserDecision", "decision", "The user accepting/rejecting a recommendation.", { fields: ["id", "userId", "recommendationId", "choice", "at"], auditRequired: true, visibility: "internal", downstreamSystems: ["memory", "bias"] }),
  entity("UserAction", "decision", "A concrete action the user took.", { fields: ["id", "userDecisionId", "type", "at"], auditRequired: true, visibility: "internal" }),
  entity("Autopsy", "decision", "Post-outcome process grade.", { fields: ["id", "recommendationId", "outcome", "processGrade", "lesson"], auditRequired: true, visibility: "dashboard", downstreamSystems: ["calibration"] }),
  entity("CalibrationResult", "decision", "Confidence-vs-outcome result.", { fields: ["id", "binResults", "sampleSize", "computedAt"], auditRequired: true, downstreamSystems: ["model", "source_integrity"] }),

  // ── fantasy ──────────────────────────────────────────────────────────────────
  entity("Portfolio", "fantasy", "A set of lineups/entries with exposure.", { fields: ["id", "userId", "lineupIds", "exposure"], confidenceRequired: true, visibility: "dashboard" }),
  entity("Lineup", "fantasy", "A constructed lineup.", { fields: ["id", "slateId", "slots", "salary", "projection"], confidenceRequired: true, visibility: "dashboard", downstreamSystems: ["portfolio"] }),
  entity("Draft", "fantasy", "A draft instance.", { fields: ["id", "leagueId", "format", "settings"], visibility: "dashboard" }),
  entity("DraftPick", "fantasy", "A pick that changes roster destiny.", { fields: ["id", "draftId", "playerId", "pickNumber"], auditRequired: true, downstreamSystems: ["roster"] }),
  entity("LeagueMemory", "fantasy", "Consented league history.", { fields: ["id", "leagueId", "items", "consentState"], sourceRequired: true, visibility: "dashboard", downstreamSystems: ["manager_genome", "draft"] }),
  entity("ManagerGenome", "fantasy", "Aggregate manager tendencies.", { fields: ["id", "managerRef", "tendencies", "confidence"], confidenceRequired: true, downstreamSystems: ["draft", "trade"] }),
  entity("WaiverClaim", "fantasy", "A FAAB/waiver claim recommendation.", { fields: ["id", "playerId", "bid", "rationale"], confidenceRequired: true, visibility: "dashboard" }),
  entity("Trade", "fantasy", "A trade evaluation.", { fields: ["id", "give", "get", "equityDelta"], confidenceRequired: true, visibility: "dashboard" }),
  entity("Roster", "fantasy", "A fantasy roster state.", { fields: ["id", "fantasyTeamId", "playerIds", "asOf"], freshnessRequired: true, visibility: "dashboard" }),
  entity("FantasyTeam", "fantasy", "A user's fantasy team.", { fields: ["id", "userId", "leagueId", "name"], visibility: "dashboard" }),

  // ── content ──────────────────────────────────────────────────────────────────
  entity("ContentPiece", "content", "Draft content (owner-gated publish).", { fields: ["id", "title", "body", "claimRefs", "status"], sourceRequired: true, auditRequired: true, visibility: "internal", downstreamSystems: ["claim_safety"] }),
  entity("GSNTransmission", "content", "A GSN media story.", { fields: ["id", "headline", "signalRefs", "sourceIds"], sourceRequired: true, visibility: "public", uiSurfaces: ["/gsn"] }),
  entity("AcademyScenario", "content", "A teaching scenario (illustrative).", { fields: ["id", "setup", "processRubric"], visibility: "dashboard", uiSurfaces: ["/academy"] }),

  // ── trust ────────────────────────────────────────────────────────────────────
  entity("Source", "trust", "A data source with rights posture.", { fields: ["sourceId", "name", "rightsStatus", "reliability"], sourceRequired: true, auditRequired: true, downstreamSystems: ["data_excellence", "claim_safety"] }),
  entity("TrustReceipt", "trust", "Frozen recommendation state (pre-result).", { fields: ["id", "recommendationId", "frozenAt", "hash"], auditRequired: true, freshnessRequired: true, visibility: "public", uiSurfaces: ["/proof"] }),

  // ── revenue ──────────────────────────────────────────────────────────────────
  entity("RevenueEvent", "revenue", "A monetization event.", { fields: ["eventId", "type", "segment", "at"], auditRequired: true, visibility: "internal" }),
  entity("SubscriptionPlan", "revenue", "A plan from the pricing source-of-truth.", { fields: ["tier", "sourceOfTruth"], visibility: "public" }),
  entity("UserSegment", "revenue", "A user segment for product/retention.", { fields: ["id", "label", "criteria"], visibility: "internal" }),

  // ── agents ───────────────────────────────────────────────────────────────────
  entity("AgentRun", "agents", "A constrained agent execution.", { fields: ["runId", "agentId", "inputsRef", "status"], auditRequired: true, visibility: "internal", downstreamSystems: ["agent_verdict"] }),
  entity("JarvisConversation", "agents", "A Jarvis session (audited).", { fields: ["id", "userId", "mode", "turns"], auditRequired: true, visibility: "internal" }),
] as const;

/** Look up an entity spec by kind. */
export function getEntity(kind: string): EntitySpec | undefined {
  return ONTOLOGY_ENTITIES.find((e) => e.kind === kind);
}

/** Group every entity by its ontology domain. */
export function groupDecisionEntitiesByDomain(): Record<OntologyDomain, EntitySpec[]> {
  const groups: Record<OntologyDomain, EntitySpec[]> = {
    core: [],
    market: [],
    decision: [],
    fantasy: [],
    content: [],
    trust: [],
    revenue: [],
    agents: [],
  };
  for (const e of ONTOLOGY_ENTITIES) groups[e.domain].push(e);
  return groups;
}

// ─────────────────────────────────────────────────────────────────────────────
// Relationships (edges)
// ─────────────────────────────────────────────────────────────────────────────

export interface OntologyRelationship {
  readonly from: string;
  readonly verb: string;
  readonly to: string;
  readonly note?: string;
}

export const ONTOLOGY_RELATIONSHIPS: readonly OntologyRelationship[] = [
  { from: "Player", verb: "plays_for", to: "Team" },
  { from: "Player", verb: "appears_in", to: "Game" },
  { from: "Game", verb: "belongs_to", to: "Slate" },
  { from: "OddsSnapshot", verb: "prices", to: "Market" },
  { from: "Source", verb: "supports", to: "Evidence" },
  { from: "Evidence", verb: "supports", to: "Signal" },
  { from: "CounterEvidence", verb: "challenges", to: "Signal" },
  { from: "Falsifier", verb: "can_flip", to: "Recommendation" },
  { from: "Recommendation", verb: "generated_from", to: "ModelRun" },
  { from: "Recommendation", verb: "references", to: "Evidence" },
  { from: "UserDecision", verb: "accepts_or_rejects", to: "Recommendation" },
  { from: "Autopsy", verb: "evaluates", to: "Recommendation" },
  { from: "CalibrationResult", verb: "updates_confidence_of", to: "ModelRun" },
  { from: "CalibrationResult", verb: "updates_confidence_of", to: "Source" },
  { from: "DraftPick", verb: "changes_destiny_of", to: "Roster" },
  { from: "ManagerGenome", verb: "predicts", to: "DraftPick", note: "behavioral prior only" },
  { from: "NarrativeSignal", verb: "affects", to: "Projection", note: "only via allowed impact types" },
  { from: "NarrativeSignal", verb: "affects", to: "OwnershipProjection", note: "only via allowed impact types" },
  { from: "TrustReceipt", verb: "freezes", to: "Recommendation" },
  { from: "GSNTransmission", verb: "references", to: "Signal" },
] as const;

/** All relationships originating from a given entity kind. */
export function relationshipsFrom(kind: string): readonly OntologyRelationship[] {
  return ONTOLOGY_RELATIONSHIPS.filter((r) => r.from === kind);
}
