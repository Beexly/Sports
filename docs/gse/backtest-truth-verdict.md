# GSE Backtest Truth Verdict

**As of:** 2026-06-29 (finish-line re-execution). Verified directly from source this run.

## Verdict: PRESERVED — the model does NOT beat naive

Source of truth: `apps/web/lib/gse/waitlist-copy.ts`

```ts
BACKTEST_TRUTH = {
  samples:   10_301,
  modelMae:  5.18,
  naiveMae:  4.9999,
  beatsNaive: false,   // <-- sacred invariant
}
```

- `modelMae (5.18) > naiveMae (4.9999)` ⇒ the tested model **loses to naive** on MAE.
- `beatsNaive: false` is surfaced verbatim on the public waitlist page and asserted by a
  code↔doc **drift-guard test** in `__tests__/gse-waitlist.test.ts` (part of the 49 passing).
- This is framed as **evidence discipline**, not a failure to hide. No copy claims an edge.

## What this forbids (still in force)
- No win-rate, ROI, accuracy, edge, or profit claims anywhere public.
- No "beats the market / beats naive" language.
- No published picks / performance launch.
- The waitlist may collect interest only; it makes **no** performance promise.

## How it stays true
- The number lives in one module; the page renders it; a test fails the build if the page
  text and the `BACKTEST_TRUTH` constant ever drift apart.
- CI no-claim scanner (`compliance-scanner/rules`) blocks positive-claim phrases in copy,
  the 50 content drafts, the assembled page, emails, and research briefs.

**No change to backtest truth was made this run.** Re-verified `beatsNaive === false`.
