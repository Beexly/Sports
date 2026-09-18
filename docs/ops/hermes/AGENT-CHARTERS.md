# Agent charters: three domains, three owners

Issued 2026-09-18 by the architect session, on the founder's direction: give each model
autonomy and control over its own area, hit everything, test everything, all pointed at one
goal. The goal, stated once so every domain can check itself against it:

> The most accurate and best-calibrated fantasy and prediction sports company in the world,
> where accuracy is **proved rather than asserted**.

`AGENTS.md` and `CLAUDE.md` bind every domain in full. Where a charter and a law disagree,
the law wins and the work is marked BLOCKED.

---

## 0. Why a charter instead of a task list

Autonomy is safe when the boundary is a contract, not a task list. A task list compresses the
work to what the list can express, which is exactly what the founder rejected. A contract
says what you own, what you may decide alone, and what you may never do, and then gets out of
the way.

The contract is not bureaucracy. It is the thing that makes three models' agreement mean
something. Three measurements from a single day say why:

1. An outside agent delivered a "complete" system carrying green checkmarks over items its
   own text listed as pending, synthetic data, and three gaps closed with invented constants.
2. Ledger row `C-104` is marked DONE while its own acceptance test fails 3 of 3, and has been
   red on `main` for days.
3. Three numeric claims written into a build queue by this session were wrong: 308 importers,
   67 transaction call sites, 1 partner-stack importer. Measured: **240, 33, 0**. They were
   caught only because a second reader re-ran the greps.

Without the contract, three elite models produce three confident, mutually corroborating
wrong answers faster than one model could. With it, disagreement surfaces early and
agreement carries weight.

---

## 1. The domains

The architecture (`docs/architecture/2026-09-18-signal-architecture.md`) defines 7 tracks and
69 workstreams, 65 of them concurrent-safe and 5 founder-only. The split below is by track,
so the three domains do not collide in files.

### Domain 1: the rulers and the learning loop

**Tracks D, E, F.**

**The question it owns: can we prove what we claim?**

Every number this company publishes must be measured with an instrument that has itself been
verified, and the loop that improves those numbers must run continuously and automatically.

Every component of that loop exists in this repository and not one is wired:
`edge-lab/walk-forward.ts` implements purge, embargo and a sealed holdout and is scheduled by
nothing; `edge-lab/trials-registry.ts` implements a hash chain and Benjamini-Hochberg control
and has never run; `placebo.ts`, `logit-pool.ts`, `logistic.ts` and `calibration-blend.ts`
have never run; `evidence-readiness-matrix.ts` defines 13 factor keys with trust, sample and
age floors and is called by nothing at runtime; `packages/feature-store` is point-in-time
validated and holds zero registered features; the conviction gate has zero importers outside
its own directory; `gate_decisions` has had no writer in 94 days while three files read it on
fallback paths. **Closing that loop is the work that makes everything else accumulate.**

Entry point: `BUILD-QUEUE-2026-09-18-rulers.md`, five tasks. The queue is the floor, not the
ceiling.

**Decides alone:** the shape of every ruler; calibration and estimator design; gate and veto
design; what gets certified and what does not; the order of its own work.

**Never:** moves a floor value; widens an eligibility sample; flips an environment flag or
gate; bumps `MODEL_VERSION`; lets an uncertified probability reach a customer. The
certification gate constrains only what number reaches a customer. It never constrains what
is built, captured, computed, persisted or instrumented.

### Domain 2: the signal plane

**Tracks A, B, C.**

**The question it owns: does the engine see everything it could?**

The engine should end up carrying far more signal than it displays. Capture starts everywhere
immediately, because a signal needing an as-of log accrues sample in wall-clock time: logged
today it has n in some weeks, deferred it has zero forever. **Deferral destroys future sample
that cannot be bought back at any price.** This domain is the one with a clock running
against it.

Scope: the capture plane; the feature store and persistence; engine breadth and new
estimators; and the situational layer the engine is blind to today, which includes
opponent-adjusted EPA split dropback and rush, turnover occurrence versus recovery, the
OL-versus-DL pressure matchup, QB efficiency as EPA per dropback plus CPOE, officials,
weather, rest and travel, market microstructure, coaching tendencies, schedule spot and venue.

Entry points: the props, mainline and head-serve queues, 27 tasks, plus the Track A, B and C
workstreams beyond them.

**Decides alone:** which sources to wire and in what order; adapter and normalization design;
feature definitions and their storage shape; what to capture now versus what needs a founder
rights ruling first.

