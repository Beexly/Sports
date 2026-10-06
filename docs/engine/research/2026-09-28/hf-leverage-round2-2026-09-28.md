# Hugging Face leverage — round 2: the non-obvious plays (2026-09-28)

## STANDING DOCTRINE — INGEST AND LEARN (Garrett, 2026-09-28, HARD)

**DO NOT CLAIM THINGS ARE DEAD UNTIL TESTED AND CITED AND CONFIRMED.** Round-1 of this
inventory wrongly discarded sports predictor Spaces and NFL datasets as "dead"/"SKIP" without
testing them. Garrett overruled it: we have thrown away too many things without his consent.
Standing rule: **WE INGEST, WE LEARN** — we do not use commercial data commercially, we do not
sell their data; we learn from it with intelligence and reasoning, then give our own analysis.
Rules applied throughout this report:
- No DEAD/SKIP/USELESS verdict on anything not personally run/tested with a citation to the test.
- Default verdict for anything untested: **UNTESTED — QUEUED FOR EVALUATION**, with the test defined.
- License facts (CC-BY-NC etc.) are stated as verified facts; a restrictive license means
  "research/learn-only, not in product" — never "throw it away."
- Likes/stars are not evidence of deadness.

Round-1 covered the model/dataset catalog (Qwen3 on ZeroGPU, bge-m3 RAG, Parakeet, FLUX,
Chronos-later). This round covers everything else: platform plays, cost arbitrage, data
infrastructure, marketing, and the creative angles round-1 missed.

---

## Corrections to round-1 (doctrine applied)

| Round-1 verdict | Corrected status |
|---|---|
| NFL HF datasets: "unlicensed scraps, SKIP" | **UNTESTED — QUEUED FOR EVALUATION.** License fact: none declared on any of them (verified via API 2026-09-28). Test: download the top 5 by likes, inspect schema/coverage, diff against nflverse, write up what feature ideas or labeling tricks we learn. Learn-only regardless of license. |
| Sports predictor Spaces: "all dead, 0–1 likes, SKIP" | **UNTESTED — QUEUED FOR EVALUATION.** Likes are not evidence of deadness. Test: call each live Gradio API for the next 4 weeks of games, log every prediction, score vs outcomes, and write up what methodology we can learn. Our engine stays home-grown; their methods are the lesson. |
| SportsMOT (player tracking eval): "SKIP for product" | **License fact: CC-BY-NC-4.0 (verified).** → research/learn-only for the tracker eval harness, not in product. Queued for evaluation when detector wiring starts. |
| Salesforce/moirai time-series: implied skip | **License fact: CC-BY-NC-4.0 (verified).** → learn-only candidate for temporal-modeling study, not in product. Queued. |
| OmniVoice CC-BY-NC flag (2026-09-13 voice tests) | Still **unresolved** → research-only until the license question is settled. Queued. |

---

## Track 1 — Org-wide mentions (lane A: repos beyond Sports)

Full audit at `/home/hatch/workspace/tmp/hf-inventory/laneA-missed-mentions.md`.
Method: GitHub code search across Beexly/autonomous-revenue-engine and Beexly/agent-bus,
13 terms, hit files pulled and commit-verified.

**Findings:**
- **autonomous-revenue-engine: clean.** Zero HF terms anywhere. Its imaging lane runs on
  commercial image APIs (Seedream 4.5, GPT Image, FLUX.2 Pro, Kling O1 Image, Nano Banana) —
  no hidden HF dependency, and no HF plan exists there for Kit/POD/signage/voice/video.
- **agent-bus: 8 mention rows, all in handoff/spec markdown, zero wired code.** Notable:
  a scouted HF-datasets task (2026-09-18); a cited HF zero-shot classifier inside a
  third-party video assessment (2026-09-25, verdict in-doc: LEARN the architecture);
  the **E1 movement-model build specs (2026-09-26)** that design a ZeroGPU Spaces
  training/inference path (`POST /predict/movement` endpoint) — spec only, unbuilt;
  the HF 3D-generation pipeline (TRELLIS.2 MIT, Hunyuan3D, Pixal3D Gradio demo) as a
  Kit-store design reference (2026-09-12).
- **Org-wide verdict:** still zero wired HF in any executable code in any repo — corroborates
  round-1. The org has independently converged on ZeroGPU as the plan-of-record GPU path in
  two separate specs, neither executed.

