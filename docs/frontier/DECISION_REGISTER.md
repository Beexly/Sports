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

## DEC-019 — Phase 2.3: vendor the founder's stdio galaxy-proof-mcp packet unchanged (2026-07-17)

- Date: 2026-07-17
- Workstream: Phase 2 (post-GX-000/GG-001 master-plan follow-up).
- Source: the founder's original `galaxy-proof-mcp` packet, located this session at
  `/root/.claude/uploads/<session>/8b6e970f-galaxyproofmcp.zip` (an early-session upload
  referenced only obliquely in `DECISION_REGISTER.md`'s "Packet intake accounting" and
  `CURRENT_STATE.md`'s "Next action" note — the packet's actual file content had never
  been located/vendored into the repo tree before this decision; only its DESIGN was
  ported into the hosted `/api/mcp` as W-MCP slice 1, DEC-012). Located and extracted this
  session before vendoring, per the repo's own "old docs are leads, not authority" doctrine
  — the packet's real contents were verified in-tree, not assumed from prior doc mentions.
- Decision: vendored as a new standalone npm workspace package,
  `packages/galaxy-proof-mcp-stdio` (published name kept as the founder's own
  `galaxy-proof-mcp`, unscoped — this package is meant to be independently
  installable/publishable outside the monorepo, unlike the internal `@sports/*` packages).
  `src/index.ts`, `README.md`, `smoke.mjs`, `tsconfig.json` are BYTE-IDENTICAL to the
  founder's zip (confirmed via `diff`) — zero edits, matching this session's established
  "vendor unchanged" doctrine (PR #125/#126 docs). `package.json` carries exactly ONE
  addition beyond the founder's original: a `"test": "npm run build && node smoke.mjs"`
  script, wiring the founder's OWN already-authored end-to-end smoke test (real stdio
  JSON-RPC handshake against the built server, asserting the 7-tool list and both a
  genuine and a tampered hash's `verify_receipt_local` verdict) into `npm test
  --workspaces`, per CLAUDE.md's "Tests required" rule. No new test logic was authored —
  the founder's own smoke.mjs is the test.
- Deliberate architectural non-change: `verify_receipt_local`/`audit_record_trustlessly`
  reimplement `leafHash`/`nodeHash`/`merkleRoot` LOCALLY rather than importing
  `@sports/prediction-engine` — this is NOT a "one truth path" violation to fix. It is the
  entire point of a trustless verifier: if the local check imported Galaxy's own hashing
  library, a bug or backdoor there would silently propagate into the "independent" check,
  defeating the packet's stated purpose ("Galaxy's server is trusted only to serve the
  data — never for the verdict"). Left as designed.
- Known, deliberately-uncorrected drift: the packet's own 7-tool contract now trails the
  hosted `/api/mcp`'s 8-tool contract by one (`get_reality_receipt`, added Phase 2.1/DEC-017,
  authored after this packet). Not added here — extending the vendored `src/index.ts` would
  violate "vendor unchanged"; flagged as a future, easy follow-on. The README's "Status
  note" section is also now stale (references the pre-#120 `claude/glass-ledger-edge-engine`
  branch as the Proof surface's deploy target; the surface has since shipped to main) — left
  untouched per the same doctrine, exactly as PR #125/#126's vendored docs' pre-existing
  quirks were left untouched.
- Parity test added (apps/web side, not inside the standalone package — it must not depend
  on apps/web to stay independently publishable): `proof-mcp-route.test.ts` asserts the
  hosted `/api/mcp`'s tool list is a superset of the stdio packet's 7 tool names (literal
  array, mirroring `smoke.mjs`'s own `expected` constant).
- Evidence: `npm run typecheck --workspace=packages/galaxy-proof-mcp-stdio` clean;
  `npm test --workspace=packages/galaxy-proof-mcp-stdio` — real build + the founder's
  smoke.mjs — PASSED end to end (7 tools listed, genuine hash `matches:true`, tampered
  hash `matches:false`) against the LIVE production host (`GSE_PROOF_BASE_URL` defaults to
  `https://www.galaxysportsedge.com`, which already serves the Proof surface post-#120);
  apps/web parity test green (15/15 in proof-mcp-route.test.ts); root `npm run guardrails`
  all green including `secret-scan --all` over the newly-tracked files.
- Reversibility: additive-only new workspace member; root `package.json` untouched
  (workspace glob `packages/*` already covers it); `package-lock.json` regenerated to
  register `@modelcontextprotocol/sdk` (new) + `zod` (already present, deduped).
- Protected zones: proof, public claims (read-only network calls to the public Proof API
  only; no secrets, no write path, no entitlement surface touched).
- Files: packages/galaxy-proof-mcp-stdio/{package.json,tsconfig.json,src/index.ts,
  smoke.mjs,README.md} (new package), apps/web/__tests__/proof-mcp-route.test.ts (parity
  test added), package-lock.json.
- Supersedes: none.

## DEC-020 — Phase 2.4: source-rights-registry "duplicate" was a pure re-export shim, collapsed to one file (2026-07-17)

- Date: 2026-07-17
- Workstream: Phase 2 (post-GX-000/GG-001 master-plan follow-up); resolves the collision
  the GX-000 Codebase Twin named in its own report (`packages/genesis-kernel/src/codebase-twin.ts`
  `KNOWN_COLLISIONS`, PR #127): `apps/web/lib/source-rights/source-rights-registry.ts` vs
  canonical `apps/web/lib/scraping/source-rights-registry.ts`.
- Investigation finding (before any edit): the "duplicate" was NOT a second implementation.
  `apps/web/lib/source-rights/source-rights-registry.ts` was an 18-line pure re-export shim —
  every symbol (`SOURCE_RIGHTS_REGISTRY`, `getSourceRightsEntry`, `getApprovedSources`,
  `getPermissionRequiredSources`, `getRegistrySummary`, `getSourcesByStatus`,
  `getVendorCandidates`, `snapshotRights`, plus 5 types) forwarded untouched from the
  860-line canonical file — zero independent data, zero transformation. The Codebase Twin's
  collision report (correctly, per its own stated scope) flagged the file-name collision
  without claiming divergent content; this decision confirms there was none.
- Decision: deleted the shim; re-pointed its three consumers
  (`apps/web/lib/source-rights/source-attribution.ts`,
  `apps/web/lib/source-rights/source-rights-evaluator.ts`,
  `apps/web/lib/ip/source-rights-envelope.ts`) to import
  `@/lib/scraping/source-rights-registry` directly; updated the barrel
  `apps/web/lib/source-rights/index.ts`'s `export *` line to the same canonical path so any
  future barrel consumer needs no change. Net effect: exactly ONE source-rights-registry
  file in the repo; every existing symbol name and value unchanged.
- gse-red-team pass (mandatory, protected zone — source rights): CONFIRMED clean on all 6
  adversarial checks — (1) the deleted file was verified byte-for-byte pure re-export via
  `git show HEAD:<path>`, no divergence; (2) repo-wide grep + a full `tsc --noEmit` project
  typecheck confirmed zero dangling references to the deleted path; (3) the barrel's
  `export *` surface has no NEW name collision (a pre-existing type re-export overlap with
  `source-rights-types.ts` resolves to the identical binding both before and after, which is
  not an ambiguity under ES module semantics); (4) no consumer depended on
  `lib/source-rights/` as a distinct boundary beyond the shim's own forwarding; (5) the
  canonical 860-line registry file itself has a ZERO-line diff — no population, status,
  clearance, or attribution value changed; (6) existing test coverage (85 tests across
  `fences-and-adapters.test.ts` + `scraping-clearance.test.ts`) traced to genuinely exercise
  all four repointed files, including transitively through `buildIpMetricCard` →
  `buildIpSourceRightsEnvelope`. Minimum fix required: none.
- Evidence: 125 tests green (fences-and-adapters 9, scraping-clearance 76,
  affiliate-structural-separation-guard 9, agent-os-operating-spine 17, agent-os-runtime 10,
  ingest-player-stats 4 — the last four as an additional sweep beyond the red-team's own
  regression set, since they also reference source-rights/clearance surfaces); `tsc --noEmit`
  clean; `eslint --max-warnings=0` clean on touched files; `npm run guardrails` all green.
- Alternatives rejected: keeping the shim for "backwards compatibility" (it had zero external
  consumers outside this repo — an internal-only re-export with no callers needing the old
  path adds pure indirection, no value); rewriting the shim to diverge intentionally (no
  evidence any consumer wanted different behavior — that would have MANUFACTURED a real
  duplicate where none was needed).
- Reversibility: trivial — `git revert`; no data, schema, or canonical-file change to unwind.
- Protected zones: source rights. gse-red-team pass completed pre-commit per
  `.claude/rules/protected-money-truth.md` and `.claude/rules/source-rights.md`.
- Files: apps/web/lib/source-rights/source-rights-registry.ts (deleted),
  apps/web/lib/source-rights/{index.ts,source-attribution.ts,source-rights-evaluator.ts},
  apps/web/lib/ip/source-rights-envelope.ts.
- Supersedes: none.

## DEC-021 — W005 Intelligence Watch v0: generalize watchlist alerting beyond pick-settlement, name collision avoided (2026-07-17)

- Date: 2026-07-17
- Workstream: W005 (Phase 3 of the master plan; `docs/frontier/WORKSTREAM_005_INTELLIGENCE_WATCH_V0.md`
  is the frozen contract). Dependencies satisfied: W002 Worldline ✓, existing watchlist ✓.
- Decision: added `apps/web/lib/intelligence-watch/` — `IntelligenceWatchContract` (a
  per-watchlist-entry preference: which attributes matter, what materiality threshold) +
  `defaultIntelligenceWatchContract()` (v0's only constructor — watches all attributes,
  threshold 1, honestly labeled as a default since there is no UI to customize yet) +
  `evaluateIntelligenceWatch()`, a pure function that compiles a W002 `WorldDelta` against
  the contract and an entitlement flag into a discriminated `surface: true/false` decision.
  Genuinely new capability, not a duplicate of the existing `watchlist/alert-eligibility.ts`:
  that module gates on ONE pick lifecycle event (settlement); this module generalizes to ANY
  observed Worldline change about a followed entity. Reuses the existing
  `Entitlements.canGetAlerts` (Elite-exclusive) rather than adding a new entitlement
  dimension. Zero new Prisma models/migrations, zero new API routes, zero send-path code —
  the evaluator produces a decision only and has no caller outside its own test file (fully
  shadow, matching every prior v0 this session).
- Naming: named `IntelligenceWatchContract`, not `IntelligenceContract` — confirmed via
  `git show origin/genesis/gx-000-codebase-twin-plan-compiler:packages/genesis-kernel/src/contracts.ts`
  that a type of that exact name already exists there for an unrelated Metacortex
  plan-compiler concept (`question`/`requiredOutputs`/`evidencePolicy`/`proof`/`budget` — "compile
  a research question into an evaluated plan," nothing to do with per-user entity-watching
  intent). gse-red-team judged the rename "reasonable naming hygiene, not strictly required"
  (the two types live in different packages and would not actually collide at compile time)
  but recommended keeping it for future-grep/documentation clarity — kept.
- gse-red-team pass (mandatory — entitlements + notifications are both protected zones per
  this workstream's own queue row): confirmed the entitlement gate is checked first,
  fail-closed, with no path for a non-entitled caller to receive delta content (traced
  line-by-line); confirmed zero draft-only guardrail violations (verified by running the
  guardrail directly, not just trusting the diff); confirmed test fixtures are built from
  the REAL `WorldlineStore`/`worldDelta()` primitives, not invented shapes; confirmed the
  naming-collision claim against the actual genesis-kernel source. ONE real finding:
  `evaluateIntelligenceWatch` has no graded/settled-fact guard (unlike
  `alert-eligibility.ts`'s `isGradedEvent` check) — `WorldDeltaEntry` carries no such
  marker, so a future Worldline producer could in principle feed speculative/unsettled data
  through this evaluator. Confirmed NOT currently exploitable (repo-wide grep: zero
  production callers of `WorldlineStore.ingest()` and zero callers of
  `evaluateIntelligenceWatch` outside its own test file), so no code change was required to
  land v0 — but documented as a REQUIRED (not optional) precondition for any future live
  wiring, both in the workstream doc and as a doc-comment directly on `evaluate.ts`, so the
  gap cannot be silently carried forward when this module gets its first real caller.
- Evidence: 7/7 new tests green (entitlement-gate ordering, zero-entity-match,
  below-threshold, at-threshold with exact entry filtering, attribute-scoped filtering,
  contract-identity passthrough); `tsc --noEmit` clean; `eslint --max-warnings=0` clean;
  `npm run guardrails` (including `draft-only`) all green.
- Alternatives rejected: adding a graded-only guard now anyway (would require inventing a
  "settled" concept on `WorldDeltaEntry` that no real producer has ever populated —
  fabricating a check with no real data behind it, rather than honestly documenting the
  precondition for whoever builds the first live producer); adding a new
  `canUseIntelligenceWatch` entitlement field (a real product/pricing decision, not an
  autonomous one — v0 reuses the existing Elite-exclusive `canGetAlerts`); wiring a live
  consumer or dispatch path in this slice (explicitly out of scope — draft-only doctrine,
  no send path exists here at all, not even an inert-by-default seam like
  `alert-dispatch.ts`'s).
- Reversibility: additive only — new directory, zero existing files modified.
- Protected zones: entitlements (read-only consumption of `canGetAlerts`), notifications
  (draft-only — no dispatch). gse-red-team pass completed pre-commit per
  `.claude/rules/protected-money-truth.md`.
- Files: apps/web/lib/intelligence-watch/{types.ts,contract.ts,evaluate.ts,index.ts,
  __tests__/evaluate.test.ts} (new), docs/frontier/WORKSTREAM_005_INTELLIGENCE_WATCH_V0.md (new).
- Supersedes: none.

## DEC-022 — Full-session audit pass: card.ts slateInclusion gap + .gitignore CRLF fixed (2026-07-17)

- Date: 2026-07-17
- Workstream: cross-cutting (post-Phase-3 comprehensive review, requested explicitly: "ensure
  EVERYTHING from the plan has been accounted for, reviewed, coded, reviewed, improved,
  reviewed polished").
- Decision: ran an independent gse-verifier audit re-executing (not just re-reading) every
  gate this session claimed green — full `apps/web` `tsc --noEmit`, all `packages/*`
  typechecks, 236 targeted tests across reality-receipt/sports-ir/intelligence-watch/
  worldline/watchlist/proof-mcp/proof-reality/fences-and-adapters/scraping-clearance,
  `packages/genesis-kernel`'s own suite (26/26, from a temporary worktree since that package
  lives only on PR #127's branch) and `packages/galaxy-proof-mcp-stdio`'s real build + live
  stdio smoke test — plus a cross-check of the three frontier ledger docs against each other
  and against actual git history. All of it reconfirmed green; two genuine, if minor, gaps
  surfaced and were fixed in this same pass:
  1. **`apps/web/lib/reality-receipt/card.ts` never surfaced the Phase 2.2 `slateInclusion`
     leg** — a forgotten spot, not a documented cut. Added `slateInclusionLine()` (mirrors
     `anchorLine()`'s style exactly: PROVEN → "Verified in slate `<key>`'s committed root
     (position N of COUNT)"; SEALED → "sealed until kickoff", matching the receipt leg's own
     pre-kickoff withholding, never claims PROVEN early; UNAVAILABLE/NOT_REQUESTED → honest
     absence copy) as the card's 4th line. This affects only the visual card / `/image` PNG
     surface — the underlying data/gating (DEC-018) was already correct; this was a display
     gap, not a disclosure-policy gap.
  2. **`git diff --check` against origin/main failed (exit 2)** on `.gitignore` — the file
     had been entirely CRLF since before this session's own commits (confirmed via
     `git show <commit>^:.gitignore`, already CRLF at the parent of the founder-orchestrator-
     overlay commit `b46a526e` from earlier today, i.e. not introduced by any of this
     session's own Phase 0-3 work), while origin/main's copy is mixed CRLF/LF. Normalized to
     LF throughout via `sed 's/\r$//'`; verified byte-identical content modulo line endings
     (`diff <(git show HEAD:.gitignore | tr -d '\r') <(cat .gitignore)` → identical) — pure
     whitespace fix, zero ignore-pattern semantic change, zero "vendor unchanged" doctrine
     conflict (that doctrine protects CONTENT, not incidental line-ending encoding).
- Explicitly NOT found: no test failures, no typecheck failures, no guardrail failures, no
  fabricated test counts, no drift between the three frontier ledger docs on anything
  checked, no stale reference to the old 3-field reality-receipt digest formula outside
  already-updated test files, `packages/galaxy-proof-mcp-stdio` correctly registered in
  `package-lock.json` for `npm ci`. PR #127 and PR #128's branches confirmed still pushed,
  not merged into main, not orphaned (via local git refs — GitHub-side force-push history and
  literal merged/closed state could not be confirmed without API access, an explicitly
  acknowledged verification gap, not a finding).
- Also separately verified and corrected in this pass (not a code change): PR #121's
  description claimed the ~350-occurrence competitor-trademark rename (Task #13) was
  "pending" — independently confirmed via `git log`/`git show` that the rename (commit
  `7fa7892d`, `SMASH`→MSI, `BURR`→BSI, `Solds`→SVH) was already complete and merged into that
  PR's branch by a prior session. Re-ran all 125 relevant tests (fantasy-engine 66, cockpit
  fantasy-mlb-boards/gate/pool-gating/display-flags/competitive-baseline 35, data-ingestion
  mlb-fantasy-sources 24) green, `tsc --noEmit` clean, `trust-gate`/`commercial-copy-scan`
  clean, zero remaining competitor coinage in any shipped surface (only unrelated
  banned-hype-word filters and third-party references remain). Updated PR #121's description
  to reflect this — a documentation correction, not a merge or code action.
- Evidence: full re-run 236+30(card, updated)+17(route) tests green post-fix, `tsc --noEmit`
  clean, `eslint --max-warnings=0` clean, `npm run guardrails` all 17 checks green,
  `git diff --check` clean against `.gitignore`.
- Reversibility: additive (card.ts) + pure line-ending normalization (.gitignore) — both
  trivially revertible, zero data/schema/behavior change.
- Protected zones: proof, public claims (card.ts is a public-facing surface, `/image` PNG
  route). No red-team pass required — this is a strictly-additive display fix mirroring an
  already-red-teamed disclosure policy (DEC-018), not a new disclosure decision.
- Files: apps/web/lib/reality-receipt/{card.ts,__tests__/card.test.ts}, .gitignore.
- Supersedes: none.

## DEC-023 — W-WEATHER §2 strict previous-runs smoke: CLOSED (capability confirmed live) (2026-07-17)

- Date: 2026-07-17
- Workstream: Phase 4 standing arc (W-WEATHER-REC's own DEC-014 named this the "REMAINING
  GATE before any real historical admission run").
- Decision: located the founder's original `gse-weather-edge` packet (session upload
  `gseweatheredge.zip`, previously vendored only as the loader source — its
  `INTEGRATION_SPEC.md` had never actually been read/vendored/acted on) and executed §2's
  "the one thing to smoke-test live." Confirmed EMPIRICALLY, via a real network call (not
  just documentation reading) to `previous-runs-api.open-meteo.com`, that Open-Meteo
  genuinely serves distinct forecast runs for the same valid hour via `_previous_dayN`
  suffixed variables (`temperature_2m_previous_day1/2/3`, up to day7) — this is the
  "previous-runs / model-run capability" INTEGRATION_SPEC §2 point 1 asked this session to
  confirm exists before any backtest admits weather features. New repeatable script,
  `scripts/weather-integration-smoke.mjs` (`npm run smoke:weather-integration`), performs
  this check and is not an ephemeral one-off — anyone can re-run it. Live run this session:
  hour `2026-07-14T00:00`, current-run 91.5°F vs. `previous_day1` 91.4°F / `previous_day2`
  83.3°F / `previous_day3` 84.8°F at Lambeau Field's coordinates — genuinely distinct values,
  not duplicated/stitched output, proving the capability is real and currently live.
- Also confirmed (via Open-Meteo's own docs, cross-checked) WHY this matters: the
  `historical-forecast-api` host the SHIPPED loader (`weather-edge.ts`) currently uses for
  its backtest path does NOT support run selection — it explicitly stitches multiple runs
  into one continuous timeseries and exposes no per-hour issuance time, exactly the leakage
  risk INTEGRATION_SPEC §2 warned about. `previous-runs-api` (day-bucketed, confirmed above)
  and a separate Single Runs API (`run=<init-datetime>`, exact-run selection, not smoke-tested
  this pass — day-bucketed granularity already satisfies the honest-conservative-rounding
  requirement) are the correct integration targets.
- Explicit scope boundary — what this decision does NOT close: `weather-edge.ts` was NOT
  modified. DEC-014 recorded it "vendored verbatim... behavioral edits forbidden," and that
  constraint stands. This decision closes the CAPABILITY-CONFIRMATION gate INTEGRATION_SPEC
  §2 names — it does not wire the previous-runs-api into the feature store or the loader.
  A real historical weather-feature admission run still requires that separate integration
  step (select `_previous_dayN` where `N = ceil(leadTimeHours / 24)`, never a smaller N, so
  the selected run is guaranteed issued ≤ `asOfUtc` — conservative rounding toward an OLDER
  run when the exact day boundary doesn't align) — named here as a fast-follow, not silently
  dropped, and NOT attempted in this pass to respect the vendored file's edit boundary and
  avoid conflating a capability-confirmation gate with a full leak-safe re-implementation.
  §3-§6 of the spec (feature-store wiring behind `MODEL_VERSION`, trials-registry admission,
  operational rate-limit/refresh/caching/attribution rules, the non-goals) remain entirely
  unactioned — this decision is narrowly scoped to §2 only, per DEC-014's own framing.
- Evidence: `node scripts/weather-integration-smoke.mjs` — real network call, exit 0, PASS
  with the exact values above (reproducible, not a fixture); `trust-gate`/`secret-scan` clean
  on the new script.
- Alternatives rejected: modifying `weather-edge.ts` to route backtests through
  previous-runs-api now (would violate the vendored file's "behavioral edits forbidden"
  constraint and conflate two distinctly-scoped decisions — capability confirmation vs.
  implementation — into one, when DEC-014 explicitly separated them); using the Single Runs
  API instead (more precise but requires knowing exact model-run cadence per provider,
  meaningfully more complex; previous-runs-api's day-granularity already suffices for a
  conservative-rounding leak-safe selection, so the extra complexity isn't justified for the
  confirmation step).
- Reversibility: additive only — one new script, one new package.json script entry.
- Protected zones: data, model claims (per W-WEATHER-REC's own row) — this decision adds no
  model claim and touches no scoring path; it is a pure capability-confirmation utility.
- Files: scripts/weather-integration-smoke.mjs (new), package.json (1 script line).
- Supersedes: none. Narrows DEC-014's "REMAINING GATE" note — the §2 smoke-test sub-item is
  now DONE; the feature-store integration sub-item DEC-014 implied is still open and unscoped.

## DEC-024 — W007 Branching Reality v0: Worldline conflict detection + Branch adapted (2026-07-17)

- Date: 2026-07-17
- Workstream: W007 (frontier queue; contract `docs/frontier/WORKSTREAM_007_BRANCHING_REALITY_V0.md`).
  Dependencies satisfied: W002 Worldline ✓, W004 SportsIR ✓. Not W006 (checked first — its own
  dependency, "after GG-001 lands," is genuinely unmet: `packages/genesis-kernel`/GG-001 still
  lives only on unmerged draft PR #127, not on this branch or main — forcing W006 now would
  risk exactly the "uncontrolled multiplication of parallel systems" this session has guarded
  against throughout; W006 correctly stays BLOCKED, unchanged from `WORKSTREAM_QUEUE.md`).
- Decision: `WorldlineStore` (W002) always resolves each (entity, attribute) cell to exactly
  ONE winning observation via a deterministic total order (`beats()`) whose final tiebreak
  (`id`) exists only for replay determinism, not as an epistemic judgment — so when two
  sources report DIFFERENT values at the identical `(occurredAt, observedAt)`, the single-
  snapshot view silently discards one of them. Added ONE new, purely additive public method,
  `WorldlineStore.detectConflicts(at): WorldConflict[]` (`apps/web/lib/worldline/store.ts`) —
  `resolveOver`/`winnersOver`/`beats()`/`snapshotAt`/`resolve`/`auditReplayStability` are
  UNCHANGED (confirmed: the diff to store.ts contains zero deleted/modified lines, only
  additions). Reports a conflict only when tied-for-first candidates carry genuinely
  different canonical values (`canonicalJson`-compared, the same W001 serializer
  `snapshotDigest` already uses); agreement between sources is corroboration, never reported.
  Adapted `SportsIrBranch` (W004's sixth and final DECLARED-only primitive — its own header
  comment already named this exact workstream as its future adapter) via
  `worldConflictToSportsIrBranches()` in `apps/web/lib/sports-ir/adapters.ts`: one Branch per
  tied candidate, `id` traced to the real observation id, `parentBranchId: null` (v0 is a flat
  sibling set, honestly not claiming a hierarchy), `label`/`createdAt` taken directly from the
  source observation with zero inference.
- gse-red-team pass (protected zone: model/public interpretation, per the workstream's own
  queue row): CONFIRMED clean on 5 of 6 checks (algorithm correctness across adversarial
  ingestion orderings including the empty/singleton-cell edge case; no-lookahead filter
  byte-identical to `winnersOver`'s; `canonicalJson` value-equality has no false-conflict or
  false-negative risk; the adapter fabricates nothing, and its `parentBranchId: null` gap is
  disclosed in-comment rather than hidden; zero deleted/modified lines in the existing
  resolution code). The 6th check (public-claims/future-misuse risk) was left incomplete by
  the reviewing pass — closed independently in this same decision: confirmed via repo-wide
  grep that `detectConflicts`/`worldConflictToSportsIrBranches` have ZERO callers outside
  their own definitions/barrel exports/tests, and — going beyond what was asked — identified
  and documented a REQUIRED-before-live-wiring precondition the review's own framing (mirroring
  DEC-021's W005 finding) prompted: `worldConflictToSportsIrBranches`'s `label` field embeds
  `obs.source`/`obs.value` VERBATIM, so any future public/live wiring MUST first pass through
  `apps/web/lib/scraping/clearance-engine.ts` — a raw source name or licensed value could
  otherwise leak without attribution/rights review. Documented both in the workstream doc and
  directly as a doc-comment on `worldConflictToSportsIrBranches` itself, so it cannot be
  silently dropped when this module gets its first real caller — the same "REQUIRED before any
  live wiring" pattern this session established for W005.
- Evidence: 44 tests green across the three re-run suites (worldline 19 [13 pre-existing +
  6 new, all pre-existing assertions unchanged — independently confirmed by direct execution,
  not inferred], sports-ir adapters 18 [16 pre-existing + 2 new], intelligence-watch 7
  unaffected); `packages/types` 35 green (sports-ir 4 + entitlements 31, unaffected by the
  DECLARED→ADAPTED comment-only change); `tsc --noEmit` clean; `eslint --max-warnings=0`
  clean; `npm run guardrails` all green.
- Alternatives rejected: modifying `winnersOver`/`beats()` to return the full tied set always
  (would change `resolveOver`'s existing, tested, protected behavior — `WorldSnapshot` must
  keep resolving to exactly one value per cell, since every W002/W003/W005 consumer already
  depends on that single-value contract); nesting `SportsIrBranch.parentBranchId` now (no
  policy exists yet for what "one branch refines another" means — inventing one would be
  premature abstraction with no real usage to validate it against).
- Reversibility: additive only — one new method + one new type on already-shipped W002/W004
  modules, zero existing behavior changed.
- Protected zones: model/public interpretation. gse-red-team pass completed pre-commit per
  this session's established discipline for near-adjacent protected zones.
- Files: apps/web/lib/worldline/{store.ts,types.ts}, apps/web/lib/sports-ir/{adapters.ts,index.ts},
  apps/web/__tests__/worldline.test.ts, apps/web/lib/sports-ir/__tests__/adapters.test.ts,
  packages/types/src/sports-ir.ts (comment only), docs/frontier/WORKSTREAM_007_BRANCHING_REALITY_V0.md (new).
- Supersedes: none.

## DEC-025 — W009 Hypothesis-to-Instrument v0: HypothesisInstrument wrapping the backtest harness + second Claim adapter (2026-07-17)

- Date: 2026-07-17
- Workstream: W009 (frontier queue; contract
  `docs/frontier/WORKSTREAM_009_HYPOTHESIS_TO_INSTRUMENT_V0.md`). Queue listed dependencies as
  "W004, historical harness" — both verified real before starting: W004 SportsIR ✓ (DEC-016);
  the "historical harness" is `apps/web/lib/backtest/harness.ts`'s `runBacktestHarness`, a pure,
  deterministic, content-hash-provenanced calibration re-proof over settled picks, confirmed by
  direct read of its full 332-line implementation (not assumed from the queue row's name alone).
  Also checked `packages/prediction-engine/src/edge-lab/trials-registry.ts` (a real, existing,
  hash-chained FDR-corrected feature/threshold/model ADMISSION system) before designing, to rule
  out duplication: trials-registry decides what enters the live model during research; W009
  packages a RESULT the harness already produced, post-hoc, over settled picks — a distinct,
  later lifecycle stage, not a second admission system.
- Decision: added `apps/web/lib/hypothesis-instrument/` — `types.ts` (`HypothesisKind`, a closed
  union with exactly one v0 member, `MODEL_BEATS_CLIMATOLOGY`, the only comparison the harness
  actually computes; a 4-state `HypothesisInstrumentStatus`:
  `SUPPORTED`/`NOT_SUPPORTED`/`INSUFFICIENT_SAMPLE`/`UNTESTED` — deliberately NOT collapsing
  "thin/empty sample" into "no", which would itself be a fabricated stat) and `build.ts`
  (`buildModelBeatsClimatologyInstrument(report, hash)`, pure, zero I/O, zero new statistics —
  every score field is copied straight off `BacktestHarnessReport.climatology`; `status` is
  derived by reading `climatology.modelBeatsClimatology` directly rather than the harness's
  coarser top-level `status` string, because the two can diverge: an all-PUSH eligible sample
  clears the `settledSampleSize` floor [harness `status` reads `"ok"`] while `binarySampleSize`
  is zero, so the harness itself withholds `climatology` — reading the field this instrument
  actually depends on is what keeps that edge case honest). `instrumentId` is a STABLE key off
  the hypothesis kind (a lookup identity), distinct from `digest` (this instrument's own content
  hash) and `sourceReportHash` (the harness's own `provenance.outputHash`, cited not re-hashed).
  Also added the concrete W004 integration: `hypothesisInstrumentToSportsIrClaim(instrument,
  subjectEntityId)` in `apps/web/lib/sports-ir/adapters.ts` — a SECOND source for the existing
  ADAPTED `SportsIrClaim` primitive (alongside `pickDecisionToSportsIrClaim`), not a new
  primitive. `subjectEntityId` is caller-supplied (same discipline as `makeSportsIrEntity`) since
  the instrument is an aggregate across the eligible sample, not scoped to one entity.
  `confidence` is always `null` — SUPPORTED/NOT_SUPPORTED is a test result, not a calibrated
  probability, and fabricating one would violate this repo's "no fabricated stats" rule. The
  claim's `statement` renders real numbers when present and an honest withholding sentence
  otherwise — verified by test to never interpolate a literal `null`.
- Evidence: 10 new tests green (7 `hypothesis-instrument/__tests__/build.test.ts` — UNTESTED,
  INSUFFICIENT_SAMPLE, the all-PUSH edge case specifically, SUPPORTED and NOT_SUPPORTED each
  proven against a REAL `runBacktestHarness()` run with exact Brier numbers cross-checked
  against `brierDecomposition()` called directly, `instrumentId` stability, `digest`
  reproducibility/change-detection; 3 `sports-ir/__tests__/adapters.test.ts` — confidence always
  null and id/subjectEntityId/kind pass-through across all four status branches, statement
  renders real numbers when SUPPORTED, statement honestly withholds for UNTESTED/
  INSUFFICIENT_SAMPLE). Full re-run: `backtest/harness.test.ts` 12 unaffected,
  `sports-ir/__tests__/adapters.test.ts` 21 (18 pre-existing + 3 new, zero pre-existing
  assertions changed), `backtest/artifact.test.ts` 3 unaffected — 43 total in the targeted
  suites. `tsc --noEmit` clean. `eslint --max-warnings=0` clean on all touched files.
  `npm run guardrails` all 17 gates green (including `no-unsupported-performance-claims` and
  `commercial-copy-scan`, both relevant given the protected zone). Full `apps/web` suite
  independently re-run once, whole: 630 files / 8,501 tests green, zero regressions.
  `git diff --check` clean on all new/changed files.
- Alternatives rejected: a freeform `hypothesis: string` field instead of a closed
  `HypothesisKind` union (would let a future caller invent a comparison the harness never
  actually computed — the entire risk this workstream's protected-zone note exists to close);
  reusing `trials-registry.ts`'s hash-chain/FDR machinery directly (wrong lifecycle stage — that
  system is about admitting research into the model, not packaging an already-published
  post-hoc result); a new SportsIR primitive instead of a second Claim source (an instrument IS
  structurally an assertion — reusing the existing ADAPTED `Claim` avoids the "uncontrolled
  multiplication of parallel systems" this session has repeatedly guarded against).
- Reversibility: purely additive — one new package-local module, zero existing files' logic
  changed (`sports-ir/adapters.ts`/`index.ts` gained new exports only), zero new API routes,
  zero new DB access, zero UI changes, zero live callers.
- Protected zones: evaluation/claims (per the workstream's own queue row) — the closest any
  workstream has come to public-performance-claims territory this session. Scope kept
  deliberately conservative (wrap only, zero new statistics) rather than running a full
  gse-red-team pass, since there is no public/live surface for that pass to review yet (zero
  callers); a REQUIRED-before-any-live/public-wiring precondition is documented in both the
  workstream doc and directly in `adapters.ts`'s doc comment, mirroring DEC-021/DEC-024's
  pattern, so it cannot be silently dropped when this module gets its first real caller.
- Files: apps/web/lib/hypothesis-instrument/{types.ts,build.ts,index.ts,__tests__/build.test.ts}
  (new), apps/web/lib/sports-ir/{adapters.ts,index.ts} (additive exports only),
  apps/web/lib/sports-ir/__tests__/adapters.test.ts (additive tests only),
  docs/frontier/WORKSTREAM_009_HYPOTHESIS_TO_INSTRUMENT_V0.md (new).
- Supersedes: none.

## DEC-026 — W010 dependency re-verification: "telemetry baseline" genuinely does not exist (2026-07-17)

- Date: 2026-07-17
- Workstream: W010 (frontier queue). Not an implementation — a verification-only decision closing
  the gap this session's own prior CURRENT_STATE.md note flagged: "W010's own listed dependency
  ('telemetry baseline') has not yet been verified to exist in the repo... check for real
  evidence before freezing that contract... rather than assuming." Ran an exhaustive read-only
  sweep (Explore agent, 49 tool calls) rather than trust the queue row's prose.
- Decision: W010 stays BLOCKED. No real, live, structured capture of user
  behavior/comprehension/friction signal exists anywhere in this repo today. Evidence, closest
  candidates first: (1) `apps/web/lib/analytics/events.ts` — a well-designed, well-tested typed
  event contract (28 event names spanning the pricing/conversion and waitlist funnels), but its
  `track()` function is an explicit, documented NO-OP (returns its input unchanged; zero
  network call, zero persistence) — `docs/gse/pr3-analytics-provider-plan.md` states outright
  "Status: PLAN ONLY. No provider integration," gated on an unmade owner/privacy decision; only
  4 real call sites exist in the whole app (all in the waitlist form), despite ~24 of the 28
  defined events describing surfaces that never call `track()`; no analytics vendor SDK
  (PostHog/Segment/Mixpanel/Amplitude/Plausible/GA4/`@vercel/analytics`) is an actual dependency
  anywhere in `package.json`/`package-lock.json`, contradicting the PR3 doc's claim one is
  "already present in the OSS stack." (2) `apps/web/lib/observability/sentry.ts` — real code,
  genuinely wired into the global error boundary and `instrumentation.ts`, but dormant by
  default (`SENTRY_DSN` unset in both `.env.example` and `.env.production.example`), and even
  when live it captures crashes/exceptions only — not comprehension gaps or drop-off. (3)
  `app/admin/statking/user-feedback/page.tsx` — the one page literally named "User Feedback" is
  explicitly labeled `status="fixture"` in its own UI copy and backed entirely by
  `scripts/statking_autonomous_build.py`-generated synthetic rows (`user_id: 'fixture_user'`)
  with no submission form or write path — not live capture. (4) `packages/db/prisma/schema.prisma`
  (~60 models) has no page-view/funnel/session-behavior/click-event table; its one `Session`
  model is NextAuth's auth session, unrelated. (5) No A/B testing or experiment infrastructure
  exists beyond founder-gated operational kill-switches (`PROJECTIONS_PROVIDER`,
  `OTS_ANCHOR_ENABLED`, etc.), which toggle backend data sources, not user-segment experiments.
  `docs/frontier/FRONTIER_KERNEL.md` names "Product Twin" only in aspirational vision-doc prose
  (line 41) and — unlike every other frontier concept that already landed a workstream
  (W002/W003/W004/W005/W007/W009) — its own "Nearest existing assets" pointer table has zero
  entry for Product Twin, confirming even that doc never claimed a real substrate existed.
- Evidence: full sweep documented above; agent read `apps/web/lib/analytics/events.ts` in full,
  `docs/gse/pr3-analytics-provider-plan.md` and `docs/gse/analytics-events.md` in full,
  `apps/web/lib/observability/sentry.ts` + both env-example files, the statking user-feedback
  page + its data source (`apps/web/lib/statking/product.ts`) + its generator script, the full
  Prisma schema, and grepped for every plausible telemetry/analytics/experiment vendor and
  keyword repo-wide.
- Alternatives rejected: treating `analytics/events.ts`'s existence as "close enough" to unblock
  W010 (would mean building Product Twin v0 against a data source that captures nothing today —
  the workstream's own "bounded proposals from comprehension gaps" premise requires REAL gaps to
  observe, and this session's "adapt only what is real" discipline forbids substituting a
  well-designed no-op for actual evidence); wiring up `track()` to a real provider ourselves as
  a prerequisite (out of scope — `pr3-analytics-provider-plan.md` correctly marks provider
  selection as owner-gated, pending a privacy/DPA review this session cannot perform
  autonomously).
- Reversibility: n/a — no code changed, verification only.
- Protected zones: privacy, experiments (per the workstream's own queue row) — exactly why this
  dependency could not be casually assumed satisfied; a privacy review is explicitly required
  before any real telemetry capture is wired up, which is itself evidence this cannot be
  self-authorized into existence.
- Files: docs/frontier/WORKSTREAM_QUEUE.md (W010 row), docs/frontier/CURRENT_STATE.md (refresh).
  No product code touched.
- Supersedes: none — the prior W010 BLOCKED label (unverified) is now BLOCKED (verified).

## DEC-027 — Task #13 slice: Real Waiver Signal panel on the live Sleeper sync (2026-07-17)

- Date: 2026-07-17
- Workstream: Task #13 (Fantasy Engine 10x, owner mandate 2026-07-11) — first UI for the
  already-built, already-tested `apps/web/lib/intelligence/roster-advice.ts` engine, which had
  a bare PRO/ELITE-gated POST route and zero user surface. Scoped by a read-only scout that
  verified the engine, its data path (`loadPlayerModel` → live nflverse, NOT behind the
  founder-gated `PROJECTIONS_PROVIDER` illustrative pool), and the live read-only Sleeper
  roster sync precedent (`sleeper-connect.tsx`'s availability-overlay useEffect pattern).
- Decision: added `apps/web/components/fantasy/roster-advice-panel.tsx` — a client panel that
  POSTs the synced roster's deduped player names to the EXISTING, UNMODIFIED
  `/api/intelligence/roster-advice` route and renders adds/drops/reads with their real model
  `reason` strings. Enforcement stays server-side only (`requirePremiumApi`); the panel holds
  zero entitlement logic and only reacts to the HTTP response. Every state is distinct and
  honest: loading (plain text, no motion), 401 unauthenticated (sign-in prompt), 403
  insufficient_tier (upgrade prompt + /pricing), 429 (rate-limit message), source-error
  (honest unavailable, never stale/fake data), generic error, ok (real data + honest
  empty-section messages + season/throughWeek recency caption that omits null). Wired into
  `sleeper-connect.tsx` after the Bench group. Honesty fixes to two stale founder-gate claims
  (sleeper-connect paragraph + connect/page note): waiver add/drop/read signal is live today
  for Pro/Elite on a resolved roster; lineup/trade remain founder-gated.
  `engines/page.tsx`'s "Roster Advice" disclosure entry gained `board: "/fantasy/connect"`.
  Out-of-scope and untouched (verified by git diff): `roster-advice.ts`, `player-model.ts`,
  the API route, Stripe/pricing, `PROJECTIONS_PROVIDER`, all entitlement logic.
- Independent review: gse-verifier CONFIRMED all 10 checks (including `view.you` referential
  stability — the `[you]` effect cannot refire on unrelated re-renders and hammer the rate
  limit). gse-red-team found 3 REAL findings, all reproduced directly then fixed: F1 the
  route reports a live nflverse outage as HTTP 200 + `success:false` +
  `data.status:"source-error"`, but the panel's generic `!json.success` check ran first,
  making the dedicated source-error message dead code AND the test fixture had been bent to
  the component (`success:true`, a payload the route never emits) — fixed by reordering the
  checks (source-error before generic failure) and correcting the fixture to the route's real
  contract; F2 anonymous viewers on this public page get 401 `authentication_required`
  (verified in `api-entitlement.ts` evaluateGate) which fell into the transient-error
  message — added a distinct unauthenticated state (sign-in + pricing links) + regression
  test; F3 the reworded paragraph omitted the Pro/Elite qualifier and referenced "the model
  below" in the standings-only case where no panel renders — reworded ("live today for Pro
  and Elite on a resolved roster"). Red-team explicitly cleared: premium leak (none — client
  renders nothing but honest states pre-response), second-gate anti-pattern (none), wrong
  endpoint/data sinks (none), reason-text substance (process-language anchored to numeric
  gaps, no outcome promises, all strings pre-existing at base SHA).
- Evidence: targeted suite 5/5 (was 4, +1 401 regression test); full apps/web suite 631
  files / 8,509 tests green (re-run AFTER the red-team fixes per the stale-green rule);
  `tsc --noEmit` clean; `eslint --max-warnings=0` clean on all changed files;
  `npm run guardrails` 17/17 green (commercial-copy + performance-claims both cover the new
  copy); `npm run build` 214/214 pages; `git diff --check` clean.
- Also closed here: the W009 independent re-verification's one open gap — repo-wide grep for
  `buildModelBeatsClimatologyInstrument`/`hypothesisInstrumentToSportsIrClaim` callers outside
  the module/adapter files returned zero, and no app route/worker imports `sports-ir` at all,
  so DEC-025's "fully shadow, zero live callers" claim is now command-verified (the
  re-verifier's hand-derivation had already confirmed the status-mapping/Brier/null-safety/
  instrumentId logic with zero discrepancies). The founder's new
  `.claude/skills/gse-autopilot/SKILL.md` (commit `c1cbda7d`, ff-merged cleanly with zero
  disturbance to uncommitted work) was read in full and is semantically identical to the PR
  #125 command doc already adopted — no behavioral delta to record beyond this note.
- Alternatives rejected: a client-side tier pre-check to skip the doomed fetch for FREE
  viewers (this repo treats even redundant client gates as drift-risk defects — the honest
  locked/unauthenticated states ARE the UX); auto-retry on transient errors (would mask real
  outages and burn the shared rate limit).
- Reversibility: additive UI + copy + one catalog link; delete the panel file and revert the
  two copy edits to roll back; zero data/schema/route changes.
- Protected zones: entitlements + public claims — full verifier + red-team pass completed
  pre-commit, all confirmed findings fixed and re-gated.
- Files: apps/web/components/fantasy/roster-advice-panel.tsx (new),
  apps/web/components/fantasy/sleeper-connect.tsx, apps/web/app/fantasy/connect/page.tsx,
  apps/web/app/intelligence/engines/page.tsx,
  apps/web/__tests__/roster-advice-panel.test.tsx (new).
- Supersedes: none.

## DEC-028 — Task #13 slice: Waiver War Room (bye collisions + model-vs-market disagreement) (2026-07-17)

- Date: 2026-07-17
- Workstream: Task #13 (Fantasy Engine 10x), second slice on the same real-data foundation
  DEC-027 established. Composes three already-live, cleared data paths that had never been
  joined against a real synced roster: `apps/web/lib/fantasy/adp-source.ts` (FFC ADP, real
  per-player bye weeks, `approved_api`), `apps/web/lib/intelligence/player-model.ts` (real
  nflverse process grades), and `apps/web/lib/integrations/sleeper.ts`'s `loadSleeperTrending`
  (real Sleeper waiver add/drop momentum).
- Decision: added `apps/web/lib/fantasy/waiver-war-room.ts` — two pure functions.
  `byeCollisions` joins a roster to FFC rows by `adpJoinKey` (name+position, never name alone,
  reused not reimplemented) and groups real byes into collision weeks (bye<=0 = "no bye
  joined" per this repo's established convention, routed to `unknown`, never a fabricated
  Week-0 group). `marketDisagreements` tallies BOTH Sleeper lists per player BEFORE judging
  direction, judges by the DOMINANT side (ties skipped as ambiguous — a player added in 900
  leagues and dropped in 5 is being added, never reported as "the market is leaving"), and
  reports only the two genuine conflict classes (model buy-low + market net-dropping; model
  sell-high + market net-adding) — agreement is corroboration and is NOT reported, mirroring
  Worldline's conflict-detection doctrine (W007). New route
  `apps/web/app/api/fantasy/waiver-war-room/route.ts`: `requirePremiumApiRateLimited` gates
  before any body parse or loader call; the three loaders run in parallel; each of the two
  response legs (byes, disagreements) degrades to its OWN honest `source-error` independently
  — a failed leg never masquerades as a computed "all clear," and never blocks the other leg.
  New client panel `apps/web/components/fantasy/waiver-war-room-panel.tsx`, same
  server-side-only entitlement doctrine as DEC-027's `RosterAdvicePanel` (401/403/429/error/
  per-leg-source-error, zero motion, zero client-side tier logic), wired into
  `sleeper-connect.tsx` alongside it.
- Independent review: gse-verifier CONFIRMED all checks (hand-derived the dominance-tally and
  bye-0 logic, confirmed the final sort's `localeCompare` tail makes ordering fully
  deterministic despite `Map` iteration order, confirmed zero duplication of
  `adpJoinKey`/loader logic, confirmed `roster-advice.ts`/`player-model.ts`/`sleeper.ts`/other
  existing routes untouched). gse-red-team found 4 real findings, all fixed: (1) HIGH —
  `loadPlayerModel()` has NO cache (fresh multi-MB uncached nflverse CSV fetch+parse every
  call) yet the new route permitted 120 req/min via the generic
  `requirePremiumApiRateLimited` ceiling — 20x the accepted budget the sibling
  `roster-advice` route already set for the identical compute (30/5min) — a real
  cost-amplification/impolite-load vector; (2) the two panels (RosterAdvicePanel +
  WaiverWarRoomPanel) now both independently trigger that same uncached fetch per league
  selection, doubling the dominant cost term; (1)+(2) fixed together with ONE change: a
  10-minute in-process TTL cache added to `loadPlayerModel` itself (mirrors the existing
  `adp-source.ts`/Sleeper-player-map cache pattern; live results only, failures never cached,
  injected test fetchers bypass the cache entirely so the two existing `player-model`/
  `roster-advice` test suites needed zero changes and stayed green); (3) a missing regression
  test for a failed disagreements leg (the byes-leg-failure honesty was tested, its mirror
  wasn't) — added, and confirmed it would have caught a regression; (4) two copy overclaims —
  "No week has two or more of your players on bye" asserted a fact about the whole roster when
  only matched players were checked (reworded "matched players"), and "they currently agree"
  asserted agreement the code never actually establishes for ambiguous 50/50 churn or in-line
  signals (reworded "no conflicts to report"); a third wording nit (unverified "N leagues"
  unit on the Sleeper trending count) was also tightened to "N recent adds/drops across
  Sleeper leagues" rather than asserting a per-league unit this repo has no other precedent
  for. Also confirmed clean: FFC/Sleeper attribution renders on every surface displaying their
  data (both ok and source-error byes legs); no rights-registry bypass (the route calls the
  existing clearance-gated `loadFfcAdp`, no direct fetch); no premium leak; no client-side
  entitlement drift; the unrendered `clear` (single-bye, non-colliding) field was dropped from
  the route response entirely rather than shipped as an unrendered per-player data-export
  vector.
- Evidence: 13 new tests (8 pure-lib + 5 panel, later +2 more from the cache/test-mirror fixes
  = ultimately 19 targeted incl. the states-matrix additions counted separately in this
  session); full targeted re-run after all fixes: `waiver-war-room.test.ts` 8,
  `waiver-war-room-panel.test.tsx` 5 (all edited for the copy fixes),
  `player-model.test.ts` 6, `roster-advice.test.ts` 7 — all green, confirming the cache
  change didn't alter any existing model/route behavior; `tsc --noEmit` clean;
  `eslint --max-warnings=0` clean on every touched file.
- Alternatives rejected: lowering only the new route's rate-limit bucket instead of caching
  (would have left the roster-advice route's OWN identical uncached-fetch cost unaddressed,
  and DEC-027's panel would still double-pay on every league switch); reporting market
  direction by mere presence in either Sleeper list (silently produces the "5 drops out of 900
  adds reported as a market exit" dishonesty the dominance rule exists to prevent).
- Reversibility: additive; the `loadPlayerModel` cache is a pure performance/cost change with
  an explicit test-bypass for injected fetchers, reverting it drops back to zero caching with
  zero behavior change to any consumer.
- Protected zones: entitlements, public claims, source rights (FFC/Sleeper attribution) — full
  verifier + red-team pass completed pre-commit, all confirmed findings fixed and re-gated.
- Files: apps/web/lib/fantasy/waiver-war-room.ts (new),
  apps/web/lib/fantasy/waiver-war-room.test.ts (new),
  apps/web/app/api/fantasy/waiver-war-room/route.ts (new),
  apps/web/components/fantasy/waiver-war-room-panel.tsx (new),
  apps/web/components/fantasy/sleeper-connect.tsx (wiring),
  apps/web/__tests__/waiver-war-room-panel.test.tsx (new),
  apps/web/lib/intelligence/player-model.ts (additive TTL cache).
- Supersedes: none.

## DEC-029 — Task #8 slice: UX mechanical sweep (loading states + game-room error boundary) (2026-07-17)

- Date: 2026-07-17
- Workstream: Task #8 (Grandpa-simple + cinematic UX pass), first concrete slice this session
  after a read-only scout returned an evidence-backed gap list rather than a vague mandate.
  Confirmed via direct file reads (not just the scout's claim) that the repo's global
  reduced-motion, skip-link, and states doctrine is otherwise comprehensive (~35 files carry
  `prefers-reduced-motion` guards; `apps/web/__tests__/states-matrix-slice.test.ts` already
  pins the pattern for `picks`/`performance`/`clv`/`proof`).
- Decision: five force-dynamic, request-time-loader customer routes were missing the
  established `loading.tsx` skeleton pattern this repo already uses everywhere else —
  `apps/web/app/room/[gameId]` (multi-loader, entitlement-gated Game Room — the clearest miss,
  paints a blank frame on a slow load), `house`, `observatory`, `airwave`, `dashboard`. Added
  one `loading.tsx` per route, byte-structure-identical to the existing `board/loading.tsx`
  pattern (`ToolPageSkeleton` with an honest per-route label; no new component). Also added
  `apps/web/app/room/error.tsx`, a segment error boundary modeled exactly on the existing
  `apps/web/app/players/error.tsx` (same `captureError`/`initObservability` wiring, same
  prod/dev detail split, retry via `reset()`, branded Nav/Footer chrome) — `/room` composes
  several loaders (entitlements, market pulse, evidence timeline, playback) and previously had
  no boundary closer than the root, which would have dropped all chrome on a render throw.
  Explicitly left unchanged: `apps/web/app/dashboard/page.tsx`'s signed-out branch — it already
  has an honest "Continue to sign in" CTA with a correct `callbackUrl`, and BOTH its signed-in
  and signed-out branches render without the shared `Nav`/`Footer` components (a bespoke inline
  header instead), so adding chrome to only one branch would have been a new inconsistency, not
  a fix.
- Independent review: gse-verifier CONFIRMED all checks — pattern conformance against
  `board/loading.tsx` and `players/error.tsx`, correct Next.js error-boundary segment semantics
  (`room/error.tsx` catches `/room/[gameId]` as a descendant segment), all five target routes
  confirmed genuinely `force-dynamic`, and the dashboard non-change reasoning independently
  verified by reading the file rather than trusting the rationale as given.
- Evidence: `states-matrix-slice.test.ts` extended with the five new routes + the error-boundary
  assertion, 19/19 green; `tsc --noEmit` clean; `eslint --max-warnings=0` clean;
  `git diff --check` clean; full-suite guardrails 17/17 (unaffected — no copy/entitlement
  surface touched).
- Alternatives rejected: adding Nav/Footer only to dashboard's signed-out branch (would create
  a new visual inconsistency with the signed-in branch, not fix one).
- Reversibility: purely additive route-level files; zero product logic touched.
- Protected zones: none directly (pure UX/observability scaffolding); reviewed anyway per this
  session's standing discipline for customer-facing changes.
- Files: apps/web/app/room/[gameId]/loading.tsx (new), apps/web/app/room/error.tsx (new),
  apps/web/app/house/loading.tsx (new), apps/web/app/observatory/loading.tsx (new),
  apps/web/app/airwave/loading.tsx (new), apps/web/app/dashboard/loading.tsx (new),
  apps/web/__tests__/states-matrix-slice.test.ts (extended).
- Supersedes: none.

## DEC-030 — W-WEATHER-REC's last open item: strict as-of previous-runs loader wiring (2026-07-17)

- Date: 2026-07-17
- Workstream: W-WEATHER-REC's remaining unscoped item — "wiring `previous-runs-api` into the
  feature store before any real historical admission run." Dependency-ready: DEC-023's live
  smoke gate (`scripts/weather-integration-smoke.mjs`) already empirically confirmed
  Open-Meteo's `previous-runs-api` serves genuinely distinct forecast runs per hour via
  `_previous_dayN`, the correct leak-safe target the vendored loader's `historical-forecast-api`
  backtest path cannot offer (it stitches runs into one continuous series with no per-hour
  issuance selection).
- Decision: new module `packages/prediction-engine/src/edge-lab/loaders/weather-previous-runs.ts`
  — `getAsOfGameWeatherPreviousRuns(query, deps)`, the SAME `GameWeatherQuery → WeatherFeatures`
  contract as the vendored `getAsOfGameWeather` (leak-guard throw, honest `unavailable`
  degradations, identical indoor neutralization), so the existing `toGameWeatherForecast`
  adapter and `buildWeatherFeatureRows` leak gate consume it UNCHANGED — one canonical
  downstream path, two honest upstream sources. Reuses the vendored loader's own
  `__internals.utcHourBucket`/`candidateSignals` (zero duplicated math). The vendored loader
  itself (`weather-edge.ts`) is untouched — confirmed via `git diff`, per DEC-014's "behavioral
  edits forbidden." Run selection follows DEC-023's documented conservative rule: N =
  max(1, ceil(exactLeadHours / 24)), never a smaller N, capped at the API's documented 7-day
  window (degrading to honest `unavailable` beyond it, never a leaky smaller N).
- Self-caught defect (found and fixed BEFORE either independent review completed, then
  independently re-confirmed once the fix was verified live on disk): the first cut computed
  `leadTimeHours` via `Math.round()` and fed THAT rounded value into the day-selection
  `ceil()` — a genuine, non-degenerate leak. A live doc check (performed independently by the
  gse-verifier pass) confirmed Open-Meteo's `_previous_dayN` semantics are a FIXED per-hour
  offset (`_previous_day1` = the run initialized exactly ~24h before the valid hour), so a
  24.4h exact lead rounding to 24h and selecting `_previous_day1` would select a run
  initialized ~24 minutes AFTER the true freeze instant — a real lookahead in a recurring
  ~30-minute band at every 24h boundary (24.0-24.5h, 48.0-48.5h, ...). The downstream leak gate
  does NOT catch this class of error: `toGameWeatherForecast` stamps `forecastIssuedAt` from
  the QUERY's own `asOfUtc`, not from any true API run-issuance time, so a wrong-day selection
  would flow straight through silently. Fixed by computing an unrounded `exactLeadHours` and
  feeding that into `previousDayN`'s `ceil()`; the rounded value is now used ONLY for the
  human-readable `provenance.leadTimeHours` display field. Two regression tests added: a pure
  boundary test (`previousDayN(24.4)` must be 2, never 1) and an end-to-end test with a mocked
  `fetchJson` asserting the built URL requests `_previous_day2` not `_previous_day1` for a
  24.4h-lead query — both independently verified (by re-introducing the bug, confirming the
  tests fail, then restoring the fix and confirming they pass) rather than merely asserted.
- Independent review: gse-verifier independently fetched Open-Meteo's own live documentation
  to confirm the `_previous_dayN` semantics (the load-bearing fact the whole fix rests on) and
  confirmed the `ceil()` formula is provably conservative given those real semantics; also
  confirmed zero modification to the vendored loader, zero duplicated math, and (after the fix
  landed) 27/27 tests green + `tsc --noEmit` clean. gse-red-team's first pass read the
  pre-fix file (a genuine timing race it flagged honestly in its own report — "no agent message
  overrides verified facts") and correctly reproduced the exact same leak/finding
  independently from first principles, which is itself strong independent confirmation that
  the bug (and the fix) are real and correctly characterized; a direct re-read of the file
  on disk after its report confirmed the fix is in place and the file matches the
  already-fixed state, not the stale one the red-team read. Minor red-team nit (a forward
  reference to "DEC-028" before that entry existed) corrected to the actual DEC-030 this entry
  occupies.
- Also self-flagged proactively (not raised by either reviewer): DEC-023's smoke empirically
  verified distinct-run behavior only through `_previous_day3`; days 4-7 are Open-Meteo's
  documented but not independently live-verified capability. Documented honestly in-code with
  a safe fallback (an absent day4-7 field degrades to the same honest `unavailable` any other
  missing-field case uses — never fabricated) and a named cheap follow-up (extend the smoke to
  N=4..7) before relying on that range in a real admission run.
- Evidence: 12 tests in the new suite + the existing 8 `weather-edge.test.ts` + 7
  `nfl-weather.test.ts` all green (27 total); `tsc --noEmit` clean in
  `packages/prediction-engine`; `npm run guardrails` 17/17 green (re-run after a
  `banned.guaranteed-outcome` trust-gate hit on the word "guaranteed" in an early doc-comment
  draft — reworded to "issued <= asOfUtc by construction" before commit, confirmed by re-running
  trust-gate directly); `git diff` on `weather-edge.ts`/`features/*` empty; Open-Meteo's
  `open-meteo` source-rights-registry entry (`approved_open_license`, CC-BY-4.0, commercial
  display allowed, attribution required) confirmed consistent with the module's stated
  rights posture; zero production callers (grep), module performs no I/O of its own
  (injected `fetchJson` only) — bulk historical admission runs against the hosted free tier
  remain OWNER_GATE (self-host or licensed tier required for production scale, per the
  registry's own unlock condition).
- OWNER_GATE: a real historical weather-admission run (bulk previous-runs calls at hosted-tier
  scale, and/or the actual feature-store trials-registry admission decision) requires a
  founder self-host/license call for the hosted API's commercial terms. Safe default: this
  module ships wired but uncalled by any production path; re-entry condition is a founder
  decision to either self-host Open-Meteo or purchase its commercial tier, after which a
  bounded follow-on workstream would wire this loader into a real
  `recordFeatureAdmissionTrial` run.
- Alternatives rejected: keeping the rounded `leadTimeHours` for selection with a wider safety
  margin (e.g. always rounding UP) instead of fixing the root cause — papering over exact
  arithmetic with an ad hoc margin is exactly the kind of fragile fix this session's own
  discipline rejects when the precise, provably-correct fix is equally cheap.
- Reversibility: purely additive, zero existing files' behavior changed (vendored loader
  untouched, zero live callers).
- Protected zones: data, model claims — full independent verifier + red-team review completed;
  the one real finding was self-caught before either review, then independently corroborated
  by both.
- Files: packages/prediction-engine/src/edge-lab/loaders/weather-previous-runs.ts (new),
  packages/prediction-engine/src/edge-lab/__tests__/weather-previous-runs.test.ts (new).
- Supersedes: none.

## DEC-031 — GX-R00 branch/PR reconciliation: exhaustive inventory pass (2026-07-17)

- Date: 2026-07-17 (session continues past local midnight into 2026-07-18 wall-clock)
- Workstream: GX-R00 (`docs/genesis/BRANCH_RECONCILIATION_CONTRACT.md`, read in full from PR #125's branch
  before acting, per this session's own "adapt only what is real" discipline — not improvised). Entered only
  after the live queue was genuinely drained (Batches A/B complete, DEC-027 through DEC-030), matching both
  `CONTINUOUS_EXECUTION_CONTRACT.md` §4's queue-drain law and `.claude/commands/genesis-reconcile.md` §0's
  explicit precondition.
- Decision: produced the contract's required first-run outputs — inventory and split-plan only, no feature-code
  recovery, per the contract's own "Recovery-wave law" and the reconcile command's §8 "Stop after one inventory
  or recovery wave." All 184 non-`main` remote branches enumerated via real `git branch -r`/`merge-base`/
  `rev-list` calls (not estimated): 25 received full semantic detail (the contract's named collision Groups
  A-I, cross-referenced against this session's own DEC-001..DEC-030 history plus live-refreshed PR bodies for
  every open PR: #52/#101(closed)/#112/#121/#122/#123/#124/#125/#126(closed)/#127/#128/#129); 159 received real
  git-derived metadata (head SHA, merge-base, ahead/behind, last-updated) with an HONEST `UNKNOWN` disposition
  — no fabricated `RECOVER`/`SUPERSEDED`/`ARCHIVE` verdict for content never actually read. 12 branches proven
  pure ancestors of `main` (0 commits ahead, `git merge-base --is-ancestor` true) — the contract's own strongest
  comparison-method tier — flagged as deletion-receipt candidates (receipt not written; the contract requires
  the receipt to exist as its own explicit step before any deletion, never bundled into inventory).
- A genuine, previously-unflagged gap self-discovered via a mechanical evidence sweep (not asserted, computed):
  `git log origin/main --oneline | grep -oE '\(#[0-9]+\)'` shows PR numbers #97-120 all present as literal
  squash-commit references on main (real proof their content landed) except #101/#112 (independently
  accounted for elsewhere) — but PR numbers #76-96 are ABSENT from that same sweep despite most being
  `state:closed, merged:false` in GitHub, including real correctness/security-flavored hotfixes (#91
  stripe-event-ordering, #92 settle-refresh-races, #93 cockpit-page-auth, #94 proof-count-utc-bounds, #95
  vacuous-stub-tests). This is NOT proof the content is missing (could have landed via a differently-formatted
  commit or been absorbed into a later PR), but it is also not proof it's present — recorded as Wave R0.5 in
  `RECOVERY_WAVES.md`, inserted ahead of the seed's own R1 per the queue-priority law's own "live
  correctness/security defect" ranking, rather than silently left for a future session to rediscover.
  Both PR #101 and PR #126 independently re-verified CLOSED via live `pull_request_read` calls this pass
  (`closed_at: 2026-07-17T20:4x`), confirming the seed's claims rather than trusting them — matching this
  session's repeated discipline of verifying seed/handoff documents against live state before acting on them.
- Evidence: `reports/reconciliation/BRANCH_PR_LEDGER.json` (machine-readable, all 184 entries, JSON-validated),
  `BRANCH_PR_LEDGER.md` (founder-facing projection incl. a self-check against all 10 of the contract's own
  acceptance criteria — 6 fully met, 2 partially met and honestly marked so, 2 not attempted and named as such,
  never claimed complete when it wasn't), `FILE_SYMBOL_OWNERSHIP.csv` (the six architecture collisions the seed
  doc already proved — source-rights registry duplicate, model/provider routing overlap, capability-vocabulary
  multiplication, parallel program queues, playback overlap, proof-fabric overlap — each row citing the exact
  file/commit/PR evidence, not re-asserted from memory), `RECOVERY_WAVES.md` (the seed's R0-R11 sequence
  refreshed with this pass's live findings + the new R0.5/R11.5 insertions), `DELETION_RECEIPTS.md` (correctly
  empty — zero deletions performed or receipted this pass). New deterministic, read-only
  `scripts/genesis/audit-work-inventory.mjs` — enumerates live branches via git, cross-references the ledger,
  exits nonzero on invisible work; its pure `classify()` function is unit-tested in isolation (6 tests,
  hermetic fixtures, no real git calls) mirroring the existing `scripts/vercel-skip-build.test.mjs` split
  between pure-logic and impure-I/O testing. Run live against the just-built ledger: 184/184 branches matched,
  zero invisible work, exit 0 — the script's own core claim is self-verified, not merely asserted. Wired as
  `npm run genesis:work-inventory`; its test file wired into CI (`node --test
  scripts/genesis/audit-work-inventory.test.mjs`) alongside the existing `vercel-skip-build` pattern —
  deliberately NOT wiring the live audit itself into CI, since it shells out to `git merge-base`/`rev-list`
  against real remote branches, which would be flaky under CI's shallow (`fetch-depth: 1`) checkout, the same
  reasoning this session has applied to `git diff origin/main`-based CI assertions before.
  `git diff --check` clean; `secret-scan.mjs` explicit-paths mode (not directory mode, which silently no-ops on
  a directory argument — caught and corrected mid-pass) clean on all 7 new/changed files.
- Alternatives rejected: fabricating deep RECOVER/SUPERSEDE verdicts for all 159 long-tail branches to
  superficially satisfy "every branch classified" (would violate this session's own "adapt only what is real"
  discipline and the contract's own invariant #2 against ahead-count-as-evidence); attempting literal
  content-diff review of all 184 branches in one pass (the contract's own Recovery-wave law explicitly scopes
  the first run to inventory-only; attempting more would either take the rest of the session with high error
  risk or produce shallow, low-confidence verdicts presented as authoritative — neither acceptable); wiring
  the live audit script into CI (real flakiness risk under shallow checkouts, not a genuine safety gain).
- Reversibility: fully additive; zero product code touched; zero branches deleted, closed, or merged.
- Protected zones: none directly (accounting/documentation only), though the underlying branches being
  inventoried span every protected zone this repo has (settlement, CLV, migrations, proof, rights,
  entitlements) — each is correctly routed to its OWNER_GATE or ACTIVE_PR disposition rather than touched.
- Files: reports/reconciliation/{BRANCH_PR_LEDGER.json,BRANCH_PR_LEDGER.md,FILE_SYMBOL_OWNERSHIP.csv,
  RECOVERY_WAVES.md,DELETION_RECEIPTS.md} (new), scripts/genesis/{audit-work-inventory.mjs,
  audit-work-inventory.test.mjs} (new), package.json (new `genesis:work-inventory` script),
  .github/workflows/ci.yml (new test step for the audit script's unit tests).

## DEC-032 — Queue-drain receipt: tamper-evident precondition proof (2026-07-18)

- Date: 2026-07-18
- Workstream: Batch C item C2 (Master Plan v3). Formalizes, as its own explicit artifact issued after the fact,
  that `.claude/commands/genesis-reconcile.md` §0's queue-drain precondition was genuinely true BEFORE the
  DEC-031 reconciliation inventory began — mirroring the contract's own discipline for deletion receipts
  (issued as their own step, never silently bundled into the action they gate).
- Decision: `reports/reconciliation/QUEUE_DRAIN_RECEIPT.md` — a full six-clause self-check against
  `docs/genesis/CONTINUOUS_EXECUTION_CONTRACT.md` §4's drain law (each clause TRUE with cited evidence: no
  partially-implemented workstream, no dependency-ready IN_PROGRESS/QUEUED/NEXT item, all completed items have
  tests/ledgers/commit/push/PR state, all owner gates recorded with non-destructive defaults, all worktrees
  clean); a SHA-256 content-hash attestation table for the three canonical frontier ledgers
  (`CURRENT_STATE.md`/`WORKSTREAM_QUEUE.md`/`DECISION_REGISTER.md`) computed at receipt time, so a future
  session or founder review can re-hash and mechanically detect drift; a full OWNER_GATE recap enumerating
  seven distinct founder-only gates (PR #129 merge; PR #127/#128/#123/#121/#122/#124/#112/#52 dispositions;
  PR #122/OTS migration application; provider/flag env flips; the Open-Meteo hosted-tier bulk admission
  decision; GX-001/GG-002 start signal; the 12 proven-ancestor-branch deletions).
- Evidence: the receipt file itself (140 lines); `sha256sum` run immediately before writing it, matching the
  working-tree state committed at DEC-031's own commit `604b5b15`.
- Alternatives rejected: skipping the receipt as redundant since the precondition was independently
  demonstrable from the DEC-031 entry's own text — rejected because the contract requires the receipt to exist
  as its own reviewable, independently re-hashable artifact, not just be inferable from prose elsewhere.
- Reversibility: fully additive; zero product code touched.
- Protected zones: none.
- Files: `reports/reconciliation/QUEUE_DRAIN_RECEIPT.md` (new).
- Commit: `0e2166dc`. Pushed to `origin/claude/galaxy-sports-edge-pdcswh`.
- Supersedes: none.

## DEC-033 — Whole-campaign meta-audit: independent re-verification of Batches A-C (2026-07-18)

- Date: 2026-07-18
- Workstream: Batch C item C4 (Master Plan v3). The DEC-022 pattern applied to the full Master Plan v3 scope
  (commits `c1cbda7d`..`0e2166dc`: DEC-027 Real Waiver Signal, DEC-028 Waiver War Room, DEC-029 UX mechanical
  sweep, DEC-030 weather previous-runs, DEC-031 reconciliation inventory, DEC-032 queue-drain receipt) — a
  from-scratch, no-trust-inherited independent re-verification pass, explicitly instructed to be skeptical
  rather than confirmatory.
- Decision: dispatched two rounds of independent `gse-verifier` passes (agent-stall protocol applied to both —
  each stopped mid-investigation once and was resumed via a "stop investigating, write the synthesis now"
  nudge, per this session's established recovery pattern).
  - Round 1 (broad sweep): re-ran `tsc --noEmit` (all workspaces, clean), `eslint --max-warnings=0` (clean),
    `npm run guardrails` (17/17 green), `git diff --check` on the full commit range (clean), and independently
    re-derived — not merely re-read — every material claim in DEC-027 through DEC-031 against live code:
    the `roster-advice-panel.tsx` state-check ordering (source-error before the generic `!res.ok` check;
    401/403/429 handled), the `Team` import path, `waiver-war-room.ts`'s dominant-side tally logic, the
    `player-model.ts` cache's read-AND-write wiring, the route's `clear`-field omission, the five new
    `loading.tsx` files + `room/error.tsx`, and — the highest-stakes single item in the whole campaign —
    independently traced the entire `weather-previous-runs.ts` call chain confirming `previousDayN()` receives
    the UNROUNDED `exactLeadHours`, not the rounded display-only `leadTimeHours`, with no path routing a
    rounded value into the leak-sensitive day-selection math. Spot-checked 3 random `BRANCH_PR_LEDGER.json`
    entries against independent evidence rather than trusting the ledger's own text. Live `sha256sum` of the
    three frontier ledgers matched DEC-032's receipt table exactly (0e2166dc is HEAD; no drift possible).
    Zero CRITICAL FINDINGS; protected-zone diff scan (Stripe/billing/migrations/settlement/CLV/calibration/
    MODEL_VERSION/source-rights/publish-path patterns) clean across all 32 changed files. This round was
    explicitly time-boxed before three gates completed (full `npm test`, `npm run build`,
    `audit-work-inventory` script+test) — reported honestly as NOT RUN rather than silently omitted or assumed
    green.
  - Round 2 (the three gates Round 1 didn't reach, dispatched as three parallel `gse-verifier` agents):
    (a) `node --test scripts/genesis/audit-work-inventory.test.mjs` — 6/6 pass; live
    `node scripts/genesis/audit-work-inventory.mjs` — 184 live remote branches, 184 ledger-known refs, zero
    invisible/stale, exit 0, zero drift since the DEC-031 snapshot. (b) full production build mirroring CI
    exactly (`db:generate` then `npm run build` with the CI placeholder env vars) — exit 0, 214/214 pages,
    only pre-existing benign warnings (Sentry/OTel `require-in-the-middle` critical-dependency notice; expected
    Prisma connection errors against the unreachable placeholder DB during static generation, which do not
    fail the build). (c) full `npm test` (all 9 workspaces) — exit 0, 10,360 passed / 1 skipped / 0 failed
    across 813 test files; the single skip independently traced to
    `packages/crypto/src/__tests__/ots-anchor.test.ts`'s `describe.skipIf(process.env["OTS_LIVE_SMOKE"] !== "1")`
    block — the file's own header comment documents this is the live-calendar-network test, deliberately
    opt-in-only, "real network never runs in CI" — confirmed benign by reading the source, not assumed from
    the skip count alone.
- Evidence: two full agent transcripts (Round 1 broad sweep + Round 2's three parallel gate runs); this
  session's own live re-fetch of PR #129/#128/#127/#125/#124/#123/#122/#121/#112/#52 confirming all remain
  open/unmerged (no OWNER_GATE was silently crossed at any point in the campaign).
- CRITICAL FINDINGS: none, across either round.
- Alternatives rejected: treating Round 1's "PASS with disclosed gaps" as sufficient to close C4 without
  Round 2 — rejected because the master plan's C4 contract explicitly requires "all suites... build," and the
  session's own standing discipline (this exact DEC-022 pattern) is to close disclosed gaps rather than accept
  a partial audit as the final one.
- Reversibility: fully additive; zero product code touched; zero fixes were needed (nothing to revert).
- Protected zones: none directly; the audit's own scope covered every protected zone the batch's commits
  touch, and confirmed none were crossed.
- Files: none changed by this workstream itself beyond this ledger entry and the corresponding CURRENT_STATE.md
  update.
- Supersedes: none.

## DEC-034 — Recovery Wave R0.5: resolve the #76-96 PR-content-landing gap (2026-07-18)

- Date: 2026-07-18
- Workstream: Recovery Wave R0.5, per `RECOVERY_WAVES.md`'s own priority insertion (DEC-031). Executed after a
  deliberate correction: the session had drafted a "campaign complete" stop report (C5) before recognizing that
  `CONTINUOUS_EXECUTION_CONTRACT.md` §9's stop conditions require BOTH the live queue AND the reconciliation
  recovery queue to be exhausted — R0.5 was real, dependency-ready, non-owner-gated work still on the table, so
  emitting a final stop report first would have been premature and dishonest about campaign state. Corrected
  course per the founder's own repeated instruction to keep executing recovery waves before stopping.
- Decision: dispatched one general-purpose agent (full GitHub MCP + git access, strictly read-only — no
  checkout/merge/reset) to resolve all 21 PRs in the #76-96 range individually via `pull_request_read`
  (`method: get`, one call per PR — a prior bulk `list_pull_requests` call had exceeded the tool output token
  limit), then verify each via `git diff origin/main...origin/<head-branch> --stat` followed by direct reading
  of `main`'s current file content against each PR's described fix — comparison-method tier 4
  (exported-symbol/behavioral equivalence via direct inspection), not commit-message pattern matching or
  branch-ahead-count.
  - **Result: 5 SUPERSEDED** (#79, #80, #81, #83, #91 — content genuinely on main via a differently-formatted
    or salvaged commit; four of five directly attributable to PR #119's own body, which states it salvaged
    `claude/stress-property-suite` and merged "two independent lineages" of guardrail work).
  - **16 RECOVER_WHOLE** (#76, #77, #78, #82, #84, #85, #86, #87, #88, #89, #90, #92, #93, #94, #95, #96 —
    content confirmed genuinely absent from main by direct file inspection).
  - **0 unresolved.**
  - **6 of the 16 are LIVE, currently-exploitable defects on `main` today**, confirmed by reading the actual
    code (not inferred from PR prose): #82 (production DB fail-open + a health check that reports healthy
    while writes silently drop), #84 (orphaned CLV grades with no healing sweep), #86 (picks can stay PENDING
    forever — no VOID sweep exists), #89 (a DB/data outage on `/api/promotions` masked as an honest, cacheable
    empty response), #92 (a settle/refresh TOCTOU race that can let a refresh overwrite a just-settled pick's
    published grade, plus no stale-close CLV-fabrication guard), #93 (all 32 cockpit pages rely solely on
    layout-level ADMIN, no per-page defense-in-depth — already tracked separately via open PR #123).
  - Per `CONTINUOUS_EXECUTION_CONTRACT.md` §6's priority law ("live correctness/security/money-truth defect"
    ranks above all other priority factors), inserted a new Wave R0.6 ahead of the seed's R1, priority-ordering
    the 6 live-defect recoveries by blast radius: #92 (settlement/CLV) > #82 (production integrity) > #93
    (converges with existing R1/PR #123) > #86 (settlement) > #84 (CLV/public claims) > #89 (public claims,
    depends on #87). R0.6 itself was explicitly NOT executed this pass — this wave was scoped to verification
    only, matching its own original framing in `RECOVERY_WAVES.md`; recovery is each live-defect fix's own
    bounded wave, per the contract's "one bounded recovery wave at a time" law.
- Evidence: full agent transcript (49 tool calls: 21 `pull_request_read` + `git fetch`/`git diff --stat`/
  `git cat-file -e`/`git grep`/`git log` per branch); `reports/reconciliation/BRANCH_PR_LEDGER.json` updated in
  place (21 entries promoted from `longTailEntries` to `namedEntries` under new group `"R0.5"`, each carrying
  its exact evidence citation in the `reason` field; `gapFinding` marked RESOLVED with the full summary;
  `namedGroupCount` 25→26, `longTailCount` 159→138, total unchanged at 184); `BRANCH_PR_LEDGER.md` rewritten
  section-by-section (coverage line, new group row, gap section marked RESOLVED with a severity table, long-tail
  recency split recomputed exactly from the updated JSON — 55 recent / 83 older, not carried over stale — and
  the acceptance-criteria self-check's criteria #2/#3 updated); `RECOVERY_WAVES.md` R0.5 marked DONE, new R0.6
  section inserted, recommended-order list refreshed.
- Alternatives rejected: treating R0.5's verification result as license to immediately start coding all 6
  live-defect recoveries in the same pass — rejected because that would violate "one bounded recovery wave at a
  time" (each live-defect fix needs its own FREEZE CONTRACT, targeted tests, and — since every one touches a
  protected zone — a mandatory red-team pass; bundling six protected-zone changes into one uncontracted pass is
  exactly the "large, mechanically risky" pattern this session has repeatedly avoided). Fabricating verdicts for
  the remaining 138 long-tail branches to "finish" reconciliation in one pass — rejected for the same "adapt
  only what is real" reason DEC-031 already established.
- Reversibility: fully additive; zero product code touched (verification-only); zero branches merged, deleted,
  or modified.
- Protected zones: none directly touched (documentation/ledger updates only); the six live-defect findings
  themselves span settlement, CLV, production integrity, entitlements/auth, and public claims — each correctly
  routed to a named, prioritized future recovery wave rather than fixed ad hoc in this documentation-only pass.
- Files: `reports/reconciliation/BRANCH_PR_LEDGER.json`, `reports/reconciliation/BRANCH_PR_LEDGER.md`,
  `reports/reconciliation/RECOVERY_WAVES.md` (all modified).
- Supersedes: none (extends DEC-031's gap finding to a resolved state).

## DEC-035 — Recovery Wave R0.6.1: settle/refresh TOCTOU race fix, re-derived onto current main (2026-07-18)

- Date: 2026-07-18
- Workstream: Recovery Wave R0.6, item 1 of 6 (highest priority by blast radius per DEC-034's ordering).
  Ports historical PR #92 (`claude/hotfix-settle-refresh-races`, never merged, confirmed still-live via R0.5)
  forward onto the CURRENT `main` tip, since `main` has advanced (through PR #119/#120) since #92 was authored
  at merge-base `821d0ca3`.
- Contract frozen before coding: the pick-upsert `else` branch in `process-sport.ts` and the `take: 80` line in
  `settle-sport.ts` were confirmed byte-identical between the historical merge-base and current `main` (safe
  direct application); `clv-capture.ts`'s `deriveClosingSnapshotFromOdds` had drifted substantially (now
  requires `awayTeamName`, uses `selectionIsHomeSide()`/`averageAmericanPrices()` from DEC-034's SUPERSEDED
  #79/#83/#91 salvage) — manually re-derived rather than blind-patched.
- Decision: implemented three changes —
  1. `process-sport.ts`: replaced the unconditional `db.pick.upsert(...)` refresh/create path with (a) an
     atomic `db.pick.updateMany({ where: { id, result: "PENDING" }, ... })` for existing picks — a losing race
     against a concurrent settlement write now writes zero rows instead of clobbering a just-settled pick's
     published grade; (b) `db.pick.create(...)` wrapped in try/catch for a new-pick's P2002 unique-constraint
     conflict, adopting the winner's row rather than upserting over it; (c) a `wrotePickPayload` gate skipping
     the immutable `PickSignalSnapshot`/`PickProofReceipt` mints whenever this run did not actually write the
     pick payload (frozen/side-flip/lost-race), so provenance is never minted from an unpublished payload.
  2. `settle-sport.ts`: closing-odds query `take: 80` → `take: 240` (a wide consensus close — 27+ books x 3
     markets — can exceed 80 rows in one batch, silently truncating whichever books fell past the old cap).
  3. `clv-capture.ts`: `deriveClosingSnapshotFromOdds` gained an optional `maxCloseAgeMs` (default
     `MAX_CLOSE_AGE_MS = 6h`, exported); odds rows older than that relative to kickoff are excluded from being
     treated as "the close," preventing CLV fabrication against a dead feed's stale last-known price.
  - Test files updated to match (`process-sport.test.ts`: mocks rewired `pick.upsert` → `pick.create`/
    `pick.updateMany`, two new regression tests for the mid-refresh-settlement race and the P2002 create-race
    adoption; `clv-capture.test.ts`: three new tests for the close-age boundary, ported near-verbatim from the
    historical branch's own well-reasoned test additions).
- Independent review: one `gse-red-team` pass (two rounds — first stalled mid-investigation, resumed via the
  session's standing agent-stall protocol). CONFIRMED clean on 5 of 9 review points via direct schema/diff
  inspection: (1) `updateMany` scoped to `result:"PENDING"` compiles to a single atomic Postgres `UPDATE...WHERE`
  — genuinely closes the race; (2) `isUniquePickConflict()` cannot false-positive, since `Pick` has exactly one
  unique constraint (`@@unique([gameId, pickType])`) per the live Prisma schema; (3) the sidecar gate skips
  exactly the two immutable-mint blocks and nothing else (traced to end of loop body), and the common
  first-create case still mints normally; (4) `take: 240` stays index-served (`Odds` has `@@index([gameId,
  fetchedAt])`), not a performance regression; (8) no other settlement-terminality/CLV-sign/write-once semantics
  silently changed elsewhere in the diffed files. The review ran out of time before checking points 5-7 and 9 —
  resolved directly rather than re-dispatching: (5) the live refresh cadence is `REFRESH_INTERVAL_MS = 30min`
  (`workers/data-refresh/src/index.ts`), 12x smaller than the new 6h cutoff, so a healthy feed never trips it —
  the existing 24h `quietBoardHorizonHours` governs a different pipeline stage (pre-kickoff fetch scheduling)
  and is not in tension with a post-hoc close-staleness guard; (6) `grep -rn deriveClosingSnapshotFromOdds`
  found exactly one production caller (`settle-sport.ts`; the one other hit, in
  `apps/web/lib/performance/clv-coverage.ts`, is prose in an operator remediation message, not a call site);
  (7) the new regression tests are non-vacuous — each asserts a specific behavioral outcome tied to the exact
  race/boundary condition, not a mock-shape re-assertion; (9) already run directly (see Evidence).
- Evidence: `npx vitest run` — `process-sport.test.ts` + `settle-sport.test.ts` 44/44 (was 42 before the 2 new
  tests); full `packages/ingestion-pipeline` suite 127/127 (was 125); `clv-capture.test.ts` 13/13 (was 10);
  full `packages/prediction-engine` suite 1462/1462 (was 1459); root `npm run typecheck` exit 0 across every
  workspace including `apps/web`; `git diff --check` clean; `secret-scan.mjs` (explicit paths, not directory
  mode) clean on all 5 changed files; `npm run guardrails` 17/17 green.
- Alternatives rejected: blind-patching the historical branch's diff via `git apply`/cherry-pick — rejected for
  `clv-capture.ts` specifically because the function signature and surrounding logic had genuinely drifted
  (would produce a corrupted merge or silently drop the #79/#83/#91-derived `averageAmericanPrices`/
  `selectionIsHomeSide` logic); bundling all 6 R0.6 live-defect fixes into one pass — rejected per DEC-034's
  own "one bounded recovery wave at a time" ruling.
- Reversibility: the `updateMany`/`create`-with-catch pattern is strictly behavior-narrowing (never writes more
  than the old unconditional upsert did, only refuses to write in the race case); revert commit if any
  regression surfaces. Never merged to `main` — this branch's PRs stay founder-merge-only per every standing
  directive.
- Protected zones: settlement, CLV — red-teamed per the repo's own protected-money-truth doctrine (exact
  invariant stated before editing; behavior compared against the base SHA via direct diff, not prose memory;
  no settlement terminality, CLV sign/close derivation, or write-once field semantics silently changed).
- Files: `packages/ingestion-pipeline/src/process-sport.ts`, `packages/ingestion-pipeline/src/settle-sport.ts`,
  `packages/ingestion-pipeline/src/__tests__/process-sport.test.ts`,
  `packages/prediction-engine/src/clv-capture.ts`,
  `packages/prediction-engine/src/__tests__/clv-capture.test.ts` (all modified).
- Supersedes: none. Closes R0.6 item 1 of 6; items 2-6 (#82, #93/converges-with-#123, #86, #84, #89) remain
  future bounded waves per `RECOVERY_WAVES.md`.

## DEC-036 — Recovery Wave R0.6.2: production DB fail-closed + honest health check (2026-07-18)

- Date: 2026-07-18
- Workstream: Recovery Wave R0.6, item 2 of 6. Ports historical PR #82 (`claude/hotfix-prod-db-fail-closed`,
  never merged, confirmed still-live via R0.5) forward onto the CURRENT `main` tip. Contract frozen before
  coding: `packages/db/src/index.ts`'s `buildClient()` and `apps/web/app/api/health/route.ts` were confirmed
  byte-identical between the historical merge-base and current `main` (safe direct application); `isStubMode()`
  was already exported on current `main` (pre-existing, unrelated to this fix) so no new export was needed.
- Decision: implemented two changes —
  1. `packages/db/src/index.ts`: when the stub Prisma client would activate, a new guard now throws BEFORE
     falling through to the stub if `VERCEL_ENV==="production"` or `PRODUCTION_RUNTIME==="true"` — deliberately
     NOT `NODE_ENV`, since that is `"production"` during every `next build` including CI/local builds that
     legitimately have no database. An explicit escape hatch (`ALLOW_STUB_DB_IN_PRODUCTION=true`) stays
     available for a deliberate no-database demo deployment. The pre-existing `console.error`-and-continue
     fallback (for `NODE_ENV==="production"` contexts without either new signal — CI builds, self-hosted
     runners not yet declaring the signal) is left unchanged after the new throw check.
  2. `apps/web/app/api/health/route.ts`: the database check now branches on the pre-existing `isStubMode()`
     export — stub mode reports `status:"error"` with an honest "no database configured" detail (a static
     string, no connection-string leak) instead of the stub's vacuous `$queryRaw` pass reporting `ok`.
  Companion infrastructure declarations ported so the guard actually trips in the self-hosted deployment path
  (Vercel's `VERCEL_ENV` alone doesn't cover it): all three `workers/*/Dockerfile` gained
  `ENV PRODUCTION_RUNTIME=true`; `docker/oracle-vps/compose.yml` gained the same declaration on all three
  worker services' `environment:` blocks. `packages/db/package.json` gained a `test`/`test:watch` script +
  `vitest` devDependency (the package had no test runner wired at all before this).
  New test file `packages/db/src/__tests__/prod-fail-closed.test.ts` (10 tests) — exercises the full
  throw/no-throw matrix across `VERCEL_ENV`/`PRODUCTION_RUNTIME`/`ALLOW_STUB_DB_IN_PRODUCTION`/a real
  `DATABASE_URL`, plus a source-scan sub-suite that greps the three Dockerfiles + compose.yml to confirm they
  actually declare the signal ("the guard is only as good as the declaration"). `apps/web/__tests__/health-route.test.ts`
  gained one new test for the honest stub-mode 503.
- Independent review: one `gse-red-team` pass (stalled mid-investigation once, resumed via the session's
  standing agent-stall protocol). CONFIRMED clean on 5 of 9 points via direct code/schema inspection: (1) the
  throw is unreachable unless `isStubDbUrl(url)` is already true, and that function cannot misclassify a real
  `postgres://` URL; (4) `isStubMode()`/throw state stay consistent — the stub-mode global is only set AFTER the
  throw check, so a real-DB path never sets it; (5) the health-route error detail is a static string with no
  connection-string leak; (8) zero settlement/CLV/billing files touched. The review also surfaced a genuinely
  important, unprompted discovery: `buildClient()` runs at module top level, so on Vercel this guard can fail
  the production BUILD itself (not just a runtime request) when DB env vars are runtime-only-scoped — traced to
  be an intentional, precedented design choice (the historical commit's own message cites parity with the
  fail-closed migration gate from PR #72), not a regression.
  The review ran out of time on points 2 (Vercel env semantics, partially verified — internally consistent but
  not cross-checked against Vercel's own docs, no browsing tool available to the reviewer), 3 (escape-hatch
  default-on check), 6 (Dockerfile/compose.yml exact placement), 7 (test order-independence), and did not run
  the test suites (point 9) — all four resolved directly rather than re-dispatching: (3) `grep -rn
  ALLOW_STUB_DB_IN_PRODUCTION` across the full repo found matches ONLY in the fix's own two files (`index.ts`,
  `prod-fail-closed.test.ts`) — no stray default anywhere; (6) read the three Dockerfiles' final content
  directly (the `ENV` line sits immediately before `CMD`, nothing overrides it after) and parsed
  `compose.yml` with a real YAML parser confirming all three worker services set `PRODUCTION_RUNTIME: "true"`;
  (7) ran `prod-fail-closed.test.ts` twice independently, 10/10 both times, no order-dependence; (9) already run
  directly (see Evidence).
  **A genuinely important unprompted finding, independently re-verified**: `git show 3c8df41e` confirmed a
  THIRD, FOUNDER-AUTHORED fix attempt for this exact defect exists on a separate, unmerged branch lineage
  (`codex/gse-frontier-recovery-2026-07-13`/`review-recovery`/`verify-lens`, commit `3c8df41e`, author Garrett
  Baxley, 2026-07-14) — a simpler `NODE_ENV==="production"` throw with no `VERCEL_ENV`/`PRODUCTION_RUNTIME`
  distinction, which would break every `next build` (including CI/local builds without a database) — exactly
  the failure mode this fix's more careful gate was designed to avoid. NOT overridden, judged, or silently
  discarded: recorded as `COLLISION-7a`/`COLLISION-7b` in `FILE_SYMBOL_OWNERSHIP.csv` so a future reconciliation
  wave recovering that branch lineage doesn't silently regress this fix by picking up the founder's own simpler
  but build-breaking variant without review.
- Evidence: `npx vitest run` — `packages/db` full suite 23/23 (13 pre-existing `is-stub-db-url.test.ts` + 10 new,
  was 13 before); `apps/web` `health-route.test.ts` 10/10 (was 9); root `npm run typecheck` exit 0 across every
  workspace; `git diff --check` clean; `secret-scan.mjs` (explicit paths) clean on all 10 changed/new files;
  `npm run guardrails` 17/17 green; `git merge-base --is-ancestor 3c8df41e origin/main` confirmed NOT an
  ancestor (the divergent variant is genuinely unmerged, not already superseding this fix).
- Alternatives rejected: silently picking a "winner" between this fix and the founder's own `3c8df41e` variant
  — rejected; that is a founder decision (whose own commit it partly is), not an agent's to make unilaterally.
  Adding the `3c8df41e` NODE_ENV-based logic as a second, redundant guard "to be safe" — rejected as it would
  reintroduce the exact build-breaking failure mode this fix avoids.
- Reversibility: the throw is a strict behavior addition (crashes loudly instead of silently degrading) gated
  behind an explicit escape hatch; revert commit if any regression surfaces (e.g., a real Vercel deployment
  whose DB env vars are runtime-only-scoped and now fails to build — flagged as a known, intentional tradeoff
  above, not a bug, but worth founder awareness). Never merged to `main` — founder-merge-only per every standing
  directive.
- Protected zones: production integrity, observability — red-teamed. No settlement/CLV/billing/entitlement
  logic touched.
- Minor aside (not fixed, out of scope for this item): `FILE_SYMBOL_OWNERSHIP.csv` has pre-existing unescaped-
  comma quoting issues in 5 rows predating this session's edit (rows for COLLISION-2d/3d/4c/5b/6c) that make the
  file not strictly CSV-parser-clean, though human-readable. Noted for a future documentation-hygiene pass, not
  fixed here to stay scoped to the production-DB recovery item.
- Files: `packages/db/src/index.ts`, `apps/web/app/api/health/route.ts`, `packages/db/package.json`,
  `packages/db/src/__tests__/prod-fail-closed.test.ts` (new), `apps/web/__tests__/health-route.test.ts`,
  `workers/{data-refresh,pick-generation,content-publishing}/Dockerfile`, `docker/oracle-vps/compose.yml`,
  `package-lock.json`, `reports/reconciliation/FILE_SYMBOL_OWNERSHIP.csv` (all modified/new).
- Supersedes: none. Closes R0.6 item 2 of 6; items 3-6 (#93/converges-with-#123, #86, #84, #89) remain future
  bounded waves.

## DEC-037 — Recovery Wave R0.6.3: cockpit per-page ADMIN defense-in-depth (2026-07-18)

- Date: 2026-07-18
- Workstream: Recovery Wave R0.6, item 3 of 6. Ports historical PR #123 (`claude/cockpit-page-auth-rebased`,
  never merged, confirmed still-live via R0.5) forward onto the CURRENT `main` tip. This item converges with
  the seed's own Wave R1 (both target the same #93/#123 gap) — treated as one unit, not two.
- Contract frozen before coding: the historical branch was based on an OLDER main tip (`e9fab35`, PR #118)
  than current `main` (`0e56c477`, PR #119). Diffed all 32 target `page.tsx` files + `require-admin.ts` between
  that old base and current `main` before touching anything: only ONE file
  (`apps/web/app/cockpit/page.tsx`, the root cockpit page) had drifted, and that drift (an unrelated
  memory-write-path status display deep in a `MemoryProtocolZone` helper) doesn't overlap with this fix's
  insertion point (import + first line of the component). A second historical file
  (`packages/prediction-engine/.../source-rights-registry-fixtures.ts`) was confirmed via direct grep to
  already be on `main` via an unrelated, already-superseded lineage — deliberately excluded from this port,
  not an accidental omission.
- Decision: applied the historical diff via `git apply` (verified `--check` clean first) for the in-scope
  files only. New `apps/web/lib/cockpit/require-admin.ts` exports `requireCockpitAdmin()`: unauthenticated →
  redirect to sign-in; authenticated non-admin → redirect to `/`; admin → no-op. All 32
  `apps/web/app/cockpit/**/page.tsx` files now call `await requireCockpitAdmin();` as the first statement in
  their exported page component (several needed a non-async→async conversion to support the `await`).
  New source-scan test `apps/web/__tests__/cockpit-page-auth.test.ts` (36 tests) recursively walks the cockpit
  page tree and asserts every discovered `page.tsx` both imports and calls the guard — so a future cockpit page
  that forgets it fails CI automatically, not on review hope — plus 3 unit tests pinning the helper's own
  redirect behavior. `apps/web/package.json` updated to include the new test in both `test:cockpit` and
  `test:brand-safety` aggregate scripts.
- Independent review: one `gse-red-team` pass (went idle without a stall notification this time — a variant
  of the session's standing agent-stall protocol; resumed via a direct `SendMessage` using the already-known
  agentId rather than waiting on a notification that hadn't fired). **Zero CONFIRMED findings across all 9
  review points**, each backed by direct evidence: (1) spot-checked 10+ of the 32 pages (including every
  non-async→async conversion and every dynamic-route page) — `await requireCockpitAdmin();` is genuinely the
  first statement before any data fetch in every case; found one harmless belt-and-suspenders redundant inline
  check in `film-room/page.tsx`, not a defect. (2) The layout's own documented `ERR_TOO_MANY_REDIRECTS`
  incident was specifically about redirecting to `/auth/signin` (which bounces signed-in users back via
  `callbackUrl`); `require-admin.ts`'s `redirect("/")` for a signed-in non-admin has no such loop path — `/`
  itself contains no redirect logic. Disproven as a concern, not a bug. (3) `auth()` never throws (wraps its
  real implementation in try/catch, returns `null` on any failure — fails closed); confirmed no `try/catch`
  anywhere wraps the guard call site across all 32 files. (4) `apps/web/app/api/cockpit/**` (~20 route handlers)
  is a genuinely separate, unaudited surface — correctly out of scope for this page-level fix, flagged as the
  next logical hardening item rather than a silent gap this PR claims to close. (5) The root page's
  drift-merged content renders well after the guard, no shadowing or leak-before-check. (6) the excluded
  fixtures-file decision independently re-confirmed correct. (7) the source-scan test's `it.each` genuinely
  generates one real per-file assertion at collection time (not a loophole); the loose `>=30` sanity floor is
  correctly scoped as a catastrophic-failure backstop, not a substitute for the per-file checks. (8) scope
  confined to exactly the described files. (9) all test/typecheck commands re-run directly and green.
- Evidence: `npx vitest run __tests__/cockpit-page-auth.test.ts` 36/36; `npm run test:cockpit` 24 files/279
  tests (was 279 per PR #123's own original body — reconfirmed, not regressed); `npm run test:brand-safety` 20
  files/3053 tests; full `apps/web` suite run once whole (before the red-team pass, as its own gate): 634 files
  / 8,592 tests, all green (was 633/8,551 pre-fix — the delta reconciles to the 36 new cockpit-page-auth tests
  plus 5 other tests from concurrent DEC-035/036 work already landed this session); `npx tsc --noEmit` clean;
  `git diff --check` clean; `secret-scan.mjs` (explicit paths) clean.
- Alternatives rejected: re-deriving all 32 page insertions by hand instead of a verified `git apply` — rejected
  as needless risk/effort once drift analysis proved the patch would apply cleanly; the manual-verification
  effort went into confirming the ONE drifted file and the TWO ancillary files' status instead. Porting the
  excluded fixtures-file change "to be safe" — rejected once direct grep proved it already on main via a
  different, already-superseded lineage (re-adding it would risk a duplicate/conflicting entry).
- Reversibility: strictly additive defense-in-depth (adds a redirect-before-render check; never removes or
  weakens the existing layout-level check). Revert commit if any regression surfaces. Never merged to `main` —
  founder-merge-only, tracked by the existing accounting PR #129 (converges with founder-owned PR #123's own
  eventual disposition per `RECOVERY_WAVES.md`'s Group F entry).
- Protected zones: entitlements, auth — red-teamed. Zero settlement/CLV/billing/pricing logic touched.
- Files: `apps/web/lib/cockpit/require-admin.ts` (new), `apps/web/__tests__/cockpit-page-auth.test.ts` (new),
  `apps/web/package.json`, all 32 `apps/web/app/cockpit/**/page.tsx` files (all modified).
- Supersedes: none. Closes R0.6 item 3 of 6 (converges with the seed's Wave R1). Items 4-6 (#86, #84, #89)
  remain future bounded waves — #86 already thoroughly scoped this session (a substantial `settle-sport.ts`
  refactor extracting a shared `settleCompletedGame()` function plus a new catch-up HEAL/VOID sweep; must be
  manually reconciled with this session's own DEC-035 `take:240` fix in the same function, not blind-applied).

## DEC-038 — Recovery Wave R0.6.4: picks-stuck-PENDING-forever catch-up sweep (2026-07-18)

- Date: 2026-07-18
- Workstream: Recovery Wave R0.6, item 4 of 6. Ports historical PR #86's `settle-sport.ts` catch-up sweep onto
  CURRENT `main` (via `pdcswh`). Was: a game that goes `FINAL` with recorded scores but whose picks the live
  scores-feed loop never revisits (a missed poll window, a feed hiccup on the one cycle that mattered) leaves
  those picks `PENDING` forever — no other code path ever re-checks them. Same defect class for a
  cancelled/postponed/no-data game: its picks are also permanently `PENDING` with zero path to a terminal
  state. Both silently corrupt the public "settled" population (an eligible pick that never resolves is
  invisible to every win-rate/ROI/calibration computation, understating `n` without anyone knowing).
- Contract frozen before coding: the historical branch forked BEFORE two independently-landed changes on
  `pdcswh`'s current tip — (a) this session's own DEC-035 fix inside the same function (`take:80`→`take:240`
  on the closing-odds query), and (b) an unrelated, earlier-landed `main` change making `awayTeamName` a
  REQUIRED 8th positional argument to both `calculatePickResult()` and `gradePickClv()`
  (`packages/prediction-engine/src/settlement.ts`). Confirmed via `git diff <merge-base> origin/main` and a
  direct grep of the current function signatures — the historical file's own extracted logic still had
  `take:80` and omitted `awayTeamName` at both call sites. Blind `git apply` would have either failed outright
  or silently reintroduced the take:80 regression and a typecheck failure. Decision: manually rewrote
  `packages/ingestion-pipeline/src/settle-sport.ts` in full (via `Write`, not `git apply`), combining the
  historical branch's new structure (shared `settleCompletedGame()` extraction + `catchUpSweep()`) with both
  required corrections already-live on `pdcswh`.
- Code: `settleCompletedGame(ctx, game, homeScore, awayScore)` extracted from the live scores-feed loop's inline
  settlement body so the feed loop AND the new sweep share identical grading logic — "the same no-drift rule
  this module exists to enforce between worker and cron," now also enforced between live and catch-up paths.
  `catchUpSweep(ctx)` runs two independent arms, unconditionally, after the feed pass (in a try/catch that
  captures but does not re-throw `feedError`, so an API outage never blocks the sweep — the sweep is DB-only
  and must keep healing even when the feed can't be reached): **HEAL** — any `FINAL` game with both scores
  recorded that still has `PENDING` picks (no age cutoff; this is always an anomaly, however old) gets settled
  via the same `settleCompletedGame()`. **VOID** — any pick whose game passed `commenceTime + 72h`
  (`VOID_STALE_HOURS`) with no gradeable `FINAL`+both-scores outcome gets terminally closed via an atomic
  `db.pick.updateMany({where:{id, result:"PENDING"}, data:{result:"VOID", settledAt}})` — mirrors sportsbook
  "no action" grading convention, matches `SCORES_DAYS_FROM=3`'s own 72h lookback horizon. `settleSport()`
  returns `picksVoided` alongside the existing counts; `status:"failed"` (when the feed pass threw) still
  reports honest sweep-derived counts rather than zeroing them.
- Ripple-effect self-initiated audit: since this fix makes VOID a live, frequently-reached terminal state for
  the first time (previously theoretical), any other code that counts/filters settled picks without excluding
  VOID is now a live risk of inflating a public claim. Read all 16 repo-wide matches on `SettledResult`/`VOID`
  personally plus via a dispatched `gse-red-team` pass; both converged on the same 14-of-16 clean / 2 needing
  follow-up split. The two follow-ups were resolved directly this session (see below), leaving zero open items.
- Independent review: one `gse-red-team` pass (again went idle without a stall notification — resumed via
  direct `SendMessage` on the known `agentId`). **Zero CONFIRMED findings across all 7 settlement-correctness
  review points**: (1) the take:240/awayTeamName manual reconciliation is byte-correct — only one `take:` in
  the file, `awayTeamName` threaded at both call sites, extracted logic identical to what DEC-035 already
  established on HEAD. (2) double-settle safety across a feed+heal collision in one run is structurally safe
  (heal's query only sees rows still `PENDING` after the feed loop's sequential `await` completes) and
  race-safe under concurrent invocations (`updateMany` scoped to `PENDING`, `count===0`→no-op). (3) the VOID
  arm's Prisma `NOT:{status:"FINAL",homeScore:{not:null},awayScore:{not:null}}` correctly excludes only rows
  where all three are simultaneously true (standard implicit-AND-within-one-object semantics), matching the
  "no gradeable outcome" comment. (4) 72h VOID horizon vs. `SCORES_DAYS_FROM=3` has one immaterial theoretical
  edge (anchored to `commenceTime` vs. the feed's own lookback anchored to completion time) that only matters
  for a game already anomalous through the entire ~69h pre-horizon window — no exploitable gap for a normally-
  progressing game. (5) postponed/rescheduled games self-correct because `commenceTime` is read live from the
  DB on every sweep invocation, never cached. (6) VOID is genuinely terminal — every query in the module scopes
  to `result:"PENDING"`, so a VOID row structurally can never be re-graded by a late-arriving score. (7)
  `gamesHealed`/`picksSettled`/`picksVoided` counters sit outside the try/catch, so a mid-loop failure still
  returns accurate partial counts, never a silent reset or double-count.
- Follow-ups resolved directly (all three touched neither settlement correctness nor a public claim):
  1. **Watchlist alert wording (red-team's unresolved #7)** — read `apps/web/lib/watchlist/alert-dispatch.ts`
     in full. Moot: `dispatchWatchlistAlert` is gated behind `WATCHLIST_ALERTS_ENABLED` (default off), has zero
     SMTP/push client wired anywhere in the repo, and unconditionally returns
     `{sent:false, outcome:"no_channel_wired"}` for every eligible case today with a `TODO(founder)` marking
     the real integration point. No message — VOID-worded or otherwise — is ever actually dispatched to
     anyone. No fix needed.
  2. **Calibration replay-provenance route auth (red-team's unresolved #14)** — read
     `apps/web/app/api/calibration/replay-provenance/route.ts` and `lib/calibration/replayable-provenance.ts`
     in full. The route is unauthenticated but calls `buildReplayableProvenanceFeed([], new Date(), {enabled})`
     with a **hardcoded empty array literal** — no real settled-pick data has ever been wired into this
     endpoint. It can only ever report `chain.valid` on zero events and `status: enabled ? "SHADOW_READY" :
     "FLAGGED_OFF"`, both already-public flag-state facts, plus a static "draftOnly" note. Same
     flagged-off-but-reachable doctrine as `OTS_ANCHOR_ENABLED`/`LINE_ARCHIVE_ENABLED` elsewhere in the
     codebase: safe to leave publicly reachable while inert. Adding ADMIN gating would be unrelated scope
     creep for this recovery item, not a fix to anything this PR touches. No live risk; no fix needed.
  3. **`apps/web/lib/brief/compose.ts` display arithmetic (red-team's #12, confirmed real but low-severity)** —
     `composeBrief`'s settlement summary computed `wins`/`losses`/`pushes` but not `voids`, so
     `Settled ${settled.length}: ${wins}W-${losses}L-${pushes}P` silently didn't reconcile once `settled`
     started containing VOID rows in volume (which this exact fix causes, for the first time, on the one
     caller — the ADMIN-gated `/cockpit/brief` page). Fixed: added a `voids` count and a conditional `-${voids}V
     (no action)` term so the leading total always reconciles with the breakdown; omitted entirely when zero
     (matches the existing `pushes` idiom). Two new tests added to `apps/web/__tests__/brief-compose.test.ts`
     (`M-F10`: 3-row fixture with 1 VOID asserts the exact reconciled string; a zero-VOID fixture asserts the
     `V` term is omitted). Internal-only (admin-gated), never reached a customer or a public claim before or
     after this fix — fixed anyway per "no silent scope-shrink," since it was directly caused by this exact
     change and was small and contained.
- Evidence: `cd packages/ingestion-pipeline && npx vitest run src/__tests__/settle-sport.test.ts` → 29/29
  (18 pre-existing + 11 new `describe("catch-up sweep (M-F9)")` tests); `cd apps/web && npx vitest run
  __tests__/brief-compose.test.ts` → 3/3 (1 pre-existing + 2 new); full workspace `npm run typecheck` → clean,
  every workspace (`@sports/web`, `@sports/db`, `@sports/ingestion-pipeline`, `@sports/prediction-engine`, all
  four workers, etc.); `npm run guardrails` → 17/17 green; full `apps/web` suite → 634 files / 8,595 tests, all
  green (was 634/8,592 pre-fix — the +3 delta reconciles exactly to the 2 new `brief-compose.test.ts` tests plus
  a net +1 from the ancillary `public-roi-policy.test.ts` patch, which strengthens `unitsForPick("VOID", ...)`
  from a lone assertion folded into another test to its own dedicated 3-assertion test asserting `null` — not
  `0` — for every VOID price combination, i.e. VOID is fully excluded from the graded ROI sample, not merely
  zeroed); `git diff --check` clean; `secret-scan.mjs` (explicit paths, all 10 changed files) clean.
- Ancillary files ported alongside the core fix (each independently confirmed by both my own read and the
  red-team's triage as correctly treating VOID as "no action," never a graded outcome):
  `apps/web/app/api/cron/settle-picks/route.ts` (surfaces `picksVoided` in the per-sport and aggregate JSON
  response), `apps/web/lib/bot-outbox/plan.ts` + `records.ts` (blocks VOID from ever generating a public
  settlement post — `blockedSettlementReason` returns `"voided-no-action"`; `planSettlementOutbox` throws if a
  VOID somehow reaches render), `apps/web/lib/engine/load-engine-story.ts` (narrows a `result:{in:[...]}`
  filter from `[WIN,LOSS,PUSH,VOID]` to `[WIN,LOSS,PUSH]` — VOID is "no action," not a settled record entry),
  `apps/web/lib/performance/public-roi-policy.ts` + its test (VOID → `null`, excluded from the graded ROI
  sample entirely, never a 0).
- Alternatives rejected: blind `git apply` of the historical diff — rejected outright once the drift analysis
  (above) proved it would either fail or reintroduce a fixed bug and a type error. Excluding VOID from the
  `/cockpit/brief` query instead of fixing the display string — rejected because the admin morning brief
  legitimately wants VOID visibility (an operator should see the sweep is voiding stale picks); the honest fix
  is to count it correctly, not to hide it. Deferring the `brief/compose.ts` fix as a named follow-up instead
  of fixing now — rejected because the change was small, contained to one file plus its test, low-risk, and
  directly caused by this exact PR (deferring a self-caused, already-diagnosed, cheap fix would be scope-
  shrink without a real reason).
- Reversibility: revert commit if any regression surfaces. Never merged to `main` — founder-merge-only, tracked
  by the existing accounting PR #129.
- Protected zones: settlement, CLV, data integrity, public claims — mandatory red-team (completed, zero
  findings across all 7 core points plus the 16-file ripple audit).
- Files: `packages/ingestion-pipeline/src/settle-sport.ts` (rewritten),
  `packages/ingestion-pipeline/src/__tests__/settle-sport.test.ts`,
  `apps/web/app/api/cron/settle-picks/route.ts`, `apps/web/lib/bot-outbox/plan.ts`,
  `apps/web/lib/bot-outbox/records.ts`, `apps/web/lib/engine/load-engine-story.ts`,
  `apps/web/lib/performance/public-roi-policy.ts`, `apps/web/__tests__/public-roi-policy.test.ts`,
  `apps/web/lib/brief/compose.ts` (this session's own follow-up fix),
  `apps/web/__tests__/brief-compose.test.ts` (this session's own follow-up fix).
- Supersedes: none. Closes R0.6 item 4 of 6. Item 5 (#84, orphaned CLV grades) must be sequenced after this one
  — it also touches `settle-sport.ts`'s settlement path and should be contracted against the file state this
  entry just established, not the historical PR's stale base. Item 6 (#89) remains blocked on #87's
  `outage-gate.ts`, not yet itself recovered.

## DEC-039 — Recovery Wave R0.6.5: orphaned CLV grades heal (M-F4) (2026-07-18)

- Date: 2026-07-18
- Workstream: Recovery Wave R0.6, item 5 of 6. Ports historical PR #84's "grade-once + orphan CLV heal" fix
  onto CURRENT `settle-sport.ts` (as DEC-038 just left it, commit `d160cf92`) — sequenced after item 4 per
  DEC-038's own note, since both touch the same settlement path. Was: settlement writes the pick result, then
  grades CLV, then records a snapshot, in that order; a crash (or a race loss where the *winner* then
  crashed) between the result write and the CLV write leaves a pick with `result` in `WIN`/`LOSS`/`PUSH` but
  `clvGradedAt: null` forever — no query anywhere in the module ever re-reads a non-`PENDING` pick, so that
  grade (the input to the public beat-close rate and the ESTABLISHED pricing-phase gate) is silently and
  permanently lost the moment the pick's game ages out of the 3-day scores-feed lookback window.
- Contract frozen before coding: historical PR #84 (branch `claude/hotfix-clv-regrade-orphans`, base `main`
  `821d0ca3`) threaded orphan-detection into the LIVE FEED loop's own `db.game.findUnique` query (an `OR`
  between `result:"PENDING"` and `result IN (WIN,LOSS,PUSH) AND clvGradedAt IS NULL`), and its CLV write was
  still the pre-#92 unconditional `db.pick.update`, not the atomic `updateMany` DEC-035 later established for
  the settle write. Direct diff against CURRENT main/`pdcswh` confirmed both premises are stale: (1) the live
  feed's per-game query only ever sees games The Odds API CURRENTLY reports — an orphan whose game aged out of
  the 3-day lookback (exactly the population most likely to need healing, since it's had the longest to crash)
  could NEVER be reached by the historical design; (2) DEC-038 already introduced a feed-independent
  `catchUpSweep()` with HEAL/VOID arms for the symmetric stuck-PENDING problem. Decision: did not blind-port
  the historical diff. Re-derived the fix's INTENT (heal orphaned CLV grades, never re-run settlement math)
  against the CURRENT architecture: added a third feed-independent arm "(c) CLV-HEAL" inside `catchUpSweep()`,
  removing the exact same blind spot #86/DEC-038 already removed for stuck-PENDING picks, rather than
  reintroducing a narrower, feed-coupled version of the same class of bug this session already fixed once.
- Code: extracted `fetchClosingSnapshot(game, logPrefix)` and `gradeAndRecordClv(game, pick, closingSnapshot,
  gradedAt, logPrefix)` from `settleCompletedGame`'s previously-inline CLV block (pure refactor for the fetch;
  the write itself changed from unconditional `db.pick.update({where:{id}, ...})` to conditional
  `db.pick.updateMany({where:{id, clvGradedAt:null}, ...})`, returning whether a row was actually written —
  "grade-once," mirroring the existing "settle-once" `updateMany` pattern, so a concurrent grader — the live
  path, the FINAL-heal arm, or a later orphan re-run all racing the same pick — can never overwrite an
  existing verdict with a grade against a second, different close). New `healOrphanedClvGrades(ctx)`: queries
  `db.pick.findMany({where:{result:{in:["WIN","LOSS","PUSH"]}, clvGradedAt:null, game:{sport:{key}}},
  include:{game:true}})`, groups by `gameId` (one closing-odds fetch per game, not per pick), and for each
  orphan calls `gradeAndRecordClv` — `calculatePickResult` is never called, the recorded `result` is never
  re-derived — plus defensively re-invokes the already-idempotent `recordPickSettlementSnapshot` in case that
  write was orphaned by the same crash. Wired in as arm (c), sequential after (a) HEAL and (b) VOID inside the
  existing try block, so a mid-arm throw still preserves whatever (a)/(b) already accumulated (same pattern
  DEC-038 established). `SettleSportResult`/`catchUpSweep`'s return type gained `clvGradesHealed: number`,
  threaded through both of `settleSport()`'s return paths and `/api/cron/settle-picks`'s per-sport + aggregate
  JSON response.
- No consumer-side ripple audit required, unlike DEC-038's #86: this fix introduces no new/newly-reachable
  enum state — it only fills in previously-null `clvGradedAt`/`clvVerdict`/etc. on picks that were already
  `WIN`/`LOSS`/`PUSH`. Spot-checked (myself and independently by the red-team) that `apps/web/lib/performance/
  clv-coverage.ts` and `public-clv-policy.ts` both already treat `clvVerdict: {not: null}` as the eligibility
  signal — they will honestly see a larger, previously-lost sample after this fix, never a differently-defined
  one. `apps/web/lib/tracker/clv.ts` is an unrelated client-side personal bet-ledger (operates on user-entered
  objects, not DB picks) — not a consumer.
- Independent review: one `gse-red-team` pass, which stalled mid-investigation without a final synthesis after
  its 9th of 11 review points (a variant of this session's established agent-stall protocol — resumed via a
  direct `SendMessage` on the known `agentId` with an explicit "stop investigating, write the synthesis now,
  text only" directive). **Zero CONFIRMED findings across all 9 code-correctness review points**: (1)
  grade-once write confirmed via direct grep — zero remaining `db.pick.update(` singular calls in the file.
  (2) confirmed `calculatePickResult` has exactly one call site (inside `settleCompletedGame`, never inside
  `healOrphanedClvGrades`). (3) per-game grouping confirmed correct, and the dedicated test proven non-vacuous
  (would fail if the fetch moved inside the per-pick loop). (4) concurrent double-heal confirmed safe — the
  `updateMany`'s `clvGradedAt:null` scope means only one racer's write can ever match, and `clvGradesHealed`
  only increments on an actual write. (5) the defensive snapshot re-invocation confirmed a TRUE no-op for an
  already-recorded snapshot by direct read of `writeSettlementSnapshotOnce`'s early-return logic, never an
  overwrite. (6) the no-give-up-ever retry design for a permanently ungradeable orphan confirmed as an
  accepted, explicitly-commented, bounded-cost tradeoff (cheap scoped query, low volume), not a resource bug.
  (7) same-cycle interaction between arm (a) HEAL and arm (c) CLV-HEAL confirmed harmless either way (grade-
  once protects the write regardless of whether a pick settled by (a) is also matched by (c) later in the same
  sweep). (8) failure isolation confirmed — `clvGradesHealed` and its siblings are `let`-declared outside the
  try block, so a mid-arm-c throw preserves (a)/(b)'s already-accumulated counts (same verified pattern as
  DEC-038). (9) ripple check independently corroborated the same conclusion this session already reached (see
  above), also confirming `tracker/clv.ts` is unrelated. Points 10-11 (test execution, typecheck) were
  explicitly not re-run by the agent per the stop directive — already independently satisfied by my own
  direct execution both before dispatch and again after the review returned (see Evidence).
- Evidence: `cd packages/ingestion-pipeline && npx vitest run src/__tests__/settle-sport.test.ts` → 36/36 (29
  pre-existing + 7 new: one grade-once-race regression test in the existing "CLV grading" block, six in a new
  "CLV heal — orphaned grades (M-F4)" block — reads the dedicated query, grades without re-deriving settlement,
  re-records the snapshot defensively, groups by game, retries (never gives up) on an undrivable close, and
  runs even when the live feed fails); `cd packages/ingestion-pipeline && npx vitest run` (full package) →
  145/145 across 12 files; full workspace `npm run typecheck` → clean, every workspace, re-run twice (once
  before red-team dispatch, once after it returned — no interleaved edits, both clean); `npm run guardrails` →
  17/17 green; `git diff --check` clean; `secret-scan.mjs --all` clean (part of guardrails).
- Alternatives rejected: blind-porting the historical diff's feed-coupled orphan detection — rejected once the
  drift analysis (above) proved it would reintroduce the exact blind-spot class DEC-038 already eliminated for
  stuck-PENDING picks, for old orphans specifically (the population most in need of healing). Keeping the
  historical PR's unconditional `db.pick.update` CLV write — rejected as a known race (the PR's own body names
  this as part of M-F4's fix, "grade-once now mirrors settle-once"); ported the stronger, already-established
  `updateMany`-scoped pattern instead of the historical file's own version of it.
- Reversibility: strictly additive (new arm, conditional write replacing an unconditional one — the condition
  can only ever REJECT a write the old code would have accepted, never accept one it would have rejected).
  Revert commit if any regression surfaces. Never merged to `main` — founder-merge-only, tracked by the
  existing accounting PR #129.
- Protected zones: settlement, CLV, public claims (beat-close rate, ESTABLISHED pricing-phase gate eligibility)
  — mandatory red-team (completed, zero findings).
- Files: `packages/ingestion-pipeline/src/settle-sport.ts`,
  `packages/ingestion-pipeline/src/__tests__/settle-sport.test.ts`,
  `apps/web/app/api/cron/settle-picks/route.ts`.
- Supersedes: none. Closes R0.6 item 5 of 6. Item 6 (#89, `/api/promotions` outage masked as an empty
  response) remains blocked on #87's `outage-gate.ts`, which is not yet itself recovered — that dependency
  must be resolved first, or #89 re-scoped as its own freeze contract that includes recovering #87.

## DEC-040 — Recovery Wave R0.6, prerequisite for item 6: outage-state discriminator (#87, T-picks-outage) (2026-07-18)

- Date: 2026-07-18
- Workstream: Recovery Wave R0.6's final item (#89, `/api/promotions` outage masked as an empty response) is
  stacked on historical PR #87 ("uses its outage-gate module. Merge #87 first, then retarget/merge this." —
  #89's own body) — #87 was itself one of R0.5's 16 RECOVER_WHOLE findings, not one of the 6 named live-defect
  items, but a hard prerequisite. Recovers #87 as its own bounded item first.
- Was: `/api/picks` and `/api/clv` are public, unauthenticated routes. On a primary DB-read failure (a genuine
  backend outage), both caught the error and returned the SAME 503 body used for deliberate bootstrap/env
  gating (`bootstrapGateResponse`, `{bootstrapMode:true}`) — an outage dressed as intent. A monitor or
  on-call engineer reading "disabled in bootstrap mode" during a real outage checks environment flags instead
  of the database — the wrong runbook (mirrors a real 2026-07-10 incident that already produced the same fix
  for a separate "stale data" state, `staleDataGateResponse`).
- Contract frozen before coding: fetched historical PR #87 (branch `claude/hotfix-picks-outage-state`, base
  `main` `821d0ca3`). Diffed all 7 non-test target files between that base and current main:
  `apps/web/app/api/clv/route.ts`, `apps/web/app/api/picks/route.ts`, `scripts/prod-probe.mjs`,
  `docs/launch-runbook.md`, plus the 3 associated test files — **zero drift, byte-identical**. Only
  `apps/web/app/picks/page.tsx` had drifted (266 lines): main independently shipped a free-tier
  paywall/teaser feature (`totalAvailableToday`, `hitDailyLimit`, `dailyPickLimit`, `tier`, `lockedByPaywall`,
  `activeSportLabel`, `teaserSize`, an extended `PaywallBanner` signature) since #87 was authored — none of
  which existed when #87 was written, and whose own "Error state" JSX block #87's historical patch also
  touches. Decision: applied the 8 zero-drift files via a verified-clean `git apply` of the exact historical
  diff (`git diff 821d0ca3 d8e76090 -- <7 files>`, confirmed `--check` clean before applying); manually
  reconciled `page.tsx` by hand rather than attempting `git apply` on a 266-line-drifted file.
- Code: new `apps/web/lib/data-reliability/outage-gate.ts` exports `outageGateResponse(featureName)` →
  `{error, reason:"backend_outage", bootstrapMode:false, hint}` — a THIRD dark-state body, mutually
  distinguishable from `bootstrapGateResponse` (`bootstrapMode:true`, no `reason`) and `staleDataGateResponse`
  (`reason:"stale_data"`). `/api/clv` and `/api/picks` now return `outageGateResponse(...)` (not
  `bootstrapGateResponse`) specifically on the DB-read `.catch()` path; the deliberate readiness-gate check
  earlier in each handler is untouched, still returning the genuine bootstrap body. `scripts/prod-probe.mjs`
  gained a shared `classifyDarkState(status, json, {allowStale})` used by both `validatePublicPicksGate`
  (`allowStale:true` — the sole surface that emits `stale_data` today) and `validatePerformanceGate`
  (`allowStale` defaults false, so a misrouted `stale_data` body there correctly FAILS the probe rather than
  being silently accepted) — `backend_outage` fails BY NAME on either validator, never as a generic shape
  mismatch. `docs/launch-runbook.md` documents all three 503 discriminators.
- `page.tsx` manual reconciliation (the highest-risk part of this port): `PicksResponse.bootstrap.kind`
  extended from `"gated" | "stale"` to `"gated" | "stale" | "outage"`; `fetchPicks()`'s dark-state check
  extended to also admit `reason === "backend_outage"` (previously it fell through to
  `throw new Error(...)`, surfacing the literal string "Failed to fetch picks: 503" to customers — the exact
  gap #87 exists to close); the pre-existing bootstrapState empty-state JSX block (already branching on
  `kind === "stale"` vs the gated default, cyan-styled) gained a third amber-styled branch for
  `kind === "outage"` ("Temporary interruption" / "The board is temporarily unavailable." / reassuring body
  copy), woven in as a clean 3-way ternary across container/icon/headline/title/body — the two ALREADY-PRE-
  EXISTING free-tier-paywall states (`lockedByPaywall`, `PaywallBanner`) are untouched and remain correctly
  ordered. This is a DIFFERENT code path from the page's own pre-existing "Backend-outage state" block (fires
  on `fetchError`, i.e. the fetch itself threw — a network-level fault) — the two outage variants are
  mutually exclusive at render time (complementary on `fetchError`), never simultaneously visible, and
  intentionally worded distinctly from each other to avoid reading as a duplicate/confusing state to a future
  maintainer. One pre-existing, unrelated test (`picks-states-conversion.test.ts`, part of the already-shipped
  paywall feature) had its `between()` helper's end-marker updated from the now-absent exact string
  `"{/* Empty state */}"` to the prefix `"{/* Empty state — the three designed dark states"` — same source
  position, same underlying slice boundary, not a weakened assertion (re-confirmed: all 16 of that file's
  tests, including non-trivial content checks on the sliced block, still pass).
- Ripple check: grepped every consumer of `bootstrapGateResponse`/`staleDataGateResponse`/`bootstrapMode`
  across `apps/web`, `packages`, `scripts`, `workers` (independently, myself, before dispatching red-team, and
  again by the red-team itself). Four other routes (`/api/blog`, `/api/performance`, `/api/picks/[id]/audit`,
  `/api/picks/[id]/explain`) use `bootstrapGateResponse` — but ONLY for their own deliberate readiness-gate
  check at the top of the handler, never inside a DB-failure `.catch()`. The "DB failure reuses the bootstrap
  body" anti-pattern was specific to `/api/clv` and `/api/picks`; no other route silently carries the same
  live defect. These four routes DO still lack ANY dedicated outage-vs-gate distinction for their own DB
  reads (they simply have no `.catch()` fallback at all, so a DB failure there throws an unhandled 500 rather
  than dressing as bootstrap gating) — a DIFFERENT, narrower gap than T-picks-outage, not itself a live
  instance of this defect, out of scope for both #87 and #89 (#89's own 5-surface list is `/api/calibration`,
  `/api/picks/daily-slate`, `/api/promotions`, the game-room loader, the proof-of-record loader — none of
  these four). Recorded here for completeness, not fixed — no silent scope-shrink, but also no unrequested
  scope-growth beyond this freeze contract's boundary.
- Independent review: one `gse-red-team` pass, resumed twice via the standing agent-stall protocol (first
  stall: went idle right before its highest-risk check, point 5's `page.tsx` read; second stall: announced
  "now the final synthesis" but made one more tool call instead of writing it — a new variant of the
  established stall pattern, resolved with an explicit hard "no more tool calls" directive). **Zero CONFIRMED
  findings across all 9 review points and the reviewer's own 8-point adversarial protected-zone checklist**:
  three-state discriminator bodies confirmed genuinely non-overlapping by direct read of all three response
  builders; no stack-trace leak (curated static strings only, the caught error is discarded before the null
  check); route correctness confirmed (deliberate gating path untouched, only the DB-catch fallback changed);
  `classifyDarkState`'s `allowStale` scoping confirmed per-surface-correct by direct source read, not just the
  test's own assertions; the `page.tsx` reconciliation confirmed clean on all four sub-checks (mutual
  exclusivity of the two outage code paths verified by direct condition read, the 3-way ternary confirmed
  correct for all three `kind` values, the full four-block render-order chain confirmed exactly-one-renders by
  construction, and the "no picks were lost" copy claim confirmed accurate against the actual failure mode — a
  failed READ, never a write); the test-marker edit confirmed to preserve the same non-vacuous invariant, not
  weakened; the ripple check independently reproduced the same conclusion this session already reached.
  Non-vacuousness spot check performed by the reviewer itself: reverted the outage-catch line back to
  `bootstrapGateResponse`, re-ran `picks-outage-state.test.ts`, confirmed a real failure, then restored the
  file byte-identical.
- Evidence: `cd apps/web && npx vitest run __tests__/picks-outage-state.test.ts __tests__/api-clv-route.test.ts
  __tests__/prod-probe-script.test.ts __tests__/picks-states-conversion.test.ts` → 4 files / 41/41 passed (5 +
  4 + 16 + 16, per-file); full `apps/web` suite → 635 files / 8,604 tests, all green (was 634/8,595 pre-fix —
  the +9 delta reconciles to the 5 new `picks-outage-state.test.ts` tests plus 2 new in
  `prod-probe-script.test.ts` plus the reworded/net-unchanged-count `api-clv-route.test.ts` case plus 1 net
  addition elsewhere in the same run); `npx tsc --noEmit` clean (apps/web); full workspace `npm run typecheck`
  clean, every workspace; `npm run guardrails` → 17/17 green; `git diff --check` clean aside from pre-existing
  CRLF line endings in `apps/web/app/api/picks/route.ts` (confirmed via `git show HEAD` that the WHOLE file
  was already CRLF before this patch touched it — not introduced by this change, not a real defect); secret
  scan (part of guardrails) clean.
- Alternatives rejected: blind `git apply` of the full historical diff including `page.tsx` — rejected once
  the 266-line drift was confirmed; would have either failed outright or silently reverted the already-shipped
  paywall feature. Threading `kind==="outage"` styling as a wholly separate render branch instead of extending
  the existing gated/stale ternary — rejected as unnecessary duplication once the existing block's structure
  proved to already generalize cleanly to a third case. Reusing the pre-existing `fetchError` block's exact
  "Temporarily unavailable" copy for the new `kind==="outage"` branch — rejected in favor of distinct wording
  ("Temporary interruption") so two adjacent-but-different states never read as duplicated/confusing to a
  future maintainer, even though they can never render simultaneously.
- Reversibility: strictly additive (a new response body, a new probe classifier, extended page-state
  branching) — never removes or weakens deliberate bootstrap/stale gating. Revert commit if any regression
  surfaces. Never merged to `main` — founder-merge-only, tracked by the existing accounting PR #129.
- Protected zones: public customer-facing surfaces (frontend-trust doctrine — honest states, no fabricated
  claims), data reliability/observability — mandatory red-team (completed, zero findings).
- Files: `apps/web/lib/data-reliability/outage-gate.ts` (new), `apps/web/app/api/clv/route.ts`,
  `apps/web/app/api/picks/route.ts`, `apps/web/app/picks/page.tsx`, `scripts/prod-probe.mjs`,
  `docs/launch-runbook.md`, `apps/web/__tests__/picks-outage-state.test.ts` (new),
  `apps/web/__tests__/api-clv-route.test.ts`, `apps/web/__tests__/prod-probe-script.test.ts`,
  `apps/web/__tests__/picks-states-conversion.test.ts`.
- Supersedes: none. Unblocks R0.6 item 6 (#89) — its own freeze contract, code, tests, and red-team pass are
  the next bounded step, sequenced immediately after this one lands.

## DEC-041 — Recovery Wave R0.6, final item: T-outage-sweep (#89), closes Wave R0.6 (2026-07-18)

- Date: 2026-07-18
- Workstream: Recovery Wave R0.6, item 6 of 6 — the last live-defect item in the wave. Historical PR #89
  extends #87's `outage-gate.ts` fix to 5 more public surfaces the adversarial verify workflow on #87 found
  carrying the same "DB failure dressed as a healthy/deliberate state" anti-pattern: `/api/calibration`,
  `/api/picks/daily-slate`, `/api/promotions`, the game-room loader, and the proof-of-record loader.
- Contract frozen before coding — and re-frozen mid-way once the correct base was identified. Fetched
  historical PR #89 (branch `claude/hotfix-outage-sweep`, stacked on `claude/hotfix-picks-outage-state`
  `d8e76090` — #87's own head, not raw pre-#87 `main`). Initial drift check compared against `origin/main`;
  self-caught that this was the wrong target (`pdcswh` is a superset branch — this session's own W004/
  intelligence-playback work had independently rewritten `game-room/load.ts` far beyond what `origin/main`
  shows), re-ran every drift check against `HEAD` (current `pdcswh` tip) instead. Correct picture: 4 of 8
  non-test files were byte-identical to `d8e76090` (`calibration/route.ts`, `promotions/route.ts`,
  `calibration/report.ts`, `prod-probe.mjs` — the last of these confirmed identical to #87's own already-landed
  version too) — applied via a verified-clean `git apply`. Four files had drifted and were manually
  reconciled; one target (proof-of-record) turned out to already be fixed by an independently-landed,
  equally-honest mechanism and was excluded entirely — see below.
- **`apps/web/app/api/picks/daily-slate/route.ts`** (45-line drift): an unrelated, already-landed honesty fix
  (removing a fabricated all-zero `recentRecord` placeholder, `public-number-audit-2026-07-16` finding #7) sat
  textually right after this route's pick/game-count computation, non-overlapping with #89's own patch region.
  Applied the historical try/catch restructuring (wrapping the count/breakdown computation, removing the
  per-query `.catch(() => 0/[])` fallbacks, returning `outageGateResponse("Daily slate")` on any failure) by
  hand, leaving the `recentRecord` fix completely untouched below it.
- **The game-room trio** (`lib/game-room/load.ts`, `api/room/[gameId]/model-court/route.ts`,
  `app/room/[gameId]/page.tsx`) had ALL drifted since #89 was authored — this branch's own already-landed
  entitlements-gating work (`GameRoomViewer`: `canSeePremiumPicks`/`canSeeConfidence`/`canSeeFactorBreakdown`/
  `canSeeLineMovement`, threaded through `loadGameRoom(gameId, viewer, now)`'s 3-arg signature) didn't exist
  when #89 was written. This is a protected, entitlements-adjacent zone — reconciled with maximum care: the
  ONLY change to `load.ts` is removing `.catch(() => null)` from the `db.game.findUnique(...)` call (a DB
  failure now throws instead of collapsing into the same `null` a genuinely-missing game returns); every
  downstream entitlement-gating line (premium-pick filtering, confidence/line-movement/factor-breakdown
  nulling) is byte-identical to before. `model-court/route.ts`'s existing 4-field `loadGameRoom(...)` call is
  wrapped in try/catch → `outageGateResponse("Model Court")`, passing the exact same viewer object, nothing
  added or removed from it. `room/[gameId]/page.tsx` received only #89's own explanatory comment (no
  functional change) — the throw now propagates to the segment's dedicated `apps/web/app/room/error.tsx`
  boundary (a branded page, not a raw crash screen), confirmed a reasonable choice for this entitled surface.
- **Proof-of-record loader — excluded, confirmed SUPERSEDED, not ported.** Drift analysis found
  `apps/web/lib/proof/load-proof-of-record.ts` + `apps/web/app/proof/page.tsx` already independently fixed on
  this branch, via a DIFFERENT mechanism than #89's throw-based approach: the loader catches the failure into
  a resolved `ledgerUnreachable: boolean` flag (never throwing) instead of removing its `.catch()`; on that
  flag it returns `generatedAt:"", merkleRoot:"", totalSettled:0` — explicitly never the fabricated
  `sha256("")` empty-set root reserved for the genuinely-empty-but-reachable branch. `/proof/page.tsx` reads
  the flag AND carries its own defensive try/catch (belt-and-suspenders — never an error boundary on this
  honesty surface), rendering a distinct "temporarily unreachable" card. Already has dedicated test coverage
  (`honest-degraded-states.test.ts`, `states-matrix-slice.test.ts`). Confirmed (myself, then independently by
  red-team) this closes the exact same gap #89 targets — arguably with MORE defense-in-depth (a resolved
  flag plus a page-level fallback) than a bare throw would provide. Not touched; #89's historical test
  assertions for this specific surface (which assume a throw) were not ported, since they'd assert behavior
  this branch's own already-landed design deliberately does not have.
- Independent review: one `gse-red-team` pass, resumed twice via the standing agent-stall protocol (both times
  mid-investigation right before its final check — once before reading the game-room error boundary, once
  before running the closing typecheck — resolved with explicit "finish this one check then write the
  synthesis" directives). **Zero CONFIRMED findings across all 7 review points and the reviewer's own 8-point
  adversarial protected-zone checklist**: all four zero-drift files confirmed behaving exactly as described
  (deliberate/gated 200 states untouched, only genuine DB failures return 503); the `daily-slate` reconciliation
  confirmed to leave both the unrelated stale-kill-switch fail-open path and the `recentRecord` honesty fix
  genuinely undisturbed; the game-room trio — the highest-risk, entitlements-adjacent part — confirmed to
  introduce NO leak and NO behavioral drift beyond the intended failure-propagation change (read the full
  238-line `loadGameRoom` function and confirmed every entitlement-gating line byte-identical); the new tests
  confirmed non-vacuous via direct reversion reasoning on 4 separate lines; the proof-of-record SUPERSEDED
  disposition independently re-confirmed correct by reading both files in full; typecheck confirmed clean.
- Evidence: `cd apps/web && npx vitest run __tests__/outage-sweep.test.ts __tests__/prod-probe-script.test.ts
  __tests__/daily-slate-route.test.ts __tests__/daily-slate-stale-kill-switch.test.ts
  __tests__/honest-degraded-states.test.ts __tests__/states-matrix-slice.test.ts` → 6 files / 70 tests, all
  green (independently re-run by both this session and the red-team); full `apps/web` suite → 636 files /
  8,616 tests, all green (was 635/8,604 pre-fix — the +12 delta reconciles exactly to the new
  `outage-sweep.test.ts` file); `npx tsc --noEmit` clean (apps/web, re-run 3 times across the session with no
  interleaved edits between the last run and commit); full workspace `npm run typecheck` clean, every
  workspace; `npm run guardrails` → 17/17 green; `git diff --check` clean aside from the same pre-existing
  CRLF-line-ending file already documented in DEC-040 (untouched by this diff).
- Alternatives rejected: blind `git apply` of the historical diff onto the drifted game-room trio — rejected
  once the entitlements-gating drift was confirmed; the risk of silently reverting or duplicating already-
  landed paid-tier logic in a protected zone was judged too high for anything but a hand-verified, line-by-
  line reconciliation. Porting #89's proof-of-record throw-based fix on top of the already-landed flag-based
  one — rejected as redundant and risky (two competing failure-handling mechanisms on the same read would be
  a maintenance hazard, and the flag-based design was independently confirmed to already close the gap).
- Reversibility: strictly additive/tightening (new outage 503s, a `.catch()` removal that can only make a
  failure MORE visible, never less) — never removes or weakens any deliberate gated/empty state. Revert commit
  if any regression surfaces. Never merged to `main` — founder-merge-only, tracked by the existing accounting
  PR #129.
- Protected zones: public customer-facing surfaces (frontend-trust doctrine), data reliability/observability,
  and entitlements (the game-room trio touches a PRO/ELITE-gated data path) — mandatory red-team (completed,
  zero findings).
- Files: `apps/web/app/api/calibration/route.ts`, `apps/web/app/api/picks/daily-slate/route.ts`,
  `apps/web/app/api/promotions/route.ts`, `apps/web/app/api/room/[gameId]/model-court/route.ts`,
  `apps/web/app/room/[gameId]/page.tsx`, `apps/web/lib/calibration/report.ts`,
  `apps/web/lib/game-room/load.ts`, `scripts/prod-probe.mjs`, `apps/web/__tests__/outage-sweep.test.ts` (new).
- Supersedes: none (proof-of-record disposition is EXCLUDED, not superseded-and-overwritten — its own
  already-landed fix stands as-is). **Closes Recovery Wave R0.6 entirely — all 6 live-defect items (#92, #82,
  #93, #86, #84, and #87/#89 together) are now DONE, each independently red-teamed with zero confirmed
  findings.**

## DEC-042 — Recovery Wave R8: freeze-contract classification of residual #112 playback assets (2026-07-18)

- Date: 2026-07-18
- Workstream: Reconciliation Wave R8 (per `RECOVERY_MATRIX.md` row #112 and `RECOVERY_WAVES.md`'s own named
  next action), the first genuinely dependency-ready, non-owner-gated reconciliation item after Wave R0.6
  closed — confirmed by re-reading `CONTINUOUS_EXECUTION_CONTRACT.md` §9 directly (fetched from commit
  `acf80259`, not assumed from memory) and auditing every remaining wave in `RECOVERY_WAVES.md`: R0/R2/R6/R7/
  R9/R10 are genuinely founder-blocked; R5 explicitly asks for a founder decision. Only R8 and R11.5 are not.
- Scope: `RECOVERY_MATRIX.md` row #112 names four still-recoverable asset groups from the historical `#112`
  draft PR lineage (spine + Game Room consumer already ported as W001, DEC-\*): "`market-values` canonical
  types + `lib/market/*`, cockpit selected-game playback, fantasy public gate, Twin/Brain/autopsy/Studio
  projections."
- Contract frozen — this pass is CLASSIFICATION ONLY, not porting, per the recovery-wave law's own "stop after
  one inventory or recovery wave" discipline and because one of the four groups surfaced a genuine, non-trivial
  founder-authored collision requiring OWNER_GATE treatment before any of the four groups can be safely coded.
  Fetched branch `codex/gse-frontier-recovery-2026-07-13` (head `9b6da1ae`). Diffing the WHOLE branch against
  `pdcswh` HEAD showed 608 files / +9,634 / −56,079 — codex is a much older, smaller snapshot missing most of
  this session's own accumulated work (W001-W009 etc.), so a whole-branch diff is not a usable signal; scoped
  every check to the four named asset-path groups instead.
- **Group A — `market-values` canonical types + `lib/market/*` — RECOVER_WHOLE candidate, not yet coded.**
  `packages/types/src/market-values.ts` (289 lines, new) + its test (174 lines, new) are genuinely absent from
  `pdcswh`. `apps/web/lib/market/` gains 6 new files (`format-clv.ts`, `project-public-market.ts`,
  `format-committed-market.ts` + their tests) and modifies 4 already-existing files (`best-line.ts`,
  `game-market-read.ts`, `pick-death-clock.ts`, `load-line-shop-board.ts`) that will need their own drift
  check against codex's fork point before any port — not yet performed. Next bounded step: diff those 4 files
  specifically, then freeze-contract the whole group as its own item.
- **Group B — cockpit selected-game playback — RECOVER_WHOLE candidate, not yet coded.** 8 new files, all
  genuinely absent: `components/cockpit/selected-game-playback.tsx` (258 lines) + its test (300 lines),
  `lib/cockpit/load-selected-game-playback.ts` (105 lines), `app/cockpit/market-twin/[gameId]/page.tsx` (20
  lines, new dynamic route), a QA browser script, and 2 reference screenshots. `apps/web/app/cockpit/
  market-twin/page.tsx` (already exists on `pdcswh`) gains a 6-line "Open governed playback" link to the new
  `[gameId]` route — currently dead without it. Next bounded step: freeze-contract this group as its own item
  (smaller and lower-risk than Group A — no modifications to existing business logic, only new additive files
  plus one small link).
- **Group C — fantasy public gate + `/fantasy/studio` admin-gate — COLLISION, NOT PORTED, OWNER_GATE
  required.** `apps/web/lib/fantasy/public-gate.ts` (new), a `middleware.ts` change adding a redirect gate via
  `isPublicFantasyToolPath()`/`fantasyGateDestination()` and adding `/fantasy/studio` to `PROTECTED_ROUTES`,
  and a `fantasy/studio/page.tsx` change adding an admin-only auth check — all trace to ONE commit,
  `2724e78a` ("fix(fantasy): gate public tools on real data"), confirmed via `git show` to be authored by
  **Garrett Baxley (the founder)**, 2026-07-15 14:31 -0500. Confirmed via `git merge-base --is-ancestor
  2724e78a HEAD` that this commit is NOT an ancestor of `pdcswh` — it exists only on
  `codex/gse-frontier-recovery-2026-07-13` and two sibling lineages (`review-recovery`, `verify-lens`).
  Critically: `pdcswh`'s OWN current `middleware.ts` carries an explicit code comment, introduced in an
  earlier, independent commit (`c12decfc`, `git log -S` confirmed), documenting a DELIBERATE removal of a
  similarly-shaped middleware-level `/fantasy/*` redirect gate for a concrete, named bug: "It bounced every
  `/fantasy/*` tool back to the hub... and looped against the hub's legacy `?tool=` redirect." Blindly porting
  the founder's `2724e78a` gate would reintroduce a middleware-level `/fantasy/*` redirect of the same general
  mechanism as the one `pdcswh` explicitly removed for that reason — NOT proven to be the identical bug, but
  close enough in shape that porting without founder review risks resurrecting it. Recorded as
  `COLLISION-8a`/`COLLISION-8b` in `FILE_SYMBOL_OWNERSHIP.csv`, exactly the scenario `COLLISION-7b`'s own note
  (DEC-036) anticipated when it flagged that a future wave recovering this exact branch lineage must not
  silently regress prior work. NOT overridden, judged, or silently discarded — new OWNER_GATE entry below.
- **Noise — not a recoverable asset.** `apps/web/lib/studio/claude.ts` and its test show `codex` LACKING a
  `cache: {system: true}` prompt-caching optimization that `pdcswh`'s own independent lineage already has —
  `pdcswh` is ahead here, not behind; nothing to recover. `apps/web/app/cockpit/market-twin/[gameId]/page.tsx`
  (Group B) is the actual substance behind the RECOVERY_MATRIX's "Twin" mention; no separate "Brain/autopsy"
  files were found under those names — the closest existing concept (`lossAutopsy`) is already covered by this
  session's own landed W004 SportsIR work, not a distinct residual asset.
- Evidence: `git fetch origin codex/gse-frontier-recovery-2026-07-13`; `git merge-base FETCH_HEAD HEAD` /
  `git merge-base FETCH_HEAD origin/main` (both `7c747679`); `git diff --stat HEAD FETCH_HEAD -- <path>` run
  separately for each of the four named groups plus the two noise files; `git log -S "..." --oneline HEAD --
  apps/web/middleware.ts`; `git merge-base --is-ancestor 2724e78a HEAD` (exit 1, confirmed NOT an ancestor);
  `git branch -a --contains 2724e78a`; `git log -1 --format="%an %ad %s" 2724e78a`. All commands run directly
  this session, not inferred.
- Alternatives rejected: blind-porting all four groups in one pass — rejected, both because Group C's
  collision must resolve before it's safe to touch `middleware.ts`/`fantasy/studio/page.tsx` at all, and
  because the recovery-wave law scopes each bounded capability as its own freeze-contract/code/test/red-team
  loop, not a mega-port. Silently dropping Group C once the collision was found — rejected as a "no silent
  scope-shrink" violation; recorded faithfully instead. Silently porting Group C anyway on the theory that
  "founder code should win" — rejected because the founder's own commit predates, and does not account for,
  `pdcswh`'s own later, evidence-documented bug-driven removal; only the founder can resolve which design
  is correct going forward.
- Reversibility: this pass makes no product-code changes at all — ledger/documentation only. Fully reversible
  by construction.
- Protected zones: entitlements, public surfaces (Group C touches both) — no code touched this pass, so no
  red-team dispatch was required; Groups A/B/C will each need their own red-team pass when actually coded.
- Files: `reports/reconciliation/FILE_SYMBOL_OWNERSHIP.csv` (two new rows, `COLLISION-8a`/`COLLISION-8b`).
- Supersedes: none. Does not close Wave R8 — Groups A and B remain to be freeze-contracted and coded as their
  own bounded items; Group C stays OWNER_GATE pending founder decision.

### New owner gate — OG-008 (Group C, fantasy public gate)

- **Decision:** whether to port the founder's own `2724e78a` fantasy-public-gate + `/fantasy/studio` admin-gate
  commit (from `codex/gse-frontier-recovery-2026-07-13`) onto `pdcswh`, and if so, how to reconcile it with
  `pdcswh`'s own later, independent removal of a similarly-shaped gate for a documented redirect-loop bug.
- **Why founder:** this is the founder's own authored code, on a branch this agent has no authority to judge as
  "wrong" relative to a different lineage's later architectural decision — both are legitimate engineering
  positions, and only the founder can say which reflects current intent.
- **Safe default:** do nothing. `pdcswh`'s current per-page honest live/illustrative-status design stays as-is;
  `/fantasy/studio` remains reachable without the admin gate this commit would have added.
- **Work around gate:** none — Groups A and B (independent of this collision) proceed as their own separate
  items in the meantime.
- **Re-entry condition:** founder confirms (a) whether `/fantasy/studio` should be admin-gated, and (b) whether
  the middleware-level `/fantasy/*` redirect should be reintroduced, and if so, with the redirect-loop bug
  `c12decfc` fixed first (verify it doesn't reappear before landing).

## DEC-043 — Recovery Wave R8, Group B: cockpit selected-game playback (2026-07-18)

- Date: 2026-07-18
- Workstream: Wave R8's second bounded item, following the DEC-042 classification pass. Ports the "cockpit
  selected-game playback" asset from `RECOVERY_MATRIX.md` row #112 — confirmed during coding that this is also
  the substance behind that row's separately-listed "Twin/Brain/autopsy/Studio projections" phrase (one UI
  surface, not a distinct fourth group).
- Contract frozen: all 5 target files confirmed genuinely absent from `pdcswh` (`ls` check on each path before
  touching anything); the diff against `codex/gse-frontier-recovery-2026-07-13` (head `9b6da1ae`) applied via
  a verified-clean `git apply` (`--check` passed first) — zero drift, zero manual reconciliation, unlike
  several of Wave R0.6's items. Every dependency the ported code calls into was confirmed to already exist on
  `pdcswh` with a matching shape BEFORE applying the patch: `requireCockpitAdmin()` (DEC-037, byte-identical
  logic, doc-comment-only diff, confirmed via direct diff), `buildPlaybackConsumerBundle()` +
  `PlaybackConsumerBundle` (this session's own earlier `intelligence-playback` work), `GameRoomViewer` (already
  has the exact 4-field shape the loader's `OPERATOR_VIEWER` constant needs).
- Code: new `apps/web/lib/cockpit/load-selected-game-playback.ts` — `loadSelectedGamePlayback(routeGameId)`
  validates the route param via a zod-branded schema (rejecting malformed input before any DB call), calls
  `loadGameRoom(gameId, OPERATOR_VIEWER)` with a hardcoded ALL-TRUE `GameRoomViewer` (this loader is designed
  to be called ONLY from an admin-gated page, never a public path), and returns a discriminated union
  (`UNAVAILABLE` with `INVALID_GAME_ID`/`GAME_NOT_FOUND`/`PLAYBACK_NOT_CAPTURED`/`PLAYBACK_WITHHELD` reasons, or
  `AVAILABLE` wrapping `buildPlaybackConsumerBundle(...)`). New `apps/web/app/cockpit/market-twin/[gameId]/
  page.tsx` calls `await requireCockpitAdmin();` as its first statement, before any data load. New
  `apps/web/components/cockpit/selected-game-playback.tsx` is a pure presentational switch over the
  discriminant with an exhaustive `assertNever` default. `apps/web/app/cockpit/market-twin/page.tsx`
  (already-existing) gained one additive 6-line link to the new route — no existing logic touched.
  `apps/web/__tests__/cockpit-selected-game-playback.test.tsx` (8 tests) + `scripts/qa/cockpit-selected-game-
  playback-browser.mjs` (manual QA script, not part of CI) applied verbatim. The historical branch's 2
  reference screenshots were NOT ported — they are stale run-artifacts the QA script regenerates on demand,
  not a build or test dependency.
- Verified live (before red-team dispatch) that this session's own DEC-037 CI enforcement genuinely extends to
  a brand-new cockpit page with zero additional work: `cockpit-page-auth.test.ts`'s recursive directory-walk
  discovery picked up the new `[gameId]/page.tsx` automatically (36→37 tests) and confirmed it calls the guard
  — proving the "a future page that forgets it fails CI" design goal from DEC-037 actually holds under a real
  new page, not just the 32 pages it was built against.
- Independent review: one `gse-red-team` pass, resumed once via the standing agent-stall protocol (stalled
  right before its non-vacuousness test-reversion check). **Zero CONFIRMED findings across all 8 review
  points, including the highest-risk one** — the hardcoded all-true `OPERATOR_VIEWER` entitlement object was
  confirmed provably unreachable outside the admin gate: exactly 3 references to `loadSelectedGamePlayback`
  exist in the whole `apps/web` tree (its own definition, the gated page, its test) and `requireCockpitAdmin()`
  fails closed via Next's `redirect()` throwing internally, confirmed as the literal first statement before
  any data fetch. Route-param validation, `WITHHELD`-before-bundle-construction ordering, honest `??`
  fallback labels (never fabricated data), the additive-only `market-twin/page.tsx` edit, and both local and
  full-workspace typecheck were all independently confirmed. Two specific tests were traced to a genuine
  would-fail-on-revert outcome (the `WITHHELD` guard test and the admin-gate-rejection test).
- Evidence: `cd apps/web && npx vitest run __tests__/cockpit-selected-game-playback.test.tsx` → 8/8 (also
  independently re-run by the red-team); `cd apps/web && npx vitest run __tests__/cockpit-page-auth.test.ts` →
  37/37 (was 36); full `apps/web` suite → 637 files / 8,635 tests, all green (was 636/8,616 — the +19 delta is
  larger than the naive +9 estimate of "1 new test file (8) + 1 existing scan file's count (+1)" because
  several OTHER pre-existing `it.each`-based cockpit-page scans — confirmed present:
  `cockpit-stub-safety.test.ts`, `route-smoke.test.ts`, and others — also automatically picked up the new page
  and each gained tests too; zero failures either way, so the larger delta is a good sign, not a discrepancy
  worth chasing further); `npx tsc --noEmit` clean (apps/web, independently re-run twice — once before red-team
  dispatch, once by the red-team itself); full workspace `npm run typecheck` clean; `npm run guardrails` →
  17/17 green; `git diff --check` clean aside from the same pre-existing CRLF file already documented in
  DEC-040 (untouched by this diff).
- Alternatives rejected: porting the 2 reference PNG screenshots — rejected as unnecessary; they are QA-script
  run output, not a source or test dependency, and would be stale/misleading if committed without ever being
  regenerated against the actual ported UI.
- Reversibility: strictly additive (5 new files, one 6-line link on an existing file) — trivially revertible.
  Revert commit if any regression surfaces. Never merged to `main` — founder-merge-only, tracked by the
  existing accounting PR #129.
- Protected zones: entitlements (cockpit/admin-only surface consuming full paid-tier data via a hardcoded
  all-access viewer object) — mandatory red-team (completed, zero findings, explicit focus on leak risk).
- Files: `apps/web/lib/cockpit/load-selected-game-playback.ts` (new),
  `apps/web/app/cockpit/market-twin/[gameId]/page.tsx` (new),
  `apps/web/components/cockpit/selected-game-playback.tsx` (new),
  `apps/web/app/cockpit/market-twin/page.tsx` (additive edit),
  `apps/web/__tests__/cockpit-selected-game-playback.test.tsx` (new),
  `scripts/qa/cockpit-selected-game-playback-browser.mjs` (new).
- Supersedes: none. Closes Wave R8 Group B. Group A (`market-values` canonical types + `lib/market/*`) remains
  the next bounded item — needs its own freeze contract including a drift check on 4 already-existing
  `lib/market/*` files. Group C stays OWNER_GATE (OG-008) pending founder decision.

## DEC-044 — Recovery Wave R8, Group A: market-values canonical types + lib/market/* (2026-07-18)

- Date: 2026-07-18
- Workstream: Wave R8's third bounded item, following DEC-042 (classification) and DEC-043 (Group B). Ports
  the canonical sport-aware market-value normalization module from `codex/gse-frontier-recovery-2026-07-13`
  (head `9b6da1ae`) plus its 4 already-existing `lib/market/*` consumers, fixing two real, currently-live
  correctness bugs.
- Contract frozen before coding: drift-checked all 4 already-existing `apps/web/lib/market/*` files (`best-
  line.ts`, `game-market-read.ts`, `pick-death-clock.ts`, `load-line-shop-board.ts`) against current `pdcswh`
  HEAD via `git diff HEAD FETCH_HEAD`, plus their test files and the one real live caller of the death clock
  (`apps/web/app/api/picks/[id]/audit/route.ts`) — all applied cleanly via a verified `git apply --check`.
  Traced every caller of `buildBestLines`/`buildH2hMarketRead`/`buildPickDeathClock` in the whole `apps/web`
  tree before touching anything, confirming `buildH2hMarketRead`'s 3 real callers (`get-slate-twin.ts`,
  `load-market-fair-board.ts`, `load-proof-of-record.ts`) need zero changes since its external signature is
  unchanged.
- Two real, currently-live correctness bugs fixed:
  1. **Pick'em (0-value) spreads were silently dropped.** The old `isNum`/`isPrice` helpers in `best-line.ts`
     and `game-market-read.ts` explicitly excluded `value === 0`, treating a legitimate, common pick'em line
     as absent data. `normalizeMarketPoint`/`normalizeAmericanOdds` (new `packages/types/src/market-values.ts`,
     289 lines) correctly keep 0 spreads (`formatSignedMarketPoint` renders `"PK"`) while still rejecting
     genuinely bad data (non-finite, non-tick-aligned, or out-of-bounds values).
  2. **Mathematically unsound MONEYLINE death-clock median.** The old `pick-death-clock.ts` took a naive
     median of raw American odds prices, which is not meaningful — American odds are discontinuous/non-linear
     around the pick'em boundary. The ported version disables the MONEYLINE metric outright (`metricPlan()`
     returns `null` for `MONEYLINE`/`H2H`, so `buildPickDeathClock` returns `null` for those picks) with an
     honest in-code explanation, rather than continuing to show a number that doesn't mean what it claims.
     SPREAD/TOTAL clocks gain sport-aware point-tick consensus with separate `referenceAtPublish`/
     `referenceLatest` (the aggregation reference, may be non-executable) and `atPublish`/`latest` (nearest
     real executable quote) fields.
- Code: new `packages/types/src/market-values.ts` + test (41 tests) — canonical American-odds/market-point
  normalization, sport-aware tick sizing (0.25 soccer, 0.5 baseball/hockey/basketball/football), consensus
  builders, formatters. `packages/types/src/index.ts` was edited **manually, not via `git apply`**, because
  the historical branch's diff would have silently deleted `export * from "./sports-ir.js";` (that export
  doesn't exist in the older codex snapshot — a false collision, not a real one, caught before applying):
  added `export * from "./market-values.js";` as a new line while keeping the sports-ir export byte-identical;
  added `drawPrice?: number` to `BookmakerOddsInput` (additive); narrowed `AuditDeathClock.metric` to drop
  `"moneyline_price"` and added the 2 new reference fields, consistent with the death-clock change above.
  `best-line.ts`, `game-market-read.ts`, `pick-death-clock.ts`, `load-line-shop-board.ts` and their tests
  applied verbatim via `git apply`. `apps/web/app/api/picks/[id]/audit/route.ts` — the one real live caller of
  `buildPickDeathClock` (a PRO/ELITE-gated paywalled audit surface) — got a 2-line change adding `sport` to
  the Prisma include and passing it into the death-clock call; every other line, including all tier-gating
  logic, is byte-identical. `apps/web/components/picks/evidence-audit-drawer.tsx` got a small polish cleanup
  (not from the historical branch, done independently): narrowed two local helper signatures that still
  referenced the now-impossible `"moneyline_price"` metric value.
  Also ported 3 new, self-contained formatting utilities — `apps/web/lib/market/format-clv.ts`,
  `project-public-market.ts`, `format-committed-market.ts` (+ tests) — that consume `market-values.ts`. These
  land **deliberately unwired** in this pass (grep-verified zero callers anywhere in `apps/web` outside their
  own test files): on the historical branch they're also wired into `apps/web/app/api/picks/route.ts`,
  `apps/web/app/api/verify/route.ts`, `apps/web/app/preview/[sport]/[slug]/page.tsx`,
  `apps/web/components/trust-ledger/pick-ledger-row.tsx`, `apps/web/components/trust-ledger/verify-
  console.tsx`, and `apps/web/lib/proof/load-proof-of-record.ts` — a combined ~920-line diff across live
  public pick-display/verify/proof surfaces. That wiring was explicitly excluded as a materially larger,
  higher-risk, protected-public-claim workstream needing its own freeze contract, not silently dropped —
  recorded below as the named follow-up ("R8 Group A2").
  `apps/web/__tests__/audit-route-paywall.test.ts` needed a 1-line mock-fixture fix (`sport: { name: "NFL" }`
  added to `pickFixture()`'s `game` object) discovered only on the full-suite run — this file's drift wasn't
  in the initial freeze-contract file enumeration; caught, fixed, and reverified (5/5) before final gates.
  `apps/web/__tests__/proof-of-record-surface.test.ts`'s ported diff asserted the excluded consumer wiring and
  was reverted to its pre-patch HEAD state (confirmed 0-line diff against HEAD, 33/33 passing) rather than
  landing 2 false-negative tests.
- Independent review: one `gse-red-team` pass, resumed twice via the standing agent-stall protocol (stalled
  mid-investigation both times; second resume used the hard "STOP investigating, report now" directive).
  **Zero CONFIRMED or PLAUSIBLE findings across all 7 review points**, including the two highest-risk ones:
  (a) entitlement/tier-gating logic in the audit route confirmed byte-identical beyond the 2-line `sport`
  addition; (b) sport-name matching against real seed data — `packages/db/prisma/seed.ts` creates exactly 7
  `Sport` rows (`NFL`, `NCAAF`, `NBA`, `NCAAB`, `MLB`, `NHL`, `MLS`) and every one matches a `pointPolicy()`
  branch, so no seeded sport silently degrades to empty best-line/death-clock output; `Game.sportId` is a
  required (non-nullable) FK per `schema.prisma`, so the defensive `game.sport?.name ?? ""` fallback in
  `load-line-shop-board.ts` is unreachable in practice. Also independently confirmed: the 3 new formatting
  utilities are provably unwired (grep across all of `apps/web`); the MONEYLINE death-clock removal is a
  genuine correctness fix with no surviving caller/test dependency on a non-null MONEYLINE clock, and the sole
  live consumer (`evidence-audit-drawer.tsx`) already guards on `audit.deathClock &&` so a null clock renders
  nothing; `normalizeMarketPoint`/`normalizeAmericanOdds` correctly accept 0-value spreads while still
  rejecting non-finite, non-tick-aligned, and out-of-bounds values (verified against the module's own test
  assertions, not just its source).
- Evidence: `cd apps/web && npx tsc --noEmit` clean; `cd packages/types && npx tsc --noEmit` clean; targeted
  tests green (`market-values.test.ts` 41/41; `format-clv.test.ts` 4/4; `project-public-market.test.ts` 9/9;
  `format-committed-market.test.ts` 2/2; `best-line.test.ts` 11/11; `pick-death-clock.test.ts` 13/13;
  `market-fair-board.test.ts` 13/13; `proof-of-record-surface.test.ts` 33/33; `audit-route-paywall.test.ts`
  5/5); full `apps/web` suite → 640 files / 8,668 tests, all green (was 637/8,635 before this item — the delta
  matches 3 new apps/web test files plus test-count growth in the 4 drifted test files); full workspace
  `npm run typecheck` clean; `npm run guardrails` → 17/17 green; `git diff --check` clean aside from the same
  pre-existing CRLF file already documented in DEC-040 (untouched by this diff).
- Alternatives rejected: porting the full consumer wiring (`api/picks/route.ts`, `api/verify/route.ts`,
  `preview/[sport]/[slug]/page.tsx`, the 2 trust-ledger components, `load-proof-of-record.ts`) in this same
  pass — rejected as a materially larger (~920-line), higher-risk change touching live public pick-display,
  verify-console, and proof-of-record surfaces that deserves its own freeze contract and red-team pass rather
  than riding in on "port the math library."
- Reversibility: every file is either brand-new (delete to roll back) or has a clean, isolated diff against
  HEAD (single revert commit). No migrations, no data writes, no runtime behavior change outside the 4
  lib/market files + audit route + drawer polish + shared types file. Never merged to `main` — founder-merge-
  only, tracked by the existing accounting PR #129.
- Protected zones: the paywalled audit route (PRO/ELITE entitlement-adjacent) and CLV-display-adjacent new
  formatting utilities (unwired) — mandatory red-team (completed, zero findings).
- Files: `packages/types/src/market-values.ts` (new) + test, `apps/web/lib/market/format-clv.ts` (new) +
  test, `project-public-market.ts` (new) + test, `format-committed-market.ts` (new) + test,
  `apps/web/lib/market/best-line.ts` + test, `game-market-read.ts`, `pick-death-clock.ts`,
  `load-line-shop-board.ts`, `packages/types/src/index.ts`, `apps/web/app/api/picks/[id]/audit/route.ts`,
  `apps/web/components/picks/evidence-audit-drawer.tsx`, `apps/web/__tests__/pick-death-clock.test.ts`,
  `market-fair-board.test.ts`, `audit-route-paywall.test.ts`.
- Supersedes: none. Closes Wave R8 Group A. **New named follow-up: "R8 Group A2"** — wiring
  `formatCanonicalClv`/`projectCanonicalClv`/`projectPublicMarket`/`formatCommittedMarket` into
  `api/picks/route.ts`, `api/verify/route.ts`, `preview/[sport]/[slug]/page.tsx`, the 2 trust-ledger
  components, and `load-proof-of-record.ts` — not yet freeze-contracted, deliberately excluded from this item.
  With Groups A and B both DONE, Wave R8's only remaining open item is Group C, which stays OWNER_GATE (OG-008)
  pending founder decision. R8 Group A2 and R11.5 (long-tail branch triage) are the two dependency-ready,
  non-owner-gated items remaining in the reconciliation queue.
  **Correction (see DEC-045): "Group A2" as described above was scoped from `git diff --stat` line counts
  only, before reading the actual diff content. A subsequent freeze-contract attempt read the real diffs and
  found this framing wrong — Group A2 is not a simple wiring task and is now OWNER_GATE (OG-009) for its two
  highest-risk files.**

## DEC-045 — Recovery Wave R8, Group A2 investigation: NOT a simple wiring task, new OWNER_GATE (2026-07-18)

- Date: 2026-07-18
- Workstream: attempted freeze contract for "R8 Group A2" (the follow-up DEC-044 recorded for wiring the 3
  unwired market-values formatting utilities into 6 live public surfaces). This entry corrects that
  framing and records what was actually found.
- What happened: DEC-044 scoped Group A2 from `git diff --stat` line counts against the 6 files
  (`api/picks/route.ts`, `api/verify/route.ts`, `preview/[sport]/[slug]/page.tsx`, `pick-ledger-row.tsx`
  [new], `verify-console.tsx`, `load-proof-of-record.ts`) without reading their actual content — a real
  process gap, caught and corrected here rather than compounded by proceeding blind. When this session
  began Group A2's freeze contract and actually read each diff (`git diff HEAD FETCH_HEAD -- <path>`), it
  found that at least 3 of the 6 files bundle the market-values wiring together with substantial,
  independently-evolved changes to protected zones — not a clean additive port:
  - **`apps/web/app/api/picks/route.ts`** (the flagship public picks endpoint): the historical branch's
    version REPLACES this session's own already-shipped, already-red-teamed DEC-040/041 outage-gate fix
    (`outageGateResponse` from `lib/data-reliability/outage-gate.ts`, closing Wave R0.6) with a different,
    older mechanism (`backendOutageResponse` from `lib/data-reliability/public-freshness-gate.ts`), and
    flips the stale-data-check failure posture from fail-OPEN (pdcswh's current, deliberate choice — "a
    transient blip must not black out a fresh surface") to fail-CLOSED. It also swaps the confidence-display
    mechanism from pdcswh's `honestConfidence`/`getPublicCalibrator` (`lib/calibration/public-confidence`)
    to a different `committedProbabilityDisplay` (`lib/calibration/honest-confidence`) reading directly off
    `proofReceipt.modelProb` — a genuine calibration-semantics change, which `CLAUDE.md` explicitly requires
    an owner gate for ("change ... calibration ... without the required owner gate"). It also adds unrelated
    new capability (per-sport freshness filtering, a more honest daily-limit-count mechanism) mixed into the
    same diff.
  - **`apps/web/app/api/verify/route.ts`**: adds a genuinely valuable proof-integrity strengthening
    (`relationMatchesPayload` — checks the hash-covered payload's `pickId`/`gameId`/`sport` actually match
    the DB relation the receipt is bound to, closing a "hash matches but relation was swapped" gap) bundled
    with the market-values wiring — proof-protected-zone territory needing its own dedicated red-team, not a
    drive-by port.
  - **`apps/web/lib/proof/load-proof-of-record.ts`**: restructures the public `ProofPickRow` contract —
    `clvVerdict`/`clvValue` become a nested `clv: ProofClvRead | null` (via `projectCanonicalClv`), and
    `consensusAtSettle`/`modelVsMarketPp` (an at-publish-time model-vs-market disagreement metric) are
    replaced entirely by a different concept, `latestMarketConsensus` — a public-facing CLV/proof JSON
    contract change, not additive wiring.
  - **`apps/web/components/trust-ledger/pick-ledger-row.tsx`** (new file, missing entirely from `pdcswh`):
    tightly coupled to `load-proof-of-record.ts`'s new shape (`row.clv`, `row.publicMarket`,
    `row.clv.capturedAt`) — cannot be ported independently of that file's restructuring.
  - **`apps/web/components/trust-ledger/verify-console.tsx`**: the one genuinely clean, additive,
    self-contained diff of the six — but it consumes `committed.selection` instead of `committed.line`,
    making it dependent on `api/verify/route.ts`'s shape change, not portable alone.
  - **`apps/web/app/preview/[sport]/[slug]/page.tsx`**: keyword-scanned for `clv`/`consensus`/`calibrat`
    with no hits beyond `projectPublicMarket` itself — the most likely candidate to be genuinely isolated,
    but not yet fully read line-by-line; not confirmed safe.
- Decision: **Group A2, as a single 6-file bundle, is NOT executed.** `api/picks/route.ts` and
  `api/verify/route.ts` (and by extension `load-proof-of-record.ts` and `pick-ledger-row.tsx`, which depend
  on the same restructured shapes) are reclassified **OWNER_GATE (OG-009)** — specifically the
  calibration-mechanism swap and the outage-gate-reversion in `api/picks/route.ts`, which this agent has no
  authority to resolve unilaterally per `CLAUDE.md`'s explicit calibration/CLV/proof protected-zone rule.
  `verify-console.tsx` and `preview/[sport]/[slug]/page.tsx` remain plausible RECOVER_WHOLE candidates but
  need their own individually-scoped freeze contracts (the former blocked on `api/verify/route.ts`'s
  disposition; the latter needs a full line-by-line read, not yet done) — not bundled with the owner-gated
  pieces.
- Evidence: `git diff HEAD FETCH_HEAD -- <each of the 6 paths>` read in full or keyword-scanned as described
  above; `git status --short` confirms zero working-tree changes from this investigation (no code was
  touched — this is a pure scoping/discovery entry).
- Alternatives rejected: proceeding to apply the 6-file diff bundle as DEC-044 originally implied — rejected
  outright once the content (not just the line-count stat) was read, since it would have silently reverted
  a freshly-shipped, freshly-red-teamed fix (DEC-040/041) and changed calibration-display semantics without
  founder input.
- Reversibility: N/A — no code changed.
- Protected zones: calibration (`CLAUDE.md` explicit owner-gate rule), CLV display contract, proof
  verification logic, and this session's own already-shipped outage-gate fix.
- Files: none changed. This is a documentation-only, scoping-correction entry.

### New owner gate — OG-009 (Group A2's `api/picks/route.ts` + `api/verify/route.ts` cluster)

- **Decision needed:** should the platform adopt the historical `codex/gse-frontier-recovery-2026-07-13`
  branch's confidence-calibration display mechanism (`committedProbabilityDisplay` reading
  `proofReceipt.modelProb` directly) in place of `pdcswh`'s current `honestConfidence`/`getPublicCalibrator`
  audited-calibrator mechanism on the public `/api/picks` endpoint? Separately: should the stale-data-check
  failure posture on `/api/picks` change from fail-OPEN to fail-CLOSED, and should this session's own
  DEC-040/041 outage-gate fix be replaced by the older `backendOutageResponse` mechanism?
- **Why founder:** `CLAUDE.md` explicitly requires an owner gate before changing calibration, CLV, or proof
  semantics. The stale-data fail-open/fail-closed posture and the choice between two outage-gate mechanisms
  are both live-correctness/reliability decisions on the platform's single highest-traffic public endpoint —
  not something an autonomous agent should resolve by picking whichever branch happens to be older or newer.
- **Safe default:** do nothing. `pdcswh`'s current `honestConfidence`/`getPublicCalibrator` calibration
  display, fail-open stale-data posture, and DEC-040/041 `outageGateResponse` outage handling all remain
  exactly as they are — already shipped, already red-teamed, already closing Wave R0.6.
- **Work around gate:** `verify-console.tsx` and `preview/[sport]/[slug]/page.tsx` can still be investigated
  and potentially ported independently once their own dependencies are confirmed non-owner-gated (see
  Decision above for `verify-console.tsx`'s blocker). `api/verify/route.ts`'s `relationMatchesPayload`
  proof-integrity strengthening is a genuinely separable, non-calibration idea that could be extracted and
  freeze-contracted on its own, without the market-values/calibration bundling — a future session could
  attempt that narrower slice.
- **Re-entry condition:** founder confirms (a) which calibration-display mechanism is canonical going
  forward, (b) whether `/api/picks`'s stale-data check should fail open or closed, and (c) which outage-gate
  mechanism (`outageGateResponse` vs `backendOutageResponse`) is canonical — or explicitly approves porting
  the historical branch's version wholesale after reviewing this entry's evidence.

## DEC-046 — Recovery Wave R11.5, first slice: `claude/magical-volta-*` cluster triaged, real asset recovered (2026-07-18)

- Date: 2026-07-18
- Workstream: R11.5 (long-tail branch triage), first bounded slice per `RECOVERY_WAVES.md`'s recommended
  method — the 22-branch `claude/magical-volta-<random>` cluster (daily branches, 2026-05-24 through
  2026-06-14, per the existing `BRANCH_PR_LEDGER.json` long-tail metadata).
- Process note: a `gse-scout` agent was dispatched for this investigation and stalled twice (acknowledged
  the task, made a handful of tool calls, then stopped without a report) before producing a report on its
  third resume. That report's directional conclusion (the cluster is an abandoned daily-snapshot job, safe
  to archive) held up, but one of its specific evidentiary claims — that `.claude/agents/gse-*.md` and
  `.claude/commands/*.md` were content "unique to `4kilty` [the newest branch], NOT in pdcswh" — was
  independently re-verified and found to be **backwards**: `git diff --stat HEAD origin/claude/magical-
  volta-4kilty -- .claude/agents/` showed ZERO lines (because `git cat-file -e origin/claude/magical-volta-
  4kilty:.claude/agents/gse-red-team.md` confirms the file is **absent from `4kilty` entirely** — it exists
  only on `pdcswh`, the opposite of the scout's claim), and the `.claude/commands/*.md` diff was 100%
  deletions (files `pdcswh` has that `4kilty` lacks), not insertions. Per this campaign's standing
  "reviewer-disagreement rule: reproduce the finding directly before ruling," every specific claim below is
  from directly-run `git` commands in this session, not inherited from the scout's report.
- Verified findings (real evidence, this session, not the scout's):
  - `git merge-base --is-ancestor origin/claude/magical-volta-KSe4E origin/claude/magical-volta-4kilty` →
    exit 1 (the oldest branch in the series is NOT an ancestor of the newest — confirms non-linear,
    divergent daily snapshots, not one continuous lineage).
  - `git merge-base --is-ancestor origin/claude/magical-volta-4kilty HEAD` → exit 1 (the newest/most-
    complete branch in the cluster is not an ancestor of `pdcswh` — nothing in this cluster has been
    absorbed by simple history inclusion).
  - `git diff --stat HEAD origin/claude/magical-volta-4kilty` → 2,655 files changed, 10,368 insertions(+),
    270,110 deletions(-) — `pdcswh` is overwhelmingly the superset by volume.
  - `git diff --name-status --diff-filter=A HEAD origin/claude/magical-volta-4kilty` (files present on
    `4kilty` with NO corresponding path on `pdcswh` at all — the only files genuinely impossible to already
    be covered) → exactly 5: `apps/web/__tests__/content-publisher-kill-switch.test.ts`,
    `apps/web/__tests__/pricing-drift-guard.test.ts`, `apps/web/components/landing/warp-nebula-lazy.tsx`,
    `apps/web/components/landing/warp-nebula.tsx`, `coordination/OVERNIGHT_RUN_20260614.md` (a run log, not
    real content).
  - `content-publisher-kill-switch.test.ts`: SUPERSEDED. `pdcswh` already has the identical
    `INTERNAL_CALIBRATION_ONLY` kill-switch mechanism in `workers/content-publishing/src/index.ts` AND an
    equivalent test at `workers/content-publishing/src/__tests__/index.test.ts` (different path, same
    coverage) — confirmed by reading both files directly.
  - `warp-nebula.tsx`/`warp-nebula-lazy.tsx`: a decorative Three.js particle-nebula landing-page component
    (16,000-particle spiral, `prefers-reduced-motion` aware per its own header comment), wired into a
    `cinematic-entrance.tsx` on that same branch. Seen but not evaluated further this pass — purely
    decorative, not load-bearing, lower priority than the two test files; recorded honestly as unchased
    rather than silently dropped.
  - **`pricing-drift-guard.test.ts`: RECOVER_WHOLE — genuinely missing, genuinely valuable, ported this
    pass.** `pdcswh`'s existing `pricing-phases.test.ts` only unit-tests the `PRICING_PHASES` data structure
    itself; it does NOT do the codebase-wide source-scan this test does (walks `app/`, `components/`, `lib/`
    for any hardcoded literal matching a known `PRICING_PHASES` price string outside the canonical
    `pricing-phases.ts` file). Ported verbatim, then run against the live `pdcswh` tree BEFORE deciding to
    land it — it found a genuine, live violation: `apps/web/lib/pricing/promo-codes.ts:64`'s `GALAXYFOUNDING`
    promo's `offer` string hardcoded `"Founding rate: Pro $99/yr, Elite $179/yr..."` as a literal instead of
    deriving it from `PRICING_PHASES`. Fixed in the same pass (matches CLAUDE.md's own "single source of
    truth" pricing-ladder rule): added `import { PRICING_PHASES } from "./pricing-phases"`, looked up the
    FOUNDING phase specifically via `PRICING_PHASES.find((p) => p.id === "FOUNDING")` (mirroring the existing
    pattern in `phase-readiness.ts`) — not `getCurrentPricingPhase()`, since this promo describes the
    FOUNDING rate specifically, which stays fixed forever per the grandfather guarantee regardless of
    whatever phase is currently live — and interpolated the annual prices into the offer string. The promo
    itself remains `active: false, ownerApproved: false` (fully inert, no live billing effect) — this is a
    drift-safety fix, not a live pricing change.
- Code: `apps/web/__tests__/pricing-drift-guard.test.ts` (new, ported verbatim from
  `claude/magical-volta-4kilty`), `apps/web/lib/pricing/promo-codes.ts` (4-line additive fix: 1 import, 1
  constant, 1 string interpolation — the promo's other 90+ lines and every other promo code untouched).
- Evidence: `cd apps/web && npx vitest run __tests__/pricing-drift-guard.test.ts __tests__/pricing-value-
  architecture.test.ts __tests__/pricing-phases.test.ts` → 28/28 green (2 new, 26 pre-existing unaffected);
  `npx tsc --noEmit` clean; `npm run guardrails` → 17/17 green; full `apps/web` suite confirmed green (exact
  count in the commit); `git diff --check` clean.
- Alternatives rejected: adding `promo-codes.ts` to the test's `ALLOW_LIST` instead of fixing the hardcode —
  rejected because the whole point of the canonical pricing ladder (per CLAUDE.md) is that nothing outside
  `pricing-phases.ts` should hardcode a price, and this promo is exactly the kind of copy that would silently
  go stale on a phase advance if exempted.
- Reversibility: trivially revertible (one new test file, a 4-line change to one existing file, zero runtime/
  billing behavior change since the promo stays inert).
- Protected zones: pricing/subscription-tier copy (CLAUDE.md's named pricing ladder) — low-risk since the
  fix only changes how an already-inert promo's description is computed, not any live price or billing path.
- Files: `apps/web/__tests__/pricing-drift-guard.test.ts` (new), `apps/web/lib/pricing/promo-codes.ts`
  (modified).
- Supersedes: none. Disposition for the full 22-branch cluster: **ARCHIVE_ONLY** (all 22 are abandoned,
  divergent daily snapshots superseded by `pdcswh`'s independent evolution) EXCEPT the one recovered asset
  above, now landed. No deletion receipts written this pass (deletion itself is founder-gated and a separate
  explicit step per the reconciliation contract); this entry is the evidence a future receipt-writing pass
  can cite. R11.5's remaining slices (name-pattern clusters beyond `magical-volta`, and the recency-based
  subset — branches with a last-commit date on/after 2026-07-01) remain open, dependency-ready,
  non-owner-gated next items.

## DEC-047 — Recovery Wave R11.5, second slice: the 43-branch recency subset (2026-07-18)

- Date: 2026-07-18
- Workstream: R11.5's second bounded slice — the 43 long-tail branches (excluding `magical-volta-*`, already
  triaged in DEC-046) with a last-commit date on/after 2026-07-01, per `BRANCH_PR_LEDGER.json`'s
  `longTailEntries`. Documentation-only pass (no code changes) — every RECOVER_WHOLE candidate found needs
  its own dedicated freeze contract with dependency-compatibility verification before landing, mirroring the
  DEC-045 precedent of not forcing a port just because a branch was reached during triage.
- Method: for every branch, `git merge-base --is-ancestor origin/<branch> HEAD` (all 43 returned exit 1 —
  none are literal ancestors, so ancestry alone doesn't triage this set, unlike the R11 wave's 12
  proven-ancestor branches), then `git diff --name-status --diff-filter=A HEAD origin/<branch>` (files
  genuinely absent from `pdcswh` — the same method that worked cleanly for DEC-046), then `git diff
  --shortstat` for scale, then direct content reads for anything with a nonzero novel-file count.
- **20 branches — ALREADY_ON_PDCSWH (high confidence, real evidence).** The 13 `codex/api-v1-*`-named
  branches plus 7 same-lineage branches under different names (`codex/commercial-revenue-core`,
  `codex/media-revenue-studio`, `codex/media-revenue-metric-api-closeout`, `codex/fable-nfl-evidence-
  integration`, `codex/evidence-api-v1-shadow-seam`, `codex/api-persistence-shadow-adapter`, `codex/api-
  consumer-registry-shadow`) are ONE single incremental lineage (confirmed via 3 separate `merge-base
  --is-ancestor` checks against the lineage's tip, `codex/api-v1-disposable-rehearsal-packet` — all exit 0),
  and every one shows ZERO files present on the branch tip that are absent from `pdcswh` (`git diff --name-
  status --diff-filter=A` returns empty). Spot-checked `apps/web/lib/api/v1/consumer-registry.ts` directly:
  byte-identical between the branch tip and `pdcswh` HEAD (both 285 lines, empty diff). `pdcswh` has 17
  `api-v1*` test files vs. the branch's 16 — a superset, not a gap. This entire cluster (a staged, disciplined
  "public API v1" build with shadow/dormant/disposable-rehearsal safety patterns matching this campaign's
  own vocabulary) was independently absorbed into `pdcswh` at some earlier point in its own history; `scripts/
  guardrails/api-v1-boundary.mjs` — this exact guardrail — is already running in every `npm run guardrails`
  invocation this session.
- **23 branches — ALREADY_ON_PDCSWH (evidence-based extrapolation, not exhaustively verified).** All 23
  show exactly ONE novel file: `apps/web/lib/source-rights/source-rights-registry.ts`. Sampled 6 of the 23
  directly (`picks-states-conversion`, `webhook-billing-hardening`, `nfl-pbp-expected-metrics-wiring`,
  `salvage-settlement-guardrails`, `canonical-host-www`, `honest-degraded-states`) — all 6 are byte-identical:
  an 18-line re-export shim pointing to `@/lib/scraping/source-rights-registry` (confirmed `pdcswh` already
  has the canonical file at that path). `pdcswh`'s own independent history consolidated this file from `lib/
  source-rights/` to `lib/scraping/` at some point; these 23 branches all predate that consolidation and are
  small, early-stage feature attempts (1-14 commits ahead of a nearby merge-base) that got abandoned almost
  immediately after forking. `git diff --shortstat` across all 23 shows a tightly clustered, consistent range
  (1,028-1,668 insertions, 56K-92K deletions each vs. `pdcswh` HEAD) with no outlier suggesting hidden
  modified-file content beyond the shim — but the other 17 of the 23 were NOT individually content-reviewed
  beyond this diff-stat sanity check, recorded honestly rather than silently claimed as fully verified.
- **`claude/crypto-payments` — new OWNER_GATE candidate, NOT investigated further.** 11 novel files: a full
  alternative payment rail (Coinbase Commerce webhook route, `/api/billing/crypto-checkout`, a `crypto-pass`
  billing module, 2 Prisma migrations adding a crypto payment provider and a commerce charge ledger). Squarely
  a billing/payments protected zone (`CLAUDE.md`'s documented payment stack is Stripe-only; crypto payments
  are not a currently-documented capability) AND includes database migrations, which this campaign's own
  rules (`CONTINUOUS_EXECUTION_CONTRACT.md` §8) reserve for founder action. Not evaluated for implementation
  quality or completeness — the decision of whether to accept crypto payments at all is a founder product/
  business call, not something to investigate toward a port.
- **`codex/galaxy-dynasty-v2-autonomous` — ARCHIVE_ONLY.** 27 novel files: a 3D "Galaxy Dynasty" city/game
  experience (GLB game-asset chunks, Higgsfield-generated models, a `/galaxy-dynasty` page, game-QA
  screenshots and smoke tests). Large, self-contained, product-scope question (is a 3D game surface still a
  planned feature? not addressed anywhere in current `CLAUDE.md`) — joins the already-`ARCHIVE_ONLY` #52
  (`claude/gracious-albattani-f63wx1`, "Galaxy Dynasty world-graph") as a second, later, differently-scoped
  attempt at the same product concept.
- **`claude/magical-feynman-j9180p` — ARCHIVE_ONLY, groups with the Dynasty cluster.** 9 novel files: dynasty
  progression/profile-loader BACKEND logic (`lib/dynasty/dynasty-progression.ts`, `load-dynasty-profile.ts`,
  `/api/dynasty/me`, `/dynasty` page) — distinct in kind from `galaxy-dynasty-v2-autonomous`'s 3D assets. This
  is now a THIRD independent "Dynasty" attempt found across this reconciliation campaign (#52, `galaxy-
  dynasty-v2-autonomous`, this branch) — recorded together as a cluster needing one dedicated future
  reconciliation pass (which attempt, if any, is the canonical basis) rather than picked apart piecemeal here.
- **`claude/dfs-optimizer-edge` — RECOVER_WHOLE candidate, next bounded item, NOT ported this pass.** 17
  novel files. Read `dfs-optimizer-edge.ts`'s header directly: it imports `optimizeOne`/`metrics`/`objOf`
  FROM `./dfs-optimizer` — the exact file `pdcswh` already has (task #36's "DFS dominance" exact DP solver,
  already shipped) — confirming this is an ADDITIVE layer, not a rival/superseded attempt. Adds `dfs-exact.ts`
  (cash-game exact optimizer) and, most notably, `dfs-correlation.ts` (GPP/tournament lineup selection via
  simulated-ceiling ranking under correlation + ownership leverage — ownership-leverage-aware tournament
  strategy `pdcswh`'s current cash-game-only optimizer does not have). Not ported this pass: 17 files including
  competitive-intel docs need a proper freeze contract, and `dfs-optimizer.ts`/`dfs-slate.ts`/`lib/
  integrations/dfs.ts` (files this branch's code imports from) need their own current-HEAD drift check first,
  same discipline as Wave R8 Group A's 4-file check.
- **`claude/consensus-accuracy-engine` — RECOVER_WHOLE candidate, not yet investigated for dependency
  compatibility.** 8 novel files: fantasy consensus-rankings + expert-accuracy tracking
  (`consensus-rankings.ts`, `expert-accuracy.ts` + tests). Plausible, self-contained fantasy-analytics value;
  not yet checked against `pdcswh`'s current fantasy module shape.
- **8 branches — NOT YET CHECKED this pass, explicitly excluded rather than silently dropped:**
  `claude/intraday-odds-scheduler` (3 novel files), `claude/galaxy-sports-edge-audit-outqdi` (3),
  `claude/freshness-badge` (3), `claude/odds-freshness-diagnostics` (2), `claude/night-shift` (2), `claude/
  launch-review-fixes` (2), `claude/humanize-polish` (2), `claude/design-critique-zd94h2` (2). Small enough
  (2-3 novel files each) to be cheap for a future continuation of this same slice.
- Evidence: every claim above is from a directly-run `git` command in this session (`merge-base
  --is-ancestor`, `diff --name-status --diff-filter=A`, `diff --shortstat`, `diff` on specific file pairs,
  `cat-file -e` existence checks) — none inherited from an agent report, continuing the DEC-046 process
  lesson of reproducing before ruling.
- Alternatives rejected: porting `dfs-optimizer-edge` or `consensus-accuracy-engine` immediately, since they
  were reached during triage — rejected in favor of naming them as scoped future items with their own freeze
  contracts, consistent with the campaign's "smallest coherent implementation" and "no rushed untested feature
  ports under diminishing session budget" discipline.
- Reversibility: N/A — no code changed this pass.
- Protected zones: `claude/crypto-payments` (billing/payments + migrations, OWNER_GATE candidate, no further
  action without founder input).
- Files: none changed. Documentation-only triage entry.
- Supersedes: none. Wave R11.5 status: `magical-volta-*` cluster (DEC-046) and this 43-branch recency subset
  (DEC-047) both triaged. Two RECOVER_WHOLE candidates named for future bounded items (`dfs-optimizer-edge`,
  `consensus-accuracy-engine`); one new OWNER_GATE candidate (`claude/crypto-payments`, pending a founder
  decision on whether to even pursue crypto payments before any further investigation); a 3-way Dynasty
  cluster (#52, `galaxy-dynasty-v2-autonomous`, `magical-feynman-j9180p`) needing one dedicated future
  reconciliation pass; 8 small branches not yet checked; ~43 other long-tail branches beyond this 43 +
  22 (`magical-volta`) = 65 triaged remain in the tail (per `BRANCH_PR_LEDGER.json`'s 138 total long-tail
  count) for a future slice.

## DEC-048 — Recovery Wave R11.5 follow-on: `dfs-optimizer-edge` ported (2026-07-18)

- Date: 2026-07-18
- Workstream: the first of two RECOVER_WHOLE candidates named in DEC-047. Ports a GPP (tournament)
  correlation-aware DFS lineup layer from the historical `claude/dfs-optimizer-edge` branch onto `pdcswh`'s
  already-shipped exact cash-game DFS optimizer (task #36, `apps/web/lib/fantasy/dfs-optimizer.ts`).
- Contract frozen after a dependency drift-check on the 3 files the ported code imports from:
  `dfs-slate.ts` and `lib/integrations/dfs.ts` are byte-identical between the branch and `pdcswh` HEAD (zero
  adaptation); `dfs-optimizer.ts` itself had drifted substantially (462-line diff) because `pdcswh`'s own
  independent history already replaced the historical branch's randomized-restart heuristic optimizer with
  an exact dynamic-program solver (the same task #36) — a strictly better, already-shipped, already-tested
  implementation that this port must not regress.
- Code: 3 new files — `apps/web/lib/fantasy/dfs-exact.ts` (an independently-implemented exact DP solver:
  single/multi-lineup optimum, k-best diverse-pool generation, a legality/objective-preserving "late-swap"
  operation), `dfs-correlation.ts` (Monte-Carlo-style GPP tournament ranking under player correlation —
  shared team/game/idiosyncratic normal draws so same-team and same-game players' simulated outcomes co-move
  correctly — and ownership leverage, which a naive point-sum objective cannot compute), `dfs-optimizer-
  edge.ts` (`selectGppLineups()`, the production GPP path: exact diverse pool → correlation-aware ranking →
  top N with full glass-box metrics; `bestStackPair()`, a same-team QB+pass-catcher finder; and a `benchmark()`
  diagnostic, see below) — plus their 3 test files, all ported near-verbatim.
- `apps/web/lib/fantasy/dfs-optimizer.ts` (pdcswh's existing file) received exactly 4 purely-additive lines:
  `objVal` and `salaryOf` (previously private) gained the `export` keyword; two new one-line exports were
  added, `eligible(p, slot)` (reusing the file's own existing `FLEX_POS` constant — zero new logic) and
  `objOf(lineup, mode)` (a one-line reduce wrapper around `objVal`). Zero changes to any existing function
  body, export signature, or behavior — confirmed via direct diff read, independently re-confirmed by
  red-team.
- **A real compatibility break found and fixed, not papered over.** The historical branch's `benchmark()`
  compared the new engine against "the incumbent heuristic" via `optimizeOne(opts, undefined, restarts,
  slate)` — a 4-argument call assuming a randomized-restart local-search heuristic. `pdcswh`'s current
  `optimizeOne` is `(opts, decay, slate)`: 3 arguments, no restarts, because it's ALREADY the exact DP solver
  (no heuristic left to benchmark against). Reframed the comparison honestly: `Benchmark.cash` changed from
  `{..., heuristicBest, heuristicWorst, optimalityGap}` to `{..., incumbentObjective,
  objectiveGapVsIncumbent}` — cross-checking two INDEPENDENTLY-IMPLEMENTED exact solvers for the same
  combinatorial optimum, which must agree if both are correct (disagreement would expose a real bug in
  either). Two tests adapted to match, in the STRICTER direction per `.claude/rules/tests-and-claims.md`
  ("do not weaken assertions... to make new code pass"): `toBeGreaterThanOrEqual` (exact ≥ weak heuristic)
  became `toBeCloseTo(x, 6)` (exact ≈ independent exact) — a near-equality check is strictly harder to pass
  than a one-sided inequality, and it empirically passes, which is itself a meaningful new correctness proof
  neither solver had before (two independent implementations of the same optimization problem agreeing to
  6 decimal places). A third call site (a late-swap test using `optimizeOne` only to generate a starting
  lineup, unrelated to the heuristic-comparison logic) just had the now-nonexistent `restarts` argument
  dropped.
- Independent review: one `gse-red-team` pass, resumed once via the standing agent-stall protocol. **Zero
  CONFIRMED or PLAUSIBLE findings across all 10 review points**, including empirically re-running the exact-
  vs-incumbent cross-check tests directly (41/41 passed) rather than trusting the description, hand-verifying
  `dfs-correlation.ts`'s correlation math (confirmed `team² + game² ≤ 1` holds for every position so the
  idiosyncratic-variance term never goes negative/NaN, confirmed shared per-team/per-game normal draws are
  the mathematically correct way to induce correlated simulation outcomes), confirming zero live wiring
  (grep across all of `apps/web` finds only the module's own files and tests), and confirming the founder-
  gated illustrative-slate pattern (`activeDfsSlate()`, unmodified) is used as the default parameter
  everywhere the new code reads a slate. One non-blocking observation noted (not a finding): `dfs-exact.ts`'s
  header cites specific patent numbers with a "design-around, confirm FTO with counsel" note — a pre-existing
  documentation style already used in `dfs-optimizer.ts`, not a new legal-clearance claim, and carries no
  production risk given zero live consumers.
- Evidence: `cd apps/web && npx tsc --noEmit` clean; targeted DFS tests 41/41 green (`dfs-optimizer.test.ts`
  22/22 pre-existing unaffected, `dfs-exact.test.ts`, `dfs-correlation.test.ts`, `dfs-optimizer-edge.test.ts`
  all new and green); full `apps/web` suite → 644 files / 8,701 tests, all green (was 641/8,670 before this
  item); `npm run guardrails` → 17/17 green; `git diff --check` clean.
- Alternatives rejected: overwriting `pdcswh`'s current exact-DP `dfs-optimizer.ts` with the historical
  branch's older randomized-heuristic version — rejected outright as a severe regression of already-shipped,
  already-tested work; dropping the `benchmark()` diagnostic entirely instead of adapting it — rejected since
  the honest reframe (cross-check between two independent exact solvers) preserves genuine value and is a
  stronger correctness proof than the original heuristic comparison, not a lesser one.
- Reversibility: 6 new files (delete to roll back) + a 4-line strictly-additive change to one existing file
  (single revert commit). No migrations, no new routes, no live wiring — zero customer-facing behavior change.
- Protected zones: fantasy/DFS is real-money-contest-adjacent; mandatory red-team completed, zero findings,
  explicit focus on the founder-gated illustrative-slate default and zero live wiring.
- Files: `apps/web/lib/fantasy/dfs-exact.ts` (new) + test, `dfs-correlation.ts` (new) + test,
  `dfs-optimizer-edge.ts` (new) + test, `dfs-optimizer.ts` (4-line additive modification).
- Supersedes: none. Closes the `dfs-optimizer-edge` item from DEC-047. `consensus-accuracy-engine` (task #70)
  and the 8 not-yet-checked small branches (task #71) remain the next R11.5 follow-on items.

## DEC-049 — Recovery Wave R11.5 follow-on: `consensus-accuracy-engine` ported; retroactive lint-gap fix (2026-07-18)

- Date: 2026-07-18
- Workstream: the second of two RECOVER_WHOLE candidates named in DEC-047. Ports a fantasy consensus-
  rankings + expert-accuracy-grading capability from the historical `claude/consensus-accuracy-engine`
  branch onto `pdcswh`.
- Contract frozen after a dependency check on the one file the ported code touches, `apps/web/lib/fantasy/
  players.ts`: the drift there is purely additive (`pdcswh`'s current `Player` type is a strict superset,
  gaining 3 new optional fields — `injuryDisplay`, `adp`, `adpDelta` — nothing removed or renamed), so the
  ported code compiled cleanly with zero adaptation.
- Code: 5 new files — `apps/web/lib/fantasy/consensus-rankings.ts` (aggregates multiple ranking sources into
  one board via a Borda-style point scheme; makes accuracy-weighting the DEFAULT rather than an opt-in filter,
  falling back to equal weight — flagged in the output, never silently — when no grading history exists),
  `expert-accuracy.ts` (grades any ranked source against realized outcomes by converting each source's
  preseason rank into an implied point projection via the rank-slot's own realized production curve, then
  scoring by the gap from what actually happened; documents two deliberate divergences from FantasyPros'
  publicly-documented methodology, both closing gaps their own FAQ describes), plus 3 test files. Both files'
  headers are explicit that they build on FantasyPros' publicly-disclosed CONCEPT with attribution, not a
  claim to replicate their undisclosed proprietary formula — GSE's own Borda point scale and omission-penalty
  rule are original.
- Independent review: one `gse-red-team` pass, resumed once via the standing agent-stall protocol. Found
  **2 CONFIRMED findings, both fixed**:
  1. An unused `PLAYERS` import in `consensus-integration.test.ts` — passes `tsc`/`vitest`/`guardrails` but
     fails `npm run lint` (a required CI step none of those three commands run). Fixed by removing the
     unused import.
  2. `ConsensusRow.avgRank`'s doc comment claimed "points-weighted average implied rank," but the
     implementation computes a plain unweighted mean, and `best`/`worst`/`sourcesCounted`/`avgRank` all
     count every source that ranked a player — including ones weighted to 0 by `accuracyWeightedConsensus`
     — while `points` (the actual ranking score) IS correctly weighted. Red-team independently reproduced
     this with a throwaway test (deleted afterward, tree confirmed clean). Resolved as a doc-and-naming fix,
     not a behavior change: `avgRank`/`best`/`worst`/`sourcesCounted` are legitimately meant to be raw,
     unweighted transparency stats ("what did the sources actually say," visible even when a source's
     opinion is down-weighted to near zero in the actual score) — the bug was the misleading claim, not the
     computation. Corrected the `ConsensusRow` type's doc comments to say so explicitly, and renamed the
     local `weightedAvg` variable to `plainAvgRank` so the code doesn't relabel itself into the same trap
     later.
- **A broader process gap this review surfaced, fixed retroactively.** The red-team's finding #1 exposed
  that this session's verification loop for every prior item (DEC-046, DEC-048) ran `tsc --noEmit`, targeted
  `vitest`, and `npm run guardrails` — but never a full-workspace `npx eslint . --max-warnings=0`, which is
  what CI's `npm run lint` step actually runs and none of the other three commands cover. Ran it for the
  first time this pass and found 3 MORE pre-existing lint errors, all in already-committed, already-pushed
  work from earlier this session: `apps/web/__tests__/pricing-drift-guard.test.ts` (DEC-046) used a
  CommonJS `require("fs")` inside a function instead of an ES import (`no-require-imports`); `apps/web/lib/
  fantasy/dfs-exact.ts` and `dfs-optimizer-edge.ts` (both DEC-048) each had one unused type/value import
  left over from the historical branch's original import list. All 4 errors (this item's 1 + the 3
  retroactive ones) fixed in this same pass; `npx eslint . --ext .js,.jsx,.ts,.tsx --max-warnings=0` now
  clean across the whole `apps/web` workspace. Recorded honestly here rather than silently folded into
  DEC-046/048's history, since those entries are append-only and already pushed — this entry is the fix
  record for both.
- Evidence: `cd apps/web && npx tsc --noEmit` clean; `npx eslint . --ext .js,.jsx,.ts,.tsx --max-warnings=0`
  clean (0 errors, was 4); targeted tests 57/57 green across all 8 touched/new test files (consensus ×3,
  dfs ×4, pricing-drift-guard ×1); full `apps/web` suite confirmed green (exact count in the commit); `npm
  run guardrails` → 17/17 green; `git diff --check` clean.
- Alternatives rejected: changing `avgRank`'s computation to be genuinely points-weighted instead of fixing
  the doc comment — rejected because the raw/unweighted transparency framing for `best`/`worst`/
  `sourcesCounted`/`avgRank` is a legitimate, defensible design (show what sources actually said, separately
  from the down-weighted score), and guessing at a "correct" weighted formula with no clear specification
  risked a wider, less-understood behavior change than the situation warranted.
- Reversibility: 5 new files (delete to roll back) + zero changes to any existing file for the core port;
  the retroactive lint fixes are each single-line, trivially revertible.
- Protected zones: none directly (zero live wiring, confirmed by red-team); dispatched red-team anyway for
  consistency with this session's standard rigor on every substantive port.
- Files: `apps/web/lib/fantasy/consensus-rankings.ts` (new) + test, `expert-accuracy.ts` (new) + test,
  `consensus-integration.test.ts` (new) — plus the retroactive fixes to `apps/web/__tests__/pricing-drift-
  guard.test.ts`, `apps/web/lib/fantasy/dfs-exact.ts`, `apps/web/lib/fantasy/dfs-optimizer-edge.ts`.
- Supersedes: none. Closes the `consensus-accuracy-engine` item from DEC-047 and both named RECOVER_WHOLE
  candidates. Task #71 (8 not-yet-checked small branches) is the next R11.5 follow-on item.

## DEC-050 — Recovery Wave R11.5 follow-on: 8 remaining small branches triaged; live refund-window
  contradiction found and fixed (2026-07-18)

- Date: 2026-07-18
- Workstream: closes out the 8-branch tail named at the end of DEC-047/DEC-049 — the last unchecked slice of
  the 43-branch recency subset before the long-tail triage totals can be updated.
- Method: real evidence for every branch — `git diff --name-status --diff-filter=A origin/pdcswh origin/<branch>`
  to find novel files, then direct content reads of anything novel (never name-pattern inference alone).
- **5 branches ARCHIVE_ONLY, zero recoverable content**: `claude/odds-freshness-diagnostics`,
  `claude/night-shift`, `claude/launch-review-fixes`, `claude/humanize-polish`,
  `claude/design-critique-zd94h2`. Each has exactly zero novel files vs `pdcswh` beyond the same two stale
  `handoff/codex/typecheck-prisma-baseline/*.log` run-log artifacts that appear on nearly every long-tail
  branch checked this wave (confirmed noise, not evidence of anything unrecovered).
- **`claude/freshness-badge` — ARCHIVE_ONLY.** One novel file, `handoff/claude/overnight-2026-07-01/
  MORNING-BRIEF.md` — a dated overnight handoff status note, not a code asset. Read in full; nothing in it
  describes work absent from `pdcswh`.
- **`claude/intraday-odds-scheduler` — NEW OWNER_GATE candidate, not landed.** One novel file:
  `.github/workflows/refresh-odds-schedule.yml`, a well-built GitHub Actions scheduled workflow that would
  add 6 intraday crons (9am-7:30pm ET) hitting the live production `/api/cron/refresh-odds` route with a
  `CRON_SECRET` bearer token, on top of Vercel's existing single daily cron, so published picks price off
  lines no more than ~2-3h old instead of up to 24h old, with the workflow's own comment noting
  `ODDS_FRESHNESS_MAX_HOURS` could then be tightened from 12 toward 4. The design fails closed (skips with
  exit 0 if the repo secret is unset; only transport/auth failures fail the job) and touches no product code.
  Not landed anyway: this is CI/CD pipeline configuration with a real production cost/behavior footprint (6x
  the daily call volume to The Odds API, a new repo secret to provision and rotate, and a cron cadence
  decision that only takes effect once merged to the default branch — GitHub Actions `schedule` triggers
  never fire on a non-default branch, so nothing activates by landing this on `pdcswh`, but it is still an
  infrastructure decision, not a code-correctness one). Same treatment as `claude/crypto-payments`
  (DEC-047): recorded here with full content for founder review, not evaluated further by this campaign.
- **`claude/galaxy-sports-edge-audit-outqdi` — the one branch with real, actionable content.** Its novel
  file `PUBLIC_FINDINGS_FOR_GROK.md` is a self-audit naming 3 specific "launch-blocker" claims with
  file:line citations. Each was independently re-verified against live `pdcswh` HEAD rather than trusted:
  - Blocker 1 (a stale/incorrect claim about the free-tier pick count) — **already fixed** on `pdcswh`;
    current code matches the audit's own recommended fix.
  - Blocker 3 (a claim about missing loading-state handling on a specific dashboard surface) — **already
    fixed** on `pdcswh`; the named component already has the honest loading/empty/error states the audit
    asked for.
  - **Blocker 2 — genuinely still live: a Terms/pricing refund-policy contradiction.** `/pricing`,
    `tier-gate-panel.tsx`, `/faq`, and `trust-claims.ts`'s canonical approved-claims registry all promised an
    unconditional 3-day money-back guarantee, while `/terms` §5 said refunds were "at our discretion" with
    no fixed window and said nothing about the founding-rate grandfather guarantee prominently promised on
    `/pricing`. Grep-sweeping for the underlying "3-day vs 7-day" number after the initial fix surfaced the
    contradiction was wider than the one file the audit named: `tier-gate-panel.tsx:108`,
    `start-in-sixty.tsx` (dead/unimported component, fixed anyway to prevent a future landmine — both its
    rendered title and its header comment), and `trust-claims.ts`'s `pricing.money-back-window` registry
    entry all still said "7-day." Resolved which number is authoritative using the registry's own
    `LAST_REVIEW = "2026-05-18"` timestamp (older than every other date signal touching this claim) plus the
    preponderance of "3-day" mentions on `/pricing` itself, the most purchase-decision-critical surface —
    concluding "3-day" is current and every "7-day" instance is stale drift, not the reverse.
- Contract frozen, then code: rewrote `/terms` §5 from one paragraph into three — (1) the existing
  auto-renewal/cancellation text, unchanged in substance; (2) an explicit, unconditional 3-day money-back
  window matching `/pricing`/`/faq`, discretionary only outside that window; (3) the founding-rate
  grandfather guarantee, newly codified in the Terms, with a "without a lapse in billing" caveat verified
  (not assumed) against `price-ids.ts`'s actual Stripe mechanism: `checkoutPriceId()` always returns the
  CURRENT price at checkout time, and only an EXISTING subscription's original price id is recognized as
  grandfathered by `tierForPriceId()` — so a canceled-then-resubscribed customer genuinely would re-enter at
  the current, non-founding price, making the caveat a true statement of the system's actual behavior, not
  invented language. Fixed the 3 additional live "7-day" instances found via the grep sweep (above). Bumped
  `legal-dates.ts`'s `TERMS_LAST_UPDATED` from `2026-06-20` to `2026-07-18` with a doc comment naming exactly
  what legal text changed and why, per the file's own governing rule that this constant is a static,
  hand-maintained record of genuine text revisions, never render-time. Updated `legal-dates.test.ts`'s 4
  pinned date assertions to match (`PRIVACY_LAST_UPDATED`-related assertions untouched — that document did
  not change).
- Independent review: one `gse-red-team` pass on `/terms`, stalled twice with zero synthesis output (unlike
  every earlier stall this session, which returned partial text) — escalated via the standing agent-stall
  protocol (gentle nudge, then an explicit "STOP investigating, call ReportFindings now" directive), which
  produced a synthesis on the third resume. **2 CONFIRMED findings, both fixed** (the live `tier-gate-panel.tsx`
  "7-day" contradiction and the un-bumped `TERMS_LAST_UPDATED`, both described above) and **1 PLAUSIBLE
  finding** (the "lapse in billing" caveat's factual grounding), independently self-verified as accurate by
  reading `price-ids.ts`/`pricing-phases.ts` directly rather than taken on the red-team's word alone.
- Evidence: `cd apps/web && npx tsc --noEmit` clean; `npx eslint . --ext .js,.jsx,.ts,.tsx --max-warnings=0`
  clean (0 errors); targeted tests (`legal-dates.test.ts`, `no-em-dash-copy.test.ts`,
  `public-copy-scanner.test.ts`, `trust-claims.test.ts`, `numeric-performance-claims.test.ts`) 64/64 green;
  full `apps/web` suite 8725/8725 green across 647 files; `npm run guardrails` 17/17 green; `npm run build`
  succeeded; `git diff --check` clean.
- Alternatives rejected: fixing only the one line the audit document named — rejected once the grep sweep
  showed the same false claim live in 3 more places, which would have landed a fix that still contradicted
  itself elsewhere; treating the grandfather-guarantee addition as scope creep to defer — rejected because
  `/pricing` already prominently promises it and the Terms' total silence on it was itself part of the same
  cross-page contradiction the audit was flagging, not a separate feature.
- Reversibility: 6 files touched, all textual (Terms copy, 2 UI copy strings, 1 trust-claims registry string,
  1 date constant + its test) — single revert commit undoes the whole item. No migrations, no schema change,
  no new routes.
- Protected zones: public legal/pricing copy and the approved-claims registry are both protected surfaces;
  mandatory red-team completed per policy.
- Files: `apps/web/app/terms/page.tsx`, `apps/web/components/pricing/tier-gate-panel.tsx`,
  `apps/web/components/home/start-in-sixty.tsx`, `apps/web/lib/trust-claims.ts`,
  `apps/web/lib/legal-dates.ts`, `apps/web/__tests__/legal-dates.test.ts`.
- Supersedes: none. Closes task #71 and Wave R11.5's 8-branch tail. `claude/intraday-odds-scheduler`
  remains an open OWNER_GATE candidate (not a blocker on anything else). Remaining long-tail branches beyond
  the 73 now triaged (of 138 total per `BRANCH_PR_LEDGER.json`) are the next available R11.5 slice.

## DEC-051 — Recovery Wave R11.5: accounting correction + next 30-branch slice; one real secret
  finding (not landed) (2026-07-18)

- Date: 2026-07-18
- **Accounting correction, recorded honestly rather than silently fixed.** Before starting this slice,
  recomputed the running R11.5 total from first principles (build the precise set of every individually-named,
  individually-evidenced branch across DEC-046 through DEC-050, then `set`-subtract from the full 138-branch
  `longTailEntries` list) rather than trusting the prior "73/138" headline, which turned out to be wrong in
  two ways: (1) DEC-047's own "13 `codex/api-v1-*`-named branches" claim overcounts by 3 — `git branch -r`
  confirms only 10 branches with that exact prefix exist repo-wide (11 total including
  `codex/evidence-api-v1-shadow-seam`, which DEC-047 already counted separately in its "7 same-lineage"
  group); (2) the running "65/138" then "73/138" headlines were carried forward from DEC-047's own "43-branch"
  summary number without ever adding back the 13 additional branches that same DEC-047 pass separately named
  and dispositioned in the same breath (`crypto-payments`, the 2-branch Dynasty cluster, `dfs-optimizer-edge`,
  `consensus-accuracy-engine`) — real, evidenced dispositions that simply weren't in the "43" headline's
  arithmetic. The true precisely-evidenced count walking into this slice was **58**, not 73. Recorded here
  per this campaign's own standing rule (DEC-049's retroactive lint-fix precedent): fix forward, disclose the
  correction, do not silently rewrite an already-pushed, append-only entry.
- Method for this slice: computed the exact 80-branch remaining pool (138 minus the 58 precisely-known), then
  `git diff --name-status --diff-filter=A` against `pdcswh` for every branch in the pool, sorted by novel-file
  count ascending (cheapest/most tractable first). Processed the 1-novel-file tier (17 branches) and the
  2-novel-file tier (13 branches) in full — 30 branches, real evidence for every one.
- **17 branches — ALREADY_ON_PDCSWH, now individually confirmed (closes a gap DEC-047 flagged).** Every one
  of the 17 has exactly one novel file, `apps/web/lib/source-rights/source-rights-registry.ts` — spot-checked
  4 by `md5sum` against DEC-047's own known-good sample (`claude/picks-states-conversion`): byte-identical
  (`eec522b6...`). `git diff --shortstat` for 5 of the 17 shows the same signature range DEC-047 documented
  for this cluster (1,355-1,678 insertions / 65K-73K deletions vs. `pdcswh`). DEC-047 named this cluster as
  "23 branches, only 6 sampled, the other 17 NOT individually content-reviewed" — this pass individually
  confirms exactly those missing 17, closing the gap with real evidence rather than extrapolation. Branches:
  `claude/add-ladder-events-migration`, `claude/checkout-consent-disclosure`, `claude/fantasy-august-draft-
  pool`, `claude/glass-ledger-edge-engine`, `claude/hotfix-audit-paywall-leak`, `claude/legal-last-updated-
  honesty`, `claude/money-path-test-gaps`, `claude/nfl-expected-points-metrics`, `claude/paywall-enforcement-
  audit`, `claude/picks-paywall-copy-truth`, `claude/premium-analytics-rate-limit`, `claude/preview-line-
  movement-gate`, `claude/preview-sport-slug-urls`, `claude/stripe-entitlement-reconcile`, `claude/trends-
  engine-ingestion`, `codex/sunday-frontier-maxforce-2026-07-05`, `docs/competitive-landscape-2026-07`. (Note:
  several of these names closely resemble already-completed tasks in this campaign — e.g.
  `nfl-expected-points-metrics` vs. task #27's NFL PBP wiring, `trends-engine-ingestion` vs. task #24 — real
  evidence confirms they are early, abandoned, content-empty snapshots, not duplicates of live work.)
- **9 branches — ARCHIVE_ONLY, zero recoverable content.** Same stale
  `handoff/codex/typecheck-prisma-baseline/*.log` pair seen throughout this wave, nothing else:
  `claude/codex-fixes-launch-53`, `claude/gse-no-claim-waitlist`, `claude/gse-project-review-m6vrza`,
  `claude/phase5-secret-scan-ci-all-mode`, `claude/test-suite-hermetic-local`, `claude/trust-surface-
  correctness-fixes`, `design/2026-flagship`, `feat/sentient-interface`, `feat/sentient-interface-v2`.
- **`claude/adoring-knuth-mhg8m4`, `claude/friendly-fermat-fy99m2`,
  `codex/upgrade-galaxy-statking-to-nfl-intelligence-system` — new RECOVER_WHOLE candidate named, NOT
  ported this pass.** All 3 independently carry byte-identical copies (`md5sum` confirmed) of the same
  2-file asset: `warp-nebula.tsx` (a deterministic, ~16K-particle Three.js nebula flythrough for a landing-
  page cinematic entrance) + `warp-nebula-lazy.tsx` (its `next/dynamic` `ssr:false` boundary). Read in full:
  follows the exact same documented discipline as `pdcswh`'s already-live `ShaderAurora`/`ConsensusEngine3D`
  hero components (`apps/web/components/hero/*`, confirmed present) — deterministic `mulberry32` seed (no
  hydration drift), `prefers-reduced-motion` → one static frame, WebGL-unavailable → renders nothing, pauses
  when tab hidden, DPR clamped, full dispose on unmount, decorative only. Not wired into any page on any of
  the 3 branches. A plausible, well-built sibling asset — not ported this pass because it needs its own
  freeze contract (which page mounts it, confirm zero duplication with the existing hero visual tier) rather
  than a rushed port, consistent with this campaign's standing restraint discipline.
- **`claude/fix-local-setup-PmnyX` — investigated, explicitly NOT ported: contains a hardcoded API key.**
  2 novel files, `scripts/local.sh` + `scripts/README.md` — a generically useful one-command local dev
  bootstrap (Docker Compose up, `.env` generation, Prisma generate/push/seed, then run app + worker).
  Read `local.sh` in full. Every other credential in its generated `.env` heredoc is an explicit placeholder
  (`sk_test_placeholder`, `pk_test_placeholder`, `whsec_placeholder`, blank `GOOGLE_CLIENT_ID`/`SECRET`,
  blank `ANTHROPIC_API_KEY`) — but `THE_ODDS_API_KEY` is hardcoded to a concrete 32-character hex literal,
  not a placeholder. This is a real `CLAUDE.md` rule-4 ("no secrets in code") violation: landing this file
  as-is would commit what is shaped exactly like a live API credential into git history. The string does not
  appear anywhere in the current `pdcswh` tree (`grep` confirmed empty). Not evaluated further and explicitly
  not ported — this is a founder-relevant finding (the key may need rotating if it was ever live), not
  something to silently drop or silently sanitize-and-land without disclosure. No further git-history search
  performed (a full `git log -S` across all 138 branches timed out and was abandoned rather than run
  unbounded).
- Evidence: every disposition above is from a directly-run `git diff --name-status --diff-filter=A` /
  `git diff --shortstat` / `git show <ref>:<path> | md5sum` / direct file read this session — none inherited
  from an agent report or prior extrapolation, continuing this campaign's "reproduce before ruling" discipline.
- Alternatives rejected: porting `warp-nebula.tsx` immediately since it was already fully read and looks
  ready — rejected for the same reason DEC-047 deferred `dfs-optimizer-edge`/`consensus-accuracy-engine`
  rather than rush-porting them mid-triage; landing `local.sh` with the hardcoded key stripped out silently —
  rejected because silently sanitizing and landing would bury a real secret-hygiene finding that the founder
  should see, not just have quietly fixed on their behalf.
- Reversibility: N/A — no code changed this pass (documentation/ledger only).
- Protected zones: none touched (no code landed). The `local.sh` finding is itself a protected-zone-adjacent
  observation (secrets-in-code), recorded per policy rather than acted on unilaterally.
- Files: `docs/frontier/DECISION_REGISTER.md`, `reports/reconciliation/RECOVERY_WAVES.md` only.
- Supersedes: corrects (does not delete) DEC-047's "13 `codex/api-v1-*`" branch-count claim and every
  downstream "65/138"/"73/138" running-total headline through DEC-050 — the underlying dispositions in those
  entries remain correct, only the aggregate arithmetic was off. True running total after this slice:
  **58 (precise, walking in) + 30 (this slice) = 88 of 138** long-tail branches individually evidenced.
  Remaining 50-branch pool (novel-file counts from 3 up to 701) is the next R11.5 slice; several of those
  (`claude/keen-ptolemy-*` cluster, `codex/galaxy-dynasty-studio-rescue-v2`, `safety/sports-wip-2026-06-04`,
  `claude/compassionate-ramanujan-qqt5nb`, `fix/overnight-codex-feature-gates-260524`,
  `codex/autonomy-release-command-center-2026-05-28`) have 100+ novel files and need dedicated,
  individually-scoped triage passes, not a batch sweep.

## DEC-052 — Recovery Wave R11.5: 26-branch slice (novel-file counts 3-11); several sensitive/protected-zone
  items flagged, none investigated beyond filenames (2026-07-18)

- Date: 2026-07-18
- Workstream: continues R11.5 into the next-cheapest tier of the remaining pool (novel-file counts 3-11,
  26 branches) using the same method — `git diff --name-status --diff-filter=A` against `pdcswh`, then
  targeted content reads only where a disposition genuinely required it.
- **11 branches — ARCHIVE_ONLY, confirmed noise.** All 11 carry only the same 5-file
  `_overnight_quarantine/*` cluster (`README.md`, `api-picks-elite.test.ts.bad`, 3 `index.lock*` variants).
  Read the quarantine `README.md` directly: it self-describes as "files/dirs renamed out of the way during
  the overnight rebuild because the sandbox ACL would not let me delete them... safe to remove," referencing
  a Windows path (`C:\Users\Garrett\Documents\Claude\Projects\AI Sports`) — confirmed operational debris
  from a local rebuild session, not product content. Branches: `airwave/gse-gsn-overnight-intelligence-v1`,
  `claude/edge-map-rebuild-2026-06-04`, `claude/festive-cray-knb0xp`, `claude/gracious-cori-zwqiqs`,
  `claude/vigilant-archimedes-8m5fry`, `codex/doctrine-fonts-worldclass-hero-2026-05-29`, `codex/homepage-
  finish-doctrine-2026-05-30`, `galaxy/fable5-2026-public-world-v1`, `jarvis/command-interface-v1`,
  `jarvis/command-interface-v2`, `jarvis/intelligence-os-foundation-v1`. (Several more branches in this
  same tier carry this identical quarantine cluster ALONGSIDE other novel content — for those, only the
  quarantine part is noise; see below.)
- **`claude/warp-nebula` asset cluster grows to 10 branches total.** Beyond the 3 named in DEC-051
  (`adoring-knuth-mhg8m4`, `friendly-fermat-fy99m2`, `codex/upgrade-galaxy-statking-to-nfl-intelligence-
  system`), this slice finds the same byte-identical `warp-nebula.tsx`/`warp-nebula-lazy.tsx` pair in 7 more:
  `claude/brave-hamilton-g7mlqd`, `claude/wonderful-ptolemy-qh7pnq`, `garrett/resource-dump-2026-06-15`
  (carries nothing else beyond this + the quarantine noise), `claude/laughing-thompson-x9xr6f`,
  `claude/happy-euler-trkihe`, `claude/eloquent-goldberg-der80z`, `claude/nifty-hopper-au7wib` (the last 4
  also carry additional distinct novel content, itemized below). Ten independent branches converging on the
  same asset strengthens rather than weakens the case that this is a genuinely wanted, still-unshipped
  feature — still not ported this pass (same reasoning as DEC-051: needs its own freeze contract, a chosen
  mount point, and a dedup check against the existing hero visual tier), but now recorded as the strongest
  RECOVER_WHOLE candidate in the long tail.
- **`claude/debug-previous-fix-g06Wz` — clean cross-platform setup-script trio, new RECOVER_WHOLE
  candidate.** `scripts/setup.sh`/`setup.cmd`/`setup.ps1` — verified NO hardcoded secret literal in any of
  the 3 (grepped for `ODDS_API_KEY`/`sk_live`/inline key patterns; the only match is a print statement
  telling the user to set `THE_ODDS_API_KEY` themselves) — unlike `fix-local-setup-PmnyX`'s `local.sh`
  (DEC-051), which hardcoded a live-shaped key. Copies from `.env.example` instead. Plausible complement or
  improvement to `local.sh` (adds Windows support); not ported — needs comparison against `scripts/local.sh`
  and existing `scripts/morning-setup.mjs` to avoid landing a duplicate.
- **The following are named with real evidence and explicitly NOT investigated further this pass — several
  touch protected zones or sensitive business content, and this campaign's rule is to flag rather than
  casually read/port anything in that category:**
  - `claude/laughing-thompson-x9xr6f` — `apps/web/app/api/nfl/coaches/route.ts` + `apps/web/lib/nfl/
    coaches.ts` (an NFL-coaches data feature) + warp-nebula. Plausible real feature; needs its own review.
  - `claude/happy-euler-trkihe` — `apps/web/lib/tracker/segments.ts` + test (a tracker-segmentation
    feature) + warp-nebula + quarantine noise. Plausible real feature; needs its own review.
  - `gse-goldmine-2026-06-27` — `GOLDMINE_MANIFEST.md` + `apps/web/components/cockpit/NgsVisualizer.tsx`.
    **Flagged as data-rights protected zone**: this repo's own `no-raw-ngs-export.mjs` guardrail exists
    specifically to police NGS (NFL Next Gen Stats, licensed data) export/display claims — a component
    named `NgsVisualizer` needs to pass through that same scrutiny before any evaluation, not be casually
    read. Filename only recorded here; content not read this pass.
  - `claude/debug-previous-fix-WYyxi` — `.github/dependabot.yml`, the setup-script trio (same as
    `debug-previous-fix-g06Wz`), plus core lib files: `apps/web/lib/auth-actions.ts`, `picks-data.ts`,
    `slate-data.ts`, and **`packages/ingestion-pipeline/src/settle-results.ts`** — settlement is an explicit
    protected zone per this campaign's own rules. Not read beyond the filename list; needs a
    dedicated, individually-scoped freeze contract before any comparison to current settlement code.
  - `research/proven-edge` — `docs/GSE_INTERNAL_MASTER.md`, `docs/GSE_PUBLIC_OVERVIEW.md`,
    `packages/prediction-engine/src/gse-method-spec.ts` + `gse-score.ts` + 2 tests. Prediction-engine
    scoring/methodology is a protected zone; not read beyond filenames. Possibly an early precursor to the
    already-live `docs/math/GSE_PROPRIETARY_METRIC_BIBLE.md` / `docs/ip/GSE_METRIC_IP_LEDGER.md` — needs a
    dedicated compatibility check, not assumed either superseded or valuable.
  - `claude/galaxy-sports-corporate-structure-Cni9A` — `docs/corporate-structure.md`, `docs/galaxy-sports-
    edge-master-action-plan.md`, and 3 product specs (`email-lifecycle-spec.md`, `referral-attribution-
    spec.md`, `stripe-webhook-decisioning-spec.md`). **Flagged as sensitive business content — filenames
    only, content deliberately NOT read.** Corporate-structure documents are founder-owned business
    information; recording existence and location for founder awareness is the correct scope for an agent,
    not evaluating or summarizing the content.
  - `claude/eloquent-goldberg-der80z` — warp-nebula, `apps/web/components/motion/constellation-field.tsx`,
    5 "presenter" `.webp` image files (`alt-girl`, `blonde-casual-chic`, `blonde-cheer`, `blonde-gameday`,
    `blonde-sundress`), `docs/ops/OVERNIGHT_PROMPT.md`. **Flagged as sensitive — human-appearing image
    assets for an apparent "presenter"/spokesperson feature not mentioned anywhere in current `CLAUDE.md`.**
    Images not opened; filenames only. This needs explicit founder awareness (licensing/provenance of the
    images, whether a presenter persona is even an intended product direction) before any technical
    evaluation, not a code-quality judgment from this agent.
  - `claude/dazzling-newton-NFI8X` — `apps/web/components/hero/signal-breach-intro.tsx` +
    `docs/experience-director-audit-2026.md`. Named, not read beyond filenames.
  - `claude/clever-bohr-po46pm` — `docs/ai-ops/current-handoff.md` + `usage-conservation-stack.md`. Likely
    stale operational handoff notes from an earlier session; low priority, named not read.
  - `fix/overnight-operator-doc-guards-260524` — `apps/web/__tests__/operator-docs-safety.test.ts`.
    Possibly a legitimate safety-test addition; named, not read this pass.
  - `claude/nifty-hopper-au7wib` — warp-nebula, `constellation-field.tsx`, 4 real test files
    (`board-signature-interaction.test.ts`, `public-cosmic-cohesion.test.ts`, `top-routes-seo-metadata.
    test.ts`, `ux-contrast.test.ts`), and `docs/ops/{LESSONS,NIGHT_AUDIT,NIGHT_QUEUE,OVERNIGHT_PROMPT}.md`.
    The 4 test files look like a promising a11y/SEO/UX-coverage RECOVER_WHOLE candidate; named, not read
    beyond confirming the filenames this pass.
- Evidence: every disposition is from a directly-run `git diff --name-status --diff-filter=A` and, only
  where needed to confirm noise-vs-signal, a direct `git show` read (the quarantine `README.md`, the
  3 setup-script files' grep for secret literals) — no content read for anything flagged as sensitive/
  protected-zone above.
- Alternatives rejected: reading `corporate-structure.md` or the presenter images to give a fuller
  disposition — rejected because this campaign's own scope is technical reconciliation, not business-content
  or brand/likeness judgment calls that belong to the founder; opening `NgsVisualizer.tsx` or
  `settle-results.ts` to assess quality before a dedicated freeze contract — rejected for the same reason
  DEC-045 reclassified Group A2 as OWNER_GATE rather than porting on inspection: protected-zone content gets
  a scoped contract first, not an ad hoc read.
- Reversibility: N/A — no code changed this pass (documentation/ledger only).
- Protected zones: settlement (`settle-results.ts`), prediction-engine scoring methodology
  (`gse-score.ts`/`gse-method-spec.ts`), NGS licensed-data display (`NgsVisualizer.tsx`), and sensitive
  business/corporate content are all named above and explicitly deferred, not evaluated.
- Files: `docs/frontier/DECISION_REGISTER.md`, `reports/reconciliation/RECOVERY_WAVES.md` only.
- Supersedes: none. Running total after this slice: **88 (walking in) + 26 (this slice) = 114 of 138**
  long-tail branches individually evidenced. Remaining pool is 24 branches, all with 13+ novel files
  (several 100+), the next R11.5 slice — each needs its own dedicated, individually-scoped pass.

## DEC-053 — Correction: `warp-nebula.tsx` is a superseded regression, not a recovery candidate
  (2026-07-18)

- Date: 2026-07-18
- **Corrects DEC-051 and DEC-052, which both named the `warp-nebula.tsx`/`warp-nebula-lazy.tsx` asset
  (found byte-identical across 10 independent stranded branches) as "the strongest RECOVER_WHOLE candidate
  in the long tail." That characterization was wrong. Real evidence, found while scoping a future freeze
  contract for it (not part of the branch-by-branch triage method): `pdcswh` already built, shipped, and
  then twice superseded this exact concept, and currently enforces a regression test that forbids it.**
- Evidence, in order of discovery:
  1. `apps/web/components/landing/cinematic-entrance.tsx` (present on `pdcswh` today) opens with its own
     header comment: *"Rebuilt 2026-06 for calm + clarity + zero lag. The previous version flew the visitor
     through a real-time WebGL warp tunnel (16k Three.js particles) past ten waypoints that swept by faster
     than they could be read... It looked busy, the copy was unreadable, and it stuttered on laptops and
     integrated GPUs."* This is a precise description of `warp-nebula.tsx` itself (a ~16,000-particle
     Three.js tunnel-flight nebula) — `pdcswh`'s own history already tried this exact pattern and explicitly
     replaced it for performance and readability reasons.
  2. `cinematic-entrance.tsx` (the REPLACEMENT for the warp version) is itself not imported anywhere in the
     app (`grep -rln "CinematicEntrance"` finds only the component file and one test) — it was itself
     superseded by a second generation.
  3. The currently-live entrance is `apps/web/components/landing/montage-entrance.tsx`, imported into
     `apps/web/app/page.tsx` (`<MontageEntrance />`), whose own header comment calls it *"Galaxy Sports
     Edge's single cinematic cold-open... The official approved brand reveal (Brand Bible v1.0)"* — a
     produced MP4 reveal, not a real-time particle simulation.
  4. `apps/web/__tests__/homepage-doctrine-hero.test.ts:57` contains a live regression assertion:
     `expect(page).not.toContain("CinematicEntrance")` — `pdcswh` actively enforces, in CI, that the
     warp-tunnel's own direct successor stays OUT of the homepage. Landing `warp-nebula.tsx` (two
     generations further back, with the specific documented problems the successor was built to fix) would
     contradict both an explicit design decision and its enforced regression guard.
- **Corrected disposition: `warp-nebula.tsx`/`warp-nebula-lazy.tsx` is ARCHIVE_ONLY across all 10 branches
  that carry it** (the 3 from DEC-051 plus the 7 from DEC-052) — not a recovery candidate. The 10-branch
  convergence is better read as: many independent sessions forked around the same May/June period, before
  the warp-tunnel's performance/readability problems were discovered and fixed, so they all inherited the
  same now-obsolete asset — convergence here is a symptom of a common ancestor, not independent validation
  of ongoing value. This does not change any branch's OTHER dispositions from DEC-051/052 (e.g.
  `claude/laughing-thompson-x9xr6f`'s NFL-coaches feature, `claude/happy-euler-trkihe`'s tracker-segments
  feature, or the presenter-image/test-suite findings) — only the `warp-nebula` component itself.
- **Process note, recorded honestly per this campaign's DEC-051 precedent (fix forward, disclose, do not
  silently rewrite an already-pushed entry):** the branch-triage method used throughout R11.5 (diff a
  stranded branch against `pdcswh` HEAD, read the novel files) correctly identifies content `pdcswh` LACKS,
  but cannot by itself detect content `pdcswh` HAD and deliberately REMOVED — that requires checking the
  live tree's own history/comments for the same concept, which this pass did only after the fact, prompted
  by scoping a "which page would mount this" freeze-contract question for what was assumed to be a genuine
  candidate. Recommend this additional check (grep pdcswh's own git log / component headers for the asset's
  concept, not just its exact filename) become standard practice before naming any future long-tail asset a
  RECOVER_WHOLE candidate, not just before actually porting one.
- Alternatives rejected: leaving DEC-051/052's characterization uncorrected since "no code was ever
  landed" — rejected because the ledger's purpose is to be a reliable guide for FUTURE sessions deciding
  what to build next; an uncorrected "strongest candidate" label pointing at a known-bad pattern would waste
  a future session's effort discovering the same thing again, or worse, result in it being ported without
  this check.
- Reversibility: N/A — no code changed (this entry and the disposition table only).
- Protected zones: none (public landing-page UX, not a protected zone) — this is a design/performance
  correction, not a policy one.
- Files: `docs/frontier/DECISION_REGISTER.md`, `reports/reconciliation/RECOVERY_WAVES.md` only.
- Supersedes: the `warp-nebula` RECOVER_WHOLE characterization in DEC-051 and DEC-052. All other findings in
  both entries stand unchanged.

## DEC-054 — MAJOR FINDING: a pre-existing, never-executed branch reconciliation plan already lives on
  `pdcswh`, naming 3 of the long-tail branches with explicit disposition (2026-07-18)

- Date: 2026-07-18
- Workstream: discovered while independently spot-checking the one surviving finding from the first
  24-branch investigation workflow (`claude/laughing-wozniak-gyryjx`, which came back
  `RECOVER_WHOLE_CANDIDATE` for a substantial DFS product build). This is the single most consequential
  finding of Wave R11.5 — it reframes 3 branches from routine batch-triage subjects into pre-authorized,
  independently-confirmed-still-relevant recovery targets, and surfaces that this exact reconciliation work
  was already scoped by an earlier session and never carried out.
- **The discovery, in order:**
  1. `apps/web/lib/platform/integrity-ledger.ts` — `pdcswh`'s own honest capability-tracking ledger (BUILT /
     WIRED / PROVEN / PUBLIC_SAFE per system, explicitly "the antidote to drift") — has a `model-promotion`
     entry: `builtStatus: "PARTIAL", wiredStatus: "NO", provenStatus: "NO"`, with
     `ownerGate: "lives on claude/laughing-wozniak-gyryjx — cherry-pick onto trunk per
     BRANCH_RECONCILIATION.md"` and `nextAction: "cherry-pick the promoter; gate promotion on
     no-calibration-regression + sample floor."` This is a direct, named, in-repo pointer to a specific
     stranded branch as a known-missing-capability's source.
  2. `docs/strategy/BRANCH_RECONCILIATION.md` — present on `pdcswh` today (dated 2026-06-22, authored by a
     "proven-edge session"), a complete one-page reconciliation plan that explicitly inventories and
     dispositions branches, including THREE that are also in R11.5's long-tail set:
     - **`claude/laughing-wozniak-gyryjx`**: *"OOS split harness + champion/challenger promoter
       (`oos-split.ts`, `model-promoter.ts`, 14 tests); the 6 cockpit 'intelligence/fantasy' pages; DFS
       optimizer... **Cherry-pick the OOS promoter onto trunk** (it's the genuinely-missing piece and is
       built on the same primitives). Evaluate the cockpit/DFS pages separately."* Listed under §6 as
       **"Agent-doable on trunk."**
     - **`claude/happy-goodall-8lkxrb`**: *"`apps/web/lib/gse/` decision-intelligence layer (~25 pure/typed,
       DB-free modules, 118 tests: trust-loop, drift, promotion-readiness, Black-Litterman, Glicko2,
       Dixon-Coles, etc.); the Revenue Activation Plan doc... **Lands on top later** as the decision/UX/
       scoring-math layer — adapter by adapter onto the real pipeline, never a blind merge (see §5)."*
     - **`research/proven-edge`**: named as **the designated trunk for the whole "moat" initiative** —
       *"Trunk for the moat = `research/proven-edge`... built on the real `packages/prediction-engine` +
       `apps/web/lib/performance` primitives that actually ship in production (CLV grading, calibration,
       devig, Merkle proof-of-record)."*
  3. **Independently re-verified, not taken on the document's word — both still-relevant candidates confirmed
     genuinely still missing from `pdcswh` today, three-plus weeks after the plan was written:**
     - `grep`/`find` for `model-promoter.ts`, `oos-split.ts`, or any champion/challenger auto-promotion
       mechanism on `pdcswh`: none found. The only adjacent capability, `apps/web/lib/model/model-court.ts`
       (a live, tested, wired process-governance gate), explicitly assumes an underlying promoter exists —
       its own header comment: *"This is the process discipline around the statistical promoter (champion/
       challenger): the promoter measures, the court governs."* The measurer itself is still absent.
     - `apps/web/lib/gse/` on `pdcswh` today contains only 6 files (`content-drafts.ts`,
       `no-bet-methodology.ts`, 4 waitlist files) — none of the ~25 decision-intelligence modules
       (`trust-loop`, `drift`, `promotion-readiness`, Black-Litterman, Glicko2, Dixon-Coles) the
       reconciliation doc describes for `happy-goodall-8lkxrb`. Confirmed still genuinely missing.
     - `research/proven-edge`'s designated "trunk" role appears **largely already absorbed** by `pdcswh`'s
       own subsequent independent evolution: `pick-proof-receipt.ts`, `proof-of-record.ts`,
       `clv-capture.ts`, `clv-decomposition.ts`, `probability-calibration.ts`, and `calibration-apply.ts`
       all already exist on `pdcswh` (visible in `packages/prediction-engine/src/` today) — consistent with
       this campaign's own extensive CLV/calibration/proof work (DEC-029 through DEC-034 "Glass Ledger,"
       task #4's CLV decomposition, and more) having independently reached or superseded what this June
       document proposed. `research/proven-edge` was already separately triaged in DEC-052 (8 novel files:
       `GSE_INTERNAL_MASTER.md`, `GSE_PUBLIC_OVERVIEW.md`, `gse-method-spec.ts`/`gse-score.ts` + 2 tests) and
       flagged as prediction-engine-methodology protected zone, not read further — that disposition stands;
       this entry adds the context that its "trunk" ambition specifically looks superseded, not that its
       remaining novel files (the methodology docs/spec) have been individually evaluated.
- **What this means for R11.5 and for the campaign:**
  - **`claude/laughing-wozniak-gyryjx` is upgraded from a routine triage subject to the single
    highest-confidence recovery candidate found in this entire 138-branch reconciliation** — not because an
    agent judged it valuable, but because `pdcswh`'s own tooling (the integrity ledger) and an earlier
    session's own written plan both already say so, and this pass independently re-confirmed the gap is
    still real. Its full novel-file list (spot-checked directly, not agent-reported): a self-contained
    `apps/web/lib/dfs/*` product tree (optimizer/solver, parsers, simulation, late-swap, calibration/
    autopsy, narrative signals, portfolio analytics, lineup thesis — 15 `/api/dfs/*` routes, 6 cockpit
    pages) with **zero path overlap** with `pdcswh`'s existing DFS work (`apps/web/lib/fantasy/dfs-*.ts`,
    a single `/api/dfs/salaries` route) — confirmed complementary, not duplicate. Plus
    `packages/prediction-engine/src/model-promoter.ts` + `oos-split.ts` (the explicitly-named missing
    piece) + `packages/types/src/dfs.ts`. Also carries genuine business-sensitive content (owner report,
    revenue playbook, competitive intelligence, DFS-affiliate legal/compliance docs) that must stay
    unread/flagged per this wave's standing sensitivity rule.
  - **`claude/happy-goodall-8lkxrb` is confirmed a still-valid, pre-authorized RECOVER_WHOLE candidate** for
    its `lib/gse/` decision-intelligence layer, per the existing doc's own landing plan (§5: adapters onto
    the real pipeline, one capability at a time, gated on consuming real persisted data and not duplicating
    a canonical §4 concept).
  - **NOT executed in this pass.** Both are real, multi-file ports touching the model/calibration protected
    zone (model-promotion is explicitly named in `CLAUDE.md`'s and this session's own standing "never...
    change protected... calibration... MODEL_VERSION policy" boundary). Even though
    `BRANCH_RECONCILIATION.md` §6 itself calls the promoter cherry-pick "agent-doable," this session's
    external standing instructions are the controlling authority and are stricter — a capability that
    governs how the live model's predictions get promoted deserves its own full FREEZE CONTRACT → CODE →
    TARGETED TEST → RED-TEAM cycle (the same rigor DEC-048/049 gave smaller, non-protected-zone ports),
    not a same-pass port folded into a triage sweep. **This is named as the campaign's single highest-value
    next dedicated-port target once the current 24-branch triage closes.**
- Alternatives rejected: cherry-picking `model-promoter.ts`/`oos-split.ts` immediately since the repo's own
  document authorizes it — rejected because "agent-doable" in a June planning doc does not override this
  session's own explicit, more conservative standing boundary on calibration/MODEL_VERSION-adjacent changes;
  trusting the first workflow run's single surviving agent-reported disposition without independent
  verification — rejected per this campaign's "reproduce before ruling" discipline, especially given that
  same workflow run failed 17/18 agents and its one success deserved the same scrutiny as any other claim.
- Reversibility: N/A — no code changed (this entry only; the reconciliation doc itself is pre-existing,
  untouched).
- Protected zones: model-promotion/calibration (named explicitly, not touched); DFS-affiliate legal/business
  content (named, not read).
- Files: `docs/frontier/DECISION_REGISTER.md` only (does not modify `docs/strategy/BRANCH_RECONCILIATION.md`
  or `integrity-ledger.ts`, both pre-existing and left as-is).
- Supersedes: none — adds authoritative context to `claude/laughing-wozniak-gyryjx` and
  `claude/happy-goodall-8lkxrb`'s dispositions ahead of the routine 24-branch batch-triage findings for the
  same two branches (which independently run in a currently in-flight workflow and will be folded in without
  contradicting this entry).

## DEC-055 — Recovery Wave R11: 12 deletion receipts issued (2026-07-18)

- Date: 2026-07-18
- Workstream: closes Wave R11 — `reports/reconciliation/DELETION_RECEIPTS.md` previously held only
  "candidates, not receipts" for the 12 branches proven pure-ancestors of `origin/main` in an earlier pass.
  Per `docs/genesis/BRANCH_RECONCILIATION_CONTRACT.md` invariant #8 ("No branch deletion without a deletion
  receipt. The receipt must prove all unique useful changes are merged, deliberately archived, or explicitly
  rejected with reasons."), writing the receipt itself is a distinct, low-risk, agent-doable step, separate
  from deletion (which stays founder-only, never performed by this agent).
- Method: `git fetch origin`, then for each of the 12 candidate branches, independently re-verified (not
  inherited from the prior candidate list without re-checking) via `git merge-base --is-ancestor <branch>
  origin/main` and `git rev-list --count origin/main..<branch>`.
- **All 12 re-confirmed**: ancestor-of-main = true, 0 commits ahead, for every branch. This is the
  contract's strongest evidence tier (exact commit-graph ancestry) — proves every commit on each branch is
  already reachable from `main`'s current tip, i.e. zero unique content exists on any of them.
- One branch, `claude/blissful-hamilton-d7edx1`, is independently corroborated by DEC-054's
  `docs/strategy/BRANCH_RECONCILIATION.md` discovery: that June planning doc named this exact branch as
  carrying the de-paywall pivot + `postinstall: prisma generate` fix, "merging to `main` first" during a
  prod firefight. Its confirmed 0-commits-ahead ancestor status today is live proof that merge did happen.
- Wrote the 12 actual receipts (branch, head SHA, ancestor status, commits-ahead, disposition = "merged, no
  unique content") into `DELETION_RECEIPTS.md`, replacing the "empty by design / candidates only" framing.
  Each receipt explicitly states it is proof, not deletion authorization, and warns that a receipt should be
  re-verified immediately before any future deletion if significant time has passed (a force-push or history
  rewrite on any of these refs — unlikely but not impossible — would invalidate it).
- Evidence: 12 `git merge-base --is-ancestor` + `git rev-list --count` command pairs, all run this session,
  exact output captured in the receipt table.
- Alternatives rejected: leaving the document in "candidates only" state — rejected because the contract's
  own invariant #8 asks specifically for a receipt as the deletion precondition, and producing it now (while
  explicitly not deleting anything) is strictly more useful to a founder who later decides to clean up than
  leaving the proof undone; deleting the branches directly — never considered, outside this agent's authority
  under every standing instruction this campaign has operated under.
- Reversibility: N/A — no branches touched, no code changed; this entry and the receipt document only.
- Protected zones: none.
- Files: `docs/frontier/DECISION_REGISTER.md`, `reports/reconciliation/DELETION_RECEIPTS.md`,
  `reports/reconciliation/RECOVERY_WAVES.md` (R11 row marked DONE).
- Supersedes: none. Closes Wave R11.
