# Security Posture Assessment + Protocols — 2026-08-28

**Author:** Hermes (hermes agent, on `hermes/green-board-1`)
**Date:** 2026-08-28
**Scope:** Pre-Green-Board-1 launch security audit
**Status:** DRAFT — needs founder sign-off on Section 0 (the threat model) before Section 4 (protocols) lands as code.

---

## 0. The threat model — be honest about it

The repo `Beexly/Sports` is **public on GitHub**. Every file, commit, test, comment, and PR is visible to anyone with a browser. There is no way to "hide" the code from a determined reader. So the security question is NOT "how do I keep them from reading the code" — it is:

1. **What is the actual moat?** Per the doctrine, per `C-43`, per memory: NOT the code. The moat is the **append-only archive of graded picks with timestamps**, the **published calibration curve**, the **cryptographic receipts and hash chain**, and the **the start date**. Code can be copied. A backdated archive cannot. A calibration curve that has been live for 6 months and is verifiable on-chain cannot be faked by a competitor who starts tomorrow. **Anything that threatens the integrity of the archive / receipts / calibration is the real security problem.**

2. **What can the public read?** All source. All comments. All CLV results. All calibration outcomes. All audit findings with file:line locations. All schema. All internal docs. Everything.

3. **What must stay private?** Live API keys. Production DB credentials. Real user PII. The un-deanonymized user data. The hermes_ro DB URL. The Odds API key (when active). The Stripe live keys. The Anthropic/OpenRouter/Cerebras/Groq keys. The internal session transcripts that contain those keys (per R-1, ~25 are exposed in a transcript).

4. **What is the "trust surface" the doctrine keeps naming?** The public record, the calibration curve, the receipts page, the verify-this-pick UI, the public kill switch. If someone can tamper with that — by editing DB rows, by spoofing a commit, by faking a receipt hash — the moat is gone.

