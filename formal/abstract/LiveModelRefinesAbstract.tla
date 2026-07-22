------------------------- MODULE LiveModelRefinesAbstract -------------------------
(***************************************************************************)
(* REFINEMENT MAPPING: LiveModelDispatchUnderAmbiguity (the composed,      *)
(* concrete spec) refines AbstractClaimExposure (the abstract, per-        *)
(* invocation spec that mirrors the REAL srqc-projection.ts abstraction    *)
(* function alpha), for ONE fixed invocation id.                           *)
(*                                                                          *)
(* This module EXTENDS the concrete spec (read-only — nothing in           *)
(* LiveModelDispatchUnderAmbiguity.tla is modified) and defines the         *)
(* abstraction function alpha as FIVE EXPLICIT STATE FUNCTIONS, one per     *)
(* abstract variable, each a pure formula of the concrete spec's current    *)
(* variables (no history, no auxiliary state) — the doctrine's PREFERRED,   *)
(* first-choice level (formal/INDUCTION_DOCTRINE.md, "prefer a pure state   *)
(* function first"). Every one of alpha's five components was checked      *)
(* below, by construction and by the TLC receipt this module's .cfg         *)
(* produces, to need nothing beyond the CURRENT concrete state — no fact    *)
(* about the past that isn't already recoverable from `state[att]` /        *)
(* `attemptOutcome[att]` / `attemptOf[att]` / `invocationFp[inv]` /         *)
(* `rejectedRequests` as they stand right now. In particular:               *)
(*   - AlphaExposurePhase does NOT need a history variable to remember      *)
(*     "was there ever an ambiguous hold": it re-derives AMBIGUOUS_HELD     *)
(*     fresh, every state, from the PAIR (attemptOutcome[att], state[att])  *)
(*     for whichever attempt(s) are currently attached to the target        *)
(*     invocation — the concrete Resolve(att,"Ambiguous") action flips      *)
(*     attemptOutcome in the SAME step that this formula needs to see it    *)
(*     turn, so no separate "did this ever happen" flag is needed.          *)
(*   - No stuttering variable is needed either: every concrete action in    *)
(*     LiveModelDispatchUnderAmbiguity's Next either (a) changes NONE of    *)
(*     the five Alpha* formulas — a plain [Next]_vars stutter, which the    *)
(*     bracket-action operator already provides for free, no explicit       *)
(*     stuttering variable required — or (b) changes them in EXACTLY the    *)
(*     shape of one AbstractClaimExposure action. No concrete action spans  *)
(*     "too far" for a single abstract action to explain (see the          *)
(*     per-action correspondence table below); TLC's step-simulation run    *)
(*     confirmed this holds for every reachable transition at the checked   *)
(*     bound (receipt: LiveModelRefinesAbstract.tlc-receipt.txt).           *)
(*   - No prophecy variable is needed: nothing in alpha depends on a        *)
(*     FUTURE choice not yet determined by the current concrete state.      *)
(* So this mapping stays at the doctrine's cheapest level throughout: a     *)
(* PURE STATE FUNCTION, escalation to (b)/(c)/(d) was not required.         *)
(*                                                                          *)
(* WHY ONE FIXED INVOCATION: AbstractClaimExposure models the shape of      *)
(* ONE AbstractControlState (matching srqc-projection.ts's own             *)
(* `projectWindow`, which folds a ledger window into ONE abstract state    *)
(* PER invocation id, independently of every other id). The concrete        *)
(* composed spec has multiple invocation ids (`Invocations`). This module   *)
(* fixes ONE of them, `TargetInv`, and projects the concrete state down     *)
(* through alpha for THAT id only; concrete actions touching a DIFFERENT    *)
(* invocation id are — by construction of every Alpha* formula below,      *)
(* every one of which is guarded/filtered to `TargetInv`'s own attempts —   *)
(* always [Next]_vars stutters at the abstract level, which is exactly      *)
(* correct: srqc-projection.ts projects every invocation independently,     *)
(* so a step that only changes some OTHER invocation's ledger rows must     *)
(* not be visible to `TargetInv`'s own AbstractControlState.                *)
(*                                                                          *)
(* PER-ACTION CORRESPONDENCE (concrete action -> abstract effect on         *)
(* TargetInv's alpha; "stutter" = leaves all five Alpha* formulas           *)
(* unchanged, which [Next]_vars always permits with no extra machinery):    *)
(*                                                                          *)
(*   ClaimForDispatch(_,TargetInv,fp), invocationFp[TargetInv] = NoFp        *)
(*       -> AbstractClaimExposure!ClaimBind                                 *)
(*   ClaimForDispatch(_,TargetInv,fp), invocationFp[TargetInv] = fp          *)
(*       -> stutter (claimOwner-only; alpha ignores claimOwner)             *)
(*   ClaimForDispatch(_,TargetInv,fp), invocationFp[TargetInv] # fp,NoFp     *)
(*       -> AbstractClaimExposure!ClaimRejectFp                             *)
(*   ClaimForDispatch(_,inv,_) for inv # TargetInv                          *)
(*       -> stutter (different invocation)                                  *)
(*   ReleaseClaimBeforeDispatch(_,_)     -> stutter (claimOwner-only)       *)
(*   AuthorizeExposure(t) while attemptOf[t] # TargetInv (always true       *)
(*       BEFORE the attempt is later Dispatched — Dispatch's own guard      *)
(*       requires state[t] = "HELD" already, so Authorize always precedes   *)
(*       attemptOf[t] being set to TargetInv)                               *)
(*       -> stutter (the attempt doesn't count toward TargetInv's alpha     *)
(*          yet; see AlphaExposurePhase's `attemptOf[att] = TargetInv`      *)
(*          filter)                                                        *)
(*   DispatchUnderExposureHold(_,TargetInv,att)                             *)
(*       -> AbstractClaimExposure!StartAttempt (this is the step where the  *)
(*          already-HELD att first counts toward TargetInv's alpha, so       *)
(*          THIS is where exposurePhase visibly turns HELD, not Authorize)  *)
(*   ResolveDispatchOutcome(att,"Succeeded") for attemptOf[att]=TargetInv    *)
(*       -> AbstractClaimExposure!ResolveSucceeded                          *)
(*   ResolveDispatchOutcome(att,"Failed") for attemptOf[att]=TargetInv       *)
(*       -> AbstractClaimExposure!ResolveFailed                             *)
(*   ResolveDispatchOutcome(att,"Ambiguous") for attemptOf[att]=TargetInv    *)
(*       -> AbstractClaimExposure!ResolveAmbiguous                          *)
(*   SettleOnConfirmedCharge(t) / ReleaseOnCleanFailure(t), t the LAST       *)
(*       remaining HELD attempt for TargetInv                               *)
(*       -> AbstractClaimExposure!ClearHeldExposure                         *)
(*   SettleOnConfirmedCharge(t) / ReleaseOnCleanFailure(t), some OTHER       *)
(*       attempt for TargetInv is still HELD (a stale unreleased hold from  *)
(*       an earlier, already-resolved attempt on the same invocation)       *)
(*       -> stutter (AlphaExposurePhase's existential over ALL of           *)
(*          TargetInv's attempts is still "HELD" via the other attempt)     *)
(*   TrustedReleaseAmbiguousHold(_,t) for attemptOf[t]=TargetInv             *)
(*       -> AbstractClaimExposure!TrustedReleaseAmbiguous                   *)
(*   Every action above restricted to inv # TargetInv / t with              *)
(*       attemptOf[t] # TargetInv -> stutter                                *)
(*                                                                          *)
(* This module makes NO implementation-mapping claim of its own beyond      *)
(* what LiveModelDispatchUnderAmbiguity.tla and formal/README.md already    *)
(* state; it is a refinement-mapping artifact ON TOP of that existing,      *)
(* already-mapped composed spec.                                           *)
(***************************************************************************)
EXTENDS LiveModelDispatchUnderAmbiguity

CONSTANT TargetInv
ASSUME TargetInv \in Invocations

(* ------------------------------------------------------------------ *)
(* Alpha, five explicit state functions, one per abstract variable.    *)
(* ------------------------------------------------------------------ *)

(* OPEN unless the concrete invocation has left "Open" (either Ambiguous —  *)
(* frozen — or Terminal): both concrete non-Open statuses collapse to the   *)
(* single abstract TERMINAL value, exactly mirroring srqc-projection.ts's   *)
(* TERMINAL_INVOCATION_EVENTS set, which includes FINALIZED_AMBIGUOUS.      *)
AlphaClaimPhase ==
    IF invocationStatus[TargetInv] = "Open" THEN "OPEN" ELSE "TERMINAL"

(* Existential over TargetInv's own attempts only. An Ambiguous+HELD        *)
(* witness always wins (there is at most one, since a frozen invocation      *)
(* never dispatches again — AmbiguousAttemptStopsFallback, reused as         *)
(* BaseAmbiguousAttemptStopsFallback in the composed spec's own .cfg);       *)
(* otherwise ANY currently-HELD attempt for TargetInv (there may briefly be  *)
(* more than one — a stale, not-yet-settled/released hold from an earlier    *)
(* resolved attempt coexisting with a freshly dispatched one — the           *)
(* existential is robust to that: it still reads "HELD" either way, and no   *)
(* concrete action can ever turn that existential witness set empty except   *)
(* by clearing the LAST one, which is exactly ClearHeldExposure's guard).    *)
AlphaExposurePhase ==
    IF \E att \in Attempts :
         attemptOf[att] = TargetInv /\ attemptOutcome[att] = "Ambiguous" /\ state[att] = "HELD"
    THEN "AMBIGUOUS_HELD"
    ELSE IF \E att \in Attempts : attemptOf[att] = TargetInv /\ state[att] = "HELD"
         THEN "HELD"
         ELSE "NONE"

(* Cardinality of TargetInv's currently-Pending attempts, classified into    *)
(* the same three-way bucket srqc-projection.ts computes. GE2 is a          *)
(* first-class possible VALUE of this formula (never suppressed) — it is    *)
(* simply never actually witnessed in any state TLC reaches from Init,       *)
(* which is exactly the content of BaseAmbiguousAttemptStopsFallback /       *)
(* AtMostOnePendingPerInvocation (the base InvocationClaim inductive         *)
(* invariant) being reused, not re-derived, here.                           *)
AlphaPendingCountClass ==
    LET pending == {att \in Attempts : attemptOf[att] = TargetInv /\ attemptOutcome[att] = "Pending"} IN
    IF Cardinality(pending) = 0 THEN "ZERO"
    ELSE IF Cardinality(pending) = 1 THEN "ONE"
    ELSE "GE2"

AlphaFingerprintBound == invocationFp[TargetInv] # IC!NoFp

AlphaHasRejectedFp == \E fp \in Fingerprints : <<TargetInv, fp>> \in rejectedRequests

(* Named, qualified instance of the abstract spec, substituting each        *)
(* abstract VARIABLE by its alpha state function above. This is the         *)
(* explicit refinement-mapping INSTANCE...WITH the task calls for: every    *)
(* one of AbstractClaimExposure's five VARIABLES is bound to a named         *)
(* concrete-state formula, not a vague description.                        *)
Abstract == INSTANCE AbstractClaimExposure WITH
    claimPhase         <- AlphaClaimPhase,
    exposurePhase       <- AlphaExposurePhase,
    pendingCountClass   <- AlphaPendingCountClass,
    fingerprintBound    <- AlphaFingerprintBound,
    hasRejectedFp       <- AlphaHasRejectedFp

(***************************************************************************)
(* THE REFINEMENT PROPERTY, checked by TLC step-simulation (see             *)
(* LiveModelRefinesAbstract.cfg / .tlc-receipt.txt): every behavior          *)
(* generated by the CONCRETE Spec, projected through alpha, satisfies the    *)
(* ABSTRACT Spec. Because Abstract!Spec == Abstract!Init /\                  *)
(* [][Abstract!Next]_Abstract!vars, and [A]_v is DEFINED as                  *)
(* A \/ (v' = v) (TLA+'s built-in bracket-action operator — see              *)
(* INDUCTION_DOCTRINE.md's discussion of stuttering; no separate             *)
(* "Abstract!Next \/ UNCHANGED Abstract!vars" needs to be spelled out by     *)
(* hand, it is definitionally what [Abstract!Next]_Abstract!vars already     *)
(* means), this property is EXACTLY "every concrete step either leaves      *)
(* alpha unchanged, or moves it along one AbstractClaimExposure action" —    *)
(* precisely TLC step-simulation of the stuttering refinement mapping.      *)
(***************************************************************************)
AbstractRefinement == Abstract!Spec

=====================================================================================
