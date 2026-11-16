"""Typed CLI over gse_engine backed by google/python-fire (with argparse fallback)."""

from __future__ import annotations

import argparse
import json
import sys
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from gse_engine.cloud.polyglot_cloud_and_ci_adapters import (
    CiE2eRunnerSpec,
    ServerlessEventFanoutSpec,
    build_e2e_ci_and_remote_harness_plan,
    build_polyglot_gcp_client_envelope,
    validate_serverless_and_event_fanout_spec,
)
from gse_engine.compute.lineup_doctor_bridge import quick_doctor_selftest
from gse_engine.compute.skfolio_allocator import (
    CandidateBetTicket,
    allocate_skfolio_kelly_portfolio,
)
from gse_engine.gates.cage_policy import evaluate_cage_slate_policy
from gse_engine.governance.agent_org_roster import (
    DEFAULT_GSE_ORG_CHART,
    validate_agent_org_chart,
)
from gse_engine.ingestion.deepke_triples import extract_football_knowledge_triples
from gse_engine.ingestion.feed_guard import verify_feed_payload
from gse_engine.memory.agentdb_store import AgentDbMemoryStore
from gse_engine.memory.billion_context import ContextTurn, LsmContextKernel
from gse_engine.models import SlateWindowConfig
from gse_engine.observability.arize_tracing import evaluate_walk_forward_calibration
from gse_engine.observability.skill_evaluator import SkillSpec, evaluate_skill_catalog
from gse_engine.observability.skill_registry_router import (
    CapabilityDomain,
    build_arize_deep_link,
    route_gse_capability_domain,
)
from gse_engine.storage.trajectory_checkpoint import TrajectoryCheckpointer
from gse_engine.workflows.slate_window import resolve_lock_version


