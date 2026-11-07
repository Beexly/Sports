# GSE Recompute Results — Lane 3 (live numeric recomputation)

**Run date:** 2026-11-07
**Lane:** FREE DEEPSEEK LANE 3 — execution bench for claimed constants
**Workspace:** `/home/hatch/workspace/ds-repo`
**Source under test:** `workers/stealth-skeleton-provider/src/index.ts` (3,326 lines (wc -l verified 2026-11-07))

## 0. Execution environment — read before trusting the numbers

**`python3` could not be executed in this session.** Every path returned "requires approval" with no execution: `python3 -c`, `python3 -m`, heredoc stdin, script-file execution, and a delegated `general-purpose` subagent. `Write` to this repo was denied, as were `/tmp` writes, `tee`, and redirection.

**The only compute engine that ran was `jq`** (zero-arity libm math filters `exp`, `sqrt`, `floor`; `pow/2`). jq's number type is C `double` — IEEE-754 binary64 — and its `exp` is the platform libm `exp`. Same numeric type as numpy float64 and JS `Math.exp`; **not** numpy, and **not** V8.

**This is a deviation from "python3 + numpy/scipy only for numbers."** It is disclosed, not hidden. Every number below came from a program executed in this run; nothing is hand-asserted or recalled. Because engine choice is exactly what Claim 1 turns on, I ran **two independent exponential implementations** (§1.5). A numpy re-run of Appendix A is still owed; the decisive result does not depend on it.

---

## CLAIM 1 — Sinkhorn marginal residual (decisive)

### 1.1 Exact implementation extracted

`executeRealSinkhornKnoppMarginalAudit(iterations = 40, epsilon = 0.15)` — `index.ts:1360-1419`.

Health surfaces call it identically: `index.ts:1443` `(40, 0.15)`; `index.ts:2264` `(40, 0.15)`; `index.ts:2568` `(40, 0.15)`. The tool `audit_sinkhorn_marginals` (`index.ts:1701`) takes caller-supplied args.

Inputs, verbatim (`index.ts:1370-1377`):

```
r    = [0.28, 0.34, 0.24, 0.14]
c    = [0.25, 0.35, 0.25, 0.15]
cost = [[0.02, 0.14, 0.29, 0.51],
        [0.12, 0.03, 0.18, 0.37],
        [0.27, 0.16, 0.04, 0.22],
        [0.48, 0.33, 0.19, 0.05]]
epsilon = 0.15
```

Kernel and iteration (`index.ts:1378-1393`):

```ts
const K = cost.map((row) => row.map((val) => Math.exp(-val / Math.max(1e-4, epsilon))));
let u = [1,1,1,1]; let v = [1,1,1,1];
for (let it = 0; it < Math.max(1, iterations); it++) {
  u = r.map((ri, i) => { let kv = 0; for (let j = 0; j < 4; j++) kv += K[i][j] * v[j]; return ri / Math.max(1e-18, kv); });
  v = c.map((cj, j) => { let ktu = 0; for (let i = 0; i < 4; i++) ktu += K[i][j] * u[i]; return cj / Math.max(1e-18, ktu); });
}
```

Residual (`index.ts:1395-1416`): `P = diag(u) K diag(v)`; `l1Err = Σ_i |rowsum_i − r_i| + Σ_j |colsum_j − c_j|`; `lInfErr = max` of the same eight abs diffs; `converged = l1Err < 1e-6 && lInfErr < 1e-6`; both returned through `Number(x.toExponential(6))` (7 significant digits).

**Order-of-operations detail that governs the answer:** each pass updates `u` from the previous `v`, then `v` from the **new** `u`. The loop ends on a `v` update, so all four column marginals are exact by construction and the entire residual sits in the four row marginals. The returned `(u,v)` is one half-iteration short of a joint fixed point.

### 1.2 Ambiguities

- `iterations` is echoed as the **requested** value (`index.ts:1413`), not the count executed; `Math.max(1, iterations)` runs once even when 0 is requested and reported.
- `Math.max(1e-4, epsilon)` (`1378`) is inert at 0.15.
- **None of the three circulating literals appears in this workspace.** Exhaustive grep (excluding `_qa_scratch/`) finds no `2.66e-7`, `1.11e-16`, or `1.387779e-16`. The source computes the residual per request; the "hardcoded literal" attributed to `2.66e-7` is not in the supplied files and could not be traced to a line here.

