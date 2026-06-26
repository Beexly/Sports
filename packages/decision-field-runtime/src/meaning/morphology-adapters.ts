/**
 * MORPHOLOGY ADAPTERS — lossless lifts of every existing object into a ClaimObjectInput.
 *
 * This is where "pages become renderers" begins: each adapter takes an object the institution already
 * builds (a derived stat, a trend passport, a prediction trial, an odds price, a market state, a bonus,
 * a bookmaker rating, a source genome, an alert, a decision card, web evidence) and lifts it into the
 * ONE universal grammar — preserving lineage, rights, time, authority, and fixture state. Adapters
 * NEVER set publicExpression; the compiler downgrades. On FIXTURE data the authority meet caps every
 * lifted object at INFO_ONLY, exactly as each source passport already behaves.
 *
 * Pure + deterministic. Reuses FIXTURE_AUTHORITY (parallax-instrument) and every source object's
 * already-computed honesty fields (fragility, process grade, display gates) — never recomputed here.
 */

import { FIXTURE_AUTHORITY } from "../parallax-instrument.js";
import type { AuthorityVectorInput } from "../authority-vector.js";
import type { MaxPermittedStrength } from "../decision-state-stat-contract.js";
import type { MatchDerivedStat } from "../match-derived-stats.js";
import type { TrendPassport } from "../trend-passport.js";
import type { PredictionTrial } from "../prediction-court.js";
import type { MarketBloomRecord } from "../market-bloom.js";
import type { OddsExample } from "../universal-event-genome.js";
import type { WatchlistAlert } from "../watchlist-alerts.js";
import type { BonusPassport, BookmakerRatingPassport, SourceGenome } from "@sports/data-intelligence";
import type { PublicObserverRecord } from "../public-observer-ledger.js";
import type {
  ClaimObjectInput,
  RightsEnvelope,
  TimeEnvelope,
  SourceLineage,
  RiskBand,
  SourceKind,
} from "./claim-object.js";

// ───────────────────────── shared fixture builders ─────────────────────────

/** A fixture authority vector with the object's INTRINSIC ceiling expressed as localExpression. The */
/** fixture meet still caps the compiled publicExpression at INFO_ONLY (sourceReality binds). */
function fixtureVector(localExpression: MaxPermittedStrength, evidence: AuthorityVectorInput["evidence"] = "THIN"): AuthorityVectorInput {
  return { ...FIXTURE_AUTHORITY, localExpression, evidence };
}

/** A permissive fixture rights envelope: our own derived signals on open/fixture data, display-safe. */
function fixtureRights(over: Partial<RightsEnvelope> = {}): RightsEnvelope {
  return {
    status: "approved_open_license",
    legalVerdict: "FREE_OPEN",
    commercialDisplayAllowed: true,
    publicDisplayAllowed: true,
    storageAllowed: true,
    derivedUseAllowed: true,
    modelTrainingAllowed: false,
    redistributionAllowed: false,
    attributionRequired: true,
    attributionText: "fixture",
    ownerApprovalRequired: false,
    reviewStatus: "REVIEWED",
    reviewedAtLabel: "fixture",
    ...over,
  };
}

function fixtureTime(knownAtLabel: string | null, over: Partial<TimeEnvelope> = {}): TimeEnvelope {
  return {
    eventTimeLabel: "fixture",
    observedAtLabel: "fixture",
    knownAtLabel,
    capturedAtLabel: "fixture",
    staleAtLabel: null,
    validUntilLabel: null,
    decisionTimeLabel: knownAtLabel,
    knowability: "KNOWABLE",
    pointInTimeSafe: true,
    futureLeakageRisk: false,
    ...over,
  };
}

function lineageFromRefs(refs: readonly string[], kind: SourceKind, provider: string | null, proofRefs: readonly string[] = []): SourceLineage {
  return {
    originRefs: refs,
    providerName: provider,
    sourceId: refs[0] ?? null,
    endpointOrUrl: null,
    sourceKind: kind,
    directOrDerived: kind === "INTERNAL_DERIVED" ? "DERIVED" : "DIRECT",
    legalVerdict: "FREE_OPEN",
    capturedAtLabel: "fixture",
    observedAtLabel: "fixture",
    knownAtLabel: "pre-match",
    sourceConfidence: 0.6,
    independentOriginCount: new Set(refs).size,
    proofRefs,
  };
}

