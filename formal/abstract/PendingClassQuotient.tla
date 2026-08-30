--------------------------- MODULE PendingClassQuotient ---------------------------
(***************************************************************************)
(* W4 -- MACHINE-CHECKED PENDING-CLASS QUOTIENT / CUTOFF                    *)
(* (Track A follow-on; standalone formal work, NOT part of any PR itself.)  *)
(*                                                                          *)
(* This module isolates ONE dimension of the AbstractClaimExposure state    *)
(* shape -- the `pendingCountClass` counter-abstraction -- and machine-      *)
(* checks, with TLC over a finite invocation-id set, that a CONTROLLED       *)
(* transition system keeps every invocation in the {ZERO, ONE} region       *)
(* (invariant `AtMostOne`: no invocation ever reaches `GE2`), while the      *)
(* UNCONTROLLED system genuinely CAN reach `GE2`. The second run yields a    *)
(* real counterexample trace, proving the control is load-bearing and the    *)
(* invariant non-vacuous.                                                    *)
(*                                                                          *)
(* THE QUOTIENT DOMAIN.  `pendingClass[i]` ranges over the same 3-way string *)
(* enum that `apps/web/lib/ai-control-plane/srqc-projection.ts` produces at  *)
(* runtime as `AbstractControlState.pendingCountClass`:                      *)
(*                                                                          *)
(*   type PendingCountClass = "ZERO" | "ONE" | "GE2";                        *)
(*                                                                          *)
(* The abstraction function alpha maps a concrete pending-attempt count k    *)
(* (a natural number, `concretePending(inv)` in QUOTIENT.md) to a class:     *)
(*                                                                          *)
(*   alpha(0)      = "ZERO"                                                  *)
(*   alpha(1)      = "ONE"                                                   *)
(*   alpha(k>=2)   = "GE2"   (single ABSORBING class; NOT normalized away)   *)
(*                                                                          *)
(* Unlike AbstractClaimExposure.tla (single-invocation, no CONSTANTS), this  *)
(* module carries an explicit finite CONSTANT `InvIds` so the check ranges   *)
(* over a per-invocation function `pendingClass \in [InvIds -> PendingClass]`.*)
(* This is a class-QUOTIENT SAFETY model-check at fixed |InvIds|; it is NOT  *)
(* an attempt-id-injectivity proof and NOT a parameterized (forall N) result.*)
(*                                                                          *)
(* HONESTY REGISTER (per ../README.md, ../INDUCTION_DOCTRINE.md).  The       *)
(* THEOREM below is established by TLC's EXHAUSTIVE finite model-check of the *)
(* reachable state space at the model constants -- it is a finite-constant   *)
(* model-check, NOT a TLAPS deductive proof and NOT a forall-N parameterized *)
(* theorem. TLAPS / Apalache are unavailable in this environment.            *)
(***************************************************************************)

EXTENDS Naturals

CONSTANTS InvIds        \* finite set of invocation ids, e.g. {i1, i2, i3}

PendingClass == {"ZERO", "ONE", "GE2"}

VARIABLE pendingClass   \* pendingClass \in [InvIds -> PendingClass]

vars == << pendingClass >>

TypeOK == pendingClass \in [InvIds -> PendingClass]

\* Every invocation is at most ONE pending attempt -- never the forbidden GE2.
AtMostOne == \A i \in InvIds : pendingClass[i] # "GE2"

\* All invocations start with zero pending attempts.
Init == pendingClass = [i \in InvIds |-> "ZERO"]

(***************************************************************************)
(* UNCONTROLLED dynamics.  StartAttempt models opening a pending attempt    *)
(* for invocation i with NO admission control: it walks the class up one    *)
(* step, ZERO -> ONE -> GE2, and GE2 absorbs. The ZERO -> ONE -> GE2 walk   *)
(* is exactly alpha applied to k, k+1: opening a second concurrent pending  *)
(* attempt (k = 1 -> k = 2) crosses into the GE2 class -- the forbidden     *)
(* "second concurrent pending" that InvocationClaim's                       *)
(* AtMostOnePendingPerInvocation rules out.                                 *)
(***************************************************************************)
StartAttempt(i) ==
    /\ i \in InvIds
    /\ \/ /\ pendingClass[i] = "ZERO"
          /\ pendingClass' = [pendingClass EXCEPT ![i] = "ONE"]
       \/ /\ pendingClass[i] = "ONE"
          /\ pendingClass' = [pendingClass EXCEPT ![i] = "GE2"]
       \/ /\ pendingClass[i] = "GE2"
          /\ pendingClass' = [pendingClass EXCEPT ![i] = "GE2"]

\* Resolving a pending attempt walks the class back down one step.
\* Guarded: nothing to end when already ZERO.
EndAttempt(i) ==
    /\ i \in InvIds
    /\ pendingClass[i] # "ZERO"
    /\ \/ /\ pendingClass[i] = "GE2"
          /\ pendingClass' = [pendingClass EXCEPT ![i] = "ONE"]
       \/ /\ pendingClass[i] = "ONE"
          /\ pendingClass' = [pendingClass EXCEPT ![i] = "ZERO"]

\* UNCONTROLLED next-state: GE2 is reachable (see uncontrolled receipt).
Next == \E i \in InvIds : StartAttempt(i) \/ EndAttempt(i)

(***************************************************************************)
(* CONTROLLED dynamics.  StartAttemptControlled admits a new pending        *)
(* attempt ONLY from the ZERO class -- it REFUSES the ONE -> GE2 step that   *)
(* would open a second concurrent pending attempt. This is the abstract      *)
(* shadow of the runtime admission guard (DispatchUnderExposureHold /        *)
(* AtMostOnePendingPerInvocation): a start is admitted only when no pending  *)
(* attempt is already outstanding for that invocation.                       *)
(***************************************************************************)
StartAttemptControlled(i) ==
    /\ i \in InvIds
    /\ pendingClass[i] = "ZERO"
    /\ pendingClass' = [pendingClass EXCEPT ![i] = "ONE"]

\* CONTROLLED next-state: EndAttempt is unchanged (draining is always safe).
NextControlled == \E i \in InvIds : StartAttemptControlled(i) \/ EndAttempt(i)

SpecControlled == Init /\ [][NextControlled]_vars

(***************************************************************************)
(* DOCUMENTED CLAIM (established by TLC exhaustive finite model-check of the *)
(* reachable state space at CONSTANTS InvIds = {i1, i2, i3}; see            *)
(* PendingClassQuotient.controlled.tlc-receipt.txt). This is a finite-      *)
(* constant model-check, NOT a TLAPS proof and NOT a forall-N result:       *)
(*                                                                          *)
(*   THEOREM SpecControlled => [](TypeOK /\ AtMostOne)                       *)
(*                                                                          *)
(* Dually, the UNCONTROLLED spec (INIT Init / NEXT Next) VIOLATES AtMostOne: *)
(* TLC returns a counterexample trace reaching a GE2 state, proving the      *)
(* control above is load-bearing (see                                       *)
(* PendingClassQuotient.uncontrolled.tlc-receipt.txt).                       *)
(***************************************************************************)

=============================================================================
