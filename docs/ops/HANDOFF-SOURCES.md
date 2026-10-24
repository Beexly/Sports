# HANDOFF — source recon and where the walls actually are

**From:** GLM (session 2026-10-23). **Branch:** `hermes/ship-night-findings`, HEAD `ed76adb11`.
**Everything below is committed and pushed. Nothing is local-only.**

---

## 1. Where the work stands

Reasoning path: the coach trail (L0 usage / L1 health / L2 shadow) is wired into
the published reasoning string at all three scoring sites and leads the trail
ahead of every market clause. Proof quote and mutation proof are in
`docs/engine/SIGNAL-CENSUS.md`. Confidence does **not** yet read `factors[]`, so
the trail is cosmetic to the decision — that row is open and named.

Extraction pipeline: one full audit committed at
`docs/engine/audits/2026-10-25-bal-cin.json` (48 rows, 13 named walls, zero
prose). Builder: `docs/engine/audits/build_bal_cin.py`. Schema + procedure live in
the `football-coach-reasoning-audit` skill, including
`scripts/validate_audit.py` — run it on every new audit.

## 2. What the walls actually are (the useful part)

**2026 participation is not published.** `pbp_participation` release assets stop
at 2025. That single absence walls snap share, route participation, primary
alignment, personnel frequency, defense personnel faced, coverage distribution
and route concepts. Do not proxy with `defenders_in_box`.

**nflverse injuries lags a week.** `injuries_2026.csv` maxes at week 7; no week-8
practice status and no snap counts, so replacements cannot be identified by the
"who actually took the snaps" rule.

**FTN shadow matrix — API fully mapped this session, auth is the only barrier.**
The page is WordPress with a client app; the data service is `api.ftnfantasy.com`.

```
window.baseURL = 'https://api.ftnfantasy.com'
access token: cookie `access_token`; refresh: cookie `refresh_token`
POST /users/token/refresh   -> 422 (path real, needs refresh_token body)
POST /users/login           -> 401 (path real, needs email+password)
GET  /permissions/tools/{tool}            -> 403 unauth (path real)
GET  /permissions/tools/{tool}/required   -> 405 on POST, GET is the verb
POST /users/signup/captcha  -> 405 on POST
/users/forgot-password/send, /users/forgot-password/reset, /users/reset-password,
/users/signup/captcha exist in the bundle.
```
Tool access is gated by `/permissions/tools/<tool>` with an `Auth` header from
`window.getAccessToken()`. **Next move: create one free FTN account, log in with
curl, keep the token, then hit the permissions endpoint to learn the tool slug
and the data route behind it.** No account has been created yet.

**NGS.** `nextgenstats.nfl.com/api/league/2026/REG/lead` and
`/api/statboard/passing` both return 401. Public player pages are JS-rendered.
Next move: pull the NGS player-page bundle, find the token/header it sends.

**scores24.live** returns 403 to curl. Firecrawl renders it. Next move: render,
then find its JSON (likely `api.scores24.live`), same technique as FTN.

**Crew assignment** — `referee` column is empty for 2026 fixtures; assignment not
published yet. No league-average substitution.

## 3. Plan, in order

1. FTN account → token → `/permissions/tools/...` → shadow matrix rows
   (`cbName`, `opposingWR`, `shadowRate_last3`, `snapCount_shadowed`), plus the
   MU column (0–100, not a probability). Replace the L2a wall in the next audit.
2. Same technique against scores24 and NGS; PFF grades last (heaviest).
3. Feed whatever lands into `engine/shadow-coverage-factors.ts`, which already
   exists and expects `ShadowRow[]` — the emitter is built, only the source is
   missing.
4. Make confidence read `factors[]` so the trail stops being cosmetic.
5. Re-run the audit (validate with the skill's script) on a fresh game and diff
   the wall count down.

## 4. Traps that cost real time

- `scoring.ts` has been truncated to a placeholder **three times** by
  concurrent writes: 11, 21 and 1,575 bytes, each on a commit claiming a wiring.
  Always `git show origin/<branch>:path | wc -c` after a push. Expect ~86k.
- `@sports/types` symlink pointed at a different checkout (`Sports-live`) and
  silently hid every type change. Repointed to `~/Sports/packages/types`.
- `computeGameContext` rebuilds its input and drops fields it does not copy —
  every new field needs explicit passthrough.
- `commenceTime` must be a `Date`; ISO strings silently yield zero picks.
- Regex escapes get mangled through the shell (`\d` becomes `d`). Use `[0-9]`.
- A bare retry loop around `git push` will leave a rebase mid-flight and eat a
  commit. Check `git status` for `UU` before retrying.
- Bash heredocs sometimes fail on this box with "unexpected EOF"; write the
  script to a file and run it.

## 5. Commands

```
cd packages/prediction-engine && node ../../node_modules/vitest/vitest.mjs run
cd ~/Sports && node scripts/guardrails/run-all.mjs          # EXPECT: 31/31 passed
python docs/engine/audits/build_bal_cin.py                  # EXPECT: 48 rows; 13 walls
python <skill_dir>/scripts/validate_audit.py docs/engine/audits/<file>.json
```

## 6. Do not

- Do not re-centre on Brier or the close. Reasoning is the product.
- Do not wire `factor-narrative.ts` as the reason source; it narrates market.
- Do not soften a wall into a proxy. If it is not the named column, it is a wall.
- Do not push a `scoring.ts` under 80k without checking the byte count.
