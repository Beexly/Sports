# LOOP — prepare the week like a coach. Books are the last thing checked.

Paste this as the recurring prompt. One layer per wakeup. Written as a coaching
week, because the failure so far is a factor pipeline that reads like a
spreadsheet instead of a staff preparing for a game.

---

## The week

A staff does not start with a line. Monday morning the film is fresh and the first
question is **who touched the ball, where, and what did the staff change** — because
that rewrites what this team is this week. Then the training room. Then the matchup
those two realities actually create. Then the spot. Then the field. The book gets
walked down to the window on Friday.

MONDAY — L0 USAGE: who got the ball, in what situation, and what changed
TUESDAY — L1 HEALTH: who is out, by name, and what it forces
WEDNESDAY — L2 MATCHUPS: player v player, coach v coach, scheme v scheme, using
              only the players health says are available
THURSDAY — L3 SITUATIONS: stakes, division familiarity, slot, rest, history
              L4 VENUE / WEATHER / REFS: surface, roof, wind, temperature, crew
              L5 EVERYTHING ELSE: tracking, corpus, narrative, the rest of it
FRIDAY — L6 ADJUDICATION: where the layers disagree, say who wins and why
         L7 THE TRAIL: publish the read as a coaching note
SATURDAY — L8 PRICE: PLAY / ALT / PASS-on-price over the play already chosen

Nothing in L0–L7 may depend on a price. If a layer can only be read once a line
exists, it is being built wrong.

## Per wakeup

1. Re-read `docs/engine/SIGNAL-CENSUS.md`. Take the lowest layer not fully
   REACHES THE DECISION. Never open L(n+1) while L(n) is open.
2. Establish truth before touching code: does the producer exist (file:line), does
   anything read it (quote the call site), what is its disposition now. A file on
   the remote with zero call sites is DISCONNECTED, not built.
3. Wire it until the published reasoning string **contains** the layer.
4. Prove it or it did not happen:
   - quote the rendered trail on a **real upcoming game** — named players, the
     usage shift or the outage, the consequence
   - mutate one real input and show reasoning AND play move
   - a test that fails before, passes after
5. Update the census row, commit, push, then re-read the remote file and quote its
   byte size.

## Write like a coach, not a factor list

A note is specific and consequential: **who**, **what it costs**, **what we do about
it**, **how they answer**. "Line moved +2" is not a reason. "Their nickel is out, so
their third receiver is a practice-squad call-up — we attack the slot on early
downs" is. Name the man. Say the counter. The trail must be readable by someone who
never sees the numbers.

If a trail leads with `Bookmaker Consensus` or `Pricing Edge` while any of L0–L6
exists, it is wrong however well it reads.

## Hard rules

- Missing data is a **named gap**, never a zero. `0` means measured zero.
- A file existing is not wiring. **Zero call sites = disconnected.**
- No placeholders. `scoring.ts` under 1,000 bytes is a bug report.
- Conflicts get adjudicated with a stated winner; two facts side by side is not a
  decision.
- Any track UNCHECKED at L3+ invalidates the analysis; only L5 may publish.
- The Steelers–Browns pressure funnel must die at the adversary — keep that test
  green in every wakeup that touches pressure.
- Never fabricate. A wall gets logged with the workaround tried.

## State at the last wakeup (verified, not assumed)

- `scoring.ts` real at 84,140 bytes; placeholders gone.
- `usage-factors.ts` (2,296) and `availability-factors.ts` (2,659) are on the
  remote and referenced **zero** times in `scoring.ts` → L0 and L1 are DISCONNECTED.
- Census: zero families reach the decision. Nothing has ever reached the trail.

## Next, in order

1. Wire both emitters into the scoring context so a generated trail on a real
   Week 8 game carries the usage shift and the named outage, and quote it.
2. Flip census L0 and L1 to REACHES THE TRAIL on that quote, then to DECISION once
   the play moves under mutation.
3. Advance L2 — scheme collision, player v player, coach v coach, with names — so
   the note reads like preparation instead of a factor list.

## Report shape every wakeup

`layer · families touched · disposition before → after · proof quotes · remote size ·
what blocked · next family`

## Stop condition

L0–L7 all reach the decision with proof, L8 is price-only over a chosen play, and
three real upcoming games carry trails a coach could hand to a player. Then
LOOP_COMPLETE.
