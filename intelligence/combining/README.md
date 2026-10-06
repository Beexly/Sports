# combining — forecast combination and ensemble training

Implements the c10 research combination stack (buildable-systems.md SYS-04,
SYS-07, SYS-16; syntheses.md Pipelines 4, 7).

| File | Implements |
|---|---|
| `angular.py` | Angular combining of forecast CDFs (1550, arXiv:2305.16735v2): the paper's exact parametrization (θ→90° = linear opinion pool, θ→0° = quantile averaging, verified numerically); fallback θ=67.5° (+1.4% MQS); `optimize_theta()` in-sample MQS tuning |
| `audit.py` | SYS-16 information-graph pre-step: Attention Centrality, network-bias variance, star-topology concentration diagnostic — run BEFORE trusting any combination |
| `afcrps.py` | afCRPS training (0748): α=0.95, (1−α) admixture removes pure-fCRPS degeneracy (demonstrated as mechanism); fp16 positive-terms rearrangement proven term-by-term non-negative; EECRPS = |EFI|×CRPS evaluation; ensemble-collapse monitoring |
| `synthetic.py` | Seeded synthetic DGPs (M=12 ensembles, known biases; 4 components with location disagreement) — NOT real data |

**Gates:** `angular_fallback_theta_deg()` = 67.5 exactly; angular vs linear
pool MQS gain ≥ 0.0; afCRPS ≥2% holdout CRPS gain with no ensemble collapse.

**Era boundaries are code, not comments:** pooled fits across reforecast eras
raise `CrossEraPoolingError`. The stadium wind/precip ladder
(`STADIUM_VARIABLE_LADDER`: 30 neighborhoods, GEFS, MLP→LeNet→transformer) is
INFERENCE-marked with blockers documented, not silently dropped.
