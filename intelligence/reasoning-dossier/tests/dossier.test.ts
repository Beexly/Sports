// Hermetic tests for the reasoning-dossier pipeline. The analyst is mocked;
// no test calls a model, the network, or the Nous connector.

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type { AnalystClient } from "../src/analyst.ts";
import { dossierFromResponse, generateDossier, templateFilledDossier } from "../src/dossier.ts";
import { FenceError, validateDossier } from "../src/fence.ts";
import { buildManifest, StampError } from "../src/inputs.ts";
import { buildPrompt } from "../src/prompt.ts";
import { REASONING_TEMPLATES } from "../src/templates.ts";
import type { Dossier, GameBundle, GraphInstance } from "../src/types.ts";

const KICKOFF = "2026-10-16T00:15:00Z";

function baseBundle(): GameBundle {
  return {
    game_key: "2026_06_SEA_DEN",
    title: "Seattle Seahawks at Denver Broncos — Thu Oct 15, 2026",
    kickoff: KICKOFF,
    as_of_cutoff: "2026-10-15T19:40:00Z",
    line: {
      book: "draftkings (espn-public)",
      favorite: "SEA",
      spread_home: 2.5,
      spread_price_home: -108,
      spread_price_away: -112,
      total: 40.5,
      over_price: -110,
      under_price: -110,
      moneyline_home: 120,
      moneyline_away: -142,
      captured_at: "2026-10-15T19:17:38.712Z",
      source_ref: "line archive 2026-10-15 INTERIM capture",
    },
    facts: [
      {
        id: "fact:injury-designations",
        kind: "injury_designations",
        label: "Final injury designations",
        stamp: "2026-10-15T15:36:00Z",
        source_ref: "WO-0 input packet",
        payload: { denver_out: ["Pat Surtain II"] },
      },
      {
        id: "fact:weather",
        kind: "weather",
        label: "Kickoff weather",
        stamp: "2026-10-15T15:36:00Z",
        source_ref: "WO-0 input packet",
        payload: { temp_f: 54 },
      },
      {
        id: "fact:schedule",
        kind: "schedule",
        label: "Schedule / rest facts",
        stamp: "2026-10-15T15:36:00Z",
        source_ref: "WO-0 input packet",
        payload: { sea_days_rest: 4, den_days_rest: 4 },
      },
    ],
    authored_reads: [
      {
        template_id: "injury-context-identity",
        text: "Denver's secondary loses its anchor and its eraser in the same week.",
        stamp: "2026-10-15T15:36:00Z",
        source_ref: "WO-0 input packet §3",
        gaps: ["prior-usage / snap map not supplied"],
      },
    ],
    shadow_reads: [
      {
        id: "shadow:receiver-tracking",
        label: "Receiver tracking shadow read",
        status: "NO_DATA_FOR_GAME",
        as_of: "2026-10-15T15:36:00Z",
        note: "No tracking read exists for this game pre-kickoff.",
      },
    ],
  };
}

function baseGraph(): GraphInstance {
  return {
    graph: "situational-graph",
    version: "1.0.0",
    generated_at: "2026-10-15T14:10:04Z",
    nodes: [],
    edges: [
      {
        id: "e1",
        type: "rest_state",
        from: "team:SEA",
        to: "game:2026_06_SEA_DEN",
        game: "2026_06_SEA_DEN",
        value: { days_rest: 4 },
        source: { kind: "derived", ref: "nflverse schedules" },
        as_of: "2026-10-12T04:30:00Z",
      },
      {
        id: "e2",
        type: "venue_altitude",
        from: "venue:DEN",
        to: "game:2026_06_SEA_DEN",
        game: "2026_06_SEA_DEN",
        value: { altitude_ft: 5280 },
        source: { kind: "venue_static", ref: "venue file" },
        as_of: null,
      },
      {
        id: "e3",
        type: "altitude_short_week",
        from: "team:SEA",
        to: "game:2026_06_SEA_DEN",
        game: "2026_06_SEA_DEN",
        value: { fires: true },
        source: { kind: "derived", ref: "composite" },
        as_of: "2026-10-12T04:30:00Z",
      },
    ],
    honest_empty: [
      { edge_type: "injury_burden", missing: ["date_modified"], reason: "injury file carries no stamp column" },
    ],
  };
}

