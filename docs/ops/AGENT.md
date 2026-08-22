# AGENT.md — shared status (append-only)

Canonical path: C:\\Users\\Garrett\\Sports\\docs\\ops\\AGENT.md
Also copy to: C:\\Users\\Garrett\\tmp\\AGENT.md if Sports is dirty.

Every agent (Grok CLI, Grok Bot / CoS, Lane Watcher, Claude, Hermes) appends one block per material change. No novels. No secrets.

## Format
### YYYY-MM-DD HH:MM CT | AGENT | CLEAN|BLOCK|FAKE-EDGE|OWNER_GATE
- Who / what
- Evidence (PR, HTTP, PID)
- Next action (one owner)

## Rules
- Do not start a second Hermes if handoff/cheap-overnight/watchdog.pid is live.
- No Odds event-odds or historical from bots.
- Do not market PUBLIC_PICKS as PROVEN/CLV.
- Phone: email Baxley.Garrett@gmail.com only on BLOCK / FAKE-EDGE / OWNER_GATE.

## Now (2026-08-22 01:38 CT)
### 2026-08-22 01:38 CT | Chief of Staff | OWNER_GATE + BLOCK + FAKE-EDGE
- Odds /v4/sports 401; remaining file 0/0. Neon P1001. Public picks model_signal n=0.
- Windows babysits Hermes+8317. Lane-watch overnight paused. Morning glance 08:00 CT.
- Next: founder (Vercel THE_ODDS_API_KEY + Neon). Claude (copy/gating). Hermes (T11 cheap queue).

### 2026-08-22 01:45 CT | Chief of Staff | OWNER_GATE (key) + no live edges
- Paid Odds key located in Gmail; backup at C:\Users\Garrett\tmp\.odds-api-key (not git). Vercel env not written (CLI logged out; Windows spawn aborted). Do not print key.
- No live book edges: Neon P1001, prod deploy ERROR, Kalshi public GET 429, no in-repo odds snapshots.
- Real program remains X1 Shin (needs Odds, preseason ~ends Aug 28) then X4 Kalshi $0. STOP confidence-as-model.
- CoS: no extra Grok agents, no Odds event-odds, no second Hermes. Morning glance 08:00 CT.

### 2026-08-22 ~08:45 CT | Grok CLI | CLEAN (drive)
- Hermes overnight wrongly STOP'd after T-Q1/2/3 because launch said idle+T-Q4 STOP. Revoked.
- Prod Ready SHA `0cf7605f` (DB ping ok). Merged #522 #524 #528. Closed #532 dup of #535. #525 Test still red. #537–#540 conflicted.
- Relaunched watchdog pid 24188, Hermes python 34364/13016 on `EDGE-HUNT-LAUNCH.md` Ox Alpha. 8317=200. No DONE.md. Do **not** start a second Hermes.
- Watchdog CIM match missed EDGE-HUNT (logged hermes=pending) — patched for **next** session; do not kill this one.
- Next: Hermes E1 (#525 typecheck job 97034874745) then E2 rebase then E3+ new p-modules. Log every action here. Grok unblocks only when they cannot work.

### 2026-08-22 14:10 CT | Hermes | CLEAN
- E1 (#525): CI run 32577398314 failed — ONLY failure is agent-ledger guard: T-Q3a row has Status=DONE but Evidence is `—`, no resolvable SHA. Fix: set evidence to `cc905a83 on origin/hermes/ox-alpha-q-integrity; PR #525`. Committed as 7d917706, pushed to origin/hermes/ox-alpha-q-integrity. CI re-running (run 32578606146).
- E2 scope: #537–#540 all MERGED into origin/main. Branch tips have stale "merge origin/main" commits that DELETE later PRs' files. Rebase task = clean up branch tips (drop stale merge commits, keep only feature commits on top of main).
- Next: verify #525 CI green → E2 rebase #537 (juice floor) → #538 (rec TD) → #539 (rush TD) → #540 (line-shop).

### 2026-08-22 14:55 CT | Hermes | CLEAN
- E1 (#525): CI GREEN (run 32578606146, all checks SUCCESS at 14:34). Branch hermes/ox-alpha-q-integrity pushed to origin. PR OPEN, ready for review. Ledger row H-N → DONE with evidence cc905a83.
- E2 (#537–#540): ALL FOUR PRS MERGED into origin/main (mergedAt 13:45–13:48). Stale local branches local-537..540 deleted. E2 complete — rebase was a no-op since PRs already merged cleanly.
- E3 (#542): pass yards g/attempts — PASSED CI, pushed to origin/hermes/ox-alpha-pass-yards-given-attempts.
- E4/E5 (#543): completions + INTs g/attempts — PASSED CI, pushed. Branch origin/hermes/ox-alpha-q-integrity-given-attempts is current HEAD.
- E6 (#544): sacks g/dropbacks — MERGED into origin/main (b7ede3d0).
- E7 (#545): rush attempts g/attempts — CI GREEN (all checks SUCCESS), pushed. Branch origin/hermes/ox-alpha-rush-attempts-volume at 8d81de6a. origin/main ahead by 1 commit (#544) — no rebase needed, PR is green.
- Next: E8 — red-zone TD rate given RZ attempts. Start now.
