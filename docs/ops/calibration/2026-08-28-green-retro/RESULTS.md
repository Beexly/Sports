# GB-4 RETRO — 2026-08-28 GREEN-BOARD RETRO RECORD

Status: PRE-REGISTERED / IN PROGRESS
Script: scripts/ops/green-board-retro.ts (pure computation, read-only)
Thresholds (FIXED — never tuned): GREEN_P_MIN = 0.70 | INDEPENDENT_DISSENT_BAND = 0.06

NOTE: The retro is PRE-REGISTERED to report whatever the data says — including
"greens underperform their p" — because that result redirects GB-4 tuning and
is valuable. Thresholds are NOT adjusted to make the retro look good.

## P-0 Divergence Diagnosis (per user's highest-priority directive)
The core divergence: the public-facing proof (calibration ECE, tier labels, record
ticker) measures the MARKET's calibration (calibratedP derived substantially from
market-structure echoes — confidence/100 in calibration-metrics), while the GB-4
RETRO measures independent edge. These can diverge. The retro exists to surface
the divergence honestly — NOT to suppress it.

Evidence sources:
- `docs/ops/AGENT_LEDGER.md` (this session's GB-3..GB-5 + D-1..D-5 + RN1 + RN1-FIX rows)
- `docs/ops/hermes/NIGHT-LOG-2026-08-28.md` (re-verification entry: 29 pre-existing web test failures documented)
- `docs/ops/AGENT_LEDGER.md` row C-28 (P-0 divergence root: calibration = market echo; resolution near zero)
- `docs/ops/AGENT_LEDGER.md` row C-30 (Bickel-Kim CLV in PRICE space — grade TOTAL/SPREAD, not points-only)
- `docs/ops/AGENT_LEDGER.md` row C-32 (DO NOT CLAIM win-rate / ROI / hit-rate / beat-close — hold to verification floor)

## Realized vs Expected (framework — runs over settled picks)
[Will be completed once script executes against settlement data]

Status: BLOCKED on GB-4 script execution against settled pick dataset.
The framework is in place (script + RESULTS.md + divergence doc);
execution requires data-source connection (DB read). No persistence change.

PRE-REGISTERED: no number will be fabricated to make the retro look good.
Any negative result will be reported verbatim.