function goodSections(): Record<string, { text: string; cites: string[] }[]> {
  return {
    situation: [
      { text: "The market's starting point has Seattle favored by 2.5 with a total of 40.5, cited as-is.", cites: ["line:archived"] },
      { text: "The altitude plus short week composite fires for the visiting team.", cites: ["edge:e3", "template:altitude-short-week"] },
    ],
    personnel: [
      { text: "Denver's final designations remove the top of the secondary.", cites: ["fact:injury-designations", "read:injury-context-identity"] },
    ],
    context_intangibles: [
      { text: "Kickoff weather is mild and reads as a non-factor in the spot.", cites: ["fact:weather", "template:weather"] },
    ],
    market_may_not_read: [
      { text: "The tracking shadow data lane returned no data for this game, so nothing is read into separation either way.", cites: ["shadow:receiver-tracking"] },
    ],
    what_would_change: [
      { text: "A questionable starter's final status at inactives would change the personnel read.", cites: ["fact:injury-designations"] },
    ],
  };
}

const mockClient = (sections: Record<string, unknown>): AnalystClient => ({
  async complete() {
    return { text: JSON.stringify(sections), model_id: "test/mock-1", usage: { total_tokens: 10 } };
  },
});

describe("stamp enforcement", () => {
  test("unstamped archived line is refused", () => {
    const b = baseBundle();
    (b.line as { captured_at: string }).captured_at = "";
    assert.throws(() => buildManifest(b, baseGraph()), StampError);
  });

  test("unstamped injury fact is refused", () => {
    const b = baseBundle();
    (b.facts[0] as { stamp: string }).stamp = "";
    assert.throws(() => buildManifest(b, baseGraph()), /no valid stamp/);
  });

  test("fact stamped after kickoff is refused (PIT)", () => {
    const b = baseBundle();
    b.facts[0].stamp = "2026-10-16T01:00:00Z";
    assert.throws(() => buildManifest(b, baseGraph()), /after kickoff/);
  });

  test("unstamped non-static edge is refused", () => {
    const g = baseGraph();
    g.edges[0].as_of = null; // rest_state is derived, not static
    assert.throws(() => buildManifest(baseBundle(), g), /not static reference data/);
  });

  test("unstamped static edges are admitted as static", () => {
    const m = buildManifest(baseBundle(), baseGraph());
    const alt = m.entries.find((e) => e.id === "edge:e2");
    assert.equal(alt?.stamp?.kind, "static");
  });

  test("manifest hash is stable and 64-hex", () => {
    const a = buildManifest(baseBundle(), baseGraph());
    const b = buildManifest(baseBundle(), baseGraph());
    assert.equal(a.sha256, b.sha256);
    assert.match(a.sha256, /^[0-9a-f]{64}$/);
  });
});

describe("template registry", () => {
  test("exactly the nine ledger templates are registered", () => {
    assert.deepEqual(
      REASONING_TEMPLATES.map((t) => t.id).sort(),
      [
        "altitude-short-week",
        "atmosphere",
        "circadian-coast-mismatch",
        "coaching-honesty",
        "injury-context-identity",
        "layered-revenge",
        "logistical-disruption",
        "weather",
        "weather-scale",
      ],
    );
  });

  test("worked-example statuses: composite applied, revenge/coaching honest-empty", () => {
    const m = buildManifest(baseBundle(), baseGraph());
    const status = (id: string) =>
      (m.entries.find((e) => e.id === `template:${id}`)?.payload as { status: string }).status;
    assert.equal(status("altitude-short-week"), "APPLIED");
    assert.equal(status("injury-context-identity"), "APPLIED_PARTIAL"); // snap-map gap
    assert.equal(status("layered-revenge"), "NO_INPUT");
    assert.equal(status("coaching-honesty"), "NO_INPUT");
  });
});