function band(x: number, hi = 0.66, mid = 0.33): RiskBand {
  return x >= hi ? "HIGH" : x >= mid ? "MEDIUM" : "LOW";
}

// ───────────────────────── adapters ─────────────────────────

/** A derived match stat → DERIVED_STAT. value === null caps at INFO_ONLY through the compiler. */
export function matchStatToClaimObject(stat: MatchDerivedStat, eventId: string, sport: string): ClaimObjectInput {
  return {
    objectType: "DERIVED_STAT",
    subject: stat.name,
    sport,
    eventId,
    payloadRef: `match-derived-stats:${stat.key}`,
    sourceLineage: lineageFromRefs(stat.inputs.length ? stat.inputs : [], "INTERNAL_DERIVED", "GSE internal (fixture)", [`stat-passport:${stat.key}`]),
    rights: fixtureRights(),
    time: fixtureTime("pre-match"),
    semantic: {
      plainText: stat.explanation,
      definition: stat.passport.questionAnswered,
      formula: stat.formula,
      units: stat.passport.unit,
      interpretation: stat.decisionUse,
      decisionMeaning: stat.decisionUse,
      factClass: null,
      factType: null,
      falsifier: stat.passport.falsifier,
      sampleFragility: 1, // single match
      contextDependence: "single match (n=1)",
    },
    decision: {
      possibleActions: [],
      currentDecisionState: "WATCHLIST",
      decisionUse: stat.decisionUse,
      suppressesAction: stat.value === null,
      whatWouldChangeDecision: "a larger sample or a moved line",
      creditableFactTypes: [],
    },
    risk: {
      legalRisk: "LOW", dataQualityRisk: "MEDIUM", modelRisk: "MEDIUM", bettingComplianceRisk: "LOW",
      userHarmRisk: "LOW", overclaimRisk: "MEDIUM", affiliateConflictRisk: "NONE",
      weakness: stat.weakness, whatWouldInvalidate: stat.passport.falsifier,
      riskFlags: stat.value === null ? ["value missing"] : ["n=1"],
    },
    authorityVector: fixtureVector("ACTION"),
    requestedExpression: "PUBLIC_ACTION",
    autopsyHook: { settlesWhen: "at full-time", gradingProtocol: "compare the read against the settled result", hasTrial: false, autopsyRef: `stat-passport:${stat.key}` },
    memoryWrite: { ledger: "LEARNING", metricKey: stat.key, writesOnSettle: true, note: "fixture" },
  };
}

/** A trend passport → TREND. Its intrinsic ceiling (WATCH with a line, else INFO_ONLY) is localExpression. */
export function trendToClaimObject(t: TrendPassport): ClaimObjectInput {
  const fragility = t.fragilityScore;
  return {
    objectType: "TREND",
    subject: t.claim,
    sport: t.sport,
    eventId: t.eventId,
    payloadRef: `trend-passport:${t.trendId}`,
    sourceLineage: lineageFromRefs(t.sourceRefs, "INTERNAL_DERIVED", "GSE internal (fixture)", [`trend-passport:${t.trendId}`]),
    rights: fixtureRights(),
    time: fixtureTime(t.knownAt),
    semantic: {
      plainText: t.claim,
      definition: `hit rate over ${t.sampleScope}`,
      formula: `${t.hitCount}/${t.sampleSize}`,
      units: "rate",
      interpretation: t.decisionUse,
      decisionMeaning: t.decisionUse,
      factClass: null,
      factType: null,
      falsifier: t.whatWouldInvalidate,
      sampleFragility: fragility,
      contextDependence: t.correlatedTrends.length ? "correlated with other trends" : "small sample",
    },
    decision: {
      possibleActions: t.marketLine == null ? [] : ["watch the market"],
      currentDecisionState: "WATCHLIST",
      decisionUse: t.decisionUse,
      suppressesAction: t.marketLine == null,
      whatWouldChangeDecision: "a larger, independent sample",
      creditableFactTypes: [],
    },
    risk: {
      legalRisk: "LOW", dataQualityRisk: band(fragility), modelRisk: "MEDIUM", bettingComplianceRisk: "LOW",
      userHarmRisk: t.correlatedTrends.length ? "MEDIUM" : "LOW", overclaimRisk: band(fragility),
      affiliateConflictRisk: "NONE",
      weakness: t.weakness, whatWouldInvalidate: t.whatWouldInvalidate,
      riskFlags: [`fragility ${fragility}`, `overfit ${t.overfitRisk}`, ...(t.correlatedTrends.length ? ["correlated"] : [])],
    },
    // intrinsic ceiling is the passport's own authorityCeiling; fixture meet still caps at INFO_ONLY
    authorityVector: fixtureVector(t.authorityCeiling),
    requestedExpression: "PUBLIC_ACTION",
    autopsyHook: { settlesWhen: "when the market settles", gradingProtocol: "grade process (sample/overfit) apart from outcome", hasTrial: true, autopsyRef: `trend-trial:${t.trendId}` },
    memoryWrite: { ledger: "LEARNING", metricKey: t.trendId, writesOnSettle: true, note: "fixture" },
  };
}

