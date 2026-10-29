> **STATUS CORRECTION — 2026-10-28.** The commit hashes in this file (`32dd20878` / `bba67aaa1`)
> are superseded. HEAD = `a37bdae82cb57b68a9b65a82327905ff84ac4ab1` = `origin/engine/public-baseline-2026-10-24`,
> ahead/behind `0 0`. The push landed; "BLOCKED — push" is not a live blocker.
> Still-live blockers in this file: the Google Doc append (Docs API not enabled) and the QB
> estimator re-run (missing 2024/2025 injury CSVs + `/opt/model/fit_qb_questionable2.py`).

# Blockers — GSE Sealed Coach-First Architecture, 2026-10-27

Branch: `engine/public-baseline-2026-10-24`
Repo: `C:/Users/Garrett/Sports`

## BLOCKED 1 — Google Doc append (item 6)

Target: Google Doc `14pXZGSvQBlBUBJ7RTKBm-_BOVCmCkcNBMFb-IODOLlM` ("🐴 10:26:26 Agent Log").

Two independent append paths failed:

1. **Docs API** — HTTP 403 `PERMISSION_DENIED`:
   "Google Docs API has not been used in project 868513040414 before or it is disabled."
   The OAuth token itself is valid and carries `https://www.googleapis.com/auth/documents`;
   the Drive API works with the same token (doc metadata readable, `canEdit: true`,
   owner is Garrett Baxley). Only the Docs API surface is disabled.

2. **Browser (local Chrome profile, real editor via `?rm=full`)** — the doc opens
   correctly and reports "Editing", the `.docs-texteventtarget-iframe` is present and
   focusable, but neither input path registers:
   - synthetic `ClipboardEvent('paste')` with a `DataTransfer`: dispatch returns ok, no change
   - CDP `Input.insertText` after clicking the canvas and sending real Ctrl+End: no change

   Verification: Drive export before and after both attempts = 163,514 chars, marker string
   absent, doc `version` unchanged at 139, `modifiedTime` unchanged. **The document was not
   modified and is intact.**

Note on length: an earlier export returned 50,316 chars and a later one 163,514. That is
the Drive text export surfacing the full multi-tab document rather than a truncation; the
document body checks out coherently (starts "11:14 - Log Created GB", ends
"End of master document"). No corruption.

**Unblock options** (any one):
- Enable the Google Docs API for project 868513040414 in the Google Cloud console, then
  re-run the append — the token already has the right scope.
- Append manually from a signed-in browser session.
- Have the doc owner grant the OAuth client edit access explicitly.

## BLOCKED 2 — QB estimator cannot be re-run here (item 2, partial)

`QB_QUESTIONABLE_EV_WEIGHTED_EPA_DROPOFF = 0.0947` is frozen and confirmed present
(`gse-pre-seal/injury-operator.ts:52`), retained as headline value 0.8106
(`1 - 0.0947/0.50`) with a derivation test.

The estimator itself cannot be re-run in this checkout: `data/gse-dataset/current/`
contains `injuries_2026.csv` only. There is no `injuries_2024.csv` or `injuries_2025.csv`,
and the original estimator lives at `/opt/model/fit_qb_questionable2.py` which is not on
this machine. **The measured value stands as recorded pending human confirmation.**

## CORRECTION — push was NOT blocked (item 1)

The brief states the push is blocked and requires `git fetch --unshallow`. That is not
what happened. Verified with a server-side read (`git ls-remote origin`, which does not use
the local tracking ref):

- `origin/engine/public-baseline-2026-10-24` = `32dd208783162eed59769bf12fc5f86c7083f46a`
- local `HEAD` = `32dd208783162eed59769bf12fc5f86c7083f46a`
- `git rev-list --left-right --count HEAD...origin/...` = `0  0`

The push completed. The clone *is* shallow (4 roots) with a 3.46 GiB pack, but that did not
block the push. The apparent multi-minute hang was the pre-push secret-scan hook walking
22,141 tracked files. No unshallow is required. This correction is recorded rather than the
requested blocker text, because writing "push blocked" into a durable log would be false.

## NOT A BLOCKER — dependency tree repaired

During worktree consolidation the `Sports-live` worktree was deleted. It was the symlink
target for all 561 entries in the repo-root `node_modules`, so the tree became 561 dangling
links. `npm install` then failed `ENOTDIR`. Repaired by removing the hollow `node_modules`
and reinstalling: **826 packages, 20m, EXIT=0**. Both verification gates were re-run against
the restored tree and pass (see completion summary). Recorded here because it was self-
inflicted and material.

## ADVISORY — medium finding not in this session's scope

`coach-sim/weekly-cadence-orchestrator.ts:299` still derives the affected team by
`call.id.replace(/-personnel$/, "")` before checking `affectedTeams.has(...)`. The original
review flagged this as a fragile string parse that should carry the team structurally. It
was not among the five fixes for this session and was not changed.
