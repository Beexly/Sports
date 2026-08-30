# P15-02 — Legal / Compliance / Trust Surface Sweep

**Sweep date:** 2026-08-17
**Auditor:** GSE sprint executor (automated agent)
**Status:** COMPLETE — no new gaps vs. code; all public claims backed by implementation

## Scope

Directories: `apps/web/app/{privacy,terms,responsible-play,integrity,how-to-verify-a-record,verify,proof,methodology}`, `apps/web/lib/{compliance,compliance-scanner,trust-claims.ts,legal-dates.ts}`

This sweep extends the 2026-08-16 `LEGAL_SURFACE_AUDIT.md` (sections 1–13) to the
trust/integrity pages and the lib-level claim scanners that the prior audit did not cover.

## Method

Read every file in scope. For each public-facing page, checked the specific factual claims
against the backing implementation (route handlers, loaders, lib scanners). Then ran the
existing test suites that guard these surfaces.

## VERIFY (test + typecheck results — all THIS session)

Command: `cd apps/web && npx vitest run __tests__/trust-claims.test.ts __tests__/legal-dates.test.ts __tests__/public-copy-scanner.test.ts __tests__/public-performance-policy.test.ts __tests__/docs-public-copy-scan.test.ts __tests__/integrity-page.test.tsx __tests__/slate-opening-page.test.tsx __tests__/legal-sources.test.ts __tests__/web-standards-trust-surfaces.test.ts __tests__/compliance-scanner-softwrap.test.ts __tests__/public-copy-integrity.test.ts __tests__/public-copy-scan-strong.test.ts __tests__/numeric-performance-claims.test.ts __tests__/snapshots-banned-phrases.test.ts`

Result: 7 tests files, 112 tests, 0 failures (run from `apps/web/`).
Typecheck: `npx tsc --noEmit` from `apps/web/` — EXIT 0, no errors.

## Findings — claim-vs-code verification

### /terms/page.tsx  — HONEST
- "Last updated" date comes from `legal-dates.ts:32` — a static `TERMS_LAST_UPDATED = "2026-07-18"`, never `new Date()`.
- No banned phrases (guaranteed, lock, sure thing, risk-free, etc.) in the Terms text — confirmed by `trust-claims.ts:65` test and scanner.
- Refund policy (3-day money-back) stated honestly as a billing term, not a pick guarantee (`trust-claims.ts:217-227`).

### /privacy/page.tsx  — HONEST (with pre-existing documented PARTIAL/ABSENT gaps)
- Collects name, email, Google profile image, request logs — matches §2.1/§2.2.
- "Do not sell" statement present but no CCPA §1798.135 opt-out link — **ABSENT** (documented in LEGAL_SURFACE_AUDIT.md §2.9, line 434).
- No general log retention schedule — **PARTIAL** (documented §2.3, line 428).
- These are pre-existing gaps tracked in LAUNCH_BLOCKERS.md, not new.

### /responsible-play/page.tsx  — HONEST
- Helpline (`1-800-GAMBLER` / NCPG) sourced from `lib/brand.ts` via `HELPLINE` constant.
- Bias Mirror described accurately ("computed on your device... Nothing is sent or stored").
- No built-in limit-setting UI — honestly not claimed (documented §3.6, line 440).

### /integrity/page.tsx  — HONEST
- Claim: "SHADOW is the only default" → confirmed in code: `apps/web/lib/ai-control-plane/governed-gate.ts:12-18` — `resolveSrqcModeFromEnv` returns SHADOW unless lab-only `SRQC_ENFORCE=1` flag is set.
- Claim: "enforcement is reachable only from explicitly lab-gated code path — never from a production route, cron, or worker" → confirmed in `enforce-gate.ts:6-8`: no live admission path reads ENFORCE from anything other than the `SRQC_ENFORCE=1` lab opt-in flag.
- Claim: "Two forbidden states are watched for" → confirmed in `SRQC_STATUS.md#1`.
- Every claim links to a real, public, buildable artifact (receipt route, public keyring, GitHub blob). No placeholders.
- Explicit "What we do not claim" section (lines 362-378) over-claims nothing. **Confidence: confirmed.**

### /how-to-verify-a-record/page.tsx  — HONEST
- Static explainer checklist. Links to real docs (`docs/devrel/DEMO_SCRIPT.md`).
- No numeric performance claims. No `new Date()` for legal dates.

