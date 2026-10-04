"""Precision/recall harness for the wave-9004 equation gate.

Feeds each labelled line through the FULL extract() pipeline (not just
is_equation) by wrapping it in a temp file, so every filter is exercised.
"""
import importlib.util
import os
import tempfile

spec = importlib.util.spec_from_file_location(
    "w", "C:/Users/Garrett/onejev/inbox/wave_extract_9004.py"
)
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)

POS = [
    "  GSE-CPOE(passer) = 100 × mean(complete − P̂(complete))",
    "equations `β = (ZᵀZ + λR)⁻¹ Zᵀy` on a **standardized** design with a leading",
    "intercept column; `R = diag(0, 1, 1, …)` leaves the intercept **unpenalized**.",
    "  GSE-RYOE(rusher) = mean(rushingYards − ŷ(rushingYards))",
    "  GSE-xYAC(receiver) = mean(yardsAfterCatch − ŷ(yardsAfterCatch))",
    "coverage_score = min(1, source_count / expected_source_count)",
    "contradiction_penalty = min(0.50, 0.20 * contradiction_count)",
    "missing_penalty = min(0.40, 0.08 * missing_required_fields)",
    "w_j = \\mathrm{corr}(\\phi_j,\\, r_{n-1})",
    "E[π(s)] = (1+φ)Q(s) − φ",
    "Q(s) = b_{h,L}(s)P(M<s) + b_{v,L}(s)P(M>s)",
    "Q(s) = 1/2 + 2θ(s)λ(s) + 2F_m(s)F̄_m(s)δ(s)",
    "E[π(s)] = (1−φ)/2 + 2(1+φ)[θ(s)λ(s) + F_m(s)F̄_m(s)δ(s)]",
    "R = P_exec / P_ind with P_ind = ∏ p_j.",
    "default λ = 1",
    "reportScale = 100",
    "1 + 1 = 2",
    "φ(x) = [",
    "DRI =",
    "peak β = −0.20, t = −3.11, p = 0.002, n = 1090",
    "walk-forward r = -0.065",
    "n=269, r=0.027366, slope=0.208919, se=0.467033",
    "y = scored.astype(float) # 0/1, honest only as a ranking check",
    "allowed_symbols=add,sub,mul,fmin,fmax,constant,variable",
]

NEG = [
    "npm run test --workspace=packages/prediction-engine -- src/gse-score/__tests__/x.test.ts",
    "npm run typecheck --workspace=packages/prediction-engine",
    "| npm run guardrails | PASS - trust, model-freeze, secret scan |",
    "objectives=[\"r2\", \"length\"], # NSGA-II front",
    "charted pass with `complete_pass=1` or `incomplete_pass=1` and `air_yards`",
    "| seasons | 2018–2026 (2026 = application season) | 2018–2025 |",
    "is reasoning. My first run reported wired = 0, which was wrong — the status came",
    "collision, but two coexisting layouts = every consumer guessing.",
    "# Source of truth for the code: `packages/prediction-engine/src/expected-metrics/*`",
    "This metric is computed as follows for each player in the dataset.",
    "> (pure, deterministic, zero-dependency engine) and",
    "| `npm run guardrails` after QB Burden Index | PASS - trust, model-freeze |",
    "Freshness Score is a composite of source age and corroboration breadth.",
    "method tag `\"ridge-linear\"`, default `λ = 1`.",
    "- `airYards` + `airYardsSquared` capture pass **depth and its curvature**",
]


def run(line):
    with tempfile.NamedTemporaryFile(
        "w", suffix=".md", delete=False, encoding="utf-8"
    ) as fh:
        fh.write(line + "\n")
        p = fh.name
    try:
        rows, err = m.extract(p.replace("\\", "/"), 9004)
        return rows
    finally:
        os.unlink(p)


tp = fp = 0
print("=== POSITIVES (must be captured) ===")
for s in POS:
    rows = run(s)
    ok = bool(rows)
    tp += ok
    print(("  OK  " if ok else "  MISS"), "%.2f" % m.math_density(s), s[:88])

print("\n=== NEGATIVES (must be dropped) ===")
for s in NEG:
    rows = run(s)
    leaked = bool(rows)
    if leaked:
        fp += 1
        print("  LEAK", "%.2f" % m.math_density(rows[0]["equation"]), "->", rows[0]["equation"][:88])
    else:
        print("  ok  ", "%.2f" % m.math_density(s), s[:88])

print(f"\nrecall={tp}/{len(POS)}  false_positives={fp}/{len(NEG)}")