/** A prediction trial → PREDICTION. Missing publish time/odds caps grading; claim strength is localExpression. */
export function predictionTrialToClaimObject(p: PredictionTrial, claimStrength: MaxPermittedStrength = "INFO_ONLY"): ClaimObjectInput {
  return {
    objectType: "PREDICTION",
    subject: `${p.market} — ${p.selection}`,
    sport: null,
    eventId: p.matchId,
    payloadRef: `prediction-court:${p.predictionId}`,
    sourceLineage: lineageFromRefs([`odds-api(fixture)`], "INTERNAL_DERIVED", "GSE internal (fixture)", [`prediction-court:${p.predictionId}`]),
    rights: fixtureRights(),
    time: fixtureTime("pre-match"),
    semantic: {
      plainText: `${p.market}: ${p.selection}`,
      definition: "a published call put on trial",
      formula: null,
      units: null,
      interpretation: p.lesson,
      decisionMeaning: "process graded apart from outcome",
      factClass: null,
      factType: null,
      falsifier: "the settled result",
      sampleFragility: null,
      contextDependence: null,
    },
    decision: {
      possibleActions: [],
      currentDecisionState: p.result === "UNKNOWN" ? "WATCHLIST" : "PASS",
      decisionUse: p.lesson,
      suppressesAction: !p.authorityRespected,
      whatWouldChangeDecision: "a settled outcome with good process",
      creditableFactTypes: [],
    },
    risk: {
      legalRisk: "LOW", dataQualityRisk: "LOW", modelRisk: "MEDIUM", bettingComplianceRisk: "LOW",
      userHarmRisk: "LOW", overclaimRisk: p.authorityRespected ? "LOW" : "HIGH", affiliateConflictRisk: "NONE",
      weakness: p.authorityRespected ? "single trial" : "claim exceeded its authority ceiling",
      whatWouldInvalidate: "a fair loss with the same process",
      riskFlags: [`process ${p.processGrade}`, ...(p.authorityRespected ? [] : ["authority too strong"])],
    },
    authorityVector: fixtureVector(claimStrength),
    requestedExpression: claimStrength,
    autopsyHook: { settlesWhen: "at settlement", gradingProtocol: "process grade vs outcome grade; a push is never a win", hasTrial: true, autopsyRef: `prediction-court:${p.predictionId}` },
    memoryWrite: { ledger: "LEARNING", metricKey: p.predictionId, writesOnSettle: true, note: "no fixture trial is a public performance claim" },
  };
}