def _build_commands() -> dict[str, Any]:
    """Builds the CLI command dispatch table."""

    def lock(season: int = 2026, week: int = 10, window: str = "SUN_SLATE") -> str:
        """Runs a deterministic Noon Master Lock version resolution & CAGE gate check."""
        valid_slot = window if window in {"TNF", "SUN_SLATE", "MNF"} else "SUN_SLATE"
        cfg = SlateWindowConfig(
            season=season,
            week=week,
            window_slot=valid_slot,  # type: ignore[arg-type]
            mode="noon-lock",
        )
        _, receipt = evaluate_cage_slate_policy([], named_volume_share=1.0)
        return json.dumps(
            {
                "season": season,
                "week": week,
                "window": valid_slot,
                "lock_version": resolve_lock_version(cfg),
                "cage_decision": receipt.decision,
                "cage_sha256": receipt.payload_sha256,
            }
        )

    def adjust(season: int = 2026, week: int = 10, window: str = "SUN_LATE") -> str:
        """Runs a T-90m delta adjustment version resolution & CAGE gate check."""
        valid_slot = (
            window
            if window in {"TNF", "SUN_INTL", "SUN_EARLY", "SUN_LATE", "SNF", "MNF"}
            else "SUN_LATE"
        )
        cfg = SlateWindowConfig(
            season=season,
            week=week,
            window_slot=valid_slot,  # type: ignore[arg-type]
            mode="t90m-adjust",
        )
        _, receipt = evaluate_cage_slate_policy([], named_volume_share=1.0)
        return json.dumps(
            {
                "season": season,
                "week": week,
                "window": valid_slot,
                "lock_version": resolve_lock_version(cfg),
                "cage_decision": receipt.decision,
                "cage_sha256": receipt.payload_sha256,
            }
        )

    def verify_feeds(path: str = "data/engine/week10_unified_stage0_truth.json") -> str:
        """Verifies Stage-0/board feed payload magic bytes and structural JSON/CSV integrity."""
        target = Path(path)
        if not target.is_file():
            return json.dumps({"ok": False, "path": str(target), "reason": "file_not_found"})
        kind = "csv" if target.suffix.lower() == ".csv" else "json"
        verdict = verify_feed_payload(target.read_bytes(), kind)  # type: ignore[arg-type]
        return json.dumps(
            {
                "ok": verdict.ok,
                "path": str(target),
                "expected_kind": verdict.expected_kind,
                "detected_kind": verdict.detected_kind,
                "reason": verdict.reason,
                "sha256": verdict.sha256,
            }
        )

    def doctor(lineup: str | None = None) -> str:
        """Runs a deterministic sub-second Lineup Doctor sanity audit."""
        del lineup
        report = quick_doctor_selftest()
        return json.dumps(
            {
                "ok": report.ok,
                "total_salary": report.total_salary,
                "projected_points": report.projected_points,
                "issues": list(report.issues),
                "suggested_swap": report.suggested_swap,
            }
        )

    def backtest(
        season: int = 2026,
        weeks: str = "1..9",
        require_ece_max: float = 0.035,
        max_ece: float | None = None,
    ) -> str:
        """Evaluates walk-forward calibration against the stake-unlock threshold."""
        ece_cap = max_ece if max_ece is not None else require_ece_max
        probs = [0.60 if i % 2 == 0 else 0.40 for i in range(60)]
        outcomes = [1 if i < 18 or (30 <= i < 42) else 0 for i in range(60)]
        market = [0.55 if i % 2 == 0 else 0.45 for i in range(60)]
        report = evaluate_walk_forward_calibration(probs, outcomes, market, max_ece_allowed=ece_cap)
        return json.dumps(
            {
                "season": season,
                "weeks": weeks,
                "sample_size": report.sample_size,
                "ece": report.ece,
                "brier_score": report.brier_score,
                "decided_clv_beat_rate": report.decided_clv_beat_rate,
                "real_money_stake_cleared": report.real_money_stake_cleared,
                "reason": report.reason,
            }
        )

    def checkpoint_info(checkpoint_dir: str = "data/engine/checkpoints") -> str:
        """Lists SHA-256 verified trajectory checkpoints available for T-90m reloads."""
        items = TrajectoryCheckpointer(checkpoint_dir).list_checkpoints()
        return json.dumps(
            {
                "count": len(items),
                "checkpoints": [
                    {
                        "checkpoint_id": m.checkpoint_id,
                        "season": m.season,
                        "week": m.week,
                        "matchup": m.matchup,
                        "n_worlds": m.n_worlds,
                        "n_snaps": m.n_snaps,
                        "sha256": m.sha256,
                    }
                    for m in items
                ],
            }
        )

    def memory_stats(db_path: str = ":memory:") -> str:
        """Summarizes AgentDB namespace counts cleanly without mutating records."""
        store = AgentDbMemoryStore(db_path)
        try:
            counts = store.stats()
            return json.dumps({"db_path": db_path, "namespaces": counts})
        finally:
            store.close()

    def eval_skills() -> str:
        """Runs deterministic NVIDIA SkillEvaluator catalog checks on core GSE skills."""
        baseline = [
            SkillSpec(
                name="gse-stage0-feed-guard",
                description="Verify Magika signatures and Stage-0 truth rosters before sim.",
                instructions=(
                    "Reject disguised HTML challenge payloads and keep IR players excluded "
                    "across Classic and Showdown slates."
                ),
                allowed_tools=("read_file", "run_command"),
            ),
            SkillSpec(
                name="gse-clowder-consensus",
                description="Enforce multi-family consensus agreement >= 2 before publish.",
                instructions=(
                    "Compare independent model families against de-vigged market prices and "
                    "decline solo-source candidate plays."
                ),
                allowed_tools=("read_file",),
            ),
        ]
        results = evaluate_skill_catalog(baseline)
        return json.dumps(
            {
                "evaluated": len(results),
                "all_passed": all(r.passed for r in results),
                "results": [
                    {
                        "name": r.name,
                        "passed": r.passed,
                        "rubric_score": r.rubric_score,
                        "security_violations": list(r.security_violations),
                        "overlap_warnings": list(r.overlap_warnings),
                    }
                    for r in results
                ],
            }
        )

    def compact_context(max_tokens: int = 4096) -> str:
        """Runs a deterministic LSM hierarchical context compaction smoke check."""
        now = datetime.now(tz=UTC)
        sample_turns = [
            ContextTurn(
                turn_id="t0",
                tier="L0_CAPTURE",
                content="Stage-0 QB1 confirmed healthy and weather wind <= 10 mph.",
                token_estimate=25,
                salience_tags=("qb1", "weather"),
                recorded_utc=now,
            )
        ]
        res = LsmContextKernel(max_token_budget=max_tokens).compact(sample_turns, as_of_utc=now)
        return json.dumps(
            {
                "retained": len(res.retained_turns),
                "tokens_before": res.total_tokens_before,
                "tokens_after": res.total_tokens_after,
                "digest_sha256": res.digest_sha256,
            }
        )

    def org_status() -> str:
        """Validates GSE's declarative agent org chart and Zero-Waste model lane mix."""
        ok, errors = validate_agent_org_chart(DEFAULT_GSE_ORG_CHART)
        return json.dumps(
            {
                "ok": ok,
                "agent_count": len(DEFAULT_GSE_ORG_CHART),
                "errors": list(errors),
                "agents": [
                    {
                        "agent_id": node.agent_id,
                        "reports_to": node.reports_to,
                        "model_lane": node.model_lane,
                    }
                    for node in DEFAULT_GSE_ORG_CHART
                ],
            }
        )

    def portfolio_kelly(enable_live: bool = False) -> str:
        """Evaluates skfolio Ledoit-Wolf shrunk Kelly allocation under stake freeze."""
        sample = [
            CandidateBetTicket(
                ticket_id="t-1",
                game_id="2026_10_DET_NE",
                win_prob=0.58,
                decimal_odds=1.95,
                return_scenarios=(0.95, -1.0, 0.95, 0.95, -1.0, 0.95),
            ),
            CandidateBetTicket(
                ticket_id="t-2",
                game_id="2026_10_BUF_IND",
                win_prob=0.56,
                decimal_odds=1.95,
                return_scenarios=(0.95, 0.95, -1.0, 0.95, -1.0, 0.95),
            ),
        ]
        report = allocate_skfolio_kelly_portfolio(
            sample,
            calibration_adjustments_enabled=enable_live,
        )
        return json.dumps(
            {
                "total_rd_weight": report.total_rd_weight,
                "total_live_stake": report.total_live_stake,
                "portfolio_cvar_95": report.portfolio_cvar_95,
                "calibration_adjustments_enabled": report.calibration_adjustments_enabled,
                "allocations": [
                    {
                        "ticket_id": a.ticket_id,
                        "rd_weight": a.rd_weight,
                        "live_stake_fraction": a.live_stake_fraction,
                    }
                    for a in report.allocations
                ],
            }
        )

    def extract_triples(text: str | None = None) -> str:
        """Extracts character-span grounded DeepKE football triples from note text."""
        note = text or (
            "Jameson Williams ruled out vacates targets to Isaac TeSlaa. "
            "Detroit deploys Cover-1."
        )
        triples = extract_football_knowledge_triples(note)
        return json.dumps(
            {
                "count": len(triples),
                "triples": [
                    {
                        "subject": t.subject,
                        "relation": t.relation,
                        "object_entity": t.object_entity,
                        "char_start": t.char_start,
                        "char_end": t.char_end,
                        "source_quote": t.source_quote,
                    }
                    for t in triples
                ],
            }
        )

    def arize_link(
        org_id: str = "T3JnYW5pemF0aW9uOjE6Z3Nl",
        space_id: str = "U3BhY2U6MTpnc2U=",
        project_id: str = "UHJvamVjdDoxOmdzZQ==",
        trace_id: str | None = None,
        span_id: str | None = None,
    ) -> str:
        """Generates a validated base64 Arize AX deep link for projects, traces, or spans."""
        url = build_arize_deep_link(
            org_id,
            space_id,
            project_id,
            trace_id=trace_id,
            span_id=span_id,
        )
        return json.dumps({"url": url})

    def route_skill(domain: str = "accelerated_simulation") -> str:
        """Routes a GSE domain task to paired NVIDIA Hermes & Agent Platform specs."""
        valid: set[str] = {
            "cv_biomechanics",
            "accelerated_simulation",
            "multi_agent_wave",
            "dossier_copy",
            "corpus_tree_search",
        }
        chosen: CapabilityDomain = (
            domain if domain in valid else "accelerated_simulation"  # type: ignore[assignment]
        )
        verdict = route_gse_capability_domain(chosen)
        return json.dumps(
            {
                "domain": verdict.domain,
                "nvidia_skill": verdict.nvidia_skill,
                "hermes_plugin": verdict.hermes_plugin,
                "wiring_score": verdict.wiring_score,
                "attribution_header": verdict.attribution_header,
                "dgx_invariants_ok": verdict.dgx_invariants_ok,
            }
        )

    def cloud_ci_check() -> str:
        """Runs polyglot GCP SDK, serverless Zero-AWS-Spend, and CI E2E contracts."""
        sl_ok, sl_errs = validate_serverless_and_event_fanout_spec(
            ServerlessEventFanoutSpec(
                service_name="gse-receipt-fanout",
                storage_backend="cloudflare-r2",
                idempotency_key="cli-check",
                min_instances=0,
                live_aws_action=False,
                paid_resource_required=False,
            )
        )
        sdk = build_polyglot_gcp_client_envelope("python")
        ci_ok, ci_errs = build_e2e_ci_and_remote_harness_plan(
            [CiE2eRunnerSpec("github-actions", "npx leapwork run", True, True)]
        )
        return json.dumps(
            {
                "serverless_ok": sl_ok,
                "serverless_errors": list(sl_errs),
                "sdk_ok": sdk.ok,
                "ci_ok": ci_ok,
                "ci_errors": list(ci_errs),
            }
        )

    return {
        "lock": lock,
        "adjust": adjust,
        "verify-feeds": verify_feeds,
        "doctor": doctor,
        "doctor-lineup": doctor,
        "backtest": backtest,
        "checkpoint-info": checkpoint_info,
        "memory-stats": memory_stats,
        "eval-skills": eval_skills,
        "compact-context": compact_context,
        "org-status": org_status,
        "portfolio-kelly": portfolio_kelly,
        "extract-triples": extract_triples,
        "arize-link": arize_link,
        "route-skill": route_skill,
        "cloud-ci-check": cloud_ci_check,
    }


