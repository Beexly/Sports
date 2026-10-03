# pfr_advstats license verdict — 2026-07-16

**Verdict: YELLOW (internal modeling) / RED (public commercial display) — HOLD both.**
Registry: `pfr-advstats-via-nflverse` → `permission_required`.

Load-bearing facts (all fetched from primary sources):
- pfr_advstats is **Sportradar-licensed content displayed on PFR** and scraped by
  nflverse (SRL blog, 2019 advanced-stats post). SRL: "Most of our data comes from
  third parties... we can not provide the data available as a download."
- nflverse's repo-level CC-BY-4.0 is **self-declared**; its own loader docs carry an
  explicit license note ONLY for FTN data (CC-BY-SA, negotiated with the rights
  holder) — load_pfr_advstats.R has **zero license language**. The umbrella license
  cannot grant rights nflverse doesn't own.
- SRL Terms of Use §5(i) bans material-substitute data stores; **§5(j) explicitly
  bans using site statistics "for... supporting machine learning methods used to
  predict, classify, label, or score"** — no internal-use carve-out.
- Official paid paths exist: SRL bulk data ($5,000 minimum) or their named vendors
  (Sports Info Solutions, Sports Direct/Gracenote).
- Same-pattern caution: **nextgen_stats via nflverse** is equally third-party-sourced
  with no explicit grant — not a safe substitute.

**Approved route for trench/coverage signals: FTN charting via load_ftn_charting()
(2022+) — explicit CC-BY-SA-4.0 from the rights holder, attribution "FTN Data via
nflverse".** Charts pressure/blitz, man/zone coverage, play-action, target depth.
Internal modeling with attribution is clean now; PUBLIC display of derived metrics
inherits the same share-alike legal review already open for ffverse. Participation
data (personnel/box counts) is the same clean CC-BY-SA lineage.

Unlock: written confirmation from Sports Reference LLC covering redistribution AND
the §5(j) ML restriction — not from nflverse maintainers.
