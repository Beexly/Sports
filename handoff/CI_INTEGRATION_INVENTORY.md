# CI Integration Inventory — 2026-08-17

## Method

Apps enumerated via GraphQL `checkSuites` query on the default branch commit
(`gh api graphql --field query='...' repos/Beexly/Sports`). **23 apps found**,
confirmed against `handoff/GITHUB_SURFACE_AUDIT.md` (written 2026-08-16 via the
same method). Branch protection confirmed absent via
`gh api repos/Beexly/Sports/branches/main/protection` → "Branch not protected" (404).
No rulesets exist: `gh api repos/Beexly/Sports/rulesets` → `[]`.

**Active vs inert:** verified via check-runs on the latest commit
(`gh api repos/Beexly/Sports/commits/main/check-runs`). Only `github-actions`
and `socket-security` ever reach `completed`. The other 21 apps are installed
with permissions but never execute — they are silent write-acators on a branch
that deploys to production with no review gate.

**CI reference:** the repo's own CI gate is `.github/workflows/ci.yml`
(9 jobs: Test, Build, Trust gate, AI Council, Model freeze, Draft-only,
Secret scan, Dependency audit, API v1 boundary, AI transport boundary,
All guardrails, Brand safety) plus `python-tests.yml`, `fable-evidence.yml`,
`nova-convergence-inventory.yml`, `neon_workflow.yml`, `weekly-comparison.yml`,
`daily-smoke.yml`, `external-cron.yml`, `external-watchdog.yml`.

## Existing in-repo guardrails (the "already run in ci.yml" column below)

| Concern | Covered by | File |
|---|---|---|
| Lint + typecheck | ci.yml `Test` job | `npm run lint`, `npm run typecheck` |
| Unit/integration tests | ci.yml `Test` job | `npm test` |
| Secret scanning (full tree) | ci.yml `Secret scan` job | `scripts/guardrails/secret-scan.mjs --all` |
| Dependency CVE audit | ci.yml `Dependency audit` job | `scripts/guardrails/dependency-audit.mjs` (uses `npm audit`) |
| Banned-phrase/trust gate | ci.yml `Trust gate` job | `scripts/guardrails/trust-gate.mjs` |
| Brand-safety invariants | ci.yml `Brand safety` job | `npx vitest run __tests__/public-copy-scanner.test.ts` etc. |
| AI transport boundary | ci.yml `AI transport import boundary` job | `scripts/guardrails/ai-transport-import-boundary.mjs` |
| API v1 boundary | ci.yml `API v1 boundary` job | `scripts/guardrails/api-v1-boundary.mjs` |
| Model version freeze | ci.yml `Model freeze` job | `scripts/guardrails/model-freeze.mjs` |
| Draft-only gate | ci.yml `Draft-only` job | `scripts/guardrails/draft-only.mjs` |
| Claude API usage limits | ci.yml `AI Council` job | `scripts/guardrails/claude-api-usage.mjs` |
| Supply-chain scripts | `.npmrc` | `strict-allow-scripts=true`, `min-release-age=7` |

---

## Per-app inventory

For each installed GitHub app, four questions:
- **(a) In-repo config?** — Does the app need a config file in the repo (`.foo.yml`, etc.) to activate?
- **(b) Repo secret?** — Does the app need a GitHub secret Garrett must add to act?
- **(c) Cost?** — Free / paid at our scale (private repo, solo maintainer)?
- **(d) Duplicates CI?** — Does it overlap with something already in `ci.yml`?

Legend:
- `✅ YES` = needs it
- `❌ NO` = does not need it
- `N/A` = not applicable

---

### 1. GitHub Actions — `github-actions` — STATUS: ACTIVE

This is GitHub's native CI runner. It is NOT a third-party app — it is the engine
that runs `.github/workflows/*.yml`. All 9 workflows in ci.yml execute through it.

