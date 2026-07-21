# PromptFlow: Pick Quality Evaluation + Prompt A/B Testing

> Source: `microsoft/promptflow` (MIT, 10k★)
> Purpose: Systematic prompt evaluation — track pick quality across model versions, not just cost

## What This Solves

LiteLLM (see LITELLM-GATEWAY.md) tells you HOW MUCH a pick costs.
PromptFlow tells you HOW GOOD the pick was.

For a sports betting platform, pick quality IS the product. Without systematic evaluation:
- You can't know if switching from Sonnet to Haiku degrades pick accuracy
- You can't know if a prompt change improved confidence calibration
- You can't compare "the old prompt" vs "the new prompt" on the same historical games
- You can't detect when a model update silently changes pick behavior

PromptFlow fixes this by letting you run any prompt against a dataset of historical games
(where you know the outcome) and measure accuracy, confidence calibration, and ATS return.

## How It Differs from Just Running Tests

| | Vitest tests | PromptFlow evaluation |
|---|---|---|
| Purpose | Code correctness | Output quality |
| Input | Mock data | Real historical games |
| Output | Pass/fail | Accuracy, precision, recall |
| Comparison | Before/after | A vs B vs C simultaneously |
| Ground truth | Expected return values | Actual game outcomes |

## Installation

```bash
# Install (Python 3.9+)
pip install promptflow promptflow-tools promptflow-evals

# OR with uv (faster):
uv tool install promptflow

# Verify
pf --version
```

## Core Concept for GSN

Define a "flow" — a sequence of steps:
1. Input: a game context (teams, odds, stats, weather)
2. Step 1: call Claude with the pick generation prompt
3. Output: structured pick (side, confidence, reasoning)

Then define an "evaluator" — a function that scores the output:
- Did the pick side (HOME/AWAY/OVER/UNDER) match the actual game result?
- Was confidence calibrated? (90%+ confidence picks should win 90%+ of the time)
- What was the ATS return if you bet this pick?

Run the flow + evaluator over 100 historical games. Get a score. Change the prompt. Run again. Compare.

## Setup: GSN Pick Evaluation Flow

### Directory structure

```
packages/prediction-engine/promptflow/
  pick-generation/
    flow.dag.yaml          # defines the flow
    generate_pick.py       # step: call Claude
    evaluate_pick.py       # evaluator: score the pick
    data/
      nfl_2025_week14.jsonl  # ground truth dataset
      nfl_2025_week15.jsonl
```

### `flow.dag.yaml`

```yaml
inputs:
  game_context:
    type: string
    description: "JSON string of game data (teams, odds, injuries, weather)"
  home_score:
    type: number
    description: "Actual home score (ground truth, not seen by the model)"
  away_score:
    type: number
    description: "Actual away score (ground truth)"
  spread:
    type: number
    description: "Published spread at time of pick"

outputs:
  recommendation:
    type: string
    reference: ${generate_pick.output.recommendation}
  confidence:
    type: number
    reference: ${generate_pick.output.confidence}
  reasoning:
    type: string
    reference: ${generate_pick.output.reasoning}
  accuracy:
    type: number
    reference: ${evaluate_pick.output.accuracy}
  ats_return:
    type: number
    reference: ${evaluate_pick.output.ats_return}

nodes:
  - name: generate_pick
    type: python
    source: generate_pick.py
    inputs:
      game_context: ${inputs.game_context}

  - name: evaluate_pick
    type: python
    source: evaluate_pick.py
    inputs:
      recommendation: ${generate_pick.output.recommendation}
      confidence: ${generate_pick.output.confidence}
      home_score: ${inputs.home_score}
      away_score: ${inputs.away_score}
      spread: ${inputs.spread}
```

### `generate_pick.py`

```python
import json
from promptflow.core import tool
import anthropic

client = anthropic.Anthropic()

PROMPT_V1 = """Analyze this NFL game and generate a pick.
Return JSON: {"recommendation": "HOME|AWAY|OVER|UNDER", "confidence": 50-99, "reasoning": "..."}

Game: {game_context}"""

PROMPT_V2 = """You are an expert NFL handicapper with access to current injury reports and
line movement. Analyze this game carefully and generate a pick.
Consider: ATS trends, weather, home field, recent form, key injuries.
Return JSON: {"recommendation": "HOME|AWAY|OVER|UNDER", "confidence": 50-99, "reasoning": "...", "key_factors": [...]}

Game: {game_context}"""

@tool
def generate_pick(game_context: str) -> dict:
    msg = client.messages.create(
        model="claude-sonnet-4-20250514",  # swap to haiku for cost comparison
        max_tokens=512,
        messages=[{
            "role": "user",
            "content": PROMPT_V2.format(game_context=game_context)
        }]
    )
    return json.loads(msg.content[0].text)
```