describe("fence validator", () => {
  test("a clean live dossier passes", async () => {
    const m = buildManifest(baseBundle(), baseGraph());
    const d = await generateDossier(m, baseBundle().title, mockClient(goodSections()));
    assert.equal(d.emission, "ZERO_OBJECT");
    assert.equal(d.provenance.mode, "live-model");
    assert.equal(d.provenance.model_id, "test/mock-1");
  });

  test("planted pick key in a claim object is rejected", async () => {
    const m = buildManifest(baseBundle(), baseGraph());
    const sections = goodSections();
    (sections.situation[0] as Record<string, unknown>).pick = "DEN +2.5";
    await assert.rejects(() => generateDossier(m, "t", mockClient(sections)), FenceError);
  });

  test("planted pick language in prose is rejected", async () => {
    const m = buildManifest(baseBundle(), baseGraph());
    const sections = goodSections();
    sections.market_may_not_read[0].text = "Denver will cover the number tonight.";
    await assert.rejects(() => generateDossier(m, "t", mockClient(sections)), /banned phrase/);
  });

  test("planted probability language is rejected", async () => {
    const m = buildManifest(baseBundle(), baseGraph());
    const sections = goodSections();
    sections.situation[0].text = "Seattle has a 62% chance to win this game.";
    await assert.rejects(() => generateDossier(m, "t", mockClient(sections)), /banned phrase/);
  });

  test("naming the shadow source family is rejected", async () => {
    const m = buildManifest(baseBundle(), baseGraph());
    const sections = goodSections();
    sections.market_may_not_read[0].text = "Next Gen Stats tracking shows nothing for this game.";
    await assert.rejects(() => generateDossier(m, "t", mockClient(sections)), /banned phrase/);
  });

  test("citation completeness: uncited claim is rejected", async () => {
    const m = buildManifest(baseBundle(), baseGraph());
    const sections = goodSections();
    sections.personnel[0].cites = [];
    await assert.rejects(() => generateDossier(m, "t", mockClient(sections)), /carries no citation/);
  });

  test("citation completeness: unknown cite is rejected", async () => {
    const m = buildManifest(baseBundle(), baseGraph());
    const sections = goodSections();
    sections.personnel[0].cites = ["fact:does-not-exist"];
    await assert.rejects(() => generateDossier(m, "t", mockClient(sections)), /unknown input/);
  });

  test("template-filled dossier passes and carries no model id", () => {
    const m = buildManifest(baseBundle(), baseGraph());
    const d = templateFilledDossier(m, baseBundle().title);
    assert.equal(d.provenance.mode, "template-filled");
    assert.equal(d.provenance.model_id, null);
    validateDossier(d, m); // must not throw
  });

  test("provenance tampering is rejected: template-filled with a model id", () => {
    const m = buildManifest(baseBundle(), baseGraph());
    const d: Dossier = templateFilledDossier(m, baseBundle().title);
    (d.provenance as { model_id: string | null }).model_id = "sneaky/model";
    assert.throws(() => validateDossier(d, m), /must not carry a model_id/);
  });

  test("provenance tampering is rejected: manifest hash mismatch", () => {
    const m = buildManifest(baseBundle(), baseGraph());
    const d = dossierFromResponse(m, "t", JSON.stringify(goodSections()), "test/mock-1", null);
    (d.provenance as { input_manifest_sha256: string }).input_manifest_sha256 = "0".repeat(64);
    assert.throws(() => validateDossier(d, m), /does not match manifest/);
  });
});

describe("prompt", () => {
  test("prompt carries the manifest hash and every entry id", () => {
    const m = buildManifest(baseBundle(), baseGraph());
    const p = buildPrompt(m);
    assert.ok(p.user.includes(m.sha256));
    for (const e of m.entries) assert.ok(p.user.includes(e.id), `prompt missing ${e.id}`);
    assert.match(p.sha256, /^[0-9a-f]{64}$/);
  });
});
