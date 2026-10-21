# GAP-27 — the draft-only guardrail's X pattern missed the actual transport

**Branch:** `audit/reconciliation-2026-10-20`
**Date:** 2026-10-21
**Gap:** `GAP-27` (MEDIUM) — *"The draft-only guardrail's Twitter/X regex misses the actual
transport"*
**Files:** `scripts/guardrails/draft-only.mjs` (patched), `scripts/guardrails/draft-only.test.mjs`
(new, 5 tests)

---

## 1. The gap, confirmed empirically

`reconciliation/gaps.json` GAP-27 says the pattern misses the real transport. **It does.**

| | |
|---|---|
| the real base URL | `workers/twitter-bot/x-client.js:19` → `const DEFAULT_BASE = "https://api.x.com";` |
| the old pattern | `/api\.twitter\.com\|twitterPost(\|\btweet\s*\(/i` |
| `api.twitter.com` in the tracked tree | **0 hits** — X renamed the host; the legacy name is nowhere |
| `api.x.com` matched by the old pattern | **false** |

So the guardrail was watching a host that does not exist in this repository, while a file
that hard-codes the live one passed clean. **The guardrail was green for the wrong reason.**

`workers` is in the guardrail's `SCAN_DIRS`, so the file was being scanned — and the pattern
simply did not match it.

## 2. What the gap's recommended action would have done — and why it was not enough

GAP-27's action reads: *"Add `api\.x\.com` to the pattern. This is a one-line fix to a
guardrail, not a change to any prod behavior flag."*

**Applied literally, that one-line fix turns CI red.** Measured, with the pattern changed and
nothing else:

```
[draft-only] FAIL - 9 forbidden pattern hit(s) across 3758 scanned file(s):
  workers\twitter-bot\oauth1.test.js:183  [twitter-api]  -> url: "https://api.x.com/2/tweets",
  ... 8 more ...
  workers\twitter-bot\x-client.js:19     [twitter-api]  -> const DEFAULT_BASE = "https://api.x.com";
```

**The gap is right that the pattern is wrong and wrong that the fix is one line.** The regex
was a symptom; the missing half is the **named boundary** — a decision about what the X
transport is, rather than an accident of a regex that looked in the wrong place.

## 3. What was actually done — three parts

### 3a. The pattern now matches the real transport

```js
{ id: "twitter-api", rx: /api\.(?:twitter|x)\.com|twitterPost\(|\btweet\s*\(/i, desc: "Twitter/X API" },
```

The host is **added**, not substituted: `api.twitter.com` is still caught, so the fix does not
narrow the guardrail.

### 3b. The X transport is a NAMED, DOCUMENTED boundary

The 9 hits are a real publish-side transport. They are allow-listed as three specific files —
`workers/twitter-bot/oauth1.js`, `sender.js`, `x-client.js` — each with the substantive
grounds recorded in the source:

1. **THE ENGINE CANNOT TRIGGER IT.** `workers/twitter-bot/` has **zero** importers outside its
   own directory: no caller in `apps/` or `packages/`, no cron, no `vercel.json` entry, no CI
   reference, no shell invocation. It is a standalone operator-run worker. The guardrail
   exists to catch paths *"the engine could trigger"*; this is not one.
2. **IT IS TRIPLE-GATED ON THE SEND PATH**, not at schedule time. The sender checks
   `MUTE_BOT` at *send* time (a mute that applies on the next cycle is not a mute), records
   the idempotency key *before* the request leaves (a lost response is `UNKNOWN` and **not
   retried**, rather than posted twice), and writes the existing `BotOutboxRecord` ledger. The
   outbox itself is a **draft** planner — `apps/web/app/api/cockpit/bot-outbox/preview` is
   operator-review-only and calls no transport.
3. **IT IS A DELIBERATE, DOCUMENTED SUBSYSTEM** with its own 41-test suite, including the
   RFC 5849 §3.4.1.1 base-string vector.

**What would revoke it:** if anything in `apps/` or `packages/` ever imports
`workers/twitter-bot/`, or a cron/vercel entry ever invokes it. The test added with this
change asserts exactly that, and fails if it happens.

