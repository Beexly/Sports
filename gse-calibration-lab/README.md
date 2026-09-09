# GSE Calibration Lab

Internal, offline calibration analysis for Galaxy Sports Edge.

**Why this exists.** ECE is the single *binding* floor on the PROVEN gate — the
other three floors (n, Brier, Murphy REL) are recorded as passing, and AGENTS.md
derives that the Brier floor is clearable by a constant base-rate forecast with
no skill at all. So the number gating the product's central claim is one number,
and this repo previously had no way to ask whether that number is load-bearing
or flattered.

It also closes a question the repo names and leaves open:

> `expectedCalibrationError` stores weighted ABSOLUTE per-bin gaps, so these
> numbers do not by themselves demonstrate that signed errors cancelled across
> strata; that is a plausible mechanism, not an observed one, and proving it
> needs an aligned per-bin decomposition **nobody has run**.
> — `AGENTS.md`

`gsecal.decomposition` is that decomposition. See [FINDINGS.md](./FINDINGS.md).

---

## Run it with zero install

The core is **pure standard library**. No pip, no venv, no gradio, no numpy.

```bash
cd gse-calibration-lab

# Metrics on an export of settled rows
python3 -m gsecal metrics rows.csv

# The decomposition: how much of a pooled ECE is cross-stratum cancellation
python3 -m gsecal stratify rows.csv --by modelVersion

# Same, from headline figures when row-level data is not to hand
python3 -m gsecal cancellation \
  --stratum v5.2.7:245:0.1089 --stratum v5.2.6:110:0.0587 \
  --stratum v5.1.0:74:0.0729  --stratum v5.0.0:29:0.1531 \
  --pooled-ece 0.0524

# Seeded, reproducible confidence interval
python3 -m gsecal bootstrap rows.csv --seed 20260909

# Can the gate pass on a model that is not calibrated? (exit 1 if at risk)
python3 -m gsecal readiness --version v5.2.7:245:0.1089 --deployed v5.2.7 --pooled-ece 0.0524

# Does a zero-skill forecaster pass every floor? (exit 1 if it does)
python3 -m gsecal skill --base-rate 0.694 --n 458

# The production eligibility verdict (exit 0 GREEN, 1 RED — scriptable)
python3 -m gsecal gate --n 458 --brier 0.1926 --ece 0.0524 \
  --murphy-rel 0.0053 --canonical-settled 458
```

Tests, also zero-install:

```bash
python3 -m unittest discover -s tests -t .   # 136 tests
```

## Optional: the Gradio cockpit

```bash
python -m venv .venv-cal && . .venv-cal/bin/activate
pip install -r requirements-lab.txt
python app.py            # http://127.0.0.1:7861
python app.py --mcp      # also serve the analyses as MCP tools
```

### Deploying it (Spaces, Kubernetes/LKE, a container host)

See [`space/DEPLOY.md`](./space/DEPLOY.md). The short version: the app is
fail-closed, so it refuses to bind publicly without a password — but **that does
not make a host private**, and Hugging Face Spaces are public by default. A
Space serving this must be created **private** *and* given both credentials as
Space **secrets**.

Prefer the local CLI. It needs no install, no host, no secret and no network,
so there is no attack surface to reason about. Deploy only when more than one
person genuinely needs the cockpit. Nothing here benefits from a GPU — it is
stdlib arithmetic and runs on the smallest node available.

> **Install into a separate environment from `gse-ml-service`.** That service's
> `requirements.txt` is a hand-audited `--no-deps` lock whose entire point is
> that pip resolves nothing. Gradio brings a large transitive tree and its own
> fastapi/starlette pins, which would silently contradict that lock. The two
> must never share an environment. Nothing in `gsecal` needs gradio.

`--mcp` is the leverage: it publishes the same analysis functions as MCP tools,
so a Claude or Hermes session runs the *proven* code path instead of
re-deriving calibration arithmetic inside a transcript, where nobody can check
it afterwards.

---

## Parity: the metrics are proven, not asserted

Every metric is a port of production TypeScript. The port is verified by
transpiling the **real source files** with the repo's own esbuild, running them
over adversarial fixtures, and asserting the Python reproduces their output to
`1e-12`.

```bash
npx tsx parity/gen_vectors.ts        # 15 fixtures x 3 bin counts
npx tsx parity/gen_gate_vectors.ts   # 12 gate cases, reason strings included
python3 -m unittest discover -s tests -t .
```

| Python | mirrors |
|---|---|
| `metrics.brier_score` | `apps/web/lib/calibration/brier.ts` |
| `metrics.confidence_buckets` / `expected_calibration_error` / `maximum_calibration_error` | `apps/web/lib/calibration/ece.ts` |
| `metrics.brier_decomposition` | `packages/prediction-engine/src/probability-calibration.ts` |
| `gate.evaluate_eligibility` | `apps/web/lib/ops/calibration-eligibility.ts` |

Reproduced deliberately, because they change results: the last ECE bucket is
`[lower, upper]` while the rest are `[lower, upper)`; `brierDecomposition`
rounds every term to 4dp *before* the gate compares it to a floor; `p == 1`
lands in the last bin.

If you change `metrics.py`, regenerate the vectors and re-run the parity tests.
A metric that disagrees with production is worse than no metric, because it
produces a number an operator will believe.

---

## What this tool will not do

These are enforced in code and covered by tests, not merely intended.

- **Cannot flip a gate.** `gate.resolve_floors` raises on any floor looser than
  the production default. The lab may tighten a floor; it may never loosen one.
  (AGENTS.md law 9 — a guard may be given narrower context, never less power.)
- **Cannot invent data.** No demo mode, no seeded dataset, no synthetic
  fallback. Empty or missing input raises. A mistyped stratum column raises,
  because a single-stratum run always reports `cancellation 0.0000` and that is
  indistinguishable from a real finding of no cancellation. (Law 8.)
- **Cannot reach a database or the network.** Input is an operator-supplied
  export. (Law 7.)
- **Cannot publish by accident.** Public tunnelling is never enabled in any
  configuration. Binding beyond loopback raises `PublicWithoutAuthError` unless
  `GSECAL_AUTH_USER`/`GSECAL_AUTH_PASS` are set — with no escape-hatch flag,
  because an escape hatch is the thing that gets used at 2am. A managed host
  (Spaces, Cloud Run, Kubernetes/LKE) is treated as public even if it asks for
  loopback, since being wrong in that direction publishes. 19 tests cover the
  matrix; see `gsecal/serve.py`.
- **Cannot deploy.** Not in the Next.js app, not on Vercel, not in the ML image.
  It shares no dependency with any shipped surface.

## Layout

```
gsecal/
  metrics.py        production-parity Brier / ECE / MCE / Murphy
  decomposition.py  stratified ECE cancellation  <- the new analysis
  gate.py           eligibility mirror, floors that refuse to loosen
  bootstrap.py      seeded, reproducible intervals
  sweep.py          counterfactual link sweep (also the ETKF link)
  samples.py        strict loader that refuses to guess
  serve.py          fail-closed launch policy (no public bind without auth)
  readiness.py      false-GREEN detection + rows-to-floor projection
  skill.py          zero-skill null: does the gate test skill at all?
  report.py         markdown rendering (no metric computed here)
  cli.py            zero-install command line
app.py              optional Gradio cockpit (+ MCP)
parity/             vector generators + committed vectors
tests/              136 tests, stdlib unittest
```
