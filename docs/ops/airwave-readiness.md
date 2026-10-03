# Airwave Listener — Readiness Assessment

**Date:** 2026-09-29 · **Branch:** `hermes-surf-16-provenance-fix` · **Scope:** read-only source review, no DB access

---

## Bottom line

**The worker is not a partial implementation. It is a reporting script, and it is honest about that.**

`workers/airwave-listener/` is four files totaling ~200 lines. Its one script prints a
plan. It contains **zero** capture, transcription, diarization, extraction, or persistence
code — not stubbed, not `TODO`, not partial. Nothing in the directory is capable of
producing a single `ClaimCandidate`.

**The gap is larger than "no producer."** The downstream control plane, contracts,
validators, redaction boundary, and cockpit review surface are genuinely built and
genuinely tested (~5,300 lines of lib, ~2,000 lines across 13 test files). But there is
also **no database writer and no durable review queue anywhere in the repo.** Even a
perfect, fully-counseled capture worker would have nowhere to put its rows today. The
review queue is a *file read*, not a queue.

**The founder is not blocked by engineering. He is blocked by two signature decisions**
and one data dependency. Turning the worker "on" is not an engineering task; it is a
legal-posture decision that gates a build that has not been written.

---

## 1. What the worker actually is

```
workers/airwave-listener/
├── README.md        189 lines   (explicitly self-labels as scaffolding)
├── package.json      14 lines   (ts-node + typescript only — no audio/whisper/ffmpeg deps)
├── tsconfig.json     14 lines
└── src/dry-run.ts   187 lines   (console output, nothing else)
```

The entire program is: read env flags → read the sample CH87 schedule → build the intake
plan → `console.log`. It declares its own limitations in the header
(`src/dry-run.ts:15-20`): *"Does not capture audio / Does not access SiriusXM endpoints /
Does not write to any database / Does not generate any claims / Does not activate any
listener."*

**Verified by execution.** It runs clean via the repo's existing `ts-node`:

```
$ npx ts-node --project workers/airwave-listener/tsconfig.json \
    workers/airwave-listener/src/dry-run.ts

  AIRWAVE LISTENER — DRY RUN REPORT
  CT Hour:   15:00 America/Chicago
  GATES
    Master (AIRWAVE_ENABLED):           CLOSED ✗
    SiriusXM legal ack:                 NOT GRANTED ✗
  CHANNEL 87 SCHEDULE
    Total shows:      4
    Sample-only:      4 (replace with operator-verified data)
  CURRENT SHOW BLOCK
    Show:       Afternoon Lines (Sample)
    Hosts:      [Sample Host D]
    Confidence: SAMPLE_PLACEHOLDER
  ...
  DRY RUN COMPLETE — no side effects produced.
```

So: **real code, correct output, zero capture capability.** Calling it a "worker" is the
only thing about it that overstates it. The README's own status banner is accurate —
this is the rare case where the scaffold is honest about being a scaffold.

**Two wiring details worth knowing** (they show the plumbing is decorative, not just thin):

- `dry-run.ts:68` passes the schedule into `buildAirwaveIntakePlan(env, now, [...shows])`,
  but that function's third parameter is `_scheduleBlocks` and is **never read**
  (`intake-contract.ts:222`). The show blocks the dry-run bothers to compute are dropped
  on the floor.
- The cockpit's window indicator uses `isWindowOpen()` in `intake-contract.ts:115-126`,
  which works from raw **UTC** hours with an inline approximation, while
  `channel-87-schedule.ts:94-107` has a proper DST-correct `centralTimeHour()`. The
  approximation reports the window **open during 00:00–04:00 CT**, five hours when the
  CH87 window is actually closed. Minor, but it is an operator-facing surface making an
  incorrect factual claim.

---

## 2. What already exists (this part is real)

The downstream is not vapor. It is built, tested, and internally consistent:

| Layer | File | LOC | State |
|---|---|---|---|
| Claim contract + validation + redaction | `lib/airwave/claim-extraction-contract.ts` | 294 | **Built, tested.** 9 hard rules enforced in code |
| Batch validator (JSON/CSV/file/env) | `lib/airwave/claim-batch-validator.ts` | 254 | **Built, tested.** No side effects by design |
| CH87 schedule contract | `lib/airwave/channel-87-schedule.ts` | 336 | **Built** — but 4/4 shows are `SAMPLE_PLACEHOLDER` |
| Inert capture gate | `lib/airwave/pipeline.ts` | 123 | **Built.** `captureGate()` defaults to refusal |
| Read-only control plane | `lib/airwave/control-plane.ts` | 312 | **Built.** 12-column spreadsheet contract |
| Intake plan / lane states | `lib/airwave/intake-contract.ts` | 441 | **Built.** 6 lanes, 11 `forbiddenActions` |
| Source policy (10 categories) | `lib/airwave/source-policy.ts` | 654 | **Built** |
| GSE/GSN output map | `lib/airwave/gse-gsn-output-map.ts` | — | **Built, tested.** Refuses UNFALSIFIABLE → pick evidence |
| Read-only APIs | `app/api/airwave/{readiness,intelligence-readiness,intake-readiness,review-queue}` | — | **Built.** All admin-gated, all `GET` only |
| Operator cockpit | `app/cockpit/airwave/page.tsx` | 638 | **Built.** Review-queue UI present |

