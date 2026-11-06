# Task 5 — Multi-Agent Architect & Error-Debugging Review: 10 OpenAI Repositories

**For:** Beexly/Sports (Galaxy Sports Edge / GSE) and Galaxy Science Institute (GSI)
**Branch context:** `muse/formal-verification-and-ns32-2026-11-06` — this receipt was **not pushed**; it lives only in the local task workspace per task instructions.
**Retrieval date:** 2026-11-06
**Fetch window (live):** 2026-11-06 21:43–21:44 UTC (15:43–15:44 America/Chicago) via unauthenticated `curl https://api.github.com/repos/openai/<name>` and `.../contents/`
**Raw evidence:** `~/workspace/muse-fv-2026-11-06/raw/openai-repos/` — 20 files: `<repo>.json` (repo metadata) + `<repo>_contents.json` (top-level listing) for each of the 10 repos. Every star / fork / issue / date / size number in this receipt is copied from those saved files. No number is from memory.
**Method substitution — stated plainly:** The brief named `/antigravity-skills:architect-review` and `/antigravity-skills:error-debugging-multi-agent-review`. Those slash skills are **not installed on this host** (checked `/opt/muse/skills/` — no antigravity skill present). This review therefore substitutes the method specified in the task itself: (1) live GitHub API metadata + top-level contents per repo, (2) a per-repo Architect Review (pattern, key modules visible in the contents listing, dependency posture, adopt / adapt / learn-only for GSE/GSI), and (3) a per-repo Error-Debugging Review (archived status, open-issue load, failure modes visible from metadata, debugging gate for GSE). No claim in this receipt depends on the missing skills.
**Doctrine applied:** Garrett's ingest-and-learn rule — nothing is killed. "Learn-only" below is a *current status* (license, archival, or fit constraint today), never a terminal verdict. A refused / learn-only item keeps its reason recorded and stays available to the reasoning layer.

---

## 1. Summary table — all numbers verified against saved raw JSON

| # | Repo (`openai/…`) | Status (API `archived`, `pushed_at`) | Stars | Forks | Open issues | Lang (API) / License (SPDX) | Verdict for GSE/GSI | Top lesson |
|---|---|---|---:|---:|---:|---|---|---|
| 1 | `math` | Active — `archived=false`, pushed 2026-10-30 | 17,384 | 1,966 | 0* | Lean / Apache-2.0 | **ADOPT** (pattern) | A comparator that type-checks the *checker* stops Type-ii autoformalization reward hacking — gate the proof, not just the answer. |
| 2 | `evals` | Active — `archived=false`, pushed 2026-04-14 | 19,711 | 3,126 | 350 | Python / Other (`NOASSERTION`) | **ADOPT** (pattern) | A registry + harness, not ad-hoc scripts, is what makes GSE-LiveBench repeatable and auditable. |
| 3 | `openai-cookbook` | Active — `archived=false`, pushed **2026-11-06** (today) | 76,984 | 13,044 | 353 | Jupyter Notebook / MIT | **ADAPT** | A `registry.yaml`-indexed example corpus stays findable at ~1 GB scale; unindexed notebooks rot. |
| 4 | `gym` | **Archived — `archived=true`**, pushed 2026-03-26† | 37,232 | 8,665 | 128 | Python / Other (`NOASSERTION`) | **LEARN-ONLY** | The Env/step/reset contract outlived the repo: adopt the *interface discipline* for NS + SGP simulators, not the archived code. |
| 5 | `CLIP` | Active — `archived=false`, pushed 2026-03-25 | 34,575 | 4,063 | 273 | Jupyter Notebook / MIT | **ADAPT** | Zero-shot image↔text embedding is the right shape for the broadcast/CV lane — adapt the embedding contract, don't train from scratch. |
| 6 | `gpt-2` | **Archived — `archived=true`**, pushed 2024-08-14 | 25,014 | 5,957 | 197 | Python / Other (`NOASSERTION`) | **LEARN-ONLY** | A tiny, readable `src/` reference implementation is the audit surface: if a kernel can't be written this small, it isn't understood yet. |
| 7 | `swarm` | Active — `archived=false`, pushed 2026-04-15 | 22,111 | 2,350 | 38 | Python / MIT | **ADAPT** | Lightweight handoff orchestration works — but the API description itself says "Educational framework": adapt the patterns, don't production-adopt the framework. |
| 8 | `gpt-oss` | Active — `archived=false`, pushed 2026-10-29 | 20,512 | 2,195 | 171 | Python / Apache-2.0 | **ADAPT** | Open weights (120b / 20b, per API description) + an MCP server + a compatibility test = a routable local lane — verify compatibility, don't assume it. |
| 9 | `chatgpt-retrieval-plugin` | **Archived — `archived=true`**, pushed 2024-07-04 | 21,280 | 3,573 | 277 | Python / MIT | **LEARN-ONLY** | Plugin-era retrieval died with its host platform: own the datastore / chunk / query interfaces so a host shutdown can't strand the corpus. |
| 10 | `tiktoken` | Active — `archived=false`, pushed 2026-08-17 | 19,614 | 1,669 | 154 | Python‡ / MIT | **ADOPT** | Fast BPE with a Rust core (see `Cargo.toml`) is the tokenization discipline to copy for play-sequence encoding: deterministic, versioned, fast. |

