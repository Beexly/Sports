#!/usr/bin/env python3
"""Verify the 11 canonical Founder Program evidence URLs (offline self-test or --live).

Checks all 11 canonical paths:
  1. /
  2. /llms.txt
  3. /llms-full.txt
  4. /news-sitemap.xml
  5. /sitemap.xml
  6. /record
  7. /media-kit
  8. /case-studies/aws-governed-sports-intelligence
  9. /parlay-mri
 10. /api/health
 11. /api/ops/public-surface-truth

Enforces:
- HTTP 200 OK on every canonical URL
- Response latency within SLA (`--max-latency-ms`, default 3000ms)
- Zero voided Nov 5 batch string (`62-23-1`)
- Normalized ledger integrity: whenever `+81.47u` is printed, the 1u-normalized
  flat -110 equivalent (`+25.82u`) must accompany it
"""

from __future__ import annotations

import argparse
import json
import sys
import time
import urllib.error
import urllib.request
from collections.abc import Mapping
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[2]
for _p in (str(REPO_ROOT / "src"), str(REPO_ROOT)):
    if _p not in sys.path:
        sys.path.insert(0, _p)

CANONICAL_EVIDENCE_PATHS: tuple[str, ...] = (
    "/",
    "/llms.txt",
    "/llms-full.txt",
    "/news-sitemap.xml",
    "/sitemap.xml",
    "/record",
    "/media-kit",
    "/case-studies/aws-governed-sports-intelligence",
    "/parlay-mri",
    "/api/health",
    "/api/ops/public-surface-truth",
)

VOIDED_BATCH_TOKEN = "62" + "-23-1"
WEIGHTED_UNITS_TOKEN = "+81.47u"
NORMALIZED_FLAT_UNITS_TOKEN = "+25.82u"
DEFAULT_MAX_LATENCY_MS = 3000.0


def build_default_offline_mock_responses() -> dict[str, dict[str, Any]]:
    """Build deterministic healthy mock payloads for all 11 canonical evidence URLs."""
    record_banner = (
        "79-46-0 (+81.47u actual | +25.82u 1u-normalized flat -110 | 3.16x weighted) "
        "verified; win rate locked until 200 CLV-backed settled plays (53/200) at /record."
    )
    home_html = (
        f'<html><body><main id="main-content">'
        f"Galaxy Sports Edge | {record_banner}</main></body></html>"
    )
    sitemap_xml = (
        '<?xml version="1.0" encoding="UTF-8"?>'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
        "<url><loc>https://www.galaxysportsedge.com/</loc></url></urlset>"
    )
    news_xml = (
        '<?xml version="1.0" encoding="UTF-8"?>'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>'
    )
    truth_json = json.dumps(
        {
            "ok": True,
            "detail": "public",
            "gates": {"canExposePerformanceStats": False},
        }
    )
    return {
        "/": {
            "status": 200,
            "latency_ms": 42.0,
            "body": home_html,
        },
        "/llms.txt": {
            "status": 200,
            "latency_ms": 18.0,
            "body": (
                f"# Galaxy Sports Edge\n"
                f"Official Settled NFL Record: {record_banner}\nVerify at /record\n"
            ),
        },
        "/llms-full.txt": {
            "status": 200,
            "latency_ms": 22.0,
            "body": (
                f"# Galaxy Sports Edge Extended Reference\n"
                f"Record: {record_banner}\nLink: /record\n"
            ),
        },
        "/news-sitemap.xml": {
            "status": 200,
            "latency_ms": 25.0,
            "body": news_xml,
        },
        "/sitemap.xml": {
            "status": 200,
            "latency_ms": 30.0,
            "body": sitemap_xml,
        },
        "/record": {
            "status": 200,
            "latency_ms": 55.0,
            "body": f"<html><body><h1>The Sealed Record</h1><p>{record_banner}</p></body></html>",
        },
        "/media-kit": {
            "status": 200,
            "latency_ms": 40.0,
            "body": (
                "<html><body><h1>GSE Media Kit</h1>"
                "<p>Evidence-first sponsorships.</p></body></html>"
            ),
        },
        "/case-studies/aws-governed-sports-intelligence": {
            "status": 200,
            "latency_ms": 48.0,
            "body": (
                "<html><body>"
                "<h1>AWS-Governed Sports Intelligence Case Study</h1></body></html>"
            ),
        },
        "/parlay-mri": {
            "status": 200,
            "latency_ms": 52.0,
            "body": (
                "<html><body><h1>Parlay MRI</h1>"
                "<p>Free Same-Game Parlay X-Ray.</p></body></html>"
            ),
        },
        "/api/health": {
            "status": 200,
            "latency_ms": 29.0,
            "body": json.dumps({"ok": True, "status": "healthy", "detail": "public"}),
        },
        "/api/ops/public-surface-truth": {
            "status": 200,
            "latency_ms": 75.0,
            "body": truth_json,
        },
    }


