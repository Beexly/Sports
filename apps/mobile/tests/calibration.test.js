"use strict";
/**
 * Calibration mathematics tests.
 *
 * Clopper-Pearson is checked against published reference values, because a
 * subtly wrong interval is worse than no interval: it looks authoritative.
 */

const test = require("node:test");
const assert = require("node:assert/strict");

const cal = require("/tmp/gsebuild/lib/calibration.js");

/* ── Brier ─────────────────────────────────────────────────────────────── */

test("brier: a perfect forecast scores 0", () => {
  assert.equal(cal.brierScore([{ stated: 1, outcome: 1 }, { stated: 0, outcome: 0 }]), 0);
});

test("brier: a perfectly wrong forecast scores 1", () => {
  assert.equal(cal.brierScore([{ stated: 1, outcome: 0 }]), 1);
});

test("brier: a constant 0.5 forecast scores 0.25 — the declared baseline", () => {
  const pairs = [{ stated: 0.5, outcome: 1 }, { stated: 0.5, outcome: 0 }];
  assert.equal(cal.brierScore(pairs), cal.BRIER_BASELINE);
});

test("brier: null on no data, never 0", () => {
  assert.equal(cal.brierScore([]), null);
});

test("brierRead bands are the server's bands", () => {
  assert.match(cal.brierRead(null), /Not enough settled picks/);
  assert.match(cal.brierRead(0.17), /^Sharp\./);
  assert.match(cal.brierRead(0.18), /^Sharp\./);
  assert.match(cal.brierRead(0.24), /Better than a coin flip/);
  assert.match(cal.brierRead(0.26), /Above the coin-flip baseline/);
});

/* ── Clopper-Pearson against published reference values ────────────────── */

test("clopperPearson(20, 30) matches the reference interval", () => {
  const ci = cal.clopperPearson(20, 30);
  assert.ok(ci);
  assert.ok(Math.abs(ci.lower - 0.4719) < 0.001, `lower was ${ci.lower}`);
  assert.ok(Math.abs(ci.upper - 0.8271) < 0.001, `upper was ${ci.upper}`);
});

test("clopperPearson(0, 10) has a zero lower bound", () => {
  const ci = cal.clopperPearson(0, 10);
  assert.ok(ci);
  assert.equal(ci.lower, 0);
  assert.ok(Math.abs(ci.upper - 0.3085) < 0.002, `upper was ${ci.upper}`);
});

test("clopperPearson(10, 10) has a one upper bound", () => {
  const ci = cal.clopperPearson(10, 10);
  assert.ok(ci);
  assert.equal(ci.upper, 1);
  assert.ok(Math.abs(ci.lower - 0.6915) < 0.002, `lower was ${ci.lower}`);
});

test("clopperPearson bounds always bracket the point estimate", () => {
  for (const [wins, n] of [[5, 10], [1, 3], [47, 100], [2, 30], [29, 30]]) {
    const ci = cal.clopperPearson(wins, n);
    assert.ok(ci, `no interval for ${wins}/${n}`);
    const p = wins / n;
    assert.ok(ci.lower <= p + 1e-9, `${wins}/${n}: lower ${ci.lower} > point ${p}`);
    assert.ok(ci.upper >= p - 1e-9, `${wins}/${n}: upper ${ci.upper} < point ${p}`);
  }
});

test("clopperPearson is monotone in wins at fixed n", () => {
  let previous = -1;
  for (let wins = 0; wins <= 20; wins += 1) {
    const ci = cal.clopperPearson(wins, 20);
    assert.ok(ci);
    assert.ok(ci.lower > previous, `lower bound not increasing at wins=${wins}`);
    previous = ci.lower;
  }
});

test("clopperPearson rejects impossible inputs rather than returning a fake interval", () => {
  assert.throws(() => cal.clopperPearson(11, 10), /outside/);
  assert.throws(() => cal.clopperPearson(-1, 10), /outside/);
  assert.equal(cal.clopperPearson(0, 0), null);
});

/* ── Discrimination ────────────────────────────────────────────────────── */

function bucket(label, predicted, wins, decided) {
  return { label, predicted, wins, decided, n: decided };
}