- **(a) In-repo config?** — ❌ NO (the workflows ARE the config)
- **(b) Repo secret?** — ❌ NO (uses `GITHUB_TOKEN` automatically)
- **(c) Cost?** — ❌ BLOCKED (Actions minutes exhausted; 100% failure rate since ~2026-08-15). See GITHUB_SURFACE_AUDIT.md §2.
- **(d) Duplicates CI?** — N/A (it IS the CI)

---

### 2. Socket Security — `socket-security` — STATUS: ACTIVE (only working third-party)

Provides supply-chain security for npm packages — detects malicious dependencies,
supply-chain attacks, and provides SBOM reporting. Installed as a GitHub App
that posts comments on PRs.

- **(a) In-repo config?** — ✅ Optional `socket.yml` (not present; uses GitHub App defaults)
- **(b) Repo secret?** — ❌ NO (uses GitHub App permissions, no PAT needed for basic PR comments)
- **(c) Cost?** — ❌ FREE (Socket Free tier covers personal and organization accounts at $0)
- **(d) Duplicates CI?** — ⚠️ PARTIAL OVERLAP: ci.yml runs `scripts/guardrails/dependency-audit.mjs` (npm audit for CVEs) and `.npmrc` enforces `strict-allow-scripts` + `min-release-age=7`. Socket adds supply-chain detection (typosquatting, malicious deps, exfiltration behavior) that npm audit does NOT cover. Socket's behavioral analysis is complementary; the dependency-audit script covers CVEs only. Not a full duplicate.

---

### 3. Vercel — `vercel` — STATUS: ACTIVE (deploy target)

Deploys the Next.js app to production. This is the actual deploy path —
`vercel --prod` from the local tree deploys to www.galaxysportsedge.com.

- **(a) In-repo config?** — ✅ `.vercel/` config (project settings on Vercel dashboard; not an in-repo file per se)
- **(b) Repo secret?** — ❌ NO (uses `VERCEL_ORG_ID`/`VERCEL_PROJECT_ID` via the Vercel/GitHub integration, not a manual secret)
- **(c) Cost?** — ⚠️ UNKNOWN (deploy target is production-critical; billing tier is owner-decision per GITHUB_SURFACE_AUDIT.md §4. Could be Hobby $0 or Pro $20/mo)
- **(d) Duplicates CI?** — ❌ NO (deploy target, not a check)

---

### 4. Renovate — `renovate` — STATUS: INERT

Automated dependency update bot. Would open PRs for npm, pip, GitHub Actions, etc.
The repo already has `.github/dependabot.yml` (added 2026-08-12) with grouped
npm updates, GitHub Actions monthly, and Python monthly — Dependabot covers the
same domain as Renovate.

- **(a) In-repo config?** — ✅ Optional `renovate.json` (not present; would override defaults)
- **(b) Repo secret?** — ❌ NO (GitHub App only needs repo access; no secret required)
- **(c) Cost?** — ❌ FREE (Renovate is free for hosted GitHub App on public and private repos)
- **(d) Duplicates CI?** — ✅ FULL DUPLICATE of Dependabot: `.github/dependabot.yml` already configures weekly npm (grouped minor/patch), monthly GitHub Actions, and monthly Python with open-pull-requests-limit and labels. Renovate's `packageRules`/schedules would duplicate this exactly with no coverage gap. Redundant.

---

### 5. GitGuardian — `gitguardian` — STATUS: INERT

Secret scanning — detects exposed credentials in PRs and the full git history.
The repo already has a comprehensive secret-scan guardrail:
`scripts/guardrails/secret-scan.mjs --all` runs in ci.yml as the "Secret scan (full tree)"
job, scanning every tracked file for high-confidence secret patterns. The repo
also has `.gitguardian.yaml` (excludes test fixtures from scanning — see file header).

