"""
Zero-install CLI. `python3 -m gsecal ...` — no pip, no venv, no gradio.

The Gradio cockpit is the comfortable way to use this. The CLI is the way that
always works: AGENTS.md law 7 forbids installing packages, so an agent session
or a locked-down box can still run every analysis here, today, with nothing but
the interpreter.

Commands:
    metrics       Brier / ECE / MCE / Murphy on settled rows
    stratify      Pooled-vs-stratum ECE decomposition (cancellation)
    cancellation  Same decomposition from headline (label, n, ECE) figures
    bootstrap     Seeded confidence interval for ECE
    gate          Production eligibility verdict
"""

from __future__ import annotations

import argparse
import sys
from typing import Sequence

from gsecal.bootstrap import bins_occupancy_warning, bootstrap_ece
from gsecal.decomposition import cancellation_from_summaries, decompose_stratified_ece
from gsecal.gate import DEFAULT_FLOORS, LiveMetrics, MurphyTerms, evaluate_eligibility
from gsecal.metrics import brier_decomposition, brier_score, expected_calibration_error
from gsecal.readiness import (
    VersionStratum,
    convergence_path,
    false_green_risk,
    rows_needed_for_floor,
)
from gsecal.report import render_decomposition, render_gate, render_interval
from gsecal.samples import group_by, load_path


def _add_load_args(p: argparse.ArgumentParser) -> None:
    p.add_argument("path", help="CSV or JSON export of settled rows")
    p.add_argument("--probability-field", default="probability")
    p.add_argument("--outcome-field", default="result")
    p.add_argument("--percent", action="store_true", help="probability column is 0-100")
    p.add_argument("--bins", type=int, default=10)


def _load(args, strata: Sequence[str] = ()):
    return load_path(
        args.path,
        probability_field=args.probability_field,
        outcome_field=args.outcome_field,
        strata_fields=list(strata),
        probability_is_percent=args.percent,
        strict=False,
    )


def cmd_metrics(args) -> int:
    res = _load(args)
    s = res.samples()
    d = brier_decomposition(s, args.bins)
    print(res.summary())
    print()
    print(f"n            {len(s)}")
    print(f"Brier        {brier_score(s):.4f}   (floor <= {DEFAULT_FLOORS.brier})")
    print(f"ECE          {expected_calibration_error(s, args.bins):.4f}   (floor <= {DEFAULT_FLOORS.ece})")
    print(f"Murphy REL   {d.reliability:.4f}   (floor <= {DEFAULT_FLOORS.murphy_reliability})")
    print(f"Murphy RES   {d.resolution:.4f}")
    print(f"Murphy UNC   {d.uncertainty:.4f}")
    print(f"Base rate    {d.base_rate:.4f}")
    warning = bins_occupancy_warning(s, args.bins)
    if warning:
        print(f"\n!! {warning}")
    if res.rejected:
        print(f"\n{len(res.rejected)} rejected row(s):")
        for r in res.rejected[:10]:
            print(f"  {r}")
    return 0


def cmd_stratify(args) -> int:
    res = _load(args, strata=[args.by])
    report = decompose_stratified_ece(group_by(res, args.by), bins=args.bins)
    print(render_decomposition(report, DEFAULT_FLOORS.ece))
    return 0 if report.identity_holds else 1


def cmd_cancellation(args) -> int:
    strata: list[tuple[str, int, float]] = []
    for spec in args.stratum:
        try:
            label, n, ece = spec.split(":")
            strata.append((label, int(n), float(ece)))
        except ValueError:
            print(f"bad --stratum {spec!r}; expected label:n:ece", file=sys.stderr)
            return 2
    if len(strata) < 2:
        print("need at least two --stratum entries", file=sys.stderr)
        return 2
    report = cancellation_from_summaries(strata, pooled_ece=args.pooled_ece, bins=args.bins)
    print(render_decomposition(report, DEFAULT_FLOORS.ece))
    return 0


def cmd_bootstrap(args) -> int:
    res = _load(args)
    s = res.samples()
    interval = bootstrap_ece(
        s, bins=args.bins, resamples=args.resamples, level=args.level, seed=args.seed
    )
    print(render_interval(interval, DEFAULT_FLOORS.ece))
    warning = bins_occupancy_warning(s, args.bins)
    if warning:
        print(f"\n!! {warning}")
    return 0


def cmd_gate(args) -> int:
    report = evaluate_eligibility(
        metrics=LiveMetrics(
            n=args.n,
            brier=args.brier,
            ece=args.ece,
            mce=None,
            murphy=MurphyTerms(reliability=args.murphy_rel, resolution=0.0, uncertainty=0.0),
        ),
        canonical_settled=args.canonical_settled,
        min_settled_for_learning=args.min_settled,
        settlement_healthy=not args.settlement_unhealthy,
        consecutive_green_prior=args.prior_streak,
        streak_required=args.streak_required,
    )
    print(render_gate(report))
    return 0 if report.status == "GREEN" else 1