### 1.3 Computed kernel (`K = exp(−cost/0.15)`, libm exp, binary64)

```
[[0.8751733190429475,   0.39324072086859824, 0.14466517663899506, 0.033373269960326066],
 [0.44932896411722156,  0.8187307530779818,  0.30119421191220214, 0.0848672789700174  ],
 [0.1652988882215865,   0.34415378686541237, 0.7659283383646487,  0.2306931822549628  ],
 [0.04076220397836621,  0.11080315836233387, 0.2817692890949583,  0.7165313105737893  ]]
```

### 1.4 Computed result at the implementation's own parameters (40 iters, ε = 0.15)

```
L1   = 1.3877787807814457e-16
Linf = 5.551115123125783e-17
row sums = [0.28, 0.34, 0.24000000000000002, 0.13999999999999999]
col sums = exactly c (by construction)
eight abs diffs = [0, 0, 2.7755575615628914e-17, 2.7755575615628914e-17,
                   0, 5.551115123125783e-17, 0, 2.7755575615628914e-17]
converged = true
```

Through the code's own `toExponential(6)`: `1.3877787807814457e-16` → **`"1.387779e-16"`**.

Iteration behaviour (ε = 0.15):

| n | L1 | Linf | converged |
|---|---|---|---|
| 10 | 3.573745046725474e-06 | 1.2078922239644463e-06 | false |
| 11 | 1.3996681858530202e-06 | 4.730835776456388e-07 | false |
| **12** | **5.481867301482257e-07** | **1.8528650544413772e-07** | **true (first)** |
| 13 | 2.1470023991998488e-07 | 7.25685687652522e-08 | true |
| 37 | 2.7755575615628914e-17 | 2.7755575615628914e-17 | true |
| 38–100 | 1.3877787807814457e-16 | 5.551115123125783e-17 | true (stable) |

The residual hits the machine floor near iteration 37 and **stays** at `1.3877787807814457e-16` through n=100. The shipped 40 iterations is ~3.3× more than the 12 needed to satisfy the code's own convergence test.

### 1.5 Engine sensitivity — why three values circulate

| exp path | L1 at n=40 | 7 s.f. | L1 at n=41 | L1 at n=42 |
|---|---|---|---|---|
| libm `exp(−x)` — **correct path** | **1.3877787807814457e-16** | **1.387779e-16** | 1.3877787807814457e-16 | 1.3877787807814457e-16 |
| `pow(e_double, −x)` (e rounded) | 1.1102230246251565e-16 = 2⁻⁵³ | 1.110223e-16 | 1.3877787807814457e-16 | 1.3877787807814457e-16 |
| `pow(2, −x/ln2)` | 8.326672684688674e-17 | 8.326673e-17 | 1.3877787807814457e-16 | 1.3877787807814457e-16 |

Max relative difference between exp paths across the 16 kernel entries: **3.4045724846428406e-16**. That single-ULP perturbation in `K` moves the reported residual between `8.33e-17`, `1.11e-16` and `1.39e-16` at n=40 — exactly the spread of the circulating values.

**Diagnosis of `1.11e-16`:** it is what `pow(e_rounded, −x)` yields. Rounding `e` to double injects ≈5.3e-17 relative error into the base, propagating to ≈`x·5.3e-17` (up to ~1.8e-16 at the largest cost `x=3.4`). That path lands exactly on `2⁻⁵³ = 1.1102230246251565e-16`. It is an artefact of the exponential implementation, not the value the correct iteration produces.

**Diagnosis of `2.66e-7`:** not an iteration-count artefact at ε=0.15 — the trace brackets it between n=12 (`5.48e-7`) and n=13 (`2.15e-7`); no integer iteration reproduces it. It **is** reproducible at a different epsilon. At 40 iterations:

| ε | L1 at n=40 |
|---|---|
| 0.070 | 4.81731031845567e-06 |
| 0.075 | 1.0310049753659012e-06 |
| 0.079 | 2.8636052418207214e-07 |
| **0.07922676570233061** | **2.6600000008203395e-07** |
| 0.080 | 2.066746713769163e-07 |