/** An odds price → ODDS_PRICE. */
export function oddsPriceToClaimObject(o: OddsExample, eventId: string, sport: string): ClaimObjectInput {
  return {
    objectType: "ODDS_PRICE",
    subject: `${o.market} — ${o.selection}`,
    sport,
    eventId,
    payloadRef: `odds:${eventId}:${o.market}:${o.selection}`,
    sourceLineage: lineageFromRefs(["the-odds-api"], "LICENSED_API", "The Odds API (fixture)", []),
    rights: fixtureRights({ status: "approved_api", legalVerdict: "LICENSED" }),
    time: fixtureTime(o.observedAtLabel),
    semantic: {
      plainText: `${o.selection} at ${o.price.toFixed(2)} across ${o.bookCount} book(s)`,
      definition: "an illustrative fixture price",
      formula: null, units: "decimal odds", interpretation: "context for the market lifecycle",
      decisionMeaning: "a price is not an edge without a lifecycle", factClass: null, factType: null,
      falsifier: "the closing price", sampleFragility: null, contextDependence: `${o.bookCount} books`,
    },
    decision: {
      possibleActions: [], currentDecisionState: "WATCHLIST", decisionUse: "read with the market lifecycle",
      suppressesAction: o.bookCount < 2, whatWouldChangeDecision: "more books and recent movement", creditableFactTypes: [],
    },
    risk: {
      legalRisk: "LOW", dataQualityRisk: o.bookCount < 2 ? "MEDIUM" : "LOW", modelRisk: "LOW", bettingComplianceRisk: "MEDIUM",
      userHarmRisk: "LOW", overclaimRisk: "LOW", affiliateConflictRisk: "NONE",
      weakness: "a single price says nothing about timing", whatWouldInvalidate: "the line moving", riskFlags: [`${o.bookCount} books`],
    },
    authorityVector: fixtureVector("WATCH"),
    requestedExpression: "PUBLIC_ACTION",
    autopsyHook: { settlesWhen: "at close", gradingProtocol: "compare to closing line (CLV)", hasTrial: false, autopsyRef: null },
    memoryWrite: { ledger: "REALITY", metricKey: `${o.market}:${o.selection}`, writesOnSettle: false, note: "fixture price" },
  };
}

/** A market lifecycle record → MARKET_STATE. suppressesAction flows straight through. */
export function marketBloomToClaimObject(m: MarketBloomRecord): ClaimObjectInput {
  return {
    objectType: "MARKET_STATE",
    subject: m.marketKey,
    sport: m.sport,
    eventId: m.eventId,
    payloadRef: `market-bloom:${m.marketKey}`,
    sourceLineage: lineageFromRefs(["the-odds-api"], "LICENSED_API", "The Odds API (fixture)", [`market-bloom:${m.marketKey}`]),
    rights: fixtureRights({ status: "approved_api", legalVerdict: "LICENSED" }),
    time: fixtureTime("pre-match", { staleAtLabel: m.stage === "STALE" ? "stale" : null }),
    semantic: {
      plainText: `${m.marketKey} is ${m.stage}`,
      definition: "where this market is in its life",
      formula: null, units: null, interpretation: m.note, decisionMeaning: m.note,
      factClass: null, factType: null, falsifier: "the market closing", sampleFragility: null, contextDependence: `${m.bookCount} books`,
    },
    decision: {
      possibleActions: m.suppressesAction ? [] : ["watch"],
      currentDecisionState: m.suppressesAction ? (m.stage === "STALE" ? "NEEDS_LIVE_DATA" : "TOO_LATE") : "WATCHLIST",
      decisionUse: m.note, suppressesAction: m.suppressesAction,
      whatWouldChangeDecision: "the market broadening or moving", creditableFactTypes: [],
    },
    risk: {
      legalRisk: "LOW", dataQualityRisk: "LOW", modelRisk: "LOW", bettingComplianceRisk: "MEDIUM",
      userHarmRisk: "LOW", overclaimRisk: "LOW", affiliateConflictRisk: "NONE",
      weakness: "a young/thin market is watch-only", whatWouldInvalidate: "the market maturing",
      riskFlags: m.suppressesAction ? ["suppresses action"] : [],
    },
    authorityVector: fixtureVector("WATCH"),
    requestedExpression: "PUBLIC_ACTION",
    autopsyHook: { settlesWhen: "at close", gradingProtocol: "was the lifecycle read correct", hasTrial: false, autopsyRef: null },
    memoryWrite: { ledger: "REALITY", metricKey: m.marketKey, writesOnSettle: false, note: "fixture" },
  };
}

