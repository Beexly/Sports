"""Markdown rendering. Presentation only — no metric is computed in this file."""

from __future__ import annotations

from typing import Sequence

from gsecal.bootstrap import Interval
from gsecal.decomposition import StratifiedECEReport
from gsecal.gate import EligibilityReport

__all__ = ["render_gate", "render_decomposition", "render_interval", "render_strata_table"]


def render_gate(report: EligibilityReport) -> str:
    badge = "🟢 GREEN" if report.status == "GREEN" else "🔴 RED"
    lines = [
        f"### Eligibility: {badge}",
        "",
        f"- **n** {report.n} (floor {report.floors.n})",
        f"- **Brier** {report.brier if report.brier is not None else '—'} (floor ≤ {report.floors.brier})",
        f"- **ECE** {report.ece if report.ece is not None else '—'} (floor ≤ {report.floors.ece})",
    ]
    if report.murphy:
        lines.append(
            f"- **Murphy REL** {report.murphy.reliability} "
            f"(floor ≤ {report.floors.murphy_reliability})"
        )
    lines += [
        f"- **Streak** {report.consecutive_green}/{report.streak_required}",
        "",
        "**Reasons**" if report.reasons else "**Reasons** — none, all floors met.",
    ]
    lines += [f"- {r}" for r in report.reasons]
    lines += ["", f"> {report.operator_hint}"]
    return "\n".join(lines)


def render_strata_table(report: StratifiedECEReport) -> list[list]:
    return [
        [s.name, s.n, f"{s.pct:.1f}%", round(s.ece, 4), round(s.ece - report.pooled_ece, 4)]
        for s in report.worst_strata
    ]


def render_decomposition(report: StratifiedECEReport, floor: float = 0.05) -> str:
    if report.total_n == 0:
        return "No rows."

    lines = [
        "### Stratified ECE decomposition",
        "",
        f"- **Pooled ECE** (what the gate reads) — `{report.pooled_ece:.4f}`",
        f"- **Weighted stratum mean** (the honest figure) — `{report.weighted_stratum_mean_ece:.4f}`",
        f"- **Cancellation** — `{report.total_cancellation:.4f}` "
        f"({report.cancellation_share:.1%} of the honest figure)",
        f"- **n** {report.total_n} across {len(report.strata)} strata, {report.bins} bins",
        "",
        f"**{report.floor_verdict(floor)}**",
        "",
    ]

    if report.pooled_below_every_stratum():
        lines += [
            "> ⚠️ The pooled ECE is lower than **every** stratum it is built from. "
            "That is the signature of signed-error cancellation: strata erring in "
            "opposite directions inside the same bin average toward zero, and ECE's "
            "per-bin absolute value is taken *after* that averaging.",
            "",
        ]

    if report.bin_detail:
        mixed = [b for b in report.bin_detail if b.pooled_count and b.is_mixed_sign]
        lines += [
            "#### Where the cancellation lives",
            "",
            "| bin | n | mass | pooled gap | aligned gap | cancellation | mixed sign |",
            "|---|---|---|---|---|---|---|",
        ]
        for b in report.bin_detail:
            if b.pooled_count == 0:
                continue
            lines.append(
                f"| [{b.lower:.1f},{b.upper:.1f}) | {b.pooled_count} | {b.pooled_mass:.3f} "
                f"| {b.pooled_abs_gap:.4f} | {b.aligned_abs_gap:.4f} "
                f"| {b.cancellation:.4f} | {'yes' if b.is_mixed_sign else 'no'} |"
            )
        lines += [
            "",
            f"{len(mixed)} of {len([b for b in report.bin_detail if b.pooled_count])} "
            "occupied bins contain strata erring in opposite directions.",
            "",
        ]
    else:
        lines += [
            "_Summary mode: totals are exact, but per-bin attribution needs row-level "
            "data._",
            "",
        ]

    lines += [
        "#### Identity check",
        "",
        f"`weighted stratum mean − pooled = Σ_k (n_k/N)·[Σ_s w_s,k|d_s,k| − |Σ_s w_s,k d_s,k|]`",
        "",
        f"residual `{report.identity_residual:.3e}` — "
        + ("✅ holds" if report.identity_holds else "❌ DOES NOT HOLD (strata may overlap)"),
    ]
    return "\n".join(lines)


def render_interval(interval: Interval, floor: float, label: str = "ECE") -> str:
    return "\n".join(
        [
            f"### {label} with uncertainty",
            "",
            f"- **Point** `{interval.point:.4f}`",
            f"- **{interval.level:.0%} interval** `[{interval.low:.4f}, {interval.high:.4f}]` "
            f"(width {interval.width:.4f})",
            f"- **n** {interval.n} · {interval.resamples} resamples · seed {interval.seed}",
            "",
            f"**{interval.verdict(floor)}**",
        ]
    )
