# Competitive-Intelligence Dossier & Battle Plan
## Target: LineStar / BetFully, Inc. (formerly Fantasy Sports Company) — DFS lineup-optimization stack
### Prepared for: Galaxy Sports Edge (GSE) | Date: 2026-07-07 | Classification: internal / counsel-eyes for §2–3

> **Framing.** This is a competitor's teardown plus an engineering-and-legal design-around map. Every patent-invalidity or non-infringement point is **leverage to investigate with patent counsel**, not a legal conclusion. Claims are tagged **(documented)** (verified against a primary source), **(inferred)** (a reasoned read of verified facts), or **(speculative)** (a flag, not a finding).

---

## 1. Bottom line up front — the five highest-leverage takeaways

1. **Their "optimizer" is a heuristic, not an optimizer — that is the seam.** Every independent claim across the enforced family recites a *randomized-greedy walk of a pre-sorted "column-based list,"* explicitly engineered to hold *"approximately constant computational time"* with *"iterations inversely proportional to the number of rows"* **(documented)** — a mobile-first shortcut that **trades optimality for speed**. A standard branch-and-bound MILP finds the *proven* optimum and, by not practicing that data-structure-plus-operation, likely does not literally infringe **(inferred)**. GSE can be *both* patent-distant *and* provably better on the same objective. [US10,478,721](https://patents.google.com/patent/US10478721B2/en)

2. **Prior art sits inside a priority gap — but only if the provisional cracks.** The family's true cutoff is the **2015-09-18** provisional (62/220,665), not the 2016 non-provisionals **(documented)**. The two strongest algorithmic references — [arXiv:1604.01455](https://arxiv.org/abs/1604.01455) (submitted 2016-04-06) and [pydfs-lineup-optimizer v0.1](https://pypi.org/pypi/pydfs-lineup-optimizer/json) (uploaded 2015-12-24) — fall **after** the provisional but **before** the non-provisionals, so they become live prior art **only if** the specific randomized-column mechanism loses the provisional date under a §112/§120 written-description analysis **(inferred; counsel question)**. Do **not** anchor an invalidity theory on the arXiv paper unless that priority attack lands.

3. **They teach correlation but never optimize it.** Stacking / "preference weight" appears only in *dependent* claims and marketing; the *core objective is a point-sum* (`max Σ proj·x` s.t. salary cap) **(documented)**. Point-sum is the wrong objective for tournaments — it ignores covariance, the outcome distribution, and field ownership. A correlation-aware **simulation-EV + ownership-leverage** objective structurally beats it (§7b) **(inferred)**.

4. **Legacy stack, small-entity resourcing, paper-tiger enforcement.** The architecture was built c.2015 for *constant mobile compute*; the owner is a **small entity** that let the '721 optimizer patent **lapse for non-payment** in 2023 and reinstated it by unintentional-delay petition **(documented)**. The portfolio has **never been litigated** — no suit, IPR, PTAB, or named C&D — and the current site shows a **licensing** posture ("Contact for Licensing," "Partner With Us") **(documented)**. This reads as an IP-monetization play, not a product juggernaut **(inferred)**.

5. **Where users churn: chalky, duplicate-prone, point-sum lineups.** The single biggest GPP pain — optimizers that hand the whole field the same high-projection "chalk" — is *baked into* a point-sum heuristic. GSE's wedge is a **generate-then-simulate-then-select** engine that manages correlation, ownership leverage, and duplication risk as first-class objectives, tied to the **GSE Rating** and a **skill-based (not real-money)** contest lane (§7) **(inferred)**.

---

## 2. The moat, exposed

### 2.1 Patent family status (all four verified on Google Patents)

| Patent | Role | Filed | Granted | Priority | Anticipated expiry | Status |
|---|---|---|---|---|---|---|
| [US9,744,450](https://patents.google.com/patent/US9744450B2/en) | Projection engine | 2016-09-23 (15/275,125) | 2017-08-29 | 2015-09-18 | 2036-09-16 | **Active** — 4th-yr fee 2021-08-30, 8th-yr 2025-05-07 **(documented)** |
| [US9,751,010](https://patents.google.com/patent/US9751010B2/en) | Real-time value update + randomized-column lineup gen + std-dev band GUI | 2016-09-16 (15/268,457) | 2017-09-05 | 2015-09-18 | 2036-09-16 | **Active** — 4th-yr fee 2021-09-07, 8th-yr 2025-02-03 **(documented)** |
| [US10,478,721](https://patents.google.com/patent/US10478721B2/en) | Optimizer (max projected-value sum s.t. salary cap) | 2017-08-28 (15/687,866) | 2019-11-19 | 2015-09-18 | 2036-09-16 | **Active — Reinstated**; LAPSED 2023-12-25, reinstated 2024-03-14 **(documented)** |
| [US11,660,533](https://patents.google.com/patent/US11660533B2/en) | Multi-lineup (first/second randomized column-based lists) | 2019-10-08 (16/596,124) | 2023-05-30 | 2015-09-18 | 2036-09-16 | **Active** — first maintenance fee due ~2027 **(documented)** |

Inventors **Peter Groset, Erik Groset, William Switzer** → **Fantasy Sports Company** (assignment recorded 2019-05-29, reel/frame 049309/0936) → **CHANGE OF NAME to BETFULLY, INC.** (recorded 2022-08-24, effective 2021-11-03) **(documented)**. **Chain of title is clean — standing to sue is intact if they ever choose to.** [US10,478,721 legal events](https://patents.google.com/patent/US10478721B2/en)

**Shared-fate note (corrected):** all four are continuations off one specification and one priority chain, so the common **2036-09-16** expiry is the *natural* 20-years-from-earliest-non-provisional result — **not** evidence of a terminal disclaimer (none appears in any record) **(documented correction)**. The valid point survives on the continuation relationship: a successful priority/written-description (§112/§120) or §101 attack on the **shared disclosure** is more likely to ripple across multiple family members at once **(inferred)**.

### 2.2 The claimed mechanism, in plain English

Strip the patentese and the invention is: *"Pre-sort the player pool into columns by position with entries in decreasing projected value; shuffle the column positions; walk down the rows sequentially picking one player per row until the salary cap binds; cap the number of iterations inversely to the row count so the phone finishes in about the same time every run."* **(documented, verbatim across '721, '533, '010 independent claims)**

That is a **fast randomized-greedy construction heuristic**, not exact optimization. It exists to run in constant time on 2015-era mobile hardware. It is **not** branch-and-bound, not cutting-plane, not an LP relaxation — which is exactly why it is both **designable-around** and, on any broader reading, **vulnerable to prior art** that does real integer programming.

### 2.3 Prior-art-vs-claim-element table (leverage to investigate with counsel)

| Claim element (verbatim) | Where it lives | Closest prior art | Bites if… |
|---|---|---|---|
| "randomizing column positions of a column-based list…sequentially selecting a single internal object" | ALL nine independent claims ('721 1/6/14; '533 1/8/17; '010 1/7/13) **(documented)** | The examiner had **none** — the six cited refs are fantasy-draft/auction UIs + AT&T telecom (Resende) + Yahoo! message-clustering **(documented)** | Any pre-2015-09-18 DFS optimizer surfaces (Wayback of RotoGrinders LineupHQ / FantasyLabs — **unverified, dig**) |
| "maximize sum of projected values subject to salary cap" (0/1 knapsack) | '721 cl.1 second constraint **(documented)** | Decades-old knapsack/IP; [arXiv:1604.01455](https://arxiv.org/abs/1604.01455) portfolio-IP formulation; [pydfs v0.1](https://pypi.org/pypi/pydfs-lineup-optimizer/json) | Generic — not where novelty sits; don't waste effort here |
| "approximately constant computational time…iterations inversely proportional to the number of rows" | '721 cl.1 & dep. cl.12; '010 cl.1/7/13; '533 cl.1 & cl.8 **(documented)** | Narrowing language — reads like it was added/argued for allowance **(inferred)** | Prosecution-history estoppel limits DoE reach — **pull the file wrappers** |
| Std-dev vertical band with collinear projected/actual markers | '010 cl.1/7/13 (independent); '721 dep. 13/16; '533 cl.17/dep.19 **(documented)** | Generic charting; percentile/box-whisker/violin all pre-date | Design-around, not invalidity (§3) |

**The single sharpest validity lever (for counsel):** a **§120/§112 priority-entitlement** question. If provisional 62/220,665 disclosed only the projection engine and a *general* optimizer concept — and the specific randomized-greedy/constant-compute algorithm first appeared in the 2016/2017/2019 specs — then those claims get only their actual filing dates, and arXiv:1604.01455 + pydfs v0.1 become available prior art **(inferred; the provisional four-corners are not public — requires Patent Center / Global Dossier file histories)**.

**A separate §101/Alice flag (speculative):** the claims cover *selecting items to maximize a score subject to a budget on generic mobile hardware* — a recognized abstract-idea vulnerability for optimization software. No §101 challenge exists in the record; fact- and forum-dependent.

### 2.4 Enforcement history — paper tiger?

- **No public record of BetFully/FSC ever asserting these patents** — no infringement complaint, IPR, PTAB, reexam, or named C&D in open-web + PR + docket-headline searches **(documented absence; PACER full-text not queried — see §8)**.
- The one scary headline — *"Fantasy Sports Company Sues…over Fixed-Odds Game Format"* — was **run down and disambiguated**: it is [**Vetnos LLC v. SidePrize LLC (PrizePicks)**](https://www.lexology.com/library/detail.aspx?g=34ceb7f0-1451-4b50-b78f-ee62040b1782), N.D. Ga. 1:23-cv-2746, on patents 10,353,543 / 11,157,147 / 11,579,754 — **a different plaintiff and unrelated patents** **(documented)**. Interactive Games/Cantor and Virtual Gaming/Junkin suits are likewise unrelated third parties.
- The [**June 2, 2023 press release**](https://www.prweb.com/releases/BetFully_Inc_Secures_Yet_Another_U_S_Patent_for_Automated_Lineup_Optimization_in_Daily_Fantasy_Sports/prweb19365649.htm) states only *intent* — verbatim: *"committed to aggressively pursuing legal action against any infringer"* — and names **no defendant, suit, or C&D** **(documented)**.
- The circulating *"BetFully v. RotoWire Patent Infringement Analysis"* estimating "65–75% litigation success" is hosted at **gojhncpm.manus.space**, a [Manus AI publishing subdomain](https://gojhncpm.manus.space/) — **not a court filing or authenticated BetFully document**; "AI-generated" is a reasonable inference from the host, not a fact **(documented / inferred)**.

### 2.5 Honest "how scary" read

**Moderate, and mostly bluff — but do not be sloppy.**
- **Standing is real** (clean title). **Willingness/resources look thin** (small entity, a lapsed-then-reinstated core patent, a licensing landing page, zero litigation in ~9 years). **(inferred)**
- The published enforcement quote is **marketing**, and the forward-citation landscape is **STATS-LLC sports-vision ML** — *not* DraftKings/FanDuel/SaberSim/RotoGrinders designing around them, i.e. a **commercial-niche patent, not a foundational one** **(documented)**.
- **Do not rely on "they won't sue."** Literal non-infringement ≠ freedom to operate; the **doctrine of equivalents** is a separate test, and a stated enforcement posture raises **willfulness** stakes. Get a formal FTO/non-infringement opinion before shipping (§3 caveat).

---

## 3. Design-around freedom map (SAFE-TO-BUILD spec)

**Verified against the granted "What is claimed" text.** US claims are conjunctive (all-elements rule): a product that does not practice *every* element of an independent claim does not literally infringe it. The **load-bearing element in all nine independent claims** is the *randomized-column construction heuristic*. Break that once and you clear the whole portfolio literally.

### 3.1 Element-by-element avoidance

| Claim element | SAFE-TO-BUILD replacement | Confidence |
|---|---|---|
| **Randomized column-based greedy selection** (all 9 independent claims) | **Exact branch-and-bound / cutting-plane MILP** (OR-Tools CP-SAT, CBC, HiGHS, SCIP, Gurobi, CPLEX): binary `x_i∈{0,1}` per player, LP-relaxation search tree with cover/Gomory cuts. **No column list, no position randomization, no per-row sequential pick.** | (inferred) [pydfs ref](https://github.com/DimaKudosh/pydfs-lineup-optimizer) |
| **"Approximately constant computational time / iterations inversely proportional to rows"** ('721 cl.1, '010 all, '533 cl.1 & cl.8) | Solve **to proven optimality or a MIP-gap/wall-clock stop, server-side.** Runtime is data-dependent; you stop on optimality, not on a row-indexed iteration cap — a categorically different mechanism. *Note: this element is absent from '721 cl.6/14 and '533 cl.17 — for those, the algorithm swap (not server compute) carries non-infringement.* | (inferred) |
| **'533 multi-lineup via "first/second randomized column-based lists"** | **N-lineup MILP with linear uniqueness/exposure constraints**, or **sequential no-good cuts**, or a **solver solution-pool** (Gurobi PoolSearchMode / CP-SAT collector). If you want stochastic variety, **sample projection inputs** (Monte-Carlo) and solve exactly — a different function-way-result. | (inferred) |
| **'010 std-dev vertical band + collinear projected/actual markers** | Range from **percentiles (10th–90th), IQR box-whisker, CI, or simulation distribution** — *not* std-dev; show projected-vs-actual as **separate columns / delta bar / violin / sparkline**, *not* collinear on the band. Any single omission avoids literal reading; change several to widen the DoE gap. Live scoring itself is fine — it's the *specific widget* that's claimed. | (inferred) |
| **'010 real-time monitoring** (generic alone) | Claimed *in combination* with the two elements above — breaking the optimizer + GUI elements clears '010 even while you push live updates. | (inferred) |
| **"mobile application running on a mobile device"** | Weak reed (mobile-web ambiguity + DoE) — **do not rely on it.** Bonus argument for counsel, not a primary design-around. | (speculative) |

**Language hygiene:** never describe your engine internally as "randomizing columns" or "shuffling a player list and picking down the rows" — that gratuitously echoes the claim.

### 3.2 SAFE-TO-BUILD single-lineup MILP

```
Sets:    P = players (i);  S = roster slots for the site
         (e.g., DK NFL Classic: QB×1, RB×2, WR×3, TE×1, FLEX×1∈{RB,WR,TE}, DST×1; total 9)
Params:  proj_i  (projected points),  sal_i (salary),  CAP = 50000,
         elig_{i,s} ∈ {0,1} (player i eligible for slot-type s),  slots_s (count per slot-type)
Vars:    y_{i,s} ∈ {0,1}  (player i fills slot-type s)
         x_i = Σ_s y_{i,s} ∈ {0,1}  (player i selected)

maximize   Σ_i proj_i · x_i

s.t. (1) Salary:       Σ_i sal_i · x_i ≤ CAP        (optionally ≥ CAP_min)
     (2) Roster fill:  Σ_i y_{i,s} = slots_s   ∀s,   with y_{i,s} ≤ elig_{i,s}
     (3) One slot/player: Σ_s y_{i,s} ≤ 1     ∀i
     FLEX is just another slot-type with multi-position eligibility.
Solve to proven optimality or MIP-gap tolerance.
```

This is the standard, decades-old exact formulation — **no column list, no randomization, no inverse-iteration cap** → does not read on the heuristic elements **(inferred)**.

### 3.3 Stacking / correlation / preferences — pure LINEAR constraints (zero heuristic character)

```
QB + N pass-catchers:   Σ_{i∈WR/TE(t)} x_i ≥ N · xQB_t
Bring-back (opp stack):  Σ_{i∈WR/TE(opp t)} x_i ≥ M · xQB_t
Players-per-team cap:    Σ_{i∈team t} x_i ≤ maxPerTeam
Game stack:              Σ_{i∈game g} x_i ≥ K
Avoid RB vs opp DST:     x_{RB(t)} + x_{DST(opp t)} ≤ 1
Lock / ban / preference: x_i = 1  /  x_i = 0   (exact analogue of '721 dep. cl.4/5 "preference weight")
```

These deliver correlation/leverage features through **exact optimization** rather than the patented heuristic **(inferred)**.

### 3.4 SAFE-TO-BUILD N-lineup MILP (the clean replacement for '533)

```
Vars:  x_{i,l} ∈ {0,1}  for lineup l = 1..L  (replicate §3.2 constraints per l)

maximize   Σ_l Σ_i proj_i · x_{i,l}

(A) Exposure bounds:   ⌊minExp_i·L⌋ ≤ Σ_l x_{i,l} ≤ ⌈maxExp_i·L⌉    ∀i
(B) Pairwise uniqueness (AND-linearization), for each pair (l,m):
      o_{i,l,m} ≥ x_{i,l} + x_{i,m} − 1,   o_{i,l,m} ≤ x_{i,l},   o_{i,l,m} ≤ x_{i,m}
      Σ_i o_{i,l,m} ≤ ROSTER − minUnique
```

**Scale variant (preferred):** solve L1, add the no-good cut `Σ_{i∈L1} x_i ≤ ROSTER − minUnique`, re-solve for L2, repeat — or use a solver solution-pool. Every lineup is exact re-optimization with added *linear* diversity constraints — mechanistically unlike '533's "first/second randomized column-based player list" **(inferred)**.

### 3.5 Two mandatory caveats

- **CORRECTION (prior art):** the family priority date is **2015-09-18**; arXiv:1604.01455 (2016-04-06) and pydfs v0.1 (2015-12-24) are prior art **only if** the priority claim fails (§2.3). **Do not cite the arXiv paper as prior art** in the base case.
- **GAP (full FTO):** the family has **four** issued patents; add **[US9,744,450](https://patents.google.com/patent/US9744450B2/en)** to the element-by-element analysis before relying on the MILP architecture as clear. **This is a literal-infringement/engineering map, NOT a freedom-to-operate opinion — clear it with patent counsel** (DoE is a separate test; a formal opinion also mitigates willful-infringement exposure).

---

## 4. Engine-by-engine teardown

LineStar's four production engines map 1:1 to the four patents (BetFully's site ties the family to **LineStar / TrackWiz / Props Optimizer**) **(documented)**. Below: the *claimed* mechanism (documented) vs the *architectural weakness* (inferred), with the formula GSE beats it with.

### 4.1 Projection engine — [US9,744,450](https://patents.google.com/patent/US9744450B2/en)
- **Claimed (documented):** a data-assembly pipeline — query primary/secondary/tertiary data (incl. weather) → `projection = base_value + modifier + rule` via a rule-based projection engine.
- **Weakness (inferred):** additive base+modifier+rule is a **linear, deterministic point estimate**. It emits a single number, not a *distribution* — no variance, no correlation structure, no calibration feedback. Downstream, everything inherits a point estimate.
- **GSE beats it:** emit `F_i ~ Distribution(μ_i, σ_i)` with a fitted covariance `Σ`, calibrated against realized outcomes (the GSE Rating's "prove-it" loop). A projection you can *simulate* is worth more than a projection you can only *sum*.

### 4.2 Real-time engine — [US9,751,010](https://patents.google.com/patent/US9751010B2/en)
- **Claimed (documented):** monitor a data provider for a change → convert to an updated current value via a rule *shared with the projection engine* → push to a mobile app; plus the **randomized-column lineup gen** and the **std-dev vertical-band GUI** (collinear projected/actual markers) — all three bundled in one conjunctive claim.
- **Weakness (inferred):** live-scoring push is commodity; the *differentiated* parts are the two elements GSE avoids anyway (§3.1). The std-dev band is a fixed, symmetric range that misrepresents skewed (boom/bust) player distributions.
- **GSE beats it:** percentile/violin ranges from the simulation distribution — honest, asymmetric, and non-infringing.

### 4.3 Optimizer — [US10,478,721](https://patents.google.com/patent/US10478721B2/en)  ← **the crown jewel that isn't one**
- **Claimed (documented, verbatim):** maximize the sum of projected values subject to a salary-cap "maximum factor," *by* randomizing column positions of a decreasing-value column-based list and sequentially selecting one entry per row, with iterations bounded inversely to row count for constant compute.
- **Weakness (documented mechanism → inferred impact):** this is a **randomized greedy heuristic**. It does **not** guarantee the optimal lineup — greedy-with-random-restart under a cap systematically leaves points on the table versus branch-and-bound, and the *inverse-iteration cap* caps quality by design. Worse, the objective is **point-sum**, which is the *wrong* objective for tournaments (§7b).
- **GSE beats it:** the exact MILP of §3.2 finds the *proven* optimum on the same objective (strictly ≥ their heuristic), then §7b replaces point-sum with simulation-EV. **Provably better and patent-distant simultaneously.** This is the wedge.

### 4.4 Multi-lineup engine — [US11,660,533](https://patents.google.com/patent/US11660533B2/en)
- **Claimed (documented):** generate a first optimal lineup from a *first* randomized column-based list and a second from a *second* randomized column-based list (the "150+ lineups" feature). '533 cl.1 requires generating *both* by that method — even a two-lineup product built that way reads on it.
- **Weakness (inferred):** diversity comes from *re-shuffling*, not from an *exposure/uniqueness model*. There is no principled control over pairwise overlap, portfolio-level exposure, or contest-EV across the set — you get *different* lineups, not a *diversified portfolio*.
- **GSE beats it:** the N-lineup MILP of §3.4 controls exposure and uniqueness as explicit linear constraints, then scores the *portfolio* by simulated contest EV (§7b).

### 4.5 Ancillary products (documented from betfully.com)
- **TrackWiz** — lineup/results tracking. **Props Optimizer** — player-props tool. Both are documented as patent-family products but their internal engines were not independently verified this pass **(documented existence; inferred internals — see §8)**.

---

## 5. Where they bleed — ranked GSE wedge opportunities

> Evidence base: these are grounded in the **documented claim mechanisms and corporate signals** above. Hard churn/review-mining numbers were **not** in the verified findings that reached this desk — flagged in §8. Ranked by leverage × defensibility.

**Wedge 1 — Suboptimal by construction (highest leverage).**
The optimizer is a *heuristic*, not an optimizer **(documented mechanism)**. "The world's only patented optimizer" is provably beatable on its own metric by any exact MILP. GSE's honest, testable claim: *"On identical projections and rules, our solver returns the mathematically optimal lineup; a randomized greedy heuristic cannot guarantee that."* **(inferred)**

**Wedge 2 — Point-sum mis-serves tournament players (the churn engine).**
Point-sum optimization hands the entire field the same chalk → duplicate-prone, low-ceiling GPP lineups. This is *the* recurring DFS complaint, and it is structural, not a bug **(inferred)**. GSE wins with correlation-aware simulation-EV + ownership leverage (§7b).

**Wedge 3 — Distribution-blind projections.**
`base + modifier + rule` emits a point estimate with no variance/correlation/calibration **(documented)**. GSE ships *distributions* and a public calibration record (the GSE Rating "prove-it" loop) **(inferred)**.

**Wedge 4 — Legacy stack, thin resourcing.**
Built for 2015 constant-mobile-compute; small entity; **'721 lapsed then reinstated** **(documented)**. GSE runs modern cloud solvers with no compute ceiling — a capability the heuristic was *designed to avoid needing* **(inferred)**.

**Wedge 5 — IP-monetization posture, not product velocity.**
Never-litigated portfolio + a "Contact for Licensing / Partner With Us" landing page + STATS-dominated (non-competitor) forward citations **(documented)**. A company defending a niche patent is not a company out-shipping you on product **(inferred)**. Positioning: don't fear the patent; *out-build* it.

**Wedge 6 — Trust & transparency gap.**
Their differentiation is a *black-box, patented* heuristic. GSE's brand is the opposite — show the objective, show the constraints, show the calibration. "Patented" is a moat against *copying their heuristic*; it is **no moat against a better, transparent method** **(inferred)**.

---

## 6. Corporate / tech / regulatory

- **Corporate map (documented):** **BetFully, Inc.** (San Diego; formerly **Fantasy Sports Company**), **small-entity** filer, clean chain of title, four-patent optimizer family, products **LineStar / TrackWiz / Props Optimizer**, current posture **licensing** ("Patented Technology for Your Business"). [betfully.com](https://betfully.com/)
- **Legacy-stack gap (documented → inferred):** the enforced core is a **randomized-greedy heuristic** built for *constant mobile compute* with an *inverse-iteration cap* — the signature of a pre-cloud, phone-first 2015 architecture. There is **no MILP/LP solver, no correlation optimization, no simulation objective** in the claims. That is a multi-year capability gap GSE can open on day one.
- **Regulatory surface (speculative — not in verified findings):** DFS optimization tools ride on top of state-by-state-regulated DFS operators; GSE's stated stance is a **skill-based, non-real-money** lane, which sidesteps the operator-licensing surface entirely (§7e). Treat any specific regulatory claim as **needs-legal-confirmation**, not documented.
- **Traffic / scale (NOT VERIFIED):** no traffic, MAU, revenue, or app-store-rating figures were in the findings that reached this desk. **Do not cite numbers you cannot source** — pull SimilarWeb / App Store & Play rankings / Sensor Tower before making scale claims (§8).

---

## 7. GSE battle plan

### (a) Baseline MILP optimizer — design-around **and** provably better
Ship §3.2 (single) + §3.3 (stacking) + §3.4 (N-lineup) on OR-Tools CP-SAT or HiGHS (open-source; Gurobi if budget allows). This alone:
- **clears the portfolio literally** (no randomized-column element), and
- **dominates their heuristic** on the point-sum objective (proven optimum ≥ greedy).
Publish an apples-to-apples demo: same projections, same rules, GSE optimum vs a greedy-random baseline — the gap is the marketing.

### (b) The objective that beats point-sum — correlation + simulation + ownership leverage
Point-sum (`max Σ μ_i x_i`) is optimal for *nothing* real. Replace it with a **two-stage generate-then-simulate-then-select** engine.

**Step 1 — Correlated simulation.** Model player points as a joint distribution:
```
F ~ MultivariateDist(μ, Σ),   Σ_{ij} = ρ_{ij} · σ_i · σ_j
ρ: QB↔same-team WR/TE ≈ +0.3…+0.6;  QB↔opp WR (shootout) > 0;  RB↔same-team WR < 0; game-total & pace scale σ.
Draw K sims → lineup score  S_l^{(k)} = Σ_i x_{i,l} · F_i^{(k)}.
```

**Step 2 — Contest EV with duplication penalty (the real objective).**
```
EV(l) = (1/K) Σ_k  Payout( Rank( S_l^{(k)} ; Field^{(k)} ) )  /  D_l   −  entry_fee
  Field^{(k)}   = simulated opponent lineups drawn from projected ownership o_i
  Payout(rank)  = the contest's payout curve (top-heavy for GPP, flat for 50/50)
  D_l           = expected duplicate entries ≈ N_entries · Π_{i∈l} f(o_i)   (chalk → high D_l → EV divided down)
```

**Step 3 — Tractable MILP surrogate (linear/quadratic, solver-friendly).** Because EV(l) is non-linear, generate a *diverse candidate pool* with a leverage-adjusted objective, then rank by Step 2:
```
maximize  Σ_i x_i [ μ_i  +  β·σ_i  −  γ·o_i ]
s.t.      §3.2 salary/roster + §3.3 correlation constraints
          x^T Σ x  ≥ V_min   (GPP: REWARD correlated variance / ceiling)
          x^T Σ x  ≤ V_max   (cash: CAP variance — floor safety)   [MIQP, or piecewise-linear proxy]
  μ_i = projection (mean),  σ_i = volatility (GPP upside),  o_i = field ownership (chalk penalty),
  β = upside weight,  γ = leverage weight.
```

**Ownership leverage, explicitly.** Play merit the field is *underweighting*:
```
Leverage_i = μ_i / o_i           (points per unit ownership)
Edge_i     = o*_i − o_i          (optimal ownership from your sim − projected field ownership); target Edge_i > 0
```
This is exactly the arXiv:1604.01455 insight generalized: *max expected score subject to a variance floor and a correlation ceiling with prior entries* — inverted for cash (variance ceiling). GSE does it **transparently and correlation-first**, which the point-sum patent structurally cannot.

**Why it wins:** the patent optimizes `Σ μ_i x_i`; GSE optimizes **contest dollars** under correlation, distribution, and duplication. On identical inputs, GSE's portfolio has higher simulated ROI and lower duplication than a point-sum set. That is a *provable, demonstrable* edge — not a slogan.

### (c) Positioning that neutralizes "world's only patented optimizer"
- **Reframe the category:** "Patented" describes *one specific 2015 mobile heuristic*, not a monopoly on optimization. GSE uses **exact mathematical optimization** — older, stronger, and unpatentable-because-fundamental.
- **Own transparency:** show the objective, the constraints, the correlation matrix, and the *calibration record*. Their edge is a black box; GSE's edge is a glass box you can audit.
- **Never disparage the patent's validity in marketing** (keep §2 leverage counsel-side). Compete on *"provably optimal, correlation-aware, and honest about variance,"* not on "their patent is weak."

### (d) User pains to win on (priority order)
1. **Suboptimal lineups** → provable MILP optimum (Wedge 1).
2. **Chalky, duplicate GPP lineups** → simulation-EV + ownership leverage (Wedge 2).
3. **Point-estimate projections that lie about variance** → distributions + public calibration (Wedge 3).
4. **Black-box trust** → glass-box objective + GSE Rating prove-it loop (Wedge 6).

### (e) Mapping to GSE assets + the skill-based lane
- **GSE Rating / edge-engine:** the projection distribution (`μ_i, σ_i, Σ`) and the calibration loop *are* the GSE Rating applied to DFS. The optimizer consumes the Rating's distributions; the simulation objective validates them against realized outcomes — the same "know it / weight it / score it / prove it" spine.
- **Gaming lane:** deliver this as a **free, skill-based "Beat the Model" pick'em / optimizer challenge** — users build lineups, GSE scores them against the simulation engine, leaderboards on skill. **No real-money contests, no crypto, no chance games, no sweepstakes.**

### (f) Compliance boundary (binding)
GSE builds the **optimizer, simulation, and leverage engine** and the **skill-based** challenge lane. GSE does **not** operate real-money DFS/betting, does not custody funds, and does not flip any real-money or live-key switch without explicit founder authorization and legal sign-off. All prior-art / invalidity / non-infringement material in §2–3 stays **counsel-side as leverage to investigate** — nothing here is a legal opinion, and no product ships against the patent family without a formal FTO. Skill-based, free-to-play, transparent, human-authored — the GSE guardrails hold.

---

## 8. Open questions / next intel

1. **Provisional four-corners (decisive).** Pull the '457/'125/'866/'124 file histories via **USPTO Patent Center / Global Dossier** to test whether 62/220,665 (2015-09-18) actually discloses the randomized-column / constant-compute mechanism — this decides whether arXiv:1604.01455 and pydfs v0.1 are live prior art. **Counsel task.**
2. **Pre-provisional optimizer captures.** Wayback the **RotoGrinders LineupHQ** and **FantasyLabs** optimizer pages for public availability **before 2015-09-18** — a hit is prior art even against the provisional date.
3. **Certified docket search.** Query **Unified Patents / Docket Navigator / RPX / PACER-RECAP** to harden "never litigated" from documented-absence to certified-clean.
4. **Terminal disclaimers.** Confirm from the file wrappers whether any TDs were filed (none appear on Google Patents).
5. **US9,744,450 element analysis.** Run the fourth patent through the §3 element-by-element map to complete the FTO.
6. **pydfs solver detail.** Confirm the PuLP/CBC exact-MILP path from the repo (design-around corroboration); only the PyPI *dates* were re-verified this pass.
7. **Product & scale intel (not in findings that reached this desk).** Mine **App Store / Play reviews** and support forums for *actual churn language*; pull **SimilarWeb / Sensor Tower** for traffic, MAU, and revenue; teardown **TrackWiz / Props Optimizer** internals. These sections (§5 evidence, §6 traffic) currently rest on inference from the patent/corporate record — get primary numbers before quoting any.
8. **Regulatory map.** Confirm the DFS-tool regulatory surface state-by-state with legal before making compliance claims beyond the skill-based lane.

---

## 9. Sources

- [US9,744,450 B2 — DFS projection engine](https://patents.google.com/patent/US9744450B2/en)
- [US9,751,010 B2 — real-time value update + randomized-column lineup gen + std-dev GUI](https://patents.google.com/patent/US9751010B2/en)
- [US10,478,721 B2 — optimizer (randomized-column selection, "Active — Reinstated")](https://patents.google.com/patent/US10478721B2/en)
- [US11,660,533 B2 — multi-lineup (first/second randomized column-based lists)](https://patents.google.com/patent/US11660533B2/en)
- [arXiv:1604.01455 — "Picking Winners in DFS Using Integer Programming" (Hunter, Vielma, Zaman)](https://arxiv.org/abs/1604.01455)
- [pydfs-lineup-optimizer — PyPI release metadata (v0.1 upload 2015-12-24)](https://pypi.org/pypi/pydfs-lineup-optimizer/json)
- [pydfs-lineup-optimizer — GitHub (reference MILP implementation)](https://github.com/DimaKudosh/pydfs-lineup-optimizer)
- [BetFully June-2023 press release (4th patent; enforcement intent quote)](https://www.prweb.com/releases/BetFully_Inc_Secures_Yet_Another_U_S_Patent_for_Automated_Lineup_Optimization_in_Daily_Fantasy_Sports/prweb19365649.htm)
- [Benzinga mirror of the June-2023 release (LineStar as flagship; four patents listed)](https://www.benzinga.com/pressreleases/23/06/n32686821/betfully-inc-secures-yet-another-u-s-patent-for-automated-lineup-optimization-in-daily-fantasy-spo)
- [Lexology — "Fantasy Sports Company Sues…" = Vetnos v. SidePrize/PrizePicks (disambiguated)](https://www.lexology.com/library/detail.aspx?g=34ceb7f0-1451-4b50-b78f-ee62040b1782)
- [gojhncpm.manus.space — "BetFully v. RotoWire Analysis" (Manus AI subdomain, not a court filing)](https://gojhncpm.manus.space/)
- [betfully.com — homepage (licensing posture; LineStar/TrackWiz/Props Optimizer)](https://betfully.com/)