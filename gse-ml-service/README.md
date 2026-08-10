# gse-ml-service (research scaffold — not deployed, not integrated)

Python modules implementing five numerical building blocks discussed in prediction-engine
research notes: persistent homology / TDA (`app/models/tda.py`), an ensemble transform
Kalman filter for latent team-strength (`app/models/etkf.py`), a free-energy /
predictive-coding coder (`app/models/free_energy_coder.py`), inverse reinforcement
learning (`app/models/irl.py`), and a tensor-train (MPS) linear layer
(`app/models/mps_layer.py`).

## Status: inert

Nothing in the Next.js app or any worker imports this directory. It has no effect on
production. Specifically still missing, on purpose — none of it has been built yet:

- No FastAPI (or other) service entrypoint (`app/main.py`)
- No `requirements.txt` / dependency pinning
- No `Dockerfile`
- No CI workflow

The CI workflow is the one omission that isn't just "not gotten to yet": this repo's
GitHub Actions runner-minutes were already exhausted once this cycle (see the
`scheduler-liveness` / `traffic-heartbeat` ops modules), which was a direct cause of a
production ingestion outage. Adding a `python-tests.yml` that runs on every push would
compete for the same scarce budget. Don't add one without deciding first whether it runs
on a schedule, on a path filter, or not at all on the shared runner pool.

## What is verified

Every module has a test file under `app/tests/`. `python3 -m pytest app/tests -q` passes
252/252, run directly (not taken on a subagent's self-report) after clearing a stale
`__pycache__` that was masking real behavior with a prior revision's bytecode.

## Before this goes anywhere near production

1. Decide the actual deployment target (Railway/Fly/other) and who owns its cost and
   uptime — there is no "gse-ml-service:8000" running anywhere yet.
2. Write the FastAPI service and pin dependencies.
3. Wire exactly one caller (`packages/prediction-engine/src/ensemble/remote-model-client.ts`
   is the intended shape) and prove the round trip end-to-end against a real request,
   not just unit tests of the math in isolation.
4. Re-run the full calibration story after integration — none of this moves Brier/RES/ECE
   until a caller actually consumes its output.
