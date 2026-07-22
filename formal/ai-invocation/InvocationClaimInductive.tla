-------------------------- MODULE InvocationClaimInductive --------------------------
(***************************************************************************)
(* INDUCTIVE-INVARIANT CHECK for InvocationClaim.tla, using TLC alone via  *)
(* the standard recipe: use the candidate IndInv as the INIT predicate     *)
(* (TypeOK leads the conjunct chain, so every variable is constrained to a *)
(* finite set and TLC can enumerate ALL states satisfying the candidate —  *)
(* reachable or not) with the ORIGINAL Next, and check that every          *)
(* successor of every IndInv state satisfies IndInv again: the inductive   *)
(* step  IndInv /\ [Next]_vars => IndInv'  checked exhaustively.           *)
(*                                                                          *)
(* EXACT CLAIM (checked, receipts in                                        *)
(* InvocationClaimInductive.tlc-receipt.txt):                               *)
(*                                                                          *)
(*   IndInv below is INDUCTIVE for the checked constants                    *)
(*   (|Invocations| = 2, |Attempts| = 2, |Fingerprints| = 2,                *)
(*   |Actors| = 2):                                                         *)
(*                                                                          *)
(*     1. Base:      Init => IndInv        (subsumed by the receipt run of  *)
(*                   the original Spec with every IndInv conjunct as an     *)
(*                   INVARIANT — IndInv holds in all 9,457 reachable        *)
(*                   states, and initial states are reachable);             *)
(*     2. Step:      IndInv /\ [Next]_vars => IndInv'   (TLC enumerated     *)
(*                   all 698,400 states satisfying IndInv and found every   *)
(*                   successor satisfies IndInv — "No error has been        *)
(*                   found", search depth 1);                               *)
(*     3. IndInv => the five checked safety properties (all are conjuncts   *)
(*                   of IndInv, so this is immediate).                      *)
(*                                                                          *)
(*   Together 1-3 PROVE the five safety properties hold in ALL reachable   *)
(*   states for these constants, at ANY depth — strictly stronger than the *)
(*   prior bounded reachability check.                                     *)
(*                                                                          *)
(*   The SAME closure and base-case checks were then also run at the       *)
(*   ORIGINAL reachability-model constants (|Attempts| = 3 —               *)
(*   InvocationClaim.cfg's bound): receipt RUNs 3-4 — 12,787,200 IndInv    *)
(*   states enumerated, 49,190,400 successor transitions checked, no       *)
(*   error, depth 1; base over all 51,601 reachable states. So IndInv is   *)
(*   inductive at BOTH bounds. The CTI loop itself iterated at the         *)
(*   2-attempt bound because TLC computes INIT-predicate enumerations      *)
(*   single-threaded and the 3-attempt candidate product is ~161M raw      *)
(*   states (~24x the 2-attempt product) — fast iterations first, the      *)
(*   expensive bound only for the final candidate; measured rates in the   *)
(*   strengthening log. NOT a parameterized proof for all constants: that  *)
(*   would require Apalache or TLAPS, neither available in this            *)
(*   environment. TLC-only, finite-constants induction is the honest       *)
(*   scope of this artifact.                                               *)
(*                                                                          *)
(* The candidate was strengthened through a real CTI loop — two genuine    *)
(* CTIs, recorded verbatim with diagnosis in                               *)
(* INDUCTIVE_STRENGTHENING_LOG.md alongside this file. Failed candidates   *)
(* (IndInvAttempt1, IndInvAttempt2) are kept below with their .cfg files   *)
(* so every logged run is reproducible. CTI #1 is the unreachable-side     *)
(* mirror of the genuine development bug preserved in                      *)
(* InvocationClaim.counterexample-found-during-development.txt.            *)
(*                                                                          *)
(* This module only EXTENDS the original spec; InvocationClaim.tla is not  *)
(* modified.                                                                *)
(***************************************************************************)
EXTENDS InvocationClaim

(* Attempts currently in flight for invocation `inv`.                      *)
PendingAttemptsOf(inv) ==
    {att \in Attempts : attemptOf[att] = inv /\ attemptOutcome[att] = "Pending"}

(* ------------------------------------------------------------------ *)
(* ATTEMPT 1 (FAILED — CTI #1 in the strengthening log): the five      *)
(* checked safety properties alone, led by TypeOK. TypeOK is already   *)
(* finitely enumerable as an INIT predicate: every variable's first    *)
(* occurrence constrains it to a finite set (rejectedRequests via      *)
(* \subseteq of a finite product, which TLC accepts as a subset        *)
(* generator). Not inductive: nothing caps the number of in-flight     *)
(* attempts an invocation can carry, and nothing ties rejected         *)
(* fingerprint pairs to the id's bound fingerprint.                    *)
(* ------------------------------------------------------------------ *)
IndInvAttempt1 ==
    /\ TypeOK
    /\ AtMostOneClaimOwner
    /\ AtMostOneExternalDispatchPerAttempt
    /\ DispatchAssignmentStable
    /\ SameIdDifferentFingerprintNeverExecutes
    /\ AmbiguousAttemptStopsFallback

InitIndInvAttempt1 == IndInvAttempt1

(* ------------------------------------------------------------------ *)
(* ATTEMPT 2 (FAILED — CTI #2 in the strengthening log): attempt 1 +   *)
(* the auxiliary predicate CTI #1 demanded.                            *)
(*                                                                      *)
(* AtMostOnePendingPerInvocation is the invariant form of Dispatch's   *)
(* "no other attempt outstanding for this invocation" guard (the       *)
(* sequential provider-route walk). CTI #1 had BOTH attempts Pending   *)
(* on one invocation — unreachable, but no candidate conjunct forbade  *)
(* it — so resolving one Ambiguous froze the invocation with the other *)
(* still in flight. The cap must range over invocations of EVERY       *)
(* status, not just Open ones: a Terminal invocation carrying two      *)
(* phantom Pending attempts could still Resolve one to Ambiguous and   *)
(* land in the same violation. Preservation: Dispatch's guard admits a *)
(* new Pending attempt only when the invocation has none, and Resolve  *)
(* only shrinks the in-flight set.                                     *)
(* ------------------------------------------------------------------ *)
AtMostOnePendingPerInvocation ==
    \A inv \in Invocations : Cardinality(PendingAttemptsOf(inv)) <= 1

IndInvAttempt2 ==
    /\ IndInvAttempt1
    /\ AtMostOnePendingPerInvocation

InitIndInvAttempt2 == IndInvAttempt2

(* ------------------------------------------------------------------ *)
(* ATTEMPT 3 (INDUCTIVE — the final candidate): attempt 2 + the        *)
(* auxiliary predicate CTI #2 demanded.                                *)
(*                                                                      *)
(* RejectedImpliesBound: a fingerprint pair can only sit in            *)
(* rejectedRequests if its invocation id is bound to SOME fingerprint. *)
(* CTI #2 had a rejected pair for a still-unbound id, letting a later  *)
(* first-claim bind exactly the fingerprint that was recorded as       *)
(* rejected. In the modeled system the class is unreachable: ClaimOwner *)
(* only records a rejection when the id is already bound to a          *)
(* DIFFERENT fingerprint, and no action ever unbinds an id. This is    *)
(* the WEAKEST missing piece: the full reachable truth also includes   *)
(* "bound to something different from the rejected fingerprint", but   *)
(* that half is already the safety conjunct                            *)
(* SameIdDifferentFingerprintNeverExecutes itself — only the # NoFp    *)
(* half was missing from the candidate. Preservation: rejections are   *)
(* only added in ClaimOwner's already-bound branch, and invocationFp   *)
(* transitions are NoFp -> fp only, never back.                        *)
(* ------------------------------------------------------------------ *)
RejectedImpliesBound ==
    \A inv \in Invocations, fp \in Fingerprints :
        <<inv, fp>> \in rejectedRequests => invocationFp[inv] # NoFp

IndInv ==
    /\ IndInvAttempt2
    /\ RejectedImpliesBound

(* TLC needs the candidate under a dedicated name for the INIT clause.  *)
InitIndInv == IndInv

=====================================================================================
