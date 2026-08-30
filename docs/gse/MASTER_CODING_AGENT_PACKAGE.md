# MASTER CODING AGENT PACKAGE — Galaxy Sports Edge (GSE)

**Repo:** Beexly/Sports (+ gse-competitive-intel packaging only)

Single entrypoint for the coding agent. Full session classified with dispositions.

## BINDING LAW

1. Sell honesty, not pick volume. Refusal-Native Forecasting.
2. Phase C baseline: **888|359|283|0 eval|(5b)=0|floor MLB|SPREAD|v5.1.0@180**
3. Cron is **`*/30`** on main (#215). Remaining = paid Odds + prod write + remeasure.
4. Do NOT enable/commit LIVE_BOARD_GATE_SLATE=1
5. Do NOT widen 6h MAX_CANDIDATE_ODDS_AGE_MS
6. Do NOT rewrite pav.ts/ivap.ts without proven bug + tests
7. No invented ROI, quotes, or win rates
8. selective-gate remains authority

## MAIN STATE

- Tip ~`35afb788` (pull first)
- On main: #215 cron */30, #216 offline odds adapter, #217 StatsProvider

## MERGE ORDER (CI green)

1. **#220** DecisionCertificate stack
2. **#218** 402 circuit breaker
3. **#219** Toxiproxy docker/chaos
4. **#221** fetchedAt monitor + cron wire
5. **#222** Neon pool monitor (verify index.ts = main + exports only)
6. **#223** these docs

See `docs/gse/CI_MERGE_CHECKLIST.md`.

## DISPOSITIONS

### PRODUCTION-WIRED
selective-gate, pav/ivap (consume), 6h gate, cron */30, offline odds adapter, StatsProvider, healthcheck-ping, refresh-sla

### PURE-MODULE+TESTS (merge #220–222)
DecisionCertificate, bridge, stratum-coverage, selective-abstention helpers, proper-scoring, kelly INTERNAL, fetchedAt classifier/monitor, neon-pool-monitor, 402 circuit, chaos staging

### RESEARCH-ONLY (do not production-wire)
Adaptive CP, CVAP, Venn multicalibration depth, Chow/NP formal, prospect theory models, mental accounting optimizers, Plackett-Luce for binary FIRE, full Kelly public UX, BLIS/CUTLASS/Rabin/matrix-mult session science, Kafka/CDC

### FOUNDER-ONLY
Stripe, DNS, prices, claim policy, PUBLISH_LEDGER, LIVE_BOARD after (5b)≥1, Odds API payment, password rotation

## FETCHEDAT LAYERS

1. Market-correct batch selection
2. Gate: age>6h or missing → STALE_ODDS
3. Monitor: max(fetchedAt) warn 2h / stale 4h / gate_breach 6h
4. Write: real fetch time only; never on 402/empty

## CIRCUIT + BULKHEAD

Odds breaker on 402; separate stats plane; fail-closed offline; no synthetic prices.

## CHAOS

`docker/chaos` + Toxiproxy toxics matrix — staging only. Assert fail-closed.

## AFTER MERGE

1. Optional HC_REFRESH_PING_URL, HC_ODDS_FETCHEDAT_PING_URL
2. SQL MAX(fetchedAt) age
3. npm run gate:phase-c when quotes live
4. Wire certificates after gate only

## REPORT

```
MAIN sha:
FLAG LIVE_BOARD: off
PHASE C old→new: 888|359|283|0|(5b)=0 → ?
SHIPPED:
BLOCKERS:
NEXT ONE ACTION:
```

## DONE WHEN

PRs merged or CI-fixed; LIVE_BOARD off; 6h intact; Phase C remeasured OR blocker=unpaid odds.
