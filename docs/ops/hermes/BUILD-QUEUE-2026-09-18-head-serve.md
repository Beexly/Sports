# Hermes build queue, 2026-09-18: the certified head serve path

Issued by the architect session. Fifth queue, and the largest remaining build. This is the
thing the whole architecture is for: one certified probability per stratum, served with its
interval, and nothing reaching a customer until a stratum earns it.

`AGENTS.md` and `CLAUDE.md` bind you in full. Where this file and a law disagree, the law
wins and you mark the task BLOCKED.

---

## 0. What this is and what it is not

The architecture's one held line: **a number may be presented to a customer as a
probability only if it is the de-vigged market probability, labelled as such, or the output
of a head whose stratum has passed certification.**

Today no head exists. `packages/prediction-engine/src/heads/` is not a directory. There is
no artifact format, no serve function, no registry, and no way to express "this stratum is
certified and that one is not". So the gate has nothing to gate.

**This queue builds the serving half, not the fitting half.** The fit is a statistical
exercise that runs inside a cron under a founder-approved MODEL_VERSION bump. The serve
path is mechanical given a specification, and it is the half that is missing entirely.

The trainer capability itself is mainline queue task 10 (the market logit as a fixed
offset). This queue assumes that lands or is landing, and depends on nothing from it except
the shape of a coefficient vector.

**The acceptance test for the whole run, same as every other queue:** merged and deployed
tonight with no founder action, no customer sees any number they do not see today. Every
switch defaults to off, the registry ships empty, and an empty registry means every stratum
is uncertified, which means the serve path returns nothing and the existing display is
untouched.

---

## 1. Hard boundaries

- **Nothing here serves a number to a customer in this run.** The registry ships EMPTY. An
  empty registry certifies nothing. If your work would cause any rendered value to change,
  it is wrong.
- **No `MODEL_VERSION` change**, and do not touch `constants.ts`. The bump is the founder's
  single named action and it is not in this queue.
- **No schema.** The artifact is a versioned JSON blob in the durable store pattern this
  repo already uses; see `apps/web/lib/ops/calibration-eligibility-durable.ts` and its
  three siblings for the shape. A `model_heads` table is PROPOSED in the architecture and
  is explicitly NOT this queue's work.
- **No database, no env flag, no gate, no guardrail script, no fabricated value.**
- **`packages/*` never imports `apps/web`.** The serve function lives in the engine; the
  durable store lives in the web app; the loader is INJECTED from the cron route. Anything
  both sides share crosses `@sports/types`, because 22 files under `apps/web` partially mock
  `@sports/prediction-engine` and a new import into `lib/board/state.ts` or the picks route
  resolves to `undefined` there.
- **Certification reads the conservative end.** Wherever a bound appears, the accept
  decision reads the pessimistic side. A lower bound that exists to prevent demotion is not
  the bound that accepts a probability shown to a paying customer.

---

## 2. How to work

AGENTS.md THE LOOP, owner `hermes`, one ledger row per task, unique titles, `DONE` needs a
SHA that resolves for someone else. Verify block before every code commit: `npm run
typecheck` exit 0, `npm run lint` exit 0, `npx vitest run <this task's test file>` green.
Before the final commit: `npm run guardrails` 26/26 and the ledger guard showing only the
pre-existing M-1. Two attempts per task, then BLOCKED with the exact error. One task, one
commit, staged by name, tagged `[hermes-head-N]`.

---

## 3. The tasks

### Task 1. The stratum key, in `@sports/types`

Every later task needs one canonical way to say which slice a head covers, and if two files
spell it differently the registry silently misses.

Build `packages/types/src/stratum.ts`: a `StratumKey` built from sport, market and side
where side applies, with one `formatStratum` and one `parseStratum` that round-trip, plus a
`parentOf` returning the shrinkage parent (sport-by-market shrinks to sport, sport shrinks
to global) and `null` at the root.

**Definition of done.** Round-trip test over a fixture of every sport and market this repo
mints, a test that `parentOf` terminates at the root from every leaf, and a test that two
differently-cased or differently-ordered inputs produce the SAME key or are rejected, never
silently different.

### Task 2. The head artifact format

Build `packages/prediction-engine/src/heads/artifact.ts`. A versioned, serializable
description of one fitted head, with a pure validator.

