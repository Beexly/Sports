# GSE Frontier Decision Register

Append-only. Never rewrite prior entries; add a superseding decision when evidence changes.

## Entry template

### DEC-XXX — Title

- Date:
- Workstream:
- Decision:
- Evidence:
- Alternatives rejected:
- Reversibility:
- Protected zones:
- Files/PRs affected:
- Supersedes:

---

### DEC-001 — W000 slice 1 = recover PR #119

- Date: 2026-07-17
- Workstream: W000
- Decision: Recover PR #119 (settlement side-derivation fix + scanner/CI hardening) onto current main on `claude/galaxy-sports-edge-pdcswh`.
- Evidence: Only open asset fixing an active money-truth defect on main; auto-merge onto c179a78 verified clean before selection; settlement correctness is upstream of calibration/CLV/proof.
- Alternatives rejected: #123 (defense-in-depth, no live bug), #124/#112 (feature substrate, not correctness).
- Reversibility: branch-only; founder merges.
- Protected zones: settlement grading, CI/scanner.
- Files/PRs affected: PR #119 content; 24 files.
- Supersedes: —

### DEC-002 — Cherry-pick, not merge-commit

- Date: 2026-07-17
- Workstream: W000
- Decision: Linear cherry-pick of #119's commits; PR branch left untouched for founder comparison.
- Evidence: Keeps working branch a clean superset of main with per-commit review.
- Reversibility: full.
- Supersedes: —

### DEC-003 — Frontier asset classifications

- Date: 2026-07-17
- Workstream: W000
- Decision: #101 SUPERSEDED by #122; #112 RECOVER_PARTIAL (spine extracted as W001, draft not merged wholesale); #52 deferred to Dynasty convergence; fixture-alignment branch ALREADY_ON_MAIN.
- Evidence: RECOVERY_MATRIX.md rows; empty cherry-pick of 9b61a60 proved fixture parity.
- Reversibility: classifications only.
- Supersedes: —

### DEC-004 — W000 red-team outcome

- Date: 2026-07-17
- Workstream: W000
- Decision: APPROVE-WITH-NOTES accepted. Fixed in-slice: stale `headIsMerge` fail-closed comment. Deferred: (a) secret-scan staged mode silently skips unreadable/oversized index blobs (pre-existing); (b) new numeric performance-claims gate reuses broad line-wide `SAFE_CONTEXT` (incomplete net-new coverage); (c) per-sport catch in `settleSport` gives an impossible pickType a sport-wide blast radius (loud and safe).
- Evidence: red-team report, session 2026-07-17; verification gates all exit 0.
- Reversibility: full.
- Protected zones: settlement, CI/scanner.
- Supersedes: —

### DEC-005 — OWNER_GATE OG-001: merges and migrations are founder-only

- Date: 2026-07-17
- Workstream: W000
- Decision: OWNER_GATE. Merging PRs #119/#121/#122/#123/#124 into main and applying #122's two additive migrations to production require founder authority. Default non-destructive disposition: PRs remain open; #119's content additionally recovered and re-verified on `claude/galaxy-sports-edge-pdcswh` so the merge decision is de-risked. Work continued around the gate.
- Reversibility: n/a (gate record).
- Supersedes: —

### DEC-006 — Adopt founder orchestrator overlay as canonical control layer

- Date: 2026-07-17
- Workstream: (control layer)
- Decision: Install GSE_FRONTIER_ORCHESTRATOR_1.zip overlay (skill + references, agents with resource envelopes, path-scoped rules, shared settings.json); migrate the session-built ledgers' live state into the overlay's canonical names (CURRENT_STATE, WORKSTREAM_QUEUE, RECOVERY_MATRIX, DECISION_REGISTER, FRONTIER_KERNEL); delete divergent duplicates (PRODUCT_KERNEL.md, WORK_QUEUE.md, DECISIONS.md, EXECUTION_PROTOCOL.md).
- Evidence: founder-shipped package; one canonical truth path doctrine.
- Alternatives rejected: keeping two parallel ledger editions (duplicated-truth hazard).
- Reversibility: full (git history preserves both editions).
- Supersedes: FD-numbered entries in the deleted DECISIONS.md (migrated here as DEC-001..005).

