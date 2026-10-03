# MASTER_PROMPT_V2 — Galaxy Sports Edge world-class completion

**Repo:** [Beexly/Sports](https://github.com/Beexly/Sports) · Live: https://www.galaxysportsedge.com  
**Paste this entire file into the coding agent.** Do not add “just do ranking” or “stop after docs.”  
Founder only clears rows marked `BLOCKED_FOUNDER`.

---

## Laws (hard)

1. Gates OFF: `LIVE_BOARD` / `PUBLIC_PICKS` / `STATS_PUBLIC` / `PERFORMANCE_STATS`
2. Maps OFF: `CALIBRATION_ADJUSTMENTS_ENABLED` / `AUTO_PUBLISH` — offline only
3. Free-path **ABSENT-only** (empty Odds key = trap, not free)
4. No invent odds/scores/ROI; no PROVEN while eligibility RED
5. Polymarket hold as product; Kalshi = fair-value ranking fuel only
6. Extend existing modules — no dual stacks, no CrewAI/Ollama in monorepo
7. Live class ~ Brier **0.275** / ECE **0.112** / Murphy RES **0.002** → **RED**. Ranking/independents raise RES; maps do not invent it. Conformal coverage ≠ eligibility.
8. `RANKING_PAUSE_APPLY` default **OFF** — plan pause is advisory until founder enables

---

## 10 design upgrades vs V1

1. **Anti-hyperfocus law** — every cycle advances ≥3 domains  
2. **Full matrix D0–D11** — not just a multi-avenue atlas  
3. **RPCP + calibration-rd first-class** — not forgotten R&D  
4. **Goal-driven loop + completion audit** — evidence, not intent  
5. **10 specialist lanes** — Rank, Calib, Spine, Content, B2B, Ops, DAG, Research, Money, Innovate  
6. **Innovation slots (D11)** — Bayesian fusion offline, Parquet export, RPCP→founder bridge when leverage is real  
7. **Live class numbers baked in** — agent cannot “fix eligibility” with maps  
8. **Do-not-redo from gse-ops SoT** — free-spine, Stripe sig, Orbit lab, isotonic  
9. **OperatorHints standard** — ops surfaces self-explain  
10. **Hard stop only:** matrix exhausted or access revoked — not “one good PR”

---

## Product boards in scope (always product-wide)

| Id | Label | Production status |
|----|-------|-------------------|
| STATKING | StatKing `/stats` | Dark-by-law until rights + `STATS_PUBLIC` |
| HELM | Helm | Design-preview only — not a prod route |
| PICKPILOT | PickPilot | Retired brand / design-preview archive |
| CLUBHOUSE | Clubhouse | Fantasy studio **scene**, not a product surface |
| GSE_BOARD / GSE_PICKS / GSE_COCKPIT | Live GSE | rankingP required on code path when open |

Ops SoT: `GET /api/ops/public-surface-truth` → `productBoards`, `rankingPower`, `rankingPauseApply`.

---

## Contract matrix D0–D11

| Id | Domain | Specialist | Done when (evidence) |
|----|--------|------------|----------------------|
| D0 | Deploy / SHA lag | Ops | Prod SHA = main HEAD after merge |
| D1 | Ranking power / RES | Rank | RPCP on ops; bottleneck labeled; rankingP on board/picks/B2B |
| D2 | Calibration maps offline | Calib | Maps flags OFF; bakeoff docs only; conformal ≠ eligibility |
| D3 | Free-spine / settlement | Spine | Free settle path; no invent; dual-path odds accepted |
| D4 | Content free-lane | Content | Drafts + RSS + no PROVEN copy while RED |
| D5 | B2B signals | B2B | `/api/v1/signals` rankingP + experimental posture |
| D6 | Public honesty | Ops | Dark-reason taxonomy; quiet ≠ outage; productBoards posture |
| D7 | DASE / DAG patterns | DAG | Map docs only; no dual PredictionIO stack |
| D8 | Research / PM fuel | Research | Oddpool triage; Kalshi maps expand; Polymarket hold |
| D9 | Money / Stripe | Money | Founder env only; no rebuild webhook sig |
| D10 | StatKing / rights | Research | STATS_PUBLIC dark; rights incomplete honesty |
| D11 | Innovation slots | Innovate | Offline only unless leverage unlocks a merge |

**Anti-hyperfocus:** each agent cycle must close evidence in ≥3 matrix rows.  
**Stop:** matrix exhausted **or** only `BLOCKED_FOUNDER` rows remain.

---

## Priority order (this branch)

1. Branch `gse/world-class-completion-YYYY-MM-DD` from main  
2. RPCP + residual `operatorHint` on founder-ops only  
3. Kalshi/abbr soft-fail expand where maps exist  
4. Product boards posture + rankingP on all GSE surfaces  
5. Pause apply behind `RANKING_PAUSE_APPLY` (default OFF)  
6. ≥3 domains/cycle across D0–D11  
7. WORKING_LOG with evidence; founder list = redeploy/env/Stripe only  

---

## Anti-patterns

- Rebuild free-spine heartbeat / Stripe sig / isotonic from scratch  
- Open maps or PROVEN copy  
- Stop after one ranking PR while content/B2B/spine/product residuals OPEN  
- Treat conformal coverage as eligibility  
- Market Helm/PickPilot design-preview as live product  
- Flip STATS_PUBLIC without rights  

---

## Specialist subagent map (lanes)

| Lane | Owns | Must not |
|------|------|----------|
| Rank | rankingP, RPCP, pause apply OFF, independents | invent RES |
| Calib | maps offline, conformal bridge, floors | flip AUTO_PUBLISH |
| Spine | free-path ABSENT, settle | invent odds |
| Content | drafts, RSS, dark copy | PROVEN while RED |
| B2B | signals rankingP | claim verified ROI |
| Ops | public-surface-truth, founder queue, OperatorHints | silent gate flips |
| DAG | DASE docs | dual stack |
| Research | Oddpool/Kalshi maps | Polymarket product |
| Money | Stripe posture docs | rebuild sig verify |
| Innovate | D11 offline R&D | ship unflagged maps |

---

## Completion audit (every cycle)

1. List ≥3 D-ids advanced with file/test evidence  
2. Confirm laws still hold (gates/maps OFF, no invent)  
3. Update `docs/ops/WORKING_LOG_*`  
4. Founder-only list = redeploy / env / Stripe clicks only  
5. Do **not** stop after a single green PR if OPEN residuals remain  

## Done when

Contract matrix exhausted or only founder clicks remain. Ship green PR(s) on `gse/world-class-completion-*`.