def verify_evidence_responses(
    responses: Mapping[str, Mapping[str, Any]],
    *,
    max_latency_ms: float = DEFAULT_MAX_LATENCY_MS,
) -> dict[str, Any]:
    """Validate all 11 canonical evidence responses against HTTP, SLA, and copy rules."""
    failures: list[str] = []
    results: list[dict[str, Any]] = []

    for path in CANONICAL_EVIDENCE_PATHS:
        entry = responses.get(path)
        if entry is None:
            failures.append(f"{path}: missing response entry")
            results.append({"path": path, "ok": False, "reason": "missing"})
            continue

        status = int(entry.get("status", 0))
        latency_ms = float(entry.get("latency_ms", 0.0))
        body = str(entry.get("body") or "")
        path_failures: list[str] = []

        if status != 200:
            path_failures.append(f"HTTP {status} != 200")
        if latency_ms > max_latency_ms:
            path_failures.append(f"latency {latency_ms:.1f}ms > SLA {max_latency_ms:.1f}ms")
        if not body.strip():
            path_failures.append("empty response body")
        if VOIDED_BATCH_TOKEN in body:
            path_failures.append(f"voided batch token {VOIDED_BATCH_TOKEN} present in copy")
        if WEIGHTED_UNITS_TOKEN in body and NORMALIZED_FLAT_UNITS_TOKEN not in body:
            path_failures.append(
                f"stale un-normalized {WEIGHTED_UNITS_TOKEN} without {NORMALIZED_FLAT_UNITS_TOKEN}"
            )

        if path in ("/api/health", "/api/ops/public-surface-truth") and status == 200:
            try:
                parsed = json.loads(body)
                if not isinstance(parsed, dict) or parsed.get("ok") is not True:
                    path_failures.append("JSON payload missing ok=true")
            except json.JSONDecodeError as exc:
                path_failures.append(f"invalid JSON payload: {exc}")

        if (
            path in ("/sitemap.xml", "/news-sitemap.xml")
            and status == 200
            and "<urlset" not in body
            and "<?xml" not in body
        ):
            path_failures.append("missing XML sitemap root element")

        if (
            path in ("/llms.txt", "/llms-full.txt")
            and status == 200
            and "/record" not in body
        ):
            path_failures.append("missing canonical /record reference")

        if path_failures:
            failures.append(f"{path}: {'; '.join(path_failures)}")
        results.append(
            {
                "path": path,
                "status": status,
                "latency_ms": round(latency_ms, 2),
                "ok": len(path_failures) == 0,
                "failures": path_failures,
            }
        )

    return {
        "checked_count": len(CANONICAL_EVIDENCE_PATHS),
        "passed_count": sum(1 for r in results if r["ok"]),
        "all_passed": len(failures) == 0,
        "failures": failures,
        "results": results,
    }


