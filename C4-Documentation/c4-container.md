# C4 Container Level: System Deployment Architecture

## Containers

### 1. GSE Web Application & API Gateway (`apps/web`)
- **Name**: GSE Web Storefront & Next.js API Gateway
- **Description**: Hosts `https://www.galaxysportsedge.com`, serves public game-environment analytics, enforces server-side Stripe entitlement redaction, and exposes `/api/mobile/v1/*` endpoints.
- **Type**: Web Application & REST API Gateway
- **Technology**: Next.js 14, React 18.3, TypeScript 5.x, `@sentry/nextjs` (`tracesSampleRate: 0.1`), PostHog
- **Deployment**: Vercel Production Edge & Serverless Node Functions (`origin/main`)

### 2. GSE Autonomous Intelligence, Simulation & C11/C++20 Native Kernel Container (`intelligence/` & `scripts/`)
- **Name**: GSE Python + C11/C++20 Native Simulation, DFS & Fantasy Engine
- **Description**: Executes Stage 0..5 game prep, the 26-Layer `ContextPacket`, 5-Track `L1..L5` `ReasoningTrace`, Full-Game Snap-by-Snap JEV simulation (`10,000 worlds x 175 snaps`), C11/C++20 native hot-loop kernels (`libgse_native_kernels.dll`), the Two-Stage GSE Sim-to-DFS Pipeline, and the Unified Season-Long Fantasy Engine.
- **Type**: High-Performance Compute & Optimization Worker
- **Technology**: Python 3.13, C11 (`gcc -O3 -march=native`), Modern C++20 (`g++ -O3 -march=native`), SciPy `HiGHS` MILP, DuckDB, NumPy, NVIDIA RTX 5070 / RunPod GPU Pods
- **Deployment**: Local Workstation (`NVIDIA RTX 5070 12GB`) + RunPod Serverless GPU Pods + Git-backed Artifact Pipeline

### 3. GSE MCP Equations & Cognitive Router Server (`packages/mcp-equations-server` & `packages/prediction-engine`)
- **Name**: `21,419`-Equation Cognitive Router & Conjunction Gate Container
- **Description**: Evaluates the `288-bit` context mask across `21,419` equations, performs Spectral Cluster Orthogonalization and Positive-Part James-Stein Shrinkage, runs the 80-Rule Misleading-Stat Firewall, and signs tickets via the Class B Market De-Vig Conjunction Gate.
- **Type**: Mathematical Routing Service / Package
- **Technology**: TypeScript 5.x, Node.js, Model Context Protocol (`MCP`)
- **Deployment**: Embedded Node/TypeScript runtime & MCP server

### 4. GSE Primary Relational & Telemetry Database (`Neon PostgreSQL 17`)
- **Name**: Neon Serverless PostgreSQL 17 Database
- **Description**: Stores `picks`, `pick_signal_snapshots`, `CheckoutAttempt` idempotency state, closing line values, and automated `pg_cron` maintenance jobs (`weekly-vacuum-analyze`, `weekly-odds-analyze`).
- **Type**: Relational Database (`ContainerDb`)
- **Technology**: PostgreSQL 17, Prisma ORM, `pg_cron`
- **Deployment**: Managed Neon Serverless (`4.2 GB` heap, `0%` dead tuples)

### 5. GSE Native iOS Client (`apps/mobile`)
- **Name**: GSE Native iOS Mobile Application
- **Description**: Native mobile client rendering tier-gated cards, `72/100` integer scores, and defensive `trust.ts` stale-pick/adverse-edge filtering.
- **Type**: Mobile Application
- **Technology**: Expo SDK 57, React Native 0.86.3, React 19.2.3, TypeScript
- **Deployment**: Apple App Store / TestFlight (`isolated lockfile outside root npm workspaces`)

### 6. Stealth-Skeleton Distillation & Mind Feed Store (`data/mind/feeds/` & `brain/mind.jsonl`)
- **Name**: Stealth-Skeleton Distillation Flywheel & Mind Corpus Store
- **Description**: Stores trainer-ready `SFT / DPO / GRPO` JSONL feeds harvested from external multi-agent inputs, the `5,000+` page DFS/Fantasy scientific corpus, and official external benchmark manifests.
- **Type**: Append-Only JSONL Data Store & Training Pipeline
- **Technology**: JSONL, HuggingFace / `lm-evaluation-harness`, RunPod LoRA/GRPO Trainer
- **Deployment**: Repository-tracked `data/mind/feeds/*.jsonl` + Windows Single-Writer Mind Trainer

## Interfaces

### 1. GSE Engine & Two-Stage DFS API
- **Protocol**: HTTPS / JSON
- **Description**: Delivers Stage 0..5 game dossiers and Two-Stage DFS/Fantasy packets.
- **Specification**: [`apis/gse-engine-and-dfs-api.yaml`](./apis/gse-engine-and-dfs-api.yaml)
- **Endpoints**:
  - `GET /api/engine/live-board` - Verified NFL game board with server-side paywall redaction
  - `GET /api/dfs/two-stage-packet` - Stage 1 GSE Projections, Stage 2 Curated Pool, and Stage 3 3-Archetype MILP Lineups

