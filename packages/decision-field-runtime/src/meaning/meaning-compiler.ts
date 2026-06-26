/**
 * THE MEANING COMPILER — compileClaimObject and its governed pipeline.
 *
 * One ordered, DOWNGRADE-ONLY transformation turns a `ClaimObjectInput` into a `ClaimObject` whose
 * `publicExpression` is the MEET of every gate. The compiler owns NO new math — every downgrade is
 * produced by a named canonical engine and is reproducible by calling that engine directly (this is
 * Conservation Law 8, "No Parallel Systems", machine-checked in meaning-conservation.theorem.test.ts):
 *
 *   lineage  → an unsourced / competitor-research / unpromoted-web claim caps at INFO_ONLY
 *   rights   → isForbidden() ⇒ DO_NOT_USE; permission_required / RIGHTS_REVIEW ⇒ WATCH; no commercial ⇒ PERSONALIZED
 *   time     → knowableAt() NOT_YET_KNOWABLE / RIGHTS_BLOCKED ⇒ DO_NOT_USE (no future leakage); SOURCE_UNCLEAR ⇒ INFO_ONLY
 *   evidence → (the strength contract's audit already capped via the authority vector's EVIDENCE layer)
 *   authority→ composeAuthority() meet of 8 layers binds the ceiling; on FIXTURE, SOURCE_REALITY ⇒ INFO_ONLY
 *
 * Pure, deterministic, fixture-safe: no wall-clock reads, no randomness, no network, no env. Labels and
 * decision times are passed in. Spec: docs/product/GSE_MEANING_COMPILER.md.
 */

import { strengthMin, rankOf, type MaxPermittedStrength } from "../decision-state-stat-contract.js";
import { composeAuthority, type AuthorityComposition } from "../authority-vector.js";
import { buildFlightRecord } from "../authority-flight-record.js";
import { isForbidden } from "@sports/data-intelligence";
import {
  type ClaimObject,
  type ClaimObjectInput,
  type ClaimDowngrade,
  type ClaimLifecycle,
  type ClaimExplanation,
  type AutopsyPlan,
  type MemoryWritePlan,
  deriveFixtureWatermark,
  claimObjectId,
} from "./claim-object.js";

// Re-export the input/output shapes so consumers can import the whole compiler surface from one module.
export type { ClaimObject, ClaimObjectInput } from "./claim-object.js";

/** A cap is a permitted strength OR an outright refusal. */
const REFUSE = "DO_NOT_USE" as const;
type Cap = MaxPermittedStrength | typeof REFUSE;

function capMin(a: Cap, b: Cap): Cap {
  if (a === REFUSE || b === REFUSE) return REFUSE;
  return strengthMin(a, b);
}

// ───────────────────────── the pipeline ─────────────────────────