### DEC-007 — W001 port scope and grafts

- Date: 2026-07-17
- Workstream: W001
- Decision: Port the intelligence-playback spine (12 lib files), game-room helpers (types/evidence-record/presenters), room primitives + IntelligencePlayback component, and 5 playback tests verbatim from PR #112's branch; graft `load.ts` (codex structure + HEAD's `.catch(() => null)` hardening), room `page.tsx`, and the additive fail-closed access param on `projectForLens`; pass full entitlements in the model-court route. EXCLUDED from slice: `packages/types/market-values.ts` and all `lib/market/*` codex files (separate workstream) — `formatNullable` keeps HEAD's exact semantics instead.
- Evidence: scout closure map; 50-test targeted cluster green; full web 8,323 green; tsc/lint/guardrails/build green.
- Alternatives rejected: merging draft #112 wholesale (283 files, stale base, mega-PR anti-pattern).
- Reversibility: revert commits; no schema, no data.
- Protected zones: entitlements (narrowing only), proof semantics (new envelope digest).
- Files/PRs affected: 29 files + 3 hardening files; PR #112 remains open as source-of-record.
- Supersedes: —

### DEC-008 — W001 red-team outcome and entitlement-policy declaration

- Date: 2026-07-17
- Workstream: W001
- Decision: gse-red-team APPROVE-WITH-NOTES accepted. Applied in-slice: allowlist-form audience gates in projections (runtime-invalid audience degrades to PUBLIC shape); `canonicalJson` rejects class instances (Date can no longer flatten to `{}` in the digest domain). Declared policy narrowings (from #112's adjudicated rulings, matching the CLAUDE.md tier table): `projectForLens` defaults fail-closed; room loader filters premium picks and nulls confidence for un-entitled viewers; loss-autopsy text public only when PUBLISHED+isPublic. OWNER NOTE (not a gate): settled PUBLIC playback events expose per-pick CLV capture — consistent with the public /proof board today; if per-pick CLV should ever be Elite-only, gate playback and /proof together in one pass.
- Evidence: red-team report 2026-07-17; post-fix suites green.
- Reversibility: full.
- Protected zones: entitlements, proof semantics.
- Supersedes: —

## DEC-009 — W002 verifier FAIL, both blockers fixed forward (2026-07-17)

Independent verifier (adversarial, 8 probe tests) returned FAIL with two
blockers, both fixed and regression-encoded:
1. A literal NUL byte (0x00) at store.ts:111 made git classify the file as
   binary — invisible to tsc/vitest/eslint/`git diff --check`. Fixed by full
   clean-bytes rewrite; NUL scan of all worldline files now 0; the committed
   binary blob exists only at b41d768d (squash-on-merge erases it from main).
2. auditReplayStability() named innocent observations (membership heuristic).
   Fixed with EXACT attribution: ServedRead now records the observation count
   at serve time (append-only ⇒ the original view is exactly recomputable);
   offenders = per-cell winner diffs only. The verifier's own repro (innocent
   bystander + backdated culprit) is now test "attribution is EXACT" with an
   exact-set assertion. Also hardened both cell keys to JSON-escaped compound
   form (space-delimiter collision "a b"+"c" == "a"+"b c" eliminated).
Accepted low finding (recorded, not fixed): intermediate contaminators
superseded before the audit runs are not individually named — the final winner
fully explains the divergence.

## DEC-010 — W-OTS slice 1 scope + live-network verification (2026-07-17)

Ported the founder's gse-ots-anchor packet VERBATIM to packages/crypto (no
behavioral edits to verified crypto). CLOSED the packet's one open job in this
environment: live calendar round-trip against the real public OTS network
(ok>0, real pending attestations grafted) + both python-opentimestamps
cross-implementation checks run LIVE (lib installed). Storage seam landed
founder-gated: additive IF-NOT-EXISTS migration 20260717150000_add_ots_anchor
(otsProof BYTEA, otsBitcoinHeight INT) + OTS_ANCHOR_ENABLED default off.
Deferred to next slice: freeze-slate mint wire, /api/proof/ots/[slateKey],
nightly upgrade poll. OWNER_GATE: founder applies the migration. Public-copy
rule pinned: "anchored to Bitcoin" only when otsBitcoinHeight is non-null.

