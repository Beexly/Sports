/**
 * Program review — the committed fleet record behind /ops/program.
 *
 * Every value on the review page is sourced from THIS file. Nothing is
 * fetched at render time and nothing is illustrative: where a feed is not
 * wired, the record says so in words (FULL-LIVE doctrine: honest-empty over
 * sample data). Update this file when the fleet record moves; the page is
 * a rendering of it, not a second source of truth.
 *
 * PROVENANCE (fleet record, 2026-10-15):
 * - Frozen book: Grok WO-5 ledger ruling (Heavy) as adjudicated by Motif —
 *   baseline 7.154021 VERIFIED (reproduced inside 5e-7 by two lanes;
 *   byte-identical deterministic rerun 2026-10-15), family-2 7.133199
 *   VERIFIED-DIAGNOSTIC, bar 7.099 (Roadmap rule: Launch Plan close 7.109
 *   − 0.010). Filter: REG 2017 W1–2026 W5, n = 2,462, μ = +spread_line
 *   (closing line), harness-locked, CLOSED.
 * - Forward program: SPEC-A (future-filter contract FFW-26) + SPEC-B (pick
 *   spec), Claude drafts as ratified by the owner 2026-10-15; FREEZE-1
 *   executed on branch motif/spec-freeze1-2026-10-15 (FREEZE-1.json
 *   certificate). Candidate #1 composition per RULING-C1 (Claude,
 *   2026-10-15) with Grok WO-7 adversarial amendments; SPESE slot per the
 *   SAI diagnostics build (branch motif/sai-diagnostics-2026-10-15).
 *   Product break-even basis + scale: the product break-even mapping
 *   artifact (2026-10-15), computed from the day's captured DraftKings
 *   prices (measured holds: main spread 4.75%, alt ladders ≈ 7%).
 * - Tonight: Work Order 0 input packet (ESPN/DraftKings pull 2026-10-15
 *   10:31–10:36 AM CT) + the day's line-archive stamps.
 * - Ingestion + Layer 2: ingestion ledger 2026-10-15 (279 census rows,
 *   branch motif/ingestion-ledger-2026-10-15, intelligence/ingestion/).
 * - Situational graph: v1, branch motif/situational-graph-v1-2026-10-15
 *   (@ db0ef37); SEA@DEN instance stamped from 2026-10-11 inputs.
 * - Gates: Oct 13 gate census (229 rows) as parsed by gate-wiring batch 1
 *   (branch motif/gate-wiring-batch1-2026-10-15 @ f9d04d6).
 */

