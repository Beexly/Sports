"""
GSE Calibration Lab — Gradio cockpit over the gsecal core.

Run:
    pip install -r gse-calibration-lab/requirements-lab.txt
    python gse-calibration-lab/app.py

This is an INTERNAL, OFFLINE operator tool. It is not part of the Next.js app,
is not deployed to Vercel, is not customer-facing, and shares no dependency with
the pinned gse-ml-service lock.

Safety posture, enforced in code below:
  * Public tunnelling is never enabled, in any configuration. Binding beyond
    loopback is allowed ONLY with a password (gsecal.serve enforces this and
    raises otherwise), because exposing unpublished calibration numbers is
    exactly the honesty boundary AGENTS.md law 3 protects.
  * No database, no network, no secrets. Input is an operator-supplied export.
  * No bundled sample dataset — every tab starts empty and refuses to guess
    (AGENTS.md law 8).
  * Reads gates; cannot flip one. Floors below production defaults are rejected
    by gsecal.gate.resolve_floors.

MCP: launching with mcp_server=True publishes the four analysis functions as MCP
tools, so a Claude/Hermes session can run the same decomposition the founder
sees in the browser, from the same proven code path, instead of re-deriving
calibration arithmetic ad hoc in a transcript.
"""

from __future__ import annotations

import argparse
import os
import traceback

try:
    import gradio as gr
except ModuleNotFoundError as exc:  # pragma: no cover - environment guard
    raise SystemExit(
        "gradio is not installed.\n"
        "  pip install -r gse-calibration-lab/requirements-lab.txt\n"
        "Note: install into a SEPARATE environment from gse-ml-service, whose "
        "requirements.txt is a hand-audited --no-deps lock that gradio would break."
    ) from exc

from gsecal.bootstrap import bins_occupancy_warning, bootstrap_ece
from gsecal.decomposition import cancellation_from_summaries, decompose_stratified_ece
from gsecal.gate import DEFAULT_FLOORS, LiveMetrics, MurphyTerms, evaluate_eligibility
from gsecal.metrics import brier_decomposition, brier_score, expected_calibration_error
from gsecal.report import (
    render_decomposition,
    render_gate,
    render_interval,
    render_strata_table,
)
from gsecal.samples import group_by, load_text
from gsecal.serve import resolve_launch_config

AUTH_MESSAGE = (
    "GSE Calibration Lab — internal. These figures have not cleared the PROVEN "
    "gate and must not be published."
)

LOAD_HELP = """Paste a CSV or JSON export of **settled** rows.

Required: a probability column and an outcome column (`WIN`/`LOSS`).
`PUSH`/`VOID`/`PENDING` rows are counted and excluded, never silently dropped.

This tool has no demo data and will not invent any."""


def _err(exc: Exception) -> str:
    return f"### ❌ Error\n\n```\n{exc}\n```"


def analyze_overview(
    raw: str, probability_field: str, outcome_field: str, is_percent: bool, bins: int
) -> tuple[str, str]:
    """Compute Brier, ECE, MCE and the Murphy decomposition for settled rows.

    Args:
        raw: CSV or JSON text of settled rows.
        probability_field: Column holding the forecast probability.
        outcome_field: Column holding WIN/LOSS.
        is_percent: True when the probability column is 0-100 rather than 0-1.
        bins: Number of equal-width calibration bins (production uses 10).

    Returns:
        A markdown metrics summary and a load summary.
    """
    try:
        res = load_text(
            raw,
            probability_field=probability_field,
            outcome_field=outcome_field,
            probability_is_percent=is_percent,
            strict=False,
        )
        s = res.samples()
        d = brier_decomposition(s, bins)
        warning = bins_occupancy_warning(s, bins)
        md = [
            "### Metrics (production-parity)",
            "",
            f"- **n** {len(s)}",
            f"- **Brier** `{brier_score(s):.4f}` (floor ≤ {DEFAULT_FLOORS.brier})",
            f"- **ECE** `{expected_calibration_error(s, bins):.4f}` (floor ≤ {DEFAULT_FLOORS.ece})",
            f"- **Murphy REL** `{d.reliability:.4f}` (floor ≤ {DEFAULT_FLOORS.murphy_reliability})",
            f"- **Murphy RES** `{d.resolution:.4f}` · **UNC** `{d.uncertainty:.4f}`",
            f"- **Base rate** `{d.base_rate:.4f}`",
            "",
            "_REL is the only calibration term a map can cut. RES is ranking power and "
            "is the thing that actually has to improve._",
        ]
        if warning:
            md += ["", f"> ⚠️ {warning}"]
        return "\n".join(md), res.summary()
    except Exception as exc:  # noqa: BLE001 - surfaced to the operator verbatim
        return _err(exc), traceback.format_exc(limit=1)