## Packet intake accounting (2026-07-17, founder upload)

gse-ots-anchor → W-OTS (slice 1 DONE). galaxy-proof-mcp → W-MCP (READY).
gse-weather-edge → W-WEATHER-REC (READY; must reconcile with
edge-lab/features/nfl-weather.ts — one canonical path).
GSE_FRONTIER_ORCHESTRATOR_1 → already installed as canon (this system).
Setup-ClaudeCode-Foundry.ps1 → OWNER_GATE (founder machine; Foundry has zero
model deployments — deploy Claude first). Untapped Atlas order queued behind:
Rekor co-publication, Ask-the-Record RAG, GH-Actions backtest grid, enclaves.

## DEC-011 — W-OTS slice 2: mint wire + public proof endpoint (2026-07-17)

Anchoring wired AFTER the atomic Merkle transaction, fail-open by module
contract (anchorSlateCommitment never throws; tested: DISABLED default with
zero network/DB, all-calendars-down still stores the valid pending artifact,
P2022 → SKIP_NOT_MIGRATED, bad root → FAILED result). Public endpoint
/api/proof/ots/[slateKey] serves raw .ots (octet-stream) or ?format=json
status; "anchoredToBitcoin" true only on a real attestation; unmigrated reads
as honest 404 "not activated yet"; outage 503. Discovery rel "ots-anchor"
added to the llms.txt/machine-proof map. Slice 3 (nightly upgrade poll)
deferred: requires an upgrade-fetch addition to the verbatim crypto port —
new-tests-first rule applies.

## DEC-012 — W-MCP slice 1: hosted /api/mcp, minimum-human-input design (2026-07-17)

Founder directive "as little human input as possible" changed the deploy
decision: instead of a separate hosted runtime (new accounts/creds), the
packet's 7-tool contract is served from apps/web itself at /api/mcp
(streamable-HTTP JSON-RPC, stateless JSON responses — spec-permitted). It
deploys with the site: zero new infrastructure, zero founder steps. Handlers
run in-process over the repo's own proof modules and invoke the REAL
receipts/verify route handlers internally, so pagination, the settled-only
leak gate, and tamper checks are exactly the public API's. The JSON-RPC subset
is hand-owned (initialize/initialized/ping/tools/list/tools/call) — no new
dependency, fully auditable. llms.txt discovery rel "mcp" added. Deferred:
vendoring the stdio packet (local installs) and registry listings (founder
click). Read-only by construction; no tool makes a performance claim.

## DEC-013 — W-OTS slice 3: upgrade poll, new-tests-first (2026-07-17)

upgradeDetached lives in a NEW file (ots-upgrade.ts) so the verbatim packet
port stays byte-untouched. Reference semantics: op-path commitment
(sha256/append/prepend) → GET <calendar>/timestamp/<hex> → graft ONLY when the
returned subtree carries a Bitcoin attestation; failures/still-pending keep
the original marker byte-for-byte; input never mutated. 7 unit tests incl. a
hand-computed commitment path and a python-reference parse of an UPGRADED
proof. Nightly poll /api/cron/ots-upgrade: OTS_ANCHOR_ENABLED no-op default,
Bearer CRON_SECRET, unmigrated → honest ran:false, bytes rewritten only on
real progress, height only from an actual attestation (5 route tests).
Documented-not-registered — the founder adds the scheduler entry with the
flag flip. W-OTS is COMPLETE: primitive → storage → mint wire → public
endpoint → autonomous upgrade.

## DEC-014 — W-WEATHER-REC: complementary-layers verdict (2026-07-17)