def cmd_readiness(args) -> int:
    """False-GREEN risk + how far the deployed model is from an honest pass."""
    strata = []
    for spec in args.version:
        try:
            label, n, ece = spec.split(":")
            strata.append(
                VersionStratum(
                    label=label,
                    n=int(n),
                    ece=float(ece),
                    deployed=(label == args.deployed),
                )
            )
        except ValueError:
            print(f"bad --version {spec!r}; expected label:n:ece", file=sys.stderr)
            return 2
    if not strata:
        print("need at least one --version", file=sys.stderr)
        return 2
    if args.deployed and not any(s.deployed for s in strata):
        print(f"--deployed {args.deployed!r} matches no --version label", file=sys.stderr)
        return 2

    report = false_green_risk(strata, pooled_ece=args.pooled_ece, floor=args.floor)
    print("=== Gate honesty ===")
    print(report.verdict())
    print()
    print(f"pooled (gate reads)   {report.pooled_ece:.4f}")
    print(f"weighted mean (honest) {report.weighted_mean_ece:.4f}")
    if report.deployed_ece is not None:
        print(f"deployed {report.deployed_label:<12} {report.deployed_ece:.4f}  (n={report.deployed_n})")
    print(f"margin before a false GREEN becomes possible: {report.margin_to_false_green:+.4f}")

    if report.deployed_ece is not None:
        print()
        print("=== Does waiting help? (honest figure as the deployed version accumulates) ===")
        for extra, value in convergence_path(
            strata, deployed_label=report.deployed_label, steps=[0, 100, 250, 500, 1000, 3000]
        ):
            print(f"  +{extra:5d} rows -> {value:.4f}")

        print()
        print("=== Rows needed for the deployed version to clear the floor on its OWN rows ===")
        for future in (args.floor * 2, args.floor * 1.2, args.floor, args.floor * 0.8, args.floor * 0.4):
            result = rows_needed_for_floor(
                current_n=report.deployed_n,
                current_ece=report.deployed_ece,
                assumed_future_ece=future,
                floor=args.floor,
            )
            print(f"  future rows at ECE {future:.4f}: {result}")

    return 1 if report.at_risk else 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="python3 -m gsecal",
        description="GSE calibration analysis — stdlib only, read-only, no network.",
    )
    sub = parser.add_subparsers(dest="command", required=True)

    p = sub.add_parser("metrics", help="Brier / ECE / Murphy on settled rows")
    _add_load_args(p)
    p.set_defaults(func=cmd_metrics)

    p = sub.add_parser("stratify", help="pooled-vs-stratum ECE cancellation")
    _add_load_args(p)
    p.add_argument("--by", required=True, help="column to stratify by")
    p.set_defaults(func=cmd_stratify)

    p = sub.add_parser("cancellation", help="cancellation from headline figures")
    p.add_argument(
        "--stratum",
        action="append",
        required=True,
        metavar="LABEL:N:ECE",
        help="repeatable, e.g. --stratum v5.2.7:245:0.1089",
    )
    p.add_argument("--pooled-ece", type=float, required=True)
    p.add_argument("--bins", type=int, default=10)
    p.set_defaults(func=cmd_cancellation)

    p = sub.add_parser("bootstrap", help="seeded ECE confidence interval")
    _add_load_args(p)
    p.add_argument("--resamples", type=int, default=2000)
    p.add_argument("--level", type=float, default=0.95)
    p.add_argument("--seed", type=int, default=20260909)
    p.set_defaults(func=cmd_bootstrap)

    p = sub.add_parser(
        "readiness",
        help="false-GREEN risk + distance to an honest pass (exit 1 if at risk)",
    )
    p.add_argument(
        "--version",
        action="append",
        required=True,
        metavar="LABEL:N:ECE",
        help="repeatable, e.g. --version v5.2.7:245:0.1089",
    )
    p.add_argument("--deployed", required=True, help="label of the version serving traffic")
    p.add_argument("--pooled-ece", type=float, required=True)
    p.add_argument("--floor", type=float, default=0.05)
    p.set_defaults(func=cmd_readiness)

    p = sub.add_parser("gate", help="production eligibility verdict")
    p.add_argument("--n", type=int, required=True)
    p.add_argument("--brier", type=float, required=True)
    p.add_argument("--ece", type=float, required=True)
    p.add_argument("--murphy-rel", type=float, required=True)
    p.add_argument("--canonical-settled", type=int, required=True)
    p.add_argument("--min-settled", type=int, default=100)
    p.add_argument("--prior-streak", type=int, default=0)
    p.add_argument("--streak-required", type=int, default=3)
    p.add_argument("--settlement-unhealthy", action="store_true")
    p.set_defaults(func=cmd_gate)

    return parser


def main(argv: Sequence[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        return int(args.func(args))
    except (ValueError, FileNotFoundError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
