# awesome-llm-apps × GSE — Leverage Map

**Date:** 2026-09-29 · **Source:** Shubhamsaboo/awesome-llm-apps (140,163 stars, Apache-2.0, verified live 2026-09-29)
**Method:** full repo cloned (depth-1), three parallel inventory lanes (agent_skills catalog, 24 RAG tutorials, ~40 agent/app templates), consolidated and ranked.
**Standing rule applied throughout:** INGEST-AND-LEARN — learn the method, reimplement as GSE's own TypeScript. Nothing in this repo is reusable-directly: it is Python/Streamlit/LangChain/LlamaIndex/Agno throughout; GSE is TypeScript/Next.js/Neon. Every "ADAPT" below means pattern reimplementation, never copied code. License note: all Apache-2.0 **except `first-reader`, whose license field is blank — verify before reusing.**

**GSE threads referenced:** T1 variance model + nflverse projection source · T2 live DFS slate provider · T3 adjustment layer · T4 player signals table (EMPTY) · T5 off-field intake · T6 backtesting every rule · T7 rankings program · T8 agent-fleet skills + X sweeps.

---

## (a) Ranked leverage map

### Tier 0 — Do first (small effort, immediate payoff)

**1. `thinking-out-loud` (skill) — ADOPT, small.**
A protocol contract: act on NOTHING until an echo brief (mission, locked decisions, flips, parked tangents, model's inferences quarantined from the user's words) is approved. GSE application: protects the highest-value input channel — Garrett's voice dictation — against the fleet's most expensive failure mode (confident misread → hour of wasted build). Protocol-only, no code. Ships as a fleet skill under `~/workspace/skills`.

**2. `toonify_token_optimization` — ADAPT, tiny.**
TOON (Token-Oriented Object Notation): CSV-like compactness, ~64% token reduction vs JSON for tabular data. GSE application: serialize tabular projection/actuals, slate data, and signal rows as TOON instead of JSON in every LLM-heavy prompt — X sweeps, backtest harness, signal intake, QC loop. Near-zero effort, applies to all threads immediately. Adopt the format in prompts (or a toonify npm equivalent).

**3. `rag_failure_diagnostics_clinic` — ADAPT, small.**
Framework-agnostic P01–P12 RAG failure taxonomy + LLM triage into minimal structural fixes (~200 lines, most portable item in the repo). GSE application: adopt the taxonomy NOW for backtesting/pipeline diagnostics (T6) and feed it into the DFS lessons-learned log — a shared vocabulary for "why did this break" that the fleet reuses on every incident. Near-zero cost.

**4. `commit-archaeologist` (skill) — ADAPT, small.**
Offline git-history walker reconstructing WHY code exists (origin, timeline, co-changed files, intent signals, change risk). GSE application: reimplement as `gse-why` — pre-refactor digs on exactly the modules the build threads touch (e.g. *why does `activeDfsSlate()` fall back to sample data?*), and surface workaround/temporary markers before backtesting work lands on shared modules. Runs offline; small.

**5. `dependency-doctor` (skill) — ADAPT, small.**
Offline manifest autopsy (stdlib shadowing, abandoned backports, unpinned deps, intra-manifest conflicts) for npm/pip/package.json. GSE application: run before deploy attempts and on PRs touching deps — low-frequency but real; directly relevant given the 50+ failed Vercel deploys in history.

### Tier 1 — Foundation (the trust layer)

**6. `scope-creep-detector` (skill) — ADAPT, medium.**
Diffs a change against its stated intent → in-scope vs likely-creep, new deps, API renames, config/CI edits, keep/split/justify table. GSE application: **the missing PR gate.** Run on every coding-agent/Hermes PR before merge into Beexly/Sports — directly addresses the recurring stranded/unrelated-files commit failure mode. Reimplement as `gse-scope-check`.

**7. `hybrid_search_rag` — ADAPT, medium.**
Hybrid dense (pgvector) + sparse (full-text) retrieval with rerank on Postgres — maps 1:1 to Neon. GSE application: **the foundation RAG for the internal research-corpus QC loop** — retrieve relevant past findings (arXiv reads, NGS studies, methodology notes) when Motif reviews builder output. Internal-only behind the fence. Medium effort, highest structural payoff.

