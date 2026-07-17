# Genesis Convergence Map (GG-000)

Produced 2026-07-17 against live repository evidence. Every classification below cites exact files, symbols, branches, or PRs. This map changes no production behavior.

## Frozen contract

- **WORKSTREAM:** GG-000 — Genesis convergence map (docs/frontier/GALAXY_GENESIS_QUEUE.md).
- **USER AND SYSTEM VALUE:** prevents duplicate architecture before Genesis implementation expands; converts three parallel program queues into one dependency graph; gives every later workstream a verified existing-asset baseline.
- **CURRENT IMPLEMENTATION:** none (this document is the deliverable).
- **RECOVERABLE ASSETS:** enumerated in §2–§4 below.
- **EXPECTED FILES:** `docs/frontier/GENESIS_CONVERGENCE_MAP.md` (new), `docs/frontier/GALAXY_GENESIS_QUEUE.md` (status update only).
- **PROTECTED ZONES:** none touched — docs-only; settlement/CLV/calibration/proof/rights/entitlements/billing/routing all untouched.
- **ACCEPTANCE CRITERIA:** per queue GG-000 — every claimed capability cites exact files+symbols; missing vs doctrine-only distinguished; no "absent" verdict without targeted search; no broad full-docs scan.
- **VERIFICATION COMMANDS:** `git diff --check`; `node scripts/guardrails/secret-scan.mjs <changed docs>`; evidence-path spot-checks.
- **EXPLICIT EXCLUSIONS:** no code, no schema, no route, no flag, no merge, no GG-001 implementation.

## 1. Baseline