def analyze_stratified(
    raw: str,
    probability_field: str,
    outcome_field: str,
    stratum_field: str,
    is_percent: bool,
    bins: int,
) -> tuple[str, list[list]]:
    """Decompose pooled ECE into per-stratum error and cross-stratum cancellation.

    Answers whether a pooled ECE is flattered by strata erring in opposite
    directions inside the same confidence bin.

    Args:
        raw: CSV or JSON text of settled rows.
        probability_field: Column holding the forecast probability.
        outcome_field: Column holding WIN/LOSS.
        stratum_field: Column to stratify by (model version, sport, book, month).
        is_percent: True when the probability column is 0-100 rather than 0-1.
        bins: Number of equal-width calibration bins.

    Returns:
        A markdown decomposition report and a per-stratum table.
    """
    try:
        res = load_text(
            raw,
            probability_field=probability_field,
            outcome_field=outcome_field,
            strata_fields=[stratum_field],
            probability_is_percent=is_percent,
            strict=False,
        )
        report = decompose_stratified_ece(group_by(res, stratum_field), bins=bins)
        return render_decomposition(report, DEFAULT_FLOORS.ece), render_strata_table(report)
    except Exception as exc:  # noqa: BLE001
        return _err(exc), []


def analyze_summary_cancellation(table: list[list], pooled_ece: float) -> str:
    """Total cancellation from headline per-stratum figures alone.

    Use when only (label, n, ECE) per stratum is to hand. The total is exact;
    per-bin attribution is unavailable without row-level data.

    Args:
        table: Rows of [label, n, ECE].
        pooled_ece: The pooled ECE the gate reads.

    Returns:
        A markdown decomposition report.
    """
    try:
        parsed: list[tuple[str, int, float]] = []
        for row in table or []:
            if row is None or len(row) < 3:
                continue
            label, n, ece = row[0], row[1], row[2]
            if label in (None, "") or n in (None, "") or ece in (None, ""):
                continue
            parsed.append((str(label), int(float(n)), float(ece)))
        if len(parsed) < 2:
            return "Enter at least two strata (label, n, ECE)."
        report = cancellation_from_summaries(parsed, pooled_ece=float(pooled_ece))
        return render_decomposition(report, DEFAULT_FLOORS.ece)
    except Exception as exc:  # noqa: BLE001
        return _err(exc)


def analyze_bootstrap(
    raw: str,
    probability_field: str,
    outcome_field: str,
    is_percent: bool,
    bins: int,
    resamples: int,
    seed: int,
) -> str:
    """Seeded bootstrap confidence interval for ECE.

    Args:
        raw: CSV or JSON text of settled rows.
        probability_field: Column holding the forecast probability.
        outcome_field: Column holding WIN/LOSS.
        is_percent: True when the probability column is 0-100 rather than 0-1.
        bins: Number of equal-width calibration bins.
        resamples: Bootstrap resample count.
        seed: RNG seed; the same seed always reproduces the same interval.

    Returns:
        A markdown interval report including a verdict against the ECE floor.
    """
    try:
        res = load_text(
            raw,
            probability_field=probability_field,
            outcome_field=outcome_field,
            probability_is_percent=is_percent,
            strict=False,
        )
        s = res.samples()
        interval = bootstrap_ece(
            s, bins=bins, resamples=int(resamples), seed=int(seed)
        )
        out = render_interval(interval, DEFAULT_FLOORS.ece)
        warning = bins_occupancy_warning(s, bins)
        if warning:
            out += f"\n\n> ⚠️ {warning}"
        return out
    except Exception as exc:  # noqa: BLE001
        return _err(exc)


