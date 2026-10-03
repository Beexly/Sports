import { test } from "node:test";
import * as assert from "node:assert/strict";
import { aliasScoreFill, canonicalScoreFill } from "./game-merge-score-fill";

const FINAL = "FINAL";
const row = (status, home, away) => ({ status, homeScore: home, awayScore: away });

test("canonical: complete pair is never touched", () => {
  const out = canonicalScoreFill(row(FINAL, 24, 17), [row(FINAL, 10, 3)]);
  assert.deepEqual(out, {});
});

test("canonical (C-67): PARTIAL pair fills from a clean FINAL alias", () => {
  // home set, away null — the old `&&` blocked this forever.
  const out = canonicalScoreFill(row("SCHEDULED", 24, null), [row(FINAL, 21, 17)]);
  assert.deepEqual(out, { homeScore: 21, awayScore: 17, status: "FINAL" });
});

test("canonical (C-67): null-home partial pair also fills", () => {
  const out = canonicalScoreFill(row(FINAL, null, 17), [row(FINAL, 21, 20)]);
  assert.deepEqual(out, { homeScore: 21, awayScore: 20 });
});

test("canonical: FINAL canonical keeps its status label on fill", () => {
  const out = canonicalScoreFill(row(FINAL, null, null), [row(FINAL, 7, 0)]);
  assert.deepEqual(out, { homeScore: 7, awayScore: 0 });
});

test("canonical: non-FINAL alias with a full pair is ignored", () => {
  const out = canonicalScoreFill(row("SCHEDULED", null, null), [row("IN_PROGRESS", 3, 0)]);
  assert.deepEqual(out, {});
});

test("canonical: alias with a one-sided score is ignored (pair doctrine)", () => {
  const out = canonicalScoreFill(row("SCHEDULED", null, null), [row(FINAL, 21, null)]);
  assert.deepEqual(out, {});
});

test("canonical: fills only from the first clean FINAL alias", () => {
  const out = canonicalScoreFill(row("SCHEDULED", null, null), [
    row("SCHEDULED", 1, 2),
    row(FINAL, 21, 17),
    row(FINAL, 30, 28),
  ]);
  assert.deepEqual(out, { homeScore: 21, awayScore: 17, status: "FINAL" });
});

test("alias: empty alias gets the canonical's terminal pair", () => {
  const out = aliasScoreFill(row(FINAL, 24, 17), row("SCHEDULED", null, null));
  assert.deepEqual(out, { status: FINAL, homeScore: 24, awayScore: 17 });
});

test("alias: partial alias pair stays partial (never invent a half)", () => {
  assert.deepEqual(aliasScoreFill(row(FINAL, 24, 17), row("SCHEDULED", 10, null)), {});
  assert.deepEqual(aliasScoreFill(row(FINAL, 24, 17), row("SCHEDULED", null, 7)), {});
});

test("alias: canonical without a full pair fills nothing", () => {
  assert.deepEqual(aliasScoreFill(row(FINAL, 24, null), row("SCHEDULED", null, null)), {});
  assert.deepEqual(aliasScoreFill(row("SCHEDULED", null, null), row("SCHEDULED", null, null)), {});
});
