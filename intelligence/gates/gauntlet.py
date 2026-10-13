"""The Gauntlet — one run path for every wireable acceptance gate.

Garrett's order (2026-10-12): "MAKE SURE ALL GATES, REASONING AND
INTELLIGENCE ARE IN EVERYTHING." This runner is that order made code:
for a single game it executes, in pipeline order —

    INGEST -> SIGNAL -> MODEL -> SIMULATION -> ARBITRATION -> OUTPUT

— every gate in the fleet that is LANDED and CANONICAL, plus every
prediction-engine module whose spec was INFERRED by its building worker
running in SHADOW mode (verdict recorded, labeled spec_status: INFERRED,
never allowed to block or clear anything). Gates that cannot be wired
are not silently dropped: they are enumerated in
gauntlet_registry.json with the reason, and the report carries the full
census (wired / shadow / not-wired-with-reason).

Fail-closed rules, enforced here and pinned by tests:

  * An exception inside a gate is a FAIL with the error recorded —
    never a silent pass.
  * The run's inputs are frozen BEFORE any gate executes: a manifest
    with per-input SHA-256 hashes is written first
    (intelligence/gates/manifest_check.py's REQUIRED provenance fields
    are the standard each input entry must meet).
  * Artifact stamps are DERIVED from the RVC gate's verdict by
    derive_stamps() — never set by hand. Unless and until the
    residual-versus-close gate returns CLEARED on a frozen manifest,
    every emitted artifact is label: DIAGNOSTIC with is_pick and
    is_edge_claim false.
  * Shadow gates cannot block, cannot clear, and cannot change a
    stamp. A shadow FAIL is recorded as evidence, nothing more.
  * NGS material is internal-only: nothing in this module emits it,
    and the output guard scans emitted artifacts for it.

Run (from the repository root):

    python3 -m intelligence.gates.gauntlet --game BUF@LAR \
        --out outbox/gauntlet
"""
from __future__ import annotations

import argparse
import hashlib
import json
import socket
import sys
import traceback
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable, Optional

# Import convention for this repo's intelligence tree: the intelligence/
# directory itself goes on sys.path and modules import as gates.*,
# props.*, sgp.* (see intelligence/gates/test_heldout_check.py).
_INTEL = Path(__file__).resolve().parents[1]
if str(_INTEL) not in sys.path:
    sys.path.insert(0, str(_INTEL))

STAGES = ["INGEST", "SIGNAL", "MODEL", "SIMULATION", "ARBITRATION", "OUTPUT"]

PASS, FAIL, SKIP = "PASS", "FAIL", "SKIP"
ENFORCING, SHADOW = "ENFORCING", "SHADOW"
CANONICAL, INFERRED, UNDOCUMENTED = "CANONICAL", "INFERRED", "UNDOCUMENTED"


# ---------------------------------------------------------------------------
# Stamps — derived from the RVC verdict by the gate, never by hand.
# ---------------------------------------------------------------------------

def derive_stamps(rvc_verdict: Optional[str],
                  enforcing_failures: list[str]) -> dict[str, Any]:
    """The ONLY place artifact stamps are decided.

    CLEARED requires the RVC gate's own verdict of "CLEARED" on the
    frozen manifest of this run. Anything else — NOT_CLEARED, missing,
    or any enforcing gate failure — yields diagnostic stamps.
    """
    cleared = (rvc_verdict == "CLEARED") and not enforcing_failures
    return {
        "label": "CLEARED" if cleared else "DIAGNOSTIC",
        "rvc_cleared": bool(cleared),
        "is_pick": bool(cleared),
        "is_edge_claim": bool(cleared),
    }


# ---------------------------------------------------------------------------
# Run context + frozen manifest
# ---------------------------------------------------------------------------

class RunContext:
    def __init__(self, root: Path, run_id: str, game: dict[str, Any],
                 inputs: dict[str, Path],
                 input_provenance: Optional[dict[str, dict[str, str]]] = None,
                 base_commit: str = "",
                 tree_snapshot: Optional[dict[str, str]] = None,
                 now: Optional[datetime] = None,
                 rvc_dataset: Optional[list[dict[str, Any]]] = None,
                 rvc_dataset_manifest: Optional[dict[str, Any]] = None):
        self.root = Path(root)
        self.run_id = run_id
        self.game = game
        self.inputs = inputs
        self.input_provenance = input_provenance or {}
        self.base_commit = base_commit
        self.tree_snapshot = tree_snapshot
        self.now = now or datetime.now(timezone.utc)
        self.rvc_dataset = rvc_dataset
        self.rvc_dataset_manifest = rvc_dataset_manifest
        # Optional PE-module inputs (frozen games manifest for modules
        # 5-8; paired prediction/outcome sets for modules 21-24). A run
        # that cannot supply them gets honest SKIP/REFUSE verdicts from
        # the modules themselves — never fabricated samples.
        self.pe_games: Optional[list] = None
        self.pe_datasets: Optional[dict] = None
        self.gate_results: dict[str, Any] = {}
        self.rvc_result: Optional[dict[str, Any]] = None
        self.candidate_report: Optional[dict[str, Any]] = None
        self.manifest: Optional[dict[str, Any]] = None
        self.manifest_path: Optional[Path] = None
        self._json_cache: dict[str, Any] = {}

    def json_input(self, name: str) -> Any:
        if name not in self._json_cache:
            self._json_cache[name] = json.loads(
                self.inputs[name].read_text(encoding="utf-8"))
        return self._json_cache[name]

    def freeze(self, out_dir: Path) -> dict[str, Any]:
        """Freeze every input (hash + provenance) BEFORE any gate runs."""
        from gates.manifest_check import REQUIRED

        entries = {}
        for name, path in sorted(self.inputs.items()):
            data = path.read_bytes()
            prov = self.input_provenance.get(name, {})
            entry = {
                "path": str(path.relative_to(self.root))
                if path.is_relative_to(self.root) else str(path),
                "source": prov.get("source", str(path)),
                "producer": prov.get("producer", "gauntlet"),
                "sha256": hashlib.sha256(data).hexdigest(),
                "bytes": len(data),
                "rows": prov.get("rows", _row_count(data, path)),
                "date_range": prov.get("date_range", "single-capture"),
                "license": prov.get("license", "internal"),
                "point_in_time": prov.get("point_in_time", self.now.isoformat()),
                "host": socket.gethostname(),
                "commit": self.base_commit,
            }
            missing = [k for k in REQUIRED if k not in entry]
            if missing:  # the freeze itself fails closed
                raise ValueError(f"manifest entry for {name} missing {missing}")
            entries[name] = entry
        self.manifest = {
            "run_id": self.run_id,
            "frozen_at": self.now.isoformat(),
            "game": self.game,
            "base_commit": self.base_commit,
            "inputs": entries,
        }
        out_dir.mkdir(parents=True, exist_ok=True)
        self.manifest_path = out_dir / f"{self.run_id}_manifest.json"
        self.manifest_path.write_text(
            json.dumps(self.manifest, indent=2), encoding="utf-8")
        return self.manifest


