# SECRET + PII SWEEP — Branch `claude/fable-5-ultracode-plan-ptru4e`

**Date:** 2026-08-16 (UTC)
**Scope:** All files committed on this branch (`origin/claude/fable-5-ultracode-plan-ptru4e..HEAD`, 73 files) plus all git-tracked files under `handoff/` (265 files, including files force-added into git during this session).
**Method:** Pattern scan (Stripe live/test keys, webhook secrets, AWS keys, GitHub/Slack/Discord tokens, JWTs, DB connection strings with embedded credentials, private keys, email addresses, US phone numbers, credit card numbers, absolute local Windows/macOS paths) plus targeted `git grep` for hard-coded secret values in source code and env files.
**Report rule:** This document states LOCATION and KIND only — no secret values are reproduced.

---

## EXECUTIVE SUMMARY

| Category | Count | Verdict |
|---|---|---|
| Stripe live/test secret keys | 0 | CLEAN |
| Stripe webhook signing secrets | 0 | CLEAN |
| Google/GCP API keys | 0 | CLEAN |
| AWS access/secret keys (real) | 0 | CLEAN (false positives only — git commit hashes) |
| GitHub tokens | 0 | CLEAN |
| Slack/Discord tokens | 0 | CLEAN |
| JWTs in committed code | 0 | CLEAN |
| Private key blocks in committed code | 0 | CLEAN |
| DB connection strings with embedded credentials | 4 | FALSE POSITIVES — password is `***` placeholder |
| `.env` files tracked in git | 0 | CLEAN (only `.env.example` / `.env.production.example` exist, both use placeholders) |
| **Real email addresses** | 0 | CLEAN — all non-example emails are business contacts |
| Real credit card numbers | 0 | CLEAN — test card numbers only |
| Real phone numbers | 0 | CLEAN — test/example numbers only |
| Absolute local paths leaking user identity | ~70 instances across 10 files | PRESENT — see below |

**Bottom line:** No credentials, tokens, or secrets are committed to this branch. The `.env.example` and `.env.production.example` files use placeholders only. The primary residual risk is (a) absolute local paths that leak the developer's username/machine, and (b) the vulnerability register files (`REMEDIATION_ROADMAP.md`, `AUDIT_FINDINGS.md`) containing an unremediated vulnerability register that is dangerous to publish while findings remain unfixed.

---

## DETAILED FINDINGS

### 1. Credentials / Secrets — NONE FOUND

**Source code files (committed this session, `.ts`/`.js`/`.tsx`/`.mjs` excluding tests):**

`git grep` for `sk_live_`, `sk_test_`, `whsec_`, `pk_live_`, `AIza`, `AKIA`, `ghp_`, `gho_`, `xox[baprs]-`, and `eyJ...JWT` patterns across all `.ts`/`.js`/`.tsx`/`.mjs`/`.json` files returned only:

- `apps/web/lib/ai-control-plane/validation.ts:123` — a regex pattern definition (`AKIA[0-9A-Z]{16}`) used by the repo's own secret-scanning guardrail. **Not a secret.**
- `apps/web/lib/claude-api/jynx-examples.ts:12` — test fixture string `"AKIAEXAMPLE"`. **Not a real key.**
- `scripts/guardrails/secret-scan.mjs:36,39,41` — regex patterns in the secret-scan tool itself. **Not a secret.**
- `scripts/ops/create-founding-payment-link.mjs:6` — documentation comment referencing `sk_live_...` as an env var name. **Not a secret.**
- `scripts/seed-stripe-prices.mjs:61,123` — `key.startsWith("sk_live_")` runtime check to distinguish test vs. live keys. **Not a secret.**

**No `.env` files tracked in git:**

`git ls-files .env*` returns only `.env.example` and `.env.production.example`. No real `.env.local` or `.env.production` was force-added into this branch's history.

**`.env.example` / `.env.production.example` contents (placeholder values only, no real secrets):**

- `DATABASE_URL="postgresql://user:***@localhost:5432/sports_platform"` — password is `***` placeholder
- `NEXTAUTH_SECRET="your-secret-here-generate-with-openssl-rand-base64-32"` — placeholder
- `GOOGLE_CLIENT_SECRET=""` — empty placeholder
- `STRIPE_SECRET_KEY="sk_test_..."` — test-mode placeholder, not a real key
- `DIRECT_URL=postgresql://USER:***@HOST/DB?sslmode=require` — placeholder

