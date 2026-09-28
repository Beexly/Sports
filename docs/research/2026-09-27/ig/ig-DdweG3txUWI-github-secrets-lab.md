# IG reel DdweG3txUWI — GitHub secrets lab applied to Garrett's repos

## What the reel teaches
@carterperez.dev (Carter Perez, posted 2026-09-26) walks through **TruffleHog**
(github.com/trufflesecurity/trufflehog): install via `git clone` + `go install`,
then scan any repo or GitHub URL with `trufflehog git <url> --results=verified`.
The key point: it *verifies* findings against providers, so a hit is a live
credential, not a dead pattern. The demo shows a verified AWS key (a canary
token from canarytokens.org). His deeper guide is gated behind commenting
"SECRET" (DM automation) — this note reimplements the equivalent audit on
Garrett's repos using the repo's own git-security-guard pattern set
(~/.workspace/skills/git-security-guard/SKILL.md), since trufflehog/gitleaks
are not installed on this VM.

## Scan performed (read-only, 2026-09-27 ~22:15 CDT)
- Repos scanned: ~/workspace/vendor/{Clouds-bruh, Project-Tree, Sports,
  agent-bus, autonomous-revenue-engine, ios-swiftui, meta-model-cookbook,
  muse-code-sdk, omniroute}
- Skipped entirely per standing rule: gse-grok-build-sandbox
- Filename sweep: tracked files matching `.env*`, `*credential*`, `*secret*`,
  `*.pem`, `*.key`, etc. (examples/templates excluded)
- HEAD content sweep: git-security-guard key patterns (OpenAI/Gemini/Groq/
  Stripe/AWS/GitHub-PAT/Slack/JWT/NVIDIA-NVAPI/private-key shapes)
- Deep history sweep of Sports (7,627 commits, all refs): same patterns over
  `git log --all -p`
- ~/workspace/goals tree: credential-filename sweep

## Findings

### 1. HIGH — Neon `neondb_owner` password still recoverable from Sports history
- **Where:** `docs/research/2026-09-25/HANDOFF-CONTINUE-WIRING-2.md`, line 232
  (`$env:DATABASE_URL = "postgresql://neondb_owner:<live-password>@<neon-pooler-host>/..."`)
- **Commits:** scrub commit `6fd546dbd` (2026-09-25,
  "security: redact leaked Neon owner password from wave6 handoff doc")
  replaced the password with a placeholder; the value is recoverable from the
  parent tree (`6fd546dbd^`) and every commit before it.
- **Reachability:** the pre-scrub tree is reachable from `origin/main`
  (`remotes/origin/HEAD -> origin/main`). Anyone cloning the public repo can
  extract it. The 9/25 scrub removed it from working files only — history
  was never rewritten.
- **Rotation status:** NOT confirmed by Garrett (standing open item since
  2026-09-25). Note the scrub placeholder text reads
  `REDACTED-ROTATED-IN-NEON-CONSOLE` — that claim is unverified; treat the
  password as live and compromised.
- **Action (his tap only):** rotate the password in the Neon console NOW;
  then a history purge (filter-repo/BFG + force-push) — do NOT force-push
  without his word. No credential values are recorded in this note.

### 2. LOW — Tracked `.env.local` in Clouds-bruh
- **Where:** `apps/storefront/.env.local`, added in commit `1d3931f`
  ("build(cloud): promote project to repo root so Medusa Cloud finds the lockfile")
- **Contents (shapes only):** 3 real values — two backend URLs and one
  67-char Medusa publishable key.
- **Verdict:** publishable keys are public-by-design and the URLs are not
  secrets; severity is hygiene-only. `.env.local` should not be tracked —
  untrack it (`git rm --cached`) or move the values into the deployment
  platform's env config.

### 3. Clean — everything else
- All HEAD content hits across Sports/ios-swiftui/omniroute/Clouds-bruh are
  test fixtures and placeholders (`sk_live_x`, `sk_live_present`,
  `<redacted>`, `<YOUR-KEY>` style) — false positives per the guard rules.
- Sports full-history deep scan for key-shaped strings: **0 hits**.
- omniroute has real `.env` / `.env-local` on disk but they are **untracked**
  in git — no git exposure.
- goals tree: no credential files found.

## Remediation checklist
1. [ ] Garrett: rotate Neon `neondb_owner` password in the Neon console
      (urgent — value recoverable from public history).
2. [ ] His call: rewrite Sports history to purge the password
      (git filter-repo/BFG + `git push --force`), or accept that the rotated
      password's history stays. Nothing to do until step 1 is done.
3. [ ] Untrack Clouds-bruh `apps/storefront/.env.local` or leave as-is
      (low risk either way).
4. [ ] Standing: CI secret scan already gates the full tree per the 2026-09-25
      observability note — keep it; add the skill's pre-commit hook as a
      second layer.

## Raw material
Fetch JSON and media summaries for this reel stay in the parent workspace
(`~/workspace/ig-post-DdweG3txUWI.json`,
`~/workspace/ig-comments-DdweG3txUWI.json`,
`~/workspace/ig-media-DdweG3txUWI.json`) — captions summarized here, not
reproduced verbatim.
