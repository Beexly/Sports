# MVE Pre-registration v2 + Prospective Track Template

Frozen 2026-08-20, BEFORE any MVE computation. Supersedes the v1
(symmetric point-null) design, which was retired unrun. Source:
DeepSeek pre-run statistics audit round 2, verified and amended by
Claude (side-adaptive orientation), queued by the founder for the
build seat. Binding under F-10. See the STATISTICAL RULING v2 block in
docs/ops/hermes/FINAL-RUN-2026-08-20.md for the full validity argument.

## MVE pre-registration (retrospective walk-forward, 241 games)

- Mechanism: MLB full-game totals; hierarchical outcome model vs
  Shin-de-vigged no-vig entry market.
- Entry window: exactly 6–3h before game start.
- Entry price quality: book-quoted, age <= 15 min, >= 3 books. No fresh
  entry price → game EXCLUDED, exclusion recorded and counted.
- E-variable: side-adaptive asymmetric fractional, lambda = 0.3:
  E_t = 1 + 0.3·(W_t·(q_bet/m_bet) + (1−W_t)·(1−q_bet) − 1),
  bet side chosen per game from the model before outcome (predictable,
  one bet per game); q_bet, m_bet = model and de-vigged market
  probabilities of the bet side; W_t = bet side hit.
  (Amendment vs DeepSeek draft: DeepSeek's form was over-side-only,
  which is blind to under-side edges and loses on them in expectation;
  the side-adaptive form keeps the identical supermartingale validity
  under the per-side composite null and is one process, no
  multiplicity.)
- Null: for each game, the market's quoted (de-vigged) probability of
  the bet side is an upper bound on its true probability.
- Model probability: hierarchical posterior predictive; hyperparameters
  frozen before the walk-forward or updated strictly online.
- Checkpoint cadence: every 50 graded picks, starting at n=50.
- Certification threshold: E_n >= 20 at a scheduled checkpoint.
- Kill threshold: E_n <= 0.10 at any checkpoint.
- Early abort: capital < 0.01 after 50 graded picks → abort, publish
  the kill, close the edge program.
- Report: final capital, max drawdown, threshold crossings at
  2/5/10/20, chronological capital path, exclusion count.
- Publish all variants if any were run (none besides the primary are
  permitted).

## Outcome rules (no middle state persists)

- Early abort, kill threshold, or final capital <= 2 → publish the
  kill (fifth Kill Ledger entry); edge program closed for good.
- E >= 20 at a scheduled checkpoint → draft the prospective
  pre-registration below; the founder signs before any track opens.
- Otherwise → publish "did not certify, did not survive"; the program
  closes exactly as if killed.

## Prospective Pre-registration Template (fires only on certification)

Prospective Pre-registration — MLB Totals Asymmetric Fractional
E-Process

Mechanism: MLB full-game totals, hierarchical outcome model vs
Shin-de-vigged no-vig entry market at 6–3h window.

- Frozen model hash: [to be recorded before the track opens]
- Certification threshold: E_n >= 20
- Kill threshold: E_n <= 0.10
- Checkpoint cadence: every 50 graded picks, starting at n=50
- Certification null for the PROSPECTIVE track: the vig-inclusive
  composite null per the round-2 protocol (b_i = 1/D_i) — the
  de-vigged null above is the MVE's null only.

Disclosure language (verbatim, side-adaptive amendment applied):

> "This test uses the side-adaptive asymmetric fractional e-process for
> the composite null that the market's quoted probability of each bet
> side is an upper bound on its true probability. The e-process capital
> starts at 1 and accumulates evidence against this null. Certification
> requires E_n >= 20 at a scheduled checkpoint. Kills are published
> immediately. Historical back-test results are not evidence; this is a
> forward-looking test. All hyperparameters, entry windows, and the
> model hash were frozen before the experiment began."
