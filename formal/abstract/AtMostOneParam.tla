--------------------------- MODULE AtMostOneParam ---------------------------
(***************************************************************************)
(* !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! *)
(* !!  UNVERIFIED PROOF TARGET                                          !! *)
(* !!                                                                    !! *)
(* !!  tlapm / TLAPS is NOT available in this environment. This module   !! *)
(* !!  has NOT been machine-checked. It documents the INTENDED deductive !! *)
(* !!  proof only. Do NOT cite it as a proof.                            !! *)
(* !!                                                                    !! *)
(* !!  The load-bearing, actually-verified artifact is the TLC cutoff    !! *)
(* !!  matrix -- see CUTOFF_CLAIM.md and formal/receipts/cutoff-matrix/. !! *)
(* !!  For the toolchain status and defer policy see                     !! *)
(* !!  ../TLAPS_DEFERRED.md and PARAM_STATUS.md.                         !! *)
(* !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! *)
(*                                                                          *)
(* This module states, as an HONEST DEDUCTIVE TARGET, the parameterized     *)
(* safety theorem that the finite TLC cutoff matrix (AtMostOneFamily.tla,   *)
(* checked for |InvIds| <= N*) provides finite evidence for:                *)
(*                                                                          *)
(*   For an arbitrary FINITE set InvIds, the controlled pending-class       *)
(*   system keeps every invocation out of the GE2 class.                    *)
(*                                                                          *)
(* When a real tlapm is available (see ../docker/Dockerfile.tlaps for the   *)
(* intended pinned toolchain), this proof sketch is what would be           *)
(* discharged; only then, and only with a real certificate under            *)
(* formal/receipts/tlaps/*.log, may any "TLAPS: yes" status be recorded.    *)
(***************************************************************************)

EXTENDS AtMostOneFamily, TLAPS

ASSUME FiniteInvIds == IsFiniteSet(InvIds)

(***************************************************************************)
(* INDUCTIVE INVARIANT.  For the CONTROLLED system, TypeOK /\ AtMostOne is  *)
(* itself inductive: no controlled action can move any invocation into GE2. *)
(* StartControlled(i) only produces "ONE" (from "ZERO"); End(i) only        *)
(* produces "ONE" or "ZERO". So GE2 is never introduced, at any |InvIds|.   *)
(***************************************************************************)
Inv == TypeOK /\ AtMostOne

(***************************************************************************)
(* THEOREM (UNVERIFIED TARGET -- tlapm unavailable, NOT machine-checked):   *)
(*                                                                          *)
(*   SpecC => []AtMostOne                                                    *)
(*                                                                          *)
(* The proof structure below is the intended deductive argument. It has     *)
(* NOT been checked by tlapm. Do not read the presence of BY / QED as       *)
(* evidence of a verified proof.                                            *)
(***************************************************************************)
THEOREM Safety == SpecC => []AtMostOne
<1>1. Init => Inv
  BY DEF Init, Inv, TypeOK, AtMostOne, PendingClass
<1>2. Inv /\ [NextControlled]_vars => Inv'
  <2>1. CASE UNCHANGED vars
    BY <2>1 DEF Inv, TypeOK, AtMostOne, vars
  <2>2. ASSUME NEW i \in InvIds, StartControlled(i)
        PROVE Inv'
    BY <2>2 DEF Inv, TypeOK, AtMostOne, StartControlled, PendingClass
  <2>3. ASSUME NEW i \in InvIds, End(i)
        PROVE Inv'
    BY <2>3 DEF Inv, TypeOK, AtMostOne, End, PendingClass
  <2>q. QED
    BY <2>1, <2>2, <2>3 DEF NextControlled
<1>3. Inv => AtMostOne
  BY DEF Inv
<1>q. QED
  BY <1>1, <1>2, <1>3, PTL DEF SpecC

=============================================================================
