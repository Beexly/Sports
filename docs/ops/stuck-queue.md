# Stuck Queue

> Current escalations waiting on the product owner. Newest at top. When
> an item resolves, remove it (and log the resolution in
> `decision-log.md` if the resolution sets policy).
>
> The owner checks this daily, or when pinged. Master plan Part 1.5
> thresholds: 24h → flag urgent; 48h → ping owner via separate channel.

## Format

```
### YYYY-MM-DD HH:MM — <surface or task>

**Blocked on:** the specific question / decision / credential / access
**Tried:** what was attempted, chronologically
**Needs:** what the owner needs to do to unblock
**Time blocked:** elapsed since first flagged
**Depends downstream:** other work waiting on this
**Filed by:** Claude / Codex
```

---

## Open escalations

### 2026-05-23 — Codex Pass 12 disposition — R&D-extract or merge?

**Blocked on:** owner strategic call on whether Codex's overnight work
in the OneDrive clone gets merged into the primary tree or treated as
R&D / decision contracts.
**Tried:** reviewed Codex Pass 12 artifacts (CODEX_RECONCILIATION /
CODEX_DECISIONS_RATIFY / CODEX_DEEP_AUDIT / OWNER_PUNCH_LIST referenced
by owner Pass 12 summary). Claude's recommendation, logged 2026-05-23:
**treat as R&D, don't merge.** Reasons (1) source tree is structurally
compromised — corrupted pack-index, 422 insertions / 3,647 deletions on
a dirty tree, confirmed file truncation in `emails.ts` (~150 lines
missing) and `stripe-webhooks.ts` (~90 lines missing). (2) framework
boundary — OneDrive is Next.js 16 minimal scaffold; primary is
Next.js 14 with full Prisma + BullMQ + ingestion pipeline. (3) the
contracts are the asset — extractable as `docs/product/*` specs at
zero integration risk; primary tree implements against existing
schema. Trade-off: lose code investment, keep design clarity, no
broken-tree merge.
**Needs:** owner ratification of R&D-extract path OR explicit merge
directive. If R&D: stub specs are scaffolded
(`docs/product/email-lifecycle-spec.md`, `referral-attribution-spec.md`,
`stripe-webhook-decisioning-spec.md`) and ready to be filled from
Codex's actual TS contracts when shared.
**Time blocked:** opened 2026-05-23.
**Depends downstream:** P1-9 email vendor choice (Postmark vs Resend);
referral system buildout; lifecycle email implementation; the 12
DEC-NEXT decisions Codex created that need ratification (12
R-numbered items in CODEX_DECISIONS_RATIFY).
**Filed by:** Claude

### 2026-05-23 — Email vendor choice: Postmark vs Resend (master plan P1-9)

**Blocked on:** owner ratification.
**Tried:** Codex Pass 12 unilaterally picked Postmark in `.env.example`
of the OneDrive clone. Pass 7 had recommended Resend. Master plan Part
6 doesn't lock either; the decision is open per "decisions still open"
in the master plan. This is a commercial/legal decision (vendor
contracts, terms, data-residency posture) that exceeds Claude's
delegated authority per Part 1.5 STUCK criteria #4.
**Needs:** one-line ratification — Resend (pass 7 recommendation,
developer-friendly, React Email native) OR Postmark (Codex Pass 12
unilateral, mature transactional reputation, stricter compliance
posture). Either way, log the locked decision in
`docs/ops/decision-log.md` so future Claude/Codex sessions don't
re-ask.
**Time blocked:** opened 2026-05-23.
**Depends downstream:** lifecycle email implementation (Phase 3+);
referral confirmation emails; any transactional email beyond what
NextAuth handles today.
**Filed by:** Claude

### 2026-05-23 — 12 Codex Pass 12 DEC-NEXT decisions awaiting ratification

**Blocked on:** owner ratification of 12 R-numbered decisions Codex
proposed in the OneDrive clone.
**Tried:** Claude has not seen the 12 decisions individually; they
are referenced in CODEX_DECISIONS_RATIFY_2026-05-23.md at the AI
Sports primary clone root (R-1 through R-12 + R-21). Per owner Pass
12 note, 5 collisions also need renumbering: DEC-NEXT-012, -020,
-022, -024, -062.
**Needs:** owner runs through R-1..R-12 + R-21 (estimated ~45 min
focused pass per owner). Each ratification or reversal lands as an
entry in `docs/ops/decision-log.md`. Renumber the 5 collision IDs.
After that: Codex's contracts are clean to extract as specs (R&D
path) or port (merge path, not recommended).
**Time blocked:** opened 2026-05-23.
**Depends downstream:** R&D-extract or merge path can't proceed
honestly without these decisions ratified. Some decisions may also
unblock Phase 3-4 implementation in this primary tree.
**Filed by:** Claude

---

## Recently resolved (kept for 30 days, then prune)

*None yet.*