### 3c. The test-file rule covered `.ts` but not `.js`

8 of the 9 hits were in `workers/twitter-bot/oauth1.test.js`. The whitelist excluded
`.test.ts` / `.test.tsx` / `.spec.ts` / `.spec.tsx` but **not** `.test.js` — so a test
fixture could fail the guardrail, and the transport's own suite was reported as a violation.
A test that asserts on a URL is not a send path; it is the *evidence* that the send path is
correct. The rule now covers `.js`, `.jsx`, `.mjs`, `.cjs`.

## 4. The test — and the two bugs in it that the mutation check found

`scripts/guardrails/draft-only.test.mjs`, 5 tests, asserting three things that must hold
simultaneously:

1. the pattern matches the real transport (`https://api.x.com`, and the constructed
   `/2/tweets` URL);
2. the pattern **still** matches the legacy host — the fix adds a host, it does not replace
   one;
3. the named exception is **tight** — exactly the three transport files, no more — and is
   **revoked automatically** if the transport ever becomes reachable from the engine.

**The revocation test is the one that matters.** An allow-list is a promise, and a promise
nobody checks is a promise that decays. That test fails the moment the exception stops being
justified.

### Two real bugs in the test, found by running it

Both were the test asserting for the wrong reason — the failure mode this audit keeps hitting:

- **The test read the WRONG FILE.** `ROOT` was resolved with three `..` from
   `scripts/guardrails/`, landing on `C:\Users\Garrett` — the *parent* of the repo — so the
   test was reading a different copy of the guardrail. It is now two `..`.
- **The revocation test matched 19 legitimate files.** It matched the bare substring
  `twitter-bot`, which hits the *template* layer (`apps/web/lib/twitter-bot/templates/*`) — a
   different subsystem that renders post text and never imports the transport. It also matched
  `x-client` inside `espn-powerindex-client.js` and `prophetx-client.js`, and the guardrail's
  own source. A test that is permanently red gets switched off; the patterns now require the
  transport's own path or a path-segment `x-client`.

## 5. The mutation check — the test can go red

Run against the real file, with the source restored in a `finally` each time:

| mutation | result |
|---|---|
| baseline (fix in place) | **pass=5 fail=0** |
| the regex reverted to the pre-fix one (the GAP-27 bug) | **pass=4 fail=1** — *"the X pattern matches the transport the repo ACTUALLY uses"* |
| the whitelist widened by one file | **pass=4 fail=1** — *"the named X exception covers the transport and NOTHING else"* |

Both mutations are caught, and the source was verified byte-identical after restore.

## 6. Verification

| check | result |
|---|---|
| `node scripts/guardrails/draft-only.mjs` | exit **0** — `OK - scanned 3753 file(s)` |
| `node --test scripts/guardrails/draft-only.test.mjs` | **5 passed / 0 failed** |
| the other 8 guardrail suites | all exit **0** |
| `tsc` (packages/prediction-engine) | **64** — the exact baseline, none in the touched files |
| `reconciliation/_audit_unenforced_thresholds.mjs` | exit **0** |
| `reconciliation/_check_class_a_coverage.mjs` | exit **0** |
| `.github/workflows/ci.yml` | YAML parses; matrix now **21** entries, no missing files, no duplicates |

**The new test is in CI**, in the same matrix as the other 20 guardrail suites.

## 7. What is NOT done

- **The `apps/web/lib/twitter-bot/templates/*` layer is not part of this boundary.** It renders
  post *text* and imports no transport, so it was never a violation and never needed an
  exception. It is excluded from the revocation test for exactly that reason — a reference to
  the template layer is not a reference to the transport.
- **The broader no-publish doctrine is untouched.** GAP-25 says the doctrine is being
  *retired* and that the guardrail needs a named publish boundary; this change adds one
  boundary (the X transport) but does not reconcile the rest. **GAP-25 remains open.**
- **`workers/twitter-bot` is still zero-import.** That is a *fact about the repo*, not a
  guarantee. The revocation test now turns it into a gate: if the transport ever becomes
  reachable, CI goes red and the exception is removed by hand.