**Column totals (computed from the 10 saved JSON files):** 294,417 stars · 46,608 forks · 1,941 open issues · 1,980,543 KB combined repo size · **3 of 10 archived** (`gym`, `gpt-2`, `chatgpt-retrieval-plugin`), 7 active.

\* `math`: `open_issues=0` **and** `has_issues=false` in the API payload — issues are disabled on that repo, so 0 is "tracker off," not "no problems reported." Do not read it as a quality signal.
† `gym`: `archived=true` yet `pushed_at=2026-03-26T23:13:27Z` in the same payload. Reported exactly as returned; an archived flag and a recent push timestamp coexisting is itself a metadata caveat — trust the `archived` flag for maintenance status, not the push date alone.
‡ `tiktoken`: API `language="Python"` is the *primary-language* field. The top-level listing contains `Cargo.toml`, `src/`, `tiktoken/` and `tiktoken_ext/` — i.e. a Rust core with Python bindings, visible from the fetched contents, not from the language field alone. Same caveat for `CLIP` and `openai-cookbook`, whose API language is "Jupyter Notebook."

---

## 2. Per-repo reviews

### 2.1 `openai/math` — the formal-verification gate

**Live metadata (from `math.json`):** description: *none returned* (`null`) · language: Lean · license: Apache-2.0 · stars 17,384 · forks 1,966 · open issues 0 (`has_issues=false`) · `archived=false` · created 2026-10-06T21:47:02Z · pushed 2026-10-30T00:35:38Z · default branch `main` · size 940,236 KB (≈940 MB — second-largest of the 10, despite being the newest repo in the set).
**Top-level contents (10, from `math_contents.json`):** `.github/`, `CONTENTS.md`, `LICENSE`, `README.md`, `history.md`, `lean/`, `overview.pdf`, `overview.tex`, `preprints/`, `reasoning_traces/`.

