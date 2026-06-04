# The Airwave Ledger — Broadcast Accountability

> Status: **built, founder-gated, illustrative-until-founded.** The product
> surface, scoring engine, redaction boundary, and operator review queue are
> live in the app on demo data. Live capture of named broadcasts and any public
> scorecard tied to a real person are **off by default** and held behind the
> legal checklist below.

## What it is

Sports television and radio run on confidence with no receipt. The Airwave
Ledger gives the take a receipt: it turns what a pundit says on air into a
**paraphrased, timestamped, graded claim**, then keeps a running per-pundit
**accountability index**. It is the broadcast-facing sibling of the engine's own
Decision Autopsy — the same glass-box standard, pointed outward.

This is the realization of the `novus` "grading spine" applied to a new input
stream:

- **One engine, two outputs** — every settled claim yields (a) an internal
  signal and (b) a public, redacted ledger row. (`novus` gsn-ops grading spine.)
- **Refusal is a feature** — a take too vague to check is recorded *as*
  unfalsifiable and scores nothing; a pundit who only emits hedges earns a low
  index even though they are never technically wrong. (`novus` "refusal as a
  feature.")
- **Untrusted input is data, not instructions** — captured audio is recorded and
  graded; it is never acted on. (`novus` comms-triage hard rule.)
- **Two-tier sourcing** — public rows carry a paraphrased claim plus an objective
  outcome; the internal clip pointer never crosses the redaction boundary.
  (GSE's cited-vs-internal rule.)
- **Cost-aware routing** — extraction runs cheap models on the firehose and only
  escalates flagged segments. (`novus` cost-governor.)

## Pipeline

```
capture (gated)  ->  transcribe  ->  extract  ->  grade  ->  review  ->  publish (gated)
   worker            worker          worker       lib       cockpit       public
```

1. **Capture** — schedule-driven, not always-on. A show-schedule map fires
   capture only during relevant programming inside the **05:00–23:00 CT** window.
   Rolling ~10-minute segments to a temp store, **deleted after extraction**. No
   audio archive is ever retained — so there is nothing to redistribute.
2. **Transcribe** — Whisper-class transcription + speaker diarization to attribute
   lines to a pundit. Transcript is reduced to claims, then discarded.
3. **Extract** — a cost-routed model pass turns prose into structured
   `PunditClaim` rows. Assertions are **paraphrased, never verbatim**.
4. **Grade** — on settlement, each claim is graded `HIT / MISS / PUSH /
   UNFALSIFIABLE` and rolled into a `PunditScorecard`.
5. **Review** — operators approve claims in `/cockpit/airwave` before anything is
   graded in public. Draft-only: no auto-publish, no auto-send.
6. **Publish** — the redacted ledger renders at `/airwave`.

Stages 1–3 are out-of-process worker concerns (not in the web bundle). What ships
in the app today is the **gate, the scoring, the redaction boundary, the operator
review surface, and the public ledger** — all on illustrative data.

## The accountability index

A stake-weighted credit ratio over **settled** claims (pending excluded):

- Each checkable call posts *stake* scaled by how emphatic the language was
  (`EMPHATIC 1.5 · LEAN 1.0 · HEDGED 0.6`). A `HIT` earns full credit; a `MISS`
  earns none; a `PUSH` earns half.
- An `UNFALSIFIABLE` take posts a small stake (`0.5`) it can never recover — so
  trading in un-checkable noise trends the index toward zero by design.
- `index = round(100 × credit / stake)`; `0` when nothing checkable was staked.

`falsifiableRate` and `hitRate` are reported alongside so a high score from one
emphatic call reads honestly. All scoring is pure and unit-tested
(`lib/airwave/__tests__/airwave.test.ts`).

## The legal gate — founder + counsel sign-off required

These are **real-world decisions a human signs**, encoded as gates, not flags a
script flips for itself:

- [ ] **Source terms** — capturing satellite radio (SiriusXM-class) or a
      broadcast-TV simulcast against account terms is a legal call. Build on
      freely-published YouTube / podcast feeds first; treat satellite radio as
      opt-in, not the foundation.
- [ ] **Copyright posture** — segments are ephemeral and deleted after
      extraction; only derived, paraphrased claims persist. Confirm this posture
      with counsel before enabling any capture.
- [ ] **Right of publicity / defamation** — a public scorecard tied to a *named
      real person* needs sign-off. Every public row must carry a paraphrased
      claim **and** an objective, sourced outcome — never editorializing.
- [ ] **Paraphrase-only** — verbatim quotes never leave the private store. The
      redaction boundary (`lib/airwave/redact.ts`) enforces clip-pointer
      stripping at the type level.

Until every box is checked, the only data any public surface renders is the
clearly-illustrative demo ledger of **fictional personas**.

## Enabling capture (when the gate opens)

Capture is inert unless these are set (defaults are fully off):

```
AIRWAVE_ENABLED=true              # master switch for the capture pipeline
AIRWAVE_SIRIUSXM_LEGAL_ACK=true   # human legal acknowledgement for satellite radio
```

`lib/airwave/pipeline.ts#captureGate` holds every source when `AIRWAVE_ENABLED`
is unset, and additionally holds satellite-radio / broadcast-TV sources until the
legal acknowledgement is set. `planCapture` is a dry-run that reports what *would*
run and why it is held — it never captures.

## File map

| Path | Role |
| --- | --- |
| `apps/web/lib/airwave/types.ts` | Domain types + the redaction-safe public DTO |
| `apps/web/lib/airwave/grade.ts` | Accountability scoring (pure, tested) |
| `apps/web/lib/airwave/redact.ts` | Internal → public boundary (strips clip refs) |
| `apps/web/lib/airwave/pipeline.ts` | Inert, gated capture contracts |
| `apps/web/lib/airwave/demo-ledger.ts` | Illustrative fictional personas + claims |
| `apps/web/components/airwave/pundit-ledger.tsx` | Interactive public board |
| `apps/web/app/airwave/page.tsx` | Public surface |
| `apps/web/app/cockpit/airwave/page.tsx` | Operator review queue (admin-gated) |

## Recommended path to live

Build value on free feeds first: point the YouTube / podcast adapters at a few
shows, run the worker, and let real graded rows accumulate in the cockpit review
queue. That proves the product live while the satellite-radio capture and the
named-scorecard publishing get their legal sign-off — the two genuinely gated
parts.
