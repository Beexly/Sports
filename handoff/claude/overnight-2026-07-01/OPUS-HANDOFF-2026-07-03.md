# OPUS HANDOFF — 2026-07-03 (from Fable 5, written at Garrett's request)

Repo: `C:\Users\Garrett\Sports`, branch `claude/night-shift`, HEAD `ac369699`
(everything below is committed + pushed). Garrett is on CREDIT TOKENS — be
token-lean: work solo with context in hand; NO agent fleets unless a task is
genuinely parallel and he approves the spend.

## THE BEHAVIORAL CONTRACT (non-negotiable — Garrett has enforced each of these hard)

1. **Never call a pasted dump "fake/hallucinated/rabbit hole."** Execute the
   checkable claims FIRST (parse it, run it, `git fetch` to check "commit posted"
   claims), then extract the real merit. Every prior dismissal turned out to
   contain something real; every verdict must carry executed evidence.
2. **Steelman → salvage.** When code is wrong, name the specific executed defect
   AND harvest the underlying idea if it's real (precedent: the entire Pedersen
   arc came from broken stubs).
3. **Numbers law.** Every number you write in a doc/test/comment comes from a run
   you actually executed, the repo, or is explicitly attributed as unverified
   literature. (Fable hallucinated "951" in its own provenance doc — the hostile
   pass caught it. It happens to you too.)
4. **Dark/additive only.** No live flag flips (CALIBRATION_ADJUSTMENTS_ENABLED,
   RECONSTRUCTION_FEATURES_ENABLED, CRYPTO_PAYMENTS_ENABLED stay off). No merges
   to main (owner's single gated command). Push only to `claude/night-shift`.
   Nothing that changes a PUBLISHED number without Garrett's explicit go.
5. **Hostile-verify BEFORE commit** for anything security-sensitive; for the
   rest, run the affected suites + typecheck before every commit.
6. **Work autonomously; don't pester.** Ledger owner-gated items, don't ask
   repeatedly.

## WHAT JUST HAPPENED (context you need)

Eight Grok "dump waves" were fully worked (map: `ZK-ML-DUMP-EXTRACTION-LEDGER.md`
in this folder — read it before touching anything). Shipped this session, all
dark/engine-only, all tested: calibration-map (Platt/Beta/CV-selection),
calibration-commitment, calibration-sequence (anytime calibration monitor),
simhash, linear-thompson, anytime-fold API, pedersen-ledger (finite-field, in
engine) and `packages/crypto` (@sports/crypto — secp256k1 Pedersen via @noble,
the ONLY package with a runtime dep; engine stays zero-dep).

**The latest self-audit finding (ac369699):** the anytime-valid tiers assume
de-correlated input. Measured H0 false positives: calibration-sequence inflates
to 0.118–0.252 under same-game correlation (vs 0.05 budget); anytime-ledger
(which feeds the LIVE-gated "checked continuously" sentence in
`apps/web/lib/performance/public-roi-policy.ts`) holds at 2 markets/game (0.036)
but hits 0.11 at 3 perfectly-correlated markets/game. Caveats + regression tests
are committed; the PROPER fix is owner-gated (see queue below).

## DO NEXT, IN ORDER

### 1. Full-tree certification (~15 min, cheap)
Only targeted suites ran after ac369699. Run and report:
```
cd packages/prediction-engine && npx tsc --noEmit && npx vitest run
cd packages/crypto            && npx tsc --noEmit && npx vitest run
cd apps/web                   && npx tsc --noEmit
```
Expected: engine ~71 files / ~736 tests green, crypto 12 green, web tsc clean.
Fix anything red before all else.

### 2. Personally hostile-audit simhash.ts + linear-thompson.ts (the real gap)
These two were BUILT BY WORKFLOW AGENTS and have only their own tests — they
never got an independent adversarial pass (every other module did, and every
such pass has found something). Do it YOURSELF by execution, no fleet:
- Contract: null on degenerate input / NEVER throw on data; deterministic
  (seeded); immutability where claimed.
- simhash: zero vector, NaN entries, dim mismatch, bits=1 and bits=64
  boundaries, empty corpus, duplicate vectors, multiprobe ordering determinism,
  and whether `estimatedCosine` claims match measurement.
- linear-thompson: near-singular A (Cholesky), dim > MAX_LIN_TS_DIM, non-finite
  reward/context, v=0 refusal, `updateLinTs` truly does not mutate, RNG-cursor
  determinism claim (same seed + same call sequence → identical actions).
Write throwaway probe tests, run them, DELETE the probes, pin real regressions
for anything found, fix, commit with executed evidence in the message.

### 3. Memory update
Append to `C:\Users\Garrett\.claude\projects\C--Users-Garrett\memory\project-gse-overnight-five-branches.md`:
the correlation finding (numbers above, commit ac369699), that the self-audit
fleet was stopped to save credits and replaced by personal probes, and this
handoff file's path.

### 4. (Only if Garrett asks / tokens allow) The sealed-slate E2E composition test
The strongest remaining artifact: ONE executable engine-level test walking the
full "proof-of-reserves for predictions" flow — pre-kickoff Merkle slate root
(slate-commitment.ts) + Pedersen per-pick commitments (@sports/crypto) →
settlement → publish aggregate + blinding → `verifyLedgerAggregate` verifies the
total WITHOUT opening picks → bind the lot via calibration-commitment fields.
Pure test, no product wiring, proves all 8 waves COMPOSE. Do not start it if
tokens are tight.

## OWNER-GATED QUEUE (Garrett's calls — keep visible, do NOT do autonomously)
- **Loader de-correlation**: pass ≤1 pick per game into the anytime tier in
  `loadPublicRoiPolicy` (changes a published number + DB query).
- Merge night-shift (+ the five validated branches in memory) into main.
- `commitPick`/`commitPickSlate` adapters in @sports/crypto (Garrett rejected
  the engine version once — build ONLY on explicit ask).
- `packages/crypto` production group is fine, but any PUBLIC surface consuming
  it is a new claim → sign-off first.
- Stray git remote `server` (no URL) in repo config — harmless; his call.

## IF ANOTHER GROK WAVE ARRIVES
Follow the wave protocol (see ledger waves 3–8 for worked examples):
(a) execute every checkable claim (parse/run/remote-check) and record verdicts;
(b) extract + tag real survey content into the ledger (Reality-Ladder tags);
(c) if there's real merit in code, build the CORRECTED version with tests and
measured numbers; (d) commit each wave with the evidence in the message.
Known Grok patterns: `valid:true` hardcoded stubs; "// tested" on code that
throws ReferenceError; echoing OUR OWN pushed commits back as its "upgrades";
recited benchmark numbers ~10x off measured. Also known: its SURVEYS are
usually accurate and its wave-8 secp256k1 direction was genuinely right —
falsify the specifics, harvest the merit.

## KEY FILES
- `handoff/claude/overnight-2026-07-01/ZK-ML-DUMP-EXTRACTION-LEDGER.md` — the map of everything.
- `packages/prediction-engine/src/` — all wave modules + tests.
- `packages/crypto/` — @sports/crypto (secp256k1 Pedersen; @noble v2 API notes in module doc: import paths need `.js`, order = `Point.Fn.ORDER`, `multiply(0)` throws → zero-guard).
- `apps/web/lib/performance/public-roi-policy.ts` — the live-gated public claim surface; treat every sentence in it as a legal artifact.