/** A bonus passport → BONUS. displayAllowed === false makes the compiler refuse/cap via rights. */
export function bonusPassportToClaimObject(b: BonusPassport): ClaimObjectInput {
  const blocked = !b.displayAllowed;
  return {
    objectType: "BONUS",
    subject: `${b.bookmaker} — ${b.headline}`,
    sport: null,
    eventId: null,
    payloadRef: `bonus-passport:${b.offerId}`,
    sourceLineage: lineageFromRefs([b.offerId], "MANUAL_FIXTURE", b.bookmaker, [`bonus-passport:${b.offerId}`]),
    // a bonus that can't display is mapped to a permission_required rights envelope → compiler caps it
    rights: fixtureRights({
      status: blocked ? "permission_required" : "approved_written_permission",
      legalVerdict: blocked ? "RIGHTS_REVIEW" : "FREE_CAUTION",
      commercialDisplayAllowed: !blocked,
      ownerApprovalRequired: true,
      reviewStatus: b.lastVerifiedAt ? "REVIEWED" : "UNKNOWN",
    }),
    time: fixtureTime(b.lastVerifiedAt ?? null, { knowability: b.lastVerifiedAt ? "KNOWABLE" : "SOURCE_UNCLEAR" }),
    semantic: {
      plainText: b.headline,
      definition: `a ${b.jurisdiction} promotional offer`,
      formula: null, units: null, interpretation: "an offer with terms and risk, never advice",
      decisionMeaning: "compliance-gated; GSE never operates betting", factClass: null, factType: null,
      falsifier: "the offer expiring or terms changing", sampleFragility: null, contextDependence: b.jurisdiction,
    },
    decision: {
      possibleActions: [], currentDecisionState: "PASS", decisionUse: "informational, compliance-gated",
      suppressesAction: true, whatWouldChangeDecision: "owner verification + configuration", creditableFactTypes: [],
    },
    risk: {
      legalRisk: blocked ? "HIGH" : "MEDIUM", dataQualityRisk: b.lastVerifiedAt ? "LOW" : "HIGH", modelRisk: "NONE",
      bettingComplianceRisk: "HIGH", userHarmRisk: "MEDIUM", overclaimRisk: "MEDIUM", affiliateConflictRisk: b.affiliateConfigured ? "MEDIUM" : "HIGH",
      weakness: blocked ? `display blocked: ${b.disclaimer}` : "promotional content requires the responsible-gaming frame",
      whatWouldInvalidate: "expiry or unverified legality", riskFlags: b.displayAllowed ? [] : ["display blocked"],
    },
    authorityVector: fixtureVector("INFO_ONLY"),
    requestedExpression: "PERSONALIZED",
    autopsyHook: { settlesWhen: "on re-verification", gradingProtocol: "was the offer still current and legal", hasTrial: false, autopsyRef: null },
    memoryWrite: { ledger: "DECISION", metricKey: b.offerId, writesOnSettle: false, note: "compliance-gated" },
  };
}

/** A bookmaker rating → BOOKMAKER_RATING. Only displayable with stated criteria + verified jurisdiction. */
export function bookmakerRatingToClaimObject(r: BookmakerRatingPassport): ClaimObjectInput {
  const blocked = !r.ratingDisplayable;
  return {
    objectType: "BOOKMAKER_RATING",
    subject: r.bookmaker,
    sport: null,
    eventId: null,
    payloadRef: `bookmaker-rating:${r.bookmaker}`,
    sourceLineage: lineageFromRefs([r.bookmaker], "MANUAL_FIXTURE", r.bookmaker, []),
    rights: fixtureRights({
      status: blocked ? "permission_required" : "approved_written_permission",
      legalVerdict: blocked ? "RIGHTS_REVIEW" : "FREE_CAUTION",
      commercialDisplayAllowed: !blocked,
      ownerApprovalRequired: true,
      reviewStatus: r.lastVerifiedAt ? "REVIEWED" : "UNKNOWN",
    }),
    time: fixtureTime(r.lastVerifiedAt ?? null, { knowability: r.lastVerifiedAt ? "KNOWABLE" : "SOURCE_UNCLEAR" }),
    semantic: {
      plainText: `${r.bookmaker} evidence card`,
      definition: "an evidence-based bookmaker assessment",
      formula: null, units: null, interpretation: "criteria-based; never 'best' without a stated method",
      decisionMeaning: "evidence card, not a ranking funnel", factClass: null, factType: null,
      falsifier: "a license or methodology change", sampleFragility: null, contextDependence: r.jurisdiction,
    },
    decision: {
      possibleActions: [], currentDecisionState: "PASS", decisionUse: "informational, criteria-gated",
      suppressesAction: true, whatWouldChangeDecision: "verified jurisdiction + stated criteria", creditableFactTypes: [],
    },
    risk: {
      legalRisk: blocked ? "HIGH" : "MEDIUM", dataQualityRisk: r.lastVerifiedAt ? "LOW" : "HIGH", modelRisk: "NONE",
      bettingComplianceRisk: "HIGH", userHarmRisk: "MEDIUM", overclaimRisk: "MEDIUM", affiliateConflictRisk: "HIGH",
      weakness: blocked ? "rating not displayable" : "ratings require stated criteria", whatWouldInvalidate: "criteria or license change",
      riskFlags: r.ratingDisplayable ? [] : ["not displayable"],
    },
    authorityVector: fixtureVector("INFO_ONLY"),
    requestedExpression: "PERSONALIZED",
    autopsyHook: { settlesWhen: "on re-verification", gradingProtocol: "did the criteria hold", hasTrial: false, autopsyRef: null },
    memoryWrite: { ledger: "DECISION", metricKey: r.bookmaker, writesOnSettle: false, note: "criteria-gated" },
  };
}