def _row_count(data: bytes, path: Path) -> Any:
    if path.suffix == ".json":
        try:
            doc = json.loads(data)
            if isinstance(doc, list):
                return len(doc)
            if isinstance(doc, dict):
                for key in ("games", "records", "rows", "props"):
                    if isinstance(doc.get(key), list):
                        return len(doc[key])
                return len(doc)
        except Exception:
            return None
    if path.suffix in (".jsonl", ".csv"):
        return data.count(b"\n")
    return None


# ---------------------------------------------------------------------------
# Gate plumbing
# ---------------------------------------------------------------------------

class GateOutcome:
    def __init__(self, verdict: str, evidence: Optional[dict] = None,
                 reason: Optional[str] = None):
        self.verdict = verdict
        self.evidence = evidence or {}
        self.reason = reason


class Gate:
    def __init__(self, gate_id: str, stage: str, mode: str, spec_status: str,
                 source: str, fn: Callable[["RunContext"], GateOutcome]):
        self.id, self.stage, self.mode = gate_id, stage, mode
        self.spec_status, self.source, self.fn = spec_status, source, fn


def _execute(gate: Gate, ctx: RunContext) -> dict[str, Any]:
    """Fail-closed execution: an exception is a FAIL, never a pass."""
    try:
        outcome = gate.fn(ctx)
        verdict, evidence, reason = outcome.verdict, outcome.evidence, outcome.reason
        error = None
    except Exception as exc:  # noqa: BLE001 — fail-closed by design
        verdict, evidence, reason = FAIL, {}, None
        error = f"{type(exc).__name__}: {exc}"
        evidence = {"traceback": traceback.format_exc(limit=5)}
    return {
        "gate_id": gate.id,
        "stage": gate.stage,
        "mode": gate.mode,
        "spec_status": gate.spec_status,
        "source": gate.source,
        "verdict": verdict,
        "reason": reason,
        "error": error,
        "evidence": evidence,
    }


# ---------------------------------------------------------------------------
# INGEST gates
# ---------------------------------------------------------------------------

def _target_game(ctx: RunContext, games: list) -> Optional[Any]:
    away, home = ctx.game["away_abbr"], ctx.game["home_abbr"]
    for g in games:
        if g.away_abbr == away and g.home_abbr == home:
            return g
    return None


def gate_price_feed_integrity(ctx: RunContext) -> GateOutcome:
    """Real prices parse, the target game is fully quoted, booksums sane.

    The feed's own law (intelligence/props/real_price_feed.py): prices
    are exactly as quoted — unquoted stays null, never filled in. This
    gate enforces that law on the frozen capture: the target game must
    be complete AND its de-vig booksum must sit in (1.0, 1.30).
    """
    from props.real_price_feed import game_record, parse_scoreboard

    payload = ctx.json_input("espn_scoreboard")
    games = parse_scoreboard(payload)
    target = _target_game(ctx, games)
    if target is None:
        return GateOutcome(FAIL, {"games_parsed": len(games)},
                           "target game not present in the price capture")
    record = game_record(target, ctx.now.isoformat())
    ml = record["devig"]["moneyline_home_away"]
    booksum = ml["booksum"] if ml else None
    evidence = {
        "games_parsed": len(games),
        "provider": target.provider,
        "moneyline": target.moneyline,
        "spread": target.spread,
        "total": target.total,
        "implied_team_totals": target.implied_team_totals(),
        "moneyline_booksum": booksum,
        "complete_prices": target.complete,
    }
    if not target.complete:
        return GateOutcome(FAIL, evidence,
                           "target game prices incomplete — unquoted markets "
                           "stay null and the game cannot be priced")
    if booksum is None or not (1.0 < booksum < 1.30):
        return GateOutcome(FAIL, evidence,
                           f"moneyline booksum {booksum} outside (1.0, 1.30)")
    return GateOutcome(PASS, evidence)


def gate_pinnacle_prop_feed(ctx: RunContext) -> GateOutcome:
    """The Pinnacle prop capture parses into fully two-way priced props."""
    from props.pinnacle_prop_feed import parse_prop_board

    matchups = ctx.json_input("pinnacle_matchups")["matchups"]
    markets = ctx.json_input("pinnacle_related")["markets"]
    game_id = ctx.game["pinnacle_game_matchup_id"]
    board = parse_prop_board(matchups, markets, game_id)
    records = board["records"]
    two_way = all(r.get("over_price") is not None
                  and r.get("under_price") is not None for r in records)
    evidence = {
        "priced_props": len(records),
        "specials_seen": board["specials_seen"],
        "skipped_one_sided_or_unpriced": board["skipped"],
        "all_records_two_way": two_way,
    }
    if not records:
        return GateOutcome(FAIL, evidence, "no priced props parsed")
    if not two_way:
        return GateOutcome(FAIL, evidence,
                           "a record reached the board without both prices — "
                           "the feed's never-invent law was violated")
    return GateOutcome(PASS, evidence)


def gate_manifest_completeness(ctx: RunContext) -> GateOutcome:
    """The frozen manifest meets manifest_check's REQUIRED standard and
    every recorded hash still matches the input bytes on disk."""
    from gates.manifest_check import REQUIRED

    problems = []
    for name, entry in sorted(ctx.manifest["inputs"].items()):
        missing = [k for k in REQUIRED if k not in entry]
        if missing:
            problems.append(f"{name}: missing {missing}")
            continue
        data = ctx.inputs[name].read_bytes()
        if hashlib.sha256(data).hexdigest() != entry["sha256"]:
            problems.append(f"{name}: sha256 drift since freeze")
        if len(data) != entry["bytes"]:
            problems.append(f"{name}: byte count drift since freeze")
    evidence = {"inputs_frozen": len(ctx.manifest["inputs"]),
                "required_fields": list(REQUIRED), "problems": problems}
    if problems:
        return GateOutcome(FAIL, evidence, "; ".join(problems))
    return GateOutcome(PASS, evidence)


def gate_heldout_discipline(ctx: RunContext) -> GateOutcome:
    """Held-out discipline (heldout_check) over any input that declares
    a train/eval split. A fit that trains on the years it scores is
    contaminated: discard it, do not average it."""
    from gates.heldout_check import check as heldout_errors

    checked, problems = [], []
    for name in sorted(ctx.inputs):
        if ctx.inputs[name].suffix != ".json":
            continue
        try:
            doc = ctx.json_input(name)
        except Exception:
            continue
        if isinstance(doc, dict) and ("train_years" in doc or "eval_years" in doc):
            checked.append(name)
            problems += [f"{name}: {e}" for e in heldout_errors(doc)]
    if ctx.rvc_dataset_manifest:
        checked.append("rvc_dataset_manifest")
        problems += [f"rvc_dataset: {e}"
                     for e in heldout_errors(ctx.rvc_dataset_manifest)]
    evidence = {"split_declaring_inputs": checked, "problems": problems}
    if not checked:
        return GateOutcome(SKIP, evidence,
                           "no run input declares train/eval years; the RVC "
                           "gate performs its own held-out check on its dataset")
    if problems:
        return GateOutcome(FAIL, evidence, "; ".join(problems))
    return GateOutcome(PASS, evidence)


