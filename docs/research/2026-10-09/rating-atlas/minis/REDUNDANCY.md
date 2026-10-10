# REDUNDANCY & BOTTLENECK FORECAST — GSE data plane (2026-10-10)
_Doctrine: no single point of failure. Every lane has a tested backup. Every bottleneck has a mitigation and an early-warning signal._

## 1. Bottleneck forecast (probability × impact × mitigation)

| # | Bottleneck | P | Impact | Early signal | Mitigation (wired tonight) |
|---|---|---|---|---|---|
| 1 | DK Akamai TLS-fingerprint block on shell (curl 403) | CERTAIN (permanent) | DK lane dead from shell | curl 000/403 w/ Access Denied | Browser in-page fetch = THE lane (proven, 518 fetches 0 err tonight); ESPN feed as lines fallback |
| 2 | FD one-shot API session per page load | CERTAIN (observed) | bulk FD pulls stall after 1st call | 400 w/ empty body | 1 fetch per page-navigation; smp getMarketPrices (open POST) for price refresh once marketIds known |
| 3 | PrizePicks DataDome on /projections (shell) | CERTAIN (observed) | shell PP pull dead | 403 interstitial HTML | in-page from app.prizepicks.com; /leagues stays shell-OK (health check lane) |
| 4 | Pinnacle random 401/404 flakes on some paths | MEDIUM (3/14 tonight) | missing game trees | 401 "No authorization token" | retry ×3 w/ backoff (in books_api.py); path fallback to /leagues/889/matchups re-list |
| 5 | Underdog login wall | CERTAIN | no UD lane | login redirect | PrizePicks = same product class; harvest UD post-login later |
| 6 | Workspace wipes (2× in history) | MEDIUM | all artifacts lost | ls comes back empty | mirror to /var/minis/shared/gse/ after EVERY build (done tonight) + build_delivery.py |
| 7 | Browser tab state loss (window.__dkH dies on nav) | CERTAIN if navigating | harvest lost | pump counters gone | extract to disk immediately after pump done (enforced tonight) |
| 8 | iSH long-pump thermal/timeout | LOW-MED | partial harvests | pump rate decays | chunked pumps (30 subIds × 14 ev = 420 was fine; keep ≤500/pump) |
| 9 | App suspension kills minis-scheduled cadence | MEDIUM | snapshot gaps | missed fires | Apple Shortcuts automation for guaranteed pre-Sunday snapshot; in-app timer as best-effort |
| 10 | ESPN injuries endpoint change | LOW | injury lane dead | non-200/empty | NFL.com official report (manual cross-check); GSE injury model file |
| 11 | DK schema drift (subCategory IDs) | MEDIUM over months | pump returns empty | row counts drop | dk_submap.json = the map; re-harvest nav tree to re-derive IDs (recipe §1.2 of intel doc) |
| 12 | Rate-limit escalation (DK/PP tighten) | MEDIUM | slower pumps / 429s | rising latency | pacing already conservative (1.7/s); drop concurrency to 4; spread across windows |

## 2. Fallback chains (implemented in books_api.py)

```
GAME LINES:      Pinnacle API ──fail──> ESPN scoreboard (DK-priced) ──fail──> FD (browser, 1/page)
PROPS BOARD:     DK in-browser ──fail──> PrizePicks in-browser ──fail──> FD per-event ──fail──> manual
ALT LADDERS:     DK bands (16569-72/18493-95) ──fail──> DK team alts (13195/96) ──fail──> Pinnacle isAlternate
INJURIES:        ESPN /injuries (shell) ──fail──> NFL.com official ──fail──> GSE injury model file
CLOSE for CLV:   Pinnacle ──fail──> FD close (adjust ~+1% hold diff) ──fail──> DK main (worst, note retail shading)
PICK'EM:         PrizePicks ──fail──> Underdog (post-login) ──fail──> DK YourBet SGP prices
```

## 3. Health checks (run before any snapshot)
1. `python3 books_api.py snapshot` → expect "pinnacle games: 14 | espn sb: ok | injuries rows: ~800 | errors: []"
2. PP health (shell): GET api.prizepicks.com/leagues → 200 means PP alive (browser needed only for /projections)
3. DK health (browser): nav/leagues/88808 → 200 + events count = 13+
4. Any lane red → chains above; log which lane served each snapshot (books_api already records errors[])

## 4. Snapshot cadence (48h-to-Sunday plan)
- T-48h (now): baseline snapshot ✅ DONE (this night)
- T-24h (Sat AM): re-snapshot all lanes → first movement delta (FD previousOdds + Pinnacle version diffs + PP updated_at)
- T-6h (Sun AM): final pre-game snapshot = pseudo-close baseline
- Post-final-whistle: closing snapshot → the CLOSE set for CLV grading
- Owner action for guaranteed cadence: Apple Shortcuts automation firing Minis with "run GSE snapshot" (in-app timers are best-effort only)
