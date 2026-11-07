"""Tests for the OpenAPI coverage auditor.

The bug these lock down: the first version of the scanner counted 217 of 218
routes because it could not see NextAuth's `export const { GET, POST } =
handlers`. An audit that under-reports the surface understates the gap.
"""
from __future__ import annotations

import importlib.util
import re
import sys
from pathlib import Path

import pytest

_SRC = Path(__file__).resolve().parents[1] / "scripts" / "ops" / "api_docs_coverage.py"


@pytest.fixture(scope="module")
def cov():
    spec = importlib.util.spec_from_file_location("api_docs_coverage", _SRC)
    mod = importlib.util.module_from_spec(spec)
    sys.modules["api_docs_coverage"] = mod
    spec.loader.exec_module(mod)
    return mod


def _methods(mod, text: str) -> set[str]:
    found: set[str] = set()
    for rx in mod._METHOD_RES:
        for m in rx.finditer(text):
            for tok in re.split(r"[,\s]+", m.group(1)):
                tok = tok.split(":")[0].strip()
                if tok in mod.HTTP_METHODS:
                    found.add(tok)
    return found


@pytest.mark.parametrize("text,expected", [
    ("export async function GET(req) {}", {"GET"}),
    ("export function POST() {}", {"POST"}),
    ("export const GET = async () => {}", {"GET"}),
    ("export const { GET, POST } = handlers;", {"GET", "POST"}),
    ("export { GET, POST };", {"GET", "POST"}),
    ("export const DELETE = handler; export async function PATCH() {}", {"DELETE", "PATCH"}),
])
def test_method_detection_shapes(cov, text, expected):
    assert _methods(cov, text) == expected


def test_nextauth_destructure_is_detected(cov):
    """The exact shape that made the first audit report 217 instead of 218."""
    src = Path(__file__).resolve().parents[1] / "apps" / "web" / "app" / "api" \
        / "auth" / "[...nextauth]" / "route.ts"
    if not src.exists():
        pytest.skip("nextauth route not present")
    assert _methods(cov, src.read_text(encoding="utf-8")) == {"GET", "POST"}


def test_non_handler_exports_ignored(cov):
    assert _methods(cov, "export const config = { runtime: 'nodejs' }") == set()


@pytest.mark.parametrize("seg,expected", [
    ("[id]", "{id}"),
    ("[pickId]", "{pickId}"),
    ("[...nextauth]", "{nextauth}"),
    ("plain", "plain"),
])
def test_path_segment_normalisation(cov, seg, expected):
    assert re.sub(r"^\[(\.\.\.)?(.+)\]$", r"{\2}", seg) == expected


def test_area_of_groups_v1_separately(cov):
    assert cov.area_of("/api/cron/autonomy-cycle") == "cron"
    assert cov.area_of("/api/v1/signals") == "v1"
    assert cov.area_of("/api") == "(root)"


def test_scan_routes_finds_full_surface(cov):
    routes = cov.scan_routes()
    assert len(routes) >= 218, f"expected >=218 routes, scanned {len(routes)}"
    assert all(v for v in routes.values()), "every route must report >=1 method"


def test_scan_documented_finds_the_known_specs(cov):
    documented = cov.scan_documented()
    assert "/api/proof/ledger" in documented
    assert "/api/proof/receipts" in documented
    assert "/api/v1/signals" in documented
    assert "/api/verify" in documented


def test_documented_are_a_subset_of_real_routes(cov):
    """A spec path that no route serves is a documentation bug."""
    routes = cov.scan_routes()
    for path in cov.scan_documented():
        assert path in routes, f"spec documents {path} but no route serves it"


def test_fail_under_returns_1(cov, tmp_path, monkeypatch, capsys):
    monkeypatch.setattr(cov, "API_ROOT", tmp_path / "absent")
    rc = cov.main(["--fail-under", "0.5", "--quiet"])
    assert rc == 1
    assert "FAIL" in capsys.readouterr().err


def test_no_fail_under_returns_0(cov, capsys):
    assert cov.main(["--quiet"]) == 0
