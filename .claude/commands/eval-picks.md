# /eval-picks — PromptFlow Pick Quality Evaluation

Evaluate pick generation quality against historical game outcomes using PromptFlow.
Run this before deploying a prompt change or switching models.

## Prerequisites

```bash
pip install promptflow promptflow-tools promptflow-evals
# Verify: pf --version
```

Data directory must exist:
```bash
ls packages/prediction-engine/promptflow/data/
# Should contain: nfl_2025_week14.jsonl (or similar)
```

Export historical games from the DB if the directory is empty:
```bash
# Requires DATABASE_URL in env
npx ts-node packages/prediction-engine/scripts/export-ground-truth.ts \
  --sport americanfootball_nfl \
  --from 2025-09-01 \
  --to 2026-02-01 \
  --out packages/prediction-engine/promptflow/data/nfl_2025.jsonl
```

## Run Evaluation

```bash
cd packages/prediction-engine/promptflow

# Quick single-row test (verify setup works)
pf flow test \
  --flow pick-generation \
  --inputs game_context='{"homeTeam":"Chiefs","awayTeam":"Bills","spread":-3.5}' \
            home_score=27 away_score=20 spread=-3.5

# Full evaluation against dataset
RUN_NAME="eval-$(git rev-parse --short HEAD)-$(date +%Y%m%d)"

pf run create \
  --flow pick-generation \
  --data data/nfl_2025.jsonl \
  --column-mapping \
    game_context='${data.game_context}' \
    home_score='${data.home_score}' \
    away_score='${data.away_score}' \
    spread='${data.spread}' \
  --name "$RUN_NAME"

# View metrics
pf run show-metrics --name "$RUN_NAME"
```

## Compare Two Prompt Versions (A/B Test)

```bash
# Run baseline (current main)
pf run create --flow pick-generation --data data/nfl_2025.jsonl --name "baseline"

# Edit generate_pick.py to change the prompt or model

# Run challenger
pf run create --flow pick-generation --data data/nfl_2025.jsonl --name "challenger"

# Compare side by side
pf run visualize --names "baseline,challenger"
# Opens browser: accuracy, ATS return, latency, cost side by side
```

## Interpreting Results

Key metrics to compare:

| Metric | Baseline | Challenger | Delta |
|---|---|---|---|
| `accuracy` | 0.54 | 0.57 | +0.03 ✓ |
| `ats_return` | -0.02 | +0.05 | +0.07 ✓ |
| `avg_latency` | 1.2s | 0.4s | -0.8s ✓ |
| `avg_cost` | $0.012 | $0.003 | -75% ✓ |

**Decision rule:**
- If challenger accuracy ≥ baseline AND ATS return ≥ baseline: deploy
- If challenger accuracy < baseline by > 2%: reject, tune prompt
- If accuracy is equal but challenger is much cheaper: usually deploy

## Minimum Viable Dataset

For meaningful results, you need at least 50 games (ideally 200+).
One NFL season = ~270 games. Use multiple weeks for confidence.

The accuracy baseline for random picking = 50%. A good model should reach 53-57% ATS.
(Vegas lines price it to be nearly impossible to beat consistently — even 54% is excellent.)

See docs/ai/integrations/PROMPTFLOW-EVAL.md for full setup and CI gate.
