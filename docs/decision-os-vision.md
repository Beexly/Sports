# Galaxy Sports Edge — Decision-Intelligence OS (North Star)

> Captured 2026-06-04 from the founder's creative direction. This is the ambition
> the product is being pulled toward. It does not replace `architecture.md` or the
> doctrine; it extends them. Integrity guardrails at the bottom are binding.

## The thesis

GSE is **not** a sportsbook, a tout, a dashboard, or an AI wrapper. It is
**Mission Control for sports decisions** — the first spatial, temporal,
evidence-governed, self-calibrating sports decision-intelligence OS.

The user does not "read picks." They enter a living model of the slate, move
through time, inspect market pressure, watch competing evidence argue, choose
(including **No-Bet**), and learn from post-game autopsies.

**The moat is the loop:** live data → signal detection → evidence debate → user
decision → result autopsy → calibration → education → better future decisions.

## The entrance (built)

Not a hero section — a **cold open**. Mission-control boot → fast-cut
intelligence montage → signal forming → identity → interactive handoff that
*dissolves into the live interface*. References: NASA Eyes, Bloomberg Terminal,
F1 pit wall, NFL Films, 2009 sniper-montage pacing (the *energy* — precision,
lock-on, impact — never literal weapons). First visit ~9s; return visit ~3s
boot; power-user Skip; reduced-motion static. Implemented:
`components/landing/cinematic-entrance.tsx`.

## Built this phase

- **CinematicEntrance** — the cold open (above).
- **Signal Courtroom** (`components/courtroom/signal-courtroom.tsx`, `lib/courtroom/courtroom.ts`)
  — every signal is a CASE: Claim · Prosecution (evidence) · Defense
  (counter-evidence) · Judge (falsifiers + what would flip it) · Verdict
  (incl. NO-BET) · qualitative confidence · freshness. Structured primitive the
  live engine can populate; marketing uses `illustrative: true` briefs.
- **Decision Autopsy** (`components/courtroom/decision-autopsy.tsx`) — process×outcome
  grading matrix (Earned / Respected / Lucky / Corrected) + the honest verdicts
  most sites won't publish. "We grade the thinking, not the scoreboard."
- **Cinematic system** — Atmosphere (film grain + vignette), editorial serif
  accent (Instrument Serif), kinetic ticker, auto-advancing "watch it run"
  showcase, WebGL galaxy hero (45k stars + nebula + selective bloom).
