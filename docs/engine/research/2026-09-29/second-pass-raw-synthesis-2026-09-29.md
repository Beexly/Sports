# Second-pass leverage review — raw synthesis (2026-09-29)
Motif's own deep read. Gap-fill research running in parallel; integrate on return.

## The meta-miss: nobody connected the two reports
The patent report and the apps report were written in isolation. The highest-leverage items live in the SYNTHESIS:

### S1. The automated film pipeline (biggest single find)
Apps #25 (video moment finder: frame embeddings + cosine search) + Patents G1 (field-anchored telestration) + G2 (play segmentation prefilter) + G3 (replay discriminator) + G4 (vanishing-point calibration) = one complete pipeline:
ingest broadcast → G2 segments plays → G3 kills replays → G4 calibrates camera → G1 anchors telestration → #25 semantic moment search.
Feeds BOTH lanes: content op (2–4s telestrated clips per the standing video rule) AND the engine (automated charting → proprietary features). Neither report assembled this.

### S2. Automated charting = proprietary data generation
GSE's founding inspiration was FantasyPoints hand-grading every play of the season. The film pipeline automates a version of that: formations, routes, personnel, play boundaries from broadcast video → proprietary play-level labels → variance model inputs, signals table rows, rankings features. The patents were framed as content tooling; their bigger value is DATA generation. This is the "method, not the equation" play applied to film.

### S3. Turn each method into infrastructure (scout pattern)
Apps #13 (scout/scheduler/delivery split) applies to:
- the patent-mining METHOD itself → scheduled patent scout watching newly-expired patents in his niches (one-shot report decays; a scout compounds)
- the awesome-apps repo itself → watcher for new skills (the empty self-improving-agent-skills folder will fill; star it, scout it)
- X sweeps (already noted in report)

### S4. Kill-list discipline as a standing loop
Apps #18 (critique → revise loop) + #21 (human feedback) applied to idea triage: propose → research → critique → kill/advance, continuously. The 30-kill list was one-shot; make it a loop. The kill list is also a "what NOT to build" database with compounding value.

## Patent report — deep cuts

### P1. A1's general form: print arbitrage
"Stock blank + color-matched overlay" isn't weddings — it's the general trick of *professional look without professional print runs*. Applies to: real estate flyers, restaurant daily specials, retail price tags, event signage, church bulletins. A whole product LINE, not one kit.

### P2. The memorial lane, said plainly
The report tiptoed around funerals. Plain version: memorial/celebration-of-life print is non-seasonal, price-insensitive, recession-proof, and the patent was LITERALLY for memorial items. Funeral homes are local businesses with terrible websites — a Kit vertical (sites + memorial print overlays + QR-linked tribute pages). Restraint in positioning, but don't leave the money on the table out of squeamishness. Gap-fill Q1 testing this.

### P3. A3's general form: the Kit platform differentiator
"Edit once, update everywhere" isn't a restaurant menu add-on — it's THE Kit platform feature: one dashboard → website + Google Business Profile + social + print. That's the moat for the whole $350-site operation. Reframe from add-on to platform.

### P4. A4's hidden layer: scans are data
QR/NFC "live" signs are trackable — every scan/tap is foot-traffic analytics SMBs cannot get elsewhere. The analytics dashboard is the real upsell; the sign is the trojan horse. NFC tags cost pennies.

### P5. A2's viral loop
QR asset tags on installed sign panels are customer-facing too: "scan to see who made this sign / leave them a review" — every install becomes lead-gen for the sign shop. A viral loop inside a B2B tool. Nobody noted this.

### P6. The active-patent controls as competitive intel
The Trackman/Disney/SAP/Nike active patents mapped as kill-controls are an IP WALL MAP: where not to compete, where to design around, where the big players are investing. Strategic asset, not just a kill list. Revisit yearly.

## Apps report — deep cuts

### A1. #20 hash-chained provenance: the trust differentiator
In a tout space where everyone deletes losing picks, cryptographic proof-of-no-edits isn't "brand value" — it's potentially THE public differentiator. "Every pick public, every result posted, provably unedited." Possibly the strongest public-facing idea in the whole apps report. Gap-fill Q5 testing whether anyone does this.

### A2. #10 advisor-orchestrator as fleet law
"Verify by exercising the deliverable, never grepping a README" = Garrett's file-verifiable completion standard, codified. Should govern the coding agent's all-day autonomous mode and every Hermes handoff — fleet law, not a thread pattern.

### A3. The analyst desk vision (#28 + #16)
Garrett interrogating his engine in natural language ("why is our QB ceiling biased high in domes?" → agent queries Neon, runs dispersion analysis, builds the dashboard live). Changes his relationship with the engine from builder to interrogator. The report listed the pieces; the VISION was under-sold.

### A4. #17 deep-research agent: closest to directly reusable
Next.js + CopilotKit = his stack. "Front end nearly template-level" was buried in Tier 2. This is the internal analyst desk for off-field intake and deserves Tier-1 attention.

### A5. #34 ripple: unglamorous, needed
Doc-coherence checker over a multi-agent corpus that's actively rotting ("this rule changed — these 6 docs contradict it"). Nobody wants to build it; it needs building.

### A6. #36 TL;DR infographics serve a stated requirement
Garrett's required packet format: "full write-up WITH GRAPHICS." Auto-generated packet graphics aren't a nice-to-have — they serve an explicit format requirement. Underweighted.

### A7. Dogfood the reports
TOON (#2) compresses tabular LLM data ~64%. The 30-item kill list + 45-item leverage map are exactly that tabular data. The fleet should process these reports with the techniques the reports recommend.

## Open questions for gap-fill
Q1 memorial/funeral market reality · Q2 broadcast charting SOTA · Q3 QR-signage precedents · Q4 edit-once competitive set · Q5 tamper-evident picks precedent