export function compileClaimObject(input: ClaimObjectInput): ClaimObject {
  const downgrades: ClaimDowngrade[] = [];
  let cap: Cap = input.requestedExpression;

  // Stage 1 — LINEAGE (blood). An unsourced claim cannot be credited.
  if (input.sourceLineage.originRefs.length === 0) {
    cap = capMin(cap, "INFO_ONLY");
    downgrades.push({ stage: "lineage", engine: "SourceLineage", reason: "no source lineage — an unsourced claim cannot be credited", cappedTo: "INFO_ONLY" });
  }
  if (input.sourceLineage.sourceKind === "COMPETITOR_RESEARCH") {
    cap = capMin(cap, "INFO_ONLY");
    downgrades.push({ stage: "lineage", engine: "SourceLineage", reason: "competitor research can never become production fact", cappedTo: "INFO_ONLY" });
  }
  if (input.sourceLineage.sourceKind === "WEB_EVIDENCE" && !input.rights.derivedUseAllowed && input.rights.status !== "approved_written_permission") {
    cap = capMin(cap, "INFO_ONLY");
    downgrades.push({ stage: "lineage", engine: "SourceLineage", reason: "web evidence cannot become production truth without rights promotion", cappedTo: "INFO_ONLY" });
  }

  // Stage 2 — RIGHTS (immune system). Delegates the forbidden verdict to data-intelligence isForbidden().
  if (isForbidden(input.rights.legalVerdict) || input.rights.status === "excluded" || input.rights.status === "blocked_technical_controls") {
    cap = REFUSE;
    downgrades.push({ stage: "rights", engine: "isForbidden", reason: `rights ${input.rights.status} / ${input.rights.legalVerdict} forbids use`, cappedTo: REFUSE });
  } else if (input.rights.legalVerdict === "RIGHTS_REVIEW" || input.rights.status === "permission_required" || input.rights.reviewStatus === "UNKNOWN") {
    cap = capMin(cap, "WATCH");
    downgrades.push({ stage: "rights", engine: "RightsEnvelope", reason: "rights unknown / permission required — internal only", cappedTo: "WATCH" });
  }
  if (cap !== REFUSE && !input.rights.commercialDisplayAllowed) {
    cap = capMin(cap, "PERSONALIZED");
    downgrades.push({ stage: "rights", engine: "RightsEnvelope", reason: "commercial display not permitted by rights envelope", cappedTo: "PERSONALIZED" });
  }

  // Stage 3 — TIME (nervous system). knowableAt() already produced the verdict; we honor it.
  switch (input.time.knowability) {
    case "NOT_YET_KNOWABLE":
      cap = REFUSE;
      downgrades.push({ stage: "time", engine: "knowableAt", reason: "future fact refused for a past decision (no future leakage)", cappedTo: REFUSE });
      break;
    case "RIGHTS_BLOCKED":
      cap = REFUSE;
      downgrades.push({ stage: "time", engine: "knowableAt", reason: "knowability rights-blocked at decision time", cappedTo: REFUSE });
      break;
    case "SOURCE_UNCLEAR":
      cap = capMin(cap, "INFO_ONLY");
      downgrades.push({ stage: "time", engine: "knowableAt", reason: "source unclear at decision time", cappedTo: "INFO_ONLY" });
      break;
    case "KNOWABLE":
      break;
  }

  // Stage 4 — AUTHORITY (spine). The canonical 8-layer meet binds the ceiling. No hand-set number.
  const composition: AuthorityComposition = composeAuthority(input.authorityVector);
  const flightRecord = buildFlightRecord({
    subject: input.subject,
    requested: input.requestedExpression,
    authority: input.authorityVector,
    receiptRefs: input.sourceLineage.proofRefs,
    timestampLabel: input.time.observedAtLabel ?? "fixture",
  });
  if (rankOf(composition.ceiling) < rankOf(input.requestedExpression)) {
    downgrades.push({ stage: "authority", engine: "composeAuthority", reason: `authority meet binds at ${composition.bindingLayers.join(", ") || "—"}`, cappedTo: composition.ceiling });
  }
  cap = capMin(cap, composition.ceiling);

  // ── Resolve ──
  const refused = cap === REFUSE;
  const publicExpression: MaxPermittedStrength = cap === REFUSE ? "INFO_ONLY" : cap;
  const fixtureWatermarked = deriveFixtureWatermark(input.authorityVector);
  const lifecycle: ClaimLifecycle = refused
    ? "DO_NOT_USE"
    : input.authorityVector.sourceReality === "FIXTURE"
      ? "FIXTURE"
      : input.authorityVector.sourceReality === "SHADOW_REAL"
        ? "SHADOW"
        : rankOf(publicExpression) >= rankOf("WATCH")
          ? "PUBLIC_SAFE"
          : "LIVE";
  // A claim is "publicSafe" only as a LIVE public claim: never on fixtures (always watermarked), never if refused.
  const publicSafe = !refused && !fixtureWatermarked && input.rights.publicDisplayAllowed && rankOf(publicExpression) >= rankOf("WATCH");

  const explain = buildExplanation(input, publicExpression, refused, flightRecord, downgrades, lifecycle);

  return {
    claimObjectId: claimObjectId(input),
    objectType: input.objectType,
    subject: input.subject,
    sport: input.sport ?? null,
    eventId: input.eventId ?? null,
    payloadRef: input.payloadRef,
    sourceLineage: input.sourceLineage,
    rights: input.rights,
    time: input.time,
    semantic: input.semantic,
    decision: input.decision,
    authority: { vector: input.authorityVector, requestedExpression: input.requestedExpression, composition, flightRecord },
    risk: input.risk,
    publicExpression,
    lifecycle,
    publicSafe,
    fixtureWatermarked,
    autopsyHook: input.autopsyHook,
    memoryWrite: input.memoryWrite,
    explain,
  };
}

