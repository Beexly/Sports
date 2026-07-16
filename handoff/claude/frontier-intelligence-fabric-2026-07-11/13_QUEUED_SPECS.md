# 13 — Queued Governed Specs (Workstream F)

Twelve future capabilities, specified but deliberately NOT implemented — no
production code exists for any of them, and none may be built without its
owner gate. Each spec: target files · data contract · risk · smallest
experiment · flag · acceptance · rollback · owner gate.

---

## F1 — Read-only codebase graph / MCP pilot

- **Target:** `apps/web/lib/code-graph/` (adapter + typed queries); pilot runs in a DISPOSABLE environment first, never against the working checkout.
- **Contract:** `CodeGraphNode {path, kind, exports}` / `CodeGraphEdge {from, to, kind}`; read-only.
- **Risk:** HIGH (binary provenance, resource use, privacy of code).
- **Smallest experiment:** index a single package in a throwaway container; compare 10 known call-chains against grep truth.
- **Flag:** `CODEBASE_MEMORY_MCP_ENABLED`. **Acceptance:** answer quality ≥ grep baseline on the fixture set; zero writes. **Rollback:** delete adapter; no state.
- **Owner gate:** adoption dossier (radar path) + approval of the specific external tool.

## F2 — SandboxProvider (worktree/Docker isolated execution)

- **Target:** `apps/web/lib/agent-foundry/sandbox/` (`SandboxProvider` interface: `provision → execute → collect → destroy`), first impl = git worktree + no-network Docker.
- **Contract:** `SandboxRun {manifestId, contentHash, inputs, artifacts, logs, exitState}` — pairs with the Foundry manifest; nothing runs without an APPROVED manifest (still impossible in code).
- **Risk:** CRITICAL (execution!). **Smallest experiment:** run `repo-truth-auditor` in a worktree with network disabled; verify artifact + audit log.
- **Flag:** `SANDBOX_EXECUTION_ENABLED`. **Acceptance:** kill switch works; egress blocked; artifacts reviewed before use. **Rollback:** flag off; provider deleted; worktrees pruned.
- **Owner gate:** explicit owner approval of the first manifest AND the runner.

## F3 — Evidence graph (nodes/edges)

- **Target:** `apps/web/lib/evidence-graph/` (pure builders first; Prisma models `EvidenceNode`/`EvidenceEdge` only after redundancy check vs CockpitTask/SubagentRun/JarvisMemoryEvent).
- **Contract:** node kinds source|snapshot|claim|candidate|decision|receipt|result|memory; edges carry provenance.
- **Risk:** MEDIUM. **Smallest experiment:** build the graph for ONE settled pick from existing tables; render as Mermaid in the cockpit.
- **Flag:** `EVIDENCE_GRAPH_ENABLED`. **Acceptance:** every edge cites a real row. **Rollback:** revert module. **Owner gate:** any schema addition (own PR, owner-applied migration).

## F4 — Decision Genome dissent & sensitivity extensions

- **Target:** `apps/web/lib/decision-genome/dissent.ts` — preserve independent agent claims + explicit falsifiers; sensitivity = how much a verdict flips per input perturbation (deterministic fixtures).
- **Risk:** MEDIUM (must not alter current apertures silently). **Smallest experiment:** replay 5 historical decisions with dissent recorded; verdicts unchanged.
- **Flag:** none needed if pure + unused by production paths until wired; wiring is its own gate. **Acceptance:** replay-invariance test. **Rollback:** revert. **Owner gate:** wiring into live apertures.

## F5 — Source-cited Jarvis memory recall

- **Target:** `apps/web/lib/jarvis/memory/recall.ts` — recall returns `{memoryId, timestamp, sourceRef}`; an uncited recall is a thrown error, not a degraded answer.
- **Risk:** MEDIUM. **Smallest experiment:** recall against seeded fixture events in a dev DB.
- **Flag:** `JARVIS_MEMORY_RECALL_ENABLED`. **Acceptance:** every "Jarvis remembers" claim carries id+timestamp; conflict states surface, never auto-resolve. **Rollback:** flag off. **Owner gate:** B2 first (activation write), then recall.

## F6 — Rights-aware Film Room