The gse-weather-edge packet and edge-lab features/nfl-weather.ts are NOT
duplicates: the packet is the AS-OF LOADER (live path = current forecast for a
future hour; backtest path = historical-forecast archive constrained to runs
issued ≤ asOfUtc, never observed weather; provenance + leadTimeHours carried),
and the edge-lab file is the FEATURE CONSUMER with the store-rails leak gate.
Vendored the loader verbatim (loaders/weather-edge.ts, provenance header,
behavioral edits forbidden) + a thin adapter (forecastIssuedAt := the loader's
asOfUtc — the honest latest bound, so a mis-called loader is dropped as leaky
rather than trusted; available:false → honest skip; indoor → neutralized-dome
signal). One canonical path proven end to end by test. REMAINING GATE before
any real historical admission run: the packet spec's §2 strict previous-runs
smoke (confirm Open-Meteo serves the run issued ≤ asOf, not best-lead
stitching) — recorded here so no backtest can slip past it.

## DEC-015 — W003 Reality Receipt v0: compose, don't reinvent (2026-07-17)

- Date: 2026-07-17
- Workstream: W003
- Decision: `buildRealityReceipt` composes three EXISTING proof primitives
  (W001 `PickEvidenceEnvelope` digest, `verifyReceiptIntegrity`'s live tamper
  check, W-OTS's Bitcoin-anchor status) into one reproducible object rather
  than adding a fourth. The receipt's SEALED→OPEN disclosure transition is
  derived from the envelope's own `game.commenceTime`/`settlement.state`
  (one canonical signal) instead of re-deriving `/api/verify`'s
  `kickedOff || settled` check from a second DB row — same policy, zero
  duplicated logic to drift. `/api/proof/reality/[gameId]` is public and
  `gameId`-keyed (a *discovery* surface, unlike `/api/verify`'s
  confirm-a-hash-you-hold design), so the loader hard-codes the FREE-tier-only
  fail-closed pick filter Game Room's public viewer already uses and accepts
  no viewer input — this is what stops a kicked-off/settled PRO/ELITE pick's
  committed fields from opening to a non-paying visitor.
- Evidence: 31 new tests green (build.ts pure-function reproducibility +
  sealed/open/tamper/PASSED branches, card.ts content-mapping, and an
  end-to-end route suite with a real `@sports/crypto` pending + Bitcoin-
  attested proof exercised through the mocked DB), plus the touched-adjacent
  suites (game-room paywall/evidence-adapter, pick-evidence-envelope,
  machine-proof) re-run green. tsc and `eslint --max-warnings=0` clean on the
  new/changed files.
- Alternatives rejected: refactoring `lib/game-room/load.ts` to share its
  Prisma query (deferred — would touch a protected, tested, entitlement-
  bearing file for a v0 slice; the ~20-line query duplication is documented,
  not hidden); a Merkle-inclusion-proof leg (needs sibling receipts, deferred
  to a fast-follow); an 8th MCP tool wrapping the loader (deferred, cheap
  fast-follow once the core surface is live).
- Reversibility: additive only — new `lib/reality-receipt/` module, two new
  routes, one new discovery-link entry in `machine-proof.ts`. No schema
  change, no edits to `/api/verify`, `game-room/load.ts`, or the OTS route.
- Protected zones: proof, public claims.
- Files/PRs affected: `apps/web/lib/reality-receipt/**` (new),
  `apps/web/app/api/proof/reality/[gameId]/route.ts` (new),
  `apps/web/app/api/proof/reality/[gameId]/image/route.tsx` (new),
  `apps/web/lib/proof/machine-proof.ts` (additive link),
  `apps/web/lib/reality-receipt/__tests__/*`,
  `apps/web/__tests__/proof-reality-route.test.ts`.
- Note: no automated test covers the actual `next/og` `ImageResponse` pixel
  render (no precedent exists anywhere in this repo — the 3 existing
  `opengraph-image.tsx` files are untested too); covered instead by a route
  test that exercises the real render call end to end (asserts status 200 +
  `content-type: image/png` for both a found and an honest-unavailable
  receipt) plus the Next build's own type-check/bundle pass.
- Supersedes: none.

## DEC-016 — W004 SportsIR v0: vocabulary-not-store, adapt-only-what-is-real (2026-07-17)

- Date: 2026-07-17
- Workstream: W004
- Decision: SportsIR v0 is a dependency-free VOCABULARY in `packages/types/src/sports-ir.ts`
  (12 kernel primitives + 4 clocks + `SportsIrValue` structurally identical to Worldline's
  `WorldValue`), with one-directional pure adapters in `apps/web/lib/sports-ir/adapters.ts`.
  Only SIX primitives are claimed ADAPTED — each proven by a test against a REAL object from
  this branch's own production builders (WorldlineStore, buildRoomEvidenceEnvelope,
  buildRealityReceipt): Entity (explicit ctor — kind/label never inferred from an opaque id),
  Observation/State (← W002), Claim/Outcome (← W001; confidence honestly null at the envelope
  layer; Outcome null when settlement NOT_CAPTURED), Proof (← W003; verified null when no
  receipt captured; NOT_MIGRATED/NO_PROOF/UNAVAILABLE anchors collapse to "UNKNOWN"). The
  other six (Event, Measurement, Relation, Interaction, Intervention, Branch) are DECLARED
  type contracts with named future adapter sources — never presented as wired.