def gate_injury_publication(ctx: RunContext) -> GateOutcome:
    """Injury-publication discipline (providers/injury_gate.py): a live
    injury pull is refused before Friday 18:00 ET of the game week —
    before that, the week's injury report does not exist yet, and any
    injury-informed reasoning would be built on last week's paper.

    This run consumes only frozen, committed captures (reading a
    committed file is not a pull, per the module's own doctrine), so
    nothing here can block: PASS once the week's report is published;
    SKIP, with the cutoff recorded, if a run ever executes before it —
    so no downstream consumer mistakes stale injury data for current.
    Week and Friday are read from the run's own frozen inputs (the
    ESPN capture's week number; the Friday of the kickoff week).
    """
    from datetime import time as dtime, timedelta
    from zoneinfo import ZoneInfo

    from providers.injury_gate import InjuryNotPublished, require_injury_published

    payload = ctx.json_input("espn_scoreboard")
    week = int(payload["week"]["number"])
    et = ZoneInfo("America/New_York")
    kickoff = datetime.fromisoformat(
        ctx.game["kickoff_utc"].replace("Z", "+00:00"))
    game_date = kickoff.astimezone(et).date()
    friday_date = game_date - timedelta(days=(game_date.weekday() - 4) % 7)
    friday = datetime.combine(friday_date, dtime(0, 0), tzinfo=et)
    evidence = {
        "week": week,
        "friday_of_game_week": friday_date.isoformat(),
        "cutoff": "Friday 18:00 America/New_York",
        "now": ctx.now.isoformat(),
        "live_injury_pull_in_this_run": False,
    }
    try:
        require_injury_published(week, ctx.now, friday)
    except InjuryNotPublished as exc:
        return GateOutcome(SKIP, evidence,
                           f"{exc} — this run reads committed files only, "
                           "so nothing is blocked; the status is recorded "
                           "so stale injury data is never mistaken for "
                           "current")
    evidence["injury_report_published"] = True
    return GateOutcome(PASS, evidence)


def gate_leakwall_market_snapshot(ctx: RunContext) -> GateOutcome:
    """Leak wall, market side (intelligence/trust/leakwall.py, S3):
    select_market_snapshot REFUSES a missing market feed — it raises
    rather than letting a caller proxy or fabricate one. The run's
    market snapshot is tonight's parsed price record; the gate passes
    only if the wall accepts and wraps it (never a bare value)."""
    from props.real_price_feed import game_record, parse_scoreboard
    from trust.leakwall import select_market_snapshot

    games = parse_scoreboard(ctx.json_input("espn_scoreboard"))
    target = _target_game(ctx, games)
    feed = game_record(target, ctx.now.isoformat()) if target else None
    try:
        wrapped = select_market_snapshot(feed)
    except Exception as exc:  # noqa: BLE001 — the wall refusing IS the verdict
        return GateOutcome(FAIL, {"feed_present": feed is not None},
                           f"leak wall refused the market snapshot: {exc}")
    evidence = {"grain": wrapped["grain"], "provenance": wrapped["provenance"],
                "wrapped_not_bare": isinstance(wrapped, dict)
                and "value" in wrapped}
    if not evidence["wrapped_not_bare"]:
        return GateOutcome(FAIL, evidence,
                           "snapshot returned bare — covariate-bus rule "
                           "violated (never a bare value)")
    return GateOutcome(PASS, evidence)


# ---------------------------------------------------------------------------
# SIGNAL gates
# ---------------------------------------------------------------------------

def gate_claim_matrix(ctx: RunContext) -> GateOutcome:
    """A claim is not wired unless the code, the test, and the data file
    exist (intelligence/gates/claim_matrix.py — that is the gate).

    Runs the module's own check() against the run root; any 'wired but
    missing' path is then annotated against the frozen base-tree
    snapshot so an assembly gap in a partial checkout is never confused
    with a gap in the repository itself — and a path missing from the
    tree fails the gate outright.
    """
    from gates.claim_matrix import check, load

    claims = load(str(ctx.inputs["claims"]))
    errors = check(claims, root=str(ctx.root))
    tree = ctx.tree_snapshot or {}
    real_errors, assembly_gaps = [], []
    for err in errors:
        # error shape: "<id>: wired but <key> missing (<relpath>)"
        rel = err.rsplit("(", 1)[-1].rstrip(")") if "(" in err else ""
        if rel and rel in tree:
            assembly_gaps.append(err)
        else:
            real_errors.append(err)
    statuses = {}
    for c in claims:
        statuses[c["status"]] = statuses.get(c["status"], 0) + 1
    evidence = {
        "claims_total": len(claims),
        "claims_by_status": statuses,
        "check_errors": errors,
        "assembly_gaps_annotated": assembly_gaps,
    }
    if real_errors:
        return GateOutcome(FAIL, evidence, "; ".join(real_errors))
    return GateOutcome(PASS, evidence,
                       "all wired claims resolve in the frozen tree"
                       if assembly_gaps else None)


# ---------------------------------------------------------------------------
# MODEL gates
# ---------------------------------------------------------------------------

def gate_measured_correlations(ctx: RunContext) -> GateOutcome:
    """The measured correlation snapshot the SGP engine prices from:
    correct leg order, PSD as measured, real sample size."""
    import numpy as np

    from sgp.price_from_measured_correlations import EXPECTED_LEG_ORDER

    blob = ctx.json_input("correlations")
    order = list(blob.get("leg_names") or [])
    matrix = np.array(blob["matrix"], dtype=float)
    eig_min = float(np.linalg.eigvalsh(matrix).min())
    evidence = {
        "leg_order": order,
        "n_team_games": blob.get("n_team_games"),
        "seasons": blob.get("seasons"),
        "min_eigenvalue": eig_min,
        "strongest_pair": None,
    }
    off = matrix - np.eye(len(order))
    i, j = np.unravel_index(int(np.argmax(np.abs(off))), off.shape)
    evidence["strongest_pair"] = {
        "legs": [order[i], order[j]], "rho": float(matrix[i][j])}
    if order != EXPECTED_LEG_ORDER:
        return GateOutcome(FAIL, evidence,
                           "leg order in the snapshot does not match the "
                           "estimator's canonical order — pairing marginals "
                           "against the wrong columns would produce a "
                           "plausible, meaningless price")
    if eig_min <= 0:
        return GateOutcome(FAIL, evidence,
                           "correlation matrix is not PSD as measured")
    if not (blob.get("n_team_games") or 0) >= 500:
        return GateOutcome(FAIL, evidence,
                           "measured sample too small to price from")
    return GateOutcome(PASS, evidence)


