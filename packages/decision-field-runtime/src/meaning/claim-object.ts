/**
 * THE GSE MEANING COMPILER — the universal ClaimObject (the type spine).
 *
 * Einstein-level frame change: GSE does not build pages, it COMPILES MEANING. Every sports object — a
 * stat, a trend, a prediction, an odds price, a market state, a bonus, a bookmaker rating, an API
 * provider, a resource, web evidence, an alert, a decision card — becomes ONE typed `ClaimObject` that
 * passes through ONE pipeline: observation → source → rights → time → meaning → decision → authority →
 * public expression → autopsy → memory. The page is the rendering; the compiler is the company.
 *
 * Da Vinci's law (anatomy): nothing public may be anatomically incomplete. Every ClaimObject has organs
 * — skeleton (identity), blood (source), nervous system (time/knowability), spine (authority), muscle
 * (decision effect), skin (public copy), immune system (rights+risk), memory (autopsy).
 *
 * THE design law — NO PARALLEL SYSTEMS. This file defines only TYPES + pure witnesses. It owns no
 * authority math, no knowability math, no strength lattice. Every envelope REUSES a canonical engine:
 *   AuthorityEnvelope → authority-vector.ts composeAuthority (carry the VECTOR, never a hand-set ceiling)
 *   TimeEnvelope      → data-intelligence temporal-fact.ts knowableAt / KnowabilityVerdict
 *   SourceLineage     → data-intelligence SourceGenome / LegalVerdict
 *   RightsEnvelope    → mirrors apps/web RightsSnapshot flags (package may not import apps/web; the real
 *                       RightsSnapshot→RightsEnvelope adapter lives in apps/web)
 *   SemanticEnvelope  → data-intelligence FactType/FactClass + StatGenome.falsifier
 *   DecisionEnvelope  → decision-state.ts DecisionState + decision-state-stat-contract auditRequiredStats
 *
 * Pure, deterministic, fixture-safe. Spec: docs/product/GSE_MEANING_COMPILER.md.
 */

import type { MaxPermittedStrength } from "../decision-state-stat-contract.js";
import type { DecisionState } from "../decision-state.js";
import type { AuthorityVectorInput, AuthorityComposition } from "../authority-vector.js";
import type { AuthorityFlightRecord } from "../authority-flight-record.js";
import type { LegalVerdict, FactType, FactClass, KnowabilityVerdict } from "@sports/data-intelligence";

// ───────────────────────── object taxonomy ─────────────────────────

/** Every kind of thing GSE can compile a meaning for. One grammar for the whole institution. */
export type ObjectType =
  | "MATCH_STAT"
  | "DERIVED_STAT"
  | "TREND"
  | "PREDICTION"
  | "ODDS_PRICE"
  | "MARKET_STATE"
  | "BONUS"
  | "BOOKMAKER_RATING"
  | "API_PROVIDER"
  | "RESOURCE"
  | "WEB_EVIDENCE"
  | "ALERT"
  | "DECISION_CARD"
  | "SOURCE_LINEAGE"
  // The Public Observer Ledger (Addendum III): what dominant discovery systems SHOW the public.
  | "PUBLIC_OBSERVER_RESULT"
  | "HIGHLIGHT"
  | "ENTITY_PASSPORT";

export const ALL_OBJECT_TYPES: readonly ObjectType[] = [
  "MATCH_STAT", "DERIVED_STAT", "TREND", "PREDICTION", "ODDS_PRICE", "MARKET_STATE", "BONUS",
  "BOOKMAKER_RATING", "API_PROVIDER", "RESOURCE", "WEB_EVIDENCE", "ALERT", "DECISION_CARD", "SOURCE_LINEAGE",
  "PUBLIC_OBSERVER_RESULT", "HIGHLIGHT", "ENTITY_PASSPORT",
];

export function isObjectType(x: string): x is ObjectType {
  return (ALL_OBJECT_TYPES as readonly string[]).includes(x);
}

/** Object maturity (the spec's Lifecycle) — distinct from the compile pipeline stages. */
export type ClaimLifecycle =
  | "DISCOVERED"
  | "CANDIDATE"
  | "FIXTURE"
  | "PREVIEW"
  | "SHADOW"
  | "VALIDATED"
  | "LIVE"
  | "PUBLIC_SAFE"
  | "DEGRADED"
  | "RETIRED"
  | "DO_NOT_USE";

export const ALL_CLAIM_LIFECYCLES: readonly ClaimLifecycle[] = [
  "DISCOVERED", "CANDIDATE", "FIXTURE", "PREVIEW", "SHADOW", "VALIDATED", "LIVE", "PUBLIC_SAFE",
  "DEGRADED", "RETIRED", "DO_NOT_USE",
];

export type RiskBand = "NONE" | "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN";

// ───────────────────────── the seven envelopes ─────────────────────────