def analyze_gate(
    n: int,
    brier: float,
    ece: float,
    murphy_reliability: float,
    canonical_settled: int,
    min_settled: int,
    settlement_healthy: bool,
    prior_streak: int,
    streak_required: int,
) -> str:
    """Evaluate the production calibration eligibility gate on given metrics.

    A proven mirror of apps/web/lib/ops/calibration-eligibility.ts, reason
    strings included. Read-only: it cannot publish, promote, or flip anything,
    and floors looser than production defaults are rejected.

    Args:
        n: Live calibration map sample size.
        brier: Brier score.
        ece: Expected calibration error.
        murphy_reliability: Murphy REL term.
        canonical_settled: Canonical settled pick count.
        min_settled: Minimum settled required for learning.
        settlement_healthy: Whether settlement health checks pass.
        prior_streak: Consecutive GREEN runs before this evaluation.
        streak_required: Required consecutive GREEN runs.

    Returns:
        A markdown eligibility report.
    """
    try:
        report = evaluate_eligibility(
            metrics=LiveMetrics(
                n=int(n),
                brier=float(brier),
                ece=float(ece),
                mce=None,
                murphy=MurphyTerms(
                    reliability=float(murphy_reliability), resolution=0.0, uncertainty=0.0
                ),
            ),
            canonical_settled=int(canonical_settled),
            min_settled_for_learning=int(min_settled),
            settlement_healthy=bool(settlement_healthy),
            consecutive_green_prior=int(prior_streak),
            streak_required=int(streak_required),
        )
        return render_gate(report)
    except Exception as exc:  # noqa: BLE001
        return _err(exc)


