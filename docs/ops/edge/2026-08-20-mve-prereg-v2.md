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
  (Amendment vs DeepSeek's first draft: that form was over-side-only,
  which is blind to under-side edges and loses on them in expectation;
  the side-adaptive form keeps the identical supermartingale validity
  under the per-side composite null and is one process, no
  multiplicity. DeepSeek round-3 review verdict, 2026-08-20: PROVEN —
  "a predictable side-selection rule combined with the asymmetric
  increment yields a nonnegative supermartingale under the composite
  null"; side-adaptive adopted as the primary specification.)
- SIDE-SELECTION RULE (frozen, deterministic): with q_t = model over
  probability and m_t = de-vigged market over probability at entry —
  if q_t > m_t bet the OVER; if q_t <= m_t bet the UNDER (ties go
  UNDER). For an OVER bet: q_bet = q_t, m_bet = m_t, W_t = 1 iff the
  total goes over. For an UNDER bet: q_bet = 1 − q_t, m_bet = 1 − m_t,
  W_t = 1 iff the total goes under. No other selection rule may be
  used or computed.
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
> the composite null that the market probability is an upper bound. The
> e-process capital starts at 1 and accumulates evidence against this
> null. Certification requires E_n >= 20 at a scheduled checkpoint.
> Kills are published immediately. Historical back-test results are not
> evidence; this is a forward-looking test. All hyperparameters, entry
> windows, side selection, and the model hash were frozen before the
> experiment began."

---

## Amendment v2.1 — model spec bound to James-Stein shrinkage

Recorded 2026-08-20, **before any computation on the corpus**. Legitimate as
a pre-registration amendment for exactly that reason and no other: ledger C-59
established that the MVE cycle was BLOCKED before its first observation (runtime
`DATABASE_URL` pointed at localhost, `pg` returned `28P01`, no Neon URL in env),
that no capital, `n`, or exclusion count exists, and that no alternate window,
lambda or variant was computed. Once a single observation is graded, this
section is closed and no further amendment is permissible.

**What changes.** Section "MVE pre-registration" above specifies the model
probability only as "hierarchical posterior predictive; hyperparameters frozen
before the walk-forward or updated strictly online". The founder's charter
directive of 2026-08-20 binds that loose phrase to a specific estimator: the
model producing `q_t` must be the **hierarchical James-Stein shrunk outcome
model** specified in section 3 of
`docs/ops/edge/2026-08-20-prospective-prereg-mlb-totals-js.md` — positive-part
James-Stein, multiple-sample-size variant, arc-sine transform for proportion
metrics and square-root (Anscombe) for count-rate metrics, `p >= 3` required
for shrinkage to apply, refit online from the expanding history only.

**What does not change.** Nothing else. The e-process form, lambda = 0.3, the
6–3h entry window, the entry-quality bar, the frozen side-selection rule, the
checkpoint cadence, the certification and kill thresholds, the early-abort rule
and the reporting requirements are all unchanged and remain as frozen above.

**Honest note on the artifacts already on `hermes/hf5-mve` (0035e3b4).** They
were read directly rather than taken on report. `mve-eprocess.ts` implements
the frozen side-adaptive increment, the frozen side-selection rule and the
binding-outcome function correctly, and is unaffected by this amendment. The
runner `scripts/edge-lab/run-mve.ts` is prediction-clean in its ordering
(`predictOver` is called before `update`, and `predictOver` reads only the unit
indices and the line, never the realized total). But its `q_t` source is
`NbRbpf`, a negative-binomial Rao-Blackwellized particle filter, **not** a
James-Stein shrunk model, and the game records it feeds that filter are
degenerate against the charter's feature list: `nPitchers: 1`, `nUmpires: 1`,
`pitcherHome`/`pitcherAway`/`umpire` all pinned to 0 and `park` aliased to the
home-team index, so starting pitcher, bullpen usage, park factor, weather,
umpire, rest and travel are absent entirely. The e-process module therefore
stands as frozen; **the model half of the runner does not satisfy the amended
spec and must be replaced before the one cycle is executed.**

**Consequence if this amendment is ignored.** A certification produced by
`NbRbpf` would license a prospective track on `NbRbpf`, not on the James-Stein
model. Certifying one model and then trading another is not a technicality; it
is the failure mode this whole protocol exists to prevent. Either the MVE runs
the amended model, or the prospective pre-registration must be rewritten around
whatever model actually produced the certification.
