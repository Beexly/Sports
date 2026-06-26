/**
 * Morphology adapters — every existing object lifts losslessly into one ClaimObject grammar.
 *
 * The bar: each adapter's output compiles, validates, stays fixture-only (INFO_ONLY ceiling,
 * watermarked), and a blocked bonus / forbidden provider is refused or capped by the COMPILER (the
 * adapter never sets the expression). Plus the CardClaim → ClaimObject bridge (CardClaim is consumed,
 * not replaced).
 */

import { describe, it, expect } from "vitest";
import {
  matchStatToClaimObject,
  trendToClaimObject,
  predictionTrialToClaimObject,
  oddsPriceToClaimObject,
  marketBloomToClaimObject,
  bonusPassportToClaimObject,
  bookmakerRatingToClaimObject,
  sourceGenomeToClaimObject,
  alertToClaimObject,
  webEvidenceToClaimObject,
  decisionCardToClaimObject,
} from "../morphology-adapters.js";
import { compileClaimObject, validateClaimObject } from "../meaning-compiler.js";
import { matchDerivedStats } from "../../match-derived-stats.js";
import { buildAllTrendPassports } from "../../trend-passport.js";
import { buildAllPredictionTrials } from "../../prediction-court.js";
import { buildAllMarketBloomRecords } from "../../market-bloom.js";
import { buildFixtureAlerts } from "../../watchlist-alerts.js";
import { EVENT_GENOME_FIXTURES } from "../../event-genome-fixtures.js";
import { cardStrengthFromClaims, type CardClaim } from "../../card-claim.js";
import { buildAllBonusPassports, buildBookmakerRating, GENOME_ODDS_API, GENOME_FORBIDDEN } from "@sports/data-intelligence";
import type { RightsEnvelope } from "../claim-object.js";

const soccer = EVENT_GENOME_FIXTURES.soccer;

const WEB_RIGHTS: RightsEnvelope = {
  status: "permission_required", legalVerdict: "RIGHTS_REVIEW", commercialDisplayAllowed: false, publicDisplayAllowed: false,
  storageAllowed: false, derivedUseAllowed: false, modelTrainingAllowed: false, redistributionAllowed: false,
  attributionRequired: true, attributionText: null, ownerApprovalRequired: true, reviewStatus: "UNKNOWN", reviewedAtLabel: null,
};

describe("every adapter compiles to a fixture-capped ClaimObject", () => {
  it("derived stats", () => {
    for (const s of matchDerivedStats(soccer)) {
      const c = compileClaimObject(matchStatToClaimObject(s, soccer.eventId, soccer.sport));
      expect(validateClaimObject(c).ok).toBe(true);
      expect(c.publicExpression).toBe("INFO_ONLY");
      expect(c.fixtureWatermarked).toBe(true);
      expect(c.objectType).toBe("DERIVED_STAT");
    }
  });

  it("trends", () => {
    for (const t of buildAllTrendPassports()) {
      const c = compileClaimObject(trendToClaimObject(t));
      expect(validateClaimObject(c).ok).toBe(true);
      expect(c.publicExpression).toBe("INFO_ONLY");
      expect(c.lifecycle).toBe("FIXTURE");
    }
  });

  it("prediction trials (the overclaim is flagged via risk, never published)", () => {
    for (const p of buildAllPredictionTrials()) {
      const c = compileClaimObject(predictionTrialToClaimObject(p));
      expect(validateClaimObject(c).ok).toBe(true);
      expect(c.publicSafe).toBe(false);
      expect(c.objectType).toBe("PREDICTION");
    }
  });

  it("odds prices + market states", () => {
    for (const o of soccer.odds) {
      const c = compileClaimObject(oddsPriceToClaimObject(o, soccer.eventId, soccer.sport));
      expect(validateClaimObject(c).ok).toBe(true);
      expect(c.publicExpression).toBe("INFO_ONLY");
    }
    for (const m of buildAllMarketBloomRecords()) {
      const c = compileClaimObject(marketBloomToClaimObject(m));
      expect(validateClaimObject(c).ok).toBe(true);
      expect(c.decision.suppressesAction).toBe(m.suppressesAction);
    }
  });

  it("bonuses — a blocked bonus is capped/refused by the compiler, not the adapter", () => {
    const passports = buildAllBonusPassports();
    expect(passports.length).toBeGreaterThan(0);
    for (const b of passports) {
      const c = compileClaimObject(bonusPassportToClaimObject(b));
      expect(validateClaimObject(c).ok).toBe(true);
      expect(c.publicSafe).toBe(false); // bonuses are never publicSafe on fixtures
      if (!b.displayAllowed) {
        // blocked → permission_required rights → compiler caps at WATCH or refuses
        expect(["DO_NOT_USE", "FIXTURE"]).toContain(c.lifecycle);
      }
    }
  });

  it("bookmaker rating", () => {
    const r = buildBookmakerRating({ bookmaker: "FixtureBook", jurisdiction: "US-NJ", licenseStatus: "verified", ratingMethodology: "stated criteria", lastVerifiedAt: "fixture" });
    const c = compileClaimObject(bookmakerRatingToClaimObject(r));
    expect(validateClaimObject(c).ok).toBe(true);
    expect(c.objectType).toBe("BOOKMAKER_RATING");
  });

  it("API providers — a forbidden provider is refused", () => {
    const ok = compileClaimObject(sourceGenomeToClaimObject(GENOME_ODDS_API));
    expect(validateClaimObject(ok).ok).toBe(true);
    const forbidden = compileClaimObject(sourceGenomeToClaimObject(GENOME_FORBIDDEN));
    expect(forbidden.lifecycle).toBe("DO_NOT_USE");
  });

  it("alerts", () => {
    for (const a of buildFixtureAlerts()) {
      const c = compileClaimObject(alertToClaimObject(a));
      expect(validateClaimObject(c).ok).toBe(true);
      expect(c.objectType).toBe("ALERT");
    }
  });

  it("web evidence is capped at INFO_ONLY and rights-gated", () => {
    const c = compileClaimObject(
      webEvidenceToClaimObject({
        subject: "an external note",
        url: "https://example.org/x",
        summary: "an unverified external observation",
        rights: WEB_RIGHTS,
        knownAtLabel: "unknown",
      }),
    );
    expect(c.publicExpression).toBe("INFO_ONLY");
    expect(c.risk.legalRisk).toBe("HIGH");
  });
});

describe("the CardClaim ↔ ClaimObject bridge (CardClaim is consumed, not replaced)", () => {
  it("a decision card's compiled strength derives from cardStrengthFromClaims", () => {
    const claims: CardClaim[] = [
      { claimId: "c1", plainText: "the role grew", claimType: "ROLE", proofStatus: "SUPPORTED", essential: true },
      { claimId: "c2", plainText: "the price is stale", claimType: "MARKET", proofStatus: "INFERRED", essential: true },
    ];
    const cardStrength = cardStrengthFromClaims(claims); // the canonical card strength (the meet of essential claims)
    const c = compileClaimObject(
      decisionCardToClaimObject({ cardId: "card-1", title: "Ecuador role read", sport: "soccer", eventId: soccer.eventId, cardStrength, proofRefs: ["c1", "c2"], decisionState: "WATCHLIST" }),
    );
    // on fixtures the compiled public expression is INFO_ONLY, but the card's own strength fed localExpression
    expect(validateClaimObject(c).ok).toBe(true);
    expect(c.authority.vector.localExpression).toBe(cardStrength);
    expect(c.objectType).toBe("DECISION_CARD");
  });
});
