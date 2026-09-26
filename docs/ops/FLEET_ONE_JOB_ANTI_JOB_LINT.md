# Fleet one-job / anti-job lint (1-page)

**Owner:** GSE (product) · **Orchestra:** GSE Main · **Consumers:** Design & Intel, Projects Manager, seating cards  
**Locked:** 2026-09-23 (GSE Main A) · **Source pattern:** ARE #81 intel only — do not productize prompts/templates

## Rule

Every fleet seat and room card must state **one job**, **anti-jobs**, and a **never-list**. Fuzzy vibe seats fail this lint.

## Lint checklist (pass / fail)

| # | Check | Pass when |
|---|--------|-----------|
| 1 | One job | Single sentence: owns X outcome for Y surface. No "and also…" |
| 2 | Anti-jobs | Named sibling roles that own the out-of-scope work (by role name) |
| 3 | Never-list | Hard prohibitions (gates, secrets, Garrett-facing, tip-sheet copy, etc.) |
| 4 | Escalation | Blockers → GSE Main only; Garrett not in the loop |
| 5 | Quiet default | Room posts only when tasked, CLEAR/HOLD, or real blocker |
| 6 | Fewer seats | Prefer fewer high-signal seats over spawning duplicates for one workstream |
| 7 | CoS routing | Orchestrator (GSE Main) fronts; specialists stay in-lane |

## Room map (current)

| Room | Product job (one line) |
|------|------------------------|
| Galaxy Sports Edge | War-room board for decision-OS workstreams |
| GSE Engineering | Eng ships, plugins, overnight cheap lanes, red-team |
| GSE Design & Intel | Figma UI diffs + passive-public OSINT; product framing only when asked |
| GSE Leads | Cross-org routing only |
| GSE Support | Founder/ops support lane |
| GSE Meta Ops | Free-lane cost, Beexly hygiene, handoff packets, bot design |
| Signal Origin Ops | Origin money loop (Master owns) |

## Fail examples

- Seat that "helps with product and eng and docs"
- Agent that messages Garrett directly
- Room chatter without task / CLEAR / HOLD / blocker
- Tip-sheet or +EV framing on any GSE surface

## Pass examples

- GSE: factor-model product twin; WP/C lanes; trust/receipts/LIVE_BOARD product side — not eng scoring ownership, not OSINT, not Figma diffs
- Passive Intel Desk: passive-public teardowns only — never staging/gated probe
- Figma Ship Bridge: design-specified UI slice only — no invented claims/pricing/access

## Maintenance

Projects Manager applies this lint when adding Notion tasks or seating. Design & Intel applies it when standing up design/intel seats. GSE Main owns exceptions.
