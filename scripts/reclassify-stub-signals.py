#!/usr/bin/env python3
"""
Reclassify registry signals whose `evaluate` is an unconditional `return null`.

WHY. Ten signals in signal-registry-definitions.ts carry
`activationStatus: "ACTIVE"` but their evaluator is a stub that returns null on
every call, with a comment saying the value is "ingested dynamically per play
context". An ACTIVE signal is a claim: the engine can read this signal and it can
move a pick. These cannot, today, under any input. They are counted as coverage
and they contribute nothing.

This does NOT delete them and does NOT invent an evaluator. It makes the label
tell the truth, so the registry's counts stop overstating coverage. The
evaluators themselves stay in place and become live the moment real per-play
ingestion calls them — at which point the status is one line from ACTIVE again.
"""
import io, re, sys

STUBS = [
    "nfl_coaching_tendencies",
    "nfl_injury_trajectory",
    "nfl_redzone_te_leverage",
    "nfl_offensive_line_trench",
    "nfl_referee_crew_tendencies",
    "nfl_circadian_travel_fatigue",
    "nfl_contract_milestones",
    "nfl_wr1_out_redistribution",
    "nfl_luck_fumble_regression",
]

path = "C:/Users/Garrett/Sports/.worktrees/calib-boundary/packages/ingestion-pipeline/src/signal-registry-definitions.ts"
src = io.open(path, encoding="utf-8").read()

patched = 0
for sid in STUBS:
    i = src.find(f'id: "{sid}"')
    if i < 0:
        print("NOT FOUND:", sid); continue
    j = src.find("  },\n};", i)
    seg = src[i:j]
    if "return null; // Ingested dynamically per play context" not in seg:
        # some stubs may phrase it differently; only touch confirmed stubs
        if seg.count("return null;") < 2:
            print("NOT A CONFIRMED STUB:", sid); continue
    old = '  activationStatus: "ACTIVE",'
    new = (
        '  // HONESTY: not ACTIVE. The evaluator below is a stub that returns null\n'
        '  // on every call, so this signal cannot reach a pick under any input.\n'
        '  // ACTIVE would be a coverage claim the code does not support. SHADOW_ONLY\n'
        '  // keeps it registered and visible while telling the truth. Promote to\n'
        '  // ACTIVE only when a real evaluate() is wired to per-play ingestion.\n'
        '  activationStatus: "SHADOW_ONLY",'
    )
    if old not in seg:
        print("NO activationStatus in", sid); continue
    seg2 = seg.replace(old, new, 1)
    # give it a reason string too, since blockedReason sits next to it
    seg2 = seg2.replace(
        "  blockedReason: null,",
        '  blockedReason: "evaluator stub: returns null for every input pending per-play ingestion",',
        1,
    )
    src = src[:i] + seg2 + src[j:]
    patched += 1

io.open(path, "w", encoding="utf-8").write(src)
print("reclassified:", patched, "of", len(STUBS))