def gate_sgp_reproduction(ctx: RunContext) -> GateOutcome:
    """Reprice tonight's stacks from the frozen fixture + snapshot and
    compare against the committed artifact. Deterministic given the
    artifact's recorded seed — a mismatch means the artifact on disk is
    not what the engine produces from these inputs."""
    import numpy as np

    from props.real_price_feed import game_record, parse_scoreboard
    from sgp.price_from_real_prices import price_game

    artifact = ctx.json_input("sgp_projections")
    eng = artifact["provenance"]["engine"]
    draws, seed = int(eng["draws"]), int(eng["seed"])
    corr_blob = ctx.json_input("correlations")
    corr = np.array(corr_blob["matrix"], dtype=float)

    payload = ctx.json_input("espn_scoreboard")
    records = [game_record(g, artifact["generated_at"])
               for g in parse_scoreboard(payload)]
    idx = next((i for i, r in enumerate(records)
                if r["home_abbr"] == ctx.game["home_abbr"]
                and r["away_abbr"] == ctx.game["away_abbr"]), None)
    if idx is None:
        return GateOutcome(FAIL, {"records": len(records)},
                           "target game not in the frozen price capture")
    repriced = price_game(records[idx], corr, draws, seed + 1000 * idx)
    committed = next((g for g in artifact["games"]
                      if g["home_abbr"] == ctx.game["home_abbr"]
                      and g["away_abbr"] == ctx.game["away_abbr"]), None)
    if committed is None:
        return GateOutcome(FAIL, {}, "target game missing from the artifact")

    tol = 0.006
    comparisons, worst = [], 0.0
    for abbr, stack in sorted(committed["sgp_stacks"].items()):
        mine = repriced["sgp_stacks"].get(abbr)
        if mine is None:
            return GateOutcome(FAIL, {"stack": abbr},
                               "repricing produced no stack for a team the "
                               "artifact prices")
        for part in ("scaled", "unscaled_control"):
            a = stack[part]["fair_probability"]
            b = mine[part]["fair_probability"]
            worst = max(worst, abs(a - b))
            comparisons.append({"team": abbr, "part": part,
                                "artifact": a, "repriced": b,
                                "abs_delta": abs(a - b)})
    evidence = {"draws": draws, "seed": seed, "record_index": idx,
                "tolerance": tol, "comparisons": comparisons,
                "worst_abs_delta": worst}
    if worst > tol:
        return GateOutcome(FAIL, evidence,
                           f"artifact does not reproduce from its own "
                           f"frozen inputs (worst delta {worst:.4f} > {tol})")
    return GateOutcome(PASS, evidence)


def gate_props_board_consistency(ctx: RunContext) -> GateOutcome:
    """The live props board: stamps present, every priced row carries a
    real two-way de-vig whose fair probabilities sum to one, and no
    stake/Kelly field exists anywhere in the artifact."""
    board = ctx.json_input("props_live_board")
    problems = []
    if board.get("label") != "DIAGNOSTIC":
        problems.append(f"label is {board.get('label')!r}, not DIAGNOSTIC")
    for key in ("is_pick", "is_edge_claim", "rvc_cleared"):
        if board.get(key) is not False:
            problems.append(f"{key} is {board.get(key)!r}, not false")

    def walk(node, path=""):
        if isinstance(node, dict):
            for k, v in node.items():
                if "kelly" in k.lower() or "stake" in k.lower():
                    problems.append(f"stake field at {path}/{k}")
                walk(v, f"{path}/{k}")
        elif isinstance(node, list):
            for n, v in enumerate(node):
                walk(v, f"{path}[{n}]")

    walk(board)
    rows = board.get("props") or board.get("records") or board.get("rows") or []
    checked, bad_sums = 0, 0
    for row in rows:
        devig = row.get("devig") or {}
        shin = devig.get("shin") or {}
        if "fair_over" in shin and "fair_under" in shin:
            checked += 1
            if abs(shin["fair_over"] + shin["fair_under"] - 1.0) > 1e-6:
                bad_sums += 1
    evidence = {"rows": len(rows), "devig_rows_checked": checked,
                "devig_bad_sums": bad_sums, "problems": problems}
    if problems or bad_sums:
        return GateOutcome(FAIL, evidence, "; ".join(problems[:5])
                           or f"{bad_sums} de-vig rows do not sum to one")
    return GateOutcome(PASS, evidence)


# ---------------------------------------------------------------------------
# Prediction-engine modules — SHADOW mode.
#
# Modules 1-16 at minimum were built against specs INFERRED by the
# building worker (local harnesses vendored under gates/pe_modules/ from
# ~/workspace/gates/prediction_engine/ and ~/workspace/gse_gates_pe_13_16/;
# canonical home of the packet: Beexly/Sports@research/rating-atlas-
# 2026-10-09-packet, docs/research/2026-10-09/rating-atlas/minis/gates/
# prediction_engine/). Until each is reconciled against a canonical
# spec, it runs SHADOW: verdict recorded with spec_status: INFERRED,
# never allowed to block or clear anything. Modules 21-24 are the
# calibration family from the same packet and get the same treatment.
# ---------------------------------------------------------------------------

def _shadow_outcome(verdict: str, evidence: dict,
                    reason: Optional[str] = None) -> GateOutcome:
    evidence = {**evidence, "shadow": True,
                "effect": "recorded only — a shadow verdict never blocks, "
                          "never clears, and never changes a stamp"}
    return GateOutcome(verdict, evidence, reason)


def _pe_01_04(module: int) -> Callable[[RunContext], GateOutcome]:
    def fn(ctx: RunContext) -> GateOutcome:
        from gates.pe_modules import pe_modules_01_04 as pe

        vectors = pe.default_test_vectors()
        evals = {1: pe.eval_module_1, 2: pe.eval_module_2,
                 3: pe.eval_module_3, 4: pe.eval_module_4}
        result = evals[module](vectors[f"module_{module}"])
        evidence = {"module": module, "name": result["name"],
                    "cases": len(result["cases"]),
                    "module_pass": result["pass"]}
        if module == 1:
            evidence["note"] = (
                "the harness's default vectors for module 1 compute the "
                "expected values with the same formula they test — "
                "self-referential; one of the reasons this module's spec "
                "is INFERRED and the gate is shadow-only")
        return _shadow_outcome(PASS if result["pass"] else FAIL, evidence)
    return fn


def _pe_05_08(module: int) -> Callable[[RunContext], GateOutcome]:
    def fn(ctx: RunContext) -> GateOutcome:
        from gates.pe_modules import pe_modules_05_08 as pe

        games = ctx.pe_games or []
        result = pe.MODULES[module][1](games)
        evidence = {"module": module, "name": pe.MODULES[module][0]["name"],
                    "evaluation": result}
        if "error" in result:
            return _shadow_outcome(
                SKIP, evidence,
                f"frozen games manifest not in run inputs ({result['error']}); "
                "the module refuses rather than fabricating a sample")
        return _shadow_outcome(
            PASS if result.get("overall_pass") else FAIL, evidence)
    return fn


def _pe_13_16(module: int) -> Callable[[RunContext], GateOutcome]:
    def fn(ctx: RunContext) -> GateOutcome:
        from gates.pe_modules import pe_modules_13_16 as pe

        expected_path = (Path(__file__).resolve().parent
                         / "pe_modules" / "pe_modules_13_16_expected.json")
        expected = json.loads(expected_path.read_text(encoding="utf-8"))
        mine = [s for s in pe.run_all_selftests()
                if s["module_id"] == module]
        theirs = [s for s in expected if s["module_id"] == module]
        mismatches = [
            {"case": n, "expected": t["verdict"], "got": g["verdict"]}
            for n, (t, g) in enumerate(zip(theirs, mine))
            if t["verdict"] != g["verdict"]
        ]
        evidence = {"module": module,
                    "cases": [{"inputs": s["inputs"], "verdict": s["verdict"]}
                              for s in mine],
                    "recorded_stamp_cases": len(theirs),
                    "mismatches_vs_recorded_stamps": mismatches}
        if mismatches:
            return _shadow_outcome(FAIL, evidence,
                                   "module behavior drifted from its recorded "
                                   "stamps (shadow: recorded, not blocking)")
        return _shadow_outcome(PASS, evidence)
    return fn


