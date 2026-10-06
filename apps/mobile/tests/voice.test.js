"use strict";
/**
 * Brand-voice tests. CLAUDE.md rule 8 is blocking, so these are too.
 */

const test = require("node:test");
const assert = require("node:assert/strict");

const voice = require("/tmp/gsebuild/lib/voice.js");

test("the banned list mirrors the server's positioning vocabulary", () => {
  // The server list, transcribed. If the server adds a phrase, this fails.
  const expected = [
    "AI-powered",
    "AI powered",
    "powered by AI",
    "AI-driven",
    "AI driven",
    "AI-assisted",
    "AI assisted",
    "AI-based",
    "AI based",
    "AI-enabled",
    "AI enabled",
    "AI-generated",
    "AI generated",
    "AI-generated pick",
    "AI-generated picks",
    "AI generated pick",
    "AI generated picks",
    "AI picks",
    "AI pick",
    "our AI",
    "artificial intelligence",
    "machine learning",
    "machine learning model",
    "ML model",
    "AI agents",
    "multimodal intelligence",
  ];
  assert.deepEqual([...voice.BANNED_PHRASES], expected);
});

test("every banned phrase is actually detected, case-insensitively", () => {
  for (const phrase of voice.BANNED_PHRASES) {
    const hit = voice.scanVoice(`This model is ${phrase.toUpperCase()} and proud.`);
    assert.ok(hit.length > 0, `"${phrase}" was not detected`);
  }
});

test("scanVoice reports every occurrence, not just the first", () => {
  const hits = voice.scanVoice("AI picks and AI picks and AI picks");
  assert.equal(hits.length, 3);
});

test("safe replacements come from the vocabulary file", () => {
  assert.equal(voice.SAFE_REPLACEMENTS["AI-powered"], "deterministic scoring");
  assert.equal(voice.SAFE_REPLACEMENTS["machine learning"], "deterministic statistical modeling");
});

test("the sanctioned positioning line passes clean", () => {
  assert.equal(voice.isClean("We're not AI. We're math you can read."), true);
  assert.equal(voice.isClean("Deterministic scoring. Factor model. Factor breakdown."), true);
});

test("certainty and tout language is blocked", () => {
  for (const bad of [
    "Lock of the day",
    "This is a guaranteed winner",
    "A sure thing",
    "Easy money",
    "Risk-free",
    "100% win rate",
    "Max bet",
  ]) {
    assert.ok(voice.scanVoice(bad).length > 0, `"${bad}" was allowed`);
  }
});

test("personified-model language is blocked", () => {
  for (const bad of ["The model thinks this is a good spot", "The model believes the line is wrong", "I predict a win"]) {
    assert.ok(voice.scanVoice(bad).length > 0, `"${bad}" was allowed`);
  }
});

test("emoji are blocked", () => {
  for (const bad of ["🔥 Best pick", "💰 Let's go", "🏆 Winner", "✅ Confirmed"]) {
    assert.ok(voice.scanVoice(bad).length > 0, `"${bad}" was allowed`);
  }
});

test("the sanctioned DATA glyphs are not treated as emoji", () => {
  // The design contract's own glyph list: ↑ ↓ − · →
  const clean = `${"\u2191"}4 ${"\u2193"}2 ${"\u2212"}3.5 ${"\u00B7"} ${"\u2192"} next`;
  const hits = voice.scanVoice(clean).filter((h) => h.kind === "emoji");
  assert.equal(hits.length, 0, `sanctioned glyphs flagged: ${JSON.stringify(hits)}`);
});

test("assertCleanCopy throws — a positioning breach is not a console warning", () => {
  assert.throws(() => voice.assertCleanCopy("hero", "Our AI picks tonight"), /Rule 8 violation/);
  assert.doesNotThrow(() => voice.assertCleanCopy("hero", "Deterministic scoring tonight"));
});

test("safeServerCopy never throws and never renders the violation", () => {
  const cleaned = voice.safeServerCopy("reasoning", "Our AI picks are unbeatable");
  assert.ok(!/our AI/i.test(cleaned));
  assert.match(cleaned, /could not be displayed/);
});

test("safeServerCopy passes clean server text through untouched", () => {
  const text = "Market shape favours the home side; three books agree.";
  assert.equal(voice.safeServerCopy("reasoning", text), text);
});

test("violations carry an index and a suggestion where one exists", () => {
  const hits = voice.scanVoice("An AI-powered engine");
  assert.equal(hits.length, 1);
  assert.equal(hits[0].kind, "banned_phrase");
  assert.equal(hits[0].suggestion, "deterministic scoring");
  assert.equal(hits[0].index, 3);
});