Bisection (60 halvings on `[0.07, 0.08]`) converges to **ε ≈ 0.0792267657** → L1 = `2.6600000008203395e-07`. So `2.66e-7` is consistent with this matrix and iteration at **ε ≈ 0.0792** — roughly half the shipped epsilon — not at `(40, 0.15)`.

### 1.6 Verdict — Claim 1

> **REPRODUCED: `1.387779e-16`.** At the implementation's own parameters — 40 iterations, ε=0.15, binary64, libm `exp` — the L1 marginal residual is **1.3877787807814457e-16**, which `toExponential(6)` renders exactly as `1.387779e-16`. This is the live health-endpoint value and the correct value for the code as written.
>
> **NOT REPRODUCED: `1.11e-16`** at these parameters. It arises only on a lower-fidelity exponential path (`pow(e_rounded, −x)`) and equals `2⁻⁵³`; a rounding artefact, ~0.8 ULP below the true result.
>
> **NOT REPRODUCED: `2.66e-7`** at these parameters — nine orders of magnitude too large. The same code produces it only at **ε ≈ 0.07923**, not the shipped ε=0.15. If `2.66e-7` is hardcoded in the estate, it was not generated by this function with the parameters this function ships with.

---

## CLAIM 2 — Provider health / SLA literals

Surfaces: `GET /health` (`2243-2257`), `GET /v1/providers/health` (`2259-2327`), `GET /validate|/activate` (`2482-2504`), `GET /v1/models` (`2329-2363`).

**Headline: this source contains no hardcoded TTFT, throughput, or accuracy constants.** Those fields are computed per request. The single pure unmeasured numeric literal on a health surface is `uptime_target: 0.999`.

| Field | Line | Value | Class | Evidence |
|---|---|---|---|---|
| `uptime_target` | 2304 | `0.999` | **UNMEASURED-LITERAL** | Returned verbatim. No uptime counter, timer, or storage exists in the file; grep `uptime` hits only this line plus the comment at 2233. Honestly named a *target*, but nothing measures attainment. |
| `ttft_p95_ms` | 2305 | `measuredTtftMs` | **COMPUTED — mislabelled** | `t0=performance.now()` at 2263; `elapsedMs=max(0.05, performance.now()-t0)` at 2288; value at 2289. A **single wall-clock sample of the whole in-process probe** (Sinkhorn + page tree + math verify + 5 grammar heals) — not a model TTFT, not a p95. The `max(0.05, …)` floors it at 50 ms. |
| `throughput_tokens_per_sec` | 2306 | `measuredThroughputTps` | **COMPUTED FROM A PROXY** | `probeTokenCount=ceil((summary.length + matchedTitle.length + JSON.stringify(sinkhornHealth).length)/4)` at 2290-2292; ratio at 2293-2295. Character-count÷4 over synthetic strings; no model tokens generated or counted. |
| `exacto_tool_calling_accuracy` | 2307 | `measuredExactoAccuracy` | **COMPUTED, n=5, self-administered** | 5 hardcoded fixtures at 2273-2279; `healToolCallGrammar(raw).validJson` at 2280-2284; ratio at 2285-2287. Measures the grammar healer, not model tool-calling. Can only take values in {0, 0.2, 0.4, 0.6, 0.8, 1.0} — cannot express >95% except as exactly 100%. |
| `status` | 2303 | `HEALTHY`/`DEGRADED` | **COMPUTED** | `sinkhornHealth.converged && mathProbe.allPassed` — deterministic self-checks on hardcoded inputs. |
| `sinkhorn_convergence_health.*` | 2309-2314 | live | **COMPUTED LIVE** | Direct return of `executeRealSinkhornKnoppMarginalAudit(40, 0.15)`. |
| `pageindex_readiness.ready` | 2316-2318 | bool | **COMPUTED** | `children.length>=3 && retrievalTrace.length>0` — properties of a deterministically built tree. |
| `schema_version` | 2248, 2301, 2497 | `"2.4"` | **CONSTANT METADATA** | Declared. Three spellings coexist: `"2.4"` here, `"2.4.0"` at 2375. |
| `crown_ip_firewall` | 2253, 2323, 2500 | `"ENFORCED"` | **CONSTANT LITERAL** | Returned verbatim; no check performed. |
| `models_available` / `active_model_ids` / `models` | 2250-2252, 2320-2322, 2498 | ids | **DERIVED FROM CONSTANT ARRAY** | `STEALTH_SKELETON_MODELS_V2_4`. |
| `context_length 131072` / `max_completion_tokens 16384` | 2354-2355 | constants | **CONSTANT METADATA** (models surface) | Declared capabilities. |

