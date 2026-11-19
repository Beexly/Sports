# Issue tracker: Local Markdown (primary) + GitHub Issues mirror (`Beexly/Sports`)

Active specs and vertical-slice issues for this repo live primarily as markdown files in `.scratch/`, with optional GitHub Issues synchronization via `gh` when working online.

## Local Markdown Conventions (Primary)

- One feature per directory: `.scratch/<feature-slug>/`
- The spec is `.scratch/<feature-slug>/spec.md`
- Implementation issues are one file per ticket at `.scratch/<feature-slug>/issues/<NN>-<slug>.md`, numbered from `01`, never a single combined tickets file
- Triage state is recorded as a `Status:` line near the top of each issue file (see `docs/agents/triage-labels.md` for the role strings)
- Blocking relationships are declared as `Blocked by: <NN>, <NN>` (or `None (can start immediately)`)
- Comments and resolution history append to the bottom of the file under a `## Comments` heading

## GitHub Mirror Conventions (`gh` CLI on `Beexly/Sports`)

When mirroring epics or blockers to GitHub Issues:
- Verify repo ownership first: `gh repo view --json nameWithOwner` must resolve to `Beexly/Sports`.
- **Create an issue**: `gh issue create --title "..." --body "..."`
- **Read an issue**: `gh issue view <number> --json number,title,body,labels,comments`
- **Blocking**: `gh issue edit <child> --add-blocked-by <blocker>` (`gh` 2.94+)
- **PRs as a request surface: no.**

## When a skill says "publish to the issue tracker"

Create files under `.scratch/<feature-slug>/` (creating the directory if needed), and optionally mirror to `Beexly/Sports` via `gh issue create` when connected.

## When a skill says "fetch the relevant ticket"

Read the file at `.scratch/<feature-slug>/issues/<NN>-<slug>.md` (or run `gh issue view <n>` if a `#<number>` GitHub issue was supplied).

## Wayfinding operations

Used by `/wayfinder`. The **map** is a file with one **child** file per ticket.

- **Map**: `.scratch/<effort>/map.md` (the Notes / Decisions-so-far / Fog body).
- **Child ticket**: `.scratch/<effort>/issues/NN-<slug>.md`, numbered from `01`, with the question in the body. A `Type:` line records `research`/`prototype`/`grilling`/`task`; a `Status:` line records `claimed`/`resolved`.
- **Blocking**: a `Blocked by: NN, NN` line near the top. A ticket is unblocked when every file it lists is `resolved`.
- **Frontier**: scan `.scratch/<effort>/issues/` for files that are open, unblocked, and unclaimed; first by number wins.
- **Claim**: set `Status: claimed` and save before any work.
- **Resolve**: append the answer under an `## Answer` heading, set `Status: resolved`, then append a context pointer (gist + link) to `map.md`.