def _pe_21_24(module: int) -> Callable[[RunContext], GateOutcome]:
    def fn(ctx: RunContext) -> GateOutcome:
        from gates.pe_modules import pe_modules_21_24 as pe

        dataset = (ctx.pe_datasets or {}).get(module)
        if not dataset:
            stamp = pe.run_module(module, [], [], ctx.run_id)
            return _shadow_outcome(
                SKIP, {"module": module, "stamp": stamp},
                "no frozen paired dataset in run inputs — the module "
                "REFUSES rather than scoring an empty sample; the same "
                "absence is what the RVC gate records")
        stamp = pe.run_module(module, dataset["predictions"],
                              dataset["outcomes"], ctx.run_id)
        verdict = {  "PASS": PASS, "FAIL": FAIL}.get(stamp["verdict"], SKIP)
        return _shadow_outcome(verdict, {"module": module, "stamp": stamp})
    return fn


# ---------------------------------------------------------------------------
# Trust-lane machinery self-checks — SHADOW mode.
#
# enbpi / calibration / abstention are canonical-spec machinery
# (SYS-03/36, SYS-21, SYS-25) whose acceptance gates run, by their own
# modules' honesty labels, on SEEDED SYNTHETIC data — no real odds
# archive exists in this stack. The gauntlet executes them exactly as
# specified so bit-rot in the trust lane is caught in the run path, and
# records the verdicts as machinery evidence only: synthetic self-
# checks never block, never clear, and say nothing about tonight's
# game. Their production forms consume settled outcomes and checkpoint
# ensembles, which a pre-game run does not have.
# ---------------------------------------------------------------------------

def _trust_shadow(verdict: str, result: dict) -> GateOutcome:
    return _shadow_outcome(verdict, {
        "synthetic_self_check": True,
        "data_basis": result.get("data_basis"),
        "result": {k: v for k, v in result.items()
                   if isinstance(v, (int, float, str))},
    })


def gate_trust_enbpi(ctx: RunContext) -> GateOutcome:
    """EnbPI coverage gate (SYS-03/36): early-season gain >= 3.0pp over
    split-conformal ICP and full-season coverage within +-2pp of
    nominal, on the module's seeded synthetic nonstationary stream."""
    from trust.enbpi import enbpi_coverage_check

    result = enbpi_coverage_check()
    ok = (result["early_season_gain_pp"] >= 3.0
          and abs(result["full_season_deviation_pp"]) <= 2.0)
    return _trust_shadow(PASS if ok else FAIL, result)


def gate_trust_calibration(ctx: RunContext) -> GateOutcome:
    """SYS-21 calibration-chain baseline (Cohort-E): the production
    chain (temperature -> Platt -> isotonic -> hierarchical EB-tau)
    must reproduce brier ~= 0.2106 (+-0.005) and adaptive ECE
    ~= 0.0126 (+-0.005) on the module's seeded synthetic cohort."""
    from trust.calibration import cohort_e_baseline

    result = cohort_e_baseline()
    ok = (abs(result["brier"] - 0.2106) <= 0.005
          and abs(result["adaptive_ece"] - 0.0126) <= 0.005)
    return _trust_shadow(PASS if ok else FAIL, result)


def gate_trust_abstention(ctx: RunContext) -> GateOutcome:
    """SYS-25 NNTD abstention gate: on the module's seeded synthetic
    pick set, abstention must cut published-set Brier by >= 0.005 at a
    coverage loss <= 0.20."""
    from trust.abstention import abstention_backtest

    result = abstention_backtest()
    ok = (result["brier_cut"] >= 0.005
          and result["coverage_loss"] <= 0.20)
    return _trust_shadow(PASS if ok else FAIL, result)


# ---------------------------------------------------------------------------
# ARBITRATION gates
# ---------------------------------------------------------------------------

def gate_rvc(ctx: RunContext) -> GateOutcome:
    """Residual-versus-close clearance — first-class, enforcing.

    Consumes the frozen manifest of THIS run (its id is the manifest
    the verdict is bound to) and the run's paired holdout dataset.
    The verdict and its numbers land in evidence verbatim; the stamps
    for every artifact of this run derive from it in derive_stamps().
    """
    from gates.rvc_gate import evaluate_rvc

    result = evaluate_rvc(ctx.rvc_dataset, ctx.rvc_dataset_manifest,
                          manifest_id=ctx.run_id)
    ctx.rvc_result = result
    evidence = {"rvc": result, "manifest_id": ctx.run_id,
                "frozen_manifest": str(ctx.manifest_path)}
    if result["verdict"] == "CLEARED":
        return GateOutcome(PASS, evidence)
    return GateOutcome(FAIL, evidence,
                       "residual-versus-close NOT_CLEARED: "
                       + "; ".join(result["reasons"][:3]))


def gate_mint(ctx: RunContext) -> GateOutcome:
    """Mint discipline (intelligence/reasoning_engine/mint_gate.py):
    a reasoning trace never mints a probability, and a trace with a
    DATA-GAP facet — or a draft label — is withheld when asked.

    The gate feeds the mint check THIS run's real facet state (derived
    from upstream gate verdicts, including the RVC verdict) and passes
    only if the mint decision is the one the discipline requires.
    """
    from reasoning_engine.mint_gate import mint_after_mind

    results = ctx.gate_results
    rvc_verdict = (ctx.rvc_result or {}).get("verdict")

    def facet(gate_id: str) -> str:
        return "CLEAR" if results.get(gate_id, {}).get("verdict") == PASS \
            else "DATA-GAP"

    facets = {
        "residual_vs_close": "CLEAR" if rvc_verdict == "CLEARED" else "DATA-GAP",
        "price_feed": facet("ingest.price_feed_integrity"),
        "measured_correlations": facet("model.measured_correlations"),
    }
    label = "FINAL" if rvc_verdict == "CLEARED" \
        else "ANALYSIS-DRAFT — not for publication"
    decision = mint_after_mind(label, facets, asked=True)
    expected = "pass" if (label == "FINAL"
                          and all(v == "CLEAR" for v in facets.values())) \
        else "withhold"
    evidence = {"label": label, "facets": facets, "decision": decision,
                "expected_action": expected}
    if decision.get("action") != expected:
        return GateOutcome(FAIL, evidence,
                           f"mint discipline violated: expected {expected}, "
                           f"got {decision.get('action')}")
    return GateOutcome(PASS, evidence)


