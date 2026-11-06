#!/usr/bin/env node
// GB-4: retro script — greenBoardEligible over settled published picks.
// Read-only. Pure computation, no persistence changes.
// Per dispatch: "run over ALL settled published picks, report overall + per-sport
// and report WHATEVER it says, including greens underperform — that is valuable."
// HARD RULE: don't adjust thresholds; they are fixed.

const fs = require("fs");
const path = require("path");

const GREEN_P_MIN = 0.70;
const INDEPENDENT_DISSENT_BAND = 0.06;

console.log("=== GB-4 RETRO (pure computation) ===");
console.log("Thresholds (fixed): GREEN_P_MIN =", GREEN_P_MIN,
            "| DISSENT_BAND =", INDEPENDENT_DISSENT_BAND);
console.log("This is a READ-ONLY computation script — no DB mutations.");
console.log("Full implementation depends on access to settled pick records.");
console.log("Expected output: docs/ops/calibration/2026-08-28-green-retro/RESULTS.md");
console.log("Status: IMPLEMENTATION FRAMEWORK IN PLACE — needs settlement data source.");
