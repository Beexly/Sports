# STATES AUDIT — empty / loading / error / locked on data-driven cards

| Field | Value |
| --- | --- |
| Date (UTC) | 2026-09-25 |
| Branch | `hermes/live-wip-2026-09-24` |
| Commit | `01fa9e3b03feecc5d6d7436093baf5f01115cbb8` |
| Scope | Read-only scan of `apps/web/components/**`, `apps/web/app/**` (pages + shared cards). No code fixes. |
| Method | Pattern search (`STAT_PLACEHOLDER`, bare `"—"`, `isLoading`/`Skeleton`/`SourceError`/`Locked`/`Withheld`/`GuardRefusal`, card-like components) then targeted file reads. Breadth over depth. |

**Doctrine under test (from `.claude/commands/states.md`):** anything showing a blank or bare dash must read as *deliberately locked*, not broken. Preferred treatments: lock glyph, “LOCKED until N settled”, skeleton loaders, clear error fallbacks.

---

## Summary counts

### By four-state presence (across cards/families classified below)

| State | HANDLED (deliberate UI) | PARTIAL / missing / bare | Notes |
| --- | ---: | ---: | --- |
| **loading** | 18 route `loading.tsx` + several client “Loading…” | Many data cards have no local skeleton; several high-traffic routes lack `loading.tsx` | Route skeletons use `ToolPageSkeleton` |
| **empty** | Strong on trust surfaces (`/proof`, `/performance` bootstrap, `/clv` gated, Vault, LivePoolEmpty, ExpertBoard) | Some client cards go blank after failed fetch; some KPI strips show raw `0` | |
| **error** | Global `app/error.tsx`; section catches on `/performance`, CalibrationPanel, `/proof` unreachable; SourceError family | Many client cards catch → `null` with no error copy; most routes rely only on global boundary | |
| **locked** | Gold standard: `WithheldStat`, `ClvGatedState`, `LockedValue`, `GuardRefusal`, bootstrap/vault | **Bare em-dash** still the default missing-stat render via `STAT_PLACEHOLDER` on multiple public KPI cells | Command’s “gated WIN RATE card” pattern is fixed on `/performance` headline, **not** on `/dashboard` or `/founder-picks` |

### By classification (card / family units)

| Classification | Count | Meaning |
| --- | ---: | --- |
| **HANDLED** | 16 | All four states present or N/A with deliberate locked/empty/error copy |
| **PARTIAL** | 14 | Some states deliberate; others blank, bare dash with weak caption, or missing route loading |
| **BARE** | 11 | Primary value is blank / bare `—` / raw unexplained zero; reads broken more than locked |
| **NOT DETERMINED** | — | See final section (runtime browser paint, untracked UI, full component inventory) |

**Totals classified: 41 card/family units.**

---

## Ranked worst offenders

Ranked BARE first, then PARTIAL, worst-first. Every row cites observed `file:line` + current render.

