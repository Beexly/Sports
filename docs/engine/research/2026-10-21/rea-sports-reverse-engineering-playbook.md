# REA Sports Reverse Engineering Playbook: Operational Protocol & Tactical Guide

**Date:** 2026-10-21  
**Author:** Galaxy Sports Edge (GSE) Engineering Fleet  
**Status:** ACTIVE SPECIFICATION / CITABLE_VERIFIED  
**Repository Source:** `https://github.com/morluto/rea` (morluto/rea v6.5.0)  
**Governing Doctrines:** `INGEST-AND-LEARN`, `DIRECT-TO-MIND/ENGINE`, `REASONING DOCTRINE`

---

## 1. Executive Summary & Doctrine Alignment

The Galaxy Sports Edge (GSE) Omni-Cognitive World Model requires continuous, low-latency intelligence on market liquidity, bookmaker shading, undocumented WebSocket feeds, and proprietary tracking telemetry. Commercial operators frequently wrap public and proprietary data behind obfuscated mobile applications (React Native Hermes bytecode, Flutter AOT, Kotlin/Java, native C/C++ SOs) or minified web applications.

Under the **`INGEST-AND-LEARN` doctrine (2026-09-28)**:
> *"DO NOT CLAIM THINGS ARE DEAD UNTIL TESTED AND CITED AND CONFIRMED. Untested items default to UNTESTED — QUEUED FOR EVALUATION, never SKIP/DEAD. WE INGEST, WE LEARN: commercial data is never used commercially — it is learned from with intelligence and reasoning, then GSE gives its own analysis."*

The `morluto/rea` (Reverse Engineer Anything) framework provides a unified CLI and Model Context Protocol (MCP) engine to inspect, decompile, trace, and reconstruct any target across native binaries, mobile packages (APK/AAB/IPA), managed runtimes (Java/JVM, .NET/CLR), browser/Node bundles, and network captures.

This playbook operationalizes REA within the GSE fleet.

---

## 2. REA Architecture & Capabilities Matrix

REA integrates a multi-layered engine cascade to decompile and inspect targets without requiring ad-hoc manual setups:

| Target Category | REA Tool / Engine | Primary Capabilities | GSE Sports Analytics Application |
|---|---|---|---|
| **Android APK / AAB** | `inspect_android_package`, JADX, Apktool | Manifest analysis, Dalvik bytecode decompilation, resource parsing, string extraction | Decompile DraftKings, FanDuel, PrizePicks, and Underdog mobile clients; extract API endpoints and token rotation logic. |
| **Hermes / React Native** | `analyze_javascript_application`, `wakaru`, `hermes-dec` | Disassemble HBC (Hermes Bytecode), reconstruct JS AST, de-obfuscate source maps | Reverse engineer modern hybrid sports apps that compile JS to Hermes bytecode. |
| **Electron & Web Bundles** | `analyze_javascript_application`, ASAR unpacker | ASAR archive extraction, Webpack/Vite bundle slicing, identifier recovery | Inspect desktop odds scrapers, vendor UI clients, and live gamecast frontends. |
| **Native Binaries (x86_64, ARM64)** | `open_binary`, Ghidra, Hopper, Cutter | P-code intermediate representation, CFG recovery, symbol resolution, cross-references | Disassemble proprietary pricing engines, vendor C++ feed bridges, and low-latency C libraries. |
| **Protobuf / WebSocket Feeds** | `unblob`, `web-network-captures`, `pwntools` | Network packet dissecting, protobuf wire-format decoding, framing extraction | Extract binary schemas from live push feeds (e.g. Genius Sports, Sportradar, BetMGM WebSocket). |
| **Java / JVM Bytecode** | `McByte`, Procyon, CFR | Bytecode pattern matching, class hierarchy analysis, reflection tracing | Decompile Java data connectors, Kafka consumers, and historical enterprise feed parsers. |

---

## 3. Sports Intelligence Target Workflows

### 3.1 Workflow A: Mobile Sportsbook Target Decompilation (DraftKings / FanDuel / PrizePicks)

1. **Acquire & Ingest Target Artifact:**
   Store package in a secure quarantine workspace:
   ```bash
   mkdir -p artifacts/quarantine/sportsbook_apks
   # Ingest target APK
   ```

