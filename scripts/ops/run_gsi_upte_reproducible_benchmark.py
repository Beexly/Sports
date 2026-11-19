"""CLI entrypoint to run and verify the reproducible GSI C++20/Python UPTE benchmark."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[2]


def main(argv: list[str] | None = None) -> int:
    """Run reproducible C++20 embedded + Python dual-use UPTE verification."""
    parser = argparse.ArgumentParser(
        description="Run reproducible GSI C++20 + Dual-Use UPTE benchmark.",
    )
    parser.add_argument(
        "--write-receipt",
        action="store_true",
        help="Write receipt JSON to data/eval.",
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="Verify run invariants and stored receipt parity.",
    )
    args = parser.parse_args(argv)

    root = _repo_root()
    src_dir = str(root / "src")
    if src_dir not in sys.path:
        sys.path.insert(0, src_dir)

    from gse_engine.science.wave51_gsi_upte_benchmark_runner import (
        build_gsi_upte_benchmark_receipt,
    )

    receipt = build_gsi_upte_benchmark_receipt(root)
    receipt_path = (
        root
        / "data"
        / "eval"
        / "gsi_upte_reproducible_benchmark_receipt_2026_11_19.json"
    )

    if args.write_receipt:
        receipt_path.parent.mkdir(parents=True, exist_ok=True)
        receipt_path.write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")
        print(f"[GSI UPTE BENCHMARK] Wrote {receipt_path}")

    if args.check:
        measured = receipt["measured_host_verification"]
        if measured["tests_passed"] != 10 or measured["tests_total"] != 10:
            print(
                "[GSI UPTE BENCHMARK] ERROR: C++20 suite did not pass 10/10",
                file=sys.stderr,
            )
            return 1
        if not measured["sram_under_38400_bytes_budget"]:
            print(
                "[GSI UPTE BENCHMARK] ERROR: Static SRAM exceeded 38,400 B budget",
                file=sys.stderr,
            )
            return 1
        if receipt_path.is_file():
            stored = json.loads(receipt_path.read_text(encoding="utf-8"))
            stored_sha = stored.get("deterministic_core_sha256")
            live_sha = receipt.get("deterministic_core_sha256")
            if stored_sha != live_sha:
                print(
                    "[GSI UPTE BENCHMARK] ERROR: Core hash mismatch: "
                    f"stored={stored_sha} live={live_sha}",
                    file=sys.stderr,
                )
                return 1
        print(
            "[GSI UPTE BENCHMARK] PASS: 10/10 C++20 tests, "
            f"static SRAM={measured['static_sram_bytes_used']} B "
            f"(text={measured['object_text_bytes']} B, "
            f"bss={measured['object_bss_bytes']} B), "
            f"sha256={receipt['deterministic_core_sha256'][:12]}"
        )

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