**Architect review.**
- *Pattern:* Corpus-plus-formalization repository, not a conventional library. Three layers sit side by side at the top level: human manuscripts (`CONTENTS.md`, `preprints/`, `overview.tex`/`overview.pdf`), machine-checked formalizations (`lean/`), and process evidence (`reasoning_traces/`, `history.md`). The architecture's point is the *binding* between the layers: a manuscript claim is only as good as its Lean counterpart.
- *Key modules (visible in listing):* `lean/` (formalization + comparator surface for Task 1's 419 `ComparatorChallenges`), `CONTENTS.md` (the 721-manuscript / 373-family index Task 1 streams), `reasoning_traces/` (auditable reasoning, not just final answers).
- *Dependency posture:* Lean toolchain is the hard dependency; the corpus itself is data. Apache-2.0 is the most permissive license in the archived/active split alongside `gpt-oss` — no license blocker to adopting the *pattern*.
- *GSE/GSI disposition — ADOPT (pattern):* This is the direct template for GSE's Type-ii autoformalization risk. A model that autoformalizes a theorem / a pick rationale can game a weak checker (vacuous statements, changed definitions, trivially-true encodings). The Comparator discipline — an independent, type-checking comparator that the formalization must satisfy — is the gate to wire in front of any GSI theorem claim (e.g. Theorem 10 Sulcal Waveguide, 1-RSB susceptibility) and any GSE "proof-carrying" pick rationale. Adopt the comparator pattern and the three-layer layout (claim / formalization / trace) in Beexly/Sports; do not vendor the 940 MB corpus.

**Error-debugging review.**
- *Maintenance signal:* Newest repo (created 2026-10-06), pushed within the last week (2026-10-30), not archived — but issues are *disabled*, so there is no public failure channel to mine. Absence of issues here is a configuration fact, not evidence of correctness.
- *Failure mode visible from metadata:* Oversized-repo drift — 940,236 KB at one month old. A corpus that grows this fast without a size gate becomes un-cloneable for the fleet.
- *Debugging lesson / GSE gate:* (1) Never let "0 open issues" stand in for "verified" — check `has_issues` first. (2) Any GSE formalization lane needs its own failure channel (a comparator-failure log) precisely because the upstream example has none public. (3) Add a repo-size / large-file gate before any corpus import into Sports.

### 2.2 `openai/evals` — the benchmark harness

**Live metadata:** description: *"Evals is a framework for evaluating LLMs and LLM systems, and an open-source registry of benchmarks."* · Python · license `NOASSERTION` / "Other" (a `LICENSE.md` file is present in the listing; the API could not map it to an SPDX ID — read the file before any code reuse) · stars 19,711 · forks 3,126 · open issues 350 · `archived=false` · created 2023-01-23T20:51:04Z · pushed 2026-04-14T15:29:57Z · `main` · size 6,684 KB.
**Contents (16):** `.gitattributes`, `.github/`, `.gitignore`, `.pre-commit-config.yaml`, `LICENSE.md`, `MANIFEST.in`, `Makefile`, `README.md`, `SECURITY.md`, `docs/`, `evals/`, `examples/`, `mypy.ini`, `pyproject.toml`, `scripts/`, `tests/`.

**Architect review.**
- *Pattern:* Framework + registry. A core package (`evals/`), a registry of named benchmarks, plus the engineering scaffolding GSE should copy wholesale in spirit: `pyproject.toml`, `mypy.ini`, pre-commit config, `Makefile`, `tests/`, `SECURITY.md`.
- *Dependency posture:* Python, type-checked (`mypy.ini` at top level is a posture signal), actively maintained into 2026 — but the push cadence has slowed (last push 2026-04-14, ~7 months before retrieval). Plan on the *design*, not on upstream velocity.
- *GSE/GSI disposition — ADOPT (pattern):* This is the harness design for `GSE-LiveBench` (Task 4's cross-verification against ForecastBench): named, versioned eval definitions in a registry; a runner separated from the eval definitions; results that are comparable across runs because the eval, not the runner, is the unit of record. That separation is exactly what `Warehouse.asof(t)` bitemporal discipline needs on the data side — eval definition versioned as-of a time, run against data as-of a time.

**Error-debugging review.**
- *Maintenance signal:* 350 open issues — second-highest of the 10 — on an active repo. That is a real maintenance load, not abandonment.
- *Failure mode:* Benchmark contamination / silent eval drift is the canonical failure for this pattern (an eval changes, scores "improve," nothing real changed). The registry pattern exists to surface it; without version-pinning it hides it.
- *GSE gate:* Pin every LiveBench eval by content hash + `asof(t)`; a score delta with an eval-definition delta in the same window is invalid until re-baselined. Treat the `NOASSERTION` license as learn/pattern-only for code until `LICENSE.md` is read in full.

### 2.3 `openai/openai-cookbook` — the integration-pattern library

**Live metadata:** description: *"Examples and guides for using the OpenAI API"* · Jupyter Notebook · MIT · stars 76,984 (highest of the 10) · forks 13,044 (highest) · open issues 353 (highest) · `archived=false` · created 2022-03-11T02:08:53Z · pushed **2026-11-06T18:39:50Z** (same day as retrieval — the most recently pushed repo in the set) · `main` · size 999,714 KB (≈1 GB — largest of the 10).
**Contents (12):** `.codex/`, `.github/`, `.gitignore`, `AGENTS.md`, `CONTRIBUTING.md`, `LICENSE`, `README.md`, `articles/`, `authors.yaml`, `examples/`, `images/`, `registry.yaml`.

**Architect review.**
- *Pattern:* Curated example monorepo. The load-bearing files are not the notebooks — they are `registry.yaml` (machine-readable index of examples), `authors.yaml` (ownership), `AGENTS.md` (agent-facing instructions, notably present at top level), and `CONTRIBUTING.md` (intake discipline).
- *Dependency posture:* Content, not a library — nothing to pin, everything to keep current. MIT removes license friction.
- *GSE/GSI disposition — ADAPT:* Copy the *registry* pattern for GSE's own corpus (research finds, textbook index from Task 3, playbooks): every example / find gets a registry entry with owner and status, or it does not count as cataloged. This is the concrete mechanism behind Garrett's "nothing gets killed, everything stays cataloged" rule. Do not copy the notebook sprawl — Sports gets the index discipline, not 1 GB of examples.

**Error-debugging review.**
- *Maintenance signal:* Highest issue count (353) *and* freshest push (today). High issues + high activity = a popular surface with constant API-drift breakage, being actively repaired.
- *Failure mode:* Example rot — an example written against last year's API silently breaks. At 999,714 KB and 13,044 forks, breakage propagates widely before it is noticed.
- *GSE gate:* Any cookbook-derived integration pattern entering Sports carries its retrieval date and the API surface it was checked against; re-verify on API version change, not on a calendar. Registry entries need a `last_verified` field — the cookbook's scale is the warning of what happens without one.

### 2.4 `openai/gym` — the simulator contract (archived)

**Live metadata:** description: *"A toolkit for developing and comparing reinforcement learning algorithms."* · Python · license `NOASSERTION` / "Other" (`LICENSE.md` present) · stars 37,232 · forks 8,665 · open issues 128 · **`archived=true`** · created 2016-04-27T14:59:16Z (oldest of the 10) · pushed 2026-03-26T23:13:27Z† · default branch `master` · size 7,125 KB · homepage: `https://www.gymlibrary.dev`.
**Contents (15):** `.github/`, `.gitignore`, `.pre-commit-config.yaml`, `CODE_OF_CONDUCT.rst`, `CONTRIBUTING.md`, `LICENSE.md`, `README.md`, `bin/`, `gym/`, `py.Dockerfile`, `pyproject.toml`, `requirements.txt`, `setup.py`, `test_requirements.txt`, `tests/`.

**Architect review.**
- *Pattern:* Environment-interface library. One core package (`gym/`) defining the environment contract every algorithm codes against; dual packaging (`setup.py` + `pyproject.toml`, `requirements.txt` + `test_requirements.txt`) shows a long-lived project mid-migration between tooling generations.
- *Dependency posture:* Archived upstream — no fixes are coming. Any dependency on the package itself is a frozen dependency.
- *GSE/GSI disposition — LEARN-ONLY (code) / ADOPT (interface discipline):* For the Navier-Stokes continuation (Task 2) and the SGP simulators, what transfers is the discipline: a single explicit environment contract (observation / action / step / reset / seed), seeded reproducibility, and versioned environments. Write GSE's simulator contracts in that shape in Sports' own code. Do not add the archived package as a runtime dependency.

**Error-debugging review.**
- *Archived status — verified from the API, not asserted from memory:* `gym.json` returns `"archived": true`. The API description fetched does **not** name a successor, and no successor name is claimed in this receipt on API evidence alone; the homepage field points to `gymlibrary.dev`. (The task brief named Gymnasium as the successor — that name is *not* present in the fetched metadata, so it is recorded here as brief-supplied context, not as an API-verified fact.)
- *Failure mode:* The canonical archived-upstream trap — a toolkit so widely embedded (37,232 stars, 8,665 forks) that downstream code keeps depending on it years after maintenance ends, and environment-contract drift between the frozen version and its successors breaks reproducibility silently.
- *GSE gate:* A dependency's `archived` flag is a CI check, not trivia: any Sports dependency that flips to archived triggers a "freeze + interface-ownership" ticket the same run. Simulator results must record environment-contract version + seed (the 32 NS seeds in Task 2 are exactly this discipline applied).

### 2.5 `openai/CLIP` — the vision-embedding contract

**Live metadata:** description: *"CLIP (Contrastive Language-Image Pretraining), Predict the most relevant text snippet given an image"* · Jupyter Notebook · MIT · stars 34,575 · forks 4,063 · open issues 273 · `archived=false` · created 2020-12-16T11:24:42Z · pushed 2026-03-25T18:46:40Z · `main` · size 9,143 KB · topics: `deep-learning`, `machine-learning`.
**Contents (14):** `.github/`, `.gitignore`, `CLIP.png`, `LICENSE`, `MANIFEST.in`, `README.md`, `clip/`, `data/`, `hubconf.py`, `model-card.md`, `notebooks/`, `requirements.txt`, `setup.py`, `tests/`.

**Architect review.**
- *Pattern:* Research-release library: small core package (`clip/`), data/yaml surface (`data/`), TorchHub entry point (`hubconf.py`), a `model-card.md` (capability/limits documentation shipped *with* the code), and `notebooks/` as the usage documentation.
- *Dependency posture:* MIT, not archived, but slow-moving (last push 2026-03-25) — a stable reference, not a fast-moving dependency.
- *GSE/GSI disposition — ADAPT:* For the broadcast / computer-vision lane (Hermes' vision work; Garrett's real-footage rule), the transferable asset is the *contrastive embedding contract*: images and text in one shared embedding space, zero-shot matching by similarity, model card documenting limits alongside the model. Adapt that contract for matching broadcast frames to play descriptions / telestration labels. Do not treat the 2021-era weights as the production vision model — the contract is the lesson, the weights are a baseline.

**Error-debugging review.**
- *Maintenance signal:* 273 open issues on a slow-push repo — a long tail of integration / environment questions accumulating faster than they close.
- *Failure mode:* Zero-shot confidence misuse: a similarity score read as a calibrated probability. In a sports-CV lane that becomes a false "detected formation / detected player" claim.
- *GSE gate:* Embedding-similarity outputs in the CV lane are *rankings*, never probabilities, until a calibration step (conformal / Platt, per the engine's standing calibration doctrine) has run on labeled GSE data. Ship a `model-card.md`-equivalent with every GSE vision model: what it was trained on, where it fails, what it must never be used to claim.

### 2.6 `openai/gpt-2` — the minimal reference implementation (archived)

**Live metadata:** description: *"Code for the paper \"Language Models are Unsupervised Multitask Learners\""* · Python · license `NOASSERTION` / "Other" · stars 25,014 · forks 5,957 · open issues 197 · **`archived=true`** · created 2019-02-11T04:21:59Z · pushed 2024-08-14T10:50:53Z (stalest push of the 10) · default branch `master` · size 4,486 KB · homepage: `https://openai.com/blog/better-language-models/`.
**Contents (13):** `.gitattributes`, `.gitignore`, `CONTRIBUTORS.md`, `DEVELOPERS.md`, `Dockerfile.cpu`, `Dockerfile.gpu`, `LICENSE`, `README.md`, `domains.txt`, `download_model.py`, `model_card.md`, `requirements.txt`, `src/`.

**Architect review.**
- *Pattern:* Paper-companion reference implementation. Everything model-related lives in one `src/` directory; reproducibility is served by `download_model.py`, dual `Dockerfile.cpu` / `Dockerfile.gpu`, and a `model_card.md`. No framework, no plugin system, no registry — deliberately minimal.
- *Dependency posture:* Archived and frozen since 2024-08-14. That frozenness is the point for a reference: it will never drift under you.
- *GSE/GSI disposition — LEARN-ONLY:* The discipline to internalize for every GSE kernel (Shin de-vigging, CRPS, Bradley-Terry / Dixon-Coles, the NS spectral kernel in Task 2): a kernel is not "understood" until there is a small, readable, single-directory reference implementation of it that a reviewer can audit line by line, separate from the optimized production path. When the fast version and the reference version disagree, the reference wins until the discrepancy is explained.

**Error-debugging review.**
- *Maintenance signal:* Archived + 197 open issues that will never be triaged upstream. Any bug found is the adopter's bug now.
- *Failure mode:* Checkpoint / `domains.txt`-era assumptions silently baked into downstream code (the listing's `domains.txt` is a period artifact) — reference code carries its era's assumptions invisibly.
- *GSE gate:* Reference implementations in Sports are *read-only oracles*: they are never edited to match production output. A mismatch opens a debugging ticket; it never closes by editing the oracle. Record the era / assumptions in the reference's header, the way a model card records limits.

### 2.7 `openai/swarm` — fleet orchestration patterns

**Live metadata:** description: *"Educational framework exploring ergonomic, lightweight multi-agent orchestration. Managed by OpenAI Solution team."* · Python · MIT · stars 22,111 · forks 2,350 · open issues 38 (lowest of any issues-enabled repo in the set) · `archived=false` · created 2024-02-22T20:53:54Z · pushed 2026-04-15T17:10:28Z · `main` · size 537 KB (second-smallest).
**Contents (12):** `.gitignore`, `.pre-commit-config.yaml`, `LICENSE`, `README.md`, `SECURITY.md`, `assets/`, `examples/`, `logs/`, `pyproject.toml`, `setup.cfg`, `swarm/`, `tests/`.

**Architect review.**
- *Pattern:* Minimal orchestration framework — one core package (`swarm/`), patterns demonstrated through `examples/`, run evidence in `logs/`. The architecture is handoffs between agents as a first-class, lightweight primitive rather than a heavy workflow engine.
- *Dependency posture:* MIT, tiny footprint, low issue load — and explicitly *educational* in its own API description. That word is a posture constraint set by the author, not a reviewer inference.
- *GSE/GSI disposition — ADAPT:* For Garrett's fleet (Motif orchestration seat, MCP bus, Jules / Hermes / subagent lanes), adapt the *patterns*: explicit handoff as the unit of delegation, routines as reusable instruction sets, full run logs as the audit trail (note `logs/` at top level — logging is architectural, not an afterthought). Do not production-adopt the framework itself over the fleet's existing MCP bus; the bus is the production lane, Swarm is the pattern library. This matches the fleet's standing rule that a handoff names owner, next step, and evidence.

**Error-debugging review.**
- *Maintenance signal:* Healthy on its face (38 issues, pushed 2026-04) — the risk here is not abandonment, it is *scope*: an educational framework used past its stated scope fails by missing production features (retries, persistence, guardrails), not by crashing.
- *Failure mode:* Silent handoff loops / lost context between agents — the multi-agent equivalent of an infinite loop, and it burns tokens while looking busy. Garrett's standing liveness rule (never report a background job running without a liveness check) is the same failure seen from the operator's seat.
- *GSE gate:* Every fleet handoff carries (a) a bounded step / turn budget, (b) a structured result schema the receiver validates, and (c) a log entry. A handoff with no log entry did not happen; a loop with no budget does not start.

### 2.8 `openai/gpt-oss` — open-weight routing

**Live metadata:** description: *"gpt-oss-120b and gpt-oss-20b are two open-weight language models by OpenAI"* · Python · Apache-2.0 · stars 20,512 · forks 2,195 · open issues 171 · `archived=false` · created 2025-06-23T16:43:33Z · pushed 2026-10-29T16:42:13Z (second-freshest push) · `main` · size 10,884 KB · homepage: `https://openai.com/open-models`.
**Contents (17):** `.github/`, `.gitignore`, `CMakeLists.txt`, `LICENSE`, `MANIFEST.in`, `README.md`, `USAGE_POLICY`, `_build/`, `awesome-gpt-oss.md`, `compatibility-test/`, `docs/`, `examples/`, `gpt-oss-mcp-server/`, `gpt_oss/`, `pyproject.toml`, `tests-data/`, `tests/`.

**Architect review.**
- *Pattern:* Open-model release with serving surface: core package (`gpt_oss/`), a native build component (`CMakeLists.txt`, `_build/`), an MCP server (`gpt-oss-mcp-server/` — the model ships with its own tool-protocol surface), a dedicated `compatibility-test/` directory, `tests-data/`, and a `USAGE_POLICY` file at top level (policy shipped in-repo, next to the code).
- *Dependency posture:* Apache-2.0 (clean reuse terms), actively pushed (2026-10-29), but hardware / runtime compatibility is a real variable — hence the repo's own compatibility-test directory.
- *GSE/GSI disposition — ADAPT:* The routing lesson for Garrett's free-first routing doctrine: a two-size open-weight family (120b / 20b per the API description) is a *tier*, not a single model — route by task weight (heavy reasoning vs. cheap bulk passes) across OpenRouter free models, Grok, Gemini, and a local/open-weight tier. Adapt the *compatibility-test-first* discipline: no model enters the routing table until a pinned compatibility / capability test passes on GSE prompts, with results filed like `tests-data/`. The in-repo `gpt-oss-mcp-server/` also validates the fleet's MCP-bus direction: models increasingly ship expecting an MCP surface.

**Error-debugging review.**
- *Maintenance signal:* Young repo (created 2025-06-23), 171 open issues, active pushes — expect churn in serving / quantization details.
- *Failure mode:* "It loads" mistaken for "it behaves": an open-weight model that runs can still diverge silently on tool-calling format, reasoning-trace handling, or context behavior versus the hosted models it replaces in a route.
- *GSE gate:* Route changes are eval changes — swapping any tier's model re-runs the LiveBench harness (§2.2) before the route goes live, and the compatibility test result is attached to the routing-table entry. No silent model substitution, ever — this is the model-routing version of the provenance rule.

### 2.9 `openai/chatgpt-retrieval-plugin` — corpus retrieval (archived)

**Live metadata:** description: *"The ChatGPT Retrieval Plugin lets you easily find personal or work documents by asking questions in natural language."* · Python · MIT · stars 21,280 · forks 3,573 · open issues 277 · **`archived=true`** · created 2023-03-23T06:06:22Z · pushed 2024-07-04T22:00:16Z · `main` · size 1,595 KB · topics: `chatgpt`, `chatgpt-plugins`.
**Contents (21 — most top-level entries of the 10):** `.dockerignore`, `.env.example`, `.github/`, `.gitignore`, `.well-known/`, `Dockerfile`, `LICENSE`, `Makefile`, `README.md`, `assets/`, `datastore/`, `docs/`, `examples/`, `local_server/`, `models/`, `poetry.lock`, `pyproject.toml`, `scripts/`, `server/`, `services/`, `tests/`.

**Architect review.**
- *Pattern:* Plugin-era retrieval service with clean internal seams: `datastore/` (vector-store abstraction), `models/` (document / chunk schemas), `services/` (chunking, embedding, query logic), `server/` + `local_server/` (hosted and local entry points), `.well-known/` (the host platform's plugin-manifest discovery surface), Poetry-pinned dependencies (`poetry.lock`).
- *Dependency posture:* MIT code, but the *host platform it plugged into* is the dead dependency. The internal seams are well-drawn; the external seam (`.well-known/` plugin manifest) is the one that stranded it.
- *GSE/GSI disposition — LEARN-ONLY (platform) / ADAPT (internal seams):* For GSE's corpus work (the master packet, the textbook index, memory / research retrieval), adapt the internal architecture — datastore abstraction over multiple vector stores, chunking as a named service, schemas in `models/` — and *own* those interfaces in Sports. Never let a host platform's manifest / discovery format become the corpus's front door. Retrieval must survive its host.

**Error-debugging review.**
- *Maintenance signal:* Archived since the 2024-07-04 push era, with 277 open issues frozen in place — the largest frozen issue backlog of the three archived repos.
- *Failure mode:* Platform-deprecation stranding: nothing in the code broke; the ecosystem it targeted was retired, and the whole integration surface became inert at once. This is the retrieval-layer version of the `gym` lesson, but sharper — `gym`'s contract survived in successors; a plugin manifest has no successor.
- *GSE gate:* Every external integration in Sports gets a "host dies tomorrow" note at design time: which GSE-owned interface replaces it, and where the data lives if it does. Integrations without that note do not merge. Corpus data is never stored *only* inside a third-party plugin's datastore format.

### 2.10 `openai/tiktoken` — tokenization for sequence encoding

**Live metadata:** description: *"tiktoken is a fast BPE tokeniser for use with OpenAI's models."* · Python (API primary language; see Rust note below) · MIT · stars 19,614 · forks 1,669 (lowest fork count) · open issues 154 · `archived=false` · created 2022-12-01T23:22:11Z · pushed 2026-08-17T05:25:57Z · `main` · size 139 KB (smallest of the 10 by a wide margin).
**Contents (15):** `.github/`, `.gitignore`, `CHANGELOG.md`, `Cargo.toml`, `LICENSE`, `MANIFEST.in`, `README.md`, `perf.svg`, `pyproject.toml`, `scripts/`, `setup.py`, `src/`, `tests/`, `tiktoken/`, `tiktoken_ext/`.

**Architect review.**
- *Pattern:* Performance-critical core with a stable extension surface: Rust core (`Cargo.toml`, `src/`) for speed, Python package (`tiktoken/`) for the API, a separate extension package (`tiktoken_ext/`) where new encodings register without touching the core, a `CHANGELOG.md`, and performance treated as a shipped artifact (`perf.svg` in the root).
- *Dependency posture:* MIT, 139 KB, minimal surface — the lowest-maintenance-shape repo in the set. Encoding definitions are data + registry, not code churn.
- *GSE/GSI disposition — ADOPT:* Direct template for play-sequence encoding in GSE. A play sequence, a drive, an SGP leg chain — all are token streams over a finite vocabulary (play type, personnel, formation, outcome). The tiktoken discipline transfers one-for-one: (1) a *versioned, deterministic* BPE-style vocabulary — the same sequence always encodes to the same token IDs; (2) a fast core separated from the registry of encodings (`tiktoken_ext/` pattern → a `play_encodings/` registry in Sports); (3) special tokens handled explicitly, never by string hacking; (4) performance measured and published with the code (`perf.svg` pattern). Adopt tiktoken itself wherever OpenAI-model token counting matters (context budgeting for fleet agents), and adopt its architecture for the domain tokenizer.

**Error-debugging review.**
- *Maintenance signal:* Active, small, 154 open issues — proportionate to a widely-embedded utility; most risk is downstream misuse, not core instability.
- *Failure mode:* Encoding mismatch — text tokenized under one encoding and decoded / counted under another, silently corrupting context budgets and training data. The domain version is worse: play sequences encoded under vocabulary v1 and trained / scored under v2 produce a model that is confidently wrong with no error raised.
- *GSE gate:* Tokenizer / vocabulary version is part of every dataset's and model's identity in Sports — recorded in the artifact, checked at load time, mismatch = hard failure, never a warning. Encodings are immutable once published; a new vocabulary is a new encoding name, following the `tiktoken_ext/` registration pattern.

---

## 3. Cross-repo synthesis

### Top 5 patterns to wire into Beexly/Sports

1. **Comparator-gated formalization (`math`).** Independent type-checking comparator in front of every autoformalized GSI theorem and proof-carrying GSE rationale; three-layer layout (claim / formalization / reasoning trace) as the filing standard. This is the anti-reward-hacking gate for Type-ii risk — wire it before any autoformalization output is trusted.
2. **Registry + harness evaluation (`evals` + `openai-cookbook`).** GSE-LiveBench as a versioned registry of named evals with a separated runner, every eval pinned by hash + `asof(t)`; and the cookbook's `registry.yaml` + `authors.yaml` discipline generalized to *all* GSE corpus items (owner, status, `last_verified`). Together these make "cataloged, evaluated, wired" checkable instead of asserted.
3. **Owned simulator & retrieval interfaces (`gym` + `chatgpt-retrieval-plugin`).** GSE-owned environment contracts (seeded, versioned) for the NS and SGP simulators, and GSE-owned datastore / chunk / query seams for corpus retrieval — both drawn from repos whose *interfaces* were good and whose *hosts* died or froze. Own the seam, rent the implementation.
4. **Handoff orchestration with architectural logging (`swarm`).** Fleet delegations as explicit, budgeted handoffs with structured result schemas and a top-level log trail — formalizing what the MCP bus already does, with Swarm's `logs/`-as-architecture and the fleet's liveness rule as the enforcement.
5. **Versioned tokenization + tiered open-weight routing (`tiktoken` + `gpt-oss`).** A deterministic, versioned play-sequence encoding (Rust-fast core pattern, registry-extensible encodings, version checked at load), and a routing table where open-weight tiers (120b/20b class) sit beside hosted/free tiers — each entry gated by a pinned compatibility test and a LiveBench re-run on any substitution.

### Top 5 failure modes to gate against

1. **Reward hacking through a weak checker (`math` risk, inverted).** A generator that satisfies the letter of an eval / formalization while changing its meaning. *Gate:* comparator + eval-definition hash pinning; a score that improves while its definition changed is void.
2. **Archived / deprecated upstream stranding (`gym`, `gpt-2`, `chatgpt-retrieval-plugin` — 3 of 10 repos, 83,526 combined stars).** Popularity is not maintenance: the three archived repos hold the 2nd-, 4th- and 6th-highest star counts in this set. *Gate:* CI check on dependency `archived` flags; a "host dies tomorrow" interface note for every external integration.
3. **Silent version mismatch (`tiktoken`, `gpt-oss`, `evals`).** Tokenizer, model, or eval swapped without a version change surfacing — output stays well-formed and becomes wrong. *Gate:* version is part of artifact identity (dataset, model, eval, encoding); mismatch = hard failure at load / merge time.
4. **Metadata illusions (`math`, `gym`, `CLIP`/`tiktoken` language fields).** `open_issues=0` that means "issues disabled"; an archived repo with a recent `pushed_at`; a "Python" language field hiding a Rust core. *Gate:* verification reads the *artifact and the raw fields together* — never a single summary field. (This is Garrett's wired-in-the-artifact rule applied to repo metadata.)
5. **Uncalibrated confidence & example rot (`CLIP`, `openai-cookbook`).** Similarity scores read as probabilities; examples / patterns copied long after the API moved. *Gate:* similarity = ranking until calibrated on GSE labels, with a model-card-equivalent shipped per model; every borrowed pattern carries retrieval date + API surface + `last_verified`, re-checked on version change.

### Counts that close the review (all from the saved raw JSON)

- Repos fetched: **10/10** — metadata + contents listing for each (20 raw files).
- Archived: **3** (`gym`, `gpt-2`, `chatgpt-retrieval-plugin`) · Active: **7**.
- Verdicts: **ADOPT 3** (`math` pattern, `evals` pattern, `tiktoken`) · **ADAPT 4** (`openai-cookbook`, `CLIP`, `swarm`, `gpt-oss`) · **LEARN-ONLY 3** (`gym`, `gpt-2`, `chatgpt-retrieval-plugin`) — learn-only = current-status constraint (archival), with the transferable interface / discipline explicitly extracted in each section, per ingest-and-learn.
- Licenses (API SPDX): MIT ×5 (`openai-cookbook`, `CLIP`, `swarm`, `chatgpt-retrieval-plugin`, `tiktoken`) · Apache-2.0 ×2 (`math`, `gpt-oss`) · `NOASSERTION`/"Other" ×3 (`evals`, `gym`, `gpt-2` — each has a `LICENSE`/`LICENSE.md` in its listing; read before any code reuse, pattern use is unaffected).
- Extremes: most stars / forks / issues / size / freshest push — `openai-cookbook` (76,984 / 13,044 / 353 / 999,714 KB / 2026-11-06). Smallest — `tiktoken` (139 KB). Newest — `math` (created 2026-10-06). Oldest — `gym` (created 2016-04-27). Stalest push — `gpt-2` (2024-08-14).

## 4. Gap audit (per Garrett's completion standard)

- **Not fetched:** README bodies, sub-directory listings below top level, issue/PR contents, commit history, and release data for all 10 repos — this review is metadata + top-level-contents level by task design. Key-module claims are therefore limited to what the top-level listings show, and are worded that way in each section.
- **Not verified from the API:** the successor relationship for `gym` (brief named Gymnasium; the fetched `gym.json` description/homepage do not name a successor — recorded as brief context in §2.4, not as a verified fact). The full text of the three `NOASSERTION` licenses was not read; code reuse from `evals`/`gym`/`gpt-2` is gated on that read.
- **Not done (by instruction):** no push to GitHub; nothing written outside `~/workspace/muse-fv-2026-11-06/`. Landing this receipt on branch `muse/formal-verification-and-ns32-2026-11-06` is the parent agent's step.
- **What would close the gaps:** a follow-on pass fetching each repo's `LICENSE`/`LICENSE.md` body + README for the 3 `NOASSERTION` repos and `swarm`/`evals` (production-scope wording), and the `gym` README for an in-repo successor statement — ~13 additional API/raw fetches, all read-only.

*Receipt ends. Raw evidence: `raw/openai-repos/*.json` (20 files, fetched 2026-11-06 21:43–21:44 UTC).*