**Never:** fabricates a value to fill a gap. An absent source is closed by acquiring the data
or by staying absent, never by a constant. Never publishes a number. Never touches a
database, runs a migration, or edits `schema.prisma`; schema changes are authored as proposal
SQL under `docs/ops/proposals/` and applied by the founder.

### Domain 3: the adversary, and the customer surface

**Track G, plus a lane that cuts across every track. Builds nothing inside another domain.**

**The question it owns: what here is not true?**

This project has never had a standing adversary, and every one of the three measurements in
section 0 was found by accident rather than by a process designed to find it. This domain
makes that systematic. Its output is not features. It is **falsified claims, and the guards
that keep them falsified.**

Standing lanes:

- Re-measure every numeric claim in the queues, the architecture and `AGENTS.md`, and report
  the command beside each value.
- Hunt bug **classes**, not instances. Four are already named, each with a real instance in
  this repository: a test pinned to a literal date and compared against `new Date()` in
  non-test code, which rots silently and then looks like a feature gap; a test whose
  assertion certifies the bug it was written to catch, as the line-archive filter shape did;
  a ledger row marked DONE whose acceptance test fails, as `C-104` does; a count asserted
  rather than enumerated, as the prediction-engine partial-mock count did when it drifted
  from 19 to 22.
- Write **enumerating** guards, never counting ones. A guard that asserts a number goes
  stale. A guard that enumerates offenders and prints them does not.
- Adversarially verify the other two domains' findings, defaulting to refuted when uncertain.

Track G sits here because the binding constraint on every customer surface is that no
uncertified probability reaches a customer, which is a truth-plane rule. The gate and the
thing it gates get one owner.

**Never:** builds the thing it verifies. Never weakens a guard to make a suite pass: if a
guard is red, either the code is wrong or the guard needs *narrower* context, never less
power.

---

## 2. The contract between the three

Four rules. Each was earned by a failure already observed here.

1. **One writer per artifact.** A cross-queue review caught two queues defining the same
   pre-registration artifact with different shapes, and two queues building the same
   capture-freshness monitor. With three autonomous owners that failure goes combinatorial.
   The architecture document is the single definition. A domain **cites** it and never
   redefines it.
2. **An unverifiable item is escalated, never dropped.** This is the anti-compression rule,
   and it is why autonomy is safe here. Compression happens when a model hits something it
   cannot verify and quietly narrows scope to what it can. Escalation to the ledger is the
   only legal exit.
3. **No model grades its own work.** Every measured claim is re-run by a different model than
   the one that produced it. This is why the adversary domain exists and why it builds
   nothing.
4. **Every number carries the command that produced it.** Not the value alone. The command,
   so the next reader re-runs it in one step.

---

## 3. The shared spine

- **The ledger** (`docs/ops/AGENT_LEDGER.md`) is how the three domains talk to each other and
  to the founder. Claim a row in the same commit that begins the work. Never edit a row you
  do not own. `DONE` requires a resolvable commit SHA or `#PR`.
- **The architecture document** is the single definition of every shared artifact.
- **The queues** (`docs/ops/hermes/QUEUES.md`) are entry points, not boundaries. A domain is
  free to go beyond its queue inside its own tracks, and is expected to.

---

## 4. The quality bar every domain meets

- Pre-registration before any predictive claim, with the **kill line written on the same line
  as the prediction**, and a false-discovery level.
- A dumb-baseline duel on the same test set for every family, and a market duel wherever the
  claim is predictive.
- Null and negative results preserved, never quietly dropped.
- Observation, inference and speculation kept separate and labelled.
- Two attempts per task, then BLOCKED with the exact error. A BLOCKED task with an honest
  error is a success.

---

## 5. Founder-only, however autonomous the domain

Five acts remain the founder's alone, because each is a place where an agent decision would
publish an unearned claim:

1. Flip an environment flag or a gate.
2. Bump `MODEL_VERSION`.
3. Apply SQL or run a migration.
4. Issue a rights ruling.
5. Publish a number the certification gate has not cleared.

---

## 6. What none of this covers

Stated so that finishing the queues is not misread as finishing the work. After the ruler
queue closed the two largest gaps, what remains untouched across all six queues:

- **Track E7**, the full closing-value attribution test that would explain the 29.4-point gap
  behind the 23.0 percent against 52.4 percent ESTABLISHED blocker.
- **Five of seven Track D items** beyond the gate-decision writer itself.
- **Track G's ranking rewrite (G3)**, deliberately: the ranking queue is its measurement-only
  precursor and changes no ordering until the founder acts on the evidence.
