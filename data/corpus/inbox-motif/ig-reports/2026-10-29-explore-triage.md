# IG Keyword-Explore Triage — 2026-10-29 (midday window, closes 12:43 PM CT)

Source list: `~/workspace/ig-for-you-sweep/raw/2026-10-29-explore-candidates.md` (24 candidates from 24 search terms).
Rules honored: read-only throughout; nothing installed or run; no Instagram engagement/outreach; every unverified claim stays labeled.

---

## 1. codebase-memory-mcp — **FLAG**

**Repo resolved:** `DeusData/codebase-memory-mcp` — 47,781★, 3,929 forks, **MIT**. Created 2026-02-24; last push **2026-10-29** (active today). Native C backend.

**What it actually does.** A local code-intelligence layer for AI agents. It parses 162 languages (vendored tree-sitter grammars) into a **persistent knowledge graph** of the codebase — symbols, call chains, dependencies, docs, infrastructure — and serves it through **17 MCP tools**: hybrid search (SQLite FTS5 BM25 + bundled Nomic `nomic-embed-code` embeddings compiled into the binary — no API key, no Ollama, no Docker), callers/dependencies, file outlines, semantic search, and change-aware test selection ("CBM Lens"). Results are deliberately compact and paged. Indexing and querying run fully local; no hosted service. The installer auto-configures 45 agent clients (Claude Code, Cursor, etc.).

**What the "99% token cut" rests on.** The IG caption ("cuts token usage by 99%") cherry-picks the project's oldest, narrowest number:
- The project's **31-repository arXiv preprint** (arXiv:2603.27277, March 2026), cited in the current README, reports **10× lower token use and 2.1× fewer tool calls** vs file-by-file exploration, on the study's workloads.
- The ~99% figure matches an earlier five-query comparison in an old README revision: ~3,400 vs ~412,000 tokens on five **structural** queries (≈99.2% — on those five queries only).
- They also ship a `docs/MEASURING_SAVINGS.md` guide so users can measure on their own workload — good evidence hygiene.

So: the effect is real and unusually well-documented for this category; the defensible headline is **10×**, not 99%.