/** A source genome → API_PROVIDER. legalVerdict drives rights; an unproven provider is never LIVE. */
export function sourceGenomeToClaimObject(g: SourceGenome): ClaimObjectInput {
  const forbidden = g.legalVerdict === "DO_NOT_USE";
  return {
    objectType: "API_PROVIDER",
    subject: g.provider,
    sport: null,
    eventId: null,
    payloadRef: `source-genome:${g.sourceId}`,
    sourceLineage: lineageFromRefs([g.sourceId], "INTERNAL_DERIVED", g.provider, [`source-genome:${g.sourceId}`]),
    rights: fixtureRights({
      status: forbidden ? "excluded" : g.legalVerdict === "LICENSED" ? "approved_api" : "vendor_candidate",
      legalVerdict: g.legalVerdict,
      commercialDisplayAllowed: !forbidden,
      ownerApprovalRequired: true,
    }),
    time: fixtureTime("evaluation"),
    semantic: {
      plainText: `${g.provider} — decision leverage ${g.decisionLeverage}, proof value ${g.proofValue}`,
      definition: "a candidate data source under evaluation",
      formula: null, units: null, interpretation: "evaluate before ingestion", decisionMeaning: "a provider is not LIVE without a trial",
      factClass: null, factType: null, falsifier: "a failed integration trial", sampleFragility: null, contextDependence: null,
    },
    decision: {
      possibleActions: [], currentDecisionState: "WATCHLIST", decisionUse: "source acquisition planning",
      suppressesAction: true, whatWouldChangeDecision: "a passed shadow trial + rights clearance", creditableFactTypes: [],
    },
    risk: {
      legalRisk: forbidden ? "HIGH" : band(g.rightsRisk), dataQualityRisk: "MEDIUM", modelRisk: "NONE", bettingComplianceRisk: "LOW",
      userHarmRisk: "LOW", overclaimRisk: "LOW", affiliateConflictRisk: "NONE",
      weakness: "provider marketing is not fact", whatWouldInvalidate: "a failed trial", riskFlags: forbidden ? ["forbidden"] : [],
    },
    authorityVector: fixtureVector("INFO_ONLY"),
    requestedExpression: "WATCH",
    autopsyHook: { settlesWhen: "after a shadow trial", gradingProtocol: "did the provider beat its baseline", hasTrial: true, autopsyRef: null },
    memoryWrite: { ledger: "LEARNING", metricKey: g.sourceId, writesOnSettle: true, note: "provider trial" },
  };
}

/** A watchlist alert → ALERT. Alerts carry reason + proof and are never an action. */
export function alertToClaimObject(a: WatchlistAlert): ClaimObjectInput {
  return {
    objectType: "ALERT",
    subject: a.reason,
    sport: null,
    eventId: a.subjectId,
    payloadRef: `alert:${a.alertId}`,
    sourceLineage: lineageFromRefs([a.proofRef], "INTERNAL_DERIVED", "GSE internal (fixture)", [a.proofRef]),
    rights: fixtureRights(),
    time: fixtureTime(a.firedAtLabel),
    semantic: {
      plainText: a.reason,
      definition: `a ${a.type.replace(/_/g, " ").toLowerCase()} alert`,
      formula: null, units: null, interpretation: "explains why it fired and links its proof",
      decisionMeaning: "an alert is never a call to bet", factClass: null, factType: null,
      falsifier: "the underlying subject reverting", sampleFragility: null, contextDependence: null,
    },
    decision: {
      possibleActions: [], currentDecisionState: "WATCHLIST", decisionUse: "follow the subject; no pressure",
      suppressesAction: true, whatWouldChangeDecision: "the subject's own state", creditableFactTypes: [],
    },
    risk: {
      legalRisk: "LOW", dataQualityRisk: "LOW", modelRisk: "LOW", bettingComplianceRisk: "LOW",
      userHarmRisk: "LOW", overclaimRisk: "LOW", affiliateConflictRisk: "NONE",
      weakness: "an alert is context, not a decision", whatWouldInvalidate: "the trigger reverting", riskFlags: [],
    },
    authorityVector: fixtureVector("INFO_ONLY"),
    requestedExpression: "WATCH",
    autopsyHook: { settlesWhen: "when the subject settles", gradingProtocol: "was the alert worth firing", hasTrial: false, autopsyRef: a.proofRef },
    memoryWrite: { ledger: "BELIEF", metricKey: a.alertId, writesOnSettle: false, note: "fixture alert" },
  };
}