test("discrimination: insufficient below the 20-pick floor", () => {
  const read = cal.readDiscrimination([bucket("low", 0.4, 5, 19), bucket("high", 0.8, 15, 19)]);
  assert.equal(read.trend, "insufficient");
  assert.equal(read.ratesPublishable, false);
});

test("discrimination: improving when high confidence wins more", () => {
  const read = cal.readDiscrimination([bucket("low", 0.4, 12, 40), bucket("high", 0.8, 30, 40)]);
  assert.equal(read.trend, "improving");
  assert.equal(read.ratesPublishable, true);
  assert.ok(read.spread !== null && read.spread > 0.4);
});

test("discrimination: INVERTED is reported, not hidden", () => {
  const read = cal.readDiscrimination([bucket("low", 0.4, 30, 40), bucket("high", 0.8, 12, 40)]);
  assert.equal(read.trend, "inverted");
  assert.match(cal.VERDICT_META.inverted.label, /Higher confidence is winning less/);
});

test("discrimination: a tiny spread reads flat, not as a finding", () => {
  const read = cal.readDiscrimination([bucket("low", 0.4, 20, 40), bucket("high", 0.8, 21, 40)]);
  assert.equal(read.trend, "flat");
});

test("discrimination: 20-29 decided reads the direction but WITHHOLDS the rates", () => {
  // The exact asymmetry the web panel implements: discrimination floor 20,
  // publish floor 30, and the rate-bearing note gated on the publish floor.
  const read = cal.readDiscrimination([bucket("low", 0.4, 7, 25), bucket("high", 0.8, 17, 25)]);
  assert.equal(read.trend, "improving");
  assert.equal(read.ratesPublishable, false);
  assert.equal(read.lowestBucketWinRate, null);
  assert.equal(read.highestBucketWinRate, null);
  assert.equal(read.spread, null);
  assert.match(read.note, /withheld until they clear it/);
  assert.doesNotMatch(read.note, /%/, "a sub-30 bucket leaked a concrete win rate");
});

test("discrimination: each endpoint is judged against the publish floor independently", () => {
  const read = cal.readDiscrimination([bucket("low", 0.4, 6, 20), bucket("high", 0.8, 35, 40)]);
  assert.equal(read.ratesPublishable, false, "one sub-30 endpoint must gate both rates");
});

/* ── Curve gate ────────────────────────────────────────────────────────── */

test("curve renders only at the publish floor", () => {
  assert.equal(cal.canRenderCurve(29), false);
  assert.equal(cal.canRenderCurve(30), true);
  assert.match(cal.collectingCopy(12), /^12\/30 settled picks\./);
});

/* ── Confidence bands ──────────────────────────────────────────────────── */

test("every 0-100 score lands in exactly one band", () => {
  for (let score = 0; score <= 100; score += 1) {
    const band = cal.bandForConfidence(score);
    assert.ok(score >= band.lower && score <= band.upper, `${score} fell outside ${band.label}`);
  }
});

test("bands tile the whole 0-100 range with no gaps and no overlap", () => {
  const ascending = [...cal.CONFIDENCE_BANDS].sort((a, b) => a.lower - b.lower);
  assert.equal(ascending[0].lower, 0, "the lowest band must start at 0");
  assert.equal(ascending[ascending.length - 1].upper, 100, "the highest band must end at 100");
  for (let i = 1; i < ascending.length; i += 1) {
    assert.equal(
      ascending[i].lower,
      ascending[i - 1].upper + 1,
      `gap or overlap between ${ascending[i - 1].label} and ${ascending[i].label}`,
    );
  }
});

test("the FIELD palette collapse is represented honestly: only one accent band", () => {
  // If someone re-introduces four hues, this test fails and the author has to
  // reconcile with the token file, which is the point.
  const accented = cal.CONFIDENCE_BANDS.filter((b) => b.accent);
  assert.equal(accented.length, 1);
});

test("bands are distinguished by fill weight, so colour is never the only cue", () => {
  const fills = cal.CONFIDENCE_BANDS.map((b) => b.fill);
  assert.equal(new Set(fills).size, fills.length, "two bands share a fill weight");
});
