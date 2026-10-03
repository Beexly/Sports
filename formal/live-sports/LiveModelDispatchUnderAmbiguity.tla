-------------------- MODULE LiveModelDispatchUnderAmbiguity --------------------
(***************************************************************************)
(* SCOPE NOTE: this module models AI-provider spend-exposure holds for     *)
(* ambiguous AI-model-dispatch outcomes, composed with the credit-budget   *)
(* admission ledger. It is a read-only formal composition of two existing, *)
(* independently-verified specs (formal/ai-invocation/InvocationClaim.tla  *)
(* and formal/credit-budget/CreditReservation.tla) in this repo's AI       *)
(* control plane. It has nothing to do with wagering or bet settlement:    *)
(* see COMPLIANCE_AND_RESPONSIBLE_GAMING.md section 1 — "GSE is a paid     *)
(* sports-analytics/content subscription — it does not accept wagers,      *)
(* hold customer funds, or settle bets." The "exposure" modeled here is    *)
(* GSE's own AI-provider (LLM API) spend risk while a model-call outcome   *)
(* is unknown, not a customer's stake in an event outcome. Vocabulary is   *)
(* deliberately restricted to AI-model-dispatch / credit-budget terms      *)
(* throughout (dispatch, provider, exposure hold, budget-window cap,       *)
(* trusted-actor resolution) and never uses wagering/settlement-of-bets    *)
(* vocabulary outside of this contrastive citation.                        *)
(*                                                                          *)
(* IMPLEMENTATION MAPPING (informational — not machine-checked):           *)
(*   Same real files InvocationClaim.tla and CreditReservation.tla map to  *)
(*   (apps/web/lib/ai-control-plane/invocation-pipeline.ts,                *)
(*    control-store.ts, credit-admission.ts) — see formal/README.md and    *)
(*   each base spec's own header comment for the authoritative mapping.    *)
(*   This module adds NO new implementation mapping of its own: it models  *)
(*   how those two already-mapped subsystems compose when a single         *)
(*   AI-model-dispatch attempt is BOTH a credit-reservation attempt (in    *)
(*   CreditReservation's `Attempts`) AND an invocation attempt (in         *)
(*   InvocationClaim's `Attempts`) — i.e. `Attempts` is deliberately the   *)
(*   SAME identifier space in both instantiated modules below, modeling    *)
(*   "one attempt id, one credit hold, one provider dispatch."             *)
(*                                                                          *)
(* WHAT'S NEW HERE (not present in either base module alone):              *)
(*   1. DispatchUnderExposureHold — a provider dispatch may only occur     *)
(*      once its attempt already holds an authorized credit reservation    *)
(*      (`state[att] = "HELD"`), wiring CreditReservation's Authorize      *)
(*      before InvocationClaim's Dispatch.                                 *)
(*   2. The credit hold for an attempt whose provider outcome resolves     *)
(*      Ambiguous can NEVER be released by the base, unconditional         *)
(*      `CreditReservation!Release` action directly; the only two ways a   *)
(*      HELD reservation can leave HELD in this composed spec are          *)
(*      (a) SettleOnConfirmedCharge, gated on a Succeeded provider outcome,*)
(*      or (b) ReleaseOnCleanFailure, gated on a Failed provider outcome,  *)
(*      or (c) TrustedReleaseAmbiguousHold, gated on BOTH an Ambiguous     *)
(*      outcome AND `actor \in TrustedActors` — modeling the real system's *)
(*      "ambiguous provider outcomes are only resolved by an explicit,     *)
(*      human/ops-reconciled trusted action, never automatically and       *)
(*      never by elapsed time" posture (this spec has no notion of time    *)
(*      or timeout expiry at all — only discrete, explicitly-guarded       *)
(*      actions cause any state transition, so "not released by time      *)
(*      alone" holds by construction, not merely by the invariant below). *)
(***************************************************************************)
EXTENDS Naturals, FiniteSets, TLC

CONSTANTS
    Invocations,     \* small set of invocation ids (InvocationClaim)
    Attempts,        \* small set of attempt ids — SHARED between the dispatch
                      \* pipeline (InvocationClaim) and the credit ledger
                      \* (CreditReservation): one attempt id names both.
    Fingerprints,    \* small set of content fingerprints (InvocationClaim)
    Actors,          \* small set of actors that may claim/dispatch/release
    TrustedActors,   \* subset of Actors permitted to resolve an ambiguous
                      \* provider-outcome's exposure hold
    VerifiedBalance,  \* the budget window's verified spendable cap (CreditReservation)
    RequestCost       \* cost of a single admitted dispatch against the cap

ASSUME TrustedActors \subseteq Actors

VARIABLES
    claimOwner, invocationFp, dispatched, attemptOf, attemptOutcome,
    invocationStatus, rejectedRequests,           \* InvocationClaim's variables
    reserved, state, admittedCount,                \* CreditReservation's variables
    releaseReason,   \* [Attempts -> {"NotReleased","CleanFailure","TrustedAmbiguousResolution"}]
                      \* why (if at all) an attempt's credit hold was released
    releaseBy         \* [Attempts -> Actors \cup {IC!NoOwner}] which actor performed a
                      \* trusted-actor release (NoOwner sentinel if not a trusted-actor release)

(* Named, qualified instances of both real base modules — using INSTANCE  *)
(* (not EXTENDS) is required here because both base modules independently *)
(* define operators named TypeOK/Init/Next/Spec; qualifying them as       *)
(* IC!... / CR!... avoids a multiply-defined-symbol conflict while still  *)
(* sharing the CONSTANTS/VARIABLES declared above by identical name (the  *)
(* standard TLA+ automatic-substitution rule for INSTANCE with no WITH    *)
(* clause: any of the instantiated module's CONSTANTS/VARIABLES that are  *)
(* also declared, by the same name, in this module are bound to those.)   *)
IC == INSTANCE InvocationClaim
CR == INSTANCE CreditReservation

TypeOK ==
    /\ IC!TypeOK
    /\ CR!TypeOK
    /\ releaseReason \in [Attempts -> {"NotReleased", "CleanFailure", "TrustedAmbiguousResolution"}]
    /\ releaseBy \in [Attempts -> Actors \cup {IC!NoOwner}]

Init ==
    /\ IC!Init
    /\ CR!Init
    /\ releaseReason = [t \in Attempts |-> "NotReleased"]
    /\ releaseBy = [t \in Attempts |-> IC!NoOwner]

(* ------------------------------------------------------------------ *)
(* Actions that pass through to exactly one base module's action,       *)
(* explicitly holding the other module's variables (and this module's   *)
(* own new variables) UNCHANGED — required because a base action's       *)
(* formula, written before these extra variables existed, says nothing   *)
(* at all about them, so composition must state that explicitly.         *)
(* ------------------------------------------------------------------ *)

ClaimForDispatch(actor, inv, fp) ==
    /\ IC!ClaimOwner(actor, inv, fp)
    /\ UNCHANGED <<reserved, state, admittedCount, releaseReason, releaseBy>>

ReleaseClaimBeforeDispatch(actor, inv) ==
    /\ IC!ReleaseClaim(actor, inv)
    /\ UNCHANGED <<reserved, state, admittedCount, releaseReason, releaseBy>>

(* The new cross-module guard: a provider dispatch for attempt `att` may  *)
(* only fire once that attempt already holds an authorized credit         *)
(* reservation. This is the "budget-reservation lifecycle" ordering:      *)
(* Authorize (reserve exposure) must precede Dispatch (spend it).         *)
DispatchUnderExposureHold(actor, inv, att) ==
    /\ state[att] = "HELD"
    /\ IC!Dispatch(actor, inv, att)
    /\ UNCHANGED <<reserved, state, admittedCount, releaseReason, releaseBy>>

ResolveDispatchOutcome(att, outcome) ==
    /\ IC!Resolve(att, outcome)
    /\ UNCHANGED <<reserved, state, admittedCount, releaseReason, releaseBy>>

AuthorizeExposure(t) ==
    /\ CR!Authorize(t)
    /\ UNCHANGED <<claimOwner, invocationFp, dispatched, attemptOf,
                   attemptOutcome, invocationStatus, rejectedRequests,
                   releaseReason, releaseBy>>

(* A HELD exposure settles into a real, confirmed spend ONLY once the     *)
(* provider dispatch it backs has a confirmed Succeeded outcome. *)
SettleOnConfirmedCharge(t) ==
    /\ attemptOutcome[t] = "Succeeded"
    /\ CR!Settle(t)
    /\ UNCHANGED <<claimOwner, invocationFp, dispatched, attemptOf,
                   attemptOutcome, invocationStatus, rejectedRequests,
                   releaseReason, releaseBy>>

(* A HELD exposure is released automatically, with no trusted actor       *)
(* required, ONLY once the provider dispatch it backs has a confirmed     *)
(* Failed (unambiguously no-charge) outcome. *)
ReleaseOnCleanFailure(t) ==
    /\ attemptOutcome[t] = "Failed"
    /\ CR!Release(t)
    /\ releaseReason' = [releaseReason EXCEPT ![t] = "CleanFailure"]
    /\ UNCHANGED <<claimOwner, invocationFp, dispatched, attemptOf,
                   attemptOutcome, invocationStatus, rejectedRequests,
                   releaseBy>>

(* THE flagship action: the ONLY way a HELD exposure whose provider        *)
(* outcome is Ambiguous can ever leave HELD. Requires an explicit trusted  *)
(* actor; no other action in this Next relation can move an Ambiguous      *)
(* attempt's `state` out of "HELD", and there is no passage-of-time        *)
(* action anywhere in this spec, so this also holds "never by time alone." *)
TrustedReleaseAmbiguousHold(actor, t) ==
    /\ actor \in TrustedActors
    /\ attemptOutcome[t] = "Ambiguous"
    /\ CR!Release(t)
    /\ releaseReason' = [releaseReason EXCEPT ![t] = "TrustedAmbiguousResolution"]
    /\ releaseBy' = [releaseBy EXCEPT ![t] = actor]
    /\ UNCHANGED <<claimOwner, invocationFp, dispatched, attemptOf,
                   attemptOutcome, invocationStatus, rejectedRequests>>

Next ==
    \/ \E actor \in Actors, inv \in Invocations, fp \in Fingerprints :
          ClaimForDispatch(actor, inv, fp)
    \/ \E actor \in Actors, inv \in Invocations :
          ReleaseClaimBeforeDispatch(actor, inv)
    \/ \E actor \in Actors, inv \in Invocations, att \in Attempts :
          DispatchUnderExposureHold(actor, inv, att)
    \/ \E att \in Attempts, outcome \in {"Succeeded", "Failed", "Ambiguous"} :
          ResolveDispatchOutcome(att, outcome)
    \/ \E t \in Attempts : AuthorizeExposure(t)
    \/ \E t \in Attempts : SettleOnConfirmedCharge(t)
    \/ \E t \in Attempts : ReleaseOnCleanFailure(t)
    \/ \E actor \in Actors, t \in Attempts : TrustedReleaseAmbiguousHold(actor, t)

vars == <<claimOwner, invocationFp, dispatched, attemptOf, attemptOutcome,
          invocationStatus, rejectedRequests, reserved, state, admittedCount,
          releaseReason, releaseBy>>

Spec == Init /\ [][Next]_vars

(***************************************************************************)
(* SAFETY INVARIANTS (checked by TLC — see LiveModelDispatchUnderAmbiguity.cfg) *)
(***************************************************************************)

(* (1) + (2): an ambiguous model-dispatch outcome holds its spend-exposure *)
(* rather than auto-releasing it (mirrors IC!AmbiguousAttemptStopsFallback's *)
(* intent, at the credit-ledger layer instead of the dispatch layer), AND  *)
(* the ONLY way that hold ever leaves HELD is an explicit trusted-actor    *)
(* action. Any attempt whose provider outcome is Ambiguous is, in every    *)
(* reachable state, either still HELD, or was released strictly through    *)
(* the TrustedReleaseAmbiguousHold path by a member of TrustedActors.      *)
AmbiguousExposureHeldUntilTrustedResolution ==
    \A t \in Attempts :
        attemptOutcome[t] = "Ambiguous" =>
            \/ state[t] = "HELD"
            \/ (state[t] = "RELEASED"
                /\ releaseReason[t] = "TrustedAmbiguousResolution"
                /\ releaseBy[t] \in TrustedActors)

(* (3): reserved-plus-settled spend across the budget window never        *)
(* exceeds its cap. `reserved` (inherited from CreditReservation) already  *)
(* counts both HELD and SETTLED amounts (see CreditReservation.tla's own   *)
(* comments on `reserved`/`Settle`), so this is the direct wave-3-vocabulary *)
(* restatement of CreditReservation!LedgerNeverExceedsBalance, checked     *)
(* here again over this composed, larger state space, alongside the real   *)
(* base invariant itself (see .cfg) for direct reuse/extension evidence.   *)
ReservedNeverExceedsBudgetWindowCap ==
    reserved <= VerifiedBalance

(* (4): available budget-window headroom never goes negative. Arithmetically *)
(* implied by (3) given reserved, VerifiedBalance \in Nat, but stated and   *)
(* checked as its own explicit invariant per the governing directive.       *)
AvailableBudgetNeverNegative ==
    VerifiedBalance - reserved >= 0

(* Structural corollary of DispatchUnderExposureHold's guard, checked        *)
(* explicitly: no attempt is EVER dispatched to a provider without first    *)
(* having (at some point) held an authorized credit reservation for it —    *)
(* an attempt that was never authorized (still "Unstarted") or was          *)
(* REFUSED admission can never show `dispatched = TRUE`.                    *)
NoDispatchWithoutExposureHold ==
    \A t \in Attempts :
        dispatched[t] = TRUE => state[t] \notin {"Unstarted", "REFUSED"}

(* Direct re-export of the two real base invariants this module composes,  *)
(* so the .cfg can check them by name over the SAME composed state space   *)
(* (not just re-derived corollaries) — explicit evidence of reuse, not      *)
(* duplication, per the wave-3 directive.                                  *)
BaseLedgerNeverExceedsBalance == CR!LedgerNeverExceedsBalance
BaseNeverOverAdmit == CR!NeverOverAdmit
BaseAmbiguousAttemptStopsFallback == IC!AmbiguousAttemptStopsFallback

=============================================================================
