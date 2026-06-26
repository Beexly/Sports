/**
 * THE AUTHORITY TENSOR — the Law of Conserved Authority, proven by exhaustion.
 *
 * This is the machine-checked form of the audit's central theorem (docs/audit/gse-reconciliation/
 * AUTHORITY_TENSOR_PROOF.md). The repo's deepest safety property is not a pile of `if` checks — it is a
 * single lattice identity:
 *
 *     expressed_strength(O)  ≤  ⊓_{L}  ceiling_L( context(O) )            (the field equation)
 *
 * over the strength lattice  INFO_ONLY ⊏ WATCH ⊏ WAIT ⊏ PERSONALIZED ⊏ ACTION ⊏ PUBLIC_ACTION,
 * where ⊓ = strengthMin (the meet). Because `meet ≤ every operand`, authority is CONSERVED, never
 * generated: no layer can raise the ceiling, only lower it; absence of evidence collapses to the bottom.
 *
 * Where authority-gate.test.ts proves specific cases, THIS file proves the universal statements over the
 * ENTIRE authority product space:
 *   T1  Contraction        — authorityCeiling IS exactly the meet of its layer ceilings (8→4 fold made literal).
 *   T2  Conservation       — the result is ≤ every individual layer operand (the meet inequality).
 *   T3  The Theorem        — no FIXTURE/SHADOW context is ever publicSafe, for ANY strength/rights.
 *   T4  Bottom is absorbing— FIXTURE forces INFO_ONLY regardless of every other layer.
 *   T5  Apex is unique     — exactly ONE context reaches PUBLIC_ACTION: the full live+public conjunction.
 *   T6  isPublicSafe spec  — isPublicSafe equals its independent specification across all 864 combinations.
 *   T7  Lattice laws       — strengthMin is a genuine meet (commutative, associative, idempotent, absorbing).
 *   T8  State composition   — the 14 DecisionStates compose UNDER the law: a fixture-backed card of any
 *                            state can never exceed INFO_ONLY (kinematics × force-law).
 *
 * Pure, deterministic, no I/O, no clock, no network. If any assertion fails, the safety invariant the
 * whole platform rests on has been broken — which is exactly what a CI-enforced theorem is for.
 */

import { describe, it, expect } from "vitest";
import {
  authorityCeiling,
  isPublicSafe,
  DEFAULT_AUTHORITY,
  type AuthorityContext,
  type DataMode,
  type ModelAuthority,
  type PublicationAuthority,
} from "../index.js";
import {
  type MaxPermittedStrength,
  rankOf,
  strengthMin,
  auditRequiredStats,
} from "../index.js";
import { ALL_DECISION_STATES } from "../decision-state.js";

// ── The full enumerable domain of every authority layer (the product space we quantify over) ──
const DATA_MODES: readonly DataMode[] = ["FIXTURE", "SHADOW_REAL", "LIVE_REAL"];
const MODEL_AUTHORITIES: readonly ModelAuthority[] = ["UNPRICED", "PROCESS_ONLY", "PERSONALIZED_ALLOWED", "PUBLIC_ALLOWED"];
const PUBLICATIONS: readonly PublicationAuthority[] = ["INTERNAL", "PERSONALIZED", "PUBLIC"];
const READINESS: readonly boolean[] = [true, false];
const RIGHTS: readonly boolean[] = [true, false];
const STRENGTHS: readonly MaxPermittedStrength[] = ["INFO_ONLY", "WATCH", "WAIT", "PERSONALIZED", "ACTION", "PUBLIC_ACTION"];

/** Every authority context — 3 × 4 × 2 × 3 = 72. */
function allContexts(): AuthorityContext[] {
  const out: AuthorityContext[] = [];
  for (const dataMode of DATA_MODES)
    for (const modelAuthority of MODEL_AUTHORITIES)
      for (const readinessAuthorized of READINESS)
        for (const publicationAuthority of PUBLICATIONS)
          out.push({ dataMode, modelAuthority, readinessAuthorized, publicationAuthority });
  return out;
}

