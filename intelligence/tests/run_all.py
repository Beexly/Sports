#!/usr/bin/env python3
# Master test runner — the final quality gate for the GSE intelligence build.
#
# Provenance: test-orchestration module, c10 Phase 2+ coordinator.
# Executes every module's tests plus the end-to-end suite, then writes a
# scoreboard to tests/last-run-report.md. Exit 0 ONLY when every test passes;
# a missing module is a FAIL (MISSING), never a skip.

import os
import sys
import time

BUILD_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BUILD_ROOT)
sys.path.insert(0, os.path.join(BUILD_ROOT, "tests"))

import pytest  # noqa: E402

REPORT_PATH = os.path.join(BUILD_ROOT, "tests", "last-run-report.md")
MISSING_MARKER = "MODULE MISSING"


class Scoreboard:
    def __init__(self):
        self.rows = []  # (nodeid, module, outcome, detail)

    def _module_of(self, nodeid):
        # nodeid like "ratings/tests/test_ratings.py::TestX::test_y"
        # or "tests/e2e/test_reasoning_trace_e2e.py::test_t1..."
        head = nodeid.split("::")[0]
        parts = head.split("/")
        if parts[0] == "tests":
            return "tests/e2e" if len(parts) > 2 and parts[1] == "e2e" else "tests"
        return parts[0]

    def pytest_collectreport(self, report):
        # Collection errors arrive here (not via pytest_runtest_logreport).
        # Record the broken file as FAIL so it is visible, never silent.
        if report.failed:
            nodeid = report.nodeid
            self.rows.append((nodeid, self._module_of(nodeid), "FAIL",
                              self._first_error_line(str(report.longrepr))))

    def pytest_runtest_logreport(self, report):
        if report.when == "collect":
            # Defensive: some pytest versions route collection errors here.
            if report.failed:
                nodeid = report.nodeid
                self.rows.append((nodeid, self._module_of(nodeid), "FAIL",
                                  self._first_error_line(str(report.longrepr))))
            return
        if report.when == "setup" and not report.failed:
            return
        if report.when not in ("setup", "call"):
            return
        nodeid = report.nodeid
        module = self._module_of(nodeid)
        if report.passed:
            self.rows.append((nodeid, module, "PASS", ""))
        elif report.skipped:
            self.rows.append((nodeid, module, "SKIP", str(report.wasxfail or "")))
        else:
            text = str(report.longrepr)
            if MISSING_MARKER in text:
                outcome, detail = "MISSING", self._first_missing_line(text)
            else:
                outcome, detail = "FAIL", self._first_error_line(text)
            self.rows.append((nodeid, module, outcome, detail))

    @staticmethod
    def _first_missing_line(text):
        for line in text.splitlines():
            if MISSING_MARKER in line:
                return line.strip()[:200]
        return "module missing"

    @staticmethod
    def _first_error_line(text):
        lines = [l.strip() for l in text.splitlines() if l.strip()]
        # last non-empty line is usually the assertion message
        for line in reversed(lines):
            if line.startswith("E ") or "Error" in line or "assert" in line:
                return line[:200]
        return lines[-1][:200] if lines else "failed"


def write_report(board, elapsed_s):
    modules = {}
    for nodeid, module, outcome, detail in board.rows:
        modules.setdefault(module, []).append((nodeid, outcome, detail))

    total = len(board.rows)
    counts = {"PASS": 0, "FAIL": 0, "MISSING": 0, "SKIP": 0}
    for _, _, outcome, _ in board.rows:
        counts[outcome] = counts.get(outcome, 0) + 1

    all_green = counts["FAIL"] == 0 and counts["MISSING"] == 0

    lines = []
    lines.append("# GSE Intelligence Build — Last Full-Suite Run")
    lines.append("")
    lines.append(f"**Date (UTC):** {time.strftime('%Y-%m-%d %H:%M:%S', time.gmtime())}")
    lines.append(f"**Duration:** {elapsed_s:.1f}s")
    lines.append(f"**Totals:** {total} tests — "
                 f"{counts['PASS']} PASS, {counts['FAIL']} FAIL, "
                 f"{counts['MISSING']} MISSING, {counts['SKIP']} SKIP")
    lines.append(f"**Verdict:** {'ALL GREEN' if all_green else 'NOT GREEN — see failures below'}")
    lines.append("")
    lines.append("## Per-module scoreboard")
    lines.append("")
    lines.append("| Module | PASS | FAIL | MISSING | SKIP |")
    lines.append("|---|---|---|---|---|")
    for module in sorted(modules):
        rows = modules[module]
        c = {"PASS": 0, "FAIL": 0, "MISSING": 0, "SKIP": 0}
        for _, o, _ in rows:
            c[o] = c.get(o, 0) + 1
        lines.append(f"| `{module}` | {c['PASS']} | {c['FAIL']} | {c['MISSING']} | {c['SKIP']} |")
    lines.append("")
    problems = [(n, m, o, d) for n, m, o, d in board.rows if o in ("FAIL", "MISSING")]
    if problems:
        lines.append("## Failures / missing (must fix)")
        lines.append("")
        for nodeid, module, outcome, detail in problems:
            lines.append(f"- **[{outcome}]** `{nodeid}`")
            lines.append(f"  - {detail}")
        lines.append("")
    else:
        lines.append("## No failures. The gate holds.")
        lines.append("")
    with open(REPORT_PATH, "w") as f:
        f.write("\n".join(lines))
    return all_green, counts


def main():
    print("=" * 70)
    print("GSE INTELLIGENCE BUILD — master test run")
    print("=" * 70)
    board = Scoreboard()
    start = time.time()
    rc = pytest.main(
        # --continue-on-collection-errors: one sibling's in-progress/broken
        # test file must not zero out the entire suite (pytest 9 interrupts
        # the whole run on a single collection error by default). The broken
        # file is still recorded as FAIL via the Scoreboard's collect handler.
        [BUILD_ROOT, "-p", "no:cacheprovider", "--tb=short",
         "--continue-on-collection-errors"],
        plugins=[board],
    )
    elapsed = time.time() - start
    all_green, counts = write_report(board, elapsed)

    print()
    print(f"Ran {len(board.rows)} tests in {elapsed:.1f}s: "
          f"{counts['PASS']} PASS, {counts['FAIL']} FAIL, "
          f"{counts['MISSING']} MISSING, {counts['SKIP']} SKIP")
    print(f"Report: tests/last-run-report.md")
    print("VERDICT:", "ALL GREEN" if all_green else "NOT GREEN")
    # Exit 0 only when everything passes AND pytest itself reported no failure.
    sys.exit(0 if (all_green and rc == 0) else 1)


if __name__ == "__main__":
    main()
