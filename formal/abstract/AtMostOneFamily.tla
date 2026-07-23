--------------------------- MODULE AtMostOneFamily ---------------------------
(***************************************************************************)
(* W4+ -- CUTOFF FAMILY for the controlled pending-class quotient.          *)
(* (Track A follow-on; standalone formal work, NOT part of any PR itself.)  *)
(*                                                                          *)
(* This is exactly the CONTROLLED system of PendingClassQuotient.tla, but   *)
(* isolated so it can be model-checked as a FAMILY parameterized by the     *)
(* size of the invocation-id set. scripts/formal/run-cutoff-matrix.sh runs  *)
(* TLC over |InvIds| = 1 .. 8 (one cfg per n) and collects the receipts:    *)
(* each n is an independent, exhaustive finite model-check that              *)
(*   SpecC => [](TypeOK /\ AtMostOne)                                        *)
(* holds at that cardinality. The largest n that verified is recorded as    *)
(* N_STAR in formal/receipts/cutoff-matrix/summary.txt.                      *)
(*                                                                          *)
(* This is FINITE CUTOFF/FAMILY EVIDENCE, not a parameterized theorem: each *)
(* n is checked concretely by TLC. The honest deductive target over an      *)
(* arbitrary finite InvIds lives in AtMostOneParam.tla (an UNVERIFIED TLAPS *)
(* target -- tlapm is unavailable here; see TLAPS_DEFERRED.md).             *)
(*                                                                          *)
(* THE QUOTIENT DOMAIN.  `pendingClass[i]` ranges over the same 3-way string *)
(* enum that `apps/web/lib/ai-control-plane/srqc-projection.ts` produces at  *)
(* runtime as `AbstractControlState.pendingCountClass`:                      *)
(*   type PendingCountClass = "ZERO" | "ONE" | "GE2";                        *)
(* with alpha(0)=ZERO, alpha(1)=ONE, alpha(k>=2)=GE2 (absorbing class).     *)
(***************************************************************************)

EXTENDS Naturals, FiniteSets, TLC

CONSTANTS InvIds        \* finite set of invocation ids, e.g. {i1, .., in}

PendingClass == {"ZERO", "ONE", "GE2"}

VARIABLE pendingClass   \* pendingClass \in [InvIds -> PendingClass]

vars == << pendingClass >>

TypeOK == pendingClass \in [InvIds -> PendingClass]

\* Every invocation is at most ONE pending attempt -- never the forbidden GE2.
AtMostOne == \A i \in InvIds : pendingClass[i] # "GE2"

Init == pendingClass = [i \in InvIds |-> "ZERO"]

\* CONTROLLED start: a new pending attempt is admitted ONLY from the ZERO
\* class -- refusing the ONE -> GE2 step that would open a second concurrent
\* pending attempt for the same invocation.
StartControlled(i) ==
    /\ i \in InvIds
    /\ pendingClass[i] = "ZERO"
    /\ pendingClass' = [pendingClass EXCEPT ![i] = "ONE"]

\* Resolving a pending attempt walks the class back down one step (guarded).
End(i) ==
    /\ i \in InvIds
    /\ pendingClass[i] # "ZERO"
    /\ \/ /\ pendingClass[i] = "GE2"
          /\ pendingClass' = [pendingClass EXCEPT ![i] = "ONE"]
       \/ /\ pendingClass[i] = "ONE"
          /\ pendingClass' = [pendingClass EXCEPT ![i] = "ZERO"]

NextControlled == \E i \in InvIds : StartControlled(i) \/ End(i)

SpecC == Init /\ [][NextControlled]_vars

(***************************************************************************)
(* DOCUMENTED CLAIM, per n (established by TLC exhaustive finite model-check *)
(* at each CONSTANTS InvIds = {i1,..,in}; see the cutoff matrix receipts).   *)
(* This is a finite-constant model-check at each cardinality, NOT a TLAPS    *)
(* deductive proof over arbitrary finite InvIds:                            *)
(*                                                                          *)
(*   THEOREM SpecC => [](TypeOK /\ AtMostOne)                               *)
(***************************************************************************)

=============================================================================