**Honest comparison vs Garrett's existing options.**
- **claude-mem** (today's trending deep dive): session/episodic memory — what agents did and learned across sessions. Different layer; complementary, not competing.
- **graphify** (today's X-sweep TEST candidate): builds a knowledge graph over code/docs for querying — the closest overlap. CBM's edges over it: MCP-native persistent *incremental* graph, local embeddings with zero external dependency, change-aware test selection, and a published preprint + measurement guide (stronger evidence discipline).
- **Risks:** young project (Feb 2026), single vendor org, a large C binary is a supply-chain trust decision, and graph freshness/index size on the Sports monorepo is untested.

**Verdict: FLAG** — the strongest code-context candidate of the day. Bounded trial shape when Garrett wants it: index one repo (Sports web app), run 5 structural questions through CBM vs the current grep/read workflow, compare tokens with their measuring guide. Not installed or run in this window (per rules).

---

## 2. thelocktalk anytime-TD splits — numbers hold (convention-dependent)

**Method.** nflverse play-by-play (official GitHub release CSVs), **regular season only**, touchdown plays only (`touchdown=1`, two-point attempts excluded), field position = `yardline_100` (yards from the opponent's end zone) at the snap. Work dir: `~/workspace/x-for-you-sweep/raw/repro-anytime-td/`.

**Scope honesty:** the claim covers 2010–2025 (16 seasons). Inside this window I computed **3 sample seasons — 2012, 2018, 2024** (1,377 rushing TDs, 2,596 passing TDs pooled). The full 16-season aggregation was **NOT COMPUTED**. Because "inside the N" is ambiguous, both readings are reported: inclusive (spotted at the N or closer, ≤N) and strict (spotted strictly inside, <N).

| Claim (since 2010) | Pooled sample, inclusive ≤N | Pooled sample, strict <N | Per-season range (inclusive) | Verdict |
|---|---|---|---|---|
| 74% of rushing TDs from inside the 10 | 75.2% | 72.9% | 73.0–76.4% | **CLOSE** — claim sits between the two conventions |
| 57% of rushing TDs from inside the 5 | 60.9% | 56.1% | 60.1–61.9% | **REPRODUCED** under the strict reading (56.1 vs 57); inclusive runs ~4 pts hot |
| 33% of rushing TDs from the 1-yard line | 33.1% | 33.1% | 31.8–34.5% | **REPRODUCED** |
| 22% of passing TDs from inside the 5 | 25.7% | 20.7% | 24.4–27.5% | **CLOSE** — strict reading is 1.3 pts under the claim |

**Bottom line:** the post's splits are real under the strict "spotted inside the N" convention and bracketed by the two conventions overall — nothing is contradicted. The method point underneath (rushing TDs are goal-line events — ~56–61% from inside the 5; passing TDs are not — ~21–26%) is fully supported by the data. Season-to-season stability is high (ranges above), so the 3-season sample is unlikely to flip on the full pull; the full 2010–2025 run remains the closing step.

---

## 3. Kimi K3.1 Pro claims (ohmo.ai caption) — checked against Moonshot official sources only

Official anchors: kimi.com's homepage currently leads with the K3.1 Pro launch; Moonshot's HF org (`moonshotai`) lists **Kimi-K3** weights (updated Sep 2) but **no K3.1 Pro repo as of Oct 29** — consistent with a pending weights drop. All four numbers trace to Moonshot's Oct 23, 2026 launch materials.

| Caption claim | Verdict | Basis |
|---|---|---|
| Full weights due Nov 4 | **CONFIRMED as Moonshot's announced commitment** — not yet fulfilled | Stated in Moonshot's launch; no K3.1 Pro weights on the official HF org as of Oct 29. Note: at 2.8T total parameters, self-hosting is not realistic on Garrett's hardware either way — the practical Kimi lane stays API/hosted, unchanged. |
| 65.7% Terminal-Bench 4.0 | **CONFIRMED as Moonshot's published figure; independently UNVERIFIED** | Moonshot's number (vs Opus 5.5 66.4%, GPT-6 Astra 58.2%). Moonshot ran its own model inside the Claude Code harness and took rival scores from leaderboards/reports. Artificial Analysis independently scores K3.1 Pro 55 on its Intelligence Index (4th overall) — corroborates "frontier-tier," does not replicate 65.7. |
| 1M-token context | **CONFIRMED** | Official spec: 1,048,576 tokens, native. |
| Hallucinations 23.4% → 8.3% | **CONFIRMED as Moonshot's claim; methodology in-house, independently UNVERIFIED** | Moonshot's own hardest internal factual test, claim-level error rates, K3 → K3.1 Pro. Direction plausible; exact numbers are vendor numbers. |

---

## 4. Quick verifications

- **Onyx platform:** Real — `onyx-dot-app/onyx`, **33,077★** (the caption's "28k" is stale; it has grown past it), pushed 2026-10-29, "Open Source AI Platform — AI Chat that works with every LLM," 50+ connectors consistent with the caption. One correction: the license is **not** a clean MIT — GitHub reports NOASSERTION (mixed licensing: open-source core plus separately licensed enterprise parts), so the caption's flat "MIT" is only partly accurate.
- **Saluki 27B:** Exists — `ConwayResearch/Underdog-Saluki-27B-1.0` on Hugging Face (629,102 downloads) plus multiple community GGUF quantizations (the "<8GB" local angle); a community release built on Qwen 3.8 27B as captioned, not a major-lab model.
- **OpenBot (IG explainer, simplifyinai Sep 2):** **No new facts** beyond today's trending deep dive (`~/workspace/trending-scan/2026-10-29-deep-dive.md` §5). The IG framing ("free, 100% open-source Grok-bot alternative; AI coworkers each with own browser/files/logins") matches the verified CopilotKit/OpenBot dossier (7,937★, MIT, beta template; per-coworker container with own Chromium, logins, workspace; single policy gateway that audit-rows every action before execution). The explainer adds no mechanism, number, or capability the dossier doesn't already cover. Delta: none.

---

## 5. Content notes

**thelocktalk nflverse methodology post → Garrett's doctrine, mapped:**
- **Data Map** = his ingestion-first doctrine: know every field and its provenance before modeling — and nflverse (pbp since 1999, EP per snap, rosters, snaps, injuries) is literally his data spine.
- **Baseline, dumbest version first** = measured-over-guessed: a naive baseline must exist before any model claims edge, and all lift is reported against it.
- **Leak Check ("where your model is secretly seeing the future")** = his no-lookahead discipline in the weekly cycle: features must be knowable before kickoff; a model that peeks is the exact failure his gate audits exist to catch.
- Net: a public creator teaching his three core hygiene rules in plain language — a useful content benchmark for GSE explainers.

**NGS program tracker line (2026-10-29):** NGS's official account announced 2026-season metric additions — **Run Scheme Classification, Run Blocking Matchups & Metrics, Route Classification 2.0** (@nextgenstats, Sep 8) — classification-type features; add to the NGS inventory/glossary, relevant to the engine's OL/scheme matchup track.

---

## Gap audit (what was NOT done)
- Anytime-TD: full 2010–2025 aggregation NOT COMPUTED (3 of 16 seasons sampled; playoffs excluded by design).
- codebase-memory-mcp: not installed/run (per rules) — token figures rest on the project's own preprint and old-README comparison, not our measurement.
- Kimi K3.1 Pro: no independent benchmark replication exists yet anywhere; weights-drop fulfillment check belongs on/after Nov 4.
- Explore candidates outside the assigned five items were not individually verified in this pass.