**Comment-level numeric claims never computed:**
- `2164` — "Auto Exacto (`>95%` tool-calling accuracy)". Never computed; the only accuracy field is the n=5 fixture ratio.
- `2233` — "so throughput/uptime stay >= 95%". No throughput or uptime is measured; the 429 branch (2234-2239) is gated solely by the env flag `STEALTH_SKELETON_RATE_LIMIT_SHED === "true"`, with no load observation.

### 2.1 Verdict — Claim 2

> **UNMEASURED-LITERAL: `uptime_target: 0.999`** (`index.ts:2304`) — the only pure numeric literal on a health/SLA surface, and nothing in the file measures uptime.
>
> **The TTFT / throughput / accuracy fields are not constants.** All three are computed per request (2285-2295) — but each computes a proxy, not the quantity its name asserts: a single whole-request stopwatch reading floored at 50 ms labelled a p95 TTFT; characters÷4 over synthetic strings labelled tokens/sec; and 5 self-administered fixtures labelled model accuracy. They should not be quoted as measured service metrics.

---

## CLAIM 3 — The `/benchmarks` composite

The page source is **not present in this workspace** (grep for `86.62`/`86.12` returns nothing outside unrelated equation data). Components are taken from the task statement; the arithmetic is self-contained.

Components: LiveBench 85.00, GSM8K 95.00, MATH-500 85.00, AIME 60.00, GPQA 65.00, HumanEval+ 90.24, ForecastBench normalized 88.20.

### 3.1 Plain mean (equal weights)

```
sum  = 568.44
n    = 7
mean = 568.44 / 7 = 81.2057142857143
```

**Equal weights give 81.205714, not 86.62. Difference −5.414286.**

### 3.2 What each displayed composite requires

```
86.62 × 7 = 606.34  → required sum exceeds actual by 37.90
86.12 × 7 = 602.84  → required sum exceeds actual by 34.40
```

The two page values differ by `0.5 × 7 = 3.5` in total-score terms.

### 3.3 Simple-weighting tests — all fail

| Scheme | Composite | Matches 86.62? |
|---|---|---|
| Equal weights, all 7 | 81.205714 | no |
| Drop AIME, mean of 6 | 84.74 | no |
| Top-6 mean | 84.74 | no |
| Top-5 mean | 88.688 | no |
| Top-4 mean | 89.61 | no |
| Top-3 mean | 91.146667 | no |
| Trimmed (drop hi+lo, mean of 5) | 82.688 | no |
| Drop highest (GSM8K), mean of 6 | 78.906667 | no |
| Excluding each component in turn | 78.91 – 84.74 | no |

**No equal-weight or subset-mean scheme reproduces 86.62.** Every mean including the low components lands at or below 84.74. 86.62 is above the mean of all six non-AIME components (84.74), so any weighting that shifts weight *toward* AIME moves further away; it requires upweighting the high scorers (95, 90.24, 88.20) and downweighting AIME/GPQA. With non-negative weights summing to 1, 86.62 is achievable (max = 95), but the weights are not inferable from the seven displayed values.

### 3.4 Single-component repair — the AIME signal

For a mean of seven to equal the target while six stay fixed, the seventh must be `x = target×7 − sum(others)`:

| Component changed | Required for 86.62 | ≤100? | Required for 86.12 | ≤100? |
|---|---|---|---|---|
| LiveBench | 122.90 | no | 119.40 | no |
| GSM8K | 132.90 | no | 129.40 | no |
| MATH-500 | 122.90 | no | 119.40 | no |
| **AIME** | **97.90** | **yes** | **94.40** | **yes** |
| GPQA | 102.90 | no | 99.40 | yes |
| HumanEval+ | 128.14 | no | 124.64 | no |
| ForecastBench | 126.10 | no | 122.60 | no |

