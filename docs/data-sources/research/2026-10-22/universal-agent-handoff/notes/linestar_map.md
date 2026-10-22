# linestarapp.com — ownership surface mapped

## How the page actually fetches
The `/Ownership/Sport/NFL/Site/DraftKings/PID/{pid}` page is a DNN shell plus Angular chrome
(`fantasysportsco.layout.js`, 5 endpoints, all chrome). The grid itself is a separate bundle and
calls **one** endpoint, captured in a real browser:

    GET /DesktopModules/DailyFantasyApi/API/Fantasy/GetSalariesV5?periodId={pid}&site=1&sport=1

741 KB, anonymous (Referer of the ownership page is enough), no cookies needed.

## Payload map
- `SalaryContainerJson` (295 KB JSON string) -> `Salaries[]`: `PID, Name, POS, PTEAM, OTEAM, SAL,
  AggProj, Ceil, Floor, Conf, AlertScore, Notes, OppRank, OppTotal, STAT, Stars` (a real DFS
  projection model per player, plus generated alert notes).
- `Ownership.Projected{slateId: [{SalaryId, PlayerId, Owned, DoubleUp}]}` -> projected ownership
  percentage vector. Joins 1:1 to `Salaries[].Id` (61/61 matched in this snapshot).
- `Ownership.Slaves/Slates`, `Sites` (DraftKings, FanDuel, Yahoo, FantasyDraft, SuperDraft,
  MonkeyKnifeFight, PrizePicks, Underdog), `Periods` (95 historical periods).

## Paywall
`IsTruncated: true`, `TruncatedSalaryCount: 695` — a free user sees 61 of 756 salaries and only
their ownership. No param changes it (`position`, `pos`, `offset`, `skip`, `take`, `slateId`,
`isTruncated` all return the identical 741 KB / 61-row body), so truncation is server-side tier
logic, not pagination. The premium delta is the remaining 695 players.

## Period ids
`GetPeriodInformation?site=1&sport=1&periodId=0` (GET) returns the live period plus all 95 historic
ones; period 413 = Week 7, 2026. The PID in the URL is this id (the seed URL's 295 is a 2022 stale
period and returns an empty grid — a real trap).

## Other endpoints seen (chrome only, all 200)
`GetReportGridBoxes` (POST JSON, salary changes / injury replacement / hot-cold boxes),
`GetPlayerSummaryPopupV2` (POST form, 403 without a logged-in session),
`GetPeriodInformation` (GET), `UpdateCustomProjectionV3`, `SavePromoCodeForUser`.

## Truncation workaround (found after the first pass)
The 61-row salary truncation does **not** apply to the ownership vector: `Ownership.Projected`
carries 282 rows across 20 slates, i.e. every projected-ownership entry, and `EnrichmentGrid`
(`GetReportGridBoxes`) returns all 755 players with `PlayerId -> Name/Position/Salary`. Joining
them recovers the full ownership board with names and salaries (`extracted_data/linestar_ownership_full_282_2026-10-22.csv`, 282/282 named, 0 orphans).
`GetSalariesV4` returns the identical body to V5 (V1/V2/V3/V6 are 404), so there is no older
version to downgrade to. The only real premium delta left is the 695-player projection rows
(`AggProj/Ceil/Floor/Conf`), not ownership.