export const PROGRAM_REVIEW = {
  asOf: "2026-10-15",

  /** Standing banner. Nothing on the page is a pick, a price, or a probability. */
  emission: {
    state: "ZERO_OBJECT",
    rvc: "NOT_CLEARED",
    banner:
      "Emission state: ZERO_OBJECT · RVC NOT_CLEARED — nothing on this page is a pick, a price, or a probability. This is the internal program record, rendered for owner review.",
  },

  frozenBook: {
    filter:
      "Frozen filter — REG 2017 W1 through 2026 W5, n = 2,462 games, μ = +spread_line (the closing line), harness-locked. The book is CLOSED and byte-reproducible.",
    baseline: {
      label: "Baseline — homoscedastic Gaussian",
      crps: "7.154021",
      status: "VERIFIED — reproduced inside 5e-7 by two independent lanes",
    },
    bestVerified: {
      label: "Best verified — family-2 (heteroscedastic β_T + key-number atoms)",
      crps: "7.133199",
      status: "VERIFIED — DIAGNOSTIC only. Promotion: none.",
    },
    bar: {
      label: "The bar",
      crps: "7.099",
      status: "NOT CLEARED",
      note: "Gap from best verified: 0.034199. Game-to-game noise on the paired difference is 0.293745 — one season (~272 games) cannot resolve a gap this size; its detection floor (≈ 0.0499) is larger than the whole gap.",
    },
  },

  forwardProgram: {
    ratified:
      "Ratified by the owner 2026-10-15. FREEZE-1 executed and landed on branch motif/spec-freeze1-2026-10-15 (FREEZE-1.json certificate, remote-verified). The FINAL freeze comes later, before any scoring; no scoring has run.",
    specA: {
      name: "SPEC-A — Future-Filter Evaluation Contract (FFW-26)",
      status: "FROZEN at FREEZE-1",
      lines: [
        "Window: 2026 Week 6 onward, regular season; games enter only through the line archiver.",
        "μ = the archived line at T_emit = kickoff − 90 min (closest stamped capture not after T_emit). The close is a diagnostic covariate only, never the graded line.",
        "Baseline: point-in-time expanding-refit homoscedastic Gaussian. The frozen 7.154021 is not carried over.",
        "Gate: relative paired ΔCRPS — pass requires Δ̂ < 0, the one-sided 95% paired-bootstrap bound (B = 10,000) excluding 0, and Holm-adjusted p < 0.05, scored on the full set.",
      ],
    },
    candidate1: {
      name: "Candidate #1 — PRJ-1 (pit_round2 joint)",
      composition:
        "One composed distribution: integer lattice + family-2 width (heteroscedastic σ) + Student-t kernel, variance-matched + family-2 key-number atoms, under an exact mean lock.",
      status:
        "PRE-REGISTERED candidate #1 — composition ratified in RULING-C1 at FREEZE-1; binding PENDING-BIND (the code + hash freeze build is in flight, branch motif/prj1-freeze-2026-10-15). Never run on the closed frozen filter.",
    },
    situationalSlot: {
      name: "SPESE — situational slot",
      status:
        "SLOTTED — the one situational survivor of the kill-only screen holds a future-filter pre-registration slot. Weight 0. No gate progress claimed.",
    },
    products: {
      name: "Products (SPEC-B)",
      status:
        "DECOUPLED — the product gate is separate from the CRPS gate (SPEC-B §7.3, ratified). Products clear on their own bettable metrics.",
      bar: "Break-even bar: the break-even BASIS is adopted for the product track (owner decision 5.5: the CRPS bar stays unchanged for the research ledger; products use break-even). The mapping artifact has landed from real captured DraftKings prices — tonight's single-game scale: combined spread products ≈ 0.006 CRPS (alternate lines 0.003841; key-number/push 0.002385). The binding value is recomputed across all captured ladders and binds at FINAL. Teasers: not mappable — teaser prices have never been archived. NO_BET carries no bar: it is the zero-edge default output.",
      priceable: [
        "Alternate lines",
        "Key-number / push products",
        "Teasers — calibrated tails only",
        "NO_BET as a product",
      ],
      gap: "Totals products: SPEC GAP — no totals distribution exists yet.",
    },
  },

  tonight: {
    gameKey: "2026_06_SEA_DEN",
    matchup: "Seattle Seahawks (3–2) @ Denver Broncos (3–2)",
    kickoff: "Thursday, October 15, 2026 — 7:15 PM CT",
    venue: "Empower Field at Mile High, Denver — 5,280 ft",
    line: {
      spread: "SEA −2.5",
      total: "40.5",
      moneyline: "SEA −142 / DEN +120",
      note: "DraftKings via ESPN. Unmoved through the day's stamps (12:15 PM OPEN, 1:13 PM and 2:17 PM INTERIM).",
    },
    injuries: [
      { team: "DEN", player: "Pat Surtain II", status: "OUT", detail: "ankle — CB1" },
      { team: "DEN", player: "Talanoa Hufanga", status: "OUT", detail: "ankle — starting safety" },
      { team: "DEN", player: "Riley Moss", status: "QUESTIONABLE", detail: "ribs — the 5:40 PM inactives watch item" },
      { team: "SEA", player: "Zach Charbonnet", status: "OUT", detail: "knee (ACL) — RB2" },
    ],
    archiver: {
      mainLineRows: 252,
      altRows: 178,
      note: "Line-archive stamps captured today, as of this record (2026-10-15): 252 main-line rows across the in-window slate; 178 alternate-ladder rows for SEA@DEN (the keyed leg's live capture — alternate ladders are captured per featured game, and tonight's is this one).",
    },
  },

  ingestion: {
    total: 279,
    withHome: 116,
    queue: 163,
    target: "Standing order: 200+ signals minimum. Ingestion is universal and ungated — gates rule emission and promotion, never knowledge.",
    homes: [
      { label: "Situational-graph edge families", count: 11 },
      { label: "Shadow ledgers", count: 34 },
      { label: "Stamped reasoning templates", count: 9 },
      { label: "Calibration substrate", count: 40 },
      { label: "Negative registry (refusals kept as in-engine status)", count: 22 },
    ],
  },

  layer2: {
    intro:
      "Layer 2 is the reasoning layer: the market close is Layer 1, and understanding is the edge. This section renders its depth as measured today — honestly labeled, not inflated.",
    reasoningAvailability: {
      total: 279,
      note: "Today's depth: only 2 of 279 cataloged signals are invocable as live stamped edges. The rest are qualitative, fence-only, refusal-only, or dark until a named build lands. That thinness is the record, shown on purpose.",
      rows: [
        { label: "YES — Layer 2 invokes it today as a stamped edge", count: 2 },
        { label: "QUALITATIVE — invocable in authored reads / readable shadow data", count: 18 },
        { label: "FENCE — operative as a gate: it can veto, never assert", count: 9 },
        { label: "REFUSAL-ONLY — the refusal is citable knowledge; the construct is never invoked", count: 21 },
        { label: "NO — dark until a named build lands", count: 229 },
      ],
    },
    situationalGraph: {
      name: "Situational graph v1",
      status:
        "LANDED (branch motif/situational-graph-v1-2026-10-15) — point-in-time visible_at enforced; validation rejects score/pick/probability/emission keys at any depth. An edge type not in the registry cannot appear in a graph.",
      edgeTypes: {
        label: "The 14 registered edge types",
        rows: [
          { type: "pressure_matchup", kind: "measured — admitted (walk-forward r = 0.241)" },
          { type: "fourth_down_go_rate", kind: "measured — dark (below the admission bar)" },
          { type: "special_teams_epa", kind: "measured — dark (wrong-way, not sign-flipped)" },
          { type: "injury_burden", kind: "measured — diagnostic; refused as a scoring feature, carried as roster fact" },
          { type: "rest_differential", kind: "measured — schedule fact" },
          { type: "altitude", kind: "measured — static venue fact" },
          { type: "coaching_change", kind: "measured input — verified tenure fact" },
          { type: "weather_extreme", kind: "measured input — formalized, awaits a stamped forecast feed" },
          { type: "atmosphere", kind: "formalized read — authored, stamped, never generated" },
          { type: "layered_revenge", kind: "formalized read" },
          { type: "logistical_disruption", kind: "formalized read" },
          { type: "altitude_short_week", kind: "composite — derived from altitude + rest inputs" },
          { type: "coaching_honesty", kind: "formalized read — proxy defined; statement log does not exist yet" },
          { type: "injury_context_identity", kind: "formalized read" },
        ],
      },
      seaDen: {
        label: "SEA@DEN instance (built 2026-10-15 from stamped inputs; edge stamps as of 2026-10-11)",
        lines: [
          "Rest: 4 days each, differential 0 — both teams carry the SHORT_WEEK state; the game carries THURSDAY_GAME.",
          "Altitude edge: SEA visits Denver at 5,280 ft (at-altitude threshold 4,000 ft).",
          "Composite fired: altitude_short_week against the visitor (SEA) — at altitude on a short week.",
        ],
      },
    },
    templates: {
      label: "Stamped reasoning templates — the 9 on record",
      note: "Layer-2 qualitative reads with defined stamp discipline. Invoked in authored reads, never auto-emitted. Every one carries emission ZERO_OBJECT.",
      rows: [
        { id: "C-014", name: "Weather scale", family: "weather", reasoning: "QUALITATIVE" },
        { id: "C-016", name: "Atmosphere", family: "atmosphere", reasoning: "QUALITATIVE" },
        { id: "C-017", name: "Layered revenge", family: "layered revenge", reasoning: "QUALITATIVE" },
        { id: "C-018", name: "Logistical disruption", family: "logistical disruption", reasoning: "QUALITATIVE" },
        { id: "C-019", name: "Circadian / coast mismatch", family: "circadian / coast mismatch", reasoning: "QUALITATIVE" },
        { id: "C-022", name: "Altitude + short week", family: "altitude + short week composite", reasoning: "YES — fired for SEA@DEN" },
        { id: "C-023", name: "Coaching honesty", family: "coaching honesty", reasoning: "QUALITATIVE" },
        { id: "C-024", name: "Injury context (identity)", family: "injury context (identity)", reasoning: "QUALITATIVE" },
        { id: "C-182", name: "gse-weather-edge module", family: "weather", reasoning: "NO — built, not wired" },
      ],
    },
    deepeningBuilds: {
      label: "Deepening builds in flight",
      rows: [
        {
          id: "C-224",
          name: "Bridge model (bridge-model.ts)",
          status: "IN BUILD",
          note: "The missing bridge: converts the 47 registered signals' context scalars into directional premises. Ranked #1 in the wiring queue by reasoning value.",
        },
        {
          id: "C-075",
          name: "Adjustment layer v1",
          status: "IN BUILD",
          note: "The Layer-2 adjustment grammar — 7 families: TRIGGER → AFFECTED → DIRECTION → MAGNITUDE → LOG. Spec is on main; the build wires it.",
        },
        {
          id: "—",
          name: "LLM-analyst dossier pipeline",
          status: "IN BUILD",
          note: "The held reasoning-layer build from the 2026-10-13 spec batch: the analyst layer that authors Layer-2 reads over the ingested record.",
        },
      ],
    },
  },

  gates: {
    wiredLive: 11,
    censusNote:
      "Oct 13 gate census: 229 rows — 11 wired-live, 182 landed-not-wired (170 prediction-engine modules + 12 engine gates), the rest quarantined, spec-only, or not found.",
    shadowBatch1: {
      label: "Gate-wiring batch 1 — wired as shadows, weight 0 (branch motif/gate-wiring-batch1-2026-10-15)",
      rows: [
        { id: "G-22", name: "CSRF guard" },
        { id: "G-25", name: "Numeric guard" },
        { id: "G-21", name: "Age gate" },
        { id: "PE-125", name: "markets/spread-win-probability-table — scoring utilities only; its P(Win|PS) gate is recorded NOT EVALUATED" },
        { id: "PE-048", name: "decision/totals-abstention-sigma — totals publish/abstain decision, ENABLED = false" },
      ],
    },
    batch2: "Gate-wiring batch 2: IN BUILD — the next five from the exposure triage, same shadow discipline (weight 0, defects pinned, never silently fixed).",
  },
} as const;

export type ProgramReviewData = typeof PROGRAM_REVIEW;
