/**
 * CONSTELLATION foundation — Earned autonomy ladder (A0-A9).
 *
 * STATUS: LAB-ONLY / DORMANT. Pure library code. No production wiring, no
 * database calls, no side effects. `DEFAULT_AUTONOMY_LEVEL` is the most
 * conservative level (A0, fully manual) and nothing in this module raises
 * that default — a caller must explicitly pass a higher level.
 *
 * WHAT THIS IS
 * ------------
 * A real, honest state ladder from A0 (fully manual — every action requires
 * owner approval) to A9 (fully autonomous within a bounded, pre-approved
 * envelope). `classifyAutonomy()` decides, for one `ProofCarryingAction`
 * (see `./proof-carrying-action.ts`) at a given ladder level, whether the
 * action is auto-approvable, needs owner confirmation, or is owner-only at
 * every level with no exceptions.
 *
 * THE NON-NEGOTIABLE BOUNDARY
 * ----------------------------
 * `OwnerOnlyActionKind` is a CLOSED union of exactly the action kinds that
 * stay owner-only at every ladder level, full stop — this is not
 * negotiable, per the directive gating this work. They mirror the
 * owner-authority boundaries already real and enforced in this repo this
 * session:
 *   - `CODE_MERGE` / `PRODUCTION_DEPLOY` — every PR in this repo's recent
 *     history up through Wave 5 was merged by the owner or under explicit
 *     owner-approved review gates; nothing here has ever auto-merged or
 *     auto-deployed.
 *   - `BILLING_CHANGE` / `PAYMENT_ACCOUNT_CHANGE` — mirrors
 *     `DEFAULT_FOUNDER_OPERATING_POLICY.automaticSpendAllowed: false`
 *     (`apps/web/lib/opportunity-engine/founder-command.ts`) and the AI
 *     control plane's `CreditAuthorizationPort` being unreachable in
 *     production behind `failClosedCreditAuthorizationPort`
 *     (`apps/web/lib/ai-control-plane/credit-port.ts`) — nothing here can
 *     move money or touch a payment account autonomously.
 *   - `EXTERNAL_OUTREACH` — mirrors
 *     `DEFAULT_FOUNDER_OPERATING_POLICY.automaticPublishAllowed: false`.
 *   - `PRODUCTION_DATA_MIGRATION` / `PRODUCTION_SECRET_CHANGE` — no
 *     migration or secret change in this repo has ever run without an
 *     owner-reviewed PR; there is no autonomous path to either today.
 *
 * STRUCTURAL ENFORCEMENT (not just a runtime `if`)
 * --------------------------------------------------
 * `classifyAutonomy` is generic over the action's `actionKind` string
 * literal. Its return type is `AutonomyDecisionFor<TAction["actionKind"]>`,
 * a conditional type that collapses to the single literal
 * `"OWNER_ONLY_ALWAYS"` whenever `actionKind` is statically known to be one
 * of `OwnerOnlyActionKind` — `"AUTO_APPROVED"` is not a producible type in
 * that case, so a caller who statically knows they are classifying e.g. a
 * `PRODUCTION_DEPLOY` action gets a compile-time guarantee, not just a
 * runtime one. The runtime check backs this up unconditionally: the
 * hard-boundary check runs FIRST, before any ladder-level branch, for every
 * call regardless of `AutonomyLevel` (see the exhaustive A0..A9 test in
 * `autonomy-ladder.test.ts`).
 */

import type { ProofCarryingAction, VerificationStatus } from "./proof-carrying-action";
import type { FounderWorkAuthority } from "../opportunity-engine/founder-command";

// ─────────────────────────────────────────────────────────────────────────────
// The ladder
// ─────────────────────────────────────────────────────────────────────────────

export type AutonomyLevel =
  | "A0"
  | "A1"
  | "A2"
  | "A3"
  | "A4"
  | "A5"
  | "A6"
  | "A7"
  | "A8"
  | "A9";