// ── The INDEPENDENT specification of each layer's ceiling (mirrors decision-authority-gate.ts) ──
// We re-author the four layer tables here, by hand, as the *spec*. T1 then proves the implementation
// equals the meet of this independent spec — so the 4-term meet is verified against a second source,
// not against itself. This is the "8 conceptual layers contract to a 4-term meet" claim, executable.
function specDataModeCeiling(m: DataMode): MaxPermittedStrength {
  return m === "FIXTURE" ? "INFO_ONLY" : m === "SHADOW_REAL" ? "WATCH" : "PUBLIC_ACTION";
}
function specModelCeiling(a: ModelAuthority): MaxPermittedStrength {
  return a === "UNPRICED" || a === "PROCESS_ONLY" ? "WATCH" : a === "PERSONALIZED_ALLOWED" ? "PERSONALIZED" : "PUBLIC_ACTION";
}
function specPublicationCeiling(p: PublicationAuthority): MaxPermittedStrength {
  return p === "INTERNAL" ? "WATCH" : p === "PERSONALIZED" ? "PERSONALIZED" : "PUBLIC_ACTION";
}
/** The four operands of the meet for a given context (readiness contributes a WATCH cap when closed). */
function specOperands(ctx: AuthorityContext): MaxPermittedStrength[] {
  return [
    specDataModeCeiling(ctx.dataMode),
    specModelCeiling(ctx.modelAuthority),
    specPublicationCeiling(ctx.publicationAuthority),
    ctx.readinessAuthorized ? "PUBLIC_ACTION" : "WATCH",
  ];
}
function specMeet(ctx: AuthorityContext): MaxPermittedStrength {
  return specOperands(ctx).reduce((acc, s) => strengthMin(acc, s));
}
/** The independent specification of isPublicSafe — the fail-closed public conjunction. */
function specPublicSafe(ctx: AuthorityContext, finalStrength: MaxPermittedStrength, rights: boolean): boolean {
  return (
    ctx.dataMode === "LIVE_REAL" &&
    ctx.readinessAuthorized &&
    ctx.modelAuthority === "PUBLIC_ALLOWED" &&
    ctx.publicationAuthority === "PUBLIC" &&
    rights &&
    rankOf(finalStrength) > rankOf("INFO_ONLY")
  );
}

const CONTEXTS = allContexts();

describe("Authority Tensor — domain sanity", () => {
  it("the product space is the full 72 contexts (no accidental truncation)", () => {
    expect(CONTEXTS).toHaveLength(72);
    // de-dup check: every context is distinct.
    const keys = new Set(CONTEXTS.map((c) => `${c.dataMode}|${c.modelAuthority}|${c.readinessAuthorized}|${c.publicationAuthority}`));
    expect(keys.size).toBe(72);
  });
});

describe("T1 — Contraction: authorityCeiling IS the meet of its layer ceilings (8→4 fold)", () => {
  it("implementation equals the independent spec meet for ALL 72 contexts", () => {
    for (const ctx of CONTEXTS) {
      expect(authorityCeiling(ctx)).toBe(specMeet(ctx));
    }
  });
});

describe("T2 — Conservation: the meet is ≤ every individual layer operand", () => {
  it("authorityCeiling(ctx) ≤ each of the four layer ceilings, for ALL contexts", () => {
    for (const ctx of CONTEXTS) {
      const ceiling = rankOf(authorityCeiling(ctx));
      for (const operand of specOperands(ctx)) {
        // No layer can raise the ceiling above its own bound — authority is conserved, not generated.
        expect(ceiling).toBeLessThanOrEqual(rankOf(operand));
      }
    }
  });
});

describe("T3 — The Theorem: fixture/shadow data can NEVER be public", () => {
  it("no FIXTURE or SHADOW_REAL context is publicSafe — for ANY strength and ANY rights value", () => {
    for (const ctx of CONTEXTS) {
      if (ctx.dataMode === "LIVE_REAL") continue;
      for (const s of STRENGTHS) {
        for (const rights of RIGHTS) {
          expect(isPublicSafe(ctx, s, rights)).toBe(false);
        }
      }
    }
  });

  it("contrapositive: isPublicSafe true ⟹ dataMode is LIVE_REAL (over all 864 combinations)", () => {
    for (const ctx of CONTEXTS) {
      for (const s of STRENGTHS) {
        for (const rights of RIGHTS) {
          if (isPublicSafe(ctx, s, rights)) expect(ctx.dataMode).toBe("LIVE_REAL");
        }
      }
    }
  });
});