It carries: the stratum key; a feature-schema hash so a head fitted on one feature set can
never be served against another; the coefficient vector with its feature names; the fixed
offset declaration, meaning which input enters with coefficient pinned at 1; the
out-of-fold report (n, Brier, debiased ECE, Murphy reliability, the paired log-loss lower
bound over the market-only baseline); a `status` of `candidate`, `certified` or `retired`;
and the basis tag.

The validator is pure and REFUSES rather than coercing: an unknown version, a coefficient
count not matching the feature names, a missing offset declaration, or a status of
`certified` whose report does not clear the four floors is an error, not a warning.

**The floors are byte-identical and you do not restate them.** Import them from where the
eligibility gate reads them (`apps/web/lib/ops/calibration-eligibility.ts:131-136`) or, if
that import would cross the forbidden direction, move the CONSTANTS into `@sports/types`
and have both read the same source. Two files spelling one floor two ways is how they
drift, and a drift here publishes an uncertified number.

**Definition of done.** Tests proving every refusal branch fires, that a `certified`
artifact failing any one floor is rejected, and that the floor values are read from a
single source rather than duplicated.

### Task 3. The serve function

Build `packages/prediction-engine/src/heads/serve.ts`. Pure, no I/O.

Given a validated artifact and a feature row, it returns either a probability with its
interval, or a refusal carrying a reason. It refuses when: the artifact status is not
`certified`; the feature-schema hash does not match the row; a required feature is missing
(never impute, never default); or the stratum does not match.

**The identity property is the safety argument and it gets a test.** With the market logit
entering as the fixed offset and all other coefficients zero, the head must return the
market probability exactly. That is what makes the market the null hypothesis rather than
the base rate.

**Definition of done.** The identity test at machine precision, one test per refusal
branch, and a test that a missing feature refuses rather than imputing.

### Task 4. The head registry, shipped empty

Build the loader and lookup: given a stratum key, return the certified head or walk to the
parent via `parentOf` until one is found or the root is reached, then refuse.

It reads from an injected store following the durable pattern at
`apps/web/lib/ops/calibration-eligibility-durable.ts`. It does not open a database and it
does not read a file at module load.

**The registry ships EMPTY.** Committing a populated registry would serve a number, and no
head has been fitted or certified. An empty registry means every lookup refuses, which
means nothing changes.

**Definition of done.** Tests proving: an empty registry refuses for every stratum; a
`candidate` artifact is never served even when present; the parent walk terminates; and a
stratum whose head exists but whose report misses a floor is refused by the validator
before the registry can return it.

### Task 5. The interval, rendered honestly or not at all

Build the display contract in `@sports/types`, and a rendering helper the web app can use
later. Do NOT wire it into any component in this run.

Rules the contract enforces by type where possible and by test otherwise: a probability is
never rendered without its interval; an interval wider than the stratum's stated limit
suppresses the row rather than showing a wide number; the market probability keeps its own
label and is never merged with a head probability into one unlabelled figure; and a refusal
renders the existing display, never a blank or a zero.

**Definition of done.** Tests for each rule, and a test asserting the helper has no importer
in `apps/web` yet, so this run cannot have changed a rendered value.

### Task 6. The end-to-end no-op proof

One test that composes tasks 1 through 5: build a feature row, run it through the registry
as shipped, and assert the result is a refusal, that the refusal maps to the existing
display path, and that no code path in this queue can produce a customer-visible number
while the registry is empty.

This is the test that lets the founder merge the whole queue without reading it.

**Definition of done.** The test exists, is not skipped, and fails if any earlier task's
default is changed to something that would serve.

---

## 4. Escalate, do not decide

- Any need to move a floor value, for any reason.
- Any design where the serve path imputes, defaults or coerces a missing feature.
- Any temptation to commit a populated registry, or to set a status to `certified`.
- Any finding that the floors cannot be read from one source without crossing the forbidden
  import direction; say so and stop, because the fix is an architecture decision about where
  the constants live.
- Anything that would change a rendered value.

---

## 5. What done looks like

Six ledger rows. Typecheck, lint, 26/26 guardrails, only the pre-existing M-1. A head
artifact format that refuses bad input, a serve function whose identity property is pinned
at machine precision, a registry that ships empty and therefore serves nothing, a display
contract with no importer, and one composed test proving the whole path is inert as
committed.

The founder then has, for the first time, somewhere for a fitted head to go and a gate with
something to gate. The fit, the certification and the bump remain his.