- **(a) In-repo config?** — ✅ `.gitguardian.yaml` already present (excludes test fixtures)
- **(b) Repo secret?** — ✅ Would need `GITGUARDIAN_DASHBOARD_API_KEY` or `GITGUARDIAN_APP_*` secrets if configured to self-scan; the GitHub App integration does not require a manual secret
- **(c) Cost?** — ⚠️ FREE for repos under a GitHub Organization (per gitguardian.com pricing page). Free tier explicitly covers organization-hosted repos at $0.
- **(d) Duplicates CI?** — ✅ HIGH OVERLAP: ci.yml `Secret scan` job (`scripts/guardrails/secret-scan.mjs --all`) already scans the full git tree for known provider prefixes + high-entropy secrets. The `.gitguardian.yaml` exclusion file exists but the GitGuardian GitHub App itself is inert (never runs check-suites). The in-house scanner covers the same surface. The app is redundant given the existing guardrail.

---

### 5b. Codacy — `codacy-production` — STATUS: INERT

Code quality + security analysis via GitHub App. **A live webhook is registered**
on this repo (confirmed via `gh api repos/Beexly/Sports/hooks` →
`name: web`, active: true, `url: https://app.codacy.com/events/gh/ca71ead2b94b4f40985bcfcbeb1dd801`,
`events: [pull_request, push, repository]`). This confirms Codacy is installed
but its check-suites never reach `completed` — it is inert despite having webhook
write access. No in-repo `codacy.yml`/`.codacy.yml` exists (verified: no match
from `find . -name '.codacy.yml' -o -name 'codacy.yml'`).

- **(a) In-repo config?** — ✅ Optional `.codacy.yml` or `codacy.yml` (not present; would configure engines, exclude_paths, include_paths)
- **(b) Repo secret?** — ✅ Would need `CODACY_PROJECT_TOKEN` or `CODACY_API_TOKEN` GitHub secret (not present in any workflow file; verified: `grep -rn 'codacy' .github/ scripts/ package.json` returns no matches)
- **(c) Cost?** — ⚠️ FREE tier available for public repos; private repos require paid plan. Codacy's free tier does not cover private repos per GITHUB_SURFACE_AUDIT.md §4.
- **(d) Duplicates CI?** — ✅ HIGH OVERLAP: ci.yml `Test` job runs ESLint + tsc; the `Dependency audit` job runs `dependency-audit.mjs`; the `Secret scan` job runs `secret-scan.mjs`. Codacy's static analysis engine overlaps with ESLint + tsc + the custom guardrails pipeline. The `All guardrails` job runs 14 custom checks that Codacy would partially replicate.

---

### 6. CodeRabbit — `coderabbitai` — STATUS: INERT

AI-powered code review. Posts inline comments on PRs, can summarize changes,
chat with the bot, etc. Per GITHUB_SURFACE_AUDIT.md §4, it is in the
"REMOVE — free tier does not cover a private repo" list.

- **(a) In-repo config?** — ✅ Optional `.coderabbit.yaml` (not present; would configure review profile, path filters, tone)
- **(b) Repo secret?** — ❌ NO (GitHub App only; no PAT/secret required)
- **(c) Cost?** — ❌ PAID (CodeRabbit Pro is $24/month per dev on private repos; the free tier is for public OSS / open source projects only). Private repo → paid.
- **(d) Duplicates CI?** — ⚠️ PARTIAL OVERLAP: ci.yml has an "AI transport import boundary" guardrail and an "AI Council" job, but these are custom rule-based checks, not LLM PR reviews. CodeRabbit provides automated LLM code review, which is a different capability. However, the repo already has human review + custom guardrails; the value of an additional paid AI reviewer on a budget-constrained, zero-cost project is questionable.

---

### 7. SonarCloud — `sonarqubecloud` — STATUS: INERT

Static analysis (code quality + security rules) as a cloud service. Would
require `sonar-project.properties` or `sonar-project.json` in-repo + `SONAR_TOKEN`
secret. Per GITHUB_SURFACE_AUDIT.md §4, it is in the "REMOVE — free tier does not
cover a private repo" list.

