---------------- MODULE LiveModelDispatchUnderAmbiguityInductive ----------------
(***************************************************************************)
(* COMPOSITIONAL INDUCTIVE-INVARIANT CHECK for                            *)
(* LiveModelDispatchUnderAmbiguity.tla — TLC-only, fixed constants.       *)
(*                                                                          *)
(* DOCTRINE: formal/INDUCTION_DOCTRINE.md §7                               *)
(* SMOKE: depth 1, no error after CTI#1 (see *.smoke-tlc-receipt.txt)     *)
(* Parent module is NOT modified.                                          *)
(***************************************************************************)
EXTENDS LiveModelDispatchUnderAmbiguity

ICInd == INSTANCE InvocationClaimInductive
CRInd == INSTANCE CreditReservationInductive

IC_TypeOK == ICInd!TypeOK
IC_AtMostOneClaimOwner == ICInd!AtMostOneClaimOwner
IC_AtMostOneExternalDispatchPerAttempt == ICInd!AtMostOneExternalDispatchPerAttempt
IC_DispatchAssignmentStable == ICInd!DispatchAssignmentStable
IC_SameIdDifferentFingerprintNeverExecutes == ICInd!SameIdDifferentFingerprintNeverExecutes
IC_AmbiguousAttemptStopsFallback == ICInd!AmbiguousAttemptStopsFallback
IC_AtMostOnePendingPerInvocation == ICInd!AtMostOnePendingPerInvocation
IC_RejectedImpliesBound == ICInd!RejectedImpliesBound

CR_TypeOKFinite == CRInd!TypeOKFinite
CR_LedgerNeverExceedsBalance == CRInd!LedgerNeverExceedsBalance
CR_NeverOverAdmit == CRInd!NeverOverAdmit
CR_AdmittedCountBoundedByStarted == CRInd!AdmittedCountBoundedByStarted
CR_CommittedCoveredByReserved == CRInd!CommittedCoveredByReserved

DispatchedImpliesEverHeld ==
    \A t \in Attempts :
        dispatched[t] = TRUE => state[t] \notin {"Unstarted", "REFUSED"}

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

NotReleasedConsistent ==
    \A t \in Attempts :
        releaseReason[t] = "NotReleased" =>
            releaseBy[t] = IC!NoOwner

\* CTI#1 core: Pending without hold -Resolve-> Ambiguous without hold
PendingImpliesHeld ==
    \A t \in Attempts :
        attemptOutcome[t] = "Pending" => state[t] = "HELD"

AttemptAssignedImpliesDispatched ==
    \A t \in Attempts :
        attemptOf[t] # IC!NoInv => dispatched[t] = TRUE

\* Finite INIT typing (composed TypeOK has reserved \in Nat — not enumerable)
ComposedTypeOKFinite ==
    /\ IC_TypeOK
    /\ CR_TypeOKFinite
    /\ releaseReason \in [Attempts -> {"NotReleased", "CleanFailure", "TrustedAmbiguousResolution"}]
    /\ releaseBy \in [Attempts -> Actors \cup {IC!NoOwner}]

IndInvAttempt1 ==
    /\ ComposedTypeOKFinite
    /\ IC_AtMostOneClaimOwner
    /\ IC_AtMostOneExternalDispatchPerAttempt
    /\ IC_DispatchAssignmentStable
    /\ IC_SameIdDifferentFingerprintNeverExecutes
    /\ IC_AmbiguousAttemptStopsFallback
    /\ IC_AtMostOnePendingPerInvocation
    /\ IC_RejectedImpliesBound
    /\ CR_LedgerNeverExceedsBalance
    /\ CR_NeverOverAdmit
    /\ CR_AdmittedCountBoundedByStarted
    /\ CR_CommittedCoveredByReserved
    /\ AmbiguousExposureHeldUntilTrustedResolution
    /\ ReservedNeverExceedsBudgetWindowCap
    /\ AvailableBudgetNeverNegative
    /\ NoDispatchWithoutExposureHold
    /\ PendingImpliesHeld
    /\ AttemptAssignedImpliesDispatched
    /\ NotReleasedConsistent

InitIndInvAttempt1 == IndInvAttempt1

IndInvAttempt2 ==
    /\ IndInvAttempt1
    /\ DispatchedImpliesEverHeld
    /\ AmbiguousHoldDiscipline
    /\ CleanFailureImpliesFailed
    /\ TrustedReleaseImpliesAmbiguous

InitIndInvAttempt2 == IndInvAttempt2

IndInv == IndInvAttempt1
InitIndInv == IndInv

===============================================================================