/**
 * Web evidence → WEB_EVIDENCE. The highest-rights-risk class: rights envelope is REQUIRED and supplied
 * by the caller (the apps/web boundary adapter). By default the compiler caps it at INFO_ONLY.
 */
export function webEvidenceToClaimObject(args: {
  subject: string;
  url: string;
  summary: string;
  rights: RightsEnvelope;
  knownAtLabel: string | null;
}): ClaimObjectInput {
  return {
    objectType: "WEB_EVIDENCE",
    subject: args.subject,
    sport: null,
    eventId: null,
    payloadRef: `web-evidence:${args.url}`,
    sourceLineage: { ...lineageFromRefs([args.url], "WEB_EVIDENCE", null, [args.url]), endpointOrUrl: args.url, legalVerdict: args.rights.legalVerdict },
    rights: args.rights,
    time: fixtureTime(args.knownAtLabel, { knowability: "SOURCE_UNCLEAR" }),
    semantic: {
      plainText: args.summary,
      definition: "an external observation awaiting rights promotion",
      formula: null, units: null, interpretation: "evidence, never production truth", decisionMeaning: "cannot become fact without permission",
      factClass: null, factType: null, falsifier: "a contradicting primary source", sampleFragility: null, contextDependence: null,
    },
    decision: {
      possibleActions: [], currentDecisionState: "DATA_CONFLICT", decisionUse: "context only, rights-gated",
      suppressesAction: true, whatWouldChangeDecision: "rights promotion to a licensed source", creditableFactTypes: [],
    },
    risk: {
      legalRisk: "HIGH", dataQualityRisk: "HIGH", modelRisk: "LOW", bettingComplianceRisk: "LOW",
      userHarmRisk: "LOW", overclaimRisk: "HIGH", affiliateConflictRisk: "NONE",
      weakness: "unverified web content", whatWouldInvalidate: "a primary source", riskFlags: ["web evidence", "rights-gated"],
    },
    authorityVector: fixtureVector("INFO_ONLY"),
    requestedExpression: "WATCH",
    autopsyHook: { settlesWhen: "on rights review", gradingProtocol: "was the evidence promotable", hasTrial: false, autopsyRef: null },
    memoryWrite: { ledger: "BELIEF", metricKey: args.url, writesOnSettle: false, note: "web evidence" },
  };
}

/**
 * A public observer record → PUBLIC_OBSERVER_RESULT. The highest-discovery, lowest-authority class:
 * rights are permission_required and the public clock is source-unclear, so the compiler caps it to
 * INFO_ONLY (and it can never settle). High identity/latency value, near-zero direct decision value.
 */
