# Keel intake — 2026-10-04

Code, not a spec: [`intelligence/keel`](../../../intelligence/keel).

Filed under engine because the subject is the estimator's intake (laws, grain, scoring, the hunt). It is not a prediction, not a slate, and not a data-source dump.

## Status

- Landed on `Beexly/Sports`. Not wired into `apps/web`.
- Does not emit a pick. Does not publish. Does not send.
- Does not define τ̂.
- Does not fill a null. Pittsburgh week-4 offensive line stays null.
- Does not start NIM, Together, a LoRA endpoint, or an H100. The 200-row closing-line gate is still shut because a single `spread_line` is not a bet and a close.
- Scorer is local and deterministic. Alexandria search is the public Firecrawl paper index (no key). A page scrape key, if typed, is session-only.

## Sealed, not refit

- +6.77 pp vs win-probability-max on 3,988 decisions.
- Brier 0.1621 vs 0.1748 on 306 drives.
- Different slices. Do not conflate them.

## What the machine learned how to do

The watch keeps a yield by lane and a lexicon. A word admitted in two documents and rejected in none is appended to the next OpenAlex and Alexandria query. arXiv is not rewritten. Imputation aimed at an injury or a time-to-throw is held, not admitted.

Field arithmetic on the sealed week-0 table: 37 means, attempt-weighted mean 2.844 on 3,121 attempts, 15 Out of 41 week-4 line rows where a row exists, 7 null teams.
