import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

test("CV processing script contains no synthetic random metrics or circular EPA fits", () => {
  const scriptPath = path.resolve("scripts/process_all_79_games_w1_5.py");
  const scriptContent = fs.readFileSync(scriptPath, "utf-8");

  // Must not call np.random or rng.normal to generate synthetic optical features
  assert.ok(
    !scriptContent.includes("rng.normal"),
    "Script must not contain rng.normal synthetic feature generation"
  );
  assert.ok(
    !scriptContent.includes("np.random.RandomState"),
    "Script must not seed RandomState to synthesize optical features"
  );

  // Must mark measured=False for unmeasured optical tracking metrics
  assert.ok(
    scriptContent.includes('"measured": False'),
    "Script must explicitly mark optical metrics measured=False"
  );
});

test("CV census JSON marks optical metrics as unmeasured/false", () => {
  const jsonPath = path.resolve("docs/predictions/research/2026-10-17/CV_ALL_GAMES_WEEKS_1_TO_5_CENSUS.json");
  assert.ok(fs.existsSync(jsonPath), "Census JSON must exist");
  const data = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
  assert.equal(data.length, 79, "Must contain all 79 games");

  for (const game of data) {
    assert.equal(game.cv_derived_metrics.measured, false, `Game ${game.game_id} must have measured=false`);
    assert.equal(game.cv_derived_metrics.mean_pocket_depth_yd, null, `Game ${game.game_id} must have null pocket depth`);
    assert.equal(game.cv_derived_metrics.mean_strain, null, `Game ${game.game_id} must have null STRAIN`);
  }
});