2. **Inspect Manifest & Entrypoints via REA:**
   ```bash
   npx -y rea-agents@latest inspect_android_package \
     --path artifacts/quarantine/sportsbook_apks/target_v12.apk \
     --extract-manifest --json
   ```
   *Yields:* Exported services, deep link schemes (`sportsbook://parlay/...`), SSL pinning implementation classes (e.g. `okhttp3.CertificatePinner`), and remote API base URLs.

3. **Locate Internal Odds & Settlement API Contracts:**
   Scan decompiled sources for API routes:
   ```bash
   npx -y rea-agents@latest search_decompiled_code \
     --path artifacts/quarantine/sportsbook_apks/target_v12.apk \
     --query "api/v2/sports/event" \
     --json
   ```

4. **Bypass Dynamic Obfuscation & Extract Network Payloads:**
   When classes are obfuscated via ProGuard/R8:
   - Identify JSON serialization annotations (`@SerializedName`, `@JsonProperty`).
   - Extract the data model for alternate lines, teaser multipliers, and SGP correlation penalties.

---

### 3.2 Workflow B: Live WebSocket Wire-Format Protocol Reverse Engineering

1. **Capture Live WebSocket Traffic:**
   Capture raw network frame dump during high-volume live game window (e.g., Sunday 1:00 PM EST kickoff).

2. **Run Protobuf Schema Reconstruction:**
   Using REA network capture analysis:
   ```bash
   npx -y rea-agents@latest analyze_network_capture \
     --pcap artifacts/captures/sportsbook_ws_live.pcap \
     --detect-protocols "protobuf,msgpack,json" \
     --json
   ```

3. **Reconstruct `.proto` Definitions:**
   REA extracts field wire types (varint, fixed64, length-delimited) and field tag numbers:
   ```protobuf
   syntax = "proto3";
   message LiveOddsUpdate {
     uint64 event_id = 1;
     int32 period = 2;
     int32 clock_seconds = 3;
     repeated MarketQuote markets = 4;
   }
   message MarketQuote {
     string market_id = 1;
     int32 selection_id = 2;
     sint32 american_odds = 3;
     uint32 liquidity_limit_cents = 4;
   }
   ```

4. **Direct Engine Wiring:**
   The reconstructed proto is directly compiled into TypeScript interfaces in `packages/prediction-engine/src/ingest/` for zero-overhead parsing of live game feeds.

---

### 3.3 Workflow C: High-Frequency Odds Scraper & Desktop Client Extraction

1. **Extract ASAR Archive:**
   ```bash
   npx -y rea-agents@latest analyze_javascript_application \
     "C:/Program Files/TargetOddsTracker/resources/app.asar" \
     --extract-source --json
   ```

2. **Recover De-minified Module Graphs:**
   Using AST property matching (`wakaru` engine inside REA):
   - Map module dependencies.
   - Extract internal mathematical smoothing functions (exponential moving averages on in-play win probabilities).
   - Ingest smoothing parameters into `packages/prediction-engine/src/continual/`.

---

## 4. Operational Best Practices & Safety Boundaries

1. **Zero-Execution Quarantine:** Never execute untrusted binaries on the host system without container isolation or headless static analysis.
2. **Defensive License & Attribution Verification:** Commercial binaries are reverse-engineered exclusively for format specification, protocol interoperability, and analytical learning (`INGEST-AND-LEARN`).
3. **AST Extraction over Raw Copying:** We extract mathematical formulas, state transition graphs, and data structures. We never copy proprietary executable code.
4. **Reproducible Proof Artifacts:** All reverse-engineering findings must emit a structured JSON report detailing SHA-256 hashes, decompilation tool versions, discovered AST signatures, and mathematical formalisms.

---

## 5. REA Command Reference Cheatsheet

```bash
# General diagnostics
npx -y rea-agents@latest doctor --json

# Analyze minified JavaScript or React Native bundle
npx -y rea-agents@latest analyze-javascript-application <path-to-js-bundle> --json

# Decompile native binary via Ghidra headless
npx -y rea-agents@latest open_binary <path-to-binary> --engine ghidra --json

# Inspect APK classes and manifests
npx -y rea-agents@latest inspect_android_package <path-to-apk> --json

# Extract firmware or embedded data blobs
npx -y rea-agents@latest extract_firmware <path-to-blob> --out-dir <output-dir> --json
```
