# EU AI Act Evidence Pack — What This Is and Isn't

Status: honest working note, not a legal instrument. Last touched 2026-07-23.

## What an "evidence pack" is, here

An evidence pack is an **inventory of artifacts that already exist in this
codebase** — things like:

- a sample of recent AI-invocation receipts (when the receipt store exists
  and is queryable),
- the currently-active `SrqcVersion` register row (when the SRQC certificate
  register is wired and populated),
- the existence and git hash of `docs/formal/SRQC_STATUS.md` (when the
  Formal Foundry track has published it),
- `docs/governance/COMPLIANCE_MATRIX.md` (when the governance track has
  published it),
- other artifacts of this shape as they come online.

`apps/web/lib/governance/evidence-pack.ts` (`buildEvidencePack`) assembles
whatever items are actually available into a single timestamped JSON
document. `scripts/governance/export-evidence-pack.ts` is the CLI that
gathers real sources from this repo/branch and writes that document to
`docs/governance/exports/evidence-pack-YYYYMMDD.json`.

The point is narrow: if a future compliance conversation (internal counsel,
a customer's procurement/security review, an EU AI Act readiness exercise)
needs to ask "what do you actually have on file," this pack is a starting
inventory instead of a scramble. Nothing more.

## What this explicitly is NOT

- **This is not a declaration of conformity.** No such declaration has been
  drafted, reviewed, or signed by anyone.
- **This is not CE marking**, and nothing in this repository produces or
  claims CE marking.
- **This is not a claim of high-risk-system certification.** No AI Act
  conformity assessment (internal or third-party) has taken place. Whether
  any Galaxy Sports Edge feature is even in-scope of the EU AI Act, and at
  what risk tier, has not been determined by counsel — see
  `apps/web/lib/governance/use-case-classifier.ts` for a heuristic *hint*
  generator that exists precisely because that determination has not been
  made, and that always flags `needsCounsel: true`.
- **This is not legal advice**, and no output of `buildEvidencePack` or
  `hintTier` should be read, quoted, or forwarded as if it were.

Every generated pack carries this disclaimer verbatim in its
`disclaimer` field:

> Evidence inventory only. Not a declaration of EU AI Act conformity, CE
> marking, or high-risk certification.

## Cross-references

At the time this doc was written, `git log --all --oneline -- docs/governance/`
and `ls docs/governance/` on this branch (`feat/eu-evidence-enforce-ramp`,
based on current `main`) showed **no pre-existing files** in
`docs/governance/` — neither `COMPLIANCE_MATRIX.md` nor
`EU_AI_ACT_POSTURE.md` existed yet. This document was therefore written
standalone rather than cross-referencing them. If/when `packages/governed`'s
build lands those files, this doc should be updated to point at them instead
of restating their content, and `scripts/governance/export-evidence-pack.ts`
should be updated to pull `COMPLIANCE_MATRIX.md` in as a real evidence item
(the script already checks for it and includes it if present — it currently
finds nothing to include).

## Source availability at build time

Checked directly against this branch (base: current `main`, no
`packages/governed` merge, no `docs/formal` track merge):

| Source | Present on this branch? | Handling |
|---|---|---|
| `AgentReceipt`-style rows in `packages/db/prisma/schema.prisma` | No such model exists | Script skips this source, does not fabricate rows |
| Active `SrqcVersion` row (via `srqc_version` table) | Table exists (`SrqcVersion` model, M5), but only reachable with a live `DATABASE_URL`; no row is guaranteed to exist | Script queries it directly with `pg` when `DATABASE_URL` is set and the query succeeds; otherwise skips |
| `docs/formal/SRQC_STATUS.md` | Not present (`docs/formal/` does not exist on this branch) | Script skips this source |
| `docs/governance/COMPLIANCE_MATRIX.md` | Not present | Script skips this source |

Because every optional source above was absent or unreachable at build
time, a pack generated today is expected to be small (in the common case,
zero items) — that is the honest, correct behavior, not a bug.
