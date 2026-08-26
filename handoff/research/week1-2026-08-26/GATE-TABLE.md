# Q4 — Bucket-A gate audit, Week-1 visitor path

Session `claude/gse-week1-launch-bh0nqo`, 2026-08-26. Every classification below
was verified directly (route file exists; performance-claim grep run per route),
not taken from a summary.

## The finding that reframes Q4

**No priority route is gated by routing.** `middleware.ts:22` protects exactly
`["/dashboard", "/admin", "/cockpit"]` — none of the eleven. All eleven are
already reachable by a logged-out visitor today. There was no routing gate to
open.

**The real gate was discoverability.** The desktop nav's "Proof" door was a
single link to `/calibration` (`nav.tsx:106-107`) whose own tooltip promised
"calibration, CLV, and the public ledger" and linked to neither the ledger nor
anything else. The credibility layer — the kill ledger, the engine explainer,
the source-rights table, the changelog — was live, honest, and unreachable from
the navigation. That is precisely a gate hiding finished work, so it is opened.

| Route | page.tsx | Renders real data | Performance claim (verified) | Bucket | Action |
|---|---|---|---|---|---|
| `/board` | present | yes | none — counts + gated Brier only; anti-claims at `board/page.tsx:18,235,327` | A | already public + nav |
| `/brief` | present | yes (live pick count) | none | A | **BROKEN-LEDGERED** — composer is a stub |
| `/picks` | present | yes | latent W/L/P renderer `picks/page.tsx:600-609`, currently inert (`daily-slate/route.ts:169` hardcodes null) | B | already public; left as-is |
| `/calibration` | present | yes | latent observed win rate `proof-explorer.tsx:140-147`; zeroed while gated | B | already public + nav (pre-existing) |
| `/calibration/market` | present | yes | **literal "Elo accuracy" %** `calibration/market/page.tsx:147-148` | B | **BUCKET-B-OWNER-ASK** |
| `/clv` | present | yes | entire frame is "beat the close"; payload gated | B | **held** — see note |
| `/accountability` | present | static prose | none — every match is prose *about* gating | A | **OPENED** (nav) |
| `/edge-index` | present | yes | none — zero matches | A | **OPENED** (nav + mobile) |
| `/engine` | present | yes | none — `engine/page.tsx:271` is a count, not a rate | A | **OPENED** (nav + mobile) |
| `/data` | present | static source table | none — zero matches | A | **OPENED** (nav + mobile) |
| `/changelog` | present | static | none — zero matches | A | **OPENED** (nav + mobile) |

Total routes in the app: **235** `page.tsx` files.

## What "OPENED" means here

`components/ui/nav.tsx` — the standalone Proof link became a `PROOF_MENU`
(matching the existing `NavGroup` pattern) carrying Calibration, Accountability,
The Engine, Edge Index, Data & Sources, and Changelog.
`components/ui/mobile-nav.tsx` — added The Engine, Edge Index, Data & Sources,
Changelog to the existing Proof section, which already carried nine links
(desktop had one; the two surfaces had drifted badly apart).

**No page's rendered content changed. No gate flag was flipped. No disclosure
copy was authored** — the existing components stay as they are.

## /clv — held, and the reason is a guard, not my judgement

I added `/clv` to the desktop Proof menu, reasoning that it is already publicly
linked from `mobile-nav.tsx:69` and its payload is gated
(`public-clv-policy.ts:71-72` renders `ClvGatedState`), so withholding it on
desktop alone guarded nothing.

`__tests__/nav-route-integrity.test.ts:87` asserts `nav.tsx` must not reference
it. **The guard caught me and I reverted, rather than touching the assertion.**
That test encodes the repo's IA decision; my reasoning was mine. If the founder
wants desktop/mobile parity on CLV, that is an owner decision that changes the
test — not something to route around.

## Owner asks arising

1. **`LIVE_BOARD` is never read on the /board render path.** `liveBoardOn`
   defaults false at `lib/board/state.ts:139` and is passed literal `false` at
   `:261, :351, :469, :499`. `classifyBoardState` therefore always takes the
   `HONEST_EMPTY_LIVE_BOARD_OFF` branch on an empty board regardless of the env
   var. The flag is read in `public-surface-truth/route.ts:494`,
   `free-settlement-runner.ts:628,632` and `board-surfaces.ts:56` — none of
   which feed the board page. **Flipping `LIVE_BOARD` today would change
   nothing.** Not fixed here: `LIVE_BOARD` is founder-YES-only, and silently
   changing what a founder-gated switch does is not an agent's call.
2. **`/calibration/market` renders a literal accuracy percentage** and is
   currently ungated (no `getReadinessGates`, no env read, no redirect). It is
   publicly reachable now. Bucket B — founder decision.
3. **`/brief` is a stub.** Rebuilding the composer is a feature, not a gate.

## Acceptance

- `npm run guard:commercial-copy` — **exit 0**, 439 files scanned
- `npm run guard:performance-claims` — **exit 0**, 445 files scanned
- `npm run build` — **exit 0** (verified from the log, not the wrapper's status)
- `__tests__/nav-route-integrity.test.ts` — 5/5
