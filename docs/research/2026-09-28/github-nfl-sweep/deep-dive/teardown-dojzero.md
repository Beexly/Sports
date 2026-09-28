# Teardown: agentscope-ai/DojoZero (commit `39112aa`, ~49 stars, MIT, last push 2026-07-27)

All findings grounded in the source files (`packages/dojozero/src/dojozero/`), not the README. License: **MIT** — use/copy/modify permitted with the `Copyright (c) 2026 agentscope-ai` notice retained. Note: the filing report lives at `~/workspace/dojozero-teardown/REPORT.md` if deeper re-cuts are needed.

## 1. Agent loop architecture

**Actor model** (`core/`): three actor types — **DataStream** (publishes typed `StreamEvent`s), **Operator** (stateful services agents query), **Agent** (consumes streams, reasons, calls operator tools). Actors support `save_state`/`load_state` checkpointing.

The agent (`betting/_agent.py`, `BettingAgent`) wraps **AgentScope's `ReActAgent`** (Alibaba's framework), not a custom loop. The DojoZero machinery:
- **Event ingestion with throttle:** `handle_stream_event()` queues events if the agent is busy or within a **180s cooldown** between LLM calls; a background task drains the queue after cooldown — events batch, never drop.
- **Push vs pull split:** `ODDS_UPDATE` and per-play `GAME_UPDATE` events are **filtered out** and never wake the agent (pull-based via the broker's `get_event` tool). Only meaningful events (injury reports, power rankings, game start/result, pre-game stats) trigger an LLM turn.
- **Memory compression:** at ~102,400 tokens, `_offload()` runs incremental LLM summarization (new events + prior summary), appends broker bet history, wipes ReAct memory. Sparse first-10/last-10 fallback on failure.
- **Multi-agent default:** `trial_params/nfl-moneyline.yaml` runs **6 persona agents per game** — `degen`, `mystic`, `pundit`, `shark`, `sheep`, `whale` (`agents/personas/*.yaml`) — same 5 streams, same broker, $1,000 starting balance each. Plus a **SocialBoard**: shared 200-char chat with cooldown rate limits and LLM-generated "hot topics" digests re-injected as events.
- **Orchestration:** **Trial = one game.** The dashboard scheduler polls ESPN for upcoming games (default **300s**) and auto-launches per-game trials from source manifests (`trial_sources/{base,daily,pre,prod,image}/`). Trial ends on `GameResultEvent` → broker settles. Runtimes: local asyncio default, **Ray**-backed for distributed actors. **External agents** join via a gateway (SSE + RPC, agent-id auth) using the `dojozero-client` PyPI SDK + CLI — a wire protocol for bringing your own agent into a trial.

## 2. Data sources, endpoints, latencies, cadence

| Source | API | Auth/Cost | Cadence |
|---|---|---|---|
| ESPN (NFL/NBA/NCAA/soccer) — `data/espn/_api.py` | **Unofficial** `site.api.espn.com` + `sports.core.api.espn.com` (scoreboard, summary, plays, rosters, standings) | None — free, undocumented | Pre-game: 120s/60s/30s; **in-game: 60s/15s/10s** (auto-switches on game status) |
| Polymarket — `data/polymarket/_api.py` | Gamma API (documented) | None — free | 300s pre-game, dynamic in-game |
| X/Twitter — `data/socialmedia/_api.py` | X API via `xdk` | Bearer token (realistically paid tier) | Watchlist-driven |
| Web search — `data/websearch/_api.py` | **Tavily** SDK | API key (free tier exists) | On-demand per trial |

**Best pattern — LLM-processed pre-game pipeline** (`nfl/_datastream.py`): raw feeds don't reach agents directly. `WebSearchEventMixin` subclasses emit typed events — `injury_report`, `power_ranking`, `expert_prediction`, `pregame_stats`, `twitter_top_tweets` — each built by a Tavily search whose results are **summarized by an LLM** (`BaseDashscopeProcessor`). Unstructured web → LLM extraction → typed event → agent. No websockets anywhere; "realtime" is minute-scale polling.

## 3. Model/prediction layer — the mechanism

**There is no statistical model. None.** The mechanism is: **event stream → sport formatter → persona system prompt → ReActAgent (LLM) → broker bet tools.**
- **LLM pool** (`agents/llms/default.yaml`): qwen3-max + deepseek-v3.2 via **DashScope**, claude-haiku-4-5, gemini-3-pro-preview, gpt-5-mini, grok-4-1-fast-reasoning. Loader filters to configs with API keys set; qwen3-max first-listed (effective default). Alibaba-originated project; DashScope is home turf.
- **"Intelligence" = persona prompting.** The shark's edge is vibes; a `mystic` persona exists. Responses capped at 1–2 sentences.
- **Bets are the prediction output:** `place_market_bet_moneyline/spread/total` + `place_limit_bet_*` (limit = with probability threshold) against the broker, priced off Polymarket-implied probabilities.
- **No calibration, no confidence scoring, no ensembles, no feature engineering, no backtested edge.** The broker's per-agent PnL + arena leaderboard is the entire "evaluation."

## 4. State/persistence

- **Event sourcing:** `DataHub` persists **every event** per trial to **JSONL** (`outputs/nfl_betting_events-{espn_game_id}.jsonl`) — the best-engineered part.
- **Checkpoints:** JSON-serializable actor state → `dojozero-store/` (spec/result/checkpoints) for pause/resume.
- **Tracing:** full OTel spans per agent input/response; CoT parsed into `ReasoningStep`/`ToolCallStep`/`ToolResultStep`, mirrored to Alibaba SLS or Jaeger. Every LLM turn inspectable; arena UI supports replay.
- **Accuracy:** broker settles on `GameResultEvent`, keeps per-agent `Statistics` → leaderboard (Redis-optional cache). PredictionBroker variant splits fixed window pools (5000/4000/3000/2000/500) among correct predictors.
- **Learning: none.** No weight updates, no prompt tuning from PnL. New trial = same YAML.

## 5. Evaluation/backtest

`docs/backtesting.md` + `data/_backtest.py`: **backtesting = event replay.** Replay a trial's JSONL through the same agent stack at adjustable speed (`--speed`, `--max-sleep`), sourcing logs from disk, SLS (`sls://<trace_id>`), HTTP, or globbed multi-game runs. This is **behavioral regression testing, not statistical backtesting** — no walk-forward, no train/test split, no Brier/calibration metrics.

## 6. Scale/limits

- **Throughput:** ~6 agents/game; a full NFL slate ≈ 80–100 asyncio actors on one box, fine. Binding constraint is the 180s LLM throttle (~15–25 turns/agent/game).
- **Cost shape: data ~$0** (ESPN unofficial + Polymarket free; Tavily free tier; X API the only real data cost). **LLM inference is the entire budget** — dominated by agents × turns × context; the throttle + 102k-token offload is the sole cost governor, and it's well designed. A slate weekend: single-digit dollars on qwen/deepseek, tens on frontier models.
- **Hard limits:** unofficial ESPN API (no SLA, can throttle); Polymarket Gamma rate limits; gateway rate limiting exists. Infra (Redis, SLS, Ray) all optional.

## Single most portable idea

**Event-sourced DataHub + JSONL replay as the backtesting substrate.** The live path *is* the backtest path — record the signal firehose as immutable events, replay candidate rules against history with identical code. This maps directly onto the total-signal build-order step 6 ("backtest every rule before it ships"). Secondary: the **typed pre-game event pipeline** (Tavily/X → LLM summarization → `injury_report`/`power_ranking`/`expert_prediction` schema events) — a clean template for the off-field intake lane, with the LLM doing extraction into a schema instead of free text.

## Maturity verdict

**Working demo scaffold with real plumbing, not a working prediction system.** Infrastructure is genuinely solid — actor model, event sourcing, replay, tracing, checkpointing, Ray, external-agent gateway, scheduler, 61 test files, CI. But the "prediction" half is theater: persona-prompted LLMs placing vibe bets against Polymarket-implied odds, zero statistical content, zero calibration, zero learning, replay mislabeled as backtesting. It's an *agent competition arena*, not a sportsbook-beating engine. Two-month commit silence confirms: reference architecture, not a living project.

## DojoZero vs Garrett's setup

**DojoZero ahead:** (1) event sourcing + replay as backtest substrate; (2) machine-joinable external-agent wire protocol (vs the human-readable bus markdown); (3) auto-scheduling — discovers games, spins up per-game trials, zero human input; (4) full-fidelity OTel tracing of every agent turn with replayable UI; (5) the 180s LLM throttle + 102k-token offload as a simple inference-budget design.

**Garrett ahead — decisively:** (1) **DojoZero has no model** — GSE is a real prediction system (NGS, projections, optimizer, exposure control, payout sim, calibration) vs their `mystic` persona's horoscope; (2) signal depth — nflverse, NGS, Sleeper market signals, 5,142-row game_signals table, backtest-calibrated total-signal taxonomy vs ESPN scoreboard + Polymarket + web snippets; (3) full DFS layer (branch-and-bound optimizer, correlation stacking, payout sim) — DojoZero has no lineup concept; (4) his benchmark-and-backtest-before-shipping doctrine is the evaluation discipline DojoZero lacks.

**Net:** mine it for infrastructure patterns (event log as backtest substrate, gateway protocol, scheduler, throttle/offload cost design, typed LLM-extracted pre-game events). Ignore everything about how it predicts — there is nothing there to learn.