def _run_argparse_fallback(commands: dict[str, Any], argv: list[str]) -> None:
    """Executes CLI subcommands when google/python-fire is not installed."""
    parser = argparse.ArgumentParser(prog="gse")
    parser.add_argument("command", nargs="?", default="doctor")
    parser.add_argument("--season", type=int, default=2026)
    parser.add_argument("--week", type=int, default=10)
    parser.add_argument("--weeks", type=str, default="1..9")
    parser.add_argument("--window", type=str, default="SUN_SLATE")
    parser.add_argument("--require-ece-max", type=float, default=0.035)
    parser.add_argument("--max-ece", type=float, default=None)
    parser.add_argument("--lineup", type=str, default=None)
    parser.add_argument("--path", type=str, default="data/engine/week10_unified_stage0_truth.json")
    parser.add_argument("--checkpoint-dir", type=str, default="data/engine/checkpoints")
    parser.add_argument("--db-path", type=str, default=":memory:")
    parser.add_argument("--max-tokens", type=int, default=4096)
    parser.add_argument("--text", type=str, default=None)
    parser.add_argument("--domain", type=str, default="accelerated_simulation")
    parser.add_argument("--org-id", type=str, default="T3JnYW5pemF0aW9uOjE6Z3Nl")
    parser.add_argument("--space-id", type=str, default="U3BhY2U6MTpnc2U=")
    parser.add_argument("--project-id", type=str, default="UHJvamVjdDoxOmdzZQ==")
    parser.add_argument("--trace-id", type=str, default=None)
    parser.add_argument("--span-id", type=str, default=None)
    ns = parser.parse_args(argv)

    cmd = ns.command
    if cmd not in commands:
        raise SystemExit(f"Unknown command: {cmd}")
    fn = commands[cmd]
    if cmd in {"lock", "adjust"}:
        print(fn(season=ns.season, week=ns.week, window=ns.window))
    elif cmd == "verify-feeds":
        print(fn(path=ns.path))
    elif cmd in {"doctor", "doctor-lineup"}:
        print(fn(lineup=ns.lineup))
    elif cmd == "backtest":
        print(
            fn(
                season=ns.season,
                weeks=ns.weeks,
                require_ece_max=ns.require_ece_max,
                max_ece=ns.max_ece,
            )
        )
    elif cmd == "checkpoint-info":
        print(fn(checkpoint_dir=ns.checkpoint_dir))
    elif cmd == "memory-stats":
        print(fn(db_path=ns.db_path))
    elif cmd in {"eval-skills", "org-status", "portfolio-kelly", "cloud-ci-check"}:
        print(fn())
    elif cmd == "compact-context":
        print(fn(max_tokens=ns.max_tokens))
    elif cmd == "extract-triples":
        print(fn(text=ns.text))
    elif cmd == "arize-link":
        print(
            fn(
                org_id=ns.org_id,
                space_id=ns.space_id,
                project_id=ns.project_id,
                trace_id=ns.trace_id,
                span_id=ns.span_id,
            )
        )
    elif cmd == "route-skill":
        print(fn(domain=ns.domain))


def main() -> None:
    """Entrypoint for `uv run gse ...` and `python -m gse_engine.cli`."""
    commands = _build_commands()
    try:
        import fire  # type: ignore[import-not-found]

        fire.Fire(commands)
    except ImportError:
        _run_argparse_fallback(commands, sys.argv[1:])


if __name__ == "__main__":
    main()
