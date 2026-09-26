# 8. Learnings

# NFL Analytics Knowledge Base — Builder Learnings

Digest for the coding-agent knowledge base. Everything below is drawn from the
2026-09-17 to 2026-09-24 X analytics sweep catalog (`report.md`), the
Sports repo `AGENTS.md` benchmark sections, and the 2026-09-21 arXiv tracker
integrity audit. Factual, terse, actionable. No verdicts on builds.

---

## 1. Verification Standards

1.1 **Trust no claims, even your own.** Counts must be file-verifiable: auditable
against actual files on disk. Never claim a completion ("done", "750/750",
"phase closed") until the repository trackers reconcile — every tracker row
must point at an existing file, every file's verdict must match its row.

1.2 **Counts come from parsing, not prose.** When someone claims a count,
re-derive it: parse all source files, count the parseable records, and report
the gaps (e.g., 755 of 772 ledger files had a parseable verdict; 17 were
notes/index files). Handle every verdict format found in the wild before
reconciling (`**Verdict:** X`, `**X.**`, bare `X` after `## Verdict`, etc.).

1.3 **Rebuild from source when the tracker drifted.** If a commit claimed a
tracker state that was never actually written (e.g., the wave-2 commit claimed
"tracker 485 to 605" but the file still had 485 lines), do not trust the claim.
Rebuild the tracker from the underlying reader reports and ledger files, then
reconcile. Report the discrepancy, do not silently adopt the claimed number.

1.4 **Cross-check the verdict in both directions.** The 2026-09-21 integrity
audit caught a tracker row recorded ADAPT whose underlying ledger was a REJECT
(and whose paper ID did not even match the row's ID). Every tracker entry gets:
file exists, ID matches, verdict matches. Zero mismatches is the bar.

1.5 **Version-normalize identifiers before deduping.** arXiv IDs were
version-normalized (v1/v2 suffixes) before dedup comparison, because the same
paper under a different revision is one paper, not two.

1.6 **Verify against at least two independent sources where it matters.**
Benchmark entries that matter for correctness get checked against a second
independent cut of the same data (a second vendor, a second day's scrape, the
underlying raw feed) before they are treated as settled.

1.7 **A claim that a metric is "new" is verified by inventory lookup, not by
the author's framing.** Authors announce first; the inventory decides. If the
same metric was previously charted under a different name or by another
account, it is an existing item, not a new one.

1.8 **Snapshot states go stale; re-verify against the live repo.** Timestamps
and statuses recorded in docs (PR numbers, CI gates, board gates) are
snapshots. Any build decision must re-check the current live state, never rely
on a recorded snapshot from days earlier.

---

## 2. Inventory Standards (Neutral Inventory)

2.1 **Every inventory entry carries the same fields:**
metric name; definition as given (quote or clearly paraphrase, attribute it);
formula/math where captured; condensed columns with representative sample
values; the source account and date; the data source **explicitly stated**
or marked "not stated"; the public endpoint where documented; caveats as
attributed facts.

2.2 **No verdicts, no build decisions, no guessed sources.** Never invent a
formula, never fill in an unstated data source, never add an unattributed
judgment. Where a definition or weighting was absent in the source, state
explicitly: "no definition given anywhere observed."

2.3 **Condensed columns, not full dumps.** Full 32-team tables are condensed
to representative rows (leaders, trailers, and any structurally interesting
values). The complete tables live in the per-day CSV files under the dated
research directories; the inventory entry names that file path.

2.4 **Record denominators, qualifiers, and filters as first-class fields.**
Min-snaps filters, min-attempt qualifiers, kneel/spike exclusions, "relevant
play" definitions (a QB dropback or QB run), and sample windows (Week 1 vs
Weeks 1-2) are not footnotes — they determine what the number means. Capture
the author's stated qualifiers verbatim.