/** BLOOD — where the claim came from. Reuses data-intelligence SourceGenome/LegalVerdict vocabulary. */
export type SourceKind =
  | "LICENSED_API"
  | "FREE_API"
  | "OPEN_DATA"
  | "USER_AUTHORIZED"
  | "MANUAL_FIXTURE"
  | "WEB_EVIDENCE"
  | "COMPETITOR_RESEARCH"
  | "INTERNAL_DERIVED"
  | "COMMUNITY_INPUT";

export interface SourceLineage {
  /** Typed refs into a SourceGenome.sourceId or TemporalFact.factId — the upgrade of loose sourceRefs. */
  readonly originRefs: readonly string[];
  readonly providerName: string | null;
  readonly sourceId: string | null;
  readonly endpointOrUrl: string | null;
  readonly sourceKind: SourceKind;
  readonly directOrDerived: "DIRECT" | "DERIVED";
  readonly legalVerdict: LegalVerdict;
  readonly capturedAtLabel: string | null;
  readonly observedAtLabel: string | null;
  readonly knownAtLabel: string | null;
  readonly sourceConfidence: number; // 0..1
  readonly independentOriginCount: number;
  readonly proofRefs: readonly string[];
}

/**
 * IMMUNE SYSTEM (rights) — structurally mirrors apps/web RightsSnapshot's permission flags so the
 * boundary adapter is a trivial field map. The package never imports apps/web; this is the canonical
 * package-side shape. `status` mirrors the 9-value SourceRightsStatus.
 */
export type RightsEnvelopeStatus =
  | "approved_public_logged_off"
  | "approved_api"
  | "approved_open_license"
  | "approved_written_permission"
  | "vendor_candidate"
  | "manual_research_only"
  | "permission_required"
  | "blocked_technical_controls"
  | "excluded";

export const ALL_RIGHTS_ENVELOPE_STATUSES: readonly RightsEnvelopeStatus[] = [
  "approved_public_logged_off", "approved_api", "approved_open_license", "approved_written_permission",
  "vendor_candidate", "manual_research_only", "permission_required", "blocked_technical_controls", "excluded",
];

export interface RightsEnvelope {
  readonly status: RightsEnvelopeStatus;
  readonly legalVerdict: LegalVerdict;
  readonly commercialDisplayAllowed: boolean;
  readonly publicDisplayAllowed: boolean;
  readonly storageAllowed: boolean;
  readonly derivedUseAllowed: boolean;
  readonly modelTrainingAllowed: boolean;
  readonly redistributionAllowed: boolean;
  readonly attributionRequired: boolean;
  readonly attributionText: string | null;
  readonly ownerApprovalRequired: boolean;
  readonly reviewStatus: "REVIEWED" | "PENDING" | "UNKNOWN";
  readonly reviewedAtLabel: string | null;
}

/** NERVOUS SYSTEM — time + knowability. Reuses knowableAt's KnowabilityVerdict. */
export interface TimeEnvelope {
  readonly eventTimeLabel: string | null;
  readonly observedAtLabel: string | null;
  readonly knownAtLabel: string | null;
  readonly capturedAtLabel: string | null;
  readonly staleAtLabel: string | null;
  readonly validUntilLabel: string | null;
  readonly decisionTimeLabel: string | null;
  readonly knowability: KnowabilityVerdict;
  readonly pointInTimeSafe: boolean;
  readonly futureLeakageRisk: boolean;
}

/** SKIN / meaning — what it says. Keyed on FactType/FactClass; carries the falsifier when present. */
export interface SemanticEnvelope {
  readonly plainText: string;
  readonly definition: string;
  readonly formula: string | null;
  readonly units: string | null;
  readonly interpretation: string;
  readonly decisionMeaning: string;
  readonly factClass: FactClass | null;
  readonly factType: FactType | null;
  readonly falsifier: string | null;
  readonly sampleFragility: number | null; // 0..1, null when not sample-based
  readonly contextDependence: string | null;
}

/** MUSCLE — what decision it changes. Reuses DecisionState + the strength contract's audit inputs. */
export interface DecisionEnvelope {
  readonly possibleActions: readonly string[];
  readonly currentDecisionState: DecisionState | null;
  readonly decisionUse: string;
  readonly suppressesAction: boolean;
  readonly whatWouldChangeDecision: string;
  /** Fact types the claim can credit — fed to auditRequiredStats by the compiler (never recomputed). */
  readonly creditableFactTypes: readonly FactType[];
}

/** SPINE — authority. Carries the VECTOR so the ceiling is COMPUTED by composeAuthority, never hand-set. */
export interface AuthorityEnvelope {
  readonly vector: AuthorityVectorInput;
  readonly requestedExpression: MaxPermittedStrength;
  readonly composition: AuthorityComposition;
  readonly flightRecord: AuthorityFlightRecord;
}

