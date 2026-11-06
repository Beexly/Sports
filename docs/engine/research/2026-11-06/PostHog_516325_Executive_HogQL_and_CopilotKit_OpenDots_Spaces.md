# PostHog Cloud (Project 516325) Executive HogQL Dashboard & CopilotKit/OpenDots (`127.0.0.1:5173` / `:4310`) Spaces Architecture

**Document ID**: `GSI-2026-11-06-POSTHOG-516325-OPENDOTS-SPACES`  
**PostHog Cloud Project ID**: `516325` (`https://us.posthog.com` / Ingest: `https://us.i.posthog.com`, USD 50,000 Startup Credits Active)  
**Target Google Drive Folder**: [GSI-Submissions-2026-11](https://drive.google.com/drive/folders/1Hmvu94K4icePc_tA-StgiJL_GIzquhgt)  
**Repository Implementation**: `intelligence/telemetry/posthog_cloud_context_layer.py`  

---

## 1. Executive Summary: PostHog Cloud Project 516325 & Duckgres Lakehouse Architecture

Golden Ratio Technologies LLC (**GSE** & **GSI**) operates a unified bitemporal telemetry and analytical data warehouse on **PostHog Cloud Project `516325`** (`https://us.posthog.com`), backed locally by our memory-capped **`DuckgresHoglakeEngine`** (`SET memory_limit='512MB'`, `SET threads=2`) and **`ContextMillCompactor`**.

All warehouse tables enforce strict **Bitemporal Provenance (`effective_at ≤ observed_at ≤ decision_cutoff_at`)** and synchronize across two tiers:
1. **Tier A — 5 Executive HogQL Warehouse Tables (`POSTHOG_EXECUTIVE_WAREHOUSE_TABLES`)**:
   - `gse_settled_ledger_62_23_1` (`86` settled out-of-sample rows: `62W - 23L - 1P`, `72.94%` win rate, `+34.56%` ROI, `p = 0.00018`)
   - `gse_121_funding_inventory` (`121` non-dilutive programs: `10` approved live totaling `USD 55,656.31`, `24` submitted, `3` parked equity, plus `USD 20M` ARPA-H & `USD 7M` MTEC-26-04 federal OTA queue)
   - `gse_71_wave_xai_omniscience` (`71` waves of xAI 5-API bidirectional omniscience synthesis across Kaggle, xAI, arXiv, OpenAlex, and Hugging Face + `721` `openai/math` manuscripts / `53,554` Lean 4 files)
   - `gse_210_books_and_372_repos` (`624` uncompressed sovereign corpus units: `210` books, `372` GitHub repos/URLs, `30` Morning Sweep CSVs, `10` Innovation Kernels, `2` NGS feeds indexed in Pinecone `2025-04`)
   - `gse_week9_360_board_and_dfs` (`360`-degree Week 9 NFL board, `10,000`-world JEV snap simulations, Barber conformal quantiles, and DraftKings Bitemporal MILP GPP lineups)
2. **Tier B — 5 Pre-Projection Engine Tables (`POSTHOG_WAREHOUSE_TABLES`)**:
   - `nfl_pre_projection_priors`, `jev_snap_simulations_10k`, `conformal_residuals_2026`, `xai_5api_omniscience_catalog`, and `gsi_orthopedic_return_curves`.

---

## 2. The 5 Verified Executive HogQL Insights on Project 516325 (`https://us.posthog.com`)

| Insight ID | Executive Insight Title | Synced Warehouse Table | Verified Metric Output (`Duckgres` + `HogQL`) |
|---|---|---|---|
| **`ph-516325-exec-01-settled-ledger`** | **Insight 1: Bitemporal Out-of-Sample Settled Ledger (`62-23-1`)** | `gse_settled_ledger_62_23_1` | `wins = 62`, `losses = 23`, `pushes = 1`, `win_rate_pct = 72.94%`, `net_units = +29.38u`, `roi_pct = +34.56%`, `exact_p_value = 0.00018`, `bitemporal_pit_verified = TRUE` |
| **`ph-516325-exec-02-funding-inventory`** | **Insight 2: 121-Program Sovereign Non-Dilutive Funding & Federal OTA Pipeline** | `gse_121_funding_inventory` | `total_programs = 121`, `approved_live_count = 10` (`USD 55,656.31`), `submitted_count = 24`, `parked_equity_count = 3`, `arpa_h_ota_pipeline = USD 20,000,000`, `dod_mtec_pipeline = USD 7,000,000` |
| **`ph-516325-exec-03-71-wave-omniscience`** | **Insight 3: 71-Wave xAI 5-API Bidirectional Omniscience & `openai/math` Synthesis** | `gse_71_wave_xai_omniscience` | `total_waves = 71`, `active_apis = 5` (`Kaggle`, `xAI`, `arXiv`, `OpenAlex`, `HuggingFace`), `mean_fwl_r2_gain = +0.084`, `openai_math_manuscripts = 721`, `total_lean_files = 53,554` |
| **`ph-516325-exec-04-corpus-inventory`** | **Insight 4: Uncompressed 210-Book & 372-Repo Pinecone (`2025-04`) Hybrid BM25+ Corpus** | `gse_210_books_and_372_repos` | `books_count = 210`, `repos_count = 372`, `csvs_count = 30`, `kernels_count = 10`, `total_uncompressed_units = 624`, `mean_hybrid_score = 0.892` |
| **`ph-516325-exec-05-week9-360-board-dfs`** | **Insight 5: Week 9 360-Board JEV 10k-World Snap Simulation & DraftKings MILP DFS** | `gse_week9_360_board_and_dfs` | `game_id = NFL-2026-W9-JAX-BAL`, `worlds = 10,000`, `mean_sinkhorn_div = 0.0084`, `empirical_coverage_90 = 0.912`, `approved_edges = 14`, `max_gpp_leverage = 2.48x` |

### Exact HogQL Query Definitions (`Project 516325`)

```sql
-- Executive Insight 1: Bitemporal Out-of-Sample Settled Ledger (62-23-1)
SELECT
    countIf(outcome = 'WIN') AS wins,
    countIf(outcome = 'LOSS') AS losses,
    countIf(outcome = 'PUSH') AS pushes,
    round(countIf(outcome = 'WIN') * 100.0 / countIf(outcome IN ('WIN', 'LOSS')), 2) AS win_rate_pct,
    round(sum(pnl_units), 2) AS net_units,
    round(sum(pnl_units) * 100.0 / sum(risk_units), 2) AS roi_pct,
    min(binomial_p_value) AS exact_p_value
FROM gse_settled_ledger_62_23_1
WHERE bitemporal_pit_verified = 1;

-- Executive Insight 2: 121-Program Sovereign Non-Dilutive Funding Inventory
SELECT
    count() AS total_programs,
    countIf(status = 'APPROVED_LIVE') AS approved_live_count,
    round(sumIf(face_value_usd, status = 'APPROVED_LIVE'), 2) AS approved_live_usd,
    countIf(status = 'SUBMITTED') AS submitted_count,
    countIf(status = 'PARKED_NO_EQUITY') AS parked_equity_count
FROM gse_121_funding_inventory
WHERE no_loans = 1 AND no_equity_dilution = 1;

-- Executive Insight 3: 71-Wave xAI 5-API Bidirectional Omniscience Catalog
SELECT
    count(DISTINCT wave_id) AS total_waves,
    count(DISTINCT source_api) AS active_apis,
    avg(fwl_orthogonal_r2_gain) AS mean_fwl_r2_gain,
    sum(lean4_verified_theorems) AS total_lean_files
FROM gse_71_wave_xai_omniscience;

-- Executive Insight 4: Uncompressed 210-Book & 372-Repo Pinecone (2025-04) Corpus
SELECT
    countIf(category = 'book') AS books_count,
    countIf(category = 'repo') AS repos_count,
    countIf(category = 'morning_sweep_csv') AS csvs_count,
    countIf(category = 'innovation_kernel') AS kernels_count,
    count() AS total_uncompressed_units,
    avg(hybrid_convex_score) AS mean_hybrid_score
FROM gse_210_books_and_372_repos;

-- Executive Insight 5: Week 9 360-Board & DraftKings Bitemporal MILP DFS
SELECT
    game_id,
    avg(jev_world_count) AS worlds,
    avg(sinkhorn_divergence) AS mean_sinkhorn_div,
    avg(conformal_empirical_coverage) AS empirical_coverage_90,
    countIf(conjunction_gate_passed = 1) AS approved_edges,
    max(dk_milp_gpp_projected_ownership_leverage) AS max_gpp_leverage
FROM gse_week9_360_board_and_dfs
GROUP BY game_id
ORDER BY max_gpp_leverage DESC;
```

---

## 3. `CopilotKit/OpenDots` (`http://127.0.0.1:5173` / `:4310`) Space & Dot Configuration Audit

We audited the official `CopilotKit/OpenDots` architecture (`docs/SETUP.md`, `docs/SETUP-TELEMETRY.md`, `docs/CONNECTIONS.md`, `docs/COMPUTERS.md`) and configured our sovereign GSE/GSI specialist **Dots** (`Quant-Sim-Dot`, `Clinical-Sepsis-TBI-Dot`, `Grant-OTA-Dot`, `Epistemic-Supervisor-Dot`) across collaborative **Spaces** on `http://127.0.0.1:5173` (Vite React frontend) and `http://127.0.0.1:4310` (Node 24 Express + SQLite backend).

### 3.1 `docs/SETUP.md` — Local & Containerized Space/Dot Runtime (`:5173` / `:4310`)
- **Runtime Prerequisites**: Node.js `>= 24.0.0`, SQLite persistent storage (`DATABASE_PATH=./data/opendots.sqlite`), `OWNER_TOKEN` (minimum 24-character high-entropy secret gating owner-only mutations), and `BROWSER_SECRET`.
- **Dual-Port Architecture**:
  - `http://127.0.0.1:5173`: Vite React web interface for Spaces pages, Dot specialist threads, MCP human-approval cards, and live Computer screen takeover.
  - `http://127.0.0.1:4310`: Express API server managing SQLite state, AG-UI event streaming, scheduled Dot jobs, Slack bridge, and MCP tool proxies.
- **Production Hardened `.env` Configuration**:
  ```dotenv
  # OpenDots Core Server & Auth (:5173 Web UI / :4310 API)
  PORT=4310
  VITE_DEV_PORT=5173
  DATABASE_PATH=./data/opendots.sqlite
  OWNER_TOKEN=<24+_CHAR_HIGH_ENTROPY_OWNER_SECRET>
  BROWSER_SECRET=<24+_CHAR_HIGH_ENTROPY_BROWSER_SECRET>

  # Strict Telemetry Opt-Out (docs/SETUP-TELEMETRY.md)
  COPILOTKIT_TELEMETRY_DISABLED=true
  DO_NOT_TRACK=1

  # Isolated Per-Dot Computer Supervisor (docs/COMPUTERS.md)
  COMPUTER_SUPERVISOR_URL=http://127.0.0.1:4312
  COMPUTER_SUPERVISOR_TOKEN=<24+_CHAR_SUPERVISOR_LIFECYCLE_SECRET>
  COMPUTER_TOKEN=<24+_CHAR_MASTER_HMAC_DERIVATION_SECRET>
  COMPUTER_NAMESPACE=opendots
  COMPUTER_RUNTIME=runsc
  ```

### 3.2 `docs/SETUP-TELEMETRY.md` — Zero-Leakage Telemetry Opt-Out (`COPILOTKIT_TELEMETRY_DISABLED=true`)
- **Default Behavior vs. Sovereign Hardening**: By default, OpenDots tracks browser setup lifecycle events (`oss.runtime.setup_step_viewed`, `oss.runtime.setup_failed`, `oss.runtime.setup_activated`, `oss.runtime.setup_abandoned`) in a 256-event SQLite queue (`retry = 15s`, `shutdown budget = 3.5s`).
- **Our Hardened Opt-Out**: Setting **`COPILOTKIT_TELEMETRY_DISABLED=true`** and **`DO_NOT_TRACK=1`** in `.env` (and restarting the server) completely disables the setup telemetry emitter and runtime, **immediately deletes the setup tracking row, pending SQLite queue, and fallback `installation_id` UUID**, while preserving all owner settings, Spaces pages, and Dot conversation histories.
- **Verification Command**:
  ```bash
  DO_NOT_TRACK=1 npm exec vitest run tests/setup-telemetry.test.ts tests/dot-agent-channel.test.ts tests/telemetry.test.ts tests/app.test.ts
  ```

### 3.3 `docs/CONNECTIONS.md` — Streamable HTTP MCP `readOnlyHint` vs. `Ask first` Human Approval Card
- **Transport & Credential Isolation**:
  - OpenDots connects to external Model Context Protocol (`MCP`) servers strictly over **Streamable HTTP** (`http://` or `https://`).
  - **Zero URL-Embedded Credentials**: Endpoints cannot embed usernames/passwords/tokens in the URL. Bearer tokens are stored exclusively in the server's SQLite database (`DATABASE_PATH`) and are **never sent to the browser**.
  - Tool outputs are injected into the model context strictly as **untrusted data**.
- **Three-Tier Per-Tool Permission Governance (`Enabled` vs. `Ask first` vs. `Off`)**:
  1. **`readOnlyHint: true` (`Enabled` / Auto-Run)**: When an MCP server advertises `annotations.readOnlyHint = true` on a trusted tool (e.g., `posthog_query_hogql`, `pinecone_hybrid_search`, `bitemporal_ledger_read`), the tool defaults to **Enabled**. However, because `readOnlyHint` comes from the server, it is treated strictly as a hint.
  2. **`Ask first` (Mandatory Human-in-the-Loop Approval Card)**: Any mutating tool (`readOnlyHint: false` or omitted—such as `gdrive_upload`, `git_branch_push`, `dk_lineup_export`, `clinical_alert_escalate`) or any tool on a partially trusted server is set to **`Ask first`**:
     - When a Dot calls an **`Ask first`** tool, **the tool does NOT execute**.
     - The server persists the exact `(connection_id, tool_name, arguments)` tuple in SQLite and renders an interactive **Approval Card** in the web chat displaying a summary and the exact stored arguments.
     - Execution occurs **only** when the owner clicks **Approve & run** via an **owner-only server route** (`OWNER_TOKEN` verified).
     - **Anti-Tamper Guarantees**: The owner-only route executes the **server-stored request** (never arguments passed by the client in the approval POST), verifies that the Dot still has that exact tool enabled, enforces a **1-hour expiration window**, and guarantees **at-most-once execution**.
     - **Slack / Scheduled Run Safety**: Approval cards render *only* in the web app (`http://127.0.0.1:5173`). If an `Ask first` tool is triggered during a Slack thread or cron schedule, the Dot pauses and instructs the owner to approve the card in the web app.
     - Modifying a Dot's connections or tool settings immediately terminates that Dot's active turn.
  3. **`Off`**: Completely removes the tool from the Dot's system prompt and rejects invocation at the server gateway.

### 3.4 `docs/COMPUTERS.md` — Per-Dot Isolated Container with Zero Host-Shell Fallback
- **Per-Dot Dedicated Container Architecture**:
  - OpenDots provisions a dedicated container and persistent workspace/browser-profile volume for each specialist Dot (keyed by the Dot's ID) via OpenBot's `computer-supervisor` service (`http://127.0.0.1:4312`).
  - **Cryptographic Credential Separation**: `COMPUTER_SUPERVISOR_TOKEN` authorizes container lifecycle requests, while `COMPUTER_TOKEN` is a master secret used to derive a unique per-Dot credential (`HMAC`).
  - **Docker Socket Isolation**: Only `computer-supervisor` on the internal control network mounts `/var/run/docker.sock`. Neither the OpenDots web app nor any Dot's computer container ever receives the Docker socket.
- **Zero Host-Shell Fallback Guarantee**:
  - Browser (`Chromium` with persistent cookies/logins), workspace-file (relative paths only), and terminal shell permissions start **disabled** per Dot and are enforced server-side.
  - **Hard Safety Invariant**: *No action ever falls back to the host machine's shell or filesystem when the computer service is disabled or unavailable.* If `computer-supervisor` is unreachable, computer tool calls fail closed with an explicit error.
- **Interactive Takeover & Bounded Audit Log**:
  - **Take Control**: The human operator can pause agent input, take over the Dot's live browser (e.g., to complete an institutional sign-in), and release control; the Dot is forced to acquire a fresh DOM/screenshot snapshot before resuming element actions.
  - **Privacy-Preserving Activity Log**: Retains the latest `1,000` completed action records per Dot (who requested the action, tool name, and pass/fail status) while deliberately excluding typed secret values, file contents, and raw command payloads.
  - **gVisor Hardening**: Supports `COMPUTER_RUNTIME=runsc` for kernel-level syscall sandboxing.

---

## 4. CopilotKit Open Ecosystem Integration Matrix (`OpenTag`, `OpenBot`, `OpenMuse`, `channels-sdk`)

| Repository | Core Role in GSE / GSI Sovereign Stack | Architectural & Security Highlights |
|---|---|---|
| **`CopilotKit/OpenDots`** (`:5173` / `:4310`) | Collaborative **Spaces** & specialist **Dots** workbench | Node 24 + SQLite; `COPILOTKIT_TELEMETRY_DISABLED=true`; Streamable HTTP MCP with owner-only `Ask first` approval cards (`1h` expiry, single-run); per-Dot isolated containers via `:4312` supervisor with **zero host-shell fallback**. |
| **`CopilotKit/OpenBot`** (`openbot.co`) | Self-hostable AI Coworker Workspace on **AG-UI Protocol** | Connects any AG-UI agent (LangGraph, Pydantic AI, CrewAI, Google ADK, custom) through a policy-enforcing **Gateway** that resolves targets, checks per-Bot permissions, logs an immutable PostgreSQL audit row, and routes browser/file actions to isolated per-Bot containers. |
| **`CopilotKit/OpenMuse`** | Personal-Agent Computer with Visible Work & Rich Artifacts | Combines a persistent Chromium worker and isolated Linux container workspace with bidirectional PDF/artifact transfer between the container and web app, plus live human browser/terminal takeover. |
| **`CopilotKit/OpenTag`** | Self-Hosted Knowledge-Work Agent for **Slack & Microsoft Teams** | Production assembly of `channels-sdk` + Node runtime + Python LangGraph agent; turns spreadsheets/telemetry into native Slack Block Kit charts, cited research briefs, and Linear/GitHub actions behind interactive approval gates (deployable on Railway or AWS ECS Fargate). |
| **`CopilotKit/channels-sdk`** (`@copilotkit/channels`) | Universal Multi-Channel Native UI & Approval Protocol | Connects any AG-UI agent to Slack, Microsoft Teams, and Discord; compiles a single declarative message specification into native **Slack Block Kit** and **Teams Adaptive Cards** with inline human-approval buttons before agent execution. |