### `evaluate_pick.py`

```python
from promptflow.core import tool

@tool
def evaluate_pick(
    recommendation: str,
    confidence: int,
    home_score: float,
    away_score: float,
    spread: float,
) -> dict:
    # ATS result
    home_covered = (home_score + spread) > away_score
    actual_winner = "HOME" if home_covered else "AWAY"
    
    # Accuracy: did we pick the right side?
    correct = recommendation == actual_winner
    
    # ATS return: -110 bet, returns 100 on win
    ats_return = 100 / 110 if correct else -1.0
    
    # Confidence calibration: did high confidence picks win more?
    confidence_band = (confidence // 10) * 10  # 50s, 60s, 70s, 80s, 90s
    
    return {
        "accuracy": 1.0 if correct else 0.0,
        "ats_return": ats_return,
        "confidence_band": confidence_band,
        "was_confident_correct": correct and confidence >= 70,
    }
```

### Ground truth dataset `data/nfl_2025_week14.jsonl`

```jsonl
{"game_context": "{\"homeTeam\": \"Chiefs\", \"awayTeam\": \"Bills\", \"spread\": -3.5, ...}", "home_score": 27, "away_score": 20, "spread": -3.5}
{"game_context": "{\"homeTeam\": \"Eagles\", \"awayTeam\": \"Cowboys\", \"spread\": -6.0, ...}", "home_score": 34, "away_score": 17, "spread": -6.0}
```

Export from the GSN database:
```sql
SELECT 
  json_build_object('homeTeam', home_team_name, 'awayTeam', away_team_name, ...) AS game_context,
  home_score,
  away_score,
  spread
FROM games
WHERE status = 'FINAL'
  AND commence_time BETWEEN '2025-09-01' AND '2026-02-01'
ORDER BY commence_time;
```

## Running Evaluations

```bash
cd packages/prediction-engine/promptflow

# Single run to verify setup
pf flow test --flow pick-generation --inputs game_context="{...}" home_score=27 away_score=20 spread=-3.5

# Full evaluation run against dataset
pf run create \
  --flow pick-generation \
  --data data/nfl_2025_week14.jsonl \
  --column-mapping game_context='${data.game_context}' home_score='${data.home_score}' away_score='${data.away_score}' spread='${data.spread}' \
  --name "sonnet-prompt-v2-week14"

# View results
pf run show-details --name "sonnet-prompt-v2-week14"
pf run show-metrics --name "sonnet-prompt-v2-week14"

# Compare two runs
pf run visualize --names "sonnet-prompt-v1-week14,sonnet-prompt-v2-week14"
```

## Practical Comparison Workflow

```bash
# 1. Baseline: current prompt + Sonnet
pf run create --flow pick-generation --data data/ --name "baseline-sonnet"

# 2. Challenger: new prompt
# Edit PROMPT_V2 in generate_pick.py
pf run create --flow pick-generation --data data/ --name "new-prompt-sonnet"

# 3. Cost comparison: Haiku
# Change model to "claude-haiku-4-5-20251001" in generate_pick.py
pf run create --flow pick-generation --data data/ --name "baseline-haiku"

# 4. Compare all three
pf run visualize --names "baseline-sonnet,new-prompt-sonnet,baseline-haiku"
```

This shows you: does the new prompt improve ATS accuracy? Does Haiku cost 1/10th for only 2% accuracy drop?

## CI Gate: Block Prompt Regressions

```yaml
# .github/workflows/pick-quality-gate.yml
- name: Evaluate pick quality
  run: |
    pip install promptflow
    pf run create --flow packages/prediction-engine/promptflow/pick-generation \
      --data packages/prediction-engine/promptflow/data/nfl_2025_week14.jsonl \
      --name "ci-run-${{ github.sha }}"
    
    # Extract accuracy metric and fail if below threshold
    ACCURACY=$(pf run show-metrics --name "ci-run-${{ github.sha }}" | jq '.accuracy')
    if (( $(echo "$ACCURACY < 0.52" | bc -l) )); then
      echo "Pick accuracy $ACCURACY below 52% threshold — blocking merge"
      exit 1
    fi
```

## Status

- [ ] `pip install promptflow promptflow-tools promptflow-evals`
- [ ] Create `packages/prediction-engine/promptflow/pick-generation/` structure
- [ ] Export GSN historical game data to JSONL dataset
- [ ] Run baseline evaluation: `pf run create --flow ... --data ...`
- [ ] Document baseline accuracy + ATS return
- [ ] Add CI quality gate (block if accuracy drops below threshold)
- [ ] Set up weekly scheduled eval run to detect model drift
