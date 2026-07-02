# Grok Max-R&D Response — Triage (2026-07-02)

Grok answered the 54-directive prompt in compressed form. Overall it RESPECTED
the output contract far better than earlier dumps: it obeyed the NUMBERS LAW
(Division B returned an honest empty record — "no credible published pricing
found" — instead of inventing vendor prices), cited real cases and papers, and
used Reality-Ladder tags. That is real progress.

The failure mode this time is NOT fabricated numbers. It is **overconfident
[VERIFIED] tags on legal CONCLUSIONS** — the legal-domain version of the same
disease. On a site already taking money, mis-grading "defensible but unsettled"
as "verified settled law" is the single most dangerous output. Two claims were
checked against primary sources tonight and both were wrong or overstated:

## CORRECTIONS (verified against sources)

### A4 — click-to-cancel is VACATED, not "active". Grok is wrong.
Grok: "click-cancel active (easy button UI) [VERIFIED]." Reality: the Eighth
Circuit **VACATED** the FTC click-to-cancel / negative-option rule on **July 8,
2025** (procedural failure — no preliminary regulatory analysis). It is NOT in
effect. The FTC restarted rulemaking (ANPRM 2026-01-30, comments due
2026-04-13). Sources: Eighth Circuit vacatur widely reported (WilmerHale, Mayer
Brown, Gibson Dunn client alerts, July 2025).
WHAT STILL STANDS: ROSCA and state UDAP still require simple cancellation and
honest auto-renewal disclosure, and a new rule is coming. So the PRACTICE
(easy-cancel UX, clear renewal terms on the Stripe flow) remains correct and
wise — but the specific rule Grok cited as binding does not currently exist.
Verdict: [BUILDABLE] the good UX anyway; [CORRECTED] the legal status.

### A5 — nflverse is NOT a blanket "CC-BY, commercial OK". Overstated.
Grok: "nflverse CC-BY4.0 comm OK+attrib [VERIFIED]." Reality: nflverse CODE is
MIT; nflverse DATA is a mix. Community-compiled datasets are generally CC-BY,
but data sourced from the NFL/NGS "belong to their respective owners and are
governed by their terms of use," and the NFL claims broad copyright. So it is
per-dataset, not a blanket license. Verdict: [PROPOSED] — safe for the
community-aggregated stats WITH attribution; verify per-dataset before leaning
on anything NFL-owned. Concrete action: confirm the public /data page credits
nflverse (attribution is the one obligation that clearly survives).

## RECLASSIFIED (real cases, but the CONCLUSION is counsel-gated, not VERIFIED)

- **A1** (undocumented league APIs): the terms QUOTES may be accurate (MLB/NBA
  "personal, non-commercial" language is consistent with the NFL's broad
  claims), and Feist/hiQ/Van Buren genuinely limit COPYRIGHT and CFAA exposure.
  But a commercial site using an endpoint whose terms say "non-commercial" is a
  CONTRACT/ToS question those cases don't resolve. Grok's "Risk med, posture:
  attribute/public facts" is a reasonable posture, but it is [PROPOSED +
  counsel], not [VERIFIED]. The safe read: extract public FACTS from sources
  without assenting to restrictive terms; prefer sources with permissive terms.
- **A2** (publish the GSE Rating on player names/stats without a league
  license): C.B.C. v. MLBAM (8th Cir. 2007) and Daniels v. FanDuel (Ind. 2018)
  are REAL and genuinely supportive — but they concerned fantasy operators;
  extending them to a paid prediction/ratings product is a strong ARGUMENT, not
  a verified holding. This is the highest-stakes item in the whole set (it is
  the license GSE never buys). Verdict: [PROPOSED, strong] — get a sports/media
  lawyer to bless the specific posture in writing before betting the brand on
  "VERIFIED". Do not treat a compressed AI answer as legal clearance.

## KEPT (Grok graded these honestly)
- A3 [PROPOSED] (tout-registration sparse, UDAP dominant) — honest.
- Division B [PROPOSED/BLOCKED, empty record] — the NUMBERS LAW working exactly
  as intended; the real next step is vendor CONTACT (email OpticOdds/Unabated/
  SkillCorner for quotes), which no amount of web research substitutes for.
- Division C — real papers (Ramdas e-values/confidence sequences, Venn-Abers,
  White's Reality Check, Shin residual lit). [VERIFIED papers / BUILDABLE].
  These are genuinely the bridge from our engine to the frontier; worth pulling
  the actual DOIs next.
- Division D — Pinnacle/Circa origination is commonly-cited industry lore
  ([PROPOSED]); "tout court records are a rich churn source" is a genuinely
  clever, honest research lead.
- Division E — competitor transparency is weak (nobody has cryptographic
  receipts), transparency-sells trust literature is real, Whop/Discord B2B2C
  "verified by GSE receipts" is a legitimately novel opening. [BUILDABLE].

## The one meta-lesson
Grok obeyed "don't fabricate numbers" but not "don't fabricate CERTAINTY."
For the next legal-heavy prompt, add to the contract: "Legal CONCLUSIONS about
GSE's specific conduct are [PROPOSED, counsel-required] by default; only the
existence/holding of a cited case may be [VERIFIED]." That closes the last gap.

## Buildable-now from this (no lawyer needed)
1. Confirm /data publicly credits nflverse (CC-BY attribution).
2. Keep the easy-cancel + clear-renewal UX on Stripe (ROSCA/UDAP, and the
   coming rule) — verify the dashboard cancel path exists and is one step.
3. Pull the real DOIs for the Division C methods (e-values, Venn-Abers) into
   the engine roadmap — those are the honest accuracy upgrades.
Counsel-gated (worth the spend): A2 ratings-without-license posture; A1/A3
per-state picks-selling + endpoint-ToS memo.