| Rank | Component / surface | file:line | Bare state | Currently renders | Proposed treatment |
| ---: | --- | --- | --- | --- | --- |
| 1 | **Dashboard Win Rate StatCard** | `apps/web/app/dashboard/page.tsx:205` | locked / empty | `const winRateDisplay = overall?.winRate != null ? \`${overall.winRate.toFixed(1)}%\` : "—";` then StatCard value | Match `/performance` `WithheldStat`: lock glyph + “opens at N settled · M so far” (or link to `/performance`). Never bare `—` at KPI size. |
| 2 | **Founder Picks Win Rate card** | `apps/web/app/founder-picks/page.tsx:54` | locked / empty | `{record.winRatePct === null ? "—" : \`${record.winRatePct}%\`}` | Same deliberate lock treatment; subcopy already says decided-only — put that on the value cell. |
| 3 | **Performance period table Win % cell** | `apps/web/app/performance/page.tsx:508` | locked | `{STAT_PLACEHOLDER}` when `wr === null` | Inline “withheld · n&lt;floor” or lock chip; headline already uses `WithheldStat` — table should not regress to bare dash. |
| 4 | **Fable proof Metric REL/RES/UNC** | `apps/web/app/fable/proof-dashboard.tsx:105–117` | locked / empty | `value={rel === null ? STAT_PLACEHOLDER : formatBrier(rel)}` (same for RES/UNC) | Lock glyph + “gated until calibration publishable”; keep detail line. |
| 5 | **Calibration ReliabilityRow rate** | `apps/web/components/performance/calibration-panel.tsx:140` | locked | `{publishable ? formatRatioAsPercent(decidedRate) : STAT_PLACEHOLDER}` (n/30 in adjacent cell) | Replace dash with “locked” / padlock; keep `n/30` as progress. |
| 6 | **Fable ReliabilityCurve rate cell** | `apps/web/app/fable/proof-dashboard.tsx:258` | locked | same `STAT_PLACEHOLDER` pattern | Same as #5. |
| 7 | **Human EnvironmentCard overall** | `apps/web/components/human/human-performance-panel.tsx:85` | empty / missing | `{data.overall \|\| "—"}` | Explicit “no factors scored” when falsy; never bare dash. |
| 8 | **Human EnvironmentCard after fetch fail** | `apps/web/components/human/human-performance-panel.tsx:63–65, 80–82` | error / empty | `.catch(() => setData(null))` then only `{busy && !data && Loading…}` / `{data && …}` → **blank card** | Error copy like AvailabilityCard source-error; empty “no environment score”. |
| 9 | **Intelligence ProofView KPI value** | `apps/web/components/intelligence/engine-view.tsx:891, 898` | locked | `lift == null ? "—"`; sell-high `status !== "rated" ? "—"` (sublabel *does* carry `describeHitRate` label) | Put `sellHigh.label` / “too few to rate” in the **value** slot (KpiCard primary), not only sublabel. |
| 10 | **Board gated edgeIndex row** | `apps/web/app/board/page.tsx:313` | locked (entitlement) | `{pick.edgeIndex == null ? "—" : pick.edgeIndex.toFixed(1)}` | Reuse pick-card `LockedValue` (“Edge · Pro”) when entitlement-gated; “not captured” when entitled-but-null. |
| 11 | **ResultCard CLV cell** | `apps/web/components/cards/result-card.tsx:85` | empty | `{clvLabel ?? "n/a"}` | “CLV not captured” / lock if gated — `n/a` reads broken. |
| 12 | **Canonical formatter (systemic)** | `apps/web/lib/format/stat.ts:16, 29–53` | locked / missing | `export const STAT_PLACEHOLDER = "—";` — all null formatters return it | Keep em-dash only for *table cells with adjacent locked copy*; KPI-scale values must use a LockedStat component, not this constant alone. |
| 13 | **SportCard (null winRate)** | `apps/web/app/performance/page.tsx:616–626` | locked | Rate block omitted entirely when `winRate === null` — W/L/P still show | Small “withheld · below floor” under sport title (parity with OverallStat). |
| 14 | **KpiCard primitive** | `apps/web/components/ui/kpi-card.tsx:41–63` | all four | Renders whatever `value` is passed; no loading/empty/error/locked variants | Optional `state: "loading" \| "locked" \| "error" \| "ready"` API used by engine-view etc. |
| 15 | **Dashboard / founder-picks / fable routes** | no `loading.tsx` (observed absent) | loading | No route skeleton; only global navigation blank until RSC resolves | Add `ToolPageSkeleton` loading.tsx (pattern from `performance/loading.tsx:1–4`). |
| 16 | **BetTracker Metric strip** | `apps/web/components/tracker/bet-tracker.tsx:78–83, 116` | empty | Metrics always render portfolio numbers (incl. empty book); list has empty copy | Gate metric strip behind `bets.length > 0` or show “no book yet” in each cell. |
| 17 | **Proof CLV verdict cell** | `apps/web/app/proof/page.tsx:69` | empty | `if (!verdict) return STAT_PLACEHOLDER` | “No close captured” label. |
| 18 | **Players / nflverse / track tables** | e.g. `players/page.tsx:71`, `nflverse/page.tsx:31–35`, `track/platform/page.tsx:137` | missing | `STAT_PLACEHOLDER` for null scalars | Acceptable in dense tables *if* column header or row note explains; audit for orphan dashes in headline KPIs only. |

---

## Finding families (evidence)

### Family A — Gold-standard locked / bootstrap (HANDLED)

**A1. Performance headline Win Rate uses deliberate withhold, not bare dash**

Observed (`apps/web/app/performance/page.tsx:295–301`):

```
value={
  overallWinRate !== null ? (
    formatPercent(overallWinRate)
  ) : (
    <WithheldStat settled={totalSettled} floor={minSettledPicksForLearning} />
  )
}
```

`WithheldStat` (`:539–558`) renders lock SVG + “Withheld” + `opens at {floor} settled · {settled} so far`.

**A2. CLV gate** (`apps/web/app/clv/page.tsx:187–210`): lock SVG, “Locked”, `opens at {minSettled} settled · {settled} so far`.

