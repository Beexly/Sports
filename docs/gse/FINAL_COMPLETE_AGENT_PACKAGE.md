# FINAL COMPLETE AGENT PACKAGE — GSE / Beexly

## BINDING LAW
1. Honesty not volume. FIRE + NO_BET certificates.
2. Phase C baseline: **888|359|283|0 eval|(5b)=0|floor MLB|SPREAD|v5.1.0@180**
3. Cron `*/30` on main (#215). Remaining = Odds payment + writes + remeasure.
4. No LIVE_BOARD=1 in git. No 6h widen. No pav/ivap rewrite without proven bug.
5. No invented ROI/quotes. selective-gate authority. Kelly INTERNAL only.

## MAIN
Pull first. Cron `*/30` refresh-odds. Merged: #215 #216 #217. LIVE_BOARD off.

## MERGE ORDER
1. #220 DecisionCertificate
2. #218 402 circuit
3. #219 Toxiproxy chaos (staging)
4. #224 candidate/global_max fetchedAt + neon (prefer over #221/#222)
5. Reconcile #221; reject #222 destructive index rewrite
6. #223 docs

## UNIVERSE DISPOSITIONS
- PRODUCTION: gate, 6h, cron, offline/stats providers, HC ping
- PR modules: certificates, circuit, chaos, fetchedAt scopes, neon probe
- RESEARCH ONLY: adaptive CP, CVAP depth, Chow/NP formal, PT/mental-accounting as UX only
- OUT OF LAUNCH: Kafka/CDC, Patroni launch path, BLIS/CUTLASS, public Kelly %
- FOUNDER: Stripe, DNS, prices, Odds payment, LIVE_BOARD after (5b)≥1

## FETCHEDAT
Gate: candidate age >6h or missing → STALE_ODDS.
Ops: global MAX is NOT gate clear. Use classifyCandidateOddsAge for Phase C.

## EXECUTE
Merge stack → prove fetchedAt when paid → gate:phase-c → idle on secrets.

REPORT: MAIN sha | FLAG off | PHASE C old→new | SHIPPED | BLOCKERS | NEXT