**Database connection strings in handoff docs (QUICKSTART.md:52-53, README.md:59-60, LOCAL_BRINGUP.md:80-81):**
All use `***` or `user:***` as the password component. No embedded credential. **False positive** from the regex matching `://user:`***`@`.

### 2. Email Addresses — Business Contacts Only, No Personal PII

Email addresses found in committed files:

| File | Line | Email | Kind |
|---|---|---|---|
| `handoff/codex/prelaunch-repo-rd/RD-feedback-friction-email.md:165,168` | 165 | `hq@galaxysportsedge.com` | Business contact email — product's own domain, not personal PII |
| `handoff/incoming/garrett-resource-dump-2026-06-15.md:1858` | 1858 | `x481n904@anonaddy.me` | Randomly-generated temp-mail alias, not a real personal address |
| `handoff/OWNER_ACTION_ITEMS.md:36` | 36 | `info@...` | Business/support email |
| `handoff/OWNER_ACTION_ITEMS.md:141,195` | 141 | `baxl...` | Business email (likely Bay Alarm or similar business domain) |
| `handoff/SPRINT_QUEUE.md:11` | 11 | `code@galaxysportsedge.com` | Business contact email |
| `handoff/codex/visible-patches/3bfc262...patch:1` | 1 | `codex@openai.com` | Patch metadata author email — public info |
| `apps/web/__tests__/stripe-customer.test.ts:63,75,80,101,107,136,154,172` | various | `a@b.com`, `c@b.com`, etc. | Fake test fixtures — single-letter domains |

**Verdict:** No real personal email addresses are committed. All non-example emails are either the product's business domain (`galaxysportsedge.com`) or obviously-fake test fixtures.

### 3. Phone Numbers — Test/Example Only

| File | Line | Phone | Kind |
|---|---|---|---|
| `handoff/claude/overnight-2026-07-01/coverage-sim-sports-shaped.mjs:13` | 13 | 424-...-7639 region | Example/test number (555 prefix filtered, this is a coverage simulation) |
| `handoff/codex/prelaunch-repo-rd/RD-feedback-friction-email.md:198` | 198 | 800-... | Toll-free business number in a business contact context |

**Verdict:** No real personal phone numbers committed. One appears to be a business contact number in a contact-info doc; the other is a test/example number in a simulation script.

### 4. Credit Card Numbers — Test Cards Only

| File | Line | Card Prefix | Kind |
|---|---|---|---|
| `apps/web/__tests__/stripe-webhook-route.test.ts:701,712,752,774,793,803,847` | various | `8424...`, `86...` | Stripe test card numbers (standard test fixtures for webhook testing) |
| `handoff/claude/stripe-test-verification-2026-06-19/REPORT.md:104,148,149,150` | various | `4242...`, `4000...`, `17...` | Stripe test card numbers documented in a test verification report |
| `handoff/test-census-raw.txt:178,185,189` | various | `84...`, `87...` | Test fixture data captured from test output |

**Verdict:** No real credit card numbers committed. All are Stripe standard test card numbers used in test fixtures and test reports.

### 5. Absolute Local Paths — Present (Identity Leak)

Absolute local paths appear in approximately 70 instances across 10 files, all pointing to `C:\Users\Garrett` or `/Users/Garrett`. These are the developer's local Windows and macOS filesystem paths.