def gate_proof_ledger(ctx: RunContext) -> GateOutcome:
    """Proof ledger (intelligence/trust/proofledger.py): no source may
    claim edge unless its Wilson 95% lower bound clears 0.524 — the
    floor is the research's own number, and 0.524 itself does not
    clear. Applied to every artifact this run stands behind: any
    is_edge_claim must carry a wilson_lower_bound that the ledger
    admits, or the gate fails."""
    from trust.proofledger import edge_claim_admissible, proof_ledger_floor

    floor = proof_ledger_floor()
    checked, claims = [], []
    problems = []
    for name in ("sgp_projections", "props_live_board"):
        if name not in ctx.inputs:
            continue
        artifact = ctx.json_input(name)
        checked.append(name)
        if artifact.get("is_edge_claim") is True:
            claims.append(name)
            lb = artifact.get("wilson_lower_bound")
            if lb is None or not edge_claim_admissible(lb):
                problems.append(
                    f"{name}: edge claimed but Wilson LB {lb} does not "
                    f"clear the proof-ledger floor {floor}")
    evidence = {"floor": floor, "artifacts_checked": checked,
                "edge_claims_found": claims, "problems": problems}
    if problems:
        return GateOutcome(FAIL, evidence, "; ".join(problems))
    return GateOutcome(PASS, evidence)


# ---------------------------------------------------------------------------
# OUTPUT gates
# ---------------------------------------------------------------------------

_BANNED_PUBLIC_KEYS = ("kelly", "stake")
_NGS_MARKERS = ("nextgenstats", "next gen stats", "@nextgenstats")


def _deep_scan(node: Any, stamps: dict, path: str = "",
               hits: Optional[list] = None) -> list:
    hits = hits if hits is not None else []
    if isinstance(node, dict):
        for k, v in node.items():
            lk = str(k).lower()
            if any(b in lk for b in _BANNED_PUBLIC_KEYS):
                hits.append(f"stake field at {path}/{k}")
            if k in ("is_pick", "is_edge_claim") and v is True \
                    and not stamps.get("rvc_cleared"):
                hits.append(f"{k}=true at {path} while RVC not cleared")
            _deep_scan(v, stamps, f"{path}/{k}", hits)
    elif isinstance(node, list):
        for n, v in enumerate(node):
            _deep_scan(v, stamps, f"{path}[{n}]", hits)
    elif isinstance(node, str):
        low = node.lower()
        for marker in _NGS_MARKERS:
            if marker in low:
                hits.append(f"NGS marker {marker!r} at {path} — internal-only "
                            "material must never reach an emitted artifact")
    return hits


def gate_stamp_derivation(ctx: RunContext) -> GateOutcome:
    """The candidate report's stamps must equal derive_stamps() applied
    to this run's RVC verdict and enforcing failures — proof the
    stamps were derived by the gate, not set by hand."""
    candidate = ctx.candidate_report or {}
    recorded = candidate.get("stamps")
    pre_output_failures = [
        r["gate_id"] for r in ctx.gate_results.values()
        if r["mode"] == ENFORCING and r["verdict"] == FAIL
        and r["stage"] != "OUTPUT"
    ]
    rvc_verdict = (ctx.rvc_result or {}).get("verdict")
    expected = derive_stamps(rvc_verdict, pre_output_failures)
    evidence = {"recorded_stamps": recorded, "derived_stamps": expected,
                "rvc_verdict": rvc_verdict,
                "enforcing_failures_pre_output": pre_output_failures}
    if recorded != expected:
        return GateOutcome(FAIL, evidence,
                           "report stamps do not match the derivation — "
                           "stamps must come from derive_stamps(), by the "
                           "gate, never by hand")
    return GateOutcome(PASS, evidence)


def gate_public_surface_guard(ctx: RunContext) -> GateOutcome:
    """Nothing this run emits may carry stake sizing, a pick/edge claim
    while RVC is uncleared, or NGS material. Scans the candidate report
    and the run's customer-adjacent input artifacts; upstream artifacts
    outside the run's stamp authority are scanned for evidence only.
    """
    stamps = (ctx.candidate_report or {}).get("stamps") or {}
    verdict_hits: list[str] = []
    _deep_scan(ctx.candidate_report, stamps, path="report", hits=verdict_hits)
    for name in ("sgp_projections", "props_live_board"):
        if name in ctx.inputs:
            _deep_scan(ctx.json_input(name), stamps,
                       path=name, hits=verdict_hits)
    evidence_only: list[str] = []
    if "props_ev_board" in ctx.inputs:
        _deep_scan(ctx.json_input("props_ev_board"), stamps,
                   path="props_ev_board", hits=evidence_only)
    evidence = {"verdict_hits": verdict_hits,
                "upstream_evidence_only_hits": evidence_only,
                "upstream_note": "props_ev_board is Hermes' unstamped board; "
                                 "its restamp is owned by the PR #1156 hygiene "
                                 "lane — recorded here as evidence, not "
                                 "re-stamped by this run"}
    if verdict_hits:
        return GateOutcome(FAIL, evidence, "; ".join(verdict_hits[:5]))
    return GateOutcome(PASS, evidence)


def gate_evidence_guard(ctx: RunContext) -> GateOutcome:
    """Evidence guard (intelligence/trust/evidence_guard.py, SYS-22):
    the 15-test publish gate. The run's report artifact is offered to
    publish(); the guard rebinds the evidence hash and returns SHIP
    only at 15/15. This gate fails if the guard would SHIP an artifact
    the RVC gate has not cleared, or if the artifact is BLOCKED (hard
    integrity failure / quarantine). A HOLD on a diagnostic run is the
    guard working as designed — the failed checks are recorded as the
    exact requirements a future SHIP must meet."""
    from trust.evidence_guard import blocked_registry, evaluate, publish

    rvc = ctx.rvc_result or {}
    metrics = rvc.get("metrics") or {}
    evidence: dict[str, Any] = {}
    if "brier_model" in metrics:
        evidence["brier"] = metrics["brier_model"]
        evidence["baseline_brier"] = metrics["brier_close"]
        evidence["claims_brier_improvement"] = True
    if "ece_model" in metrics:
        evidence["adaptive_ece"] = metrics["ece_model"]
    cleared = rvc.get("verdict") == "CLEARED"
    artifact = {
        "artifact_id": ctx.run_id,
        "evidence": evidence,
        "n": metrics.get("n", 0),
        "claims_edge": cleared,
        "feeds_picks": cleared,
        "uses_conformal": False,
    }
    verdict, _shipped = publish(dict(artifact))
    detail = evaluate(artifact)
    decision = "BLOCKED" if ctx.run_id in blocked_registry() else verdict
    out = {"guard_decision": decision, "guard_passed": detail["passed"],
           "guard_failed_checks": detail["failed"],
           "guard_hard_failed": detail["hard_failed"],
           "note": "evidence_hash_present/evidence_rebound are satisfied "
                   "by publish()'s rebinding at publish time; evaluate() "
                   "detail above is shown pre-binding",
           "rvc_verdict": rvc.get("verdict")}
    if decision == "BLOCKED":
        return GateOutcome(FAIL, out,
                           "evidence guard BLOCKED the run artifact "
                           "(hard integrity failure; artifact quarantined)")
    if decision == "SHIP" and not cleared:
        return GateOutcome(FAIL, out,
                           "evidence guard would SHIP an artifact the RVC "
                           "gate has not cleared — guard/run divergence")
    if decision == "SHIP" and cleared:
        return GateOutcome(PASS, out)
    return GateOutcome(PASS, out,
                       "guard HOLDs the artifact from publishing — correct "
                       "for a run without clearance evidence")


# ---------------------------------------------------------------------------
# Gate assembly — must match gauntlet_registry.json exactly (tested).
# ---------------------------------------------------------------------------

