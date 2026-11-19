"""Reproducible C++20 Embedded Kernel & Dual-Use UPTE Benchmark Runner (Wave 51).

Compiles `packages/galaxy-conformal-ot/embedded/` cleanly inside an isolated temporary
directory (leaving zero binary artifacts in the repository), executes all 10 bare-metal
tests, measures compiled object `.text`/`.data`/`.bss` size and static SRAM footprint,
and verifies mathematical Rough-Path, Barber ESS, and FWL invariants alongside explicit
separation between verified host measurements and Phase I HIL/eICU targets.
"""

from __future__ import annotations

import hashlib
import importlib.util
import json
import math
import re
import shutil
import subprocess
import sys
import tempfile
from dataclasses import dataclass
from pathlib import Path
from types import ModuleType
from typing import Any

import numpy as np


@dataclass(frozen=True)
class EmbeddedCompilationMetrics:
    """Measured C++20 static memory and execution verification from real compiler output."""

    compiler: str
    flags: tuple[str, ...]
    text_bytes: int
    data_bytes: int
    bss_bytes: int
    total_object_bytes: int
    tests_passed: int
    tests_total: int
    static_sram_bytes_used: int
    static_sram_bytes_total: int
    sram_utilization_pct: float
    host_latency_us_per_frame: float
    host_cycles_per_frame: int


def default_repo_root() -> Path:
    """Return the repository root three levels above this module."""
    return Path(__file__).resolve().parents[3]


