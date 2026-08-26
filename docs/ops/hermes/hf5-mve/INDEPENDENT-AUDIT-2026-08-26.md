# H-F5 MVE — independent audit, 2026-08-26

**Status: DRAFT — statistical lane pending.** This document is the cross-model
audit the FINAL-RUN seat law requires before the MVE kill may be published to
the public Kill Ledger. It is written by a different model from the executor
(execution: Fable 5; audit: Opus 5).

## Auditor independence — stated honestly, for the founder to weigh

- **Genuinely independent:** a different model, re-deriving every mechanical
  claim from primary sources (git, the live database, the frozen output) rather
  than from the executor's account.
- **Not blind:** this auditor shares the execution session's transcript, so it
  is not a clean-room review. The statistical lane (§3) was therefore delegated
  to a **fresh-context agent that received only the artifacts** — the
  pre-registration, the frozen runner source, the e-process implementation, and
  the results — with no session narrative and an explicitly adversarial brief.
- **Recommendation:** treat this as one independent lane. If the founder wants
  the belt-and-braces version the FINAL-RUN doc contemplates (DeepSeek
  statistics + a second code seat), this document is the input to that, not a
  replacement for it.

## 1. Provenance — VERIFIED

Both provenance claims the affidavit asserted were re-checked from primary
sources. Commands, outputs, and digests are recorded in
`EXECUTION-AFFIDAVIT-2026-08-26.md` § "Provenance evidence". Summary:

| Claim | Method | Result |
|---|---|---|
| Runner byte-unmodified vs `origin/hermes/hf5-mve` | `git diff --stat` over the runner + e-process + RBPF + devig | **empty diff** — confirmed; sha256 recorded |
| Local mirror row-exact vs prod | identical md5 content digest over every column the runner reads, timestamps as epoch seconds, both sides | **games 691 → `e13dfc36…` on both; odds 198,922 → `6f63074a…` on both** — confirmed |

The transport deviation (SQL-over-HTTP mirror instead of a direct connection)
therefore changed the wire, not the bytes. Re-runnable:
`scripts/edge-lab/verify-mirror-digest.py`.

## 2. Sign-flip diagnostic — the KILL is not a coding artifact

A kill and an inverted-bet-side bug look identical in capital terms: both
collapse E. They are distinguishable by the **hit rate of the chosen side**,
computed post-hoc from the frozen capital path (an audit diagnostic, not a
protocol computation — it changes nothing about the binding result):

| slice | chosen-side hits | rate |
|---|---|---|
| full path | 164 / 337 | **0.4866** (z = −0.49 vs 0.50) |
| OVER bets | 68 / 137 | 0.4964 |
| UNDER bets | 96 / 200 | 0.4800 |
| binding window (first 50) | 19 / 50 | 0.3800 (z ≈ −1.70) |

**Reading:** over the full sample the chosen side wins at essentially the
coin-flip rate. A systematically inverted side would show a sustained rate far
below 50% (|z| ≫ 3); nothing of the sort appears. The model's signal is not
backwards — it is **uninformative relative to the market price**, which is
precisely what the null asserts and what `PATH_TO_PROVEN_EDGE` predicts for an
efficient market.

**Honest nuance the founder should know:** the kill *fired* at n=50 on a 38%
stretch — unlucky at ~1.7σ, but well inside normal variance. A different
ordering might not have tripped the threshold there. However, the full-sample
0.4866 means the experiment would have ended "did not certify" regardless. So
the kill's **timing** was variance-assisted while its **conclusion** is
robust — the two agree, which is the cleanest outcome a kill can have.

## 3. Statistical validity and protocol compliance

*Pending — delegated to a clean-context adversarial reviewer. Covers: validity
of the supermartingale construction under the composite null, whether the
side-adaptive rule preserves it, the 241-vs-691 cohort question, and
early-abort consistency.*

## 4. Recommendation

*Pending §3.*

---

*Nothing public has been touched. The Kill Ledger entry remains unpublished
pending completion of this audit and founder adoption.*