2.5 **Flag author self-corrections and contradictions.** When an author
corrects a value (LAC 84.3% motion corrected from an earlier post's SF 78.1%),
or a chart contradicts its own text (Allen CPOE -5.7 in green cells vs +5.7
on the recap slide; "without taking a single sack" vs 4.2% sack in the chart),
record the conflict as an attributed fact. Do not pick a winner.

2.6 **Mark approximate transcriptions.** Values read off unlabeled scatter
axes (the @PattonAnalytics first-read quadrant), partial visibility (top 3 of
12 on the Dynatyze board), or visual estimates are labeled APPROXIMATE and
never fed into anything that treats them as exact.

2.7 **Proprietary metrics stay labeled proprietary.** Separation Score,
Separation Market Share, ADOR, ARBY, xFP, PROE+, "explosive access", Raritos
1-to-10 composite, Play Caller Tendency Rating, NFL SNAP — when the source
publishes no definition or weighting, the entry says so and stops there.
A named metric with no published definition is not a formula to guess.

2.8 **Keep attributed context attached to the number.** A headline value can
be wrong without context: PFF single-game grades require min 20 snaps; PFF
pressure-to-sack rate requires min 10 pressures; @RaritosFootball's 1-to-10
composite is a 1-to-2 game sample with no early-sample disclaimer.

---

## 3. Dedupe Rules

3.1 **Dedupe against the prior inventory before adding.** Every new item is
checked against everything already inventoried — across days, accounts, and
the foundation dossiers — before it is recorded as new.

3.2 **Distinct-but-related metrics stay separate.** EPA/play is not EPA/dropback;
EPA/dropback is not EPA/attempt; PROE is not PROE+; TPRR is not target share.
Rate vs rate with a different denominator, and metric vs its composite, are
separate inventory rows with explicit cross-references.

3.3 **Reposts are not new items.** A repost by another account (PROE+
reposted by @PattonAnalytics Sept 18), a same-metric re-publication by a
different account (@RyanPaganetti's full 32-team 1st-and-10 4+ yard list vs the
earlier @sfdata9ers cut), and a formula restatement do not create new entries.
Note them as different-angle or same-metric coverage on the existing row.

3.4 **New cuts of the same metric are revisits, not new metrics.** A chart
pairing an existing metric with a new axis or a new sample window (WR first-read
share x 1D/RR; pressure-to-sack rate by a new account; under-center rate vs
under-center efficiency) is recorded as a revisit entry pointing back to the
base metric — this keeps the metric list from exploding.

3.5 **Same question, three data sources = three inventory rows.** The Sept 23
charted-vs-production accuracy triple (PFF QB Accuracy Index vs @RyanJ_Heath
accurate-throw-rate x ANY/A on Fantasy Points charting vs @benbbaldwin PFF
grade x EPA/play) shows why: same analytical question, different data source,
different charting assumptions. Attribute the source on every row.

3.6 **Dedupe by canonical ID across formats.** Same paper under v1/v2 suffixes;
same metric under StatRankings vs StatRankings+ naming; metric paths with
equivalent content (neutral pace sec/play in the dump vs the PROE+ post).
Normalize identifiers first, then compare.

---

## 4. Known Gotchas and Corrections

4.1 **9YOE is explicitly undefined.** @GridironInfo_ Sept 22 printed the label
with footer "shown only where NGS charted the back" and no definition anywhere
observed. Do not define it. Do not build from it. Inventory only.

4.2 **Cost of Drops formula.** @sfdata9ers Sept 23: `Cost of Drops =
Air EPA + expected YAC EPA - Actual EPA`, computed on FTN-charted drops.
-9.4 EPA on drops / +7.7 EPA on penalties for one QB was the two-metric offset
framing. This is a definition captured from the source, not an endorsed model.

4.3 **xFP sign-convention warning.** One tracked chart used
`FPOE = XFP - FPG`, the opposite of the common `FPG - xFP` naming. Verify the
sign convention on every fantasy-points-over-expectation chart before use.

4.4 **PROE+ has no published weighting.** "Pass Rate Over Expectation + Neutral
Pace" — the combination formula between the pass-rate and pace components was
never published in the sweeps. The Sept 24 StatRankings post adds a year-over-
year +/- column, which is framing, not a formula.

4.5 **ARBY matchup formula is partial.** The Matchup Rating combines ARBY and
RB yards per carry with a 2025/2026 game-weighting (65%/35% ARBY/RB YPC,
50/50 offense-defense; the TNF post disclosed a game-weight of 5/2 across
2025 Wks 13-17 + 2026 Wks 1-2). Validation correlations are author's own
tests (ARBY-to-YBC r = 0.70, team ARBY-to-ALY r = 0.47). Attribute, do not
treat as peer-reviewed.

4.6 **Coverage shell naming varies.** StatRankings CoverageIQ+ shells: Man =
0, 1, 2M; Zone = 2, 3, 4, 6, 9. Do not assume another vendor's shell
taxonomy maps one-to-one.

4.7 **PRWR has three public sources, and they differ.** SumerSports (public
table, min-snaps filters 1/10/25/50/100/250), PFF, and ESPN (limited to top
20, distinct "pass rush wins" naming). Never present a PRWR value without
naming the source.

4.8 **Verify PSA slab certs on card trades.** Fake slabs exist in the wild.
Any trade offer received as a photo must be checked against the cert database
before negotiation moves. Photograph the back of the slab when pricing.

4.9 **Under-center rate qualifiers.** % of offensive snaps under center;
kneels and spikes excluded; pistol not included (per @SumerSports, Sept 18).
League context: 2022 32.1%, 2023 27.7%, 2024 29.3%, 2025 33.8%, 2026 Week 1
41.3%. JAX 71.3% is the highest since the 2022 Rams (72.8%).

4.10 **Success-rate definition family.** The base definition (Sept 17
dossier; @sfdata9ers Sept 20 inline): % of plays with EPA > 0. The down-and-
distance rule (Sept 18 BUF rushing footer): 1st down >= 40% of yards to go,
2nd >= 60%, 3rd/4th >= 100% (conversion). @GridironInfo_ Sept 24 WR variant:
target on 1st must gain >= 40%, on 2nd >= 60%, on 3rd/4th must convert. Related
but distinct definitions — inventory them separately, do not merge.

4.11 **The 2026-09-21 arXiv phase-1 integrity failure.** Phase 1 closed at a
claimed 510 ledgers but Garrett rejected it: his standard was 500 papers
ACTIVE AND WORTH ADAPTING. Only 365 qualified (342 ADAPT + 23 ADOPT); 145
REJECTs were written off without replacement, violating the standing
replace-on-reject rule. Framing phase 1 as "done" was the integrity failure.
New rule: a REJECT never counts toward the 750 target and must be replaced
with another full-paper read. Final verified count: 750/750 valuable
(724 ADAPT + 26 ADOPT); tracker is the canonical record:
`docs/research/2026-09-21/arxiv-program/state/ledger-tracker-750.jsonl`.
Lesson for agents: when your own count is the deliverable, the audit reads
your files, not your summary.

---

## 5. Data-Quality Caveats

5.1 **Chart footers are not data-source confirmations.** "Source: nflverse"
on a chart means the chart says nflverse; it does not prove every column is
nflverse-derived. Where a chart names no source, the entry says "not stated" —
never infer the source from chart style or footers that belong to a different
slide.

5.2 **Early-sample metrics carry a mandatory sample-size field.** Weeks 1-2
data are one-to-two-game samples. Many authors disclose this (@ScottBarrettDFB
reply "No. It's Week 2"); some do not (@RaritosFootball's 1-to-10 composite
with 1,396 rated players and no early-sample disclaimer). Record the sample
window and whether the author disclaimed it.

5.3 **Use current comps, not stale dumps.** StatRankings CSV dumps can carry
stale team affiliations vs real rosters (use the numbers; verify team context).
Comp data is date-sensitive: use current eBay comps for card pricing, never
days-old screenshots.

5.4 **Photo CDN links expire.** Do not archive a CDN URL as a durable source;
download and file the image, or it will be gone when the build reads it.

5.5 **Lender confirmation vs technical proof.** A revocation being "confirmed"
is not technical proof a debit is impossible. Watch the actual transaction
record; confirmation language describes the lender's stated state, not the
system's physical capability.

5.6 **Paywall boundaries were never crossed.** Public tiers were read-only;
gated detail sections (StatRankings+, PFF Pro, Data Suite 2.0, samhoppen
substack paywall) were not accessed and are documented as unverified. An
endpoint noted "unreachable from sandbox" is a dead end from that vantage,
not a dead endpoint — re-check from a normal network before declaring it dead.

5.7 **Vendor disclosures are marketing-adjacent.** StatRankings says its data
is "nflfastR + FTN Data"; SumerSports charting is its own. Take vendor source
disclosures as given and attributed, not as verified supply-chain facts.

5.8 **Approximate transcriptions never become canonical values.** Scatter
plots without labeled values, partial chart visibility, and visual estimates
are recorded as approximate and flagged. They do not feed leaderboards.

---

## 6. Standing Repo Rules

6.1 **CORPUS RULE.** ALL sports material lives in the Sports repo under
`docs/research/<date>/`. The repo is the record; the workspace is scratch.
Nothing durable lives only in the workspace.

6.2 **Benchmark lane rule.** Every advanced metric Garrett or the agents find
goes into the Sports repo's AGENTS.md benchmark section, with every document,
spreadsheet, and profile behind it inventoried. The benchmark lane exists to
measure GSE against the best public models — it is the engine's reference
library.

6.3 **Never touch gse-grok-build-sandbox.** It is isolated by design and
explicitly not production. Do not wire it to anything, do not read from it
for production work, do not push it.

6.4 **Public GSE copy rules.** No em dashes in anything public-facing. Never
say "sports intelligence", "intelligence", or "sports galaxy". Voice doctrine:
human team framing (analysts/writers/reporters/engineers); show exact copy and
get approval before publishing. Full rules in `ops/x-copy-rules.md`.

6.5 **Quality floor 9.2.** Work scoring below 9.2 stays internal and is never
shown to Garrett for judgment. If he is time-pressed and says to go anyway on
sub-9.2 work, his override is logged and then the work moves on.

6.6 **Traffic first.** No new product work until the site reaches 1,000
visitors. Research and infrastructure that do not move traffic wait.

6.7 **Repo hygiene.** The Sports repo is READ-ONLY for sweep/inventory agents:
never reset, clean, or switch branches; never edit it without an explicit
build assignment. Sweeps are read-only operations on X too — no likes,
reposts, replies, follows, or DMs.

---

## 7. Collaboration Rules (Coding-Agent Etiquette)

7.1 **Never modify another agent's branch.** Branches belong to the agent
working them. Read, review, and reference them; do not push to them, rebase
them, or resolve their conflicts.

7.2 **Never broadly reset/clean/rebase/switch branches with local work.**
Git operations that destroy or relocate uncommitted state are off-limits
across the board. If a branch is stale, say so and let its owner act.

7.3 **Support without stepping on toes.** Help other agents by producing
inputs they asked for (CSVs, inventories, specs, code reviews), in your own
branch or files, and hand them over cleanly. Do not "fix" their work inline.

7.4 **Batching beats interleaving.** When several items need another agent's
input, batch them into one handoff with one clear list, not a drip of
messages. Each handoff carries: what you did, the exact file paths, what you
need, and what you are not claiming.

7.5 **Report gaps honestly and fast.** If a scrape failed, a timeline never
rendered, an account was protected, or a value is approximate, report it in
the first message, not buried. Partial progress with named gaps beats a
silent hole. Standing blockers (@NerdingonNFL and @NFLResearcher timelines
never render; @FTNData is protected; do not retry or request access).

7.6 **Deliver file-verifiable results.** Every handoff includes paths and row
counts that the recipient can check on disk. "Inventory complete" means the
CSVs exist, the rows parse, and the tracker reconciles — not that you
finished reading.

7.7 **Mark your work.** Coding agents working the Sports repo mark their work
in the repo's AGENTS.md so other agents (and Garrett) can see who did what
and when.


---