def build_demo() -> "gr.Blocks":
    with gr.Blocks(title="GSE Calibration Lab", fill_width=True) as demo:
        gr.Markdown(
            "# GSE Calibration Lab\n"
            "Internal, offline calibration analysis. Metrics are a **parity-proven** "
            "port of the production TypeScript — see `parity/`. No database, no "
            "network, no sample data, and no gate can be flipped from here."
        )

        with gr.Row():
            probability_field = gr.Textbox(
                value="probability", label="Probability column", scale=1
            )
            outcome_field = gr.Textbox(value="result", label="Outcome column", scale=1)
            is_percent = gr.Checkbox(value=False, label="Probability is 0-100")
            bins = gr.Slider(2, 20, value=10, step=1, label="Bins (production: 10)")

        raw = gr.Code(label="Settled rows (CSV or JSON)", language=None, lines=10)
        gr.Markdown(LOAD_HELP)

        with gr.Tab("Overview"):
            ov_btn = gr.Button("Compute metrics", variant="primary")
            ov_md = gr.Markdown()
            ov_status = gr.Textbox(label="Load summary", interactive=False)
            ov_btn.click(
                analyze_overview,
                [raw, probability_field, outcome_field, is_percent, bins],
                [ov_md, ov_status],
                api_name="overview",
            )

        with gr.Tab("Stratified ECE"):
            gr.Markdown(
                "Measures how much of a pooled ECE is **cross-stratum cancellation** "
                "rather than genuine calibration. Stratify by model version, sport, "
                "book or month."
            )
            stratum_field = gr.Textbox(value="modelVersion", label="Stratify by column")
            st_btn = gr.Button("Decompose", variant="primary")
            st_md = gr.Markdown()
            st_table = gr.Dataframe(
                headers=["stratum", "n", "share", "ECE", "Δ vs pooled"],
                label="Per-stratum",
                interactive=False,
            )
            st_btn.click(
                analyze_stratified,
                [raw, probability_field, outcome_field, stratum_field, is_percent, bins],
                [st_md, st_table],
                api_name="stratified",
            )

        with gr.Tab("Cancellation from summaries"):
            gr.Markdown(
                "When only headline figures are to hand. Enter `(label, n, ECE)` per "
                "stratum plus the pooled ECE. The **total** is exact; per-bin "
                "attribution needs row-level data.\n\n"
                "Starts empty on purpose — supply figures you have actually measured "
                "or that are recorded in the repo."
            )
            summary_table = gr.Dataframe(
                headers=["stratum", "n", "ECE"],
                datatype=["str", "number", "number"],
                row_count=(4, "dynamic"),
                col_count=(3, "fixed"),
                label="Per-stratum figures",
            )
            pooled_input = gr.Number(value=0.0, label="Pooled ECE", precision=6)
            sum_btn = gr.Button("Compute cancellation", variant="primary")
            sum_md = gr.Markdown()
            sum_btn.click(
                analyze_summary_cancellation,
                [summary_table, pooled_input],
                sum_md,
                api_name="cancellation",
            )

        with gr.Tab("Uncertainty"):
            with gr.Row():
                resamples = gr.Slider(200, 5000, value=2000, step=100, label="Resamples")
                seed = gr.Number(value=20260909, label="Seed", precision=0)
            bs_btn = gr.Button("Bootstrap ECE", variant="primary")
            bs_md = gr.Markdown()
            bs_btn.click(
                analyze_bootstrap,
                [raw, probability_field, outcome_field, is_percent, bins, resamples, seed],
                bs_md,
                api_name="bootstrap",
            )

        with gr.Tab("Gate"):
            gr.Markdown(
                "Production eligibility gate, mirrored exactly. Read-only — floors "
                "looser than production defaults are refused (AGENTS.md law 9)."
            )
            with gr.Row():
                g_n = gr.Number(value=0, label="n", precision=0)
                g_brier = gr.Number(value=0.0, label="Brier", precision=6)
                g_ece = gr.Number(value=0.0, label="ECE", precision=6)
                g_rel = gr.Number(value=0.0, label="Murphy REL", precision=6)
            with gr.Row():
                g_settled = gr.Number(value=0, label="Canonical settled", precision=0)
                g_min = gr.Number(value=100, label="Min settled", precision=0)
                g_prior = gr.Number(value=0, label="Prior streak", precision=0)
                g_req = gr.Number(value=3, label="Streak required", precision=0)
            g_healthy = gr.Checkbox(value=True, label="Settlement healthy")
            g_btn = gr.Button("Evaluate", variant="primary")
            g_md = gr.Markdown()
            g_btn.click(
                analyze_gate,
                [g_n, g_brier, g_ece, g_rel, g_settled, g_min, g_healthy, g_prior, g_req],
                g_md,
                api_name="gate",
            )

    return demo


def main() -> None:
    parser = argparse.ArgumentParser(description="GSE Calibration Lab")
    parser.add_argument("--port", type=int, default=7861)
    parser.add_argument(
        "--host",
        default=None,
        help="Bind address. Defaults to 127.0.0.1 locally, 0.0.0.0 on a managed "
        "host. Any non-loopback bind REQUIRES GSECAL_AUTH_USER/PASS.",
    )
    parser.add_argument(
        "--mcp",
        action="store_true",
        help="Also serve the analysis functions as MCP tools.",
    )
    args = parser.parse_args()

    # Public tunnelling is never enabled, and GRADIO_SHARE is neutralised so it
    # cannot be switched on from the environment behind the operator's back.
    # (tests/test_app_functions.py greps this file to keep that true.)
    os.environ["GRADIO_SHARE"] = "False"

    # Fail-closed: raises rather than serving unpublished numbers to the world.
    config = resolve_launch_config(host=args.host, port=args.port)
    print(f"[gsecal] {config.posture}")
    if config.managed_host:
        print(f"[gsecal] managed host detected: {config.managed_host}")

    build_demo().launch(
        server_name=config.server_name,
        server_port=config.server_port,
        auth=config.auth,
        auth_message=AUTH_MESSAGE if config.auth else None,
        share=config.share,
        inbrowser=False,
        show_error=True,
        analytics_enabled=False,
        mcp_server=args.mcp,
    )


if __name__ == "__main__":
    main()