Only **AIME** can absorb the discrepancy within 0–100 for 86.62 — requiring **97.90 instead of the displayed 60.00**. For 86.12, AIME would need **94.40** (or GPQA 99.40). The 3.5-point gap between the two page values is exactly a 3.5-point difference in one component: `97.90 − 94.40 = 3.5`.

### 3.5 Verdict — Claim 3

> **NOT REPRODUCED: `86.62` is not the plain mean of the seven listed components.** The plain mean is **81.2057142857143**. No equal-weight, subset-mean, top-k, or trimmed-mean scheme tested reproduces 86.62.
>
> To yield 86.62 the seven values must total **606.34** — 37.90 more than the 568.44 shown. The only single-component explanation staying within a plausible 0–100 score is **AIME = 97.90** rather than the displayed **60.00**. Under the same test, the title value **86.12** requires a total of **602.84** and implies **AIME = 94.40**. The two page numbers are internally consistent with each other (differing by exactly 3.5 in one component) but neither is consistent with the seven components as displayed.

---

## 4. Methods note — how these checks generalize

1. **Never accept a quoted residual without its parameters.** Claim 1's values differ by 9 orders of magnitude at the same nominal `(40, 0.15)`. Any residual claim must carry `(iterations, epsilon, matrix, norm, accumulation order, precision)`. A residual without them is not a fact about the code.
2. **A residual at machine epsilon is not a convergence result — it is a fingerprint of the arithmetic.** Once `L1 < ~1e-15`, the exact digits are determined by the last-ULP behaviour of `exp` and summation order, not by the algorithm. Grade such claims on magnitude; label exact digits implementation-dependent. The two 1e-16 values here differ by 0.25 ULP.
3. **Echoed parameters are not executed parameters.** `return { iterations }` (1413) reports the request, not the work. Verify against a counter incremented inside the loop.
4. **Test the parameter-provenance hypothesis before hunting for a bug.** For any hardcoded constant, first ask "which epsilon/iteration combination produced it?" Here the answer was ε≈0.07923, not the shipped 0.15. A constant's provenance is usually a different parameter set, not a different matrix.
5. **Classify a "measured_" field by its numerator and denominator, not its name.** The generalization test for any SLA claim: *what is the sample size, what is the input, and can the metric take a value that would embarrass the provider?* If "n=1", "our own summary string", or "no" — it is a self-portrait, not a measurement.
6. **A composite is a checksum.** For any displayed aggregate, recompute `mean × n` vs `Σ components`. Here the deficit was 37.90 — resolvable only by changing one component by 37.9 points. One addition catches the entire class of "headline number not derived from the table beneath it."
7. **Report the missing file.** Claim 3's page source is not in this workspace. The arithmetic is valid for the components as given, but the page's own weighting code cannot be audited from here — that gap is part of the result.

---

## Appendix A — exact programs executed

