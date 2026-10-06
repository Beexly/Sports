# 1canhhoa/sports-betting-toolbox

**Stars:** 140 | **License:** MIT | **Pushed:** 2026-09-14 | **Language:** TypeScript | **Forks:** 872

## 1. Vision
A one-command sports-betting CLI: type two team names, get win/draw/away probabilities plus an AI-written reasoning paragraph. It exists to make match prediction feel like a conversation — historical data in, blended AI + statistical prediction out — with `strategy backtest` and `strategy picks` commands closing the loop from prediction to bet selection.

## 2. The Ask
- Node; `npm install`; `.env` with **`OPENAI_API_KEY` (required by default)** — the primary path calls an LLM (default `gpt-4o-mini`) via the Vercel AI SDK.
- Historical match CSVs (remote GitHub source by default: England/Spain 2020 data; or `--source file` with your own CSV; `--source dummy` for tests).
- Optional `REDIS_URL` for caching remote downloads.
- Accepts `--no-ai` to fall back to a pure local statistical model.

## 3. Constraints
- **MIT — adoptable**, but the value is thin for GSE.
- **Soccer-only, and the "AI model" is an LLM prompt**, not a trained predictor — the reasoning paragraph is vibes with structure. No backtested edge is published.
- **Alive:** pushed 2026-09-14; 872 forks suggests tutorial/assignment traffic more than production use.
- Every prediction costs an OpenAI call unless you use the statistical fallback — a per-prediction API cost with no accuracy premium demonstrated.

## 4. GSE lens
- **The pipeline shape is the lesson, not the model:** `predict` → `strategy backtest` → `strategy picks` as CLI verbs is exactly the pick-pipeline GSE lacks. GSE has projections work and a shadow-only props lane, but no backtest-then-picks command chain that turns a model into a ranked, accountable pick list.
- **The LLM-as-predictor is the anti-pattern to name explicitly:** GSE's first real reasoning trace returned INVALID (an honest refusal) — that honesty is worth more than this toolbox's confident-sounding `gpt-4o-mini` paragraph. If GSE ever puts an LLM near a prediction, it needs the refusal machinery this repo doesn't have.
- **No real gap exposed:** soccer-only, no NFL, no demonstrated edge, no methodology GSE doesn't already exceed in ambition. The star count reflects packaging, not substance.

## 5. Verdict
**REBUILD** — not worth adopting (LLM-prompt predictions, soccer-only). Rebuild only the CLI pipeline verbs (predict/backtest/picks) as GSE's own pick-accountability chain.

## 6. The 4 tricks
- codewiki: https://codewiki.google/github.com/1canhhoa/sports-betting-toolbox
- gitdiagram: https://gitdiagram.com/1canhhoa/sports-betting-toolbox
- star-history: https://star-history.com/#1canhhoa/sports-betting-toolbox (140 stars)
- github.dev: https://github.dev/1canhhoa/sports-betting-toolbox
