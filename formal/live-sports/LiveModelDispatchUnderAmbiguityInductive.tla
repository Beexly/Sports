------------- MODULE LiveModelDispatchUnderAmbiguityInductive -------------
(***************************************************************************)
(* COMPOSITIONAL INDUCTIVE-INVARIANT CHECK for the composed spec           *)
(* LiveModelDispatchUnderAmbiguity.tla, using TLC alone via this repo's    *)
(* standard recipe (see ../INDUCTION_DOCTRINE.md and the two prior worked  *)
(* examples ai-invocation/InvocationClaimInductive.tla and                 *)
(* credit-budget/CreditReservationInductive.tla): use the candidate IndInv *)
(* as the INIT predicate (TypeOKFinite leads the conjunct chain, so every  *)
(* variable — including the credit ledger's `reserved`, which the base     *)
(* CR!TypeOK leaves as unbounded Nat — is constrained to a finite set and  *)
(* TLC can enumerate ALL states satisfying the candidate, reachable or     *)
(* not) with the composed ORIGINAL Next, and check that every successor of *)
(* every IndInv state satisfies IndInv again: the inductive step           *)
(*   IndInv /\ [Next]_vars => IndInv'   checked exhaustively.               *)
(*                                                                          *)
(* COMPOSITIONAL, NOT FLATTENED. IndInv is built the way the doctrine's    *)
(* section 7 prescribes: the individually-proven conjuncts of each base    *)
(* module's IndInv are LIFTED through the composition (referenced via the  *)
(* IC!.../CR!... instances the base composed module already declares, or   *)
(* re-stated locally for the two base *auxiliary* predicates that live in  *)
(* the base *Inductive* modules, not the base specs), and only the         *)
(* cross-module GLUE is conjoined on top:                                  *)
(*   - the four glue invariants the composed spec already states           *)
(*     (AmbiguousExposureHeldUntilTrustedResolution,                       *)
(*      ReservedNeverExceedsBudgetWindowCap, AvailableBudgetNeverNegative, *)
(*      NoDispatchWithoutExposureHold), plus                               *)
(*   - one ADDITIONAL glue conjunct the CTI loop showed is actually needed *)
(*     to close induction (InflightImpliesHeld — see the strengthening     *)
(*     log; it is the invariant form of DispatchUnderExposureHold's        *)
(*     `state[att] = "HELD"` guard, the exact wire between the credit hold *)
(*     and the provider dispatch that the composition introduces).         *)
(*                                                                          *)
(* FIXED CONSTANTS ONLY. The loop and the closure receipt run at           *)
(*   Invocations = {i1}, Attempts = {a1,a2}, Fingerprints = {fp1},         *)
(*   Actors = {act1,act2}, TrustedActors = {act1},                         *)
(*   VerifiedBalance = 1, RequestCost = 1                                   *)
(* — a documented shrink of LiveModelDispatchUnderAmbiguity.cfg's          *)
(* reachability bound (2 invocations, 3 attempts, 2 fingerprints,          *)
(* VerifiedBalance = 2). The composed state has 12 variables, five more    *)
(* than InvocationClaim's seven, and TLC computes INIT-predicate           *)
(* enumerations single-threaded: the raw TypeOKFinite product at the full  *)
(* reachability bound is ~10^11 candidate states (the five extra variables *)
(* `reserved,state,admittedCount,releaseReason,releaseBy` multiply the     *)
(* invocation-plane product by ~10^4), which is not enumerable here. The   *)
(* shrink keeps every interference class the COMPOSITION adds: 2 attempts  *)
(* on 1 invocation exercise the invocation-plane sequential-walk class AND *)
(* the credit contention class (VerifiedBalance = 1 < 2 attempts forces a  *)
(* REFUSED authorization), and both are wired to the exposure-hold and     *)
(* ambiguous-resolution glue. The fingerprint-conflict class is NOT        *)
(* re-exercised here (1 fingerprint makes it vacuous) — it is fully proved *)
(* inductive already in ai-invocation/InvocationClaimInductive.tla at 2    *)
(* fingerprints, and the composition adds no fingerprint interaction; the  *)
(* lifted conjuncts SameIdDifferentFingerprintNeverExecutes /              *)
(* RejectedImpliesBound are carried and checked but trivially so. See the  *)
(* strengthening log for the full bound rationale.                         *)
(*                                                                          *)
(* This is NOT a parameterized proof for all constants: that would require *)
(* Apalache (symbolic induction) or TLAPS (deductive proof), NEITHER of    *)
(* which is available in this environment (no Z3/SMT toolchain; see        *)
(* ../README.md and ../INDUCTION_DOCTRINE.md section 8). TLC-only,         *)
(* finite-constants compositional induction is the honest scope of this    *)
(* artifact.                                                                *)
(*                                                                          *)
(* This module only EXTENDS the composed spec; none of                     *)
(* LiveModelDispatchUnderAmbiguity.tla, InvocationClaim.tla,               *)
(* CreditReservation.tla, or the two base *Inductive* modules is modified. *)
(***************************************************************************)
EXTENDS LiveModelDispatchUnderAmbiguity

(* ------------------------------------------------------------------ *)
(* Helper sets, re-stated locally (the composed base module does not    *)
(* EXTEND the base *Inductive* modules, so their helpers/auxiliaries    *)
(* are not in scope here). Identical definitions to the base inductive  *)
(* modules; the variables they mention are the composition's shared     *)
(* variables of the same name.                                          *)
(* ------------------------------------------------------------------ *)

(* From InvocationClaimInductive: attempts in flight (Pending) for `inv`.*)
PendingAttemptsOf(inv) ==
    {att \in Attempts : attemptOf[att] = inv /\ attemptOutcome[att] = "Pending"}

(* From CreditReservationInductive: attempts whose reservation currently *)
(* occupies the balance, and attempts that have taken their Authorize    *)
(* step (either branch).                                                 *)
CommittedAttempts == {t \in Attempts : state[t] \in {"HELD", "SETTLED"}}
StartedAttempts   == {t \in Attempts : state[t] # "Unstarted"}

(* ------------------------------------------------------------------ *)
(* Finite refinement of the composed TypeOK. IC!TypeOK is already       *)
(* finitely enumerable, but CR!TypeOK carries `reserved \in Nat` and    *)
(* `admittedCount \in Nat`, which are NOT enumerable as INIT bindings —  *)
(* so, exactly as CreditReservationInductive.TypeOKFinite does, they    *)
(* are bounded here (`reserved \in 0..VerifiedBalance`, `admittedCount  *)
(* \in 0..Cardinality(Attempts)`). Every other variable is bound to its *)
(* base type. TypeOKFinite => TypeOK.                                   *)
(* ------------------------------------------------------------------ *)
TypeOKFinite ==
    \* InvocationClaim's seven variables (IC!TypeOK, all already finite)
    /\ claimOwner \in [Invocations -> Actors \cup {IC!NoOwner}]
    /\ invocationFp \in [Invocations -> Fingerprints \cup {IC!NoFp}]
    /\ dispatched \in [Attempts -> BOOLEAN]
    /\ attemptOf \in [Attempts -> Invocations \cup {IC!NoInv}]
    /\ attemptOutcome \in [Attempts -> {"Pending", "Succeeded", "Failed", "Ambiguous"}]
    /\ invocationStatus \in [Invocations -> {"Open", "Ambiguous", "Terminal"}]
    /\ rejectedRequests \subseteq (Invocations \X Fingerprints)
    \* CreditReservation's three variables (reserved/admittedCount bounded)
    /\ reserved \in 0..VerifiedBalance
    /\ state \in [Attempts -> {"Unstarted", "HELD", "SETTLED", "RELEASED", "REFUSED"}]
    /\ admittedCount \in 0..Cardinality(Attempts)
    \* the composed module's own two new variables
    /\ releaseReason \in [Attempts -> {"NotReleased", "CleanFailure", "TrustedAmbiguousResolution"}]
    /\ releaseBy \in [Attempts -> Actors \cup {IC!NoOwner}]

(* ------------------------------------------------------------------ *)
(* Lifted base auxiliary predicates. These are the glue conjuncts the   *)
(* two base *Inductive* modules proved they needed; they are re-stated  *)
(* verbatim here (they mention only shared variables the composition    *)
(* still has) so the composed candidate inherits the base modules' own  *)
(* proven strengthening rather than re-deriving it.                     *)
(* ------------------------------------------------------------------ *)

(* From InvocationClaimInductive (invariant form of Dispatch's          *)
(* sequential-walk guard).                                              *)
AtMostOnePendingPerInvocation ==
    \A inv \in Invocations : Cardinality(PendingAttemptsOf(inv)) <= 1

(* From InvocationClaimInductive (a rejected pair's id is bound).       *)
RejectedImpliesBound ==
    \A inv \in Invocations, fp \in Fingerprints :
        <<inv, fp>> \in rejectedRequests => invocationFp[inv] # IC!NoFp

(* From CreditReservationInductive (admittedCount tied to the started   *)
(* set).                                                                *)
AdmittedCountBoundedByStarted ==
    admittedCount <= Cardinality(StartedAttempts)

(* From CreditReservationInductive (every committed hold is covered by  *)
(* the ledger — the predicate that closes both the Release-underflow    *)
(* and over-admission faces).                                           *)
CommittedCoveredByReserved ==
    RequestCost * Cardinality(CommittedAttempts) <= reserved

(* ------------------------------------------------------------------ *)
(* Locally-named aliases for the lifted base *safety* conjuncts, so the *)
(* .cfg files can list each as its own INVARIANT (TLC's INVARIANT lines *)
(* take a module-level operator name, not an IC!.../CR!... qualified    *)
(* reference). These are the base modules' proven safety properties,    *)
(* lifted unchanged through the composition's shared variables. (The    *)
(* composed base spec already re-exports three of these under its own   *)
(* Base* names; these aliases cover the remaining lifted conjuncts so   *)
(* every conjunct of IndInv is individually named for CTI diagnosis.)   *)
(* ------------------------------------------------------------------ *)
LiftedAtMostOneClaimOwner                     == IC!AtMostOneClaimOwner
LiftedAtMostOneExternalDispatchPerAttempt     == IC!AtMostOneExternalDispatchPerAttempt
LiftedDispatchAssignmentStable                == IC!DispatchAssignmentStable
LiftedSameIdDifferentFingerprintNeverExecutes == IC!SameIdDifferentFingerprintNeverExecutes
LiftedAmbiguousAttemptStopsFallback           == IC!AmbiguousAttemptStopsFallback
LiftedLedgerNeverExceedsBalance               == CR!LedgerNeverExceedsBalance
LiftedNeverOverAdmit                          == CR!NeverOverAdmit

(* ------------------------------------------------------------------ *)
(* ATTEMPT 1 (FAILED — CTI #1 in the strengthening log): finite typing  *)
(* + every LIFTED base IndInv conjunct + the four cross-module glue      *)
(* invariants the composed spec already states. No composition-specific  *)
(* glue beyond what the base modules and the base composed spec give.    *)
(* Not inductive: nothing in the candidate ties an in-flight (dispatched *)
(* + still-Pending) attempt to a HELD credit reservation, so a candidate *)
(* state can carry an attempt with attemptOf[att] # NoInv, still         *)
(* Pending, but state[att] # "HELD"; ResolveDispatchOutcome(att,        *)
(* "Ambiguous") then makes it Ambiguous while not HELD and not           *)
(* trusted-released — violating AmbiguousExposureHeldUntilTrustedResolution.*)
(* ------------------------------------------------------------------ *)
IndInvAttempt1 ==
    /\ TypeOKFinite
    \* --- lifted InvocationClaim proven IndInv conjuncts ---
    /\ LiftedAtMostOneClaimOwner
    /\ LiftedAtMostOneExternalDispatchPerAttempt
    /\ LiftedDispatchAssignmentStable
    /\ LiftedSameIdDifferentFingerprintNeverExecutes
    /\ LiftedAmbiguousAttemptStopsFallback
    /\ AtMostOnePendingPerInvocation
    /\ RejectedImpliesBound
    \* --- lifted CreditReservation proven IndInv conjuncts ---
    /\ LiftedLedgerNeverExceedsBalance
    /\ LiftedNeverOverAdmit
    /\ AdmittedCountBoundedByStarted
    /\ CommittedCoveredByReserved
    \* --- cross-module glue already stated in the composed base spec ---
    /\ AmbiguousExposureHeldUntilTrustedResolution
    /\ ReservedNeverExceedsBudgetWindowCap
    /\ AvailableBudgetNeverNegative
    /\ NoDispatchWithoutExposureHold

InitIndInvAttempt1 == IndInvAttempt1

(* ------------------------------------------------------------------ *)
(* ATTEMPT 2 (INDUCTIVE — the final candidate): attempt 1 + the one     *)
(* composition-specific glue conjunct CTI #1 demanded.                  *)
(*                                                                       *)
(* InflightImpliesHeld is the invariant form of DispatchUnderExposureHold's*)
(* `state[att] = "HELD"` guard — the wire the composition adds between   *)
(* the credit ledger and the dispatch plane: an attempt that is in       *)
(* flight (has been dispatched: attemptOf # NoInv) and whose provider    *)
(* outcome is still Pending must be holding its credit reservation       *)
(* (state = "HELD"). CTI #1 had such an attempt with state # "HELD", and *)
(* resolving it Ambiguous produced a non-HELD, non-trusted-released      *)
(* Ambiguous exposure. This is the WEAKEST predicate that blocks the     *)
(* class: it constrains ONLY in-flight-and-Pending attempts (the exact   *)
(* precondition of a Resolve step), and only to "HELD" (the exact        *)
(* precondition AmbiguousExposureHeldUntilTrustedResolution needs at the *)
(* moment an outcome becomes Ambiguous). Preservation is self-contained: *)
(* DispatchUnderExposureHold admits a new in-flight-Pending attempt only *)
(* from state = "HELD"; ResolveDispatchOutcome moves the outcome off     *)
(* Pending (antecedent falls away); AuthorizeExposure can only fire on   *)
(* an "Unstarted" attempt (which InflightImpliesHeld already forces to   *)
(* be not-in-flight-or-not-Pending); and Settle/Release actions all fire *)
(* only on non-Pending outcomes (Succeeded/Failed/Ambiguous), leaving    *)
(* the antecedent false for the attempt they touch.                      *)
(* ------------------------------------------------------------------ *)
InflightImpliesHeld ==
    \A att \in Attempts :
        (attemptOf[att] # IC!NoInv /\ attemptOutcome[att] = "Pending")
            => state[att] = "HELD"

IndInv ==
    /\ IndInvAttempt1
    /\ InflightImpliesHeld

(* TLC needs the candidate under a dedicated name for the INIT clause.   *)
(* IndInv's leading conjunct chain begins with TypeOKFinite, so every    *)
(* variable's first occurrence constrains it to a finite set — the       *)
(* requirement for TLC to enumerate an arbitrary state predicate.        *)
InitIndInv == IndInv

============================================================================