**8. `agentic_typed_rag_pydanticai` — ADAPT, small–medium.**
Typed answers with exact-quote citation verification + deterministic refusal gate on weak retrieval. GSE application: QC-loop answer integrity — **the HONESTY doctrine as code** (refuse rather than answer from thin evidence). Zod is the TS equivalent. Small–medium.

**9. `corrective_rag` — ADAPT, medium.**
Retrieve → grade relevance → transform query → web-fallback state machine. GSE application: self-correcting retrieval for the QC loop — reformulate and retry instead of answering from thin evidence. Pair with the `ai_blog_search` decision-policy primitive (cleaner than its linear stages) for the competitor-intel lane.

**10. `advisor-orchestrator-worker` (skill) — ADAPT, medium.**
Three-tier protocol: cheap parallel workers, strong advisor consulted only at commitment boundaries, verification gates, budget accounting. GSE application: formalizes Motif's existing fleet pattern into a repeatable per-thread protocol. Its "verify by exercising the deliverable, never grepping a README" rule is Garrett's file-verifiable completion standard, codified. Adapt model IDs (defaults are Gemini 3.8 Flash via Antigravity + Claude advisor).

**11. `evals/` 5-tier framework — ADAPT (meta), medium.**
Structural lint + security scan + trigger/routing evals + deterministic script tests + behavioral evals; every registered skill ships executable evals. GSE application: adopt as **the fleet's skill-shipping gate** — no skill lands under `~/workspace/skills` without passing. The security tier matters: skills run with agent permissions.

### Tier 2 — Intake (fills T4, powers T5)

**12. `devpulse_ai` (multi-agent signal pipeline) — ADAPT, medium.**
Sources → deterministic SignalCollector (normalize, dedupe via source:id, filter — "agents ONLY where reasoning required") → RelevanceAgent scores 0–100 (novelty/impact/actionability/timeliness) → risk assessment → synthesized digest. GSE application: **this IS the T4/T5 intake architecture.** Swap sources for injury reporters, beat-writer news, weather, depth-chart changes; deterministic collectors write raw rows to Neon, LLM scorers score relevance/risk, digest feeds the adjustment layer (T3). The cost philosophy matches GSE's rules.

**13. `always_on_hn_briefing_agent` — ADAPT, low–medium.**
Always-on briefing agent with scout/scheduler/delivery split (scan → rank → brief → deliver), self-contained by design, ships unit tests. GSE application: **the upgrade pattern for the X sweeps and new watchers** — injury-news watchers, odds-move monitors. Delivery becomes an agent-bus message instead of email. Reimplement scout logic; keep the module split.

**14. `earnings_call_analyst_agent` — ADAPT, medium.**
YouTube earnings call → playback-synced analyst workspace: agents surface numbers, tone shifts, filing context, surprises, every insight tied to the quote that triggered it. GSE application: **coach press conferences / injury-report pressers as a signal source (T5)** — ingest presser → transcript → surface coach-speak on availability and tone shifts ("we're evaluating"), quote-attributed. Also feeds the content lane with real quotes for X posts.

**15. `web_scraping_ai_agent` — ADAPT, low–medium.**
ScrapeGraphAI SmartScraperGraph: natural-language prompt → structured extraction from any site. GSE application: prompt-driven structured extraction as the fallback when no API exists — **T2 (slate data) and T5 (news/odds pages)**. ⚠️ ToS caution: do NOT point at DraftKings/FanDuel against their terms; prefer official/intake APIs; use for public news/odds pages only. Reimplement as "LLM over fetched HTML with schema prompt" — no TS port of ScrapeGraphAI needed.

**16. `ai_data_analysis_agent` — ADAPT, medium.**
Natural-language EDA over tabular data: LLM writes SQL/pandas (DuckDB + Pandas tools), executes, reports. GSE application: **variance-model calibration harness (T1)** — "why is our QB ceiling biased high in dome games?" → agent queries Neon, runs dispersion analysis, reports. Replaces hand-written ad-hoc SQL. Reimplement the tool belt in TS against Neon.

**17. `ai-deep-research-agent` (generative UI, Next.js) — ADAPT, medium.**
Deep research assistant: plans, searches, writes to a virtual filesystem, renders each tool call as a live card. **Next.js 16 + CopilotKit — GSE's own stack.** GSE application: internal analyst-desk deep-research UI for off-field intake (T5) — plan → research player news → write structured report → live tool cards. Front end nearly template-level; agent backend reimplemented as TS endpoints. Internal-only per the fence.