- **Target:** `apps/web/lib/film-room/` intake requires a `RightsSnapshot` per asset (clearance-engine path); transcript/keyframe evidence with frame budgets.
- **Risk:** HIGH (media rights). **Smallest experiment:** one GSE-OWNED clip end-to-end.
- **Flag:** `FILM_ROOM_ENABLED`. **Acceptance:** zero assets without rights snapshots (structural, like wrapExtractedRecord). **Rollback:** flag off; assets deleted. **Owner gate:** each source's rights classification.

## F7 — Multimodal Studio adapter graph

- **Target:** `apps/web/lib/studio/graph/` — versioned node graph (storyboard→asset→edit→render→review); every custom node is code and gets the Foundry scanner.
- **Risk:** HIGH (AGPL-adjacent patterns; content rights; spend). **Smallest experiment:** one static-image pipeline with pinned seeds, offline.
- **Flag:** `MULTIMODAL_STUDIO_ENABLED`. **Acceptance:** reproducible outputs (same seed → same asset); provenance stamped. **Rollback:** flag off. **Owner gate:** spend + any external engine adoption.

## F8 — Owner-only Voice Jarvis

- **Target:** `apps/web/lib/jarvis/voice/` — local VAD→STT→intent; voice selects a TYPED intent; execution rules unchanged (voice can never trigger an external or irreversible action).
- **Risk:** HIGH (mic privacy). **Smallest experiment:** offline transcription of an owner-recorded sample to a typed cockpit intent, displayed not executed.
- **Flag:** `JARVIS_VOICE_ENABLED`. **Acceptance:** no audio leaves the device; text confirmation required. **Rollback:** flag off. **Owner gate:** consent + biometric review before ANY voice model use.

## F9 — Typed Cockpit Copilot

- **Target:** `apps/web/lib/cockpit/copilot/` — natural language → one of the EXISTING typed intents (ask-jarvis registry); policy decides execution; DOM automation is not an authority model.
- **Risk:** MEDIUM. **Smallest experiment:** map 20 owner phrasings to intents with a fixture eval; zero new authority.
- **Flag:** `COCKPIT_COPILOT_ENABLED`. **Acceptance:** unmappable input degrades to the intent menu, never to a guess. **Rollback:** flag off. **Owner gate:** none for read-only mapping; any new intent is reviewed code.

## F10 — Scenario / counterfactual engine

- **Target:** `packages/prediction-engine/src/scenario/` — replay decisions under perturbed inputs using ONLY point-in-time knowable data (knowability checks already exist).
- **Risk:** MEDIUM (lookahead leakage). **Smallest experiment:** re-run one week of settled picks with ±1 line perturbation; verify no future data enters.
- **Flag:** `SCENARIO_ENGINE_ENABLED`. **Acceptance:** lookahead-invariance tests extend to scenarios. **Rollback:** revert. **Owner gate:** publishing any scenario-derived claim.

## F11 — Bounded reliability recovery (self-healing with a leash)

- **Target:** `workers/recovery/` — a failed ingestion/settlement job may retry with backoff and file a CockpitTask; it may NEVER mutate schema, credentials, or gates.
- **Risk:** MEDIUM. **Smallest experiment:** kill one ingestion run; verify bounded retry + task filed + no other action.
- **Flag:** existing worker config. **Acceptance:** recovery actions enumerated in an allowlist; everything else escalates. **Rollback:** disable worker. **Owner gate:** expanding the allowlist.

## F12 — Public proof v2

- **Target:** extend `/verify` + slate commitments (e.g. per-day inclusion proofs downloadable as JSON). STRICT: method opacity preserved; every field passes the existing projector + scanners; sealed-engine pins extended FIRST.
- **Risk:** HIGH (public claims). **Smallest experiment:** downloadable inclusion proof for one settled pick, verified by an independent script.
- **Flag:** `PUBLIC_PROOF_V2_ENABLED`. **Acceptance:** browser-verifiable with zero server trust; no method vocabulary. **Rollback:** flag off. **Owner gate:** public-claim review before enable.

---

Ordering recommendation (leverage ÷ risk): F5 → F3 → F9 → F10 → F2 → F1 →
F11 → F12 → F4 → F6 → F7 → F8. Memory recall (F5) is first because B2 (one
owner write) unlocks the entire learning plane.
