# Public Honesty Demo Script

What a stranger can actually see, today, on this codebase — and what they
cannot yet. Written against the branch chain `main` → #206 → #208 → #209.

The point of this document is that it distinguishes **shipped** from
**pending**. A demo script that quietly demos unmerged work is the same
category of dishonesty the product exists to reject, so every step below is
tagged with what it requires.

---

## What is on `main` right now

Merged: **#207** (`317c2764`).

- `/airwave` withholds a pundit hit rate below 25 decided calls. Type a
  pundit with two decided calls and no rate appears — the counts do, the
  percentage does not.
- The `pavIsotonic` weight test is correct, so `main` is green.

That is genuinely all. The honesty *engine* work is real but sits in open PRs.

---

## Demo — SHIPPED TODAY (needs nothing merged)

**1. Small samples do not become percentages.** (~20s)

Open `/airwave`. The pundit scorecards show decided-call counts. Any pundit
under 25 decided calls shows **no** hit rate — not a greyed-out one, not a
zero: the field is withheld entirely.

Say plainly: *the page is fictional demo pundits today, labelled as such.*
The floor exists so that when real pundits flow through the same component,
a one-of-one lucky call cannot render as "100%".

**2. The public integrity surface.** (~30s)

Open `/integrity`. Point at:
- SHADOW is the only reachable default; ENFORCE is lab-gated.
- The published keyring at `/.well-known/receipt-keys.json` — fetch it live.
- The NON-CLAIMS section, which is a list of things the page refuses to say.

**3. Verify a receipt without trusting us.** (~40s)

Follow `docs/devrel/DEMO_SCRIPT.md`: force a REFUSE, open the receipt, fetch
the public key, verify the signature. Then tamper with one character and
watch verification fail.

---

## Demo — REQUIRES #206 MERGED

Do **not** show these until #206 is on `main`. They do not exist otherwise.

- **Board No-Bet reasoning.** `/board` lists passes with a plain-language
  reason for everyone, and the auditable trail (reason code, confidence at
  refusal, model version, evidence count) for `canSeeNoBetDetail` holders.
  Withheld server-side — an unentitled response never contains it.
- **Honesty-first pricing.** `/pricing` leads Pro with No-Bet reasoning,
  multiprob intervals, Glass Ledger access, recompute. Volume is demoted.
- **The two-integrities cross-link** on `/integrity`, separating agent
  governance from claim substantiation.

## Requires #208 merged

- **`/stats/compare` tells you when it substituted a player.** Enter a
  nonsense ID like `p999`; the page names what it could not find and states
  that the comparison shown is not the one requested. Before this, it
  rendered a confident side-by-side of someone else with no notice.

## Requires #209 merged (and #206 beneath it)

- **The gate can be asked, from product code, and answers honestly.** The
  five reason codes are reachable: `FIRE`, `NO_BET_LCB`, `NO_BET_WIDTH`,
  `INSUFFICIENT_CALIBRATION`, `NOT_EVALUATED_MISSING_INPUTS`.

  The most likely honest answer today is `INSUFFICIENT_CALIBRATION`, because
  a stratum needs 100 settled picks before the gate will fire in it. **That
  is the demo, not a failure of it:** the product declining to bet because it
  cannot yet justify betting is the claim, working.

---

## What CANNOT be demoed, at any merge state

State these plainly rather than skipping them — a demo that goes quiet on
its gaps invites the audience to assume more than is true.

- **The Glass Ledger publishes nothing.** `PUBLISH_LEDGER` defaults off and
  the sealed-vault state is the honest one. There is no season record.
- **No live win rate, ROI, or CLV figure exists.** Every public performance
  number is gated behind `renderableMetricOrNull` /
  `assertDisplaySubstantiated`, and nothing currently clears those bars.
- **The gate does not yet drive `/board`'s published picks.** #209 adds the
  consumer and its contract; UI wiring is not built.
- **Nothing is persisted to the ledger.** `FiredDecision` has no production
  writer — see `PRODUCT_CASCADE_MAP.md`.
- **No certification.** Not SOC 2, ISO 27001, or EU AI Act certified. The
  compliance work is internal alignment mapping, and says so.

---

## The 90-second version

1. `/integrity` — here is what we govern, and here is the list of things we
   refuse to claim. (25s)
2. Fetch `/.well-known/receipt-keys.json`, verify a receipt, tamper with it,
   watch it fail. (40s)
3. `/airwave` — here is a rate we are withholding because the sample is too
   small to publish honestly. (25s)

Every one of those runs on `main` today.

## NON-CLAIMS

This document describes what is demonstrable, not what is proven. It asserts
no performance result. Steps tagged as requiring a merge are not demonstrable
until that merge happens, and presenting them as current would misrepresent
the product's state.