- `main` = `0e56c477` (fix(settlement) #119; verified via `git ls-remote` — local ref equal to live remote).
- This branch (`chatgpt/galaxy-genesis-orchestrator` @ `8bd16ef0`) = main + the two Genesis docs; main is an ancestor → no rebase required.
- Live open PRs (verified via GitHub API 2026-07-17): #52, #101, #112 (draft), #121, #122, #123, #124, #125 (draft), #126.
- Session frontier branch `claude/galaxy-sports-edge-pdcswh` @ `e901e89b` (pushed; no PR): main + W000-slice-1 + W001 + W002 + W-OTS + W-MCP + W-WEATHER-REC + W003 + W004.

## 2. Canonical-system → existing-symbol table

Legend: **WORKING(main)** = running code on main · **STRANDED(x)** = working code on unmerged branch/PR x · **GATED** = implemented, founder-gated/env-off · **DOCTRINE** = written intent only · **ABSENT** = targeted search found nothing.

| Genesis organ (canon) | Status | Evidence (exact) |
|---|---|---|
| Reality Kernel — bitemporal evidence, no-lookahead | STRANDED(pdcswh) + WORKING(main, partial) | Worldline: `apps/web/lib/worldline/{store,delta,digest,types}.ts` (`WorldlineStore`, `auditReplayStability`, exact-attribution replay audit; 14 tests) on pdcswh. On main: leak-free as-of feature admission `packages/prediction-engine/src/edge-lab/asof-store.ts` (`AsOfFeatureStore.assertNoLookahead`) + §5 trials registry (#120) |
| SportsIR (the canon's 12 primitives + 4 clocks) | STRANDED(pdcswh) — **already typed, verbatim match** | `packages/types/src/sports-ir.ts` @ `e901e89b`: the canon's exact 12 primitives (Entity…Proof) + `occurredAt/publishedAt/observedAt/effectiveAt`; 6 adapters proven against real objects in `apps/web/lib/sports-ir/adapters.ts` (16 tests); 6 DECLARED-only, honestly labeled |
| Proof Fabric — receipts, commitments, verification | WORKING(main) + STRANDED(pdcswh, extended) | Main (#120): `PickProofReceipt` spine, `/api/verify` (sealed→open policy), `/api/proof/{ledger,receipts,openapi.json,verification-spec.json}`, `/llms.txt`, `hashLeaf/merkleRoot/canonicalPickPayload` (`packages/prediction-engine/src/proof-of-record.ts`), `SlateCommitment` Merkle roots. pdcswh adds: OTS Bitcoin anchoring (`packages/crypto/src/{ots-anchor,ots-upgrade}.ts`, live-verified), `/api/proof/ots/[slateKey]`, hosted proof-MCP `/api/mcp` (7 tools), Reality Receipt v0 (`apps/web/lib/reality-receipt/`, composes envelope digest + tamper check + anchor) |
| Evidence envelope / epistemic playback | STRANDED(pdcswh + #112) | `apps/web/lib/intelligence-playback/` (`buildPickEvidenceEnvelope`, `canonicalJson`, epistemic deltas, audience projections) ported to pdcswh (W001) from draft PR #112 @ `9b6da1ae` |
| Software Genome / model routing & execution | WORKING(main) | ONE approved Anthropic sink `apps/web/lib/claude-api/messages.ts` (`callClaudeMessages`, whitelist-enforced by `scripts/guardrails/claude-api-usage.mjs`); provider dispatch `provider-dispatch.ts` (`callClaude` → Bedrock/Vertex/direct w/ fallback; wired into all 7 generation surfaces); surface→tier router `model-router.ts` (`pickModelForSurface`); Bedrock `providers/bedrock.ts` + Vertex `providers/vertex.ts` (GATED: `CLAUDE_PROVIDER` env, dormant); Cerebras free lane `providers/cerebras.ts` + `free-lane.ts` (GATED + inert — `generateContentMessages` referenced only by tests); economics `model-economics.ts`, `cost-monitor.ts`, `usage-store.ts`, `credit-pool.ts` (pools aws_activate/vertex_partner/anthropic_direct); default-BLOCK paid-op governor `apps/web/lib/cost/cost-governor.ts` (`requirePaidOperation`) |
| Model Ecology — shadow portfolio router, regime routing | STRANDED(#124) | PR #124 @ `a7b38043` (`claude/frontier-superset-rebased`; also `claude/frontier-model-router-shadow-2026-07-11`): shadow-only AI Model Portfolio Router, `AI_MODEL_ROUTER_SHADOW_ENABLED` default off. Targeted search confirms ZERO matching files on main/pdcswh (`git ls-tree origin/main` grep foundry/radar/assurance/portfolio: only Jarvis/agent hits) |
| Capability Genome | DOCTRINE + fragments | No unified genome exists. Existing partial vocabularies (all WORKING on main, none plan-compilable): `apps/web/lib/jarvis/capability-registry.ts` (`JarvisCapability`, status NOT_WIRED→ACTIVE), `apps/web/lib/agents/agent-os.ts`+`agent-registry.ts` (`AgentOSDefinition`, 22-agent registry), `apps/web/lib/agents/agent-capabilities.ts` (action vocab), `apps/web/lib/resource-intelligence/types.ts` (`ResourceDisposition`); plus #124's Agent Foundry manifests (STRANDED). PR #125 freezes the first buildable genome contract (`GenesisCapability`, 12-state vocab) — see §5 ruling |
| Research Cortex / Unknown-Unknown Radar | STRANDED(#124, v2) + WORKING(main, v1) | v1 file-backed Resource Intelligence: `apps/web/lib/resource-intelligence/{classify,parse,pipeline,types}.ts` + root scripts `resource-intel:generate`/`test:resource-intel` (main). Resource Radar 2.0 + Assurance: #124 only. External research-network adapters (OpenAlex etc.): ABSENT (targeted search; queue parallel-lane, not started) |
| Red Queen Laboratory | DOCTRINE | Canon + queue GG-006 only. Adjacent working substrate: promptfoo parity gate `eval/promptfoo/promptfooconfig.yaml`, eval contracts `scripts/eval-contracts.mjs` (last guardrails step), edge-lab walk-forward/placebo/MI gates (#120) |
| World Foundry / Galaxy Multiverse / Dynasty | STRANDED(#52) + DOCTRINE | `packages/galaxy-engine` world graph on PR #52 @ `39775749` (13-month-stale base, additive, 84 tests per PR record). Branch-reality types: `SportsIrBranch` DECLARED (pdcswh W004); frontier queue W007 |
| Source/rights governance | WORKING(main) — **with one real duplicate** | Canonical: `apps/web/lib/scraping/clearance-engine.ts` (`checkClearance`, `wrapExtractedRecord` throws unless allowed, 14 gates) + `apps/web/lib/scraping/source-rights-registry.ts` (9-status vocab, `snapshotRights`). DUPLICATE parallel copy: `apps/web/lib/source-rights/source-rights-registry.ts` (§3.1) |
| Draft-only / human-review boundary | WORKING(main) | `scripts/guardrails/draft-only.mjs` — CI-fails any publish-side write or outbound send path; `model-freeze.mjs` pins MODEL_VERSION |
| Guardrail chain | WORKING(main) | 17-step root `guardrails` script (trust-gate → … → eval-contracts), `scripts/guardrails/*.mjs` |
| Neural Genome / Hugging Face lane | ABSENT (searched) + DOCTRINE | No HF integration code on main/pdcswh (targeted grep). AWS/model-cloud governance layer exists: `apps/web/lib/fable/` (aws-governance-os, aws-gates, source-registry; tests green on pdcswh) + `docs/fable/aws/AWS_MODEL_ROUTER_DESIGN.md` (design only) |
| Agent Civilization / MCP gateway | WORKING(main, registry) + STRANDED(pdcswh, MCP) | Agent OS registry (above) on main; hosted MCP server `/api/mcp` + `apps/web/lib/proof-mcp/tools.ts` (7 tools, 24 tests) on pdcswh; stdio MCP packet not yet vendored (master-plan Phase 2) |
| Edge Swarm / Federation / Interface Compiler / Science-to-Product / Commons | DOCTRINE | Canon + queue lanes only; no code found (targeted searches for federation/enclave/interface-compiler symbols) |

## 3. Duplicate and conflict map

1. **Duplicate source-rights registry (real, on main):** `apps/web/lib/source-rights/source-rights-registry.ts` parallels canonical `apps/web/lib/scraping/source-rights-registry.ts`. Disposition: reconcile in a dedicated protected-zone slice (master-plan Phase 2.4, gse-red-team required). NOT fixed here (docs-only).
2. **Four routing decision-makers + a stranded fifth:** `model-router.ts` (tier), `provider-dispatch.ts` (provider), `free-lane.ts` (lane), `cost-monitor.ts` (budget block) on main — coherent layering today — plus #124's shadow portfolio router which would sit above all of them. Conflict only materializes if #124 is recovered without unifying; recovery slice (frontier W006) must make the portfolio router consume, not duplicate, the existing three.
3. **Capability-vocabulary multiplication risk:** Jarvis registry, Agent OS registry, ResourceDisposition, #124 manifests, and the canon's CapabilityGenome. Ruling: GG-001 builds ONE genome (§5); existing registries get ADAPTED into it via projection (per GG-001's own acceptance: "existing registries are adapted rather than duplicated"), never rewritten.
4. **Three parallel program queues (meta-duplication):** frontier `WORKSTREAM_QUEUE.md` (W000-W010, on pdcswh), PR #125 `docs/genesis/WORK_QUEUE.md` (GX-*), PR #126 `GALAXY_GENESIS_QUEUE.md` (GG-*). Resolved in §5: GG-queue is the umbrella; GX-000 is GG-001's frozen build contract; W-queue items map into GG lanes (W002→Reality Kernel ✓ done, W004→SportsIR ✓ done, W005→Interface/Contract lane, W006→GG-001-adjacent recovery, W007→GG-007).
5. **canonical-json triplication:** `apps/web/lib/intelligence-playback/canonical-json.ts` is the reference; worldline/reality-receipt reuse it in-app; the genesis kernel (packages/*) cannot import apps/web and will carry a verbatim copy. Accepted, recorded; future unification point once SportsIR/kernel merges to main.
6. **Reality Receipt naming:** canon's rich `RealityReceipt` (§Proof Fabric) vs shipped v0 `apps/web/lib/reality-receipt` (envelope digest + tamper check + Bitcoin anchor). The shipped object is a strict subset on the same trajectory — GG-008 EXTENDS it (adds contract/world/computation fields); it must not be rebuilt.
7. **Ledger split:** frontier `DECISION_REGISTER.md`/`CURRENT_STATE.md` live on pdcswh (stranded from main's view); PR #125 carries its own `docs/genesis/DECISIONS.md`. Durable GG decisions recorded here + mirrored to the frontier register when work lands on pdcswh. Unify when pdcswh merges (OWNER_GATE).

## 4. Recover / reuse / supersede decisions

| Asset | Decision |
|---|---|
| #120 Glass Ledger/Edge Engine (main) | REUSE as-is — the deterministic-evidence + eval substrate for GG-003/GG-005 |
| pdcswh frontier stack (W001-W004, OTS, MCP, Reality Receipt) | REUSE/EXTEND — canonical SportsIR + Proof Fabric implementations; founder merge is the activation path (OWNER_GATE) |
| #124 Foundry/Radar/Assurance/shadow router | RECOVER (do not recreate) in frontier W006 after GG-001 lands, adapting its manifests into the genome; guard-script interplay re-check required (RECOVERY_MATRIX) |
| #112 playback remainder | RECOVER_PARTIAL continues (spine already ported; market-values, cockpit playback etc. slice-by-slice) |
| #52 galaxy-engine | PRESERVE/FUTURE (GG-007/World Foundry convergence; stale base, port additively) |
| #101 | SUPERSEDED by #122 (founder closes) |
| Jarvis/AgentOS/ResourceIntelligence registries | REUSE via genome adapters (GG-001 acceptance rule); never rewritten |
| claude-api surface incl. Bedrock/Vertex/Cerebras | REUSE as the genome's first LIVE/GATED capability rows — already evidence-mapped (master plan §5, 12 seeds) |
| PR #125 control package | REUSE — its FIRST_BUILD_CONTRACT is GG-001's build contract (§5); vendored onto the implementation branch, PR #125 itself stays unmerged R&D |

## 5. Convergence ruling: GG-001 ≡ GX-000 (one build, not two)

PR #125 (`docs/genesis/FIRST_BUILD_CONTRACT.md`, GX-000: Codebase Twin v0 + Metacortex Plan Compiler v0 in `packages/genesis-kernel`) and PR #126's GG-001 (Universal Capability Genome v0) specify the SAME first deliverable: a canonical, deterministic, evidence-derived capability representation with identity/hash, lifecycle-state vocabulary, fail-closed validation, golden tests, and one adapter from a real repository capability. Point-by-point: GG-001's "capability identity and exact revision / origin and lineage / rights, privacy and security states / cost, latency envelopes / lifecycle state" = GX-000 §7.1 `GenesisCapability` (+ `CapabilityState` 12-state vocab); GG-001's "stable deterministic identity/hash + deterministic serialization" = GX-000 §9.5 semantic hashing; GG-001's "one adapter projecting an existing repository capability" = GX-000 §8.2's twelve evidence-derived seeds; GG-001's "invalid lifecycle transitions fail closed / missing rights cannot masquerade as approved" = GX-000 §9.3 hard constraints + UNKNOWN-fails-closed eligibility. GX-000 additionally ships the plan compiler — a superset, already fully design-validated (utility function, hashing traps, 20 tests, CI lockfile risk) in the founder-approved master plan of 2026-07-17.

**Ruling:** exactly ONE implementation — `packages/genesis-kernel` per the GX-000 contract — satisfies both queues. GG-001's SportsIR-mapping requirement is met by referencing the `sports-ir.ts` vocabulary (type-mirrored until pdcswh merges; adapters follow the established convention). Anything less would be the "uncontrolled multiplication of parallel systems" both packages exist to prevent — including multiplication of the control packages themselves.

## 6. Dependency graph (GG-001 onward)

```
GG-000 (this map) ✓
└─ GG-001 ≡ GX-000 build (packages/genesis-kernel; contract frozen+validated; NEXT)
   ├─ GG-002 Research Cortex v0        (genome types + resource-intelligence v1 as candidate registry)
   ├─ GG-003 Causal Constitution v0    (compiles EXISTING invariants: worldline no-lookahead, trials
   │                                    registry admission, draft-only, model-freeze, claim scanner —
   │                                    additive rule-evaluator over the current guardrail chain)
   ├─ GG-004 Negative Knowledge v0     (seed from reports/audits/*, FAILURE_REPORT_*, reverted PRs)
   ├─ frontier W006 Capability Foundry (recover #124 INTO the genome; portfolio router consumes
   │                                    existing routing stack)
   └─ GG-005 Galaxy Combine v0         (promptfoo gate + eval-contracts as incumbent harness)
      └─ GG-006 Red Queen v0
GG-007 Multiverse v0 ← Worldline (W002 ✓) + W007 branch types (SportsIrBranch DECLARED)
GG-008 Proof Fabric v0 ← EXTEND apps/web/lib/reality-receipt + OTS + machine-proof (not a rebuild)
GG-009 Science-to-Product ← after GG-005/GG-008
```

**Safest GG-001 first slice** (the queue's own acceptance, mapped): build `packages/genesis-kernel` exactly per the validated master plan — evidence table of 12 real capabilities, twin snapshot + collision report, fixture plan compiler with hard-policy elimination, 20 tests, shadow-only, draft PR. Zero additional planning spend required.

## 7. OWNER_GATE records

```
OWNER_GATE OG-GG-1
Decision: merge claude/galaxy-sports-edge-pdcswh (SportsIR/Worldline/Proof-Fabric stack) to main.
Why founder authority: production main merge; entitlement- and proof-adjacent surfaces.
Default non-destructive disposition: branch stays pushed + green; GG work type-mirrors until merged.
Work completed around the gate: this map; GG-001 proceeds in its own worktree from main.

OWNER_GATE OG-GG-2
Decision: PR dispositions #52/#101/#112/#121/#122/#123/#124/#125/#126 (merge/close/recover order).
Why founder authority: main merges + additive prod migrations (#122) are founder-only (OG-001, DEC-005).
Default: all remain open; recovery classifications recorded in §4.
Work completed around the gate: dependency graph sequences recovery without merging.
```

## 8. Verification (this workstream)

- Docs-only diff (`GENESIS_CONVERGENCE_MAP.md` added, `GALAXY_GENESIS_QUEUE.md` status-annotated); `git diff --check` clean; secret-scan on changed docs exit 0.
- Evidence-path spot-checks: every path in §2 verified present in its named tree (main worktree greps + `git ls-tree origin/main`) or its named branch/PR during the 2026-07-17 session sweeps.
- No test/behavior surface touched; no full-suite run required (docs-only, per targeted-verification law).