_PE_SOURCE = "intelligence/gates/pe_modules/"


def build_gates() -> list[Gate]:
    gates: list[Gate] = [
        Gate("ingest.price_feed_integrity", "INGEST", ENFORCING, CANONICAL,
             "intelligence/props/real_price_feed.py", gate_price_feed_integrity),
        Gate("ingest.pinnacle_prop_feed", "INGEST", ENFORCING, CANONICAL,
             "intelligence/props/pinnacle_prop_feed.py", gate_pinnacle_prop_feed),
        Gate("ingest.manifest_completeness", "INGEST", ENFORCING, CANONICAL,
             "intelligence/gates/manifest_check.py", gate_manifest_completeness),
        Gate("ingest.heldout_discipline", "INGEST", ENFORCING, CANONICAL,
             "intelligence/gates/heldout_check.py", gate_heldout_discipline),
        Gate("ingest.injury_publication_gate", "INGEST", ENFORCING, CANONICAL,
             "intelligence/providers/injury_gate.py", gate_injury_publication),
        Gate("ingest.leakwall_market_snapshot", "INGEST", ENFORCING, CANONICAL,
             "intelligence/trust/leakwall.py", gate_leakwall_market_snapshot),
        Gate("signal.claim_matrix", "SIGNAL", ENFORCING, CANONICAL,
             "intelligence/gates/claim_matrix.py", gate_claim_matrix),
        Gate("model.measured_correlations", "MODEL", ENFORCING, CANONICAL,
             "data/snapshots/sgp_correlations.json", gate_measured_correlations),
        Gate("model.sgp_reproduction", "MODEL", ENFORCING, CANONICAL,
             "intelligence/sgp/price_from_real_prices.py", gate_sgp_reproduction),
        Gate("model.props_board_consistency", "MODEL", ENFORCING, CANONICAL,
             "intelligence/props/props_live_board.py", gate_props_board_consistency),
        Gate("arbitration.rvc", "ARBITRATION", ENFORCING, CANONICAL,
             "intelligence/gates/rvc_gate.py", gate_rvc),
        Gate("arbitration.mint_gate", "ARBITRATION", ENFORCING, CANONICAL,
             "intelligence/reasoning_engine/mint_gate.py", gate_mint),
        Gate("arbitration.proof_ledger", "ARBITRATION", ENFORCING, CANONICAL,
             "intelligence/trust/proofledger.py", gate_proof_ledger),
        Gate("output.stamp_derivation", "OUTPUT", ENFORCING, CANONICAL,
             "intelligence/gates/gauntlet.py::derive_stamps", gate_stamp_derivation),
        Gate("output.public_surface_guard", "OUTPUT", ENFORCING, CANONICAL,
             "intelligence/gates/gauntlet.py::_deep_scan", gate_public_surface_guard),
        Gate("output.evidence_guard", "OUTPUT", ENFORCING, CANONICAL,
             "intelligence/trust/evidence_guard.py", gate_evidence_guard),
        Gate("trust.enbpi_coverage", "SIMULATION", SHADOW, CANONICAL,
             "intelligence/trust/enbpi.py", gate_trust_enbpi),
        Gate("trust.calibration_chain_baseline", "ARBITRATION", SHADOW, CANONICAL,
             "intelligence/trust/calibration.py", gate_trust_calibration),
        Gate("trust.abstention_backtest", "ARBITRATION", SHADOW, CANONICAL,
             "intelligence/trust/abstention.py", gate_trust_abstention),
    ]
    # Prediction-engine shadow gates.
    gates.append(Gate("pe.module_03", "SIGNAL", SHADOW,
                      INFERRED, _PE_SOURCE + "pe_modules_01_04.py", _pe_01_04(3)))
    for mid in (1, 2, 4):
        gates.append(Gate(f"pe.module_{mid:02d}", "MODEL", SHADOW, INFERRED,
                          _PE_SOURCE + "pe_modules_01_04.py", _pe_01_04(mid)))
    for mid in (5, 6, 7, 8):
        gates.append(Gate(f"pe.module_{mid:02d}", "MODEL", SHADOW, INFERRED,
                          _PE_SOURCE + "pe_modules_05_08.py", _pe_05_08(mid)))
    for mid in (13, 14, 15, 16):
        gates.append(Gate(f"pe.module_{mid:02d}", "MODEL", SHADOW, INFERRED,
                          _PE_SOURCE + "pe_modules_13_16.py", _pe_13_16(mid)))
    for mid in (21, 22, 23, 24):
        gates.append(Gate(f"pe.module_{mid:02d}", "ARBITRATION", SHADOW,
                          INFERRED, _PE_SOURCE + "pe_modules_21_24.py",
                          _pe_21_24(mid)))
    return gates


# ---------------------------------------------------------------------------
# The runner
# ---------------------------------------------------------------------------

def run_gauntlet(ctx: RunContext, out_dir: Path,
                 gates: Optional[list[Gate]] = None) -> dict[str, Any]:
    gates = gates if gates is not None else build_gates()
    registry = load_registry(ctx.root)

    # 1. Freeze FIRST. No gate executes against unfrozen inputs.
    ctx.freeze(out_dir)

    results: list[dict[str, Any]] = []

    def run_stage(stage: str) -> None:
        for gate in [g for g in gates if g.stage == stage]:
            result = _execute(gate, ctx)
            results.append(result)
            ctx.gate_results[gate.id] = result

    # 2. INGEST -> SIGNAL -> MODEL -> SIMULATION -> ARBITRATION
    for stage in STAGES[:-1]:
        run_stage(stage)

    rvc_verdict = (ctx.rvc_result or {}).get("verdict")
    pre_output_failures = [r["gate_id"] for r in results
                           if r["mode"] == ENFORCING and r["verdict"] == FAIL]
    stamps = derive_stamps(rvc_verdict, pre_output_failures)

    # 3. Candidate report -> OUTPUT gates inspect it -> final stamps.
    report: dict[str, Any] = {
        "run_id": ctx.run_id,
        "generated_at": ctx.now.isoformat(),
        "game": ctx.game,
        "base_commit": ctx.base_commit,
        "manifest_path": str(ctx.manifest_path),
        "stamps": stamps,
        "rvc": ctx.rvc_result,
        "gates": results,
    }
    ctx.candidate_report = report
    run_stage("OUTPUT")

    all_failures = [r["gate_id"] for r in results
                    if r["mode"] == ENFORCING and r["verdict"] == FAIL]
    final_stamps = derive_stamps(rvc_verdict, all_failures)
    if final_stamps != stamps:
        report["stamps_pre_output"] = stamps
    report["stamps"] = final_stamps

    # 4. Census + registry consistency (fail-closed: drift forces
    #    diagnostic stamps and is recorded as an error).
    executed = {r["gate_id"] for r in results}
    wired = {e["gate_id"] for e in registry["wired"]}
    shadow = {e["gate_id"] for e in registry["shadow"]}
    consistency_errors = []
    if executed != wired | shadow:
        consistency_errors.append(
            f"executed gates != registry census: "
            f"missing={sorted((wired | shadow) - executed)}, "
            f"unregistered={sorted(executed - (wired | shadow))}")
    mode_by_id = {r["gate_id"]: r["mode"] for r in results}
    for gid in shadow:
        if mode_by_id.get(gid) != SHADOW:
            consistency_errors.append(f"{gid}: registered SHADOW but ran "
                                      f"as {mode_by_id.get(gid)}")
    report["registry_consistency_errors"] = consistency_errors
    if consistency_errors:
        report["stamps"] = derive_stamps(None, ["registry_consistency"])
    report["census"] = {
        "wired_enforcing": sorted(wired),
        "shadow_only": sorted(shadow),
        "not_wired": registry["not_wired"],
    }
    report["counts"] = {
        mode.lower(): {
            v: sum(1 for r in results
                   if r["mode"] == mode and r["verdict"] == v)
            for v in (PASS, FAIL, SKIP)
        } for mode in (ENFORCING, SHADOW)
    }
    report["enforcing_failures"] = all_failures

    report_path = out_dir / f"{ctx.run_id}_gauntlet_report.json"
    report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
    report["report_path"] = str(report_path)
    return report


