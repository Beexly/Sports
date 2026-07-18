# Galaxy Sports Edge — Security Residue (LC-003)

**Generated:** 2026-07-18 23:20 UTC
**Full machine-readable record:** `SECURITY_RESIDUE.json`
**Boundary:** this report never prints, uses, or tests the raw secret value. Only a SHA-256
fingerprint, length, and charset are recorded. No live call was made to the-odds-api.com with
this or any other credential.

## SR-001 — Live-shaped `THE_ODDS_API_KEY` hardcoded on an unlanded branch

**Where:** `scripts/local.sh:64` on branch `claude/fix-local-setup-PmnyX`
(commit `27e85eaba0efdfbee9504bc9ac43055d261e80da`, 2026-04-22). **Still present on GitHub right
now** — not merged, not on the frozen recovery branch, not deleted.

First flagged during Recovery Wave R11.5 (DEC-051), which correctly declined to port this
branch's setup script for exactly this reason but didn't go further. This pass fingerprints it,
searches for duplicates, checks scanner coverage, and produces an exact owner action.

- **Shape:** 32 lowercase-hex characters — matches The Odds API's published key format exactly.
- **SHA-256 fingerprint:** `076035217a9d4263f44f8d27e9a9916401c6a3046037719f48bb9ca378e0600f`
- **Duplicate search:** `git log --all -S<value>` across every reachable branch found exactly
  **one** match — the source commit itself. No other exposure found in this repo's local git
  object store.
- **Scanner coverage (before this pass): did NOT catch it.** The Odds API issues unprefixed hex
  keys, so `secret-scan.mjs` had no rule that could match this shape without a blanket bare-hex
  rule that would drown in false positives on git SHAs and hashes elsewhere in the tree.
- **Fixed this pass:** added one precise rule (`odds-api.key.embedded`) anchored on the
  `THE_ODDS_API_KEY` environment-variable **name** immediately preceding an assignment (`=`,
  `:`, `:=`, or bracket-notation like `process.env["THE_ODDS_API_KEY"] =`), not on the value's
  shape alone. An independent red-team pass on the first version of this fix found it was
  bypassable via colon-equals syntax and bracket-notation env access — both closed in the
  version now landed. Verified: a full `--all` scan of all 3,800 tracked files stays clean (zero
  new false positives), and four synthetic fixtures (the base case, the two red-team-identified
  bypasses, and the existing hyphenated test-fixture shape used elsewhere in this repo's own
  test suite) all classify correctly.
  **Known residual gap, not fixed:** this rule, like every rule in `secret-scan.mjs`, is
  line-based — a value split across a line boundary (YAML block-scalar style) is not caught.
  Restructuring the shared scan engine for one rule was judged out of proportion to the risk,
  since this codebase has no YAML config surface for this credential today.

## Quarantine

`claude/fix-local-setup-PmnyX` is quarantined: not ported, not to be ported in its current form,
not to be checked out into any working tree, not to be merged. The underlying idea (a
one-command local dev bootstrap) is reasonable — a sibling branch,
`claude/debug-previous-fix-g06Wz` (DEC-052), already does the same thing correctly (sources from
`.env.example`, verified no hardcoded secret). Any future recovery of this branch's genuinely
useful content must strip `THE_ODDS_API_KEY` entirely first and land as a fresh, key-free commit
— never carry this commit's history forward.

## OG-LC-003 — Owner rotation action

```text
Decision: Rotate (or explicitly confirm-not-needed) THE_ODDS_API_KEY at the-odds-api.com.
Why founder authority is required: only the founder holds the account credentials; rotating
  a billable API key is an external action no agent can or should take autonomously.
Exact action and location: in Vercel (Project -> Settings -> Environment Variables ->
  production), reveal THE_ODDS_API_KEY's value. Avoid typing/pasting it into a shell command
  yourself where avoidable -- an interactive `export THE_ODDS_API_KEY=<value>` lands the raw
  key in your shell history even though the fingerprint command below is itself safe. If you
  must set it in a terminal: prefix with a leading space (most shells skip history for
  space-prefixed lines under HISTCONTROL=ignorespace) or use `read -s THE_ODDS_API_KEY` to
  enter it without echo or history.
  FIRST confirm the variable is actually populated: `echo -n "$THE_ODDS_API_KEY" | wc -c`
  should print 32 -- a 0 means it's empty/unset, and comparing an empty value's hash would
  falsely read as "no exposure" without having checked anything.
  THEN run `echo -n "$THE_ODDS_API_KEY" | sha256sum` (prints only a hash, never the key) and
  compare only the resulting hash to:
  076035217a9d4263f44f8d27e9a9916401c6a3046037719f48bb9ca378e0600f
  If it matches, rotate the key at the-odds-api.com and update THE_ODDS_API_KEY in Vercel
  production (and any other environment still holding the old value).
Safe non-destructive default: if the fingerprint does NOT match AND the length check confirmed
  32 characters (i.e. the comparison was actually performed against a real value), no rotation
  is required — production was never running the exposed value. A non-match against a 0-length
  variable means nothing was actually checked.
Work completed around the gate: scanner gap closed (this exact shape can't land silently
  again); source branch quarantined; fingerprint computed so the founder never needs this
  session to reveal or re-derive the value.
Verification: after rotation (if performed), confirm the new key's fingerprint differs from the
  one above, and confirm /api/health's ingestion check still reports ok.
Rollback: the-odds-api.com typically allows reverting within a short grace window — standard
  key-rotation rollback via their dashboard, not code-related.
Re-entry condition: N/A — single-shot founder action once the fingerprint comparison is done.
```

## Other embedded-credential sweep

Cross-referenced every branch flagged in DEC-051/DEC-052's R11.5 sweep for the same class of
finding. SR-001 is the only one found. This is a targeted cross-reference against prior
sessions' own findings, not a fresh independent secret-scan of all ~138 historical branches'
full content (the R11.5 sweep itself explicitly abandoned an unbounded `git log -S` across all
138 branches as too slow) — if a fresh full-history sweep is wanted, it should be scoped as its
own dedicated workstream.

**Zero other confirmed embedded credentials found this pass.**