5. **What is the real attack surface?** Three layers:
   - **Code-layer attacks:** exploit a code vulnerability (XSS, auth bypass, SQLi, IDOR, rate-limit bypass, dependency CVE) to read/modify production data.
   - **Infrastructure attacks:** steal a credential, get DB access, mint a fake receipt, modify a public truth surface endpoint.
   - **Moat-poisoning attacks:** publish a competing archive of "graded picks" with timestamps that look earlier than ours. (We can't fully prevent this — but our hash chain + receipts are the proof.)

This doc only addresses (1) and (2) — the moat-protection and the infrastructure-protection. Layer (3) is a market-positioning problem solved by the receipts and the start date, not by code.

---

## 1. What I found in the current state of the repo

### 1.1 CRITICAL — `handoff/AUDIT_FINDINGS.md` is tracked, public, and contains 75 vulnerability file:line locations

- **What it is:** 276-line register of every vulnerability found in the 2026-08-12 adversarial audit, with `GSE-SEC-001` through `GSE-SEC-082+` and exact file:line locations, exploit scenarios, and CVE references.
- **What's still open (live-verified 2026-08-28, by Hermes on `hermes/green-board-1` at `bb0e7dfc0`):**
  - `GSE-SEC-006` — rate limiting covers 34 of 178 API routes (was 8 of 176 on 2026-08-12; +26 added, but still 19% coverage)
  - `GSE-SEC-007` — CSP allows `'unsafe-inline'` in `script-src` (apps/web/next.config:88) and `'unsafe-eval'` in dev (line 89); `'unsafe-inline'` in `style-src` (line 102)
  - `GSE-SEC-059/060` — Next 14.2.15, postcss transitive (2 HIGH dep CVEs, per the 2026-08-16 correction)
  - `GSE-SEC-077` — `the-odds-api` fetched without `checkClearance` (only spend guard)
  - `GSE-SEC-079/080` — `sleeper-api` and `fpl-api` adapters fetch without runtime clearance gates
  - `GSE-SEC-081/082` — "Confidently-wrong" public claims about API auth requirements
- **Why this matters for a public repo:** the file is essentially a free, prioritized attack plan for any hostile reader. They don't need to run the audit — they can just read the file and target the specific file:line listed.
- **Verdict:** **THE biggest open security issue in the repo right now.** The 2026-08-18 secret sweep (`64eb7d999`) flagged this exact risk and called it "unremediated." Nothing has been done about it since.

### 1.2 CRITICAL — `handoff/REMEDIATION_ROADMAP.md` and `handoff/REMEDIATION_EXECUTION.md` are also tracked

- 253 + 211 = 464 more lines of "here's exactly how to fix each vulnerability, in order, with effort estimates."
- Combined with AUDIT_FINDINGS.md, the public repo contains a **complete attack-and-remediation playbook** written by a friendly auditor and posted in a public place.

### 1.3 CRITICAL — `R-1` in the ledger: ~25 Hermes `.env` credentials exposed in a session transcript

- **Status:** OPEN since 2026-08-19. APPROVED (fable) for execution. Assigned to `browser` agent.
- **What's exposed:** Fireworks, Together, DeepSeek, OpenRouter x2, Vercel first, plus the browser agent's own mistyped 401 gateway key.
- **The risk:** if any of those transcripts are in a tracked file, a committable markdown report, or a public PR comment, the keys are leaked. The rotation is OPEN because no one has executed it.
- **Per memory:** the standing rule is `neon_ro` is fine (read-only), but real API keys are not. **The session transcript leak is the most likely vector for a real key compromise.**

### 1.4 HIGH — production CSP has `'unsafe-inline'` in `script-src`

- File: `apps/web/next.config:88` (and `style-src:102` for inline styles).
- A single stored or reflected XSS in any rendered user content (e.g., the green-board receipts page, the calibration explanation, the SITREP dossier) gives full inline-script execution.
- The verifier in the dispatch ("`apps/web/__tests__/...`") does not run a CSP audit.
- This is GSE-SEC-007, still open.

### 1.5 HIGH — rate limiting covers only 19% of API routes (34 of 178)

- 144 routes have no `consumeRateLimit` call. Public GET boards, public forms, any LLM-backed surface, any future Green Board read endpoint — all unthrottled.
- An unauthenticated scraper can loop the public board, the calibration endpoint, the kill-switch probe, the public-surface-truth endpoint at full bandwidth. Even if rate-limited per-IP, a botnet of 100 IPs eats the whole free lane in minutes.
- This is GSE-SEC-006, still open.

### 1.6 MEDIUM — `the-odds-api`, `sleeper-api`, `fpl-api` adapters fetch without runtime clearance gates

- They have spend guards or registration gates, but not the same `checkClearance` that protects the canonical data sources.
- If a future agent changes one of these adapters' URL or auth, the safety net is missing.

### 1.7 MEDIUM — `P-0` foundation stone problem compounds the public-trust risk

- `PickProofReceipt.confidence` is a heuristic number (per the schema: "published 0–100 confidence score (heuristic, NOT a prob)"), `modelProb Float?` is "null until one genuinely exists."
- The public-facing "74%" probability that the Green Board would publish is, today, the heuristic confidence, not a calibrated probability.
- **The doctrine is right that this is the foundation stone.** Until P-0 lands, the Green Board ships a heuristic number. If that number underperforms, the public record starts on a number we already know is degraded. The retro (GB-4) is the diagnostic that proves this and tells us by how much.

### 1.8 MEDIUM — `docs/ops/calibration/2026-08-19-l9-clv-slices/RESULTS.md` is tracked and public

- It contains real per-market beat rates with Wilson CIs on 909 graded picks: TOTAL 58.5% [52.8%, 63.9%], SPREAD 30/49 = 61.2%, etc.
- This is **honest internal performance data**. A competitor who reads it knows:
  - Our total-market model is the one with edge.
  - Our moneyline and (early) spread models are below the 52.4% threshold.
  - We have a 909-pick corpus we can reverse-engineer the scoring of.
- The document is correctly labeled internal, but it's in a public repo. **The fix is not to remove it (the integrity of the audit depends on it being there). The fix is to be aware that it IS public, and to design the launch copy to be consistent with what the public can already see.** If we launch with "70% across the board" and the public finds the L-9 results showing TOTAL 58.5% and ML 9%, we have a credibility problem on day one.

### 1.9 MEDIUM — `PickProofReceipt.payload` is `String @db.Text` with the canonical committed serialization

- This means the full pick content is in the DB, including the modelVersion, the asOf timestamp, the entryOdds, the line. If the DB is compromised, an attacker can re-mint fake receipts.
- **The hash chain (`slateKey`, `contentHash`) is the proof.** But the chain is only as good as the smallest-keyed hash, and it has to be append-only. I haven't verified the append-only invariant — that's a separate audit (see Section 4.J).

### 1.10 LOW — public schema is fully public (User, PickProofReceipt, SlateCommitment, Subscription, etc.)

- Email is unique. No password (OAuth-only). No phone, no address. No PII beyond what an OAuth provider gives.
- This is fine. A competitor can model the schema but can't get user data from it.

### 1.11 LOW — the dev-only `DEV_FAKE_ADMIN` escape hatch exists (well-guarded per `GSE-SEC-011`)

- The escape hatch is intentional for local dev. It must NEVER be reachable in production.
- Verify: `process.env.NODE_ENV === 'production'` should fail-closed if `DEV_FAKE_ADMIN` is set.
- Worth a smoke test, not a structural change.

### 1.12 INFO — there is no `SECURITY.md` in the repo

- The `SECURITY.md` should:
  - Document how to report a vulnerability
  - Document the threat model
  - Document the secret-handling law
  - Document the kill-switch path
- Currently: nothing.

### 1.13 INFO — `.gitignore` is comprehensive but does NOT ignore `handoff/AUDIT_FINDINGS.md`, `handoff/REMEDIATION_*.md`, or `*.log` at the root (only in `handoff/`)

- A `*.log` file accidentally created at the repo root (not in `handoff/`) would be tracked.
- The vulnerability register is in `handoff/` which is partially ignored (`.log`, `.txt`, `.json`, `_*`, `.py` are ignored — but `.md` files are not). So the `.md` vulnerability registers slip through.

---

## 2. What's already in place (positive findings)

- **13 of 14 repo guardrails pass** (per the 2026-08-12 audit). The 14th is tracked debt.
- **The auth stack re-resolves roles from the DB every request and never fail-opens to ADMIN.**
- **Stripe webhook verifies signatures and defends against out-of-order and replayed events.**
- **The paywall is enforced in the SQL query (premium rows are never returned to FREE sessions).**
- **The free-first data layer orders sources by marginal cost with a spend guard.**
- **The kill switch is a PURE ENV FLIP (no code).** Critical for emergency response.
- **`@auth/core >=0.41.3` is patched (lock file).** The original 2 CRITICAL next-auth advisories (GSE-SEC-001/002) are resolved.
- **An `audit-secrets.md` Claude command exists** (a "Secret / leak scan" command for future use).
- **A `credentials-smoke.mjs` script exists** that checks critical env presence without printing values.
- **A `SECRETS_ROTATION_PLAYBOOK.md` exists** in `docs/ops/contingency/`.
- **The `AGENTS.md` has hard "no `any` / no `@ts-ignore` / no `console.log` of secrets / no printing env values" rules.**
- **The `PickProofReceipt.contentHash` index exists** for fast hash lookups.
- **`@sports/auth` resolves roles from DB per request** — no JWT-sourced role.

These are real strengths. The repo is in better shape than the audit findings suggest because the critical paths are well-defended.

---

## 3. The "moat" integrity checklist — things that, if broken, kill the product

| Moat element | What protects it | What's still open | Action |
|---|---|---|---|
| Public calibration curve | `apps/web/app/calibration/**` reads from `calibration-metrics` | The curve is whatever `modelProb` says, and `modelProb` is `null` until P-0 lands | P-0 first, then the curve |
| Cryptographic receipts | `PickProofReceipt.contentHash` + `slateKey` chain | Append-only invariant not verified | Audit task 4.J |
| Start date / backdated archive | First receipt timestamp | The first receipt must mint on launch day at the right time | Launch checklist |
| Public kill switch | `LIVE_BOARD` env flag, pure flip | If the env is misconfigured, the switch silently doesn't fire | Smoke test on every deploy |
| The 70% claim | `GREEN_P_MIN = 0.70` predicate | P-0 (heuristic confidence, not a real prob) | P-0 first |
| The PRIME tier claim | `PRIME_P_MIN = 0.80` predicate | Same | P-0 first |
| The retro (internal counterfactual) | Documented as internal, never on a public surface | Once the retro runs, the temptation to share it is real | Section 4.K — protocol to lock it down |
| The verification page | `verify-this-pick` UI on pick cards | Plank 2 in the doctrine, already shipped per B-4 | Done |

---

## 4. The protocols — what to do, in order

### 4.A — IMMEDIATE: quarantine the vulnerability register

- **Action:** `git rm handoff/AUDIT_FINDINGS.md handoff/REMEDIATION_ROADMAP.md handoff/REMEDIATION_EXECUTION.md handoff/claude/gates-and-hardening-2026-06-17/AUDIT_FINDINGS.md`
- **Why:** these are an attack plan in a public repo. Even though they document remediation, the file:line locations + exploit scenarios + CVE references help an attacker more than they help a defender.
- **Where to put them:** move to a private internal doc (Notion, a private repo, or a `docs-internal/` directory that is git-ignored from public).
- **Effort:** XS.
- **Risk:** if you delete from git, the history still has them. To actually purge, you need `git filter-repo` or BFG, which rewrites history. The right move is: (1) move to a private location, (2) keep in git for historical reference but in a clearly-marked-`INTERNAL` directory the .gitignore for the public mirror blocks, (3) accept that history has the prior versions and rotate any secrets they reference.
- **Authorization:** founder sign-off required (touches history of a public repo).

### 4.B — IMMEDIATE: execute R-1 credential rotation

- **Action:** rotate every key in the R-1 list (Fireworks, Together, DeepSeek, OpenRouter x2, Vercel first, plus the mistyped 401 gateway key).
- **Why:** they're exposed in a session transcript; the transcript could be in a tracked file.
- **Status:** APPROVED 2026-08-19, OPEN since.
- **Owner:** the `browser` agent has it. The hermes agent can do it from a fresh session by:
  1. List every env var with a real value in `%LOCALAPPDATA%\hermes\.env` and any other `.env*` files in the workspace.
  2. For each, go to the provider console, revoke + regenerate.
  3. Update the `.env` file with the new value.
  4. Restart the relevant service.
  5. Verify the new value works.
- **Effort:** M (1-2 hours).
- **Authorization:** already approved.

### 4.C — IMMEDIATE: add a `SECURITY.md` to the repo root

- **Action:** write `SECURITY.md` with: threat model, reporting path, secret-handling law, kill-switch path, link to `docs/ops/contingency/SECRETS_ROTATION_PLAYBOOK.md`.
- **Why:** the threat model is not written down anywhere a reader can find. A public `SECURITY.md` is a deterrence signal AND a forcing function for the team to think about it.
- **Effort:** XS.
- **Authorization:** not required.

### 4.D — HIGH PRIORITY: tighten CSP — remove `'unsafe-inline'` from `script-src` and `style-src`

- **Action:** migrate to nonce-based CSP. Next App Router can emit per-request nonces; `script-src 'self' 'nonce-{NONCE}' https://www.clarity.ms ...` and `style-src 'self' 'nonce-{NONCE}'`.
- **Why:** the inline-script XSS surface is the highest-impact code-layer vulnerability in the public-facing product.
- **Effort:** M (a day).
- **Risk:** will break some third-party scripts (Clarity, Stripe) that rely on inline injection. Test in preview, deploy with feature flag.
- **Authorization:** not required, but flag in the PR description so the founder is aware.

### 4.E — HIGH PRIORITY: apply `consumeRateLimit` to all public/unauthenticated routes

- **Action:** walk `apps/web/app/api/**/route.ts`, add `consumeRateLimit` to every `export async function GET/POST/PUT/DELETE` that is reachable from the public site without auth.
- **Why:** 144 routes unthrottled is a denial-of-service and denial-of-wallet vector.
- **Effort:** M (a day or two, ~140 files).
- **Test plan:** new test that asserts every public-facing route uses `consumeRateLimit`. Add a CI gate that fails if a new public route is added without it.
- **Authorization:** not required.

### 4.F — MEDIUM: enforce `checkClearance` on all data-source adapters

- **Action:** in `the-odds-api`, `sleeper-api`, `fpl-api` adapters, call `checkClearance` at the entry point, just like the canonical sources do.
- **Why:** consistent enforcement prevents the next agent from accidentally widening a source's scope.
- **Effort:** S.
- **Authorization:** not required.

### 4.G — MEDIUM: write a `scripts/ops/vuln-scan.mjs` that runs on every CI build

- **Action:** a script that: (1) greps the repo for likely secret patterns (Stripe `sk_live_`, OpenAI `sk-`, Anthropic `sk-ant-`, generic AWS keys, JWT secrets); (2) greps for hard-coded DB URLs; (3) checks the git log for known-sensitive files; (4) exits 1 on any hit. Run in `.github/workflows/ci.yml` and locally via `npm run lint:secrets`.
- **Why:** defense in depth. The audit-secrets command exists for Claude to use, but no automated check runs on every commit.
- **Effort:** S.
- **Authorization:** not required.

### 4.H — MEDIUM: ship the `npm audit` findings remediation

- **Action:** upgrade Next to a version that addresses `GSE-SEC-059` (and any successor CVE), and pin postcss to a patched version (GSE-SEC-060). Verify with `npm audit --omit=dev --json` showing 0 high.
- **Why:** the dep tree is the largest single category of code-layer risk per the audit.
- **Effort:** M.
- **Risk:** Next major-version upgrades can break the app. Pin minor, schedule the major for a dedicated sprint.
- **Authorization:** not required.

### 4.I — MEDIUM: P-0 first, before any band ships to paying users

- **Action:** as the dispatch already says: pick probability must equal the clean de-vigged consensus, not the heuristic `confidence`. Use GB-4's retro to measure the divergence, then fix the resolver, then re-verify.
- **Why:** shipping a heuristic number as a probability is the single most credibility-damaging thing the launch could do. The retro (GB-4) is the diagnostic, the resolver fix is the surgery, the second retro is the verification.
- **Effort:** L.
- **Authorization:** not required (already in the dispatch).

### 4.J — MEDIUM: audit the receipts hash chain for append-only invariant

- **Action:** verify that:
  1. `PickProofReceipt` rows can never be updated (DB constraint, or the API never issues an UPDATE).
  2. `SlateCommitment` rows can never be updated.
  3. The `slateKey` chain is computed deterministically from a parent (so any re-ordering breaks the chain).
  4. The `contentHash` is computed at the moment of commitment, not retroactively.
- **Why:** if the receipts can be backdated or modified, the moat is gone.
- **Effort:** M.
- **Authorization:** not required.

### 4.K — MEDIUM: lock down the retro as an internal-only artifact

- **Action:** when GB-4 ships, add a clear banner at the top of `docs/ops/calibration/2026-08-28-green-retro/RESULTS.md`: "INTERNAL COUNTERFACTUAL — never on a public surface, never phrased as a track record. The public record starts at zero on launch day." Add a `robots: noindex` meta-equivalent in the markdown front matter (most static-site generators respect this), and add a CI test that greps the public-site source for "0.2107" / "RES 0.038" / "retro" and asserts no hits.
- **Why:** the temptation to share retro numbers in marketing is enormous, and sharing them is a claims violation.
- **Effort:** XS.
- **Authorization:** not required.

### 4.L — MEDIUM: green-board launch review with the SECRETS_ROTATION_PLAYBOOK in hand

- **Action:** before flipping `LIVE_BOARD`, run the launch-night smoke (`scripts/ops/launch-night-smoke.mjs` --prod, per LQ18). Verify:
  1. No real secrets in the build output (`grep -rE "sk_live_|sk-ant-|sk-[A-Za-z0-9]{20,}" .next/ build/` → 0 hits).
  2. The CSP header on the live response has no `unsafe-inline` in `script-src`.
  3. The rate limiter is active on `/api/picks?lane=green`, `/api/clv`, `/api/ops/public-surface-truth`, and at least the top 10 most-trafficked public routes.
  4. The kill switch flips correctly (smoke a single test then flip back).
  5. The first receipt mints within 60 seconds of the first published pick.
- **Why:** the moment of launch is when every latent issue becomes public.
- **Effort:** S (the smoke script already exists, just expand it).
- **Authorization:** founder on the call.

### 4.M — LOW: tighten `.gitignore` for accidental secret leaks

- **Action:** add `*.log`, `*.pid`, `*.err`, `*.out` to `.gitignore` at the root (currently only ignored inside `handoff/`).
- **Why:** defense against accidental commit of a run log that contains env dumps.
- **Effort:** XS.
- **Authorization:** not required.

### 4.N — LOW: DEV_FAKE_ADMIN production smoke

- **Action:** in the launch-night smoke, verify that hitting any route that depends on `DEV_FAKE_ADMIN` returns 401 in `NODE_ENV=production`.
- **Why:** a misconfigured env could leak the dev admin escape hatch to prod.
- **Effort:** XS.
- **Authorization:** not required.

### 4.O — LOW: `audit-secrets` Claude command into a pre-commit hook

- **Action:** wrap `scripts/ops/vuln-scan.mjs` (4.G) in a pre-commit hook AND a CI step.
- **Why:** the cost of a single committed secret is days of rotation. The cost of the hook is 2 seconds per commit.
- **Effort:** XS.
- **Authorization:** not required.

---

## 5. What this is NOT

- This is NOT a "hide the code" plan. The code is public and will stay public.
- This is NOT a "rebuild the security model" plan. The current model is sound; it needs the listed gaps closed.
- This is NOT a marketing-driven plan. The protocols in Section 4 are technical, ordered by priority, with effort estimates and authorization requirements.
- This is NOT a final answer. The threat model will evolve as the product ships and as the moat elements crystallize.

## 6. The "what would I do if I were the attacker" test

If I were trying to attack this product TODAY, the cheapest first moves would be:

1. **Read `handoff/AUDIT_FINDINGS.md` and target GSE-SEC-006/007.** (Public, free, prioritized.) → Mitigations: 4.A, 4.D, 4.E.
2. **Read the schema and probe for IDOR in `/api/picks/[id]`, `/api/users/[id]`, etc.** (Schema is public.) → Mitigation: ensure every `[id]` route verifies auth + ownership.
3. **Look for session transcripts in PRs, handoff docs, or pasted config.** (Some are in `handoff/`.) → Mitigations: 4.B (rotate), 4.M (gitignore logs), 4.G (vuln-scan).
4. **Try the kill-switch endpoint and the public-surface-truth endpoint without rate limiting.** (Until 4.E lands.) → Mitigation: 4.E.
5. **Find an XSS sink on a public page (calibration explanation, SITREP dossier) and use the inline-script-permitting CSP.** (Until 4.D lands.) → Mitigation: 4.D.
6. **Publish a competing archive of "graded picks" with hand-crafted early timestamps.** (Cannot fully prevent.) → Mitigation: the receipts hash chain (4.J) + the start date we publish (launch day, made loud).

The most important moves are 4.A, 4.B, 4.D, 4.E. Do those first. Everything else is layered defense.

## 7. Open questions for the founder (do NOT act without sign-off)

1. **4.A — vulnerability register purge:** are you OK with `git filter-repo` on history, or do we keep the register in a separate private repo and accept the public history has the prior versions?
2. **4.B — R-1 rotation:** I can execute this from a fresh session, but the `browser` agent owns it. Should I take it, or wait?
3. **4.D — CSP tightening:** Clarity and Stripe both inject inline scripts. Is the team OK with a one-time breakage window, or do we use a nonce-bypass for those origins specifically?
4. **4.I — P-0 blocker:** confirm that NO band ships to paying users before P-0 lands. This is in the doctrine but the launch is 4 days away.
5. **4.J — receipts hash chain audit:** is there a `receipts-integrity.test.ts` already, or do I need to write the audit from scratch?
6. **Threat model section 0:** is this an honest description of the moat, or is the moat bigger/smaller than I'm describing? (I don't have a full picture of the receipts-and-hash-chain design from the doctrine alone.)