**13 test files, 2,015 lines** cover the contracts, gates, and APIs. This is a serious
piece of software.

### What is NOT built — and this is the part that matters

**There is no producer *and* no consumer-with-durability.**

- **No DB writer.** Grep for `INSERT INTO`, `db.`, `prisma`, `drizzle`, or any SQL
  referencing airwave/claim tables across `apps/web`, `packages`, and all `*.sql`
  migrations returns **nothing**. The claim surface has never been persisted.
- **No write route.** All four `/api/airwave/*` routes export `GET` only. There is no
  POST/PUT/PATCH. The cockpit itself prints the fact at `cockpit/airwave/page.tsx:406`:
  `<Fact label="Can write status" value="NO — no DB writer active" />`.
- **The review queue is a file read.** `GET /api/airwave/review-queue` calls
  `validateClaimBatchFromEnv()`, which re-reads `AIRWAVE_CLAIM_BATCH_FILE` from local
  disk, validates it, and then **strips the row level entirely before returning**
  (`review-queue/route.ts:54`). Operators cannot see individual claims in the API at all.
- **The cockpit queue is hardcoded empty.** All five metrics are string literals
  (`cockpit/airwave/page.tsx:359-364`: `value="0"`), and the table body is a single
  "No claims in queue" row. The review queue UI has never rendered a real claim.
- **The source policy forbids the thing the worker is meant to do.** Both relevant
  policies are set `canCapture: false, canTranscribe: false` —
  `founder_local_listening` (`source-policy.ts:405-406`) and `satellite_radio_context`
  (`source-policy.ts:445-446`, status `HELD`).

So the accurate statement is: **the contracts and the guardrails are built; the store and
the capture are not.** A minimal capture worker is roughly the smaller half of the work.

---

## 3. What a minimal local capture worker would actually need to do

Restating the README's own boundary first, since it constrains every line below.

The README's forbidden-list (`workers/airwave-listener/README.md:26-37`) is explicit and
must survive the build:

> | Forbidden | Reason |
> |---|---|
> | Protected stream scraper | SiriusXM terms prohibit API/endpoint access |
> | Credential bot | No automated login or account management |
> | DRM bypass | No circumvention of any content protection |
> | Direct stream ripper | No recording of protected streams |
> | Long-term audio archive | No audio files are retained after extraction |
> | Public verbatim transcript | No verbatim text published at any point |
> | Automated publisher | All claims require operator review before any output |

`docs/ai/airwave/SIRIUSXM_CHANNEL_87_LISTENER_PROTOCOL.md:68` adds a permanent exclusion
by name: third-party activation tools (`parker-stephens/siriusxm-activator`,
`brendeni1/SiriusXM-Renewer`) are **permanently excluded**.

Nothing below circumvents any of that. The legal-load-bearing part is that capture must
be **OS loopback of audio the founder is already playing to themselves** — a person
listening and a program tapping the same local audio device. That is the entire
defensibility argument, and it collapses the moment anyone reaches for a URL, a token, a
stream endpoint, or a DRM stripper.

Given that boundary, a minimal worker is five pieces:

1. **Loopback tap** (OS-native, ~no licensing issue) → rolling 10-minute segments written
   to a temp directory, deleted immediately after transcription. Ephemerality must be
   *implemented*, not just asserted in the README — the current gate is unchecked
   (`README.md:48`).
2. **Local transcription + diarization** (`faster-whisper` / `whisper.cpp`, MIT; Pyannote
   for speaker attribution). This is the heaviest new dependency and the only real
   compute cost. All MIT-licensed, all on-device, none touch a protected endpoint.
3. **Extraction pass** → `ClaimCandidate[]` conforming to `claim-extraction-contract.ts`,
   with `paraphrased_claim` (never verbatim), `rights_status`, `operator_status="DRAFT"`,
   `public_safe: false`. The contract validator already enforces this — the worker just
   has to call it and refuse to write rows that fail.
4. **A persistence target that does not exist yet** — a claim table, a write route, and
   a status-transition endpoint (`DRAFT → REVIEW → APPROVED`). This is the real gap.
5. **Operator review surface wired to a real store** — the cockpit queue is a shell; it
   needs the row list, per-row advance actions, and an `AIRWAVE_*`-gated approval.

Also required and currently missing: **real CH87 schedule data.** All four show blocks
are `SAMPLE_PLACEHOLDER` with hosts like `[Sample Host D]`
(`channel-87-schedule.ts:234-303`). There is nothing to schedule capture against until
the founder supplies verified data by hand.

