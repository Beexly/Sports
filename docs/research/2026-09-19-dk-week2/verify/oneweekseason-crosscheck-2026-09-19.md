# Verification Ledger — OneWeekSeason cross-check, 2026-09-19 ~11:15 AM CT

**New source:** OneWeekSeason.com DK Week 2 main-slate salaries + projections + projected ownership, via Minis phone extract (cleaned table: `raw/salaries-cleaned-2026-09-19.md`; raw ingest: `raw/oneweekseason-salaries-minis-extract-2026-09-19.md`).
**Scope:** 13-game MAIN slate only. Ownership timestamped 6:00 AM PDT Sat 9/19. Partial player list (~40 skaters + 16 DSTs).

## CONFIRMED (third source agreeing with our two existing second-party sources)

All salaries below now have THREE independent second-party confirmations (The Huddle 9/19 + DK Network 9/15 or 9/17 + OneWeekSeason 9/19). DK endpoint still Akamai-blocked — none are endpoint-verified.

- **QBs (19/19 match qb-salaries.csv):** Lamar $7,300; Caleb $6,800; Hurts $6,700; Burrow $6,600; Dak $6,400; Daniels $6,300; Purdy $6,200; Herbert $6,000; Lawrence $5,800; Nix $5,700; Mayfield $5,600; Stroud $5,500; Young $5,400; Shough $5,300; Lock $4,900; Geno $4,800; Wentz $4,600; Watson $4,500; Cousins $5,000.
- **RBs (7/7 match rb-salaries-projections.csv):** Bijan $8,200; CMC $8,000; Henry $7,200; Barkley $7,000; Jeanty $6,800; Javonte $6,400; Breece $6,200.
- **WRs (9/10 match wr-salaries-projections.csv):** Jefferson $7,800; Chase $7,600; Lamb $7,300; Pickens $6,300; G. Wilson $6,000; McLaurin $5,200; Doubs $5,000; Evans (SF) $6,600; Hutchinson $3,500.
- **TEs (3/3 match te-salaries.csv):** Andrews $4,400; Ferguson $3,800; Mayer $3,600.
- **DSTs matching fantasyalarm 9/18:** SF $3,800; PHI $3,700; TB $3,600; JAX $2,400; MIN $2,600.

## NEWLY PROVIDED (first second-party salary data point)

Ten DST salaries with no prior usable source (all previously UNVERIFIED): NE $3,100; HOU $3,000; DAL $2,900; ATL $2,900; PIT $2,800; CIN $2,700 (team ambiguity — see conflicts); ARI $2,500; WAS $2,500; NYJ $2,400; CLE $2,200. **LAC $3,200** replaces the stale 2025 $3,400 figure that was marked do-not-use.

**Ownership (first numeric ownership of the week — fills the biggest gap):** full table in `raw/salaries-cleaned-2026-09-19.md`. Headlines: Bijan 40.10%; Javonte 22.16%; Henry 22.19%; CMC 21.93%; Lamb 20.32%; Pickens 17.85%; Chase 17.17%; Andrews 17.13%; Mayer 14.07%; Dak 12.01% (highest QB); Hurts 2.90%; Burrow 2.22%; JAX DST 2.68%; MIN DST 1.53%; TB DST 9.65% (highest DST).

## CONTRADICTED / FLAGGED

1. **Jerry Jeudy — hard conflict, UNRESOLVED.** OneWeekSeason: DEN vs JAX, $5,100. Huddle X-sweep (9/19): $3,900 @ TB (on CLE). Team and salary both conflict. Neither number usable until lobby-checked.
2. **Brock Purdy rows are stale.** $6,200 salary confirmed, but 23.06 proj / 9.87% ownership on a player who is OUT (toe/shoulder, 2-5 weeks per Rapoport via Huddle) = model output that predates or ignores Friday news. Casts mild doubt on how fresh the whole ownership column is vs Friday's final reports.
3. **CIN DST $2,700 vs fantasyalarm's CAR $2,700 (9/18).** Possible team misattribution in one source. Lobby-check both before rostering.
4. **Projection model disagreements vs our consensus (largest):** Jeanty 12.67 vs DKNet 22.5 (−9.8); Henry 18.07 vs 24.0 (−5.9); Lamb 21.67 vs 15.8 (+5.9); Dak 25.04 vs 20.9 (+4.1); Lamar 17.44 vs 20.2/21.2 (−2.8/−3.8). OWS runs hot on WAS@DAL, cold on Lamar/Henry/Jeanty. Drew Lock 19.14 has no consensus comp — treat skeptically (backup-relief sample).
5. **Extract rows dropped as corrupt/off-slate:** Derek Carr (no corroboration, nonsensical matchup); Travis Kelce (SNF contamination, wrong opponent); Sean McAllister (unknown player); Jalen Nailor-on-LV (wrong team). "Romelius Doubs" repaired to Romeo Doubs (matches DK Network).

## Still missing after this source

- Endpoint-verified salaries (DK API still blocked).
- Full-pool ownership (extract covers ~40 skaters; no Maye, no JSN, no sub-$4K punts, no Schultz/Bowers-line TEs beyond the three listed).
- DEN, SEA, GB, CHI, LV, NO, TEN, MIA, CAR, BAL (BAL $3,300 fantasyalarm-only) DST salaries still single-source or unverified.
- Any ownership for Garrett's actual 15-game contest (SNF/MNF players have no ownership data anywhere yet).
- Jeudy salary/team resolution; Purdy→Mac Jones salary/ownership refresh.
