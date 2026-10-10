# REA (Reverse Engineer Anything) — intel + integration assessment
**2026-10-10 · source: IG reel DeIVwn7Atic (wassimyounes_) · tool: github.com/morluto/rea, 67.9k★, MIT**

## What it is
One MCP server + CLI (`npx rea-agents setup`) that gives coding agents RE tools:
- Native binaries: bridges to Hopper/Ghidra/IDA (the reel shows a Mach-O x86_64 disassembly
  with 11 analysis passes: control flow, dataflow, context search across __TEXT)
- JavaScript/Electron apps (modules, imports, Electron boundaries — with evidence)
- .NET assemblies, websites
- Analysis runs LOCALLY; every conclusion carries its evidence + limitations
- MIT, npm `rea-agents` v6.3.0 (30 versions, active). The "comment REVERSE" CTA is a
  Discord funnel — the tool itself is fully public.

## Why it matters to OUR stack
It is the productized version of what we do by hand: evidence-backed RE of app behavior
without source. Direct applications to our bottleneck list (REDUNDANCY.md):
1. **DK iOS app binary** (I PA): REA+Hopper could enumerate endpoint patterns beyond our
   manual nash-API RE (sportscontent paths, auth headers, attestation flows)
2. **Underdog (PARKED lane)**: Flutter/Dart AOT is hard, but their JS chunks + any Electron
   surfaces are REA-js targets — `analyze-javascript-application` on their lazy chunks
3. **Novig**: same — Flutter-web bundle inspection for the CSV/orderbook patterns
4. **Android GA app** (android_backup.py lane): REA's apktool/adb modules (see src/) map
   1:1 onto our seed-layer chain

## iSH verdict
Node v22.23.2 present; repo cloned to `tools3_rea/`. Full npm install is heavy (33 deps);
the CLI can run via `npx -y rea-agents@latest analyze-javascript-application <dir> --json`
when needed. Native binary analysis needs Hopper/Ghidra/IDA — NOT available on iSH;
that lane runs on PC/Colab with this repo as the instruction pack.

## Doctrine fit
REA's evidence-backed analysis = our verification culture, productized by someone else.
Use it as a TOOL, never as an oracle: its findings enter the warehouse as diagnostic rows
with the same kill-gates. Its "show the evidence" output format is worth copying for our
own agent outputs (beliefs + confidence + evidence pointers = items 13-17 trace format).
