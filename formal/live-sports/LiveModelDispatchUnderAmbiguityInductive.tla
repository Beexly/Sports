---------------- MODULE LiveModelDispatchUnderAmbiguityInductive ----------------
(***************************************************************************)
(* COMPOSITIONAL INDUCTIVE-INVARIANT CHECK for                            *)
(* LiveModelDispatchUnderAmbiguity.tla — TLC-only, fixed constants.       *)
(*                                                                          *)
(* DOCTRINE (formal/INDUCTION_DOCTRINE.md §7):                             *)
(*   Lift each base IndInv through INSTANCE substitution, conjoin, and    *)
(*   strengthen ONLY the cross-module glue — do not re-derive a flat      *)
(*   candidate over the product state space.                               *)
(*                                                                          *)
(* BASE ENVELOPES (already closed, receipts in-tree):                      *)
(*   formal/ai-invocation/InvocationClaimInductive.tla  — IndInv           *)
(*   formal/credit-budget/CreditReservationInductive.tla — IndInv          *)
(*                                                                          *)
(* CROSS-MODULE SURFACE (what this module must close):                     *)
(*   Shared Attempts id space                                              *)
(*   DispatchUnderExposureHold  (Authorize before Dispatch)                *)
(*   SettleOnConfirmedCharge / ReleaseOnCleanFailure                       *)
(*   TrustedReleaseAmbiguousHold                                           *)
(*   releaseReason, releaseBy                                              *)
(*   AmbiguousExposureHeldUntilTrustedResolution (+ sibling safeties)      *)
(*                                                                          *)
(* EXACT CLAIM OF ATTEMPT 1 (to be checked under attempt1.cfg):            *)
(*   IndInvAttempt1 is a candidate for                                     *)
(*     IndInvAttempt1 /\ [Next]_vars => IndInvAttempt1'                    *)
(*   over the 2-attempt constant set. If TLC finds a CTI, strengthen       *)
(*   with the weakest cross-module glue (see log). If no error and         *)
(*   depth 1, Attempt1 is inductive for these constants.                   *)
(*                                                                          *)
(* Parent LiveModelDispatchUnderAmbiguity.tla is NOT modified.             *)
(*                                                                          *)
(* Reproduce (from formal/live-sports/, with tla2tools.jar available):     *)
(*   java -cp "$JAR" tlc2.TLC -workers auto -deadlock \                    *)
(*     -I ../ai-invocation -I ../credit-budget \                           *)
(*     -config LiveModelDispatchUnderAmbiguityInductive.attempt1.cfg \     *)
(*     LiveModelDispatchUnderAmbiguityInductive.tla                        *)
(***************************************************************************)
EXTENDS LiveModelDispatchUnderAmbiguity

\* Lift the closed inductive modules. Same CONSTANTS/VARIABLES names as the
\* composed parent bind automatically (INSTANCE without WITH).
ICInd == INSTANCE InvocationClaimInductive
CRInd == INSTANCE CreditReservationInductive

(***************************************************************************)
(* Aliases so .cfg INVARIANT lines name clean, unqualified operators and   *)
(* TLC CTI messages point at a specific conjunct.                          *)
(***************************************************************************)

\* ---- Lifted InvocationClaim inductive conjuncts ----
IC_TypeOK == ICInd!TypeOK
IC_AtMostOneClaimOwner == ICInd!AtMostOneClaimOwner
IC_AtMostOneExternalDispatchPerAttempt == ICInd!AtMostOneExternalDispatchPerAttempt
IC_DispatchAssignmentStable == ICInd!DispatchAssignmentStable
IC_SameIdDifferentFingerprintNeverExecutes == ICInd!SameIdDifferentFingerprintNeverExecutes
IC_AmbiguousAttemptStopsFallback == ICInd!AmbiguousAttemptStopsFallback
IC_AtMostOnePendingPerInvocation == ICInd!AtMostOnePendingPerInvocation
IC_RejectedImpliesBound == ICInd!RejectedImpliesBound

\* ---- Lifted CreditReservation inductive conjuncts ----
CR_TypeOKFinite == CRInd!TypeOKFinite
CR_LedgerNeverExceedsBalance == CRInd!LedgerNeverExceedsBalance
CR_NeverOverAdmit == CRInd!NeverOverAdmit
CR_AdmittedCountBoundedByStarted == CRInd!AdmittedCountBoundedByStarted
CR_CommittedCoveredByReserved == CRInd!CommittedCoveredByReserved

(***************************************************************************)
(* Cross-module glue candidates (added only when a CTI demands them).      *)
(* Attempt 1 starts WITHOUT these — doctrine: weakest candidate first.     *)
(* If Attempt 1 is not inductive, promote the minimal subset into          *)
(* IndInvAttempt2 per the strengthening log.                               *)
(***************************************************************************)

\* Structural corollary of DispatchUnderExposureHold's guard.
DispatchedImpliesEverHeld ==
    \A t \in Attempts :
        dispatched[t] = TRUE => state[t] \notin {"Unstarted", "REFUSED"}

\* releaseReason/releaseBy discipline for Ambiguous outcomes.
AmbiguousHoldDiscipline ==
    \A t \in Attempts :
        attemptOutcome[t] = "Ambiguous" =>
            \/ state[t] = "HELD"
            \/ /\ state[t] = "RELEASED"
               /\ releaseReason[t] = "TrustedAmbiguousResolution"
               /\ releaseBy[t] \in TrustedActors

CleanFailureImpliesFailed ==
    \A t \in Attempts :
        releaseReason[t] = "CleanFailure" => attemptOutcome[t] = "Failed"

TrustedReleaseImpliesAmbiguous ==
    \A t \in Attempts :
        releaseReason[t] = "TrustedAmbiguousResolution" =>
            /\ attemptOutcome[t] = "Ambiguous"
            /\ releaseBy[t] \in TrustedActors

\* NotReleased attempts must still be HELD or never released from HELD path.
NotReleasedConsistent ==
    \A t \in Attempts :
        releaseReason[t] = "NotReleased" =>
            releaseBy[t] = IC!NoOwner

(***************************************************************************)
(* ATTEMPT 1 — weakest compositional candidate                             *)
(*                                                                          *)
(* Leading conjunct TypeOK (composed) constrains every variable including  *)
(* releaseReason/releaseBy to a finite set so TLC can enumerate INIT.      *)
(* Base IndInv conjuncts are lifted in full. Composed safeties are         *)
(* included so IndInvAttempt1 => Safety is immediate.                      *)
(* No extra glue yet — let real CTIs demand it.                            *)
(***************************************************************************)
IndInvAttempt1 ==
    /\ TypeOK
    /\ IC_TypeOK
    /\ IC_AtMostOneClaimOwner
    /\ IC_AtMostOneExternalDispatchPerAttempt
    /\ IC_DispatchAssignmentStable
    /\ IC_SameIdDifferentFingerprintNeverExecutes
    /\ IC_AmbiguousAttemptStopsFallback
    /\ IC_AtMostOnePendingPerInvocation
    /\ IC_RejectedImpliesBound
    /\ CR_TypeOKFinite
    /\ CR_LedgerNeverExceedsBalance
    /\ CR_NeverOverAdmit
    /\ CR_AdmittedCountBoundedByStarted
    /\ CR_CommittedCoveredByReserved
    /\ AmbiguousExposureHeldUntilTrustedResolution
    /\ ReservedNeverExceedsBudgetWindowCap
    /\ AvailableBudgetNeverNegative
    /\ NoDispatchWithoutExposureHold

InitIndInvAttempt1 == IndInvAttempt1

(***************************************************************************)
(* ATTEMPT 2 scaffold — enable after CTI diagnosis. Uncomment glue that    *)
(* blocks the observed CTI class; leave the rest out (weakest-auxiliary).  *)
(***************************************************************************)
IndInvAttempt2 ==
    /\ IndInvAttempt1
    /\ DispatchedImpliesEverHeld
    /\ AmbiguousHoldDiscipline
    /\ CleanFailureImpliesFailed
    /\ TrustedReleaseImpliesAmbiguous
    /\ NotReleasedConsistent

InitIndInvAttempt2 == IndInvAttempt2

(***************************************************************************)
(* Final IndInv placeholder — set equal to the last successful attempt     *)
(* once the CTI loop closes. Until then Attempt1/2 are the working forms.  *)
(***************************************************************************)
IndInv == IndInvAttempt1

InitIndInv == IndInv

===============================================================================
