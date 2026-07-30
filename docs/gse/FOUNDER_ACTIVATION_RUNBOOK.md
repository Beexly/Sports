# Founder Activation Runbook (minutes, not days)

**Purpose:** Convert founder-ops bottlenecks into a checklist that takes under an hour once you sit down.

---

## 1. Odds API key → Pinnacle CLV (highest ROI)

1. Create free key at The Odds API (documented free tier ~500 credits/mo).
2. Set env: `CLOSING_ODDS_API_KEY=<key>` (and any project-specific alias already wired in code).
3. Confirm double-gate order in docs/code:
   - `LINE_ARCHIVE_ENABLED`
   - then EU / Pinnacle book flag as documented in pinnacle-line-archive
4. Deploy or restart so env is live.
5. First pulls: build a candidate list (sport, hoursToStart, hasCloseSnapshot, taxonomySampleSize) and rank with `rankOddsPullsForBudget` from `@sports/prediction-engine` / `odds-api-voi.ts` under remaining credits.
6. Verify response headers for remaining quota; log spend vs estimate.

**Done when:** at least one Pinnacle close snapshot lands and is readable in the archive path.

---

## 2. A-1 rename tripwire (before any new public surface)

1. Execute the A-1 rename ticket exactly as specified in the OMNIBUS / master plan (product name consistency).
2. Grep public surfaces for stale names; fix until clean.
3. Only then schedule fantasy-first nflverse public surface work.

**Done when:** rename merged; no new public surface shipped under old naming.

---

## 3. G-1 ESPN cutover (founder choice only)

Pick **one**:

- **A.** Stop persist / delete stored ESPN-derived rows that violate storage ban
- **B.** Replace with cleared source for the same job
- **C.** Narrow job to non-storage intents if counsel-cleared (unlikely for current path)

Engineering executes the chosen letter only — no improvisation.

---

## 4. Counsel queue (founder engages; agents prepare only)

- FTN CC-BY-SA Adapted Material scope
- Wikidata + openfootball **PROPOSED** registry entries (identity only)

Agents do not send email or mark registry live.

---

## 5. Optional: explore/exploit policy

If/when live model exploration is desired, fill and sign:
`docs/gse/EXPLORE_EXPLOIT_POLICY_TEMPLATE.md`

Until signed: offline search only; no automated stake exploration.

---

## 6. Binary-adapter branch merge

1. Local: `git fetch && git checkout gse/phase2-binary-conformal-adapter`
2. `cd packages/prediction-engine && pnpm test` (and typecheck)
3. Open PR; review shadow markers (`priced: false`, `status: "shadow"`, `autoPromoted: false`)
4. Merge only after green CI — still does not flip live UQ pricing gates
