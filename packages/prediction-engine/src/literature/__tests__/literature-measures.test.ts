/**
 * @file __tests__/literature-measures.test.ts
 * The measure registry must be truthful about the database.
 *
 * WHY THIS TEST EXISTS (2026-10-20)
 * The first draft of the registry named four columns that DO NOT EXIST:
 * next_gen_stats.coverage, player_game_stats.interceptions,
 * player_game_stats.snapsPlayed, and injury.status. They were caught by
 * parsing schema.prisma and checking every (table, column) pair -- and
 * the fix was to use the nearest real surfaces and LABEL EACH AS A PROXY.
 *
 * A registry that names surfaces which do not exist would send the
 * concept-axis grader to write residual rows against a column that is
 * not there, and the failure would look like "the premise never fired"
 * rather than "the registry is wrong". That is the exact failure mode
 * this whole engagement has been fixing.
 *
 * So the registry is verified against the schema, by a test, on every
 * run.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  MEASURE_REGISTRY,
  MEASURE_RESOLUTION_ORDER,
  resolveMeasure,
  directionSign,
  agreementFor,
  conceptActivationScore,
  CONCEPT_MIN_SUPPORT,
  measurableTags,
} from "../literature-measures.js";

const here = dirname(fileURLToPath(import.meta.url));
// packages/prediction-engine/src/literature/__tests__ -> repo root
const REPO = resolve(here, "../../../../..");
const SCHEMA_PATH = resolve(REPO, "packages/db/prisma/schema.prisma");

/** Parse Prisma models into { modelName: Set<fieldName> }. */
function parseSchema(text: string): Map<string, Set<string>> {
  const models = new Map<string, Set<string>>();
  let current: string | null = null;
  for (const line of text.split("\n")) {
    const m = /^model\s+(\w+)\s*\{/.exec(line);
    if (m) {
      current = m[1]!;
      models.set(current, new Set());
      continue;
    }
    if (current && line.trim() === "}") {
      current = null;
      continue;
    }
    if (current) {
      const f = /^\s+(\w+)\s+\w/.exec(line);
      if (f) models.get(current)!.add(f[1]!);
    }
  }
  return models;
}

const SCHEMA = parseSchema(readFileSync(SCHEMA_PATH, "utf8"));

describe("measure registry", () => {
  it("names a table that exists in the schema", () => {
    for (const m of MEASURE_REGISTRY) {
      expect(
        SCHEMA.has(m.table),
        `measure "${m.contextTag}" names table "${m.table}", which is not a model in schema.prisma`,
      ).toBe(true);
    }
  });

  it("names a column that exists on that table", () => {
    for (const m of MEASURE_REGISTRY) {
      const fields = SCHEMA.get(m.table);
      expect(fields, `measure "${m.contextTag}" table "${m.table}" is unknown`).toBeDefined();
      expect(
        fields!.has(m.column),
        `measure "${m.contextTag}" names column "${m.table}.${m.column}", which does not exist on that model`,
      ).toBe(true);
    }
  });

  it("covers every measure with a resolution order entry", () => {
    for (const tag of measurableTags()) {
      expect(
        MEASURE_RESOLUTION_ORDER.includes(tag),
        `measure "${tag}" is missing from MEASURE_RESOLUTION_ORDER`,
      ).toBe(true);
    }
  });

  it("declares a proxy note for every proxy and none for the rest", () => {
    for (const m of MEASURE_REGISTRY) {
      if (m.isProxy) {
        expect(
          m.proxyNote,
          `measure "${m.contextTag}" is a proxy and must say what it stands in for`,
        ).toBeTruthy();
      } else {
        expect(
          m.proxyNote,
          `measure "${m.contextTag}" is not a proxy and must not carry a proxy note`,
        ).toBeNull();
      }
    }
  });

  it("gives every measure a support threshold of at least the corpus floor", () => {
    for (const m of MEASURE_REGISTRY) {
      expect(m.minSupport).toBeGreaterThanOrEqual(CONCEPT_MIN_SUPPORT);
    }
  });
});

describe("measure resolution", () => {
  it("resolves a measurable tag", () => {
    const r = resolveMeasure(["separation"], "positive");
    expect(r.measure).not.toBeNull();
    expect(r.resolvedTag).toBe("separation");
    expect(r.refusal).toBeNull();
  });

  it("refuses a conditional direction", () => {
    // 0 of 5,149 MIND records carry a threshold, so a conditional
    // premise cannot be evaluated and must not be graded.
    const r = resolveMeasure(["separation"], "conditional");
    expect(r.measure).toBeNull();
    expect(r.refusal).toBe("conditional_direction");
  });

  it("refuses a premise with no measurable tag", () => {
    const r = resolveMeasure(["fantasy", "dfs", "gpp"], "positive");
    expect(r.measure).toBeNull();
    expect(r.refusal).toBe("no_measurable_tag");
  });

  it("refuses a premise with no context tags at all", () => {
    const r = resolveMeasure([], "positive");
    expect(r.refusal).toBe("no_context_tags");
  });

  it("refuses a premise with no direction", () => {
    const r = resolveMeasure(["separation"], null);
    expect(r.refusal).toBe("no_direction");
  });

  it("prefers the premise's own tag order over the global priority", () => {
    // 'epa' comes earlier in the global order than 'separation', but the
    // premise listed 'separation' first, so the premise's order wins.
    const r = resolveMeasure(["separation", "epa"], "positive");
    expect(r.resolvedTag).toBe("separation");
  });

  it("falls back to the global priority when the premise's tags do not resolve", () => {
    const r = resolveMeasure(["fantasy", "epa"], "positive");
    expect(r.resolvedTag).toBe("epa");
  });
});

describe("direction and agreement", () => {
  it("maps directions to signs", () => {
    expect(directionSign("positive")).toBe(1);
    expect(directionSign("negative")).toBe(-1);
    expect(directionSign("conditional")).toBeNull();
    expect(directionSign(null)).toBeNull();
  });

  it("agrees when the measured value is on the claimed side", () => {
    // premise claims +1.5 points; the measurement is +1.2
    expect(agreementFor(1.2, 1.5, 1, null)).toBe(1);
    // the measurement went the other way
    expect(agreementFor(-1.2, 1.5, 1, null)).toBe(-1);
  });

  it("agrees on direction when the premise has no magnitude", () => {
    // concept: higher separation -> more production. Observed positive
    // separation, outcome positive -> agreement.
    expect(agreementFor(0.4, null, 1, 1)).toBe(1);
    expect(agreementFor(0.4, null, 1, -1)).toBe(-1);
  });

  it("refuses to judge with no magnitude and no outcome", () => {
    expect(agreementFor(0.4, null, 1, null)).toBeNull();
  });
});

describe("concept activation score", () => {
  it("is zero below the support threshold", () => {
    expect(conceptActivationScore(2, 2)).toBe(0);
    expect(conceptActivationScore(CONCEPT_MIN_SUPPORT - 1, CONCEPT_MIN_SUPPORT - 1)).toBe(0);
  });

  it("is zero at a coin flip", () => {
    expect(conceptActivationScore(5, 10)).toBe(0);
  });

  it("rises with agreement rate and support", () => {
    const s1 = conceptActivationScore(10, 10);
    const s2 = conceptActivationScore(8, 10);
    const s3 = conceptActivationScore(9, 5);
    expect(s1).toBeGreaterThan(s2);
    expect(s2).toBeGreaterThan(0);
    // more agreement on less support is worth less than the same rate on
    // full support
    expect(s2).toBeGreaterThan(s3);
  });

  it("is clipped at zero for a premise that disagrees more than it agrees", () => {
    expect(conceptActivationScore(1, 10)).toBe(0);
  });
});