---

## Track 2 — Inference provider arbitrage (lane B)

Full tables at `/home/hatch/workspace/tmp/hf-inventory/laneB-cost-arbitrage.md`.
All numbers verified live 2026-09-28 from provider pricing pages/APIs.

### The arbitrage is real but the absolute dollars are small — the wins are in free tiers

| Workload | Best route found | Price | vs current |
|---|---|---|---|
| 8B-class chat (paid lane) | HF router → Novita/DeepInfra Llama-3.1-8B | $0.02–0.035/1M tokens | ~2× cheaper than OpenRouter's identical model ($0.05/$0.08) |
| 8B chat (free) | NVIDIA NIM free tier (40 RPM, 10k req/day) | $0 | keep first in cascade with retries |
| Embeddings batch (10M tokens, bge-m3) | HF → Novita | $0.01/1M → **$0.10 one-shot** | OpenRouter has no embeddings offering at all |
| Transcription (10k min/mo) | **Groq direct whisper-large-v3-turbo** | **$0.00067/min → $6.70/mo** | ~9× cheaper than OpenAI whisper-1 ($60/mo) |
| Transcription via HF token | HF → DeepInfra Voxtral-Mini | $0.0010/min → $10/mo | still 6× cheaper than OpenAI whisper-1 |

### ZeroGPU is NOT a fleet-inference arbitrage (proven with math)
- 5 min/day free ≈ 30–45k tokens/day ceiling for 8B chat — 1M tokens/day is ~25× over quota.
- PRO 40 min/day ≈ 240–360k tokens/day — still under 1M/day.
- Quota is reserve-then-settle on declared duration; overflow pricing ($1/10min = $6/hr)
  works out to ~$13.90/1M tokens — **~400× the Novita API rate**. Never overflow for chat.
- ZeroGPU = demos and one-off GPU experiments, not the pipeline.

### Fleet routing (recommended)
Small chat: NIM free first (with retry logic) → HF router (Novita/DeepInfra) as the paid
fallback → OpenRouter only for models absent from HF providers. Transcription: batch it
through Groq direct or HF → DeepInfra/Together. Embeddings: one-shot via HF → Novita or free
CPU. GCP $300: untouched, final phase only.

**Catch to watch:** NVIDIA announced a **$12.93B agreement to acquire HF (2026-09-03)** —
the NIM and HF lanes may converge; watch terms. Also: OpenRouter top-ups carry a ~5.5% fee.

---

## Track 3 — The Hub as fleet infrastructure (lane C)

Full findings at `/home/hatch/workspace/tmp/hf-inventory/laneC-platform.md`.
Account facts (live API, 2026-09-28): Garrett's account is **Beexly, `isPro: true`,
`canPay: true`, prepaid billing** — he already qualifies for paid-gated features.
**But `orgs: []` — no Beexly org exists.** Creating the org is the one prerequisite tap
for fleet-owned dataset/Space repos and shared billing.

### Datasets as the fleet data lake — USE for versioned data, never as a database
- Parquet + git versioning + private/gated repos + streaming/column-pushdown partial reads —
  all real. PRO = 1 TB private included ($18/TB/mo above). No per-repo cap; 200 GB/file
  recommended (500 GB hard); <100k files/repo.
- Concurrent writes: each commit atomic, but **no cross-commit lock** (last-writer-wins);
  use `parent_commit` optimistic concurrency or append-only unique filenames. HF's own
  doctrine: "a git repository is not meant to work as a database with a lot of writes."
- Verdicts by data type: **backtest sets + calibration tables + arXiv embeddings → USE**
  (immutable-ish, read-heavy, versioning gives reproducibility). Odds snapshots → hot in
  Neon, cold archive shards on Hub only. Live predictions/operational state → Neon stays
  system of record. Large private media blobs → LATER.

### Gradio MCP — Spaces as MCP tools — SHIPPED, pilot now
`demo.launch(mcp_server=True)` → `https://<space>.hf.space/gradio_api/mcp/` — one config
entry in any Claude/OpenCode-style client, and the Space's endpoints become tools.
Private Spaces work via bearer token. **Sharp edge (official HF course): Gradio's `auth=`
does NOT protect the MCP endpoint — use private Spaces.** ZeroGPU-backed MCP calls burn
the *caller's* quota (shared across the fleet on one token — mint one fine-grained token
per agent). Sleeping free Spaces (idle ~2 days) break tool calls — plan retries/warm-up.

