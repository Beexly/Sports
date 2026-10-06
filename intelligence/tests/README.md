# GSE Intelligence Build — Test Orchestration

**Provenance:** Built by the c10 Phase 2+ coordinator (tests/final-gate module).
Implements the test contracts from:
- `~/workspace/corpus-intelligence/handoff/reasoning-depth-spec.md` §8 (T1–T7 mandatory assertions) and §10 (definition of done)
- `~/workspace/corpus-intelligence/maps/c10-map.md` (numeric acceptance gates per method)
- `~/workspace/mcp-bridge/bus-mirror/inbox/from-motif/tnf-intelligence-program-2026-10-01.md` (program tracks)

## Layout

```
gse-intelligence-build/
  .venv/                  # test/build virtualenv (pytest 9.1.1, numpy 2.5.3)
  pytest.ini              # discovery config (excludes .venv)
  tests/                  # THIS module: orchestration + end-to-end suite
    run_all.py            # master runner: executes every module's tests + e2e, writes report
    conftest.py           # pytest fixtures / markers
    _harness.py           # shared helpers (require_module, fixtures, scoreboard)
    CONTRACTS.md          # the contracts every module must satisfy (API + numeric gates)
    e2e/
      test_reasoning_trace_e2e.py   # T1–T7 from the reasoning-depth spec
      test_research_gates_e2e.py    # c10 numeric gates as end-to-end contracts
      test_pipeline_integration_e2e.py  # module composition + engine depth-contract
    last-run-report.md    # written by run_all.py (latest full-suite result)
  <module>/               # one dir per intelligence module (ratings, staking, trust, qb, ...)
    __init__.py
    <code>.py             # every file carries a provenance header naming its research
    tests/
      test_<module>.py    # auto-discovered by the master runner
```

## Running

```bash
cd ~/workspace/gse-intelligence-build
.venv/bin/python tests/run_all.py          # full suite + scoreboard + last-run-report.md
.venv/bin/python -m pytest tests/e2e -x -q  # e2e only
.venv/bin/python -m pytest <module>/tests -q  # one module only
```

## Rules for module builders

1. **Provenance header** on every file: name the research (corpus file / arXiv id / brief) it implements.
2. **Never inflate.** Tests assert exact numbers from the research, never rounded-up claims.
3. **No vacuous tests.** A test that recomputes the implementation's own formula is rejected — pin expected values via independent derivation or the research's published numbers (see c10 map §2.15 fail-closed leak-wall discipline).
4. **Determinism.** Seed every RNG; tests must pass on re-run.
5. **Pure Python + numpy.** pandas is broken in this env (binary incompatibility); do not depend on it.
6. A missing module is a **FAIL (MISSING)**, not a skip. The scoreboard says exactly what's absent.