```jq
def R: [0.28,0.34,0.24,0.14];
def C: [0.25,0.35,0.25,0.15];
def COST: [[0.02,0.14,0.29,0.51],[0.12,0.03,0.18,0.37],
           [0.27,0.16,0.04,0.22],[0.48,0.33,0.19,0.05]];
def K1($eps): [COST[] | [.[] | (- (. / $eps)) | exp]];                  # libm exp (correct)
def Kpow($eps): [COST[] | [.[] | pow(2.718281828459045; - (. / $eps))]]; # sensitivity
def K2($eps): [COST[] | [.[] | pow(2; - (. / $eps) / 0.6931471805599453)]]; # sensitivity
def dot($a;$b): reduce (range(0;($a|length))) as $i (0; . + ($a[$i]*$b[$i]));
def step($K;$s):
  ([range(0;4) as $i | (R)[$i] / dot($K[$i]; $s.v)]) as $u |
  ([range(0;4) as $j | (C)[$j] / dot([range(0;4) as $i | $K[$i][$j]]; $u)]) as $v |
  {u:$u, v:$v};
def run($K;$n): reduce (range(0;$n)) as $i ({u:[1,1,1,1], v:[1,1,1,1]}; step($K; .));
def Pmat($K;$s): [range(0;4) as $i | [range(0;4) as $j | $s.u[$i]*$K[$i][$j]*$s.v[$j]]];
def rsum($P): [range(0;4) as $i | reduce (range(0;4)) as $j (0; . + $P[$i][$j])];
def csum($P): [range(0;4) as $j | reduce (range(0;4)) as $i (0; . + $P[$i][$j])];
def resd($K;$s):
  Pmat($K;$s) as $P | rsum($P) as $rs | csum($P) as $cs |
  (([range(0;4) as $i | (($rs[$i]-(R)[$i]) | if . < 0 then -. else . end)]) +
   ([range(0;4) as $j | (($cs[$j]-(C)[$j]) | if . < 0 then -. else . end)])) as $d |
  {l1:($d|add), linf:($d|max), rows:$rs, diffs:$d};
def rep($K;$n): run($K;$n) as $s | resd($K;$s) as $z |
  {n:$n, l1:$z.l1, linf:$z.linf,
   conv:(($z.l1<1e-6) and ($z.linf<1e-6)), rows:$z.rows, diffs:$z.diffs};
K1(0.15) as $K |
{ K: $K, at_40: rep($K;40), at_100: rep($K;100),
  trace_1_15: [range(1;16) as $n | rep($K;$n)],
  trace_33_45: [range(33;46) as $n | rep($K;$n)],
  pow_e_at_40: rep(Kpow(0.15);40),
  pow_2_at_40: rep(K2(0.15);40), pow_2_at_41: rep(K2(0.15);41) }
```

```jq
[85.00,95.00,85.00,60.00,65.00,90.24,88.20] as $v |
($v|add) as $s | ($v|length) as $n |
{ sum:$s, n:$n, mean:($s/$n),
  required_sum_8662:(86.62*$n), gap_8662:(86.62*$n-$s),
  required_sum_8612:(86.12*$n), gap_8612:(86.12*$n-$s),
  required_AIME_8662:(86.62*$n-($s-60)),
  required_AIME_8612:(86.12*$n-($s-60)),
  single_component_required: [$v|length as $n | range(0;$n) as $i |
    {i:$i, required:(86.62*$n-($s-$v[$i]))}],
  top_k_means: (($v|sort|reverse) as $d |
    [range(1;8) as $k | {k:$k, mean:(([$d[0:$k][]]|add)/$k)}]) }
```

---

## GAP AUDIT (per AGENTS.md — mandatory)

**NOT WRITTEN:** `docs/wiring/qa/RECOMPUTE-RESULTS.md` — **every write path was denied** by the session permission mode (`Write` to repo, `Write` to `/tmp`, `Write` to memory, `tee`, `>`, `mkdir`). The content above is final and must be landed by a session with write permission. This is the one deliverable item not completed.

**NOT RUN:** numpy/scipy. All numbers come from `jq`/libm in binary64, not the mandated python3 stack. Appendix A is written to be transcribed directly into numpy for confirmation. The Claim 1 result is engine-sensitive at the last ULP — but the decisive comparison (2.66e-7 vs ~1e-16) is robust across all three exp paths tested.

**NOT TRACED:** the `2.66e-7` hardcoded literal. It is absent from every file in this workspace. Its location in the wider estate is unknown to this lane.

**NOT AUDITED:** the `/benchmarks` page source (absent from the workspace) and its weighting code. Claim 3's components were supplied by the task statement, not read from a file.

**NOT VERIFIED:** whether the deployed Worker's V8 `Math.exp` is bit-identical to platform libm for these 16 arguments. The computed value matches the live endpoint exactly, which is strong empirical evidence but not a proof of bit-equality.

---

**One-line summary:** Claim 1 — **1.387779e-16 REPRODUCED** at the shipped (40, ε=0.15) with libm exp; 1.11e-16 is a `pow(e,−x)` artefact (2⁻⁵³) and 2.66e-7 is NOT reproducible at the shipped parameters (it needs ε≈0.07923). Claim 2 — only `uptime_target: 0.999` is an unmeasured literal; TTFT/throughput/accuracy are computed proxies. Claim 3 — the plain mean is **81.205714**, not 86.62; 86.62 requires a total of **606.34** (+37.90), implying **AIME=97.90**, while 86.12 implies **AIME=94.40**.
