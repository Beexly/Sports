# CLAIMS_AUDIT — P4-1 (`.claude/commands/check-claims.md`)

Run: 2026-09-25 ~08:30 CDT · branch `hermes/live-wip-2026-09-24` @ `656318859`
Scope: execute the command file's two guard invocations, then probe the coverage the
guards do NOT have. Read-only. No product file touched.

## 1. Command-file guards (the hard stop)

| Guard | Exit | Output |
|---|---|---|
| `npm run guard:performance-claims` | **0** | `[no-unsupported-performance-claims] OK - scanned 476 file(s); no unsupported performance claims.` |
| `npm run guard:commercial-copy` | **0** | `[commercial-copy-scan] OK - scanned 470 file(s); no unsafe commercial copy.` |

Both green. Zero instances to list with `file:line` — the command file asks for that
list and it is empty.

## 2. What those guards actually check

`no-unsupported-performance-claims.mjs` is not a keyword smoke test. Worth recording
so nobody treats "the guard passed" as "the copy is true":

- **Lexicon of 14 claim strings** (lines 77-91): `win rate`, `roi`, `profit`,
  `profitable`, `verified`, `proven`, `calibrated`, `beats market`,
  `beat the market`, `closing line value`, `clv`, `positive expected value`, `+ev`.
- **Clause-scoped exemption** (lines 108-123). The comment at 102-107 records the bug
  this replaced: an evidence NOUN anywhere on the line used to excuse every hardcoded
  stat on it, so a fabricated "68% win rate across 500 settled picks" borrowed
  "settled" from a different clause. Negation/evidence words are now matched only
  within the enclosing clause (60 chars before, 24 after, cut at `. ! ? ; —`).
- **A numeric second pass** with a narrower exemption list: the evidence nouns
  (`settled`, `sample`, `window`, `threshold`, `model version`) are deliberately
  excluded from the numeric exemption because a tout can borrow them.
- **Coverage beyond route files**: `walkRenderedSurfaces()` over app route files
  (17-63) plus `NUMERIC_EXTRA_ROOTS` (130-140) — `apps/web/components`, `workers`,
  the twitter/discord bots, `bot-outbox`, `lib/proof`, and the `humans.txt` /
  `llms.txt` / `ai.txt` text endpoints. The stated reason (126-129) is that these are
  not rendered route files, so a hardcoded stat in a tweet template or a text
  endpoint is the same fabrication and would otherwise be unreachable.

## 3. Supplementary probe — claim phrasing the lexicon would MISS

The command file says "flag any claim not directly backed by current graded-pick
data". The guard can only flag claims containing one of its 14 strings. So I probed
for superlative/comparative accuracy phrasing that carries no lexicon word:

```
git grep -nEi "(most accurate|more accurate than|beats? the (book|market)|
  better than (every|all) other|sharpest (edge|pick)|outperform(s|ing)?
  (every|all|every other)|#1 (in accuracy|accuracy)|industry[- ]leading|
  state[- ]of[- ]the[- ]art|unmatched|no one else)" \
  -- apps/web/components apps/web/app ":(exclude)apps/web/app/api"
```

**2 hits, 0 findings.** Both are `apps/web/components/world/no-bet-gate.tsx`
lines 8 and 56: `"the sharpest pick is no pick."` That is the restraint line — the
opposite of a performance claim, and lexically adjacent to `sharpest pick`. It
passed the guard on its merits, not by accident.

## 4. NOT DETERMINED / coverage gaps

- **Non-superlative, non-lexicon claims are structurally invisible to this command.**
  "our reads beat the books", "the sharpest edge in fantasy", "we find value where
  others cannot" would all pass: no lexicon token, and the probe above only catches
  the superlative constructions. Anything phrased as a plain assertion of quality
  is not machine-checked here. This is the honest limit of P4-1, not a defect found.
- **Neither guard consults the database.** "Backed by current graded-pick data" is
  NOT verified by this run. Both guards are static text scanners. Whether a win-rate
  string is *true* against settled picks is out of scope for this command and was
  not measured.
- **The scan is a path allowlist, not the whole repo.** 476 and 470 files scanned;
  `packages/`, `docs/`, and `handoff/` are not in either guard's roots, by design.
- **Both guards pass, which is a weaker statement than "the copy is honest."** It
  says no file matching the lexicon tripped a rule. It does not say the copy is
  accurate.

## 5. Result

**PASS** for the command's own hard-stop guards (2/2 exit 0, zero instances).
**NOT DETERMINED** for lexicon-independent accuracy claims and for whether any
published number matches settled data.