def load_registry(root: Path) -> dict[str, Any]:
    path = Path(__file__).resolve().parent / "gauntlet_registry.json"
    return json.loads(path.read_text(encoding="utf-8"))


# ---------------------------------------------------------------------------
# Tonight: Monday Night Football, Buffalo Bills at Los Angeles Rams.
# ---------------------------------------------------------------------------

MNF_GAME = {
    "away": "Buffalo Bills",
    "home": "Los Angeles Rams",
    "away_abbr": "BUF",
    "home_abbr": "LAR",
    "kickoff_utc": "2026-10-13T00:15:00Z",
    # Pinnacle's parent matchup id for this game, as recorded in the
    # feed's own live-capture fixtures/tests.
    "pinnacle_game_matchup_id": 1637432964,
}

_BASE_COMMIT = "b7df9c9f4755f81bbdaf2a71f408e6ab5315a3c7"


def build_mnf_context(root: Path, base_commit: str = _BASE_COMMIT,
                      tree_snapshot: Optional[dict[str, str]] = None,
                      now: Optional[datetime] = None) -> RunContext:
    root = Path(root)
    inputs = {
        "espn_scoreboard": root / "intelligence/props/fixtures/espn_scoreboard_20261012_buf_lar.json",
        "pinnacle_matchups": root / "intelligence/props/fixtures/pinnacle_matchups_buf_lar.json",
        "pinnacle_related": root / "intelligence/props/fixtures/pinnacle_related_buf_lar.json",
        "correlations": root / "data/snapshots/sgp_correlations.json",
        "sgp_projections": root / "outbox/sgp_projections_latest.json",
        "props_live_board": root / "outbox/props_live_board_latest.json",
        "props_ev_board": root / "outbox/props_ev_board_latest.json",
        "claims": root / "intelligence/gates/claims.json",
        "calibration_rows": root / "intelligence/gates/calibration_rows.json",
    }
    provenance = {
        "espn_scoreboard": {
            "source": "ESPN scoreboard API (keyless public path), captured 2026-10-12",
            "producer": "intelligence/props/real_price_feed.py",
            "date_range": "2026-10-12 slate", "license": "internal",
        },
        "pinnacle_matchups": {
            "source": "Pinnacle guest API (public client key), captured 2026-10-12",
            "producer": "intelligence/props/pinnacle_prop_feed.py",
            "date_range": "2026-10-12", "license": "internal",
        },
        "pinnacle_related": {
            "source": "Pinnacle guest API related/straight bundle, captured 2026-10-12",
            "producer": "intelligence/props/pinnacle_prop_feed.py",
            "date_range": "2026-10-12", "license": "internal",
        },
        "correlations": {
            "source": "nflverse play-by-play, measured same-game correlations",
            "producer": "intelligence/props/sgp_correlation_estimator.py",
            "date_range": "per snapshot seasons field", "license": "internal",
        },
        "sgp_projections": {
            "source": "SGP projections artifact from real ESPN/Galaxy prices",
            "producer": "intelligence/sgp/price_from_real_prices.py",
            "date_range": "2026-10-12", "license": "internal",
        },
        "props_live_board": {
            "source": "Live props board on Pinnacle prices",
            "producer": "intelligence/props/props_live_board.py",
            "date_range": "2026-10-12", "license": "internal",
        },
        "props_ev_board": {
            "source": "Hermes props EV board (evidence-scan only in this run)",
            "producer": "intelligence/props/prop_discrepancy_engine.py",
            "date_range": "2026-10-11", "license": "internal",
        },
        "claims": {
            "source": "fleet claim registry",
            "producer": "intelligence/gates/claim_matrix.py",
            "date_range": "standing", "license": "internal",
        },
        "calibration_rows": {
            "source": "signal calibration registry",
            "producer": "intelligence/gates",
            "date_range": "standing", "license": "internal",
        },
    }
    return RunContext(
        root=root, run_id="mnf_20261012", game=dict(MNF_GAME), inputs=inputs,
        input_provenance=provenance, base_commit=base_commit,
        tree_snapshot=tree_snapshot, now=now,
        # No frozen paired (model, close, outcome) holdout exists in this
        # run's inputs — the canonical diagnostic board lives outside
        # this branch's tree. The RVC gate therefore evaluates to
        # NOT_CLEARED on its own checks, with the reason recorded.
        rvc_dataset=None, rvc_dataset_manifest=None,
    )


def main(argv: Optional[list[str]] = None) -> int:
    parser = argparse.ArgumentParser(description="Run the gate gauntlet")
    parser.add_argument("--root", default=".",
                        help="repository root (default: cwd)")
    parser.add_argument("--out", default=None,
                        help="output directory (default: <root>/outbox/gauntlet)")
    parser.add_argument("--base-commit", default=_BASE_COMMIT)
    parser.add_argument("--tree", default=None,
                        help="optional git-tree JSON ({tree:[{path,sha}]}) used "
                             "to annotate claim-matrix existence checks")
    args = parser.parse_args(argv)

    root = Path(args.root).resolve()
    out_dir = Path(args.out).resolve() if args.out else root / "outbox" / "gauntlet"
    tree_snapshot = None
    if args.tree:
        doc = json.loads(Path(args.tree).read_text(encoding="utf-8"))
        tree_snapshot = {e["path"]: e["sha"] for e in doc.get("tree", [])
                         if e.get("type") == "blob"}
    ctx = build_mnf_context(root, base_commit=args.base_commit,
                            tree_snapshot=tree_snapshot)
    report = run_gauntlet(ctx, out_dir)
    summary = {
        "run_id": report["run_id"],
        "stamps": report["stamps"],
        "rvc_verdict": (report["rvc"] or {}).get("verdict"),
        "counts": report["counts"],
        "enforcing_failures": report["enforcing_failures"],
        "registry_consistency_errors": report["registry_consistency_errors"],
        "manifest": report["manifest_path"],
        "report": report["report_path"],
    }
    print(json.dumps(summary, indent=2))
    hard_failures = [g for g in report["enforcing_failures"]
                     if g != "arbitration.rvc"]
    return 1 if (hard_failures or report["registry_consistency_errors"]) else 0


if __name__ == "__main__":
    sys.exit(main())