## 8. Ledger entries to create

When the founder approves this doc, the following ledger rows should be created (one per Section 4 protocol, prioritized by impact):

- `H-SEC-1` — Quarantine vulnerability register (4.A) — founder, XS
- `H-SEC-2` — R-1 credential rotation (4.B) — browser or hermes, M
- `H-SEC-3` — Tighten CSP (4.D) — hermes, M
- `H-SEC-4` — Rate limit all public routes (4.E) — hermes, M
- `H-SEC-5` — `checkClearance` on all adapters (4.F) — hermes, S
- `H-SEC-6` — `vuln-scan.mjs` + CI gate (4.G) — hermes, S
- `H-SEC-7` — npm audit remediation (4.H) — hermes, M
- `H-SEC-8` — Receipts hash chain audit (4.J) — hermes, M
- `H-SEC-9` — Retro lockdown banner + grep test (4.K) — hermes, XS
- `H-SEC-10` — Launch smoke expansion (4.L) — hermes, S
- `H-SEC-11` — `.gitignore` tightening (4.M) — hermes, XS
- `H-SEC-12` — `DEV_FAKE_ADMIN` prod smoke (4.N) — hermes, XS
- `H-SEC-13` — Pre-commit hook for secrets (4.O) — hermes, XS
- `H-SEC-14` — `SECURITY.md` (4.C) — hermes, XS
- `H-SEC-15` — P-0 foundation stone (4.I) — already in dispatch, link to GB-4

