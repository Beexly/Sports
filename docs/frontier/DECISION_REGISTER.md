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