**A3. Bootstrap page-level empty** (`apps/web/components/performance/bootstrap-state.tsx:38–50`): “No official record yet” / educational ladder including min settled count.

**A4. Pick card entitlement vs missing** (`apps/web/components/picks/pick-card.tsx:680–716`):

- Locked: lock + `{label}` + `· Pro` linking `/pricing`
- Missing: `not captured` with title explaining absence ≠ hide

**A5. Glass Ledger GuardRefusal** (`apps/web/app/glass-ledger/page.tsx:235–253`): lock glyph + `Insufficient record — not shown` + substantiation text.

**A6. Proof empty vs outage** (`apps/web/app/proof/page.tsx:238–267`): distinct “ledger unreachable” vs “record starts when first pick settles”.

**A7. Vault** (`apps/web/app/vault/page.tsx:33–38`): `Status: Collecting` + explanation.

**A8. FieldRecordPanel** (`apps/web/components/landing/field-record-panel.tsx:47–53`): “Not published yet” + `publicMessage` + settled count.

**A9. SourceError** (`apps/web/components/ui/source-error.tsx:42–59`): “This board is intentionally empty.” + reason — used heavily in `engine-view.tsx` (many `SourceError` returns).

**A10. LivePoolEmpty** (`apps/web/components/fantasy/live-pool-empty.tsx:18–21`): “Live source unavailable”.

**A11. ExpertBoard / Pundit** — rates withheld as counts, not dash (`expert-board.tsx:20–25`, `pundit-ledger.tsx:152–153`).

**A12. HonestBand / VerdictLine** — insufficient / inconclusive copy (`honest-band.tsx:102–103`, `verdict-line.tsx:40–45`).

**A13. ScoringReliabilityPanel** (`observatory/scoring-reliability-panel.tsx:22–26, 62–67`): Gate closed / Collecting + `publicMessage`.

**A14. MissionControl EV lane** (`home/mission-control.tsx:38–42`): static `status: "Locked"` with explanatory body (presentational, not fetched).

**A15. describeHitRate** (`lib/intelligence/hit-rate-display.ts:65–70`): returns `n=${n} — too few to rate` — good primitive; consumers that put only `—` in the big number underuse it.

**A16. Route loading skeletons** — 18 files including `performance/loading.tsx`, `board/loading.tsx`, `picks/loading.tsx`, `clv/loading.tsx`, `proof/loading.tsx` using `ToolPageSkeleton`.

---

### Family B — Bare em-dash KPIs (BARE / systemic)

**B1. Canonical policy** (`apps/web/lib/format/stat.ts:10–16`):

```
* Missing data renders the em-dash placeholder —
* never "0", never "N/A".
export const STAT_PLACEHOLDER = "—";
```

**Observed intent:** avoid fake zero.  
**Inference:** at `text-5xl` / KPI scale without adjacent lock copy, the same character reads as *broken* (exactly the failure mode called out in `WithheldStat` comment at `performance/page.tsx:534–537`).

**B2. Dashboard** (`dashboard/page.tsx:205` + `StatCard` at `:587–604`) — bare string `"—"` into large bold value. No lock, no floor progress. **No** `apps/web/app/dashboard/loading.tsx` (file absent).

**B3. Founder picks** (`founder-picks/page.tsx:54`) — same bare dash for null win rate. Empty list handled (`:78–80`). No loading.tsx. No try/catch around `loadFounderPickRecord` (error → global boundary only).

**B4. Performance table cell** (`performance/page.tsx:506–509`) still uses bare `STAT_PLACEHOLDER` while the page’s own comment on `WithheldStat` rejects that pattern for headlines.

**B5. Calibration + Fable rows** — dash + `n/30` / `no data` adjacent (`calibration-panel.tsx:140–154`, `proof-dashboard.tsx:258–265`). Progress caption helps; primary cell still bare.

**B6. Fable metric tiles** — four large metrics; three can be pure `—` when gated (`proof-dashboard.tsx:105–117`) while page-level empty reason may exist above.

**B7. Board edge column** (`board/page.tsx:313`) — entitlement-null collapses to `—` rather than LockedValue pattern used on pick-card.

**B8. engine-view ProofView** (`engine-view.tsx:891, 898`) — value slot `—` even when `describeHitRate` already produced explanatory `label` used only in sublabel.

---

### Family C — Client cards: loading OK, error/empty thin (PARTIAL / BARE)

**C1. Human EnvironmentCard**  
- Loading: `Loading…` (`human-performance-panel.tsx:80`)  
- Success with falsy overall: bare `—` (`:85`)  
- Error: catch sets null → **no error UI** (`:63–65`)  

