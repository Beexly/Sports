# Next Session Prompt — Force Synthesis, Not Cataloging

**Purpose**: Paste this into the research session once its corpus map (all 12 domains)
is complete. It pushes the session from *mapping* the ~572-file R&D corpus into
*synthesizing* it — making leverage calls, resolving contradictions, and producing
first-of-kind moves instead of an even-weighted index.

**Why this exists**: The prior `docs/HANDOFF.md` covered only ~10 of ~2,880 markdown
files and mis-ranked greenfield fantasy features as TIER 1 when the corpus points at
the **CLV/calibration proof spine** as the load-bearing constraint (pricing is
proof-gated and cannot leave FOUNDING until PROVEN/ESTABLISHED milestones hit). A
domain map corrects the coverage gap but risks stopping at a catalog. This prompt
forces the harder half.

---

## The Prompt

```
The domain map is done. That was the easy half — cataloging. Now do the half that
actually matters, and hold yourself to a higher bar than "I summarized everything."

A map is not a strategy. I don't want 12 even-weighted domain summaries. I want
judgment. Produce docs/strategy/MASTER_SYNTHESIS.md with these sections, in order:

1. THE ONE THING. Across all 572 files, name the single load-bearing constraint —
   the thing that, if unbuilt, makes everything else cosmetic. Defend it in writing.
   I believe the corpus points at the CLV/calibration proof spine (pricing is
   proof-gated: it cannot leave FOUNDING until PROVEN ≥100 settled + published
   calibration, ESTABLISHED ≥500 + CLV ≥52.4%). If you disagree, argue me out of it
   with evidence. If you agree, prove it with the dependency chain.

2. KILL THE PREVIOUS HANDOFF'S MISTAKE. docs/HANDOFF.md ranked greenfield fantasy
   features (Narrative Velocity, Playoff SOS, Dynasty Trade AI) as TIER 1. Stress-test
   that against #1. If those features don't move the pricing gate or the moat, say so
   plainly and re-rank. Don't be polite about it.

3. RESOLVE, DON'T LIST. For every cross-document contradiction you found (the 3
   conflicting "live" price claims, the brand-name sprawl GSE/GSN/StatKing/Sports OS,
   the brand.ts vs design-system color-token fork, the casino-green violation, the
   cleartext API keys), make a DECISION: what's canonical, what gets deleted, what
   gets rotated — with the one-line rationale and the exact file to change. A flag
   without a decision is noise.

4. THE CREATIVE LEAP. This is the part a map can't do. Find 3–5 first-of-kind moves
   that emerge only when you combine signals ACROSS domains — things no single doc
   proposes and no competitor does. Examples of the *kind* of cross-wiring I mean
   (don't just reuse these): proof-spine × public-trust-layer = calibration as the
   marketing engine; manager-genome × process-grading = decision quality scored
   independent of outcome; weak-signal-engine × market-gravity × CLV = an edge
   detector that grades itself. For each: what it is, why it's defensible, what it
   borrows from the outside-domain-transfer research, and the smallest version that
   ships.

5. THE SEQUENCE. A dependency-ordered build plan, not a wish list. For each step:
   what it unblocks, which pricing milestone it moves toward, the proof it generates,
   and what I should explicitly NOT build yet. Mark every owner-only blocker
   (prod DB/Redis, Stripe live prices, privacy sign-offs, key rotation) separately —
   I need to know what's on me vs. on you.

Rules that don't bend: no fake data, proof before pricing, rights-gated sources,
autonomy stays draft-only (externalActions: NONE). If any recommendation violates
those, kill it yourself before showing me.

Bias: depth over breadth, decisions over descriptions, leverage over completeness.
If you catch yourself writing "this domain contains..." stop — tell me what to DO
about it and why it beats the alternative. Cite specific files. Make the call.
```

---

## How to judge the output

The session succeeded only if `MASTER_SYNTHESIS.md` contains:

- [ ] A **single** named load-bearing constraint with a defended dependency chain
      (not a tie, not a top-5).
- [ ] An explicit **re-ranking** that either kills or justifies the prior handoff's
      greenfield TIER 1.
- [ ] A **decision** (canonical / delete / rotate) for every contradiction — each with
      the exact file to change.
- [ ] **3–5 cross-domain first-of-kind moves**, each with a smallest-shippable version.
- [ ] A **dependency-ordered** sequence that maps each step to a pricing milestone and
      separates owner-only blockers from build work.

If it gives you another catalog, send it back to section 1.