describe("T4 — Bottom is absorbing: FIXTURE forces INFO_ONLY regardless of every other layer", () => {
  it("every FIXTURE context has ceiling INFO_ONLY, even fully-public model/publication/readiness", () => {
    for (const ctx of CONTEXTS) {
      if (ctx.dataMode === "FIXTURE") expect(authorityCeiling(ctx)).toBe("INFO_ONLY");
    }
  });
  it("the fail-closed default is the lattice bottom", () => {
    expect(authorityCeiling(DEFAULT_AUTHORITY)).toBe("INFO_ONLY");
  });
});

describe("T5 — Apex is unique: exactly one context reaches PUBLIC_ACTION", () => {
  it("PUBLIC_ACTION ceiling ⟺ the full live + public-model + public-publication + ready conjunction", () => {
    const apex = CONTEXTS.filter((c) => authorityCeiling(c) === "PUBLIC_ACTION");
    expect(apex).toHaveLength(1);
    expect(apex[0]).toEqual({
      dataMode: "LIVE_REAL",
      modelAuthority: "PUBLIC_ALLOWED",
      readinessAuthorized: true,
      publicationAuthority: "PUBLIC",
    });
  });
});

describe("T6 — isPublicSafe equals its independent specification across all 864 combinations", () => {
  it("implementation === spec for every (context × strength × rights)", () => {
    let checked = 0;
    for (const ctx of CONTEXTS) {
      for (const s of STRENGTHS) {
        for (const rights of RIGHTS) {
          expect(isPublicSafe(ctx, s, rights)).toBe(specPublicSafe(ctx, s, rights));
          checked++;
        }
      }
    }
    expect(checked).toBe(72 * 6 * 2); // 864 — no silent truncation
  });

  it("INFO_ONLY is never public, even under the full public conjunction", () => {
    const full: AuthorityContext = { dataMode: "LIVE_REAL", modelAuthority: "PUBLIC_ALLOWED", readinessAuthorized: true, publicationAuthority: "PUBLIC" };
    expect(isPublicSafe(full, "INFO_ONLY", true)).toBe(false);
    expect(isPublicSafe(full, "WATCH", true)).toBe(true);
  });
});

describe("T7 — Lattice laws: strengthMin is a genuine meet", () => {
  it("commutative, associative, idempotent, and absorbing over all strengths", () => {
    for (const a of STRENGTHS) {
      expect(strengthMin(a, a)).toBe(a); // idempotent
      expect(strengthMin(a, "INFO_ONLY")).toBe("INFO_ONLY"); // INFO_ONLY is the absorbing bottom
      expect(strengthMin(a, "PUBLIC_ACTION")).toBe(a); // PUBLIC_ACTION is the identity (top)
      for (const b of STRENGTHS) {
        expect(strengthMin(a, b)).toBe(strengthMin(b, a)); // commutative
        // meet returns the lower-ranked operand
        expect(rankOf(strengthMin(a, b))).toBe(Math.min(rankOf(a), rankOf(b)));
        for (const c of STRENGTHS) {
          expect(strengthMin(strengthMin(a, b), c)).toBe(strengthMin(a, strengthMin(b, c))); // associative
        }
      }
    }
  });
});

describe("T8 — State composition: the 14 DecisionStates compose UNDER the law", () => {
  it("a fixture-backed card of ANY decision state can never exceed INFO_ONLY", () => {
    const noFacts = new Set<never>(); // worst case: no creditable facts at all
    for (const state of ALL_DECISION_STATES) {
      const statCeiling = auditRequiredStats(state, noFacts as ReadonlySet<never>).maxStrength;
      for (const ctx of CONTEXTS) {
        if (ctx.dataMode !== "FIXTURE") continue;
        // Final expressed strength is bounded by the meet of the force-law ceiling and the evidence ceiling.
        const composed = strengthMin(authorityCeiling(ctx), statCeiling);
        expect(rankOf(composed)).toBeLessThanOrEqual(rankOf("INFO_ONLY"));
      }
    }
  });

  it("every decision state has a stat contract whose empty-evidence ceiling is at most WATCH", () => {
    const noFacts = new Set<never>();
    for (const state of ALL_DECISION_STATES) {
      const ceiling = auditRequiredStats(state, noFacts as ReadonlySet<never>).maxStrength;
      // With no facts at all, no state may license more than WATCH — evidence sufficiency, layer 4.
      expect(rankOf(ceiling)).toBeLessThanOrEqual(rankOf("WATCH"));
    }
  });
});