export function publicObserverToClaimObject(r: PublicObserverRecord): ClaimObjectInput {
  return {
    objectType: "PUBLIC_OBSERVER_RESULT",
    subject: r.subject,
    sport: r.sport,
    eventId: r.eventId,
    payloadRef: `public-observer:${r.observerId}`,
    sourceLineage: { ...lineageFromRefs([r.sourceId], "WEB_EVIDENCE", r.providerName, [`public-observer:${r.observerId}`]), legalVerdict: r.rightsEnvelope.legalVerdict },
    rights: r.rightsEnvelope,
    time: fixtureTime(r.observedAtLabel, { capturedAtLabel: r.capturedAtLabel, knowability: "SOURCE_UNCLEAR" }),
    semantic: {
      plainText: `${r.publicTitle ?? r.subject}${r.publicStatus ? ` · ${r.publicStatus}` : ""}`,
      definition: `what ${r.providerName} is showing the public`,
      formula: null,
      units: null,
      interpretation: "public display truth — what the public sees, not official truth",
      decisionMeaning: "discovery + identity + latency; never settlement",
      factClass: null,
      factType: null,
      falsifier: "an official/licensed source disagreeing",
      sampleFragility: null,
      contextDependence: `${r.engine}${r.location ? ` · ${r.location}` : ""}`,
    },
    decision: {
      possibleActions: [],
      currentDecisionState: "DATA_CONFLICT",
      decisionUse: "public visibility, entity resolution, and public-consensus-lag — never a settlement or an action",
      suppressesAction: true,
      whatWouldChangeDecision: "cross-verification by an official/licensed source",
      creditableFactTypes: [],
    },
    risk: {
      legalRisk: "MEDIUM", dataQualityRisk: "MEDIUM", modelRisk: "LOW", bettingComplianceRisk: "LOW",
      userHarmRisk: "LOW", overclaimRisk: "HIGH", affiliateConflictRisk: "NONE",
      weakness: "public display is not official truth; it can lag reality and the market",
      whatWouldInvalidate: "an official source showing a different state",
      riskFlags: ["public observer", "not official", `${r.kgmids.length} kgmid(s)`, `${r.highlights.length} highlight(s)`],
    },
    authorityVector: fixtureVector(r.authorityCeiling),
    requestedExpression: "WATCH",
    autopsyHook: { settlesWhen: "on cross-verification", gradingProtocol: "compare the public display against the official source (public-consensus-lag)", hasTrial: false, autopsyRef: `public-observer:${r.observerId}` },
    memoryWrite: { ledger: "BELIEF", metricKey: r.observerId, writesOnSettle: false, note: "public observer — what the public was shown" },
  };
}

/**
 * A decision card → DECISION_CARD. The §bridge: the caller passes cardStrengthFromClaims(card.claims)
 * as `cardStrength`, which becomes the localExpression input — CardClaim is consumed, never replaced.
 */
export function decisionCardToClaimObject(args: {
  cardId: string;
  title: string;
  sport: string | null;
  eventId: string | null;
  cardStrength: MaxPermittedStrength;
  proofRefs: readonly string[];
  decisionState: import("../decision-state.js").DecisionState;
}): ClaimObjectInput {
  return {
    objectType: "DECISION_CARD",
    subject: args.title,
    sport: args.sport,
    eventId: args.eventId,
    payloadRef: `decision-card:${args.cardId}`,
    sourceLineage: lineageFromRefs(args.proofRefs.length ? args.proofRefs : [], "INTERNAL_DERIVED", "GSE internal (fixture)", args.proofRefs),
    rights: fixtureRights(),
    time: fixtureTime("pre-match"),
    semantic: {
      plainText: args.title,
      definition: "a decision card built from sub-claims",
      formula: null, units: null, interpretation: "strength is the meet of its essential claims",
      decisionMeaning: "an authority-bounded expression of what was knowable", factClass: null, factType: null,
      falsifier: "a contradicting claim", sampleFragility: null, contextDependence: null,
    },
    decision: {
      possibleActions: [], currentDecisionState: args.decisionState, decisionUse: "the card's headline read",
      suppressesAction: false, whatWouldChangeDecision: "a stronger essential claim", creditableFactTypes: [],
    },
    risk: {
      legalRisk: "LOW", dataQualityRisk: "MEDIUM", modelRisk: "MEDIUM", bettingComplianceRisk: "LOW",
      userHarmRisk: "LOW", overclaimRisk: "MEDIUM", affiliateConflictRisk: "NONE",
      weakness: "only as strong as its weakest essential claim", whatWouldInvalidate: "a blocked essential claim", riskFlags: [],
    },
    // the card's own strength (from cardStrengthFromClaims) is the localExpression input
    authorityVector: fixtureVector(args.cardStrength),
    requestedExpression: "PUBLIC_ACTION",
    autopsyHook: { settlesWhen: "at settlement", gradingProtocol: "did the card's read hold", hasTrial: true, autopsyRef: `decision-card:${args.cardId}` },
    memoryWrite: { ledger: "DECISION", metricKey: args.cardId, writesOnSettle: true, note: "fixture card" },
  };
}
