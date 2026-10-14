"""End-to-end proof: wiring the honest trust provider changes 14/14 INVALID.

Runs the exact run_game() provider chain but with trust=honest(empty store),
expecting: trust_signals=DATA-GAP (recorded) instead of UNCHECKED (rejected),
and the analyze() call completing instead of raising ChecklistInvalid.
"""
from __future__ import annotations

import os
import sys
import tempfile
import importlib.util as ilu
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO))
sys.path.insert(0, str(REPO / "intelligence"))
sys.path.insert(0, str(REPO / "intelligence" / "qb-behavior" / "src"))

# trust-signals is a hyphenated package; load by init file like the e2e script does
pkg_dir = REPO / "intelligence" / "trust-signals"
spec = ilu.spec_from_file_location("trust_signals", str(pkg_dir / "__init__.py"),
                                   submodule_search_locations=[str(pkg_dir)])
mod = ilu.module_from_spec(spec)
sys.modules["trust_signals"] = mod
spec.loader.exec_module(mod)

from trust_signals.store import IntakeStore  # noqa: E402
from trust_signals.honest_provider import HonestTrustSignalProvider  # noqa: E402
from integration.api import _build_data_context  # noqa: E402
from integration.providers import ProviderRegistry  # noqa: E402
from integration.stubs import fixture_league_avgs  # noqa: E402
from coaching.ol_provider import NflverseOLProvider  # noqa: E402
from coaching.provider import CoachingEngineProvider  # noqa: E402
from qb_behavior.situational.provider import SituationalQBProvider  # noqa: E402
from tests.helpers import card_request  # noqa: E402


def main() -> int:
    # empty store = the real current state of the intake on this host
    tmp = tempfile.mkdtemp(prefix="gse_honest_trust_")
    store = IntakeStore(tmp)
    trust = HonestTrustSignalProvider(store=store)
    ol = NflverseOLProvider()
    reg = ProviderRegistry(qb=SituationalQBProvider(),
                           coaching=CoachingEngineProvider(),
                           trust=trust, ol=ol)
    req = card_request()
    game = dict(req.game or {})
    ctx, _display, _verifs = _build_data_context(game, reg, fixture_league_avgs())
    hints = ctx.checklist_hints
    print("checklist_hints:", hints)
    ts = hints.get("trust_signals")
    print("trust_signals verdict:", ts)
    assert ts == "DATA-GAP", f"expected DATA-GAP, got {ts!r}"

    # full engine run: does the gate now record instead of reject?
    import integration.api as A
    r_req = A.RAnalysisRequest(
        game=A.GameRequest(away=game.get("away") or "", home=game.get("home") or "",
                           week=int(game.get("week", 0)), season=int(game.get("season", 0))),
        question=req.question,
        exposure=A.R.Exposure(req.exposure.value),
        requested_depth=A.R.ReasoningDepth(req.requested_depth.value),
        resume_trace_id=None, market_edge_pct=0.0, legs=[])
    try:
        trace = A.R.AnalysisEngine().analyze(r_req, ctx)
        print("analyze OK -> depth:", trace.depth.value, "| label:", trace.label)
        print("checklist:", {k: (v.value if hasattr(v, "value") else v)
                            for k, v in trace.checklist.items()})
        print("RESULT: DATA-GAP recorded, analysis completed, no silent CLEAR, no INVALID")
        return 0
    except Exception as exc:
        print("analyze raised:", type(exc).__name__, "->", str(exc)[:200])
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
