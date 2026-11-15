# NFL Week 10 Sunday Morning Founder Brief (2026-11-15)

> **RELEASE STATUS: HOLD_INTERNAL_CALIBRATION_ONLY_DO_NOT_STAKE_OR_ENTER (`publishAllowed: false`, `auto_email_sent: false`).** All `WIRE-FIRST` production switches (`PUBLIC_PICKS_ENABLED`, `LIVE_BOARD`, `PERFORMANCE_STATS_ENABLED`, `PUBLISH_LEDGER`, `CALIBRATION_ADJUSTMENTS_ENABLED`) remain `false`.

## 1. Opening Window: `NE @ DET` Munich (`08:30 AM CST` / `14:30 UTC`)
- **Live ESPN Verification (`2026-11-15T13:24:17Z`, Event `401873053`):** Status `Sun, November 15th at 9:30 AM EST`, Market Line `DET -2.5 (-120)`, Total `O/U 50.5 (-115/-105)`, Moneyline `NE +120 / DET -142`.
- **Verified Model Projection:** `NE 23.76 -- DET 28.52` (Combined Total `52.28`), QB1s `Drake Maye` vs `Jared Goff`, `53` of `77` board prop markets audited.
- **Stage-5 Decision:** `PASS` (`0` bets released, `publishAllowed: false`).
- **Official ESPN `Out` Inactives Check (`10` listed):**
  - `DET`: CB `D.J. Reed` (Hip), C `Cade Mays` (Ankle), DT `Mekhi Wingo`, LB `Amen Ogbongbemiga`, DE `Ahmed Hassanein`
  - `NE`: S `Brenden Schooler` (Hamstring), C `Ben Brown` (Knee), OT `Walter Rouse` (Concussion), QB `Behren Morton`, OT `Dametrious Crownover`
  - Official NFL game-day inactives window opened `07:00 AM CST` (90 min pre-kickoff); verify live kickoff feed before `08:30 AM CST`.

## 2. Full `13/13` Week 10 Board Status (`WIRE-FIRST` Internal Calibration Candidates)
All `13/13` remaining Sunday and Monday matchups are audited (`slate_packet_sha256: 3f3c0b0eb4feff196730862b20a11565ac76f95f3ba90d31a4e40dfe484cf139`) with every public pick suppressed (`0.0u` recommended stake):
- **Internal `WIRE_FIRST_HOLD` Game-Line Edges (not for live release):**
  - `BUF @ NYJ` (`12:00 PM CST`): `BUF -8.5 (-105)`, edge `+0.1625`, confidence `70/100`
  - `CAR @ NO` (`12:00 PM CST`): `Under 48.5 (-102)`, edge `+0.1551`, confidence `69/100`
  - `HOU @ CLE` (`12:00 PM CST`): `HOU -4.5 (-112)`, edge `+0.1304`, confidence `66/100` (`Deshaun Watson` retained on DFS ban; active simulation QB1)
  - `JAX @ TEN` (`12:00 PM CST`): `JAX -10.5 (-115)`, edge `+0.1501`, confidence `68/100` (`Bhayshul Tuten` verified active RB1: `55.17` rush yds mean)
  - `KC @ ATL` (`12:00 PM CST`): `KC -3.0 (-118)`, edge `+0.1260`, confidence `65/100`
  - `PIT @ CIN` (`7:20 PM CST SNF`): `CIN -3.5 (-108)`, edge `+0.1569`, confidence `69/100`
  - `LAC @ BAL` (`7:15 PM CST MNF`): `BAL -4.5 (-108)` confidence `72/100`, `Over 38.5 (-110)` confidence `71/100`, `BAL ML (-225)` confidence `65/100`
- **Full `PASS` Matchups (`0` held candidates):** `NE @ DET`, `MIA @ IND`, `MIN @ GB`, `LAR @ ARI`, `SEA @ LV`, `SF @ DAL`.
- **Player Props:** `STAGE_5_CIRCUIT_BREAKER_HALT_0_TWO_SIDED_PRICES` holds all props at `PASS`.

## 3. Staged DraftKings 5-Slate DFS Suite (`HOLD_INTERNAL_CALIBRATION_ONLY_DO_NOT_STAKE_OR_ENTER`)
Every roster obeys DraftKings salary caps, positional rules, `0` excluded/IR/decoy leaks, and `auto_email_sent: false`:

| Slate Key | Draft Group | Type | Cash Salary | Cash Median | P90 Ceiling | Cash Core Highlights | GPP Lineups |
|---|---|---|---|---|---|---|---|
| `munich_ne_det` | `156422` | Showdown | `$49,000` | `101.22` | `198.80` | CPT `Jared Goff`, `Jahmyr Gibbs`, `Drake Maye`, `Jake Bates` | `20` |
| `sun_main_classic` | `156416` | Classic | `$49,900` | `140.30` | `337.94` | `C.J. Stroud`, `James Cook III`, `Christian McCaffrey`, `Ashton Jeanty`, `Raiders` DST | `20` |
| `sun_mon_expanded` | `156418` | Classic | `$50,000` | `142.80` | `330.35` | `C.J. Stroud`, `James Cook III`, `Christian McCaffrey`, `Chase Brown`, `Vikings` DST | `20` |
| `snf_pit_cin` | `156433` | Showdown | `$49,100` | `99.57` | `189.86` | CPT `Joe Burrow`, `Aaron Rodgers`, `Chase Brown`, `Rico Dowdle` | `20` |
| `mnf_lac_bal` | `156434` | Showdown | `$49,800` | `91.89` | `190.35` | CPT `Jacoby Brissett`, `Zay Flowers`, `Derrick Henry`, `Justin Herbert` | `20` |

## 4. Verification, Operational & Cloud Posture
- **Dual Isolated Santa Reviews:** Both `Santa Reviewer B4` and `Santa Reviewer C4` returned `VERDICT: PASS` (`0` HIGH / `0` MEDIUM issues; IDP tackle `std` across `117` athletes bounded `1.68..4.98`, `<= 8.0`). Advisor Consult #2 is logged as `[DEGRADED: advisor]` (timeout compensated by dual Santa convergence).
- **Cloud Spend Posture (`$0.00/hr` workflow compute):** `gcloud compute instances list` returned `[]` (`0` GCP instances running); `aws ec2 describe-instances` returned explicit SCP deny (`p-tc2pk760`); zero paid cloud VMs booted by this workflow.
- **Key Deliverables:**
  - Verified Call Sheet: `docs/predictions/research/2026-11-15/week10-sunday-monday-360-verified-call-sheet.md`
  - 5-Slate DFS Packet: `docs/dfs/research/2026-11-15/week10-munich-main-primetime-dfs-packet.md`
  - Session Retro: `docs/engine/research/2026-11-15/overnight-session-retro.md`
  - Orchestration Receipt: `docs/engine/research/2026-11-15/ethos-overnight-week10-orchestration-receipt.json`
