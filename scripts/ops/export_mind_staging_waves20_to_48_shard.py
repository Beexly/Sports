#!/usr/bin/env python3
"""Export the Waves 20-48 compound trainer-ready mind shard to data/mind_staging/.

Single-writer safety:
- NEVER opens `brain/mind.jsonl` for writing and explicitly refuses `--output`
  if it resolves to `brain/mind.jsonl`.
- Aggregates real records from all 5 canonical families:
  1. `books_503` (data/mind/complete_458_book_registry.json + crosswalk)
  2. `equations_21419` (equation_inventory_v2.json + equation_execution_registry.jsonl)
  3. `alphaxiv_203` (data/arxiv_2026_11_alphaxiv/*.json)
  4. `rlvr_412` (compile_gse_to_gsi_rlvr_training_batch + standalone RLVR feed)
  5. `w1_11_bakeoff` (W1-11 simulation battery + W11 slate + wave32..48 evals)
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
import unicodedata
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[2]
for _p in (str(REPO_ROOT / "src"), str(REPO_ROOT)):
    if _p not in sys.path:
        sys.path.insert(0, _p)

from gse_engine.memory.knowledge_continuity_and_gsi_rlvr_flywheel import (  # noqa: E402
    compile_gse_to_gsi_rlvr_training_batch,
)

DEFAULT_OUTPUT = (
    REPO_ROOT
    / "data"
    / "mind_staging"
    / "mind_2026_11_18_waves20_to_48_compound_shard.jsonl"
)
FORBIDDEN_SINGLE_WRITER_TARGET = (REPO_ROOT / "brain" / "mind.jsonl").resolve()

_LOCAL_USER_TOKEN = "Users" + r"[/\\]+" + "Garrett"
_LOCAL_USER_PATH_RE = re.compile(
    rf"(?:[A-Za-z]:)?(?:[/\\]+{_LOCAL_USER_TOKEN}(?:[/\\]+[^\s\"'`]+)?)",
    re.IGNORECASE,
)

_ASCII_SUBS = (
    ("\u2014", "--"),
    ("\u2013", "-"),
    ("\u2018", "'"),
    ("\u2019", "'"),
    ("\u201c", '"'),
    ("\u201d", '"'),
    ("\u2192", "->"),
    ("\u2190", "<-"),
    ("\u2264", "<="),
    ("\u2265", ">="),
    ("\u00b7", "|"),
    ("\u00d7", "x"),
    ("\u2248", "~="),
    ("\u0394", "delta_"),
    ("\u03c4", "tau"),
    ("\u2713", "[OK]"),
    ("\u2714", "[OK]"),
    ("\u2717", "[NO]"),
)


def to_clean_ascii(value: Any) -> str:
    """Convert arbitrary text to pure 7-bit ASCII with zero local-user paths."""
    text = str(value if value is not None else "")
    for src, dst in _ASCII_SUBS:
        text = text.replace(src, dst)
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")
    text = _LOCAL_USER_PATH_RE.sub("<redacted_local_path>", text)
    return text.strip()


def sanitize_obj(obj: Any) -> Any:
    """Recursively sanitize dicts/lists/strings into pure 7-bit ASCII JSON types."""
    if isinstance(obj, str):
        return to_clean_ascii(obj)
    if isinstance(obj, dict):
        return {to_clean_ascii(k): sanitize_obj(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [sanitize_obj(v) for v in obj]
    return obj


def _make_record(
    *,
    rec_id: str,
    family: str,
    source_relpath: str,
    title: str,
    text: str,
    metadata: dict[str, Any],
) -> dict[str, Any]:
    clean_text = to_clean_ascii(text)
    if len(clean_text) > 2000:
        clean_text = clean_text[:1980].rstrip() + " [TRUNCATED]"
    return {
        "id": to_clean_ascii(rec_id),
        "family": family,
        "corpus": f"waves20_to_48_{family}",
        "source_relpath": to_clean_ascii(source_relpath),
        "title": to_clean_ascii(title),
        "text": clean_text,
        "metadata": sanitize_obj(metadata),
        "trainer_ready": True,
        "staged_at": "2026-11-18",
        "single_writer_safe": True,
    }


def _collect_books_503(repo_root: Path) -> list[dict[str, Any]]:
    reg_path = repo_root / "data" / "mind" / "complete_458_book_registry.json"
    cw_path = repo_root / "data" / "mind" / "book_domain_crosswalk_2026.json"
    reg = json.loads(reg_path.read_text(encoding="utf-8"))
    cw = json.loads(cw_path.read_text(encoding="utf-8"))
    quar_wt = reg.get("books_b_medical_quarantine", {}).get("sports_spine_weight", 0.0)
    records: list[dict[str, Any]] = [
        _make_record(
            rec_id="w20_48_books_503_crosswalk_summary",
            family="books_503",
            source_relpath="data/mind/book_domain_crosswalk_2026.json",
            title="503-Book Domain Crosswalk Summary",
            text=(
                f"Complete book corpus mapped: {cw.get('total_books_mapped', 503)} books "
                "across 6 mathematical domains (D1-D6), 26 layers, and 279 families. "
                f"Medical books quarantine weight: {quar_wt}."
            ),
            metadata={
                "total_books_mapped": cw.get("total_books_mapped"),
                "domain_books_counts": cw.get("domain_books_counts"),
                "books_b_medical_quarantine": reg.get("books_b_medical_quarantine"),
            },
        )
    ]
    for book in reg.get("books", []):
        idx = int(book.get("book_index", 0))
        bid = str(book.get("book_id") or f"BK-{idx:03d}")
        title = str(book.get("title") or bid)
        lane = str(book.get("lane") or "unknown")
        domain = str(book.get("operator_domain") or "unknown")
        permitted = bool(book.get("sports_spine_import_permitted", False))
        weight = float(book.get("sports_spine_weight", 0.0))
        records.append(
            _make_record(
                rec_id=f"w20_48_books_503_{idx:03d}_{bid}",
                family="books_503",
                source_relpath="data/mind/complete_458_book_registry.json",
                title=title,
                text=(
                    f"Book {idx}/503 ({bid}): {title}. Lane={lane}, domain={domain}, "
                    f"sports_spine_import_permitted={permitted}, sports_spine_weight={weight}."
                ),
                metadata={
                    "book_index": idx,
                    "book_id": bid,
                    "lane": lane,
                    "operator_domain": domain,
                    "sports_spine_import_permitted": permitted,
                    "sports_spine_weight": weight,
                    "canonical_content_book_id": book.get("canonical_content_book_id"),
                },
            )
        )
    return records


def _collect_equations_21419(repo_root: Path) -> list[dict[str, Any]]:
    inv_path = repo_root / "data" / "mind" / "equation_inventory_v2.json"
    quar_path = (
        repo_root
        / "data"
        / "mind"
        / "legacy_21419_template_quarantine_audit_2026_11_10.json"
    )
    reg_path = repo_root / "data" / "equations" / "equation_execution_registry.jsonl"
    inv = json.loads(inv_path.read_text(encoding="utf-8"))
    quar = json.loads(quar_path.read_text(encoding="utf-8"))
    kernel_count = len(inv.get("operator_kernels_9", []))

    records: list[dict[str, Any]] = [
        _make_record(
            rec_id="w20_48_equations_21419_inventory_summary",
            family="equations_21419",
            source_relpath="data/mind/equation_inventory_v2.json",
            title="Equation Execution Registry Inventory (21419 Equations / 279 Families)",
            text=(
                f"Total equations={inv.get('total_equations')}, active_above_min_sample="
                f"{inv.get('active_above_min_sample')}, held_below_min_sample="
                f"{inv.get('held_below_min_sample')}, families={inv.get('total_families')}, "
                f"layers={inv.get('total_layers')}, kernels={kernel_count}."
            ),
            metadata={
                "total_equations": inv.get("total_equations"),
                "active_above_min_sample": inv.get("active_above_min_sample"),
                "held_below_min_sample": inv.get("held_below_min_sample"),
                "total_families": inv.get("total_families"),
                "kernel_equations_counts": inv.get("kernel_equations_counts"),
            },
        ),
        _make_record(
            rec_id="w20_48_equations_21419_quarantine_audit",
            family="equations_21419",
            source_relpath="data/mind/legacy_21419_template_quarantine_audit_2026_11_10.json",
            title="Legacy 21419 Template Quarantine Audit",
            text=(
                f"Quarantine status={quar.get('quarantine_status')}, "
                f"total_legacy_rows_quarantined={quar.get('total_legacy_rows_quarantined')}, "
                f"nothing_deleted={quar.get('nothing_deleted')}."
            ),
            metadata={
                "quarantine_status": quar.get("quarantine_status"),
                "total_legacy_rows_quarantined": quar.get("total_legacy_rows_quarantined"),
                "kernel_breakdown": quar.get("kernel_breakdown"),
            },
        ),
    ]

    seen_families: set[int] = set()
    with reg_path.open("r", encoding="utf-8", errors="replace") as fh:
        for line in fh:
            if not line.strip():
                continue
            row = json.loads(line)
            fam_id = int(row.get("family_id", -1))
            if fam_id in seen_families:
                continue
            seen_families.add(fam_id)
            eq_id = str(row.get("equation_id") or f"EQ_{fam_id:05d}")
            fam_name = str(
                row.get("canonical_family") or row.get("family") or f"FAM_{fam_id:03d}"
            )
            records.append(
                _make_record(
                    rec_id=f"w20_48_equations_21419_fam_{fam_id:03d}_{eq_id}",
                    family="equations_21419",
                    source_relpath="data/equations/equation_execution_registry.jsonl",
                    title=str(row.get("name") or eq_id),
                    text=(
                        f"{eq_id} ({fam_name}, domain={row.get('domain')}, "
                        f"type={row.get('formula_type')}, layer={row.get('target_layer')}): "
                        f"{row.get('formula_spec')}"
                    ),
                    metadata={
                        "equation_id": eq_id,
                        "family_id": fam_id,
                        "canonical_family": fam_name,
                        "domain": row.get("domain"),
                        "target_layer": row.get("target_layer"),
                        "sample_size_n": row.get("sample_size_n"),
                        "min_sample_size": row.get("min_sample_size"),
                        "status": row.get("status"),
                    },
                )
            )
    return records


def _collect_alphaxiv_203(repo_root: Path) -> list[dict[str, Any]]:
    vault_dir = repo_root / "data" / "arxiv_2026_11_alphaxiv"
    records: list[dict[str, Any]] = []
    seen_ids: set[str] = set()

    for path in sorted(vault_dir.glob("*.json")):
        rel = path.relative_to(repo_root).as_posix()
        data = json.loads(path.read_text(encoding="utf-8"))
        for key, val in data.items():
            if not isinstance(val, list):
                continue
            if val and isinstance(val[0], str):
                records.append(
                    _make_record(
                        rec_id=f"w20_48_alphaxiv_203_{path.stem}_{key}",
                        family="alphaxiv_203",
                        source_relpath=rel,
                        title=f"AlphaXiv Cross-Linked Index: {key}",
                        text=f"{key} in {path.name}: {len(val)} paper IDs -> {', '.join(val)}",
                        metadata={"bucket": key, "paper_ids": val, "count": len(val)},
                    )
                )
                continue
            for item in val:
                if not isinstance(item, dict):
                    continue
                pid = str(item.get("id") or item.get("arxiv_id") or "")
                dedup_key = f"{path.stem}:{pid}:{key}"
                if dedup_key in seen_ids:
                    continue
                seen_ids.add(dedup_key)
                title = str(item.get("title") or pid)
                insight = (
                    item.get("key_insight")
                    or item.get("abstract_excerpt")
                    or "; ".join(str(x) for x in item.get("key_findings", []))
                    or item.get("topic")
                    or item.get("pillar")
                    or ""
                )
                authors = item.get("authors") or []
                if isinstance(authors, list):
                    author_str = ", ".join(str(a) for a in authors[:6])
                else:
                    author_str = str(authors)
                records.append(
                    _make_record(
                        rec_id=f"w20_48_alphaxiv_203_{pid or len(records)}_{path.stem}",
                        family="alphaxiv_203",
                        source_relpath=rel,
                        title=title,
                        text=(
                            f"Paper {pid} ({item.get('published', '')}, bucket={key}): {title}. "
                            f"Authors: {author_str}. Insight: {insight}"
                        ),
                        metadata={
                            "paper_id": pid,
                            "published": item.get("published"),
                            "bucket": key,
                            "url": item.get("url") or item.get("alphaxiv_url"),
                            "arxiv_url": item.get("arxiv_url"),
                        },
                    )
                )
    return records


def _collect_rlvr_412(repo_root: Path) -> list[dict[str, Any]]:
    batch = compile_gse_to_gsi_rlvr_training_batch(repo_root, min_target_records=388)
    records: list[dict[str, Any]] = []
    for item in batch.get("records", []):
        rid = str(item.get("record_id") or "")
        records.append(
            _make_record(
                rec_id=f"w20_48_rlvr_412_{rid}",
                family="rlvr_412",
                source_relpath="src/gse_engine/memory/knowledge_continuity_and_gsi_rlvr_flywheel.py",
                title=f"RLVR Trajectory {rid}",
                text=(
                    f"[{item.get('curriculum_tier')}] domain={item.get('domain')} | "
                    f"prompt={item.get('prompt')} | think={item.get('think')}"
                ),
                metadata={
                    "record_id": rid,
                    "domain": item.get("domain"),
                    "curriculum_tier": item.get("curriculum_tier"),
                    "tier_rank": item.get("tier_rank"),
                    "zero_odds_verified": True,
                },
            )
        )

    standalone_path = (
        repo_root
        / "brain"
        / "feeds"
        / "2026-11-17"
        / "aws_ngs_going_deep_gse_to_gsi_rlvr_feed.jsonl"
    )
    standalone_rel = (
        "brain/feeds/2026-11-17/aws_ngs_going_deep_gse_to_gsi_rlvr_feed.jsonl"
    )
    if standalone_path.is_file():
        for line in standalone_path.read_text(encoding="utf-8").splitlines():
            if not line.strip():
                continue
            row = json.loads(line)
            tid = str(row.get("trajectory_id") or "")
            records.append(
                _make_record(
                    rec_id=f"w20_48_rlvr_412_{tid}",
                    family="rlvr_412",
                    source_relpath=standalone_rel,
                    title=f"Standalone RLVR {tid}",
                    text=(
                        f"[{row.get('curriculum_tier')}] prompt={row.get('prompt')} | "
                        f"trace={row.get('reasoning_trace')}"
                    ),
                    metadata={
                        "trajectory_id": tid,
                        "curriculum_tier": row.get("curriculum_tier"),
                        "expected_reward": row.get("expected_reward"),
                        "source_corpus": row.get("source_corpus"),
                        "zero_odds_verified": True,
                    },
                )
            )
    return records


def _collect_w1_11_bakeoff(repo_root: Path) -> list[dict[str, Any]]:
    battery_rel = "data/eval/overnight_w1_to_w11_simulation_battery_2026_11_18.json"
    w11_rel = "data/engine/week11_unified_sealed_projections_2026_11_18.json"
    battery = json.loads((repo_root / battery_rel).read_text(encoding="utf-8"))
    w11 = json.loads((repo_root / w11_rel).read_text(encoding="utf-8"))

    records: list[dict[str, Any]] = [
        _make_record(
            rec_id="w20_48_w1_11_bakeoff_oos_baseline",
            family="w1_11_bakeoff",
            source_relpath=battery_rel,
            title="Weeks 1-10 OOS Baseline Simulation Battery",
            text=(
                f"OOS games={battery['w1_to_w10_oos']['games_evaluated']}, "
                f"baseline={json.dumps(battery['w1_to_w10_oos']['baseline'])}, "
                f"governance={json.dumps(battery['governance'])}."
            ),
            metadata={
                "w1_to_w10_oos": battery["w1_to_w10_oos"],
                "gsi_ruo_audit": battery["gsi_ruo_audit"],
                "governance": battery["governance"],
            },
        )
    ]

    for row in battery.get("theory_ablation_leaderboard", []):
        sid = str(row.get("scenario_id") or "")
        cat = row.get("category")
        verdict = row.get("verdict")
        records.append(
            _make_record(
                rec_id=f"w20_48_w1_11_bakeoff_ablation_{sid}",
                family="w1_11_bakeoff",
                source_relpath=battery_rel,
                title=f"Ablation Scenario: {sid}",
                text=(
                    f"Scenario {sid} (category={cat}, verdict={verdict}): "
                    f"norm_crps={row.get('norm_crps')}, ece={row.get('ece')}, "
                    f"d_crps={row.get('delta_crps_vs_ref')}. Reason: {row.get('reason')}"
                ),
                metadata=row,
            )
        )

    dark_modules = battery.get("dark_intelligence_bakeoff", {}).get("modules", [])
    for mod in dark_modules:
        mname = str(mod.get("module") or "")
        records.append(
            _make_record(
                rec_id=f"w20_48_w1_11_bakeoff_dark_{mname}",
                family="w1_11_bakeoff",
                source_relpath=battery_rel,
                title=f"Dark Intelligence Bakeoff Module: {mname}",
                text=(
                    f"Module {mname}: verdict={mod.get('verdict')}, "
                    f"oos_crps_delta={mod.get('oos_crps_delta')}, "
                    f"clinical_ruo_sports_weight={mod.get('clinical_ruo_sports_weight')}. "
                    f"Reason: {mod.get('reason')}"
                ),
                metadata=mod,
            )
        )

    for g in w11.get("games", []):
        gid = str(g.get("game_id") or "")
        matchup = str(g.get("matchup") or "")
        s2 = g.get("stage2_reasoned_environment", {})
        s3 = g.get("stage3_simulation_summary", {})
        records.append(
            _make_record(
                rec_id=f"w20_48_w1_11_bakeoff_w11_game_{gid}",
                family="w1_11_bakeoff",
                source_relpath=w11_rel,
                title=f"Week 11 Sealed Spine Game Summary: {matchup}",
                text=(
                    f"{matchup} (game_id={gid}, indoor={g.get('indoor')}): "
                    f"pace={s2.get('pace_sec_per_play')}s/play, "
                    f"sim_total_mean={s3.get('total_score_mean')}, "
                    f"home_win_prob={s3.get('home_win_prob')}, "
                    f"sha256={g.get('game_projection_sha256')}."
                ),
                metadata={
                    "game_id": gid,
                    "matchup": matchup,
                    "n_worlds": g.get("n_worlds"),
                    "game_projection_sha256": g.get("game_projection_sha256"),
                    "stage3_simulation_summary": s3,
                },
            )
        )

    for eval_file in sorted((repo_root / "data" / "eval").glob("wave*.json")):
        rel = eval_file.relative_to(repo_root).as_posix()
        payload = json.loads(eval_file.read_text(encoding="utf-8"))
        is_dict = isinstance(payload, dict)
        summary_keys = list(payload.keys())[:12] if is_dict else []
        schema_name = payload.get("schema") if is_dict else "list"
        records.append(
            _make_record(
                rec_id=f"w20_48_w1_11_bakeoff_eval_{eval_file.stem}",
                family="w1_11_bakeoff",
                source_relpath=rel,
                title=f"Wave Eval Benchmark: {eval_file.stem}",
                text=f"Benchmark artifact {rel} schema={schema_name} keys={summary_keys}",
                metadata={"schema": schema_name, "top_keys": summary_keys},
            )
        )

    return records


def export_compound_shard(
    *,
    repo_root: Path = REPO_ROOT,
    output_path: Path = DEFAULT_OUTPUT,
) -> dict[str, Any]:
    """Assemble and write the pure-ASCII Waves 20-48 compound shard."""
    resolved_out = output_path.resolve()
    is_brain_mind = (
        resolved_out.name == "mind.jsonl" and resolved_out.parent.name == "brain"
    )
    if resolved_out == FORBIDDEN_SINGLE_WRITER_TARGET or is_brain_mind:
        raise ValueError(
            "Single-writer doctrine violation: refusing to write to brain/mind.jsonl"
        )

    families = {
        "books_503": _collect_books_503(repo_root),
        "equations_21419": _collect_equations_21419(repo_root),
        "alphaxiv_203": _collect_alphaxiv_203(repo_root),
        "rlvr_412": _collect_rlvr_412(repo_root),
        "w1_11_bakeoff": _collect_w1_11_bakeoff(repo_root),
    }

    all_records: list[dict[str, Any]] = []
    seen_ids: set[str] = set()
    for fam_records in families.values():
        for rec in fam_records:
            rid = rec["id"]
            if rid in seen_ids:
                suffix = hashlib.sha256(rec["text"].encode("ascii")).hexdigest()[:8]
                rec["id"] = f"{rid}_{suffix}"
            seen_ids.add(rec["id"])
            all_records.append(rec)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    lines = [
        json.dumps(rec, ensure_ascii=True, separators=(",", ":"))
        for rec in all_records
    ]
    payload = "\n".join(lines) + "\n"
    if not payload.isascii():
        raise ValueError("Generated shard contains non-ASCII characters")
    output_path.write_text(payload, encoding="ascii")

    counts = {k: len(v) for k, v in families.items()}
    rel_out = (
        output_path.resolve().relative_to(repo_root.resolve()).as_posix()
        if output_path.resolve().is_relative_to(repo_root.resolve())
        else str(output_path)
    )
    return {
        "output_relpath": rel_out,
        "total_records": len(all_records),
        "family_counts": counts,
        "sha256": hashlib.sha256(payload.encode("ascii")).hexdigest(),
        "single_writer_mind_jsonl_untouched": True,
    }


def main(argv: list[str] | None = None) -> int:
    """CLI entrypoint."""
    parser = argparse.ArgumentParser(
        description="Export Waves 20-48 compound mind shard to data/mind_staging/."
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_OUTPUT,
        help="Destination JSONL path (must never target brain/mind.jsonl).",
    )
    args = parser.parse_args(argv)
    try:
        summary = export_compound_shard(repo_root=REPO_ROOT, output_path=args.output)
    except ValueError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2
    print(json.dumps(summary, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