**C2. Human AvailabilityCard** — better: source-error message (`:169`), ok-but-empty (`:203`), busy button label. Still no generic network-error copy when catch nulls without status.

**C3. BetTracker** — empty list message (`:116`); metric strip always on (`:78–83`); localStorage catch silent (`:49`); no skeleton on first paint beyond empty metrics (inference: may flash zeros until `loaded`).

**C4. ResultCard / PlayerCard** — pure presentation; CLV defaults `n/a` (`result-card.tsx:85`). Callers own state.

**C5. StatusTile / CockpitPulse PulseStat** — presentation only; empty lanes have copy (`cockpit-pulse.tsx:85–86`); values assumed real.

---

### Family D — Loading coverage gaps (PARTIAL)

| Route with data cards | `loading.tsx` observed |
| --- | --- |
| `/performance`, `/board`, `/picks`, `/clv`, `/proof`, `/calibration`, … | Yes (ToolPageSkeleton) |
| `/dashboard` | **No** |
| `/founder-picks` | **No** |
| `/fable` | **No** |
| `/vault` | **No** (static collecting page — lower risk) |
| `/glass-ledger` | **No** |

Global error: `apps/web/app/error.tsx` — deliberate full-page fallback. Section-level: performance DB catch (`performance/page.tsx:179` area comments), CalibrationPanel catch (`calibration-panel.tsx:163–169`), proof unreachable (`proof/page.tsx:238–250`).

---

### Family E — Empty arrays handled well (HANDLED examples)

- Board empty: “No published picks yet…” (`board/page.tsx:255–258`)
- Founder empty list (`founder-picks/page.tsx:78–80`)
- Performance no overall summary → bootstrap (`performance` page structure + `PerformanceBootstrapState`)
- Intelligence SourceError on empty/error feeds

---

## Proposed standard treatments (for P4-3+)

1. **`LockedStat` primitive** (lock glyph + short label + optional `opens at N · M so far`) — replace KPI-scale `STAT_PLACEHOLDER` / `"—"`.
2. **Keep `STAT_PLACEHOLDER`** only for dense table cells *with* a sibling locked caption or column legend.
3. **KpiCard `state` prop**: `loading` → skeleton bar; `locked` → LockedStat; `error` → SourceError-mini; `ready` → value.
4. **Route `loading.tsx`** for every authenticated/data page missing it (dashboard, founder-picks, fable, glass-ledger).
5. **Client fetch cards**: never leave `{!busy && !data}` as blank — always error or empty sentence.
6. **Align board/dashboard locked metrics** with `LockedValue` / `WithheldStat` copy already proven on picks + performance + CLV.

---

## WHAT THIS AUDIT COULD NOT SEE

| Gap | Why |
| --- | --- |
| Live browser paint of each card | Read-only static audit; no browser run. Visual “reads broken” is inferred from code + in-repo comments. |
| Runtime values (whether win rate is currently null in prod DB) | No DB/API calls; classified by *code paths*, not live data. |
| Full inventory of every TSX under `components/**` | Budget ~40–60 reads; used search + strongest candidates. Cockpit/admin/war-room/immersive/three families lightly sampled. |
| Untracked / uncommitted local files | Only tracked tree via tools; no `git status` deep dive required for this report. |
| Whether entitlement-null vs missing-null on board `edgeIndex` is distinguishable at render | Board uses single `== null ? "—"`; split behavior not determined without entitlement plumbing read. |
| BetTracker empty portfolio numeric contents | Did not open `lib/tracker/clv` `portfolio()` implementation — whether zeros or dashes is NOT DETERMINED. |
| Every `KpiCard` call site beyond `engine-view` ProofView | engine-view is primary consumer found; other call sites may exist. |
| Mobile/responsive truncation of locked captions | Not verified visually. |
| E2E assertions already covering these states | Tests referenced in comments (`brief-banner.test.ts`, etc.) not exhaustively mapped. |

---

## RESULT

**FINDINGS**

| Metric | Count |
| --- | ---: |
| Card/family units classified | 41 |
| HANDLED | 16 |
| PARTIAL | 14 |
| BARE | 11 |
| Worst BARE primary | Dashboard Win Rate `dashboard/page.tsx:205` |
| Systemic driver | `STAT_PLACEHOLDER = "—"` (`lib/format/stat.ts:16`) used at KPI scale without lock chrome |
| Gold references to copy | `WithheldStat`, `ClvGatedState`, `LockedValue`, `GuardRefusal`, `PerformanceBootstrapState` |

Next step (out of scope): P4-3+ remediation — do not fix in this audit.