## 9. What the Green Board dispatch should do about security

The Green Board dispatch as written is silent on security. It should not be. Recommendation:

- **Add a Section to GB-5 (the `/green` page):** no third-party scripts on the green board page itself. No Clarity, no Stripe Elements, no analytics beacons. The page is a ledger readout — keep it pure.
- **Add a Section to GB-3 (the read-side lane):** rate-limit `/api/picks?lane=green` from day one. Use `consumeRateLimit({ key: "lane-green", limit: 60, window: "1m" })` for authenticated, lower for unauth.
- **Add a Section to GB-4 (the retro):** output path is `docs/ops/calibration/2026-08-28-green-retro/RESULTS.md` and is INTERNAL. The public record starts at zero. Add the banner and the grep test.

## 10. My honest read

The repo is in **better shape than the audit findings suggest** because the critical paths (auth, paywall, kill switch, free-first data layer) are well-defended. The biggest issues are:

1. **The vulnerability register is public.** (4.A.) Easy fix, high impact.
2. **CSP allows inline scripts.** (4.D.) Moderate fix, high impact.
3. **Rate limiting is partial.** (4.E.) Moderate fix, high impact.
4. **R-1 credentials are still exposed in a transcript.** (4.B.) Already approved, needs execution.
5. **P-0 is unresolved.** (4.I.) Already in the dispatch.

If I had to pick three to do today: 4.A, 4.B, 4.E. Everything else is layered defense or already in progress.

— Hermes, 2026-08-28, on `hermes/green-board-1` at `bb0e7dfc0`