### 2. GSE Mobile v1 API
- **Protocol**: HTTPS / Bearer JWT
- **Description**: Serves the Expo iOS client with redacted cards and `72/100` score formatting.
- **Specification**: [`apis/gse-mobile-v1-api.yaml`](./apis/gse-mobile-v1-api.yaml)
- **Endpoints**:
  - `GET /api/mobile/v1/slate` - Active mobile slate payload

## Components Mapped to Containers

- **GSE Autonomous Intelligence & C11/C++20 Container**:
  - [`c4-component-situational-reasoning-and-equation-router.md`](./c4-component-situational-reasoning-and-equation-router.md)
  - [`c4-component-jev-snap-and-native-trajectory-engine.md`](./c4-component-jev-snap-and-native-trajectory-engine.md)
  - [`c4-component-two-stage-dfs-and-fantasy-engine.md`](./c4-component-two-stage-dfs-and-fantasy-engine.md)
  - [`c4-component-enterprise-cloud-and-stealth-distillation.md`](./c4-component-enterprise-cloud-and-stealth-distillation.md)
- **GSE Web & Mobile Delivery Containers**:
  - [`c4-component-web-and-mobile-delivery.md`](./c4-component-web-and-mobile-delivery.md)

## Container Diagram

```mermaid
C4Container
    title Container Diagram for Galaxy Sports Edge (GSE)

    Person(member, "GSE Member / DFS & Fantasy Player", "Views NFL game analysis, 77-category props, 3-archetype DFS portfolios, and season-long fantasy tiers")
    System_Boundary(gseBoundary, "Galaxy Sports Edge (GSE) Platform") {
        Container(webApp, "GSE Web Application & API Gateway", "Next.js 14, React 18.3, TypeScript", "Serves galaxysportsedge.com, enforces server paywall redaction, exposes /api/mobile/v1/*")
        Container(iosApp, "GSE Native iOS Client", "Expo SDK 57, React Native 0.86, React 19.2", "Renders 72/100 confidence cards & defensive trust.ts mirror")
        Container(pyCppEngine, "GSE Python + C11/C++20 Native Simulation & DFS Engine", "Python 3.13, C11, C++20, SciPy HiGHS, libgse_native_kernels.dll", "Runs 26-Layer Context, JEV 10k-world sims, Two-Stage DFS Pipeline & Unified Fantasy Engine")
        Container(mcpRouter, "GSE 21,419-Equation Cognitive Router", "TypeScript 5.x, Node.js, MCP", "288-bit mask -> Spectral Orthogonalization -> James-Stein Shrinkage & Class B Gate")
        ContainerDb(neonDb, "Neon PostgreSQL 17 Database", "PostgreSQL 17, Prisma, pg_cron", "Stores settled picks, signal snapshots, CLV & CheckoutAttempt state")
        ContainerDb(mindStore, "Stealth-Skeleton Mind & Distillation Store", "JSONL / Parquet / DuckDB", "Holds SFT/DPO/GRPO distillation feeds, 5,000+ page corpus & Stage 0..5 dossiers")
    }
    System_Ext(nvidiaExt, "NVIDIA Inception & Developer Cloud", "NIM API, DGX Spark / RAPIDS, TensorRT, TAO")
    System_Ext(runpodExt, "RunPod Serverless GPU & Google Cloud", "SFT/DPO/GRPO distillation & heavy batch compute")
    System_Ext(sentryPosthogExt, "Sentry ($5k Grant) & PostHog", "0.1 sampled error tracing & product/routing telemetry")
    System_Ext(sportsDataExt, "nflverse, Sleeper, DraftKings & Morning Sweep Feeds", "Live injuries, depth charts, DK salaries, waiver trends, wPP/xwPP & Supporting Cast")
    System_Ext(extBenchmarks, "Official External LLM Benchmarks", "EleutherAI lm-eval, ICLR LiveBench, Arena-Hard-Auto, ForecastBench")

    Rel(member, webApp, "Views analysis & DFS/Fantasy packets", "HTTPS")
    Rel(member, iosApp, "Uses native mobile client", "iOS")
    Rel(iosApp, webApp, "Fetches bearer-authenticated slate", "JSON/HTTPS")
    Rel(webApp, neonDb, "Reads/writes picks & entitlements", "SQL/TLS")
    Rel(webApp, mindStore, "Reads verified Stage 0..5 dossiers & DFS packets", "File/JSON")
    Rel(pyCppEngine, mcpRouter, "Routes 21,419 equations & Class B conjunction gate", "MCP/IPC")
    Rel(pyCppEngine, mindStore, "Writes Stage 1 GSE Projections, Stage 2 Pool, Stage 3 DFS Sims & SFT/DPO/GRPO feeds", "JSON/JSONL")
    Rel(pyCppEngine, sportsDataExt, "Ingests live injuries, DK salaries, Sleeper waivers & charting", "HTTPS/CSV/Parquet")
    Rel(pyCppEngine, nvidiaExt, "Executes accelerated inference & optimal transport", "HTTPS/CUDA")
    Rel(pyCppEngine, runpodExt, "Dispatches distillation & batch GPU jobs", "HTTPS")
    Rel(pyCppEngine, sentryPosthogExt, "Logs continuous self-improving run telemetry", "HTTPS")
    Rel(pyCppEngine, extBenchmarks, "Evaluates Stealth-Skeleton on 3rd-party harnesses", "CLI/API")
```