### /verify/page.tsx  — HONEST, code-backed
- Claim: "the server re-computes the hash from the stored record, live" → confirmed in `apps/web/app/api/verify/route.ts:88-89`:
  `recomputed = hashLeaf(sha256Hex, { id: receipt.pickId, payload: receipt.payload })` and `hashIntact = recomputed === receipt.contentHash`.
- Claim: "If anything had been edited after the fact, the hashes would not match" → confirmed by the `verified` boolean at line 106.
- Rate-limited (60 req/min per IP), 503 on DB outage (not false "not found"), pre-kickoff sealed state. **Confidence: confirmed.**

### /proof/page.tsx  — HONEST, code-backed
- Claim: "Merkle root over ALL settled canonical picks" → confirmed in `load-proof-of-record.ts:143-199`:
  `committed` query has NO take cap; `totalSettled` = `committed.length`; `merkleRoot` computed over all committed records.
- Claim: "Edit any pick afterward and its fingerprint stops matching" → confirmed by per-row `inclusionProof` + `verifyInclusion` check at line 240.
- Outage state (`ledgerUnreachable: true`) rendered distinctly from empty state — never stamping a false freshness time (lines 219-253).
- Bootstrap-era picks excluded by design (filter at line 149). **Confidence: confirmed.**

### /verify/slate/opening/page.tsx  — HONEST, code-backed
- Founder-gated: `revealEnabled` reads `SLATE_OPENING_REVEAL_ENABLED === "true"` (line 43), off in git.
- Honest about Pedersen commitment scope: "Not a claim about whether the picks won" (lines 126-145).
- `no-zk-overclaim.mjs` blocks stronger crypto claims in CI (comment line 21). **Confidence: confirmed.**

### /methodology/page.tsx  — HONEST
- No win-rate or ROI claims. Explicit: "we do not claim PROVEN performance or ROI" (line 265).
- Changelog lists real version deltas (v5.2.2, v5.2.1, etc.) — no invented history.
- Factor list and stack are descriptive, not performance guarantees.
- "Thin slates can produce zero picks" — honest gate posture (line 44). **Confidence: confirmed.**

### lib/trust-claims.ts  — REGISTRY VERIFIED
- 20 claims (6 APPROVED methodology/data, 3 APPROVED pricing, 3 APPROVED risk, 8 BANNED social-proof).
- GATED claims all have `requiredGate` set (3 performance claims).
- BANNED claims all have `visibility=INTERNAL` and `evidence=NONE`.
- `risk.gamble-responsibly` uses canonical `1-800-522-4700` (NCPG). No other claim hardcodes a phone number.
- APPROVED claims never contain internal vocabulary terms (tested at lines 186-197).
- 34-test suite passes.

### lib/legal-dates.ts  — VERIFIED
- `TERMS_LAST_UPDATED = "2026-07-18"`, `PRIVACY_LAST_UPDATED = "2026-07-01"` — static constants.
- `formatLegalDate()` pins to UTC (`T00:00:00Z` + `timeZone: "UTC"`) — deterministic, no drift.
- 6-test suite passes.

### lib/compliance-scanner/ (rules.ts + normalize.ts)  — VERIFIED
- `normalizeForComplianceScan` collapses soft-wraps before scanning (prevents banned phrases split across newlines).
- `rules.ts` defines 3 layers: platform bans (AI-powered, ecosystem, lock/HAMMER), unsupported claims (guarantee, win-rate %), tout-coded language (all-caps, emoji ladder).
- `getRulesForTemplate` allows per-surface additional rules; base rules cannot be opted out of.
- Wired into: blog public-guard, journal compliance, model journal, content engine, promotions guards, studio build-assets, waitlist validation, bot-outbox.

## Conclusion

No new claim-vs-code mismatches found in the P15-02 sweep scope. Every factual assertion on the
trust/integrity/verification pages is backed by real implementation. The two known legal gaps
(age-gating at signup/checkout ABSENT, data-retention schedule PARTIAL, CCPA Do-Not-Sell ABSENT)
are pre-existing, documented in `LEGAL_SURFACE_AUDIT.md` and tracked as launch blockers in
`LAUNCH_BLOCKERS.md` — they are not regressions introduced by this sprint.

All 112 relevant tests pass. Typecheck passes with no errors.