def run_offline_self_test(*, max_latency_ms: float = DEFAULT_MAX_LATENCY_MS) -> dict[str, Any]:
    """Run deterministic pass + negative control verification in offline mock mode."""
    clean_mocks = build_default_offline_mock_responses()
    clean_report = verify_evidence_responses(clean_mocks, max_latency_ms=max_latency_ms)
    if not clean_report["all_passed"]:
        raise RuntimeError(f"Offline clean check unexpectedly failed: {clean_report['failures']}")

    # Negative control 1: non-200 HTTP failure
    bad_status = dict(clean_mocks)
    bad_status["/api/health"] = {"status": 503, "latency_ms": 20.0, "body": '{"ok":false}'}
    r_status = verify_evidence_responses(bad_status, max_latency_ms=max_latency_ms)
    if r_status["all_passed"]:
        raise RuntimeError("Offline negative control failed: non-200 was not caught")

    # Negative control 2: un-normalized +81.47u without +25.82u
    bad_norm = dict(clean_mocks)
    bad_norm["/llms.txt"] = {"status": 200, "latency_ms": 20.0, "body": "79-46-0 +81.47u /record"}
    r_norm = verify_evidence_responses(bad_norm, max_latency_ms=max_latency_ms)
    if r_norm["all_passed"]:
        raise RuntimeError("Offline negative control failed: un-normalized +81.47u was not caught")

    # Negative control 3: voided 62-23-1 batch
    bad_void = dict(clean_mocks)
    bad_void["/record"] = {
        "status": 200,
        "latency_ms": 20.0,
        "body": f"Banner {VOIDED_BATCH_TOKEN}",
    }
    r_void = verify_evidence_responses(bad_void, max_latency_ms=max_latency_ms)
    if r_void["all_passed"]:
        raise RuntimeError("Offline negative control failed: voided 62-23-1 was not caught")

    return {
        "mode": "offline_self_test",
        "all_passed": True,
        "clean_report": clean_report,
        "negative_controls_caught": {
            "non_200_caught": not r_status["all_passed"],
            "unnormalized_81_47u_caught": not r_norm["all_passed"],
            "voided_62_23_1_caught": not r_void["all_passed"],
        },
    }


def fetch_live_evidence_responses(
    base_url: str,
    *,
    timeout_sec: float = 15.0,
) -> dict[str, dict[str, Any]]:
    """Fetch all 11 canonical evidence URLs over HTTPS/HTTP."""
    base = base_url.rstrip("/")
    collected: dict[str, dict[str, Any]] = {}
    for path in CANONICAL_EVIDENCE_PATHS:
        url = f"{base}{path}"
        req = urllib.request.Request(
            url,
            headers={
                "User-Agent": "GSE-Founder-Evidence-Verifier/1.0",
                "Accept": "application/json, text/plain, application/xml, text/html",
            },
        )
        t0 = time.perf_counter()
        try:
            with urllib.request.urlopen(req, timeout=timeout_sec) as resp:
                status = int(resp.getcode() or 200)
                body = resp.read().decode("utf-8", errors="replace")
        except urllib.error.HTTPError as err:
            status = int(err.code)
            body = err.read().decode("utf-8", errors="replace")
        except Exception as exc:  # noqa: BLE001
            status = 0
            body = f"FETCH_ERROR: {exc}"
        latency_ms = (time.perf_counter() - t0) * 1000.0
        collected[path] = {"status": status, "latency_ms": latency_ms, "body": body}
    return collected


def main(argv: list[str] | None = None) -> int:
    """CLI entrypoint."""
    parser = argparse.ArgumentParser(
        description="Verify the 11 canonical Founder Program evidence URLs."
    )
    parser.add_argument(
        "--live",
        action="store_true",
        help="Fetch live HTTP endpoints instead of running offline mock verification.",
    )
    parser.add_argument(
        "--base-url",
        type=str,
        default="https://www.galaxysportsedge.com",
        help="Target origin for --live mode.",
    )
    parser.add_argument(
        "--max-latency-ms",
        type=float,
        default=DEFAULT_MAX_LATENCY_MS,
        help="Per-URL latency SLA threshold in milliseconds.",
    )
    args = parser.parse_args(argv)

    if args.live:
        responses = fetch_live_evidence_responses(args.base_url)
        report = verify_evidence_responses(responses, max_latency_ms=args.max_latency_ms)
        report["mode"] = "live"
        report["base_url"] = args.base_url
    else:
        report = run_offline_self_test(max_latency_ms=args.max_latency_ms)

    print(json.dumps(report, indent=2))
    return 0 if report["all_passed"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