/** IMMUNE SYSTEM (risk) — already-computed risk values copied from the source passport (never recomputed). */
export interface RiskEnvelope {
  readonly legalRisk: RiskBand;
  readonly dataQualityRisk: RiskBand;
  readonly modelRisk: RiskBand;
  readonly bettingComplianceRisk: RiskBand;
  readonly userHarmRisk: RiskBand;
  readonly overclaimRisk: RiskBand;
  readonly affiliateConflictRisk: RiskBand;
  readonly weakness: string;
  readonly whatWouldInvalidate: string;
  readonly riskFlags: readonly string[];
}

// ───────────────────────── memory + explanation ─────────────────────────

/** MEMORY — what settles this claim and how it'll be graded (a PLAN, never a side effect). */
export interface AutopsyPlan {
  readonly settlesWhen: string;
  readonly gradingProtocol: string;
  readonly hasTrial: boolean;
  readonly autopsyRef: string | null;
}

/** Where the settled result writes — a five-ledgers projection target (a plan, never executed here). */
export interface MemoryWritePlan {
  readonly ledger: "LEARNING" | "DECISION" | "AUTHORITY" | "BELIEF" | "REALITY";
  readonly metricKey: string;
  readonly writesOnSettle: boolean;
  readonly note: string;
}

/** One auditable downgrade: which stage, which engine produced the cap, why, and to what. */
export interface ClaimDowngrade {
  readonly stage: "lineage" | "rights" | "time" | "evidence" | "authority";
  readonly engine: string;
  readonly reason: string;
  readonly cappedTo: MaxPermittedStrength | "DO_NOT_USE";
}

/** The structured answer to GSE's CORE LAW — the 10 questions every public object must answer. */
export interface ClaimExplanation {
  readonly whatAmI: string;
  readonly whereFrom: string;
  readonly whenKnowable: string;
  readonly allowedToMean: string;
  readonly decisionItChanges: string;
  readonly weaknesses: string;
  readonly authorityStory: string;
  readonly afterResult: string;
  readonly canBeShownPublicly: boolean;
  readonly whatWouldStrengthen: string;
  readonly downgrades: readonly ClaimDowngrade[];
}

// ───────────────────────── the input + the compiled object ─────────────────────────

/** What a morphology adapter produces — raw envelopes; the compiler composes authority + expression. */
export interface ClaimObjectInput {
  readonly objectType: ObjectType;
  readonly subject: string;
  readonly sport?: string | null;
  readonly eventId?: string | null;
  /** A stable ref to the underlying object (never the object itself — keeps the claim serializable). */
  readonly payloadRef: string;
  readonly sourceLineage: SourceLineage;
  readonly rights: RightsEnvelope;
  readonly time: TimeEnvelope;
  readonly semantic: SemanticEnvelope;
  readonly decision: DecisionEnvelope;
  readonly risk: RiskEnvelope;
  /** The 8-layer authority input — the compiler runs composeAuthority over it (no hand-set ceiling). */
  readonly authorityVector: AuthorityVectorInput;
  /** What we'd LIKE to say; the compiler returns the MEET of this and every gate. */
  readonly requestedExpression: MaxPermittedStrength;
  readonly autopsyHook: AutopsyPlan;
  readonly memoryWrite: MemoryWritePlan;
}

/** The compiled claim — every organ present, the public expression COMPUTED, the explanation attached. */
export interface ClaimObject {
  readonly claimObjectId: string;
  readonly objectType: ObjectType;
  readonly subject: string;
  readonly sport: string | null;
  readonly eventId: string | null;
  readonly payloadRef: string;
  readonly sourceLineage: SourceLineage;
  readonly rights: RightsEnvelope;
  readonly time: TimeEnvelope;
  readonly semantic: SemanticEnvelope;
  readonly decision: DecisionEnvelope;
  readonly authority: AuthorityEnvelope;
  readonly risk: RiskEnvelope;
  /** THE single number a page may trust — the meet of every envelope's ceiling. Computed, never assigned. */
  readonly publicExpression: MaxPermittedStrength;
  readonly lifecycle: ClaimLifecycle;
  readonly publicSafe: boolean;
  /** Derived from authority.vector.sourceReality — can never disagree with the authority math. */
  readonly fixtureWatermarked: boolean;
  readonly autopsyHook: AutopsyPlan;
  readonly memoryWrite: MemoryWritePlan;
  readonly explain: ClaimExplanation;
}

// ───────────────────────── pure witnesses + derivations (no math, no clock, no random) ─────────────────────────

/** The fixture watermark is DERIVED, never hard-coded: anything not from LIVE_REAL is watermarked. */
export function deriveFixtureWatermark(v: AuthorityVectorInput): boolean {
  return v.sourceReality !== "LIVE_REAL";
}

/** Deterministic id from stable inputs (FNV-1a over objectType + subject + sorted originRefs). No clock/random. */
export function claimObjectId(input: Pick<ClaimObjectInput, "objectType" | "subject" | "sourceLineage">): string {
  const basis = `${input.objectType}|${input.subject}|${[...input.sourceLineage.originRefs].sort().join(",")}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < basis.length; i++) {
    h ^= basis.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `claim_${input.objectType.toLowerCase()}_${h.toString(16).padStart(8, "0")}`;
}
