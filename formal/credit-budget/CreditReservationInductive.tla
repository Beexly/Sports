------------------------- MODULE CreditReservationInductive -------------------------
(***************************************************************************)
(* INDUCTIVE-INVARIANT CHECK for CreditReservation.tla, using TLC alone    *)
(* via the standard recipe: use the candidate IndInv as the INIT predicate *)
(* (every variable constrained to a finite set, so TLC can enumerate ALL   *)
(* states satisfying it — reachable or not) with the ORIGINAL Next, and    *)
(* check that every successor of every IndInv state satisfies IndInv       *)
(* again. That is exactly the inductive step  IndInv /\ [Next]_vars =>     *)
(* IndInv'  checked exhaustively over the candidate's full state set.      *)
(*                                                                          *)
(* EXACT CLAIM (checked, receipts in                                        *)
(* CreditReservationInductive.tlc-receipt.txt):                             *)
(*                                                                          *)
(*   IndInv below is INDUCTIVE for the checked constants                    *)
(*   (|Attempts| = 4, VerifiedBalance = 3, RequestCost = 1):                *)
(*                                                                          *)
(*     1. Base:      Init => IndInv        (subsumed by the receipt run of  *)
(*                   the original Spec with every IndInv conjunct as an     *)
(*                   INVARIANT — IndInv holds in all 348 reachable states,  *)
(*                   and initial states are reachable);                     *)
(*     2. Step:      IndInv /\ [Next]_vars => IndInv'   (TLC enumerated     *)
(*                   all 6,100 states satisfying IndInv and found every     *)
(*                   successor satisfies IndInv — "No error has been        *)
(*                   found", search depth 1);                               *)
(*     3. IndInv => LedgerNeverExceedsBalance /\ NeverOverAdmit             *)
(*                   (both are conjuncts of IndInv, so this is immediate).  *)
(*                                                                          *)
(*   Together 1-3 PROVE that LedgerNeverExceedsBalance and NeverOverAdmit  *)
(*   hold in ALL reachable states for these constants, at ANY depth —      *)
(*   strictly stronger than the prior bounded reachability check, whose    *)
(*   guarantee is limited to the states BFS actually visited. It is NOT a  *)
(*   parameterized proof for all constants: that would require symbolic /  *)
(*   deductive tooling (Apalache or TLAPS), neither of which is available  *)
(*   in this environment. TLC-only, finite-constants induction is the      *)
(*   honest scope of this artifact.                                        *)
(*                                                                          *)
(* The candidate was strengthened through a real CTI                        *)
(* (counterexample-to-induction) loop — two genuine CTIs, each recorded    *)
(* verbatim with diagnosis in INDUCTIVE_STRENGTHENING_LOG.md alongside     *)
(* this file. The failed candidates (IndInvAttempt1, IndInvAttempt2) are   *)
(* kept below, with their .cfg files, so every logged run is reproducible. *)
(*                                                                          *)
(* This module only EXTENDS the original spec; CreditReservation.tla is    *)
(* not modified.                                                            *)
(***************************************************************************)
EXTENDS CreditReservation

(* Attempts whose reservation currently occupies the balance.              *)
CommittedAttempts == {t \in Attempts : state[t] \in {"HELD", "SETTLED"}}

(* Attempts that have taken their Authorize step (either branch).          *)
StartedAttempts == {t \in Attempts : state[t] # "Unstarted"}

(* Finite refinement of TypeOK: every variable constrained to a finite     *)
(* set, so TLC can enumerate all states satisfying the candidate when it   *)
(* is used as the INIT predicate. TypeOKFinite => TypeOK.                  *)
TypeOKFinite ==
    /\ reserved \in 0..VerifiedBalance
    /\ state \in [Attempts -> {"Unstarted", "HELD", "SETTLED", "RELEASED", "REFUSED"}]
    /\ admittedCount \in 0..Cardinality(Attempts)

(* ------------------------------------------------------------------ *)
(* ATTEMPT 1 (FAILED — CTI #1 in the strengthening log): the safety    *)
(* properties alone, plus finite typing. Not inductive: nothing ties   *)
(* admittedCount to `state`, so a state with admittedCount already at  *)
(* Cardinality(Attempts) but attempts still Unstarted admits one more  *)
(* and leaves the finite type bound.                                   *)
(* ------------------------------------------------------------------ *)
IndInvAttempt1 ==
    /\ TypeOKFinite
    /\ LedgerNeverExceedsBalance
    /\ NeverOverAdmit

InitIndInvAttempt1 == IndInvAttempt1

(* ------------------------------------------------------------------ *)
(* ATTEMPT 2 (FAILED — CTI #2 in the strengthening log): attempt 1 +   *)
(* the auxiliary predicate CTI #1 demanded.                            *)
(*                                                                      *)
(* AdmittedCountBoundedByStarted is the WEAKEST general glue that      *)
(* blocks CTI #1's class: Authorize is the only action that increments *)
(* admittedCount, and both of its branches move the chosen attempt out *)
(* of "Unstarted", so the started-attempt count rises at least as fast *)
(* as admittedCount. Deliberately weaker than the exact history glue   *)
(* admittedCount = Cardinality of ever-admitted attempts               *)
(* (HELD/SETTLED/RELEASED): states where REFUSED attempts pad the      *)
(* bound are admitted into IndInv, and that is fine — the target        *)
(* safety properties never mention admittedCount, it only needs its    *)
(* finite type bound to survive one step.                              *)
(* ------------------------------------------------------------------ *)
AdmittedCountBoundedByStarted ==
    admittedCount <= Cardinality(StartedAttempts)

IndInvAttempt2 ==
    /\ IndInvAttempt1
    /\ AdmittedCountBoundedByStarted

InitIndInvAttempt2 == IndInvAttempt2

(* ------------------------------------------------------------------ *)
(* ATTEMPT 3 (INDUCTIVE — the final candidate): attempt 2 + the        *)
(* auxiliary predicate CTI #2 demanded.                                *)
(*                                                                      *)
(* CommittedCoveredByReserved is the gluing predicate between the      *)
(* ledger total and the per-attempt states: every currently committed  *)
(* (HELD or SETTLED) attempt's cost is actually covered by `reserved`. *)
(* It closes BOTH remaining CTI classes at once:                       *)
(*   - Release underflow (CTI #2): t committed => reserved >=          *)
(*     RequestCost, so Release can never push `reserved` below 0;      *)
(*   - over-admission: RequestCost * |committed'| <= reserved' <=      *)
(*     VerifiedBalance chains through Authorize's atomic guard, so     *)
(*     NeverOverAdmit is preserved by every admitting step.            *)
(* Again the WEAKEST useful form was chosen: an inequality, not the    *)
(* exact reachable truth reserved = RequestCost * |committed|. States  *)
(* where `reserved` over-counts the committed set satisfy IndInv, and  *)
(* they are harmless — both target properties survive over-counting.   *)
(* ------------------------------------------------------------------ *)
CommittedCoveredByReserved ==
    RequestCost * Cardinality(CommittedAttempts) <= reserved

IndInv ==
    /\ IndInvAttempt2
    /\ CommittedCoveredByReserved

(* TLC needs the candidate under a dedicated name for the INIT clause.  *)
(* IndInv's leading conjunct chain begins with TypeOKFinite, so every   *)
(* variable's first occurrence constrains it to a finite set — the      *)
(* requirement for TLC to enumerate an arbitrary state predicate.       *)
InitIndInv == IndInv

=====================================================================================
