# Test harness — shared helpers for the GSE intelligence build test suite.
#
# Provenance: test-orchestration module, c10 Phase 2+ coordinator.
# Implements conventions from ~/workspace/corpus-intelligence/handoff/reasoning-depth-spec.md §8.

import importlib
import json
import os
import sys

BUILD_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BUILD_ROOT not in sys.path:
    sys.path.insert(0, BUILD_ROOT)


class ModuleMissingError(AssertionError):
    """Raised when the module under test has not been built yet.

    A missing module is a FAIL (MISSING), never a skip — the scoreboard
    must say exactly what is absent. See tests/README.md rule 6.
    """


def require_module(name):
    """Import a build module or raise ModuleMissingError with a clear message."""
    try:
        return importlib.import_module(name)
    except ImportError as e:
        raise ModuleMissingError(
            f"MODULE MISSING: '{name}' has not been built yet ({e}). "
            f"This is a FAIL, not a skip."
        )


def load_fixture(name):
    """Load a JSON fixture from tests/e2e/fixtures/."""
    path = os.path.join(BUILD_ROOT, "tests", "e2e", "fixtures", name)
    with open(path) as f:
        return json.load(f)


# ---------------------------------------------------------------------------
# Steel-worthy assertion helpers (spec §8: assert on the trace object, not prose)
# ---------------------------------------------------------------------------

def assert_trace_has_l3_chain(trace, must_contain_links):
    """levels.L3.chains must include a chain whose link text covers every required fragment."""
    chains = trace.get("levels", {}).get("L3", {}).get("chains", [])
    assert chains, "trace has no L3 chains"
    blobs = []
    for ch in chains:
        text = json.dumps(ch.get("links", [])).lower()
        blobs.append(text)
    for frag in must_contain_links:
        assert any(frag.lower() in b for b in blobs), (
            f"L3 chain missing required link fragment: {frag!r}"
        )


def assert_breaking_condition_present(trace):
    """Every INFERENCE link in L3 chains must carry a machine-checkable breaking condition."""
    chains = trace.get("levels", {}).get("L3", {}).get("chains", [])
    for ch in chains:
        for link in ch.get("links", []):
            if link.get("verification") == "INFERENCE":
                bc = link.get("breaking_condition")
                assert bc, f"INFERENCE link lacks breaking_condition: {link}"
                assert isinstance(bc, str) and len(bc) >= 3


def assert_checklist_gate(trace, min_depth="L3"):
    """At L3+, no track may be UNCHECKED (spec §5 gate)."""
    depth = trace.get("depth", "L1")
    order = ["L1", "L2", "L3", "L4", "L5"]
    if order.index(depth) >= order.index(min_depth):
        checklist = trace.get("checklist", {})
        for track, verdict in checklist.items():
            assert verdict != "UNCHECKED", (
                f"checklist gate violated: track {track!r} is UNCHECKED at {depth}"
            )


def assert_hierarchy_order(trace):
    """L5 synthesis must evaluate OL before scheme before QB (Garrett's hierarchy, T6)."""
    l5 = trace.get("levels", {}).get("L5", {})
    order_note = json.dumps(l5).lower()
    # The trace must record per-layer verdicts in hierarchy order.
    for layer in ("offensive_line", "scheme", "qb"):
        assert layer in order_note, f"L5 synthesis missing hierarchy layer verdict: {layer}"
    positions = {layer: order_note.index(layer) for layer in ("offensive_line", "scheme", "qb")}
    assert positions["offensive_line"] < positions["scheme"] < positions["qb"], (
        f"L5 synthesis violates OL -> scheme -> QB order: {positions}"
    )