### Scheduled Spaces — use HF Jobs, not Space-native cron (doesn't exist)
`hf jobs uv run script.py --schedule "@daily"` / CRON syntax, GPU flavors, env/secrets —
the real mechanism for daily analytics pulls and money-sprint tasks. Jobs are a fresh
container per run: state lives in dataset repos (composes with the data-lake pattern).
Webhook-triggered Jobs also exist.

### Dedicated Inference Endpoints — the upgrade path (LATER)
Verified pricing (official, updated 2026-09-17): T4 $0.50/hr, L4 $0.80, A10G $1.00,
A100 $2.50, H200 $5.00 — per-minute billing, scale-to-zero. **Break-even rule:** stay on
ZeroGPU inside the PRO quota ($0); when sustained GPU use routinely exceeds ~40 min/day
(~$4/day overage), a scale-to-zero dedicated T4/A10G wins on cost alone (12× cheaper per
GPU-minute than ZeroGPU overflow). For plain LLM text at low/medium volume, per-token
Inference Providers are usually cheaper than both.

---

## Track 4 — Creative plays (lane D, doctrine-applied)

Full findings at `/home/hatch/workspace/tmp/hf-inventory/laneD-creative.md`.

### Spaces as marketing — measured traffic says: build as product, not as acquisition
Top Spaces overall: 5.4K–16.6K likes (image-gen toys, leaderboards). The **entire**
sports/NFL/fantasy category: best sports space has **10 likes** (DavidPagnon/sports2d),
best NFL **2**, the only fantasy-football space with a like has **1**. There is no sports
audience on the Hub — "build a projections explorer and HF's visitors find it" is dead as
an acquisition thesis. What IS real: a projections/rankings explorer Space (projections +
rankings ONLY per the public doctrine — zero internals, zero NGS names) is **free hosted
product with a public URL**, built in a Gradio afternoon, with traffic driven from X.
For Kit: free hosted lead-magnet demos are a genuine upsell — B2B only, because the
`huggingface.co/spaces/...` URL is tech-visible (conflicts with Vow & Post's invisible-tech
doctrine for consumer brands).

### AutoTrain — confirmed unmaintained (cited), capability lane stays open
The official docs carry the banner: "This project is no longer maintained… We recommend
Axolotl, TRL, or transformers.Trainer." That is a cited fact, so AutoTrain is excluded as a
*dependency* — not a judgment call. The no-code fine-tune *capability* (pick-confidence
classifier, lead scoring, content tagging) stays open via maintained tools; none of those
three problems needs HF at all (sklearn/XGBoost or a small TRL script on rented GPU).

### Training on ZeroGPU — UNTESTED hypothesis, test defined (not "killed")
Constraints are cited docs facts: free 5 min/day caller quota, ~60s default per-call GPU
window with hard wall-clock kill, GPU detaches per call, no persistence. The <2M-param
movement model is technically checkpointable (optimizer state ~8–24MB), so the plan is
mechanically possible. **Per doctrine we don't kill it on paper — we define the test:**
run a checkpointed training loop on the movement model via ZeroGPU, measure wall-clock
and $/step vs one A10G hour ($1.05) or the GCP trial. Hypothesis: rented compute wins by
a mile. Run it, cite it, then decide.

### Competitive signal — the distillation endgame (founder read)
Verified 2026-09-28: MiniMax-H3 5.7K likes / 3.6M downloads; FastVideo FastH3 4-step DMD2
distillation; FastWan 3-step at 16 FPS; ternary 2-bit 27B quants at 3.45M downloads;
TimesFM-3.0 the lone trending time-series model (902 likes / 1.29M downloads).
Founder read: **any moat built on "faster/cheaper video model" or "we wrapped the hot open
model" has a half-life measured in weeks** — distillation commoditizes it before you can
price it. Build where distillation can't reach: proprietary data loops (his calibration
data), distribution (the X audience), workflow lock-in. Never the model layer.