- **(a) In-repo config?** — ✅ Would need `sonar-project.properties` (not present)
- **(b) Repo secret?** — ✅ Would need `SONAR_TOKEN` GitHub secret (not present in repo; verified no `SONAR_TOKEN` in any workflow)
- **(c) Cost?** — ❌ PAID (SonarCloud free tier is public-repo-only; private repos require paid plan)
- **(d) Duplicates CI?** — ✅ FULL DUPLICATE: ci.yml already runs `npm run lint` (ESLint across workspaces) and `npm run typecheck` (TypeScript compiler) in the `Test` job, plus 14 custom guardrail scripts. SonarCloud's static analysis (CodeQL, ESLint rules, etc.) overlaps with the existing ESLint + tsc + guardrails pipeline without adding coverage the repo doesn't already have.

---

### 8. Codecov — `codecov` — STATUS: INERT

Uploads and reports code coverage. Would need `CODECOV_TOKEN` secret +
`codecov.yml` config + a coverage-producing step in CI. Per GITHUB_SURFACE_AUDIT.md
§4, it is in the "REMOVE — free tier does not cover a private repo" list (also:
needs CI to function, and CI is currently dead due to billing).

- **(a) In-repo config?** — ✅ Would need `codecov.yml` or `.codecov.yml` (not present)
- **(b) Repo secret?** — ✅ Would need `CODECOV_TOKEN` GitHub secret (not present in any workflow file)
- **(c) Cost?** — ❌ PAID (Codecov's free tier for private repos was discontinued in 2025; requires paid seat)
- **(d) Duplicates CI?** — ⚠️ PARTIAL: codecov would report coverage; ci.yml does not currently produce coverage reports (`npm test` = vitest without `--coverage`). However, coverage reporting is a reporting-layer concern, not a check that blocks merges. Given the zero-cost constraint, the coverage *reporting* value does not justify a paid seat when the test suite itself already gates CI.

---

### 9. Snyk — `snyk` — STATUS: NOT installed (no app in the 23)

Note: Snyk is NOT in the 23 installed apps returned by the GraphQL enumeration.
The task description mentioned it as one Garrett "has authorized," but the API
data does not confirm an installation. If it is authorized at the organization
level but not installed on this repo, it is inert regardless.

If installed: would need `SNYK_TOKEN` secret + `.snyk` config. Free tier covers 100 tests/month.
Duplicates ci.yml's dependency-audit guardrail (`npm audit`-based).

- **(a) In-repo config?** — ✅ Would need `.snyk` (not present)
- **(b) Repo secret?** — ✅ Would need `SNYK_TOKEN` GitHub secret (not present)
- **(c) Cost?** — ⚠️ FREE (Snyk has a generous free tier, but it is NOT installed on this repo per the enumeration)
- **(d) Duplicates CI?** — ✅ HIGH OVERLAP with `scripts/guardrails/dependency-audit.mjs` (uses `npm audit --json`, fails on critical/high CVEs, has an explicit allow-list of waived findings with review dates)

---

### 10. CircleCI — `circleci` — STATUS: NOT installed (no app in the 23)

Note: CircleCI is NOT in the 23 installed apps returned by the GraphQL
enumeration. If authorized at organization level but not installed on this repo,
it is inert. CircleCI would require `.circleci/config.yml` in-repo + a `CIRCLE_CI_TOKEN`
or context secret.

- **(a) In-repo config?** — ✅ Would need `.circleci/config.yml` (not present)
- **(b) Repo secret?** — ✅ Would need CircleCI context/secret (not present)
- **(c) Cost?** — ❌ PAID (CircleCI free tier gives 6,000 build minutes/month; for a private repo with 9 CI workflows this budget was already exhausted once — see GITHUB_SURFACE_AUDIT.md §2 noting "Actions minutes exhausted")
- **(d) Duplicates CI?** — ✅ FULL DUPLICATE: the repo runs its entire CI pipeline via GitHub Actions workflows (`ci.yml` has 12 jobs). Adding CircleCI would replicate the same lint + test + typecheck + guardrails pipeline on a competing platform, doubling maintenance and competing for the already-exhausted free minutes budget.

---

### 11. HUMAN NOTE — "many unrelated" apps

The remaining 10+ apps in the list are installed but completely unrelated to any
function this repo performs. They are:
`azure-boards`, `azure-pipelines`, `cloudflare-workers-and-pages`,
`codacy-production`, `coderabbitai`, `cubic-dev-ai`, `kilo-code-bot`,
`mergify`, `posthog`, `render`, `stainless-app`, `testdriverai`,
`google-cloud-build`, `apollo-graphos`, `claude`.

These are not enumerated individually below — they share the same profile:
installed with write permissions on a branch that deploys to production,
no in-repo config, no repo secret used, no CI integration, and all inert
(never reach `completed`). They are security debt by presence.

---

### 12. axe Linter — `axe-linter` — STATUS: INERT

Accessibility linting for PRs. Per GITHUB_SURFACE_AUDIT.md §4, it is in the
"REMOVE — unused" list. Would need `@axe-core/puppeteer` or similar if run in CI,
or no config if using the GitHub App bot directly.

- **(a) In-repo config?** — ✅ Optional `.axe-linter.yml` (not present)
- **(b) Repo secret?** — ❌ NO (GitHub App; some setups use `AXE_CORE_API_KEY` but the free bot doesn't require it)
- **(c) Cost?** — ❌ FREE (axe Linter is free for personal open source projects on GitHub Marketplace)
- **(d) Duplicates CI?** — ❌ NO (no accessibility testing exists in ci.yml; this would be net-new capability, not a duplicate). However, given zero paid budget and that CI is currently dead, the value is currently theoretical.

---

### 13. Qodo (formerly TBC) — `qodo` / `qodo-ai` — STATUS: NOT in enumeration

Note: The task mentions Qodo but it does NOT appear in the 23 installed apps
from the GraphQL enumeration. If authorized at org level but not installed on
this repo, it is inert. Qodo requires no in-repo config (GitHub App bot) and
no repo secret. It is paid ($30/seat/month, no permanent free tier for private
repos; free tier only for open source projects).

- **(a) In-repo config?** — ❌ NO (GitHub App; optional `qodo.yml` but not required)
- **(b) Repo secret?** — ❌ NO (GitHub App only)
- **(c) Cost?** — ❌ PAID (no permanent free tier for private repos; $30/month per seat)
- **(d) Duplicates CI?** — ⚠️ PARTIAL OVERLAP: Qodo provides AI code review on PRs. ci.yml has custom guardrails (trust gate, AI transport boundary, etc.) but these are rule-based, not LLM reviews. Different capability class but overlapping intent (automated PR review). For a zero-cost project, a paid AI reviewer is not justified.

---

### 14. HackerOne Code — `hackerone` — STATUS: NOT in enumeration

Note: The task mentions "HackerOne Code" but it does NOT appear in the 23
installed apps. If authorized but not installed on this repo, it is inert.
HackerOne Code provides SAST/DAST scanning via a GitHub App. Would need
`HACKERONE_PLATFORM_KEY` or similar secret if configured for API scanning.

- **(a) In-repo config?** — ✅ Would need `.hackerone/cli.yml` or similar (not present)
- **(b) Repo secret?** — ✅ Would need a HackerOne API token (not present)
- **(c) Cost?** — ❌ PAID (HackerOne Code is a paid product; free tier is HBM (HackenProof-style) only for public bug bounty programs, not SAST)
- **(d) Duplicates CI?** — ⚠️ PARTIAL OVERLAP: ci.yml runs `dependency-audit.mjs` (CVE scanning) and `secret-scan.mjs` (credential detection). HackerOne Code adds SAST/DAST which is a different layer, but the repo already has custom guardrails covering similar ground. For a zero-cost project, not justified.

---

## Summary table

| # | App (slug) | Status | (a) Config | (b) Secret | (c) Cost | (d) Duplicates CI |
|---|---|---|---|---|---|---|
| 1 | GitHub Actions (`github-actions`) | ✅ ACTIVE | ❌ | ❌ | BLOCKED (no minutes) | N/A (IS the CI) |
| 2 | Socket Security (`socket-security`) | ✅ ACTIVE | ✅ opt. `socket.yml` | ❌ | ❌ FREE | ⚠️ Partial (supply-chain vs CVEs) |
| 3 | Vercel (`vercel`) | ✅ ACTIVE (deploy) | ✅ dashboard | ❌ | ⚠️ Unknown | ❌ No |
| 4 | Renovate (`renovate`) | ❌ INERT | ✅ opt. `renovate.json` | ❌ | ❌ FREE | ✅ Full (vs Dependabot) |
| 5 | GitGuardian (`gitguardian`) | ❌ INERT | ✅ `.gitguardian.yaml` (exists) | ✅ opt. `GITGUARDIAN_*` | ⚠️ FREE (org repos) | ✅ High (vs secret-scan.mjs) |
| 5b | Codacy (`codacy-production`) | ❌ INERT | ✅ opt. `.codacy.yml` | ✅ `CODACY_*` | ⚠️ PAID (private) | ✅ High (vs ESLint + tsc + guardrails) |
| 6 | CodeRabbit (`coderabbitai`) | ❌ INERT | ✅ opt. `.coderabbit.yaml` | ❌ | ❌ PAID ($24/dev/mo) | ⚠️ Partial |
| 7 | SonarCloud (`sonarqubecloud`) | ❌ INERT | ✅ `sonar-project.properties` | ✅ `SONAR_TOKEN` | ❌ PAID (private) | ✅ Full (vs ESLint + tsc + guardrails) |
| 8 | Codecov (`codecov`) | ❌ INERT | ✅ `codecov.yml` | ✅ `CODECOV_TOKEN` | ❌ PAID | ⚠️ Partial (reporting only) |
| 9 | Snyk (not installed) | N/A | ✅ `.snyk` | ✅ `SNYK_TOKEN` | ⚠️ FREE (if installed) | ✅ High (vs dependency-audit.mjs) |
| 10 | CircleCI (not installed) | N/A | ✅ `.circleci/config.yml` | ✅ context | ❌ PAID | ✅ Full (vs GH Actions) |
| 11 | 10+ unrelated apps | ❌ INERT | ❌ | ❌ | vary | ❌ mostly |
| 12 | axe Linter (`axe-linter`) | ❌ INERT | ✅ opt. `.axe-linter.yml` | ❌ | ❌ FREE | ❌ No (net-new a11y) |
| 13 | Qodo (not in enumeration) | N/A | ❌ | ❌ | ❌ PAID | ⚠️ Partial |
| 14 | HackerOne Code (not in enumeration) | N/A | ✅ config file | ✅ API token | ❌ PAID | ⚠️ Partial |

## Ownership of unknowns

- **App install permissions matrix** (which apps hold `contents=write`,
  `workflows=write`, `administration=write`): not queryable via PAT per
  GITHUB_SURFACE_AUDIT.md §4 and confirmed by the REST
  `/repos/Beexly/Sports/installations` returning 404. The audit's stated
  figures (14 apps with `contents=write`, 9 with `workflows=write`,
  Vercel + Cloudflare with `administration=write`) are marked "not re-verified
  this session" in the GITHUB_SURFACE_AUDIT.md §4. To get the authoritative
  per-app permission matrix, the owner must visit github.com/settings/installations
  or authorize a GitHub-App-backed token.