def _load_dual_use_kernel(repo_root: Path) -> ModuleType:
    module_name = "gse_gsi_dual_use_phase_transition_kernel_bench_w51"
    existing = sys.modules.get(module_name)
    if existing is not None:
        return existing
    kernel_path = (
        repo_root
        / "intelligence"
        / "week10_engines_2026_11_13"
        / "GSE-GSI-Dual-Use-TBI-and-Phase-Transition-Engine-2026-11-13"
        / "gsi_gse_dual_use_phase_transition_and_tbi_kernel.py"
    )
    spec = importlib.util.spec_from_file_location(module_name, kernel_path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Could not resolve dual-use kernel at {kernel_path}")
    mod = importlib.util.module_from_spec(spec)
    sys.modules[module_name] = mod
    spec.loader.exec_module(mod)
    return mod


def _parse_size_output(size_stdout: str) -> tuple[int, int, int, int]:
    text_sum = 0
    data_sum = 0
    bss_sum = 0
    dec_sum = 0
    matched_rows = 0
    for line in size_stdout.splitlines():
        parts = line.strip().split()
        is_row = (
            len(parts) >= 6
            and parts[0].isdigit()
            and parts[1].isdigit()
            and parts[2].isdigit()
            and parts[3].isdigit()
        )
        if is_row:
            text_sum += int(parts[0])
            data_sum += int(parts[1])
            bss_sum += int(parts[2])
            dec_sum += int(parts[3])
            matched_rows += 1
    if matched_rows == 0:
        raise RuntimeError(f"Unexpected `size` output:\n{size_stdout}")
    return text_sum, data_sum, bss_sum, dec_sum


def run_cpp20_embedded_suite(repo_root: Path) -> EmbeddedCompilationMetrics:
    """Compile and run `packages/galaxy-conformal-ot/embedded` tests in a temp directory."""
    cxx = shutil.which("g++") or shutil.which("clang++")
    if cxx is None:
        raise FileNotFoundError("No C++20 compiler (g++ or clang++) found on PATH")
    size_bin = shutil.which("size")
    emb_dir = repo_root / "packages" / "galaxy-conformal-ot" / "embedded"
    if not emb_dir.is_dir():
        raise FileNotFoundError(f"Embedded kernel directory missing: {emb_dir}")

    flags = (
        "-std=c++20",
        "-Wall",
        "-Wextra",
        "-O3",
        "-fno-exceptions",
        "-fno-rtti",
        "-ffast-math",
    )

    with tempfile.TemporaryDirectory(prefix="gsi_cpp20_w51_") as tmpdir:
        tmp = Path(tmpdir)
        braid_o = tmp / "braid.o"
        waveguide_o = tmp / "waveguide.o"
        exe_name = (
            "embedded_kernel_tests.exe"
            if sys.platform.startswith("win")
            else "embedded_kernel_tests"
        )
        exe_path = tmp / exe_name

        for src_name, obj_path in (
            ("gsi_embedded_braid_kernel.cpp", braid_o),
            ("gsi_cte_viscoelastic_waveguide_kernel.cpp", waveguide_o),
        ):
            cmd = [
                cxx,
                *flags,
                f"-I{emb_dir}",
                "-c",
                str(emb_dir / src_name),
                "-o",
                str(obj_path),
            ]
            comp = subprocess.run(cmd, capture_output=True, text=True, check=False)
            if comp.returncode != 0:
                raise RuntimeError(f"Failed compiling {src_name}:\n{comp.stderr}")

        if size_bin is not None:
            sz = subprocess.run(
                [size_bin, str(braid_o), str(waveguide_o)],
                capture_output=True,
                text=True,
                check=False,
            )
            if sz.returncode != 0:
                raise RuntimeError(f"`size` failed:\n{sz.stderr}")
            text_b, data_b, bss_b, dec_b = _parse_size_output(sz.stdout)
        else:
            raw_bytes = braid_o.stat().st_size + waveguide_o.stat().st_size
            text_b, data_b, bss_b, dec_b = raw_bytes, 0, 0, raw_bytes

        link = subprocess.run(
            [
                cxx,
                *flags,
                f"-I{emb_dir}",
                str(emb_dir / "tests" / "embedded_kernel_tests.cpp"),
                str(braid_o),
                str(waveguide_o),
                "-o",
                str(exe_path),
            ],
            capture_output=True,
            text=True,
            check=False,
        )
        if link.returncode != 0:
            raise RuntimeError(f"Failed linking embedded_kernel_tests:\n{link.stderr}")

        run_res = subprocess.run([str(exe_path)], capture_output=True, text=True, check=False)
        if run_res.returncode != 0:
            raise RuntimeError(
                f"embedded_kernel_tests failed (rc={run_res.returncode}):\n"
                f"{run_res.stdout}\n{run_res.stderr}"
            )

    stdout = run_res.stdout
    passed_count = len(re.findall(r"\[TEST\s+\d+\][^\n]*PASSED", stdout))
    if passed_count != 10:
        raise RuntimeError(f"Expected 10 passed C++20 tests, got {passed_count}:\n{stdout}")

    sram_pattern = (
        r"SRAM used:\s*(\d+)\s*/\s*(\d+)\s*bytes\s*\[([0-9.]+)%\],\s*"
        r"Latency:\s*([0-9.]+)\s*us/frame,\s*Cycles:\s*(\d+)\s*cycles/frame"
    )
    m_sram = re.search(sram_pattern, stdout)
    if m_sram is None:
        raise RuntimeError(f"Could not parse TEST 10 telemetry line from output:\n{stdout}")

    return EmbeddedCompilationMetrics(
        compiler=Path(cxx).name,
        flags=flags,
        text_bytes=text_b,
        data_bytes=data_b,
        bss_bytes=bss_b,
        total_object_bytes=dec_b,
        tests_passed=passed_count,
        tests_total=10,
        static_sram_bytes_used=int(m_sram.group(1)),
        static_sram_bytes_total=int(m_sram.group(2)),
        sram_utilization_pct=float(m_sram.group(3)),
        host_latency_us_per_frame=float(m_sram.group(4)),
        host_cycles_per_frame=int(m_sram.group(5)),
    )


def run_dual_use_python_invariants(repo_root: Path) -> dict[str, Any]:
    """Verify Rough-Path time-warp invariance, Barber ESS circuit breaker, and FWL deconfounding."""
    mod = _load_dual_use_kernel(repo_root)

    theta_lin = np.linspace(0.0, 2.0 * math.pi, 180)
    tau = np.linspace(0.0, 1.0, 180)
    theta_warp = 2.0 * math.pi * (0.4 * tau + 0.6 * (tau**2))
    a_r, b_r = 2.2, 1.4
    p_lin = np.column_stack([a_r * np.cos(theta_lin), b_r * np.sin(theta_lin)])
    p_warp = np.column_stack([a_r * np.cos(theta_warp), b_r * np.sin(theta_warp)])

    sig_lin = mod.RoughPathSignatureExtractor.compute_signature(p_lin)
    sig_warp = mod.RoughPathSignatureExtractor.compute_signature(p_warp)
    time_warp_rel_err = abs(sig_lin.levy_area_12 - sig_warp.levy_area_12) / max(
        abs(sig_lin.levy_area_12),
        1e-12,
    )

    sepsis = mod.GSISepsisInterventionKernel()
    scores = np.linspace(0.05, 0.35, 30)
    uniform_w = np.ones(30, dtype=np.float64)
    shifted_w = np.array([0.99] + [0.01 / 29.0] * 29, dtype=np.float64)
    res_ok = sepsis.barber_weighted_conformal_gate(
        scores,
        uniform_w,
        point_prediction=0.5,
        reference_n=30,
    )
    res_shift = sepsis.barber_weighted_conformal_gate(
        scores,
        shifted_w,
        point_prediction=0.5,
        reference_n=30,
    )
    if not res_ok.gate_passed or res_shift.gate_passed:
        raise RuntimeError("Barber ESS circuit breaker invariant failed during benchmark run")

    rng = np.random.default_rng(20261119)
    n_obs = 400
    conf_z = rng.normal(0.0, 1.0, size=(n_obs, 2))
    treat_d = 1.8 * conf_z[:, 0] - 0.9 * conf_z[:, 1] + rng.normal(0.0, 0.5, size=n_obs)
    out_y = (
        0.25 * treat_d
        + 2.4 * conf_z[:, 0]
        - 1.1 * conf_z[:, 1]
        + rng.normal(0.0, 0.05, size=n_obs)
    )
    fwl_res = sepsis.fwl_propensity_residualization(out_y, treat_d, conf_z)
    if abs(fwl_res.tau_hat - 0.25) > 0.03:
        raise RuntimeError(f"FWL residualization tau_hat drifted from 0.25: {fwl_res.tau_hat}")

    return {
        "rough_path_levy_area_expected_ellipse": round(math.pi * a_r * b_r, 6),
        "rough_path_levy_area_measured": round(float(sig_lin.levy_area_12), 6),
        "rough_path_nonlinear_warp_rel_err": float(f"{time_warp_rel_err:.8f}"),
        "barber_ess_pass_c_hat": float(res_ok.c_hat),
        "barber_ess_abstain_c_hat": float(res_shift.c_hat),
        "barber_ess_abstain_reason": str(res_shift.abstain_reason),
        "fwl_true_tau": 0.25,
        "fwl_recovered_tau_hat": float(fwl_res.tau_hat),
        "fwl_naive_biased_beta": float(fwl_res.naive_unadjusted_beta),
    }


def build_gsi_upte_benchmark_receipt(repo_root: Path | None = None) -> dict[str, Any]:
    """Run C++20 embedded + Python dual-use invariants and assemble verifiable JSON receipt."""
    root = repo_root if repo_root is not None else default_repo_root()
    cpp_metrics = run_cpp20_embedded_suite(root)
    py_metrics = run_dual_use_python_invariants(root)

    deterministic_core = {
        "schema": "gsi.upte.reproducible_benchmark_receipt.v1",
        "static_sram_bytes_used": cpp_metrics.static_sram_bytes_used,
        "static_sram_bytes_total": cpp_metrics.static_sram_bytes_total,
        "sram_under_38400_bytes_budget": cpp_metrics.static_sram_bytes_used <= 38400,
        "cpp20_tests_passed": cpp_metrics.tests_passed,
        "cpp20_tests_total": cpp_metrics.tests_total,
        "python_invariants": py_metrics,
    }
    deterministic_sha256 = hashlib.sha256(
        json.dumps(deterministic_core, sort_keys=True, separators=(",", ":")).encode("utf-8")
    ).hexdigest()

    return {
        "schema": "gsi.upte.reproducible_benchmark_receipt.v1",
        "generated_by": "scripts/ops/run_gsi_upte_reproducible_benchmark.py",
        "deterministic_core_sha256": deterministic_sha256,
        "measured_host_verification": {
            "compiler": cpp_metrics.compiler,
            "flags": list(cpp_metrics.flags),
            "object_text_bytes": cpp_metrics.text_bytes,
            "object_data_bytes": cpp_metrics.data_bytes,
            "object_bss_bytes": cpp_metrics.bss_bytes,
            "object_total_bytes": cpp_metrics.total_object_bytes,
            "tests_passed": cpp_metrics.tests_passed,
            "tests_total": cpp_metrics.tests_total,
            "static_sram_bytes_used": cpp_metrics.static_sram_bytes_used,
            "static_sram_bytes_total": cpp_metrics.static_sram_bytes_total,
            "sram_utilization_pct": cpp_metrics.sram_utilization_pct,
            "sram_under_38400_bytes_budget": cpp_metrics.static_sram_bytes_used <= 38400,
            "host_latency_us_per_frame": cpp_metrics.host_latency_us_per_frame,
            "host_cycles_per_frame": cpp_metrics.host_cycles_per_frame,
            "python_dual_use_invariants": py_metrics,
        },
        "retrospective_mimic_iv_quarantined_baseline": {
            "cohort_stays": "138-140",
            "full_stay_auc": 0.8545,
            "early_24h_auc": 0.8387,
            "early_12h_auc": 0.8118,
            "empirical_time_warp_drift_pct": 0.212,
            "status": "RETROSPECTIVE_RESEARCH_ONLY_NOT_PROSPECTIVE_CLINICAL_CLEARANCE",
        },
        "phase1_hardware_and_clinical_targets": {
            "target_mcu": "STM32H743 (ARM Cortex-M7)",
            "static_sram_budget_bytes": 38400,
            "target_hil_latency_ms": 2.0,
            "target_power_mw": 45.0,
            "target_multi_site_sepsis_lead_hours": "6.5-7.08",
            "status": "PHASE_1_PROPOSED_TARGET_PENDING_HIL_AND_EXTERNAL_IRB",
        },
    }