export const AUTONOMY_LEVELS: readonly AutonomyLevel[] = [
  "A0",
  "A1",
  "A2",
  "A3",
  "A4",
  "A5",
  "A6",
  "A7",
  "A8",
  "A9",
];

export const AUTONOMY_LEVEL_ORDINAL: Readonly<Record<AutonomyLevel, number>> = {
  A0: 0,
  A1: 1,
  A2: 2,
  A3: 3,
  A4: 4,
  A5: 5,
  A6: 6,
  A7: 7,
  A8: 8,
  A9: 9,
};

/**
 * A0: fully manual — every action requires owner approval. This is the
 * conservative default; nothing in this module raises it.
 */
export const DEFAULT_AUTONOMY_LEVEL: AutonomyLevel = "A0";

/**
 * Minimum ladder level at which an `AGENT_INTERNAL`-authority action becomes
 * auto-approvable (still gated on `VERIFIED` evidence — see
 * `classifyAutonomy`). Below this every `AGENT_INTERNAL` action still needs
 * owner confirmation: A0 in particular guarantees "every action requires
 * owner approval" literally, including agent-internal ones.
 */
export const AGENT_INTERNAL_AUTO_APPROVAL_FLOOR: AutonomyLevel = "A1";

/**
 * Minimum ladder level at which an `AGENT_THEN_OWNER`-authority action can
 * skip the owner-confirmation step it was originally classified to always
 * need. Deliberately much higher than the `AGENT_INTERNAL` floor: earning
 * the right to bypass a confirmation step that upstream classification
 * (`founder-command.ts`) intentionally required is a bigger claim than
 * auto-approving something already classified safe-to-log.
 */
export const AGENT_THEN_OWNER_AUTO_APPROVAL_FLOOR: AutonomyLevel = "A6";

// ─────────────────────────────────────────────────────────────────────────────
// The hard boundary — structurally unreachable as auto-approved.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * CLOSED union. Do not add to this list to make something MORE
 * autonomous — only ever to name an additional kind that must stay
 * owner-only. See file header for why each of these seven exists.
 */
export type OwnerOnlyActionKind =
  | "CODE_MERGE"
  | "PRODUCTION_DEPLOY"
  | "BILLING_CHANGE"
  | "PAYMENT_ACCOUNT_CHANGE"
  | "EXTERNAL_OUTREACH"
  | "PRODUCTION_DATA_MIGRATION"
  | "PRODUCTION_SECRET_CHANGE";

export const OWNER_ONLY_ACTION_KINDS: readonly OwnerOnlyActionKind[] = [
  "CODE_MERGE",
  "PRODUCTION_DEPLOY",
  "BILLING_CHANGE",
  "PAYMENT_ACCOUNT_CHANGE",
  "EXTERNAL_OUTREACH",
  "PRODUCTION_DATA_MIGRATION",
  "PRODUCTION_SECRET_CHANGE",
];

const OWNER_ONLY_ACTION_KIND_SET: ReadonlySet<string> = new Set(OWNER_ONLY_ACTION_KINDS);

export function isOwnerOnlyActionKind(actionKind: string): actionKind is OwnerOnlyActionKind {
  return OWNER_ONLY_ACTION_KIND_SET.has(actionKind);
}

// ─────────────────────────────────────────────────────────────────────────────
// Classification
// ─────────────────────────────────────────────────────────────────────────────

export type AutonomyDecision =
  | "AUTO_APPROVED"
  | "NEEDS_OWNER_CONFIRMATION"
  | "OWNER_ONLY_ALWAYS";

/**
 * Any action classifiable by the ladder must carry a stable string
 * `actionKind`. `TAction["actionKind"]` is what
 * {@link AutonomyDecisionFor} keys off of for the structural boundary.
 */
export interface AutonomyClassifiableAction {
  readonly actionKind: string;
}

