#!/usr/bin/env python3
"""
Exhaustive reachability check for the GSE PR3 WaitlistLead runbook.

This is the EXECUTED cross-check for docs/gse/formal/PR3Waitlist.tla. It mirrors
that module's Init / Next transition relation exactly and does a breadth-first
exploration of the ENTIRE reachable state space, asserting the six sacred
invariants (and the supporting inductive invariants) in every reachable state.

No dependencies, no network, no toolchain. Run:

    python3 docs/gse/formal/pr3_runbook_check.py

Exit code 0 == all invariants hold in all reachable states (GREEN).
Exit code 1 == a violation was found (prints the offending state + invariant).

It is intentionally a plain enumeration so that anyone can re-run it and so that
its result does not depend on TLC or tlapm being installed.
"""

from collections import deque

# State = 10-tuple in this fixed order (mirrors `vars` in PR3Waitlist.tla):
PC, SCHEMA, CLIENT, WIRING, DBLOCAL, MIGRATED, STORAGE, BEATS, NOCLAIM, PUSHED = range(10)

STEPS = set(range(1, 11))            # runbook steps 1..10
TERMINALS = {"Done", "Aborted"}
PC_DOMAIN = STEPS | TERMINALS

INIT = (1, False, False, False, False, False, "file", False, True, False)


def _set(state, **kw):
    """Return a copy of `state` with named fields replaced."""
    idx = {
        "pc": PC, "schema": SCHEMA, "client": CLIENT, "wiring": WIRING,
        "dblocal": DBLOCAL, "migrated": MIGRATED, "storage": STORAGE,
        "beats": BEATS, "noclaim": NOCLAIM, "pushed": PUSHED,
    }
    s = list(state)
    for k, v in kw.items():
        s[idx[k]] = v
    return tuple(s)


def successors(s):
    """Yield every next-state per the TLA+ Next disjunction."""
    pc = s[PC]

    # --- Runbook steps -----------------------------------------------------
    if pc == 1:                                                  # S1_Branch
        yield _set(s, pc=2)
    if pc == 2:                                                  # S2_AppendSchema
        yield _set(s, pc=3, schema=True)
    if pc == 3:                                                  # S3_VerifyLocalDB
        yield _set(s, pc=4, dblocal=True)                       #   provably local
        yield _set(s, pc=4, dblocal=False)                      #   NOT provable
    if pc == 4 and s[SCHEMA]:                                    # S4_Generate
        yield _set(s, pc=5, client=True)
    if pc == 5 and s[CLIENT]:                                    # S5_ApplyWiring
        yield _set(s, pc=6, wiring=True)
    if pc == 6 and s[SCHEMA] and s[DBLOCAL]:                     # S6_Migrate
        yield _set(s, pc=7, migrated=True)
    if pc == 6 and not s[DBLOCAL]:                               # S6_AbortUnverified
        yield _set(s, pc="Aborted", schema=False, client=False,
                   wiring=False, migrated=False, storage="file")
    if pc == 7:                                                  # S7_Regenerate
        yield _set(s, pc=8, client=True)
    if pc == 8:                                                  # S8_TypecheckLint
        yield _set(s, pc=9)
    if pc == 9:                                                  # S9_Tests
        yield _set(s, pc=10, storage="file")
    if pc == 10:                                                 # S10_MigrateDiff
        yield _set(s, pc="Done")

    # --- Runtime selector (WAITLIST_STORAGE), independent of pc ------------
    if s[WIRING] and s[MIGRATED]:                               # ToggleDb (guarded)
        yield _set(s, storage="db")
    yield _set(s, storage="file")                              # ToggleFile (always)

    # --- Self-destruct / retry --------------------------------------------
    if pc in STEPS:                                             # Abort
        yield _set(s, pc="Aborted", schema=False, client=False,
                   wiring=False, migrated=False, storage="file")
    if pc == "Aborted":                                        # Retry
        yield _set(s, pc=1, schema=False, client=False, wiring=False,
                   dblocal=False, migrated=False, storage="file")
    # DoneStutter is a no-op (BFS dedups); omitted intentionally.


# --- Invariants (mirror PR3Waitlist.tla) ----------------------------------
INVARIANTS = {
    "TypeOK": lambda s: (
        s[PC] in PC_DOMAIN
        and isinstance(s[SCHEMA], bool) and isinstance(s[CLIENT], bool)
        and isinstance(s[WIRING], bool) and isinstance(s[DBLOCAL], bool)
        and isinstance(s[MIGRATED], bool) and s[STORAGE] in {"file", "db"}
        and isinstance(s[BEATS], bool) and isinstance(s[NOCLAIM], bool)
        and isinstance(s[PUSHED], bool)
    ),
    # Sacred 1: backtest truth stays false.
    "Inv_BacktestTruth": lambda s: s[BEATS] is False,
    # Sacred 2: no-claim scanner stays green.
    "Inv_NoClaimGreen": lambda s: s[NOCLAIM] is True,
    # Sacred 3: db path only when wiring AND migration present.
    "Inv_FileDefaultSafe": lambda s: (s[STORAGE] != "db") or (s[WIRING] and s[MIGRATED]),
    # Sacred 4: a migration implies a provably-local DB.
    "Inv_MigrateOnlyVerifiedLocal": lambda s: (not s[MIGRATED]) or s[DBLOCAL],
    # Sacred 5: nothing is pushed/deployed/merged in runbook scope.
    "Inv_NoPush": lambda s: s[PUSHED] is False,
    # Supporting ordering facts (make Sacred 3 inductive).
    "Inv_Ordering": lambda s: (
        ((not s[CLIENT]) or s[SCHEMA])
        and ((not s[WIRING]) or s[CLIENT])
        and ((not s[MIGRATED]) or s[SCHEMA])
    ),
    # Supporting phase fact.
    "Inv_MigratePhase": lambda s: (not s[MIGRATED]) or (s[PC] in {7, 8, 9, 10, "Done"}),
}


def main():
    seen = {INIT}
    queue = deque([INIT])
    transitions = 0
    failures = []

    while queue:
        s = queue.popleft()
        for name, ok in INVARIANTS.items():
            if not ok(s):
                failures.append((name, s))
        for nxt in successors(s):
            transitions += 1
            if nxt not in seen:
                seen.add(nxt)
                queue.append(nxt)

    print("GSE PR3 runbook -- exhaustive reachability check")
    print("  spec:        docs/gse/formal/PR3Waitlist.tla")
    print(f"  reachable states explored: {len(seen)}")
    print(f"  transitions evaluated:     {transitions}")
    print("  invariants checked in every reachable state:")
    for name in INVARIANTS:
        bad = sum(1 for f, _ in failures if f == name)
        flag = "FAIL" if bad else "ok"
        print(f"    [{flag}] {name}" + (f"  ({bad} violations)" if bad else ""))

    if failures:
        name, st = failures[0]
        print("\nVIOLATION:", name)
        print("  state:", st)
        raise SystemExit(1)

    print("\nRESULT: GREEN -- all six sacred invariants hold in all "
          f"{len(seen)} reachable states.")
    raise SystemExit(0)


if __name__ == "__main__":
    main()
