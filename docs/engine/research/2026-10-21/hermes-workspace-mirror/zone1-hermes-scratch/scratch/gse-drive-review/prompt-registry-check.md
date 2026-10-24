Task: close the registry tooling gap. Verified finding: NO script generates or validates intelligence/signals/registry.json; `traced` is derived by nothing — all 47 `no` verdicts are inherited from an old survey; the doctrine claims "the registry is regenerated from the current branch HEAD" but no committed tooling backs it, and no schema/validator/CI job exists. Work ONLY inside C:\Users\Garrett\Sports-wt-pick-gate (branch hermes/book-pick-verdict-gate).

Create exactly two files:

1. C:\Users\Garrett\Sports-wt-pick-gate\intelligence\gates\registry_check.py
   - A READ-ONLY validator. It must NEVER write, regenerate, or "fix" registry.json. Fail-closed doctrine: a broken registry refuses; it is never auto-repaired.
   - Usage: python intelligence/gates/registry_check.py [--registry PATH] (default: intelligence/signals/registry.json relative to repo root resolved from the script's location).
   - Expected shape: {"provenance": {...}, "signals": [...]} — 47 signals. Each signal must carry: id, and a per-dimension verdict object with a "verdict" key for at least: wired_state (or wired), traced, weighted, tested, license, gate. First READ the actual file to confirm exact key names — the validator must match the real shape, not an invented one. If the file's shape differs from any assumption, make the validator refuse with a clear message rather than guessing.
   - Output: honest summary — total signals, count of each verdict value per dimension (wired/traced/weighted/tested), provenance commit + generated-at as recorded. Then: exit 0 only if (a) JSON parses, (b) shape matches, (c) signal count is 47, (d) every signal has all required dimensions with a "verdict" key. Otherwise print the exact failures and exit 1.
   - Print a WARN (not a failure) that verdicts are survey-inherited: nothing derives them at HEAD; provenance pin (531b39a43) vs current HEAD is drift the validator reports by running `git rev-parse --short HEAD` if available (best-effort; skip silently if git unavailable).
   - Style: stdlib only (json, argparse, subprocess, sys, pathlib). No third-party deps.

2. C:\Users\Garrett\Sports-wt-pick-gate\intelligence\gates\test_registry_check.py
   - pytest. Build small registry fixtures in tmp_path (3 signals, one missing a dimension, one with count mismatch vs an expected_total parameter if you expose one, one valid). Assert: valid -> exit 0; missing dimension -> exit 1 + named failure; malformed JSON -> exit 1; wrong top-level shape -> exit 1. Import the check module via importlib from its file path (no package needed).

HARD RULES:
- Do NOT run any git write command (no add/commit). `git rev-parse` read-only is fine.
- Do NOT modify intelligence/signals/registry.json or anything outside the two files above.
- The validator must still pass TODAY against the real file: run it and include the real output in your report.

Verify:
  python "C:/Users/Garrett/Sports-wt-pick-gate/intelligence/gates/registry_check.py"
  python -m pytest "C:/Users/Garrett/Sports-wt-pick-gate/intelligence/gates/test_registry_check.py" -q
Then write your report to C:\Users\Garrett\AppData\Local\hermes\scratch\gse-drive-review\registry-check.md with: files created, the real validator output on the live registry, test counts, and the honest limitation (verdicts remain survey-inherited; the validator detects drift and shape breakage, it does not measure signals).