- Evidence: 16 adapter tests + 4 type tests green; `tsc --noEmit` clean (packages/types,
  apps/web); eslint --max-warnings=0 clean on lib/sports-ir.
- Alternatives rejected: a SportsIR persistence layer (projection vocabulary only in v0);
  adapting all 12 primitives now (would fabricate completeness for objects with no current
  concrete source); putting the types in apps/web (packages could not adopt them).
- Reversibility: additive only — new files + one export line in packages/types/src/index.ts.
- Protected zones: schema/contracts (type-level only; no DB, no routes, no behavior change).
- Files: packages/types/src/sports-ir.ts, packages/types/src/__tests__/sports-ir.test.ts,
  apps/web/lib/sports-ir/{adapters.ts,index.ts,__tests__/adapters.test.ts},
  packages/types/src/index.ts (1 line), docs/frontier/WORKSTREAM_004_SPORTSIR_V0.md.
- Supersedes: none.

## DEC-017 — Phase 2.1: 8th proof-MCP tool, one truth path preserved (2026-07-17)

- Date: 2026-07-17
- Workstream: Phase 2 (post-GX-000/GG-001 master-plan follow-up)
- Decision: `get_reality_receipt` added to the hosted proof-MCP (`apps/web/lib/proof-mcp/tools.ts`),
  invoking the REAL `/api/proof/reality/[gameId]` route handler in-process — same
  one-truth-path discipline as `list_settled_receipts`/`verify_receipt_via_api` — rather
  than calling `loadRealityReceipt` directly, so the MCP tool can never drift from the
  public JSON API. Honest absence (no such game, no decision yet) returns `found:false`
  without `isError`; a genuine 503 (DB outage) maps to `isError:true`. FREE-tier-only by
  construction (inherited from the route's own fail-closed loader — W003 DEC-015).
- Evidence: 14 proof-mcp-route tests green (4 new), machine-proof 14 green, tsc clean,
  eslint --max-warnings=0 clean.
- Reversibility: additive only — one tool def, one dispatch case, one helper function,
  doc-count updates (7→8) in three files.
- Protected zones: proof, public claims.
- Files: apps/web/lib/proof-mcp/tools.ts, apps/web/app/api/mcp/route.ts (comment only),
  apps/web/lib/proof/machine-proof.ts (comment only), apps/web/__tests__/proof-mcp-route.test.ts.
- Supersedes: none.

## DEC-018 — Phase 2.2: W003 Merkle-inclusion leg, gated to the receipt's own disclosure timing (2026-07-17)

- Date: 2026-07-17
- Workstream: Phase 2 (post-GX-000/GG-001 master-plan follow-up); lands the fast-follow the
  W003 v0 contract explicitly deferred (`docs/frontier/WORKSTREAM_003_REALITY_RECEIPT_V0.md`
  §"Explicitly out of scope for v0").
- Decision: `RealityReceipt` gains a `slateInclusion` leg proving the decision's receipt was
  inside its slate's pre-kickoff committed Merkle root, reusing `inclusionProof`/
  `verifyInclusion`/`hashLeaf` from `@sports/prediction-engine` exactly (no new hashing
  logic). The loader (`load.ts`) reconstructs the EXACT leaf set
  `freezeSlateCommitments` committed — `pickProofReceipt` rows for the slateKey, ordered
  `pickId` ascending, matching `packages/ingestion-pipeline/src/freeze-slate-commitments.ts`'s
  own commit-time query — and independently recomputes + verifies the inclusion proof against
  the published `SlateCommitment.root`; any lookup failure, missing leaf, or a proof that
  fails to fold to the root fail-opens to `UNAVAILABLE`, never a fabricated `PROVEN`.
- Adversarial finding + fix (gse-red-team pass, pre-commit): the first cut passed a `PROVEN`
  slate-inclusion leg through unconditionally, which discloses `proof.leaf` — exactly the
  receipt's own `contentHash` (slate-commitment.ts: "a pick's leaf in the slate is exactly
  its receipt.contentHash") — even while the `receipt` leg itself is still `SEALED`
  pre-kickoff. That breaks the "SEALED never opens" invariant `/api/verify` and the
  `receipt` leg both already enforce. Fixed in `build.ts` with `gateSlateInclusion()`: a
  `PROVEN` result is downgraded to a new `SEALED` state (no fields beyond the state tag)
  whenever `receipt.state !== "OPEN"`; `NOT_REQUESTED`/`UNAVAILABLE` are not gated (they
  disclose nothing). The digest is computed off the GATED value, so two different `PROVEN`
  inputs collapse to an identical digest pre-kickoff — no information about the underlying
  proof leaks even indirectly. Other red-team findings (server-side over-fetch of
  same-slate PRO/ELITE/pre-kickoff payloads: confirmed NOT a leak — only hashes ever reach
  the wire, per `inclusionProof`'s own implementation; slate root/count public pre-kickoff:
  confirmed already-intentional per `slate-commitment.ts`'s own "publish before kickoff"
  design and the pre-existing `/api/proof/ots/[slateKey]` route) required no code change.
- Evidence: 78 combined tests green (reality-receipt build/card/route + sports-ir adapters +
  proof-mcp route + proof-hash), including new tests proving (a) the SEALED-gating fires
  end to end at the route level, (b) two structurally different `PROVEN` inputs produce an
  identical digest pre-kickoff, (c) `PROVEN` passes through untouched once the receipt is
  genuinely `OPEN`. `tsc --noEmit` clean, `eslint --max-warnings=0` clean on touched files,
  `npm run guardrails` all green. No schema/migration changes (read-only `findUnique`/
  `findMany`, no writes).
- Alternatives rejected: collapsing a withheld proof to `NOT_REQUESTED` (would conflate "no
  slate commitment applies" with "computed successfully but withheld," a distinct, less
  honest signal than a dedicated `SEALED` state); gating in the loader instead of the
  builder (the builder already owns `isOpen`/disclosure-timing policy for the `receipt` leg —
  one policy owner, not two that could drift).
- Reversibility: additive only — one new type variant, one new pure gating function, one
  loader function, digest formula extended (already-updated in this same diff's own tests;
  no other consumer pins the old 3-field formula — confirmed by repo-wide grep).
- Protected zones: proof, public claims. gse-red-team pass completed pre-commit per
  `.claude/rules/protected-money-truth.md`.
- Files: apps/web/lib/reality-receipt/{types.ts,build.ts,load.ts}, apps/web/lib/reality-receipt/__tests__/build.test.ts,
  apps/web/__tests__/proof-reality-route.test.ts, apps/web/lib/sports-ir/__tests__/adapters.test.ts,
  docs/frontier/WORKSTREAM_003_REALITY_RECEIPT_V0.md (scope note updated).
- Supersedes: none.