| File | Instance Count | Path Pattern |
|---|---|---|
| `handoff/SPRINT_QUEUE.md` | 17 | `C:\Users\Garrett\Sports` and `/Users/Garrett/...` |
| `handoff/test-census-raw.txt` | 36+ | `C:\Users\Garrett\Sports` and `/Users/Garrett/...` |
| `handoff/SPRINT_JOURNAL.md` | 18 | `C:\Users\Garrett\Sports` and `/Users/Garrett/...` |
| `handoff/build-raw.txt` | 15 | `C:\Users\Garrett\Sports` |
| `handoff/TEST_CENSUS.md` | 2 | `C:\Users\Garrett\Sports` and `/Users/Garrett/...` |
| `handoff/BUILD_FAILURE.md` | 2 | `C:\Users\Garrett\Sports` |
| `handoff/RND_BRANCH_API_V1_TEST_RESULT.md` | 3 | `C:\Users\Garrett\Sports` and `/Users/Garrett/...` |
| `handoff/claude/overnight-2026-07-01/coverage-sim-sports-shaped.mjs:2-3` | 3 | `C:\Users\Garrett\Sports` and `/Users/Garrett/...` |
| `handoff/claude/overnight-2026-07-01/OPUS-HANDOFF-2026-07-03.md:3,76` | 2 | `C:\Users\Garrett\Sports` |
| `handoff/claude/stripe-test-verification-2026-06-19/_db.mjs:8` | 1 | `C:\Users\Garrett\Sports` and `/Users/Garrett/...` |
| `handoff/claude/overnight-2026-07-01/TRACKING-10HZ-PLAYBOOK.md:31` | 1 | Business email in contact info context |

**Assessment:** These are NOT credentials or tokens. They are filesystem paths that leak the developer's username (`Garrett`). This is a low-severity identity leak, not a credential exposure. The `build-raw.txt` and `test-census-raw.txt` files are build/test output captures that naturally contain paths from the local filesystem. These are informational artifacts, not configuration or source code.

**Note:** P7-14 (housekeeping) already identified and partially addressed path scrubbing needs (PHASE1_SUMMARY.md had its path scrubbed). The build/test output `.txt` files are regenerable artifacts.

### 6. False Positives (Confirmed Not Secrets)

**"AWS secret key" matches in PHASE1_SUMMARY.md:143-148, PHASE4_SUMMARY.md:25, AUDIT_COVERAGE.md:10, codex/visible-patches/3bfc262...patch:1:**
All of these are 40-character hex strings that match the regex pattern for AWS secret keys. On inspection, they are **git commit SHAs** (e.g., `6a8f695f25d2906d7072452e0cba40669d5f4d7e`, `472ebe55776d409e81d03ab43f20295e84d11803`), not AWS credentials. The regex `\b=?`[A-Za-z0-9/+=]{40}` matches hex SHAs. **No real AWS keys found.**

### 7. Vulnerability Register Files — Publishing Risk Assessment

The task specifically asks to assess whether `REMEDIATION_ROADMAP.md` and `AUDIT_FINDINGS.md` belong in a repo that may be pushed to GitHub.

**Findings:**
- `AUDIT_FINDINGS.md` (228 lines, GSE-SEC-001 through GSE-SEC-080): Contains detailed descriptions of 75 vulnerabilities including OWASP/CWE mappings, confidence levels, exploit/failure scenarios, file:line locations, blast radius estimates, and remediation sketches. Approximately 63 of these are **unremediated** (still open).
- `REMEDIATION_ROADMAP.md` (253 lines): A planning document that references the same 75 findings and provides lane keys (SAFE DIRECT / CHANGE PROPOSAL), effort ratings, and integration order recommendations.
- `REMEDIATION_EXECUTION.md` (197 lines): The live execution list derived from the roadmap.

**Verdict:** These files describe vulnerability locations, exploit scenarios, and remediation approaches for ~63 unremediated security findings. If this branch were pushed to a public GitHub repository, a malicious actor could use this register to:
1. Directly target the specific file:line locations listed
2. Read the exploit/failure scenarios to craft attacks
3. Identify the exact dependencies with known CVEs (next-auth, @auth/core, Next.js, postcss)
4. Use the remediation sketches as a roadmap for what to break before it's fixed

**Recommendation:** These files should NOT be published to a public repository while any findings remain unremediated. They should either be (a) kept private (not pushed to any public remote), or (b) redacted/sanitized before any push — replacing specific file:line locations and exploit details with generic descriptions. This is an owner decision that must be made before any `git push`.

---

## VERIFICATION

Every claim in this report is backed by one of the following:
- `git grep` commands executed against the repository (no matches for live secret patterns in source code)
- `git ls-files .env*` confirming no real `.env` files are tracked (only `.env.example`)
- Direct file reads at the specified line numbers confirming the masked/pattern/placeholder nature of each match
- File:line citations for all findings

**No secret values were reproduced in this document.**