### "Cracked models" — direct answer
They exist openly at scale (uncensored Qwen-Image GGUF at 1.06M downloads, abliterated
27Bs, uncensored DeepSeek forks; HF has never blanket-banned them — pressure may build
under Nvidia ownership). Founder-frame: **no tested use in any of his three lanes.**
Abliteration removes refusal reflexes; it adds zero predictive capability (GSE), buys
brand risk for capabilities customers never need (revenue engine's invisible-tech
doctrine), and his fleet runs on API models he can't abliterate anyway. The one
semi-legit argument (refusal-drops breaking agent loops, one builder measured 5.6%→0.4%)
is **untested in his fleet** — test defined (benign-prompt refusal benchmark on his
current models) if it ever becomes a real problem. Not a current priority; risks
documented (ToS shift under Nvidia, brand contamination), test defined if wanted.

---

## NEW TOP-10 — "outside the box" action list (ranked by dollar impact × reversibility)

1. **[HIGHEST LEVERAGE] Create the Beexly org + land the fleet-infrastructure stack.**
   One org-creation tap unlocks fleet-owned private dataset repos and shared billing.
   First afternoon's work ($0, fully reversible): private dataset repo with a versioned
   backtest set + a private Qwen3 internal-LLM Space exposed as an **MCP tool** for the
   fleet. This converts HF from "model catalog" into the fleet's operating system —
   every utility becomes a callable tool, every dataset becomes versioned and
   token-scoped. It compounds every item below.
2. **Reroute the fleet's paid small-chat lane: NIM free first → HF router
   (Novita/DeepInfra Llama-3.1-8B) → OpenRouter last.** ~2× cheaper than OpenRouter on
   identical models; HF free tier ($0.10/mo ≈ 2.9M tokens) can carry the lane at $0.
   Config change, instantly reversible.
3. **Move transcription batch to Groq whisper-large-v3-turbo direct ($0.00067/min).**
   ~9× cheaper than OpenAI whisper-1 — the single biggest per-workload dollar arbitrage
   found ($60 → $6.70 per 10k min/mo). Batch it; nothing here is latency-sensitive.
4. **Scheduled HF Jobs for the money-sprint/analytics crons.** Native CRON-scheduled
   compute that doesn't die with the VM, writing results to versioned dataset repos.
   Replaces fragile VM crons.
5. **Run the ingest-and-learn evaluation protocol on the queued assets.** NFL datasets:
   download top 5 by likes, schema-diff vs nflverse, publish learned feature ideas.
   Sports predictor Spaces: 4-week prediction log vs outcomes, publish methodology
   lessons. This is the doctrine made operational — and it's where the "dead" verdicts
   were hiding value.
6. **Ship the projections/rankings explorer as a public Gradio Space** (projections +
   rankings ONLY per doctrine). Free hosting, X-driven traffic, zero organic-HF
   expectations. Doubles as the Kit demo pattern for B2B lead magnets.
7. **FLUX.1-schnell ZeroGPU Space for POD/signage design generation** (Apache-2.0,
   commercial-safe). Feeds the 5 trademark-safe POD concepts and SignPreview mockups.
   Revenue-lane, not GSE.
8. **One fine-grained HF token per agent** (the "Aisha" pattern already on his account),
   scoped per-repo. Zero cost, kills the shared-credential risk the MCP/ZeroGPU lanes
   introduce.
9. **Run the ZeroGPU-training measurement test** on the <2M-param movement model before
   any build decision: checkpointed loop, $/step vs A10G. Decide on numbers, per doctrine.
10. **Watch-item, no action: Nvidia→HF acquisition terms.** If the NIM and HF lanes
    converge, re-price the whole stack. Revisit quarterly.

**Explicitly NOT in the top-10 (doctrine-compliant reasons):** sports-predictor Spaces
and NFL datasets as *products* (unproven — in the evaluation queue, item 5); ZeroGPU as
fleet inference (math disproves it); dedicated endpoints today (no load justifies it);
AutoTrain as a dependency (officially unmaintained — cited); cracked models (no tested
use, risks documented).

---

*Sources: lane files in `/home/hatch/workspace/tmp/hf-inventory/` (laneA-missed-mentions.md,
laneB-cost-arbitrage.md, laneC-platform.md, laneD-creative.md); HF Hub API, official HF docs,
Gradio docs, provider pricing pages — all verified 2026-09-28. Nothing pushed to any repo.*
