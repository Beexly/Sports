# LOOP — every reasoning layer goes in, books last

Paste this as the recurring prompt. It is written to be run unattended, one layer
per wakeup, and to fail loudly rather than declare victory.

---

## The clock — work in this order, always

L0 USAGE · L1 HEALTH · L2 MATCHUPS · L3 SITUATIONS · L4 VENUE/WEATHER/REFS ·
L5 TRACKING/CORPUS · L6 CONFLICT ADJUDICATION · L7 THE TRAIL · L8 PRICE (books LAST)

The books are L8. Nothing in L0–L7 may depend on a line, a price, or a market
number. If a layer's output can only be interpreted once a price exists, that layer
is being built wrong.

## Per wakeup, exactly one layer advances

1. Re-read the census (`docs/engine/SIGNAL-CENSUS.md`). Pick the lowest-numbered
   layer whose families are not all **REACHES THE DECISION**. If L(n) is complete,
   move to L(n+1) and say so — never invent work in a later layer while an earlier
   one is open.
2. For each family in that layer, establish the truth first:
   - does the producer exist? file:line
   - does anything read it? grep, quote the call site
   - record the CURRENT disposition before touching code
3. Wire it so the output **reaches the published reasoning string**. Trail first is
   acceptable; decision required to close the row.
4. Prove it, or it did not happen:
   - render a real pick and **quote the reasoning text** containing the family's
     named value and its source/freshness
   - mutate one real input (one player ruled out, one usage shift) and show the
     reasoning AND the play moving
   - a test that fails before the change and passes after
5. Update the census row to REACHES THE DECISION (or REACHES ONLY THE TRAIL with
   the reason and the next step). Commit, push, then **re-read the remote file**
   and quote its byte size. A commit title is not proof.

## Hard rules

- **Missing data is a named gap, never a zero.** `0` means measured zero. An
  unconfigured provider prints "no read" with the reason.
- **No placeholders.** A file under 1,000 bytes where scoring.ts should be is a bug
  report, not a commit.
- **Never restate the market as the reason.** `Bookmaker Consensus` and
  `Pricing Edge` are L8. If a rendered trail leads with them while L0–L6 exist, the
  trail is wrong no matter how good it reads.
- **Adjudicate conflicts explicitly.** When families disagree, the reasoning says
  which won and why. Two facts listed side by side is not a decision.
- **Fifth-track discipline stands:** any track UNCHECKED at L3+ invalidates the
  analysis; only L5 may publish.
- **Steelers–Browns pressure funnel is the regression case:** it must die at the
  adversary. Keep that test green in every wakeup that touches pressure.
- **Never fabricate.** If a source is walled, log the wall and the workaround tried.

## Definition of done, per layer

A layer closes only when every family in it is REACHES THE DECISION, proven by a
quoted artifact and a mutation, with the census row and the remote sha to match.
"Built" means a reader can see it in a published trail. Storage is not wiring.

## Report shape every wakeup

`layer · families touched · disposition before → after · proof quotes · remote size ·
what blocked · next family`

## Stop condition

L0–L7 all REACHES THE DECISION with proof for each, L8 demoted to PLAY / ALT /
PASS-on-price over an already-chosen play, and three real upcoming games carrying
full trails whose reasons are not market entries. Then say LOOP_COMPLETE.
