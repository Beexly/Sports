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