---

## 4. Open founder decisions — what actually blocks this

These are not engineering tasks. Each is a human signature.

### D1 — Licensing / terms of service *(hardest blocker)*

`AIRWAVE_SIRIUSXM_LEGAL_ACK=true` is required by the code and is a *counseled human
decision*, not a config value. `pipeline.ts:80-85` holds every satellite-radio adapter
until it is set, and `intake-contract.ts:359` tells the operator it must be set "after
legal review." The source policy is blunt (`source-policy.ts:480`): *"SiriusXM-class
satellite radio. Terms of service prohibit recording, redistribution, and automation."*

**The question the founder must answer with counsel, not with himself:** does subscribing
and tapping local loopback audio during personal listening fall inside the subscriber
agreement? Nobody in the repo can answer this. `docs/airwave-ledger.md:79-82` gives the
repo's own recommendation: *"Build on freely-published YouTube / podcast feeds first;
treat satellite radio as opt-in, not the foundation."*

### D2 — Counseled paraphrase-only + retention posture

`README.md:46-49` requires legal review, written confirmation of the paraphrase-only
posture, and confirmation in the *implementation* that segments are ephemeral and no
verbatim text is retained. `docs/airwave-ledger.md:83-85` restates it: confirm the
copyright posture with counsel **before enabling any capture**. This decision and D1 are
linked — a paraphrase-only posture is the legal argument that makes the capture tolerable.

### D3 — Consent and right of publicity

`docs/airwave-ledger.md:86-88`: a public scorecard tied to a **named real person**
requires sign-off, and every public row must carry a paraphrased claim *and* an objective
sourced outcome. The cockpit repeats it (`page.tsx:268`): *"No named-person public
scorecard until founder and counsel approve it."* This is the decision that determines
whether the Airwave Ledger is a research tool or a published scoreboard.

### D4 — Review workflow and staffing

The whole design rests on a human approving every claim before it moves
(`README.md:20-22`: *"Nothing is automated end-to-end"*). The founder must decide who
reviews, at what cadence, against which corroboration standard, and what the SLA is.
Real-time radio does not wait for a reviewer. There is no code answer, and no current
operator staffing assumption in the repo.

### D5 — Retention and deletion enforcement

`README.md:48` requires segment-ephemeral deletion to be *confirmed in the implementation*.
Today the only confirmation is a `console.log` string (`dry-run.ts:175-181`). This is
verifiable work, but it is a founder policy decision (how long are paraphrased claims
kept? is `SETTLED` forever?) that must be decided before it can be enforced.

### Unblockable-without-signature gate

The README's own checklist (`README.md:44-50`) — **all seven boxes are currently
unchecked**, and four of the seven are explicitly counseled/human-signed items:

- [ ] `AIRWAVE_ENABLED=true`
- [ ] `AIRWAVE_SIRIUSXM_LEGAL_ACK=true` — human-signed
- [ ] Legal review of personal subscription listening posture (counseled)
- [ ] Paraphrase-only posture confirmed in writing
- [ ] Segment ephemeral deletion confirmed in implementation
- [ ] No verbatim text retention confirmed in implementation
- [ ] Review queue gate implemented — **false today** (no store exists)

---

## 5. The gap between pitch and code, stated plainly

If the pitch is "we listen to sports radio and turn it into graded claims," the honest
status is:

- **Built:** the claim contract, the validation and redaction boundary, the source-policy
  gates, the capture gate, the schedule contract, the GSE/GSN output map, the read-only
  APIs, the cockpit, and 13 test suites. This is the hard, unglamorous, valuable part.
- **Not built:** any capture, any transcription, any extraction, any database table, any
  write endpoint, any working review queue, and any real show schedule.
- **Scaffold:** one 187-line printer that reads a sample schedule and reports which show
  *would* be active.

**The pitch describes a product. The code is a well-designed intake contract with no
intake.** The pitch's implied moat — proprietary airwave signal that competitors lack —
is currently a set of TypeScript types plus an env var.

**The most misleading artifact is the cockpit page.** It renders a full operator control
room with review-queue metrics, a status machine, and GSE/GSN readiness panels. Every
number in the claim queue is a hardcoded `0`. It looks operational. It is a mockup
with live styling.

**The single most useful thing the founder could do this week is not code.** It is D1 —
get the terms-of-service question in front of counsel. If the answer is no, the entire
CH87 lane is dead and the worker is the wrong build. If the answer is yes, the build is
well-specified and roughly two to three weeks of work. Both branches are cheap to learn
and expensive to discover late.

**Recommended sequencing:** take value on the free lanes first, exactly as
`docs/airwave-ledger.md:152-158` advises. Podcast RSS and public YouTube feeds carry no
legal ack, need no local audio routing, and would exercise the *existing, tested*
extraction and output-map code with real data. That converts the pipeline from
illustrative to proven, and it de-risks CH87 by proving everything except the tap.
