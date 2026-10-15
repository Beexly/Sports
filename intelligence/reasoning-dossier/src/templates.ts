// The nine stamped reasoning templates (ingestion ledger, 2026-10-15:
// "stamped reasoning template" home, 9 rows). A template is a lens with an
// input contract — not a signal. Applied only when its stamped inputs exist;
// otherwise the dossier records a NO_INPUT honest-empty with the gap named.
// Nothing is invented to fill a template.

export type TemplateStatus = "APPLIED" | "APPLIED_PARTIAL" | "NO_INPUT";

export interface ReasoningTemplate {
  id: string;
  name: string;
  ledger_row: string;
  /** What the analyst examines when this template applies. */
  guidance: string;
  /** Input needs, resolved by inputs.ts against the bundle + graph. */
  needs: ("weather_fact" | "schedule_facts" | "injury_facts" | "authored_read" | "composite_edge")[];
}

export const REASONING_TEMPLATES: ReasoningTemplate[] = [
  {
    id: "weather",
    name: "Weather",
    ledger_row: "C-014 family (weather template)",
    guidance:
      "Kickoff conditions (temperature, wind, precipitation) as stamped pre-kickoff facts. State plainly when weather is a non-factor; never manufacture an adjustment from benign conditions.",
    needs: ["weather_fact"],
  },
  {
    id: "weather-scale",
    name: "Weather scale",
    ledger_row: "C-014 (Weather scale)",
    guidance:
      "The residual-scale surface of the weather template: how conditions bear on the game's scoring environment qualitatively. The feature-store scale computation is not wired; this template is served qualitatively only and the gap is named.",
    needs: ["weather_fact"],
  },
  {
    id: "atmosphere",
    name: "Atmosphere",
    ledger_row: "C-016 (Atmosphere)",
    guidance:
      "Crowd, stage, and building effects (first home game, primetime stage, silent-count pressure) — only as an authored, stamped read. A standard home crowd is not an atmosphere edge.",
    needs: ["authored_read"],
  },
  {
    id: "layered-revenge",
    name: "Layered revenge",
    ledger_row: "C-017 (Layered revenge)",
    guidance:
      "Stacked revenge layers — emotional, schematic, personnel — each layer sourced. A single-layer narrative does not qualify.",
    needs: ["authored_read"],
  },
  {
    id: "logistical-disruption",
    name: "Logistical disruption",
    ledger_row: "C-018 (Logistical disruption)",
    guidance:
      "Travel and schedule chaos (flight delays, sleep loss, disruption events), each event sourced with its own stamp. No reports means no application — silence is not a disruption.",
    needs: ["authored_read"],
  },
  {
    id: "circadian-coast-mismatch",
    name: "Circadian / coast mismatch",
    ledger_row: "circadian / coast mismatch template row",
    guidance:
      "Body-clock and timezone displacement derived deterministically from schedule facts: direction of travel, timezone delta, days since the previous game, kickoff slot. State the size of the displacement honestly; one hour is one hour.",
    needs: ["schedule_facts"],
  },
  {
    id: "altitude-short-week",
    name: "Altitude + short week composite",
    ledger_row: "altitude + short week composite template row",
    guidance:
      "The composite spot: a visiting team at altitude (>= 4,000 ft) on a short week (<= 5 days between games). Elevation recovery and short-turnaround friction stack for the visitor only; the rest differential itself may be zero while the composite still fires.",
    needs: ["composite_edge"],
  },
  {
    id: "coaching-honesty",
    name: "Coaching honesty",
    ledger_row: "coaching honesty template row",
    guidance:
      "Whether a staff's stated game-plan emphasis matches its observed play mix, carried as a rolling stated-vs-observed rate. Requires a stamped statement log; until one exists this template cannot be computed, only named as a gap.",
    needs: ["authored_read"],
  },
  {
    id: "injury-context-identity",
    name: "Injury context (identity)",
    ledger_row: "C-024 (Injury context (identity))",
    guidance:
      "How missing players change a unit's identity — coverage structure, blitz willingness, route tree, backfield shape — player by player, as distinct from a weighted burden count. Requires the final stamped injury report; a prior-usage / snap map completes it.",
    needs: ["injury_facts", "authored_read"],
  },
];

export function templateById(id: string): ReasoningTemplate {
  const t = REASONING_TEMPLATES.find((x) => x.id === id);
  if (!t) throw new Error(`unknown reasoning template: ${id}`);
  return t;
}