### Tier 3 — Eval & provenance (T6, T7, brand)

**18. `gpt_oss_critique_improvement_loop` — ADAPT, low.**
Automatic critique + improvement loop: parallel candidate generation → critic identifies flaws → revise → repeat (~60 lines of logic). GSE application: **the T6 eval-harness loop — propose → backtest → critique failures → revise rule → re-backtest**, with a stopping criterion. Parallel-candidate generation also maps to mixture-style projection synthesis (T1: multiple candidates, synthesize, spread → floor/ceiling). Low effort, high fit.

**19. `mixture_of_agents` — BORROW-IDEA, low.**
Layered proposers + aggregator. GSE application: **mixture-style projection synthesis (T1)** — multiple projection sources/methods as proposers, aggregation with dispersion → floor/ceiling from the spread. Method, not code.

**20. `trust_gated_agent_team` — BORROW-IDEA, high.**
Multi-agent pipeline where every action is recorded in a hash-chained audit trail. GSE application: **pick provenance** — "every pick public, every result posted" is the brand promise; a hash-chained trail (inputs → engine version → output → result) makes the public record tamper-evident. Real brand value, real work. Longer-term.

**21. `agentic_rag_math_agent` — BORROW-IDEA, medium.**
Benchmark harness + logged 👍/👎 human-feedback loop. GSE application: borrow both for the T6 backtesting eval harness and as a QC feedback signal.

**22. `first-reader` (skill) — ADAPT, medium.**
Simulates real readers: skim gate, no-lookahead timed reads with quit points, next-day recall test, trust ledger of costly vs free signals. Never rewrites. GSE application: **copy QC for X posts, pick write-ups, DFS packets** — does it hold attention, what survives recall. The costly-signals ledger fits the "show the work" doctrine. ⚠️ Verify the blank license field before reusing.

### Tier 4 — Internal tooling & second-order plays

**23. `local_hybrid_search_rag` — ADAPT, medium.**
Fully local hybrid search (llama.cpp + bge-m3 + FlashRank, runs on 8GB laptop). GSE application: **zero-marginal-cost retrieval tier**; synergizes with the bge-m3/HF-token lane. Medium.

**24. `rag_database_routing` — ADAPT, medium.**
LLM router across specialized vector stores with web fallback. GSE application: direct analog of the engine's source-router — route queries across arXiv / NGS / methodology / live-engine stores. Medium.

**25. `multimodal_video_moment_finder` — BORROW-IDEA, medium.**
ffmpeg frames at 1fps → cross-modal embeddings → cosine search → jump to timestamp; no transcription. GSE application: **clip-sourcing pipeline for the X video operation** — locate a specific play in full-game footage for the seconds-long telestrated clips (standing rule: real footage, 2–4s, commentary-led). Frame-embedding search beats scrubbing. Frame embeddings in Neon/pgvector.

**26. `needle` — BORROW-IDEA, medium.**
Semantic "find what you mean" search UI over your own text, sentence-level highlighting. GSE application: a Needle-style semantic finder over `docs/research/` ("find the variance-model backtest notes") beats grep. Internal tool. pgvector instead of Typesense.

**27. `ai-knowledge-explorer` — BORROW-IDEA, high.**
Drop docs/code in; extracts entities/relationships, renders interactive knowledge graph. GSE application: knowledge-graph navigation over the research corpus / engine docs. Internal only. High effort — park behind the hybrid RAG.

**28. `ai-dashboard-canvas-agent` — BORROW-IDEA, medium–high.**
Agent populates live charts/metrics into a Canvas dashboard instead of streaming text. GSE application: **internal-only calibration dashboards (T1)** — "show me variance-model calibration by position" → agent builds the dashboard live. Fence-safe (never public). CopilotKit integration work.

**29. `xai_finance_agent` — BORROW-IDEA, low.**
Live market data + web search tooling composition (Agno + Grok + YFinanceTools). GSE application: **the tooling pattern for a live-data agent** — swap YFinance for The Odds API; Grok's real-time X-native search for sentiment/line-movement chatter. Borrow the composition, not the finance domain.