function buildExplanation(
  input: ClaimObjectInput,
  publicExpression: MaxPermittedStrength,
  refused: boolean,
  flightRecord: ClaimObject["authority"]["flightRecord"],
  downgrades: readonly ClaimDowngrade[],
  lifecycle: ClaimLifecycle,
): ClaimExplanation {
  return {
    whatAmI: `${input.objectType.replace(/_/g, " ").toLowerCase()}: ${input.semantic.plainText}`,
    whereFrom: input.sourceLineage.providerName
      ? `${input.sourceLineage.providerName} (${input.sourceLineage.sourceKind.replace(/_/g, " ").toLowerCase()})`
      : `${input.sourceLineage.sourceKind.replace(/_/g, " ").toLowerCase()}${input.sourceLineage.originRefs.length === 0 ? " — no lineage" : ""}`,
    whenKnowable: `${input.time.knowability.replace(/_/g, " ").toLowerCase()}${input.time.knownAtLabel ? ` · known at ${input.time.knownAtLabel}` : ""}`,
    allowedToMean: refused ? "nothing — this claim is refused (DO_NOT_USE)" : `at most ${publicExpression}`,
    decisionItChanges: input.decision.decisionUse,
    weaknesses: input.risk.weakness,
    authorityStory: `${flightRecord.whyNot} ${flightRecord.whatWouldUpgrade}`,
    afterResult: `${input.autopsyHook.settlesWhen} — ${input.autopsyHook.gradingProtocol}`,
    canBeShownPublicly: !refused, // a fixture CAN be shown (watermarked); a refusal cannot
    whatWouldStrengthen: flightRecord.whatWouldUpgrade,
    downgrades,
  };
}

// ───────────────────────── the named helpers (thin façades over engines) ─────────────────────────

export interface ClaimValidation {
  readonly ok: boolean;
  readonly problems: readonly string[];
}

/**
 * Re-runs the canonical engines and asserts the compiled claim agrees with them — no new math. This is
 * the structural invariant check (a sibling of Conservation Law 8): the claim cannot disagree with the
 * engines that produced it.
 */
export function validateClaimObject(obj: ClaimObject): ClaimValidation {
  const problems: string[] = [];
  const recomposed = composeAuthority(obj.authority.vector);

  if (recomposed.ceiling !== obj.authority.composition.ceiling) {
    problems.push(`authority ceiling drift: stored ${obj.authority.composition.ceiling}, recomputed ${recomposed.ceiling}`);
  }
  if (rankOf(obj.publicExpression) > rankOf(recomposed.ceiling)) {
    problems.push(`publicExpression ${obj.publicExpression} exceeds the authority meet ${recomposed.ceiling} (Conservation of Authority)`);
  }
  if (obj.fixtureWatermarked !== deriveFixtureWatermark(obj.authority.vector)) {
    problems.push("fixtureWatermarked disagrees with sourceReality");
  }
  if (obj.authority.vector.sourceReality === "FIXTURE" && obj.lifecycle !== "DO_NOT_USE" && rankOf(obj.publicExpression) > rankOf("INFO_ONLY")) {
    problems.push(`fixture claim exceeds INFO_ONLY (${obj.publicExpression}) — Fixture Ceiling violated`);
  }
  if (obj.sourceLineage.originRefs.length === 0 && rankOf(obj.publicExpression) > rankOf("INFO_ONLY")) {
    problems.push("unsourced claim exceeds INFO_ONLY — Conservation of Lineage violated");
  }
  if (obj.fixtureWatermarked && obj.publicSafe) {
    problems.push("a fixture-watermarked claim must not be publicSafe");
  }

  return { ok: problems.length === 0, problems };
}

/** Verbatim delegation — the public expression IS the authority meet (no parallel number). */
export function authorityForClaim(obj: ClaimObject): AuthorityComposition {
  return composeAuthority(obj.authority.vector);
}

export function publicExpressionFor(obj: ClaimObject): MaxPermittedStrength {
  return obj.publicExpression;
}

export function decisionEffectFor(obj: ClaimObject): { state: ClaimObject["decision"]["currentDecisionState"]; suppressesAction: boolean; decisionUse: string } {
  return { state: obj.decision.currentDecisionState, suppressesAction: obj.decision.suppressesAction, decisionUse: obj.decision.decisionUse };
}

export function autopsyPlanFor(obj: ClaimObject): AutopsyPlan {
  return obj.autopsyHook;
}

export function memoryWriteFor(obj: ClaimObject): MemoryWritePlan {
  return obj.memoryWrite;
}

/** The ONLY way to lower a ceiling: meet it down and record the auditable downgrade. Pure. */
export function downgradeClaim(obj: ClaimObject, args: { engine: string; reason: string; toCeiling: MaxPermittedStrength }): ClaimObject {
  const next = strengthMin(obj.publicExpression, args.toCeiling);
  if (next === obj.publicExpression) return obj;
  const downgrade: ClaimDowngrade = { stage: "authority", engine: args.engine, reason: args.reason, cappedTo: args.toCeiling };
  return {
    ...obj,
    publicExpression: next,
    publicSafe: obj.publicSafe && rankOf(next) >= rankOf("WATCH"),
    explain: { ...obj.explain, allowedToMean: `at most ${next}`, downgrades: [...obj.explain.downgrades, downgrade] },
  };
}

export function explainClaim(obj: ClaimObject): ClaimExplanation {
  return obj.explain;
}