- **The Glass Box Cipher** — weekly shard-assembly hunt (see `project-gse-cipher` memory).
- **Galaxy Slate Twin — first slice (BUILT)** on `/observatory`
  (`components/slate-twin/galaxy-slate-twin.tsx`, `lib/slate-twin/demo-slate.ts`):
  raw-three.js spatial twin where the picture encodes real metrics — core
  brightness = signal density, halo = volatility, orbit wobble = contradiction
  mass, confidence ring = confidence at the scrubbed step, colour = verdict.
  **Time scrubber** = the 4D axis (Opening line → … → Result). Click a system →
  camera focuses + inspector argues the read; full reduced-motion damping + an
  accessible Slate manifest/inspector (the canvas is aria-hidden). DEMO data only,
  explicitly labelled. Now also: **odds-movement trails** (per-system "path of the
  price" that reveals as you scrub, + a line-movement sparkline in the inspector)
  and **league-constellation navigation** (All / NFL / NBA / MLB / NHL — flies the
  camera to a cluster, dims off-league, filters the manifest; clickable
  constellation labels in overview). Also: **public-money gravity distortion**
  (high public pressure drags the market satellites into an eccentric, off-centre
  orbit with a magenta pressure lobe; `PUBLIC_MONEY` + inspector bar) and
  **injury impact-events** (`IMPACTS` — a shockwave fires from the system as the
  scrubber hits the step, residual ring after; inspector + manifest ⚠), and
  **deeper market-system zoom** (focusing a game animates a `focus` 0→1 that
  expands the system in place — group scales up, satellites grow, per-market
  volatility halos bloom, the rest recedes harder; inspector breaks out a
  "Market system" with per-market volatility bars), and **sharp-vs-public
  divergence as a dark-matter pull** (`SHARP_DIVERGENCE` — a cyan "sharp" node
  pulls the orbit centre back against the magenta public lobe, a visible
  tug-of-war, with a faint cyan lensing ring whose strength tracks the
  divergence; inspector shows a two-sided Public↔Sharp bar + read). And it is now
  **wired to live data behind the readiness gate**: `lib/slate-twin/get-slate-twin.ts`
  checks `getReadinessGates().canExposePublicPicks` — closed → the labelled demo;
  open → `buildLiveSlate()` maps REAL games (verdict/grade, confidence, bookmaker
  consensus, market depth, opening→current line movement, odds dispersion),
  OMITTING public/sharp/impact (no source yet — never fabricated), with a
  `dataNote` and any failure falling back to demo. The component is now
  prop-driven (`<GalaxySlateTwin slate={...} />`); the observatory page is async
  and branches copy on `slate.live`.

**Per-market drill-in (BUILT):** click a market satellite of a focused game (or
its inspector row — keyboard-accessible) to drill that single market — it swells
& brightens while siblings recede and its volatility halo boosts; the inspector
highlights the row, shows a MarketDetail callout, and offers "← all markets".

## Roadmap (remaining systems — not yet built)

1. **Galaxy Slate Twin — data instrumentation only** — the visualization is
   complete; what remains is upstream data: (a) a real public/sharp
   ticket-vs-handle source so those encodings light up for live games; (b)
   per-step confidence history (snapshots over time) for a true 4D live scrub.
2. **4D Market Time Machine** — scrub a game/prop from opening line → movement →
   news → recommendation → result → autopsy. Time is a first-class axis.
3. **Parlay Genome / Portfolio Surgeon — BUILT** (`/parlay-mri`,
   `components/parlay/parlay-genome.tsx`, `lib/parlay/parlay.ts`): toggle
   illustrative legs in/out and the ticket's vitals move in real time —
   survivability, headline vs fair payout, EV, compounded house edge, hidden
   same-game correlation (⛓), and a structural verdict (Balanced/Stretched/
   Brittle/Mutated). Surgeon's notes explain what to cut & why; a singles
   comparison exposes the payout illusion. Transparent EV math on illustrative
   legs (default reads −20.8% EV; paring to the lone value leg → +5% / Balanced).
   In nav. NEXT: let users paste/build a real ticket once odds data supports it.
4. **Bias Mirror — BUILT** (on `/responsible-play`, `components/bias-mirror/`,
   `lib/bias-mirror/mirror.ts`): a private self-reflection — rate 7 honest
   tendencies (loss chasing, favourite bias, No-Bet discipline, over-parlaying,
   emotional timing, narrative pull, risk-flag blindness) and the Mirror returns
   a live profile, patterns worth watching, genuine strengths, protective moves,
   and a recommended mode (Standard / Watch Mode / Cool-down). Computed entirely
   on-device from the user's own inputs — nothing sent or stored (privacy-first).
   Calm/protective, never shaming. NEXT: optional opt-in local journal that feeds
   it real history.
5. **Bet Autopsy + Calibration Engine** — taxonomy built (DecisionAutopsy);
   needs the settled-result pipeline + calibration feedback.
6. **GSN as interactive intelligence network — BUILT** (`/gsn`, in nav,
   `components/gsn/transmission.tsx`, `lib/gsn/transmission.ts`): a daily
   mission-control TRANSMISSION, not a blog — console header (`GSN TRANSMISSION //
   06·04·26`), a live count strip (Market Mirages / Roster Shocks / Coaching Edges /
   No-Bet Warnings / Games Under Review), and the day's intelligence segments
   (Galaxy Brief, Market Mirage, Roster Shock, Coaching Edge, Line-Movement Autopsy)
   as an expandable accordion. Illustrative sample; methodology/scenario language,
   no fabricated track record. NEXT: generate from the live slate behind the gate,
   each segment deep-linking to the live object it describes.
7-BUILT. **Academy Simulator** (`/academy`, `components/academy/academy-simulator.tsx`,
   `lib/academy/scenarios.ts`): decide on illustrative historical-style scenarios
   BLIND to the outcome (read lines/injury/public/model-view/counter-evidence →
   choose PLAY/WATCHLIST/NO-BET), then the disciplined verdict + outcome reveal and
   the decision is graded on PROCESS — restraint rewarded, a lucky win flagged, a
   correct-read-that-lost respected. Earn rank by calibration (Observer → Scout →
   Analyst → Market Reader → Signal Architect → Galaxy Certified), not streaks.
   Discoverable via mobile-nav + GSN/Intelligence cross-links. NEXT: real historical
   slates behind the gate; a calibration-not-streaks leaderboard.

   --- NAV REORG (done): top nav cut 9 flat items → 5 (Today's Board · Edge Map ·
   Intelligence ▾ · Methodology · Pricing); the 6 decision-OS surfaces (Inside the
   Signal, GSN, Parlay MRI, Academy, Trust Ledger, Cipher) live in a CSS
   hover+focus-within dropdown (keyboard-accessible, no client JS). mobile-nav
   keeps the flat list. ---

(historical) **Academy Simulator** — train on historical slates blind to outcome; leaderboard
   rewards calibration/restraint, not hot streaks. Status ladder: Observer →
   Scout → Analyst → Market Reader → Signal Architect → Galaxy Certified.
8. **Agent War Room — BUILT** (`components/war-room/agent-war-room.tsx`,
   `lib/war-room/agents.ts`, on /intelligence between Courtroom and Autopsy): a
   visible 8-agent council (Line Movement, Sharp Pressure, Public Bias, Injury
   Freshness, Matchup, Model Disagreement, Narrative Signal, Responsible Decision)
   that plays back an illustrative escalation cascade — verdict steps PLAY→WATCHLIST
   while you see exactly which agent escalated and why (auto-advance, pausable,
   rail-jumpable, reduced-motion safe, aria-live). NEXT: drive it from real
   per-game agent states when live.
9. **Trust Ledger — BUILT** (on `/ledger`, in nav): surfaced the engine's real,
   tested-but-unused Merkle proof-of-record (`merkleRoot`/`inclusionProof`/
   `verifyInclusion`, now re-exported from `@sports/prediction-engine`) as a live
   tamper-evidence demo — `lib/trust-ledger/proof-demo.ts` (server, real SHA-256)
   + `components/trust-ledger/proof-of-record.tsx`: shows the published root,
   an intact↔tamper toggle (flip a LOSS→WIN → recomputed root diverges → detected),
   and a real inclusion proof folding to the root. Illustrative records, real
   crypto. The existing settled-pick receipts still render below (gated by
   `isBootstrap:false`). NEXT: commit real roots at lock time + an /api/proof
   endpoint so anyone can verify a live pick.
10. **Spatial/data layer** — Three.js now; WebGPU as progressive enhancement for
    GPU particles/graph/simulation; WebXR later for a spatial war-room mode.

## Domain model (target)

Sport · League · Slate · Game · Team · Player · Market · Book · OddsSnapshot ·
Source · Signal · ModelRun · Evidence · CounterEvidence · RiskFlag ·
Recommendation · DecisionState · UserAction · Autopsy · CalibrationResult ·
AcademyScenario · GSNStory — connected as a graph so a GSN story → signal →
market → odds history → recommendation → autopsy → calibration all link.

## Integrity guardrails (binding — never violate for spectacle)

- **No fake data.** No fake odds, teams, wins, users, urgency, or authority.
  Demo/illustrative content must be explicitly labelled (`illustrative: true`).
- **No fabricated track record.** Performance numbers stay gated behind the
  calibration readiness gate. Confidence is qualitative until earned.
- **No-Bet is equal to Play.** Every recommendation carries counter-evidence and
  a falsifier. The AI never sounds certain.
- **No autonomous money/grants.** Rewards/comps are founder-gated (see cipher).
- **Accessibility + reduced-motion are not optional.** Every cinematic surface
  ships an accessible, reduced-motion path.
- **Don't remove or lose integrity** when adding spectacle — additive, verified
  (lint + types + build green) before moving on.

## Positioning

Internal: *the Bloomberg Terminal, NASA mission map, F1 pit wall, and film-room
autopsy engine for sports decisions.*
External: **Find the signal before the market moves.** /
**Enter the slate. See the signal. Learn from the outcome.**
