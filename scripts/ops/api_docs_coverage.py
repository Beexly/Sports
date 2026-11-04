"""Audit OpenAPI documentation coverage across the Next.js route surface.

Why this exists: the repo has 218 API routes but only ~8 documented paths —
three hand-written spec builders (`lib/proof/openapi-spec.ts`,
`lib/api/v1/openapi.ts`, the inline `/api/v1/openapi` route). Nothing measures
the gap, so "we have OpenAPI" reads as true while 96% of the surface is
undocumented.

This derives ground truth from the code rather than from anyone's memory:

  * routes   = every `apps/web/app/api/**/route.ts`, path from the filesystem
               (`[param]` -> `{param}`), methods from the exported handlers
  * documented = path keys found in the spec builders' `paths` objects

It reports coverage per top-level area, lists undocumented routes grouped so
the output is actionable, and exits non-zero under `--fail-under` so it can
gate CI. It does NOT invent descriptions or schemas — an inferred schema would
be worse than an honest absence.

Usage:
    python scripts/ops/api_docs_coverage.py
    python scripts/ops/api_docs_coverage.py --json out.json
    python scripts/ops/api_docs_coverage.py --fail-under 0.25
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
API_ROOT = REPO / "apps" / "web" / "app" / "api"
WEB = REPO / "apps" / "web"

# Files that declare OpenAPI `paths`. Route files are excluded: they *serve* a
# spec, they do not declare one.
SPEC_FILES = [
    WEB / "lib" / "proof" / "openapi-spec.ts",
    WEB / "lib" / "api" / "v1" / "openapi.ts",
    WEB / "lib" / "api-v1" / "openapi.ts",
    WEB / "app" / "api" / "v1" / "openapi" / "route.ts",
]

HTTP_METHODS = ("GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS")

_METHODS_ALT = "|".join(HTTP_METHODS)
# Handlers are exported in several shapes; all must be counted or the audit
# silently under-reports the surface:
#   export async function GET()
#   export const GET = ...
#   export const { GET, POST } = handlers      <- NextAuth destructure
#   export { GET, POST }
_METHOD_RES = [
    re.compile(r"export\s+(?:async\s+)?(?:function\s+|const\s+|let\s+)"
               r"(%s)\b" % _METHODS_ALT),
    re.compile(r"export\s+const\s*\{([^}]*)\}\s*="),
    re.compile(r"export\s*\{([^}]*)\}"),
]
# `"/api/foo": {` or `'/api/foo': {` inside a paths object.
_PATH_KEY_RE = re.compile(r"""["'](/api/[^"']+)["']\s*:""")


def route_path(route_file: Path) -> str:
    rel = route_file.parent.relative_to(API_ROOT)
    parts = [] if str(rel) == "." else str(rel).replace("\\", "/").split("/")
    segs = [re.sub(r"^\[(\.\.\.)?(.+)\]$", r"{\2}", p) for p in parts]
    return "/api" + ("/" + "/".join(segs) if segs else "")


def scan_routes() -> dict[str, list[str]]:
    routes: dict[str, list[str]] = {}
    if not API_ROOT.exists():
        return routes
    for f in sorted(API_ROOT.rglob("route.ts")):
        text = f.read_text(encoding="utf-8", errors="replace")
        found: set[str] = set()
        for rx in _METHOD_RES:
            for m in rx.finditer(text):
                for tok in re.split(r"[,\s]+", m.group(1)):
                    tok = tok.split(":")[0].strip()
                    if tok in HTTP_METHODS:
                        found.add(tok)
        if found:
            routes[route_path(f)] = sorted(found)
    return routes


def scan_documented() -> dict[str, list[str]]:
    """Return path -> which spec file(s) declare it."""
    found: dict[str, list[str]] = defaultdict(list)
    for spec in SPEC_FILES:
        if not spec.exists():
            continue
        text = spec.read_text(encoding="utf-8", errors="replace")
        for m in _PATH_KEY_RE.finditer(text):
            found[m.group(1)].append(spec.relative_to(REPO).as_posix())
    return dict(found)


def area_of(path: str) -> str:
    segs = path.strip("/").split("/")
    # /api/<area>/... ; /api/v1/<area>/...
    if len(segs) > 2 and segs[1] == "v1" and len(segs) > 3:
        return f"v1/{segs[2]}"
    return segs[1] if len(segs) > 1 else "(root)"


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="OpenAPI coverage audit")
    ap.add_argument("--json", dest="json_out", help="write machine-readable report")
    ap.add_argument("--fail-under", type=float, default=None,
                    help="exit 1 if documented fraction is below this (0..1)")
    ap.add_argument("--quiet", action="store_true", help="summarise only")
    args = ap.parse_args(argv)

    routes = scan_routes()
    documented = scan_documented()

    doc_paths = set(documented)
    # A documented path may be concrete where the route is parameterised.
    def is_doc(p: str) -> bool:
        if p in doc_paths:
            return True
        pattern = "^" + re.sub(r"\{[^}]+\}", "[^/]+", re.escape(p)
                               .replace(r"\{", "{").replace(r"\}", "}")) + "$"
        return any(re.match(pattern, d) for d in doc_paths)

    covered = {p: m for p, m in routes.items() if is_doc(p)}
    missing = {p: m for p, m in routes.items() if not is_doc(p)}
    total, n_cov = len(routes), len(covered)
    frac = (n_cov / total) if total else 0.0

    by_area: dict[str, list[int]] = defaultdict(lambda: [0, 0])
    for p in routes:
        a = area_of(p)
        by_area[a][0] += 1
        if is_doc(p):
            by_area[a][1] += 1

    print(f"API documentation coverage")
    print(f"  routes found      : {total}")
    print(f"  documented        : {n_cov}")
    print(f"  undocumented      : {len(missing)}")
    print(f"  coverage          : {frac * 100:.1f}%")
    print(f"  spec files scanned: {sum(1 for s in SPEC_FILES if s.exists())}"
          f" of {len(SPEC_FILES)}")
    print()

    if not args.quiet:
        print("By area (documented/total):")
        for a, (t, c) in sorted(by_area.items(), key=lambda kv: (-(kv[1][0] - kv[1][1]), kv[0])):
            bar = "#" * c + "." * (t - c)
            print(f"  {a:<22} {c:>3}/{t:<3} [{bar[:40]}]")
        print()
        if missing:
            worst = sorted(by_area.items(), key=lambda kv: -(kv[1][0] - kv[1][1]))[:5]
            print("Largest gaps:")
            for a, (t, c) in worst:
                if t > c:
                    print(f"  {a}: {t - c} undocumented route(s) "
                          f"({', '.join(sorted(r for r in missing if area_of(r) == a))[:100]})")
            print()
        print("Documented paths:")
        for p in sorted(covered):
            print(f"  {p}  [{', '.join(covered[p])}] "
                  f"<- {', '.join(documented.get(p, ['(parameterised match)']))}")

    report = {
        "routes_total": total,
        "routes_documented": len(covered),
        "routes_undocumented": len(missing),
        "coverage_fraction": round(frac, 4),
        "by_area": {a: {"total": t, "documented": c}
                    for a, (t, c) in sorted(by_area.items())},
        "documented": {p: {"methods": covered[p], "spec": documented.get(p, [])}
                       for p in sorted(covered)},
        "undocumented": {p: missing[p] for p in sorted(missing)},
    }
    if args.json_out:
        Path(args.json_out).write_text(json.dumps(report, indent=1), encoding="utf-8")
        print(f"\nwrote {args.json_out}")

    if args.fail_under is not None and frac < args.fail_under:
        print(f"\nFAIL: coverage {frac:.1%} < required {args.fail_under:.1%}",
              file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
