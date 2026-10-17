# REA TOOLKIT AUDIT REPORT (`morluto/rea`)
**Repository**: `https://github.com/morluto/rea`  
**Inspected Date**: 2026-10-16T23:26:00Z  
**Audit Standard**: Exhaustive inspection of commit SHA, license, dependencies, runtime requirements, protocols, modules, and execution boundaries.

---

## 1. Commit SHA, License, and Repository Tree
- **Commit SHA**: `e31aa72c9d44b22ae4fb86a21700d877496d785b`
- **Commit Date**: Sat Oct 17 12:17:44 2026 +0800
- **Author**: `morluto <76467478+morluto@users.noreply.github.com>`
- **License**: MIT License (Copyright (c) 2025–2026 morluto)
- **Package Name**: `rea-agents` (`io.github.morluto/rea`), Version `6.5.0`
- **Binary CLI**: `scripts/rea.mjs` (`bin: { "rea": "scripts/rea.mjs", "rea-agents": "scripts/rea.mjs" }`)
- **Repository Tree Summary**:
  - `src/`: 1,495 TypeScript source files across 45 domains (`browser/`, `javascript/`, `pcap/`, `sqlite/`, `wasm/`, `evm/`, `ghidra/`, `ida/`, `hopper/`, `frida/`, `adb/`, `android/`, `contracts/`, `cli/`, `filesystem/`, etc.)
  - `scripts/`: CLI runners, verification scripts, build wrappers
  - `dist/`: Build target for compiled ESM/CJS bundles

---

## 2. Dependencies and Runtime Requirements
- **Runtime**: Node.js `>= 20.0.0` (tested on Node.js v24.11.0 / Windows x64)
- **Key Extraction & Protocol Dependencies**:
  - `playwright-core`: Headless browser instrumentation, Chrome DevTools Protocol (CDP) session management.
  - `@modelcontextprotocol/client` & `@modelcontextprotocol/server`: MCP protocol integration.
  - `har-schema`: HTTP Archive (HAR) format validation for captured network traffic.
  - `evmole`: EVM bytecode and smart contract interface extraction.
  - `isomorphic-git`: Git repository and release asset inspection.
  - `stream-chain` & `stream-json`: Streaming JSON parser for large payload ingestion without memory exhaustion.
  - `canonicalize` & `lossless-json`: Deterministic JSON serialization and high-precision numeric preservation.
  - `@zip.js/zip.js`: Deflate/inflate extraction for zipped archive artifacts.

---

## 3. Supported Protocols and Domains
- **Web / HTTP / REST**: Full HTTP/1.1, HTTP/2, and HTTP/3 inspection via Playwright and CDP network events (`Network.requestWillBeSent`, `Network.responseReceived`, `Network.getResponseBody`).
- **Binary / Reverse Engineering**: Ghidra (Headless Analyzer), IDA Pro, Hopper, Rizin, Cutter, GDB, LLVM `objdump`.
- **Mobile & Embedded**: Android Debug Bridge (ADB), APKTool, Frida instrumentation, Flutter reverse tooling.
- **Smart Contracts**: EVM bytecode extraction via `evmole` (relevant for Polymarket binary market contract verification).
- **Network Captures**: PCAP native bounds parsing and QLog decoding.
- **Database**: SQLite direct inspection via worker thread (`SqliteDatabaseProvider.ts`).

---

## 4. Exact Usable Modules and Functions for Sports Data Extraction

| REA Module Path | Usable Export / Function | Extraction Role in GSE Pipeline |
|---|---|---|
| `src/filesystem/readStableFileBytes.ts` | `readStableFileBytes()`, `readBoundedStablePrefix()` | Deterministic byte ingestion and SHA-256 verification of Parquet/CSV release assets. |
| `src/browser/CdpBrowserProvider.ts` | `CdpBrowserProvider`, `captureTargetSession()` | Capturing unauthenticated network responses from ESPN and Sleeper. |
| `src/browser/execution/CdpRuntimeRequests.ts` | `CdpRuntimeRequests`, `collectPayloadStream()` | Low-level payload stream interception for live scoreboard and weather APIs. |
| `src/browser/CdpPageCapture.ts` | `CdpPageCapture` | DOM and table extraction from public NextGenStats and weather portals. |
| `src/browser/history/HarCapture.ts` | `HarCapture`, `HarSchema` | Exporting complete audit trails of unauthenticated API sessions. |
| `src/javascript/analysis/JavaScriptAnalysisWorker.ts` | `analyzeJavaScriptBundle()` | De-obfuscating public client-side odds parser scripts. |
| `src/evm/EvmoleInterfaceAdapter.ts` | `EvmoleInterfaceAdapter` | Verifying ABI and public orderbook contract interfaces on Polymarket. |
| `src/sqlite/SqliteDatabaseProvider.ts` | `SqliteDatabaseProvider` | Ingesting and querying local SQLite/DuckDB tracking caches. |

---

## 5. Unsafe or Unsupported Uses
1. **Uncompiled Invocation**: Invoking `scripts/rea.mjs` directly without running `npm run build:cached` will error (`REA's compiled runtime is missing`).
2. **Authenticated Paywall Circumvention**: REA contains no bypasses for paywalls or CAPTCHAs. All operations strictly adhere to Rule 6 (Keyless/Public data only).
3. **Heavy Native Bridge Overhead**: Running full Ghidra/IDA decompiler bridges on simple HTTP JSON endpoints is unsupported and redundant. REA's browser CDP and filesystem prefix readers are the canonical tools for sports API extraction.

---

## 6. Audit Verdict: `USE` (High-Value Modular Toolkit)

**Verdict**: **USE**  
**Justification**:  
REA's architecture provides specialized, hardened TypeScript modules for:
1. Deterministic file byte reads (`readStableFileBytes.ts`) ensuring cryptographic immutability (SHA-256) of every fetched dataset.
2. Direct CDP network payload interception (`CdpRuntimeRequests.ts`) bypassing browser fingerprinting while strictly respecting unauthenticated rate limits.
3. Structured schema and HAR capture (`HarCapture.ts`) guaranteeing PIT-safety (Point-In-Time validation) for every line and odds tick.