**30. `ai_journalist_agent` — BORROW-IDEA, low–medium.**
Research → write → edit pipeline producing high-quality articles. GSE application: content lane — automated draft pipeline for internal analyst briefs and (Garrett-approved) X thread drafts in the dry-humor voice. Never posts without approval (existing rule).

**31. `autonomous_rag` — ADAPT (light), small.**
pgvector-on-Postgres RAG + conversation persistence. GSE application: validates "Postgres is the whole stack" (Neon-native); fold its persistence layer into the hybrid RAG (#7).

**32. `agentic_rag_with_reasoning` — BORROW-IDEA, small.**
Visible reasoning trace side-by-side with answer. GSE application: borrow the trace panel for QC reviews — Garrett wants to see the work.

**33. `ai_self_evolving_agent` (EvoAgentX) — BORROW-IDEA, high.**
Natural-language goal → auto-generated workflow → executes → **verifies and repairs** the code. GSE application: the verify-and-repair half is the interesting bit — generated backtest code that self-repairs on failure. Research flag, not a build.

**34. `ripple` — BORROW-IDEA, medium.**
Change one thing, find everything else that must change (consistency checking). GSE application: spec/AGENTS.md hygiene — a Ripple-style checker over repo docs ("this rule changed — these 6 docs contradict it") keeps the system of record coherent.

**35. `ai_fraud_investigation_agent` — BORROW-IDEA, medium.**
7 specialized tools over public data, cross-referenced to detect anomalies. GSE application: the method pattern for T4 — cross-reference public signals (news, weather, depth charts, practice reports) to flag anomalies (practice report contradicts injury designation).

**36. `research_agent_gemini_interaction_api` — BORROW-IDEA, medium.**
Multi-phase research + auto-generated TL;DR infographic. GSE application: auto TL;DR graphics for the weekly DFS packet (Garrett's required format: full write-up + graphics; packets are internal — fence OK).

**37. `contextualai_rag_agent` — BORROW-IDEA, small.**
LMUnit rubric-based answer evaluation. GSE application: borrow the eval-rubric concept for grading QC output. Do NOT adopt the managed platform (cost + doctrine).

**38. `vision_rag` — BORROW-IDEA (parked), large.**
Embed PDF pages as images, no OCR. GSE application: chart/table-heavy arXiv/NGS PDFs. Parked: paid APIs (Cohere Embed-4 + Gemini).

**39. `ai_x402_paying_agent` — BORROW-IDEA, research-grade.**
Agent with its own wallet pays for data via HTTP 402 micropayments. GSE application: contingency pattern for premium data feeds (odds/weather/injury) behind paywalls. Watch; don't build yet.

**40. `ai_startup_trend_analysis_agent` — BORROW-IDEA.**
Trend-mining skeleton over news. GSE application: line/projection-movement trend mining (T4). Method only.

**41. `rag_agent_cohere` — BORROW-IDEA, small.**
Cohere rerank + Command-R pairing. GSE application: vendor datapoint for the AI Gateway cost audit.

**42. `multimodal_agentic_rag` — BORROW-IDEA, small.**
3D embedding inspection view. GSE application: internal RAG debug tool; adopt the invariant "same retrieval packet feeds answer and citations."

**43. `ai_blog_search` — BORROW-IDEA, medium.**
Rewrite/answer/retrieve-more agentic decision policy. GSE application: cleaner decision primitive than corrective_rag's linear stages; domain maps to the competitor-intel lane.

**44. `multimodal_ai_agent` — BORROW-IDEA, low.**
Quick video Q&A over pressers/clips. GSE application: prototype-grade analyst-desk tool (lighter cousin of the presser pipeline).

**45. `chat_with_X_tutorials` — BORROW-IDEA (sparse), low.**
Note: "X" = chat-with-anything, NOT Twitter/X analysis — no X-specific analysis found. GSE application: `chat_with_youtube_videos` pattern → conversational Q&A over presser/game video transcripts.

### Also noted (not ranked — process, not product)

- **`ai_agent_framework_crash_course`** (Google ADK + OpenAI Agents SDK crash courses): onboarding material for Hermes on agent frameworks. Not leverage per se; useful reference.
- **`chat_with_research_papers`** (chat with arXiv conversationally): pattern already covered by the hybrid-RAG cluster; no separate value.
- **`headroom_context_optimization`**: context-optimization demo; TOON (#2) is the actionable half of that folder.
- **`self-improving-agent-skills`**: folder is EMPTY, not in the registry — nothing to evaluate yet. Revisit when published.

---

## (b) DON'T-BOTHER list

**Wrong domain (no transferable method):** `ai_breakup_recovery_agent`, `ai_meme_generator_agent_browseruse`, `ai_music_generator_agent`, `ai_medical_imaging_agent`, `ai_life_insurance_advisor_agent`, `ai_travel_agent`, `ai_blog_to_podcast_agent` (no GSE audio lane), `ai_reasoning_agent` (demo with no method), `chat-with-tarots`, `resume_job_matcher`, `thinkpath_chatbot_app`, `ai_agent_governance` (no fleet-safety problem to solve), `ai-financial-coach-agent`, `project-graveyard` (autopsies dead side projects — GSE doesn't have that problem; its one idea, "check prior attempts," is already fleet doctrine), `ai_email_gtm_reachout_agent`/`ai_email_gtm_outreach_agent` (Kit outreach has its own skill).

**Single-agent wrong-domain batch:** `ai_customer_support_agent`, `ai_personal_finance_agent`, `ai_health_fitness_agent`, `ai_meeting_agent`, `ai_recipe_meal_planning_agent`, `ai_consultant_agent`, `ai_movie_production_agent`, `ai_system_architect_r1`, `ai_investment_agent`, `ai_startup_insight_fire1_agent`, `windows_use_autonomous_agent` — all off-domain.

**Multi-agent wrong-domain batch:** `ai_mental_wellbeing_agent`, `ai_speech_trainer_agent`, `ai_home_renovation_agent`, `ai_aqi_analysis_agent`, `ai_codebase_migration_agent`, `ai_negotiation_battle_simulator`.

**Duplicates of better entries:** `agent_teams`, `multi_agent_researcher`, `ai_news_and_podcast_agents`, `ai_domain_deep_research_agent`, `product_launch_intelligence_agent`, `multi_agent_trust_layer` (dupes of #12/#17/#20); `ai_deep_research_agent` (single-agent, lighter dupe of #17); `agentic_rag_gpt5` (thin vendor demo); `agentic_rag_embedding_gemma`, `deepseek_local_rag_agent`, `gemini_agentic_rag`, `llama3.1_local_rag`, `local_rag_agent`, `qwen_local_rag` (all redundant with the local-hybrid #23 or generic); `rag-as-a-service` (paid Ragie.ai wrapper, zero architecture); `rag_chain` (baseline LangChain+Chroma; #7 does everything better).

**Framework demos, no product mapping:** `ai-mcp-app-builder`, `mcp-apps-generative-ui-showcase`, `ai-shadcn-component-generator`, `generative-ui-starter-project`, `cursor_ai_experiments`, `llm_finetuning_tutorials`, `llm_apps_with_memory_tutorials`, `release_radar_agent` (devops hygiene, park as CI-side idea).

---

## Recommended build order

**Phase 0 — this week (tiny/small, near-zero risk):** adopt `thinking-out-loud` as a fleet skill; adopt TOON in LLM prompts; adopt the P01–P12 failure taxonomy; reimplement `commit-archaeologist` as `gse-why`; add `dependency-doctor` to the pre-deploy checklist.

**Phase 1 — trust layer (the QC loop's foundation):** `scope-creep-detector` → `gse-scope-check` PR gate; hybrid RAG on Neon over the internal research corpus; refusal gate + Zod-typed citations (honesty as code); then the corrective-retrieval loop; adopt the 5-tier eval framework as the skill-shipping gate.

**Phase 2 — intake (fills T4, powers T5):** DevPulseAI signal pipeline → player signals table; always-on scout pattern for injury/odds/X watchers; presser-extraction pipeline; NL-EDA calibration harness for the variance model.

**Phase 3 — eval & provenance:** critique-loop backtest harness (T6); hash-chained pick provenance (longer-term brand play); deep-research analyst UI (internal).

**Phase 4 — internal surfaces:** calibration dashboards, semantic corpus finder, knowledge graph (last).

**Net inventory:** 45 leverage items (11 ADAPT-now, 34 ADAPT-later/BORROW-IDEA) + ~45 skips. Nothing is reusable directly — the entire repo is Python/Streamlit; every adoption is a TypeScript reimplementation of the method, which is exactly what INGEST-AND-LEARN prescribes.