/**
 * Collapses to the single literal `"OWNER_ONLY_ALWAYS"` when `TKind` is
 * statically known to be one of `OwnerOnlyActionKind` — `"AUTO_APPROVED"`
 * is not a member of that collapsed type, so code that narrows
 * `actionKind` to e.g. `"PRODUCTION_DEPLOY"` gets a compile-time guarantee
 * that `classifyAutonomy` cannot type-check as auto-approved for it.
 */
export type AutonomyDecisionFor<TKind extends string> = TKind extends OwnerOnlyActionKind
  ? "OWNER_ONLY_ALWAYS"
  : AutonomyDecision;

/**
 * Pure classifier. No I/O, no clock reads beyond what the caller already
 * embedded in `pca` — the ladder level is the only external input besides
 * the envelope itself.
 *
 * Decision order (each step is unconditional — none of it is skippable by
 * ladder level, including A9):
 *   1. `pca.action.actionKind` is one of `OWNER_ONLY_ACTION_KINDS` →
 *      `"OWNER_ONLY_ALWAYS"`. Checked FIRST, before any other signal.
 *   2. `pca.authority === "OWNER_ONLY"` (business classification from
 *      `founder-command.ts`, distinct from the seven hard-boundary kinds
 *      above) → always `"NEEDS_OWNER_CONFIRMATION"`. The ladder does not
 *      promote a business-classified owner-only item to auto-approved at
 *      any level; only a change to the upstream classification itself
 *      could do that, which this module does not perform.
 *   3. `pca.authority === "AGENT_INTERNAL"` → `"AUTO_APPROVED"` iff
 *      `level >= AGENT_INTERNAL_AUTO_APPROVAL_FLOOR` AND
 *      `pca.verificationStatus === "VERIFIED"`; otherwise
 *      `"NEEDS_OWNER_CONFIRMATION"`. At A0 this is always
 *      `"NEEDS_OWNER_CONFIRMATION"` — "every action requires owner
 *      approval" is literal at A0.
 *   4. `pca.authority === "AGENT_THEN_OWNER"` → `"AUTO_APPROVED"` iff
 *      `level >= AGENT_THEN_OWNER_AUTO_APPROVAL_FLOOR` AND
 *      `pca.verificationStatus === "VERIFIED"`; otherwise
 *      `"NEEDS_OWNER_CONFIRMATION"`.
 * Unverified evidence NEVER auto-approves, at any level, for any authority.
 */
export function classifyAutonomy<TAction extends AutonomyClassifiableAction>(
  pca: ProofCarryingAction<TAction>,
  level: AutonomyLevel,
): AutonomyDecisionFor<TAction["actionKind"]> {
  if (isOwnerOnlyActionKind(pca.action.actionKind)) {
    return "OWNER_ONLY_ALWAYS" as AutonomyDecisionFor<TAction["actionKind"]>;
  }

  const decision = classifyByAuthority(pca.authority, pca.verificationStatus, level);
  return decision as AutonomyDecisionFor<TAction["actionKind"]>;
}

function classifyByAuthority(
  authority: FounderWorkAuthority,
  verificationStatus: VerificationStatus,
  level: AutonomyLevel,
): Exclude<AutonomyDecision, "OWNER_ONLY_ALWAYS"> {
  if (authority === "OWNER_ONLY") {
    return "NEEDS_OWNER_CONFIRMATION";
  }

  const verified = verificationStatus === "VERIFIED";
  const ordinal = AUTONOMY_LEVEL_ORDINAL[level];

  if (authority === "AGENT_INTERNAL") {
    const floor = AUTONOMY_LEVEL_ORDINAL[AGENT_INTERNAL_AUTO_APPROVAL_FLOOR];
    return verified && ordinal >= floor ? "AUTO_APPROVED" : "NEEDS_OWNER_CONFIRMATION";
  }

  // authority === "AGENT_THEN_OWNER"
  const floor = AUTONOMY_LEVEL_ORDINAL[AGENT_THEN_OWNER_AUTO_APPROVAL_FLOOR];
  return verified && ordinal >= floor ? "AUTO_APPROVED" : "NEEDS_OWNER_CONFIRMATION";
}
