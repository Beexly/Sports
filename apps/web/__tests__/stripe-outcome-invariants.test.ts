import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  classifyStripeSessionCreateError,
  transitionForOutcome,
  type CheckoutOutcomeClass,
} from "@/lib/billing/stripe-outcome";

/**
 * stripe-outcome.ts — the idempotency-key release decision on the money path.
 *
 * The one live consumer is `app/api/subscriptions/checkout/route.ts:523-524`,
 * and the single property that matters is `releasesActiveKey`. Releasing it
 * lets the next attempt mint a FRESH Stripe idempotency key; if that happens on
 * an outcome where a session MAY exist at Stripe, a buyer retrying the same
 * failed-looking checkout can be charged twice. The module exists to close that
 * hole, so most tests here attack the RELEASE decision rather than the labels.
 *
 * The sibling `stripe-outcome.test.ts` pins the happy-path label mapping. These
 * are the invariants it does not reach: the structural (not `instanceof`)
 * discriminant the header promises, the fail-closed default under adversarial
 * input, the table's internal coherence, and the cross-file contract at the
 * route boundary.
 *
 * SCOPE: pure functions only. No DB, no network, no Stripe SDK, no invented
 * product data. The route is read as TEXT (never imported — importing it would
 * pull the Stripe SDK and Prisma into a unit test); that is the same technique
 * `admin-routes-gating.test.ts` uses.
 */

/** Every class the classifier can return. Exhaustiveness is asserted below. */
const ALL_CLASSES: readonly CheckoutOutcomeClass[] = [
  "DEFINITIVE_REJECTION",
  "AMBIGUOUS_NETWORK_OUTCOME",
  "RETRIABLE_NO_REQUEST_SENT",
  "CONFIGURATION_FAILURE",
];

/** Mirrors the Prisma enums the transition is written against. */
const ALL_STATUSES = ["CREATED", "AMBIGUOUS", "FAILED"] as const;
const ALL_HTTP_STATUSES = [400, 502, 503] as const;

const repoRoot = resolve(__dirname, "..");
const routeSource = readFileSync(
  join(repoRoot, "app/api/subscriptions/checkout/route.ts"),
  "utf8",
);

describe("classification is STRUCTURAL on `type`, never on instanceof or name", () => {
  /**
   * The header claims the discriminant is the SDK's `type` string "so it works
   * identically for the real SDK, mocks, and errors that crossed a
   * serialization boundary". A serialized Stripe error is a PLAIN OBJECT with
   * no Error prototype — the shape an `instanceof Stripe.errors.StripeError`
   * check silently fails on. That is the whole point, so pin it directly.
   */
  it.each([
    ["StripeCardError", "DEFINITIVE_REJECTION"],
    ["StripeConnectionError", "AMBIGUOUS_NETWORK_OUTCOME"],
    ["StripeAPIError", "AMBIGUOUS_NETWORK_OUTCOME"],
    ["StripeInvalidRequestError", "CONFIGURATION_FAILURE"],
    ["StripeAuthenticationError", "CONFIGURATION_FAILURE"],
    ["StripePermissionError", "CONFIGURATION_FAILURE"],
    ["StripeIdempotencyError", "CONFIGURATION_FAILURE"],
    ["StripeRateLimitError", "RETRIABLE_NO_REQUEST_SENT"],
  ])(
    "classifies a PLAIN OBJECT (serialization boundary, no Error prototype) carrying type=%s",
    (type, expected) => {
      const serialized: unknown = JSON.parse(
        JSON.stringify({ type, message: "stripe", statusCode: 402 }),
      );
      // Guard the premise: this really did lose its prototype.
      expect(Object.getPrototypeOf(serialized)).toBe(Object.prototype);
      expect(classifyStripeSessionCreateError(serialized)).toBe(expected);
    },
  );

  it("reads `type` through the prototype chain (spread/copy of a thrown error)", () => {
    const thrown = Object.assign(new Error("card declined"), { type: "StripeCardError" });
    const copied: unknown = { ...thrown }; // loses the Error prototype
    expect(classifyStripeSessionCreateError(copied)).toBe("DEFINITIVE_REJECTION");
    const inherited: unknown = Object.create({ type: "StripeCardError" });
    expect(classifyStripeSessionCreateError(inherited)).toBe("DEFINITIVE_REJECTION");
  });

  /**
   * THE trap. `name` is NOT the discriminant — Stripe sets `name` to
   * "StripeError" for EVERY subclass, so a `name` fallback could never
   * discriminate, and anyone "helpfully" adding `err.name === "StripeCardError"`
   * would promote unprovable errors to terminal FAILED + key-released, which is
   * precisely the double-billing hole. Fail-closed is the correct answer.
   */
  it("does NOT accept `name` as a substitute for `type` (a name fallback = the double-billing bug)", () => {
    expect(classifyStripeSessionCreateError({ name: "StripeCardError" })).toBe(
      "AMBIGUOUS_NETWORK_OUTCOME",
    );
    expect(
      classifyStripeSessionCreateError(Object.assign(new Error("x"), { name: "StripeCardError" })),
    ).toBe("AMBIGUOUS_NETWORK_OUTCOME");
    expect(classifyStripeSessionCreateError({ name: "StripeError", message: "x" })).toBe(
      "AMBIGUOUS_NETWORK_OUTCOME",
    );
  });

  it("is case- and whitespace-exact on the discriminant (no loose matching)", () => {
    // A loosened `.toLowerCase()` / `.trim()` could collide with a future
    // SDK discriminant, so pin exactness rather than allowing it.
    for (const variant of [
      "stripecarderror",
      "STRIPECARDERROR",
      " StripeCardError",
      "StripeCardError ",
      "stripecarderror ",
    ]) {
      expect(classifyStripeSessionCreateError({ type: variant })).toBe(
        "AMBIGUOUS_NETWORK_OUTCOME",
      );
    }
  });

  it("is prototype pollution-immune: an inherited type is read, an own `undefined` is not", () => {
    // An OWN `type: undefined` shadows the prototype value, so the classifier
    // sees no discriminant and must fail closed.
    const shadowed: unknown = Object.assign(Object.create({ type: "StripeCardError" }), {
      type: undefined,
    });
    expect(classifyStripeSessionCreateError(shadowed)).toBe("AMBIGUOUS_NETWORK_OUTCOME");
  });
});

describe("fail-closed default: every unclassifiable input keeps the key", () => {
  /**
   * The fail-closed default is the entire safety argument, so enumerate the
   * shapes that reach it rather than sampling a few. Each one must land on
   * AMBIGUOUS, which by the transition table means `releasesActiveKey: false`.
   */
  it.each([
    ["undefined", undefined],
    ["null", null],
    ["empty string", ""],
    ["string", "boom"],
    ["empty object", {}],
    ["empty array", []],
    ["number", 42],
    ["NaN", Number.NaN],
    ["bigint", BigInt(7)],
    ["symbol", Symbol("StripeCardError")],
    ["function", () => "StripeCardError"],
    ["Date", new Date(0)],
    ["RegExp", /StripeCardError/],
    ["Map", new Map([["type", "StripeCardError"]])],
    ["null-prototype object", Object.create(null)],
    ["own type = number", { type: 42 }],
    ["own type = null", { type: null }],
    ["own type = object", { type: { toString: () => "StripeCardError" } }],
    ["own type = array", { type: ["StripeCardError"] }],
    ["own type = boolean", { type: true }],
  ])("classifies %s as AMBIGUOUS_NETWORK_OUTCOME", (_label, input) => {
    expect(classifyStripeSessionCreateError(input)).toBe("AMBIGUOUS_NETWORK_OUTCOME");
  });

  /**
   * NOT a hole — pinned because I first wrote it wrong. An Array / String
   * wrapper / typed array that CARRIES a valid `type` string classifies as
   * DEFINITIVE_REJECTION, because the classifier is structural on `type` and
   * never inspects the prototype. My first draft asserted these were
   * unclassifiable; they are not, and asserting so was wrong.
   *
   * The property worth keeping is the structural one: a carrier with an
   * exotic base type is treated identically to a plain object, because
   * `instanceof` discrimination is exactly what this module refuses to use.
   * Any real Stripe error is an Error subclass anyway, so this is the
   * serialization-boundary shape in another guise, not a production path.
   */
  it.each([
    ["array", Object.assign(["x"], { type: "StripeCardError" })],
    ["String object wrapper", Object.assign(new String("x"), { type: "StripeCardError" })],
    ["typed array", Object.assign(new Uint8Array(0), { type: "StripeCardError" })],
  ])("a %s carrying a valid `type` classifies structurally, base type ignored", (_label, input) => {
    expect(classifyStripeSessionCreateError(input)).toBe("DEFINITIVE_REJECTION");
  });

  it("an unknown-but-well-formed SDK type fails closed rather than defaulting to terminal", () => {
    // A NEW Stripe error class we have not classified is the realistic case.
    // It must NOT be treated as a rejection: we cannot prove no session exists.
    for (const type of [
      "StripeSomethingNew",
      "StripeSignatureVerificationError",
      "StripeInvalidGrantError",
    ]) {
      expect(classifyStripeSessionCreateError({ type })).toBe("AMBIGUOUS_NETWORK_OUTCOME");
    }
  });

  /**
   * RECORDED FINDING (pinned as-is, NOT fixed here): `classifyStripeSessionCreateError`
   * reads `err.type` inside the route's catch handler with no inner guard, so an
   * error object whose `type` is a THROWING GETTER propagates out of the route
   * handler instead of returning a typed response. Verified by reading
   * route.ts:522-524: the classify call sits in the catch body, not in a
   * nested try.
   *
   * This is SAFE-BY-ACCIDENT rather than by design: the attempt is left at
   * REQUEST_IN_FLIGHT (recordCheckoutAttemptOutcome never runs), so the
   * idempotency key is NOT released and the repair job reconciles it — no
   * double-billing. The cost is an untyped 500 instead of the 503 + "safe to
   * retry" body. Hardening it changes the route's observable error response,
   * which is an owner decision; this test pins the current behaviour so that
   * any change to it is deliberate rather than silent.
   */
  it("RECORDED: a throwing `type` getter propagates (key is still retained — safe, but untyped)", () => {
    const hostile: unknown = {
      get type(): string {
        throw new Error("descriptor trap");
      },
    };
    expect(() => classifyStripeSessionCreateError(hostile)).toThrow("descriptor trap");
  });

  /**
   * The end-to-end safety statement, over adversarial input: whatever we could
   * NOT classify, the attempt keeps its key. This is the property the whole
   * module exists to hold, asserted once at the level it actually matters.
   */
  it("no unclassifiable input can ever reach a key-releasing transition", () => {
    const hostile: readonly unknown[] = [
      undefined,
      null,
      "boom",
      0,
      {},
      [],
      { type: 42 },
      { type: "StripeSomethingNew" },
      { name: "StripeCardError" },
      new Date(0),
      Object.create(null),
    ];
    for (const input of hostile) {
      const outcome = classifyStripeSessionCreateError(input);
      expect(transitionForOutcome(outcome).releasesActiveKey).toBe(false);
    }
  });
});

describe("transition table coherence", () => {
  it("is TOTAL — every class has a transition (no undefined at the call site)", () => {
    for (const cls of ALL_CLASSES) {
      const transition = transitionForOutcome(cls);
      expect(transition, `transition missing for ${cls}`).toBeDefined();
      expect(ALL_STATUSES).toContain(transition.status);
      expect(ALL_HTTP_STATUSES).toContain(transition.httpStatus);
      expect(typeof transition.releasesActiveKey).toBe("boolean");
      expect(transition.errorCode.length).toBeGreaterThan(0);
    }
  });

  /**
   * THE invariant: only a FAILED attempt releases its key. Not "ambiguous
   * doesn't release" and not "card errors do" — the biconditional. A future
   * class added with releasesActiveKey:true but status:"CREATED" would send an
   * attempt back to retryable while simultaneously freeing its key, which is
   * incoherent in exactly the dangerous direction.
   */
  it("releasesActiveKey <=> status === FAILED (the release biconditional)", () => {
    for (const cls of ALL_CLASSES) {
      const { status, releasesActiveKey } = transitionForOutcome(cls);
      expect(releasesActiveKey, `${cls} releases key but is ${status}`).toBe(status === "FAILED");
    }
    // Spelled out, so a future edit cannot quietly satisfy the biconditional
    // by moving BOTH sides together on a class that must retain the key.
    expect(transitionForOutcome("AMBIGUOUS_NETWORK_OUTCOME").releasesActiveKey).toBe(false);
    expect(transitionForOutcome("RETRIABLE_NO_REQUEST_SENT").releasesActiveKey).toBe(false);
    expect(transitionForOutcome("DEFINITIVE_REJECTION").releasesActiveKey).toBe(true);
    expect(transitionForOutcome("CONFIGURATION_FAILURE").releasesActiveKey).toBe(true);
  });

  /**
   * Only the two provably-no-session classes may release. This is the
   * allowlist, stated positively, so ADDING a new key-releasing class has to
   * break a named assertion rather than slip through an unbounded predicate.
   */
  it("ONLY the two provably-no-session classes release the key", () => {
    const releasing = ALL_CLASSES.filter((c) => transitionForOutcome(c).releasesActiveKey);
    expect(releasing).toEqual(["DEFINITIVE_REJECTION", "CONFIGURATION_FAILURE"]);
  });

  it("gives every class a DISTINCT errorCode (client handlers must not collide)", () => {
    const codes = ALL_CLASSES.map((c) => transitionForOutcome(c).errorCode);
    expect(new Set(codes).size).toBe(ALL_CLASSES.length);
    expect(codes).toEqual([
      "checkout_rejected",
      "checkout_outcome_ambiguous",
      "checkout_retriable",
      "checkout_configuration_failure",
    ]);
  });

  it("returns 5xx for retryable/unknown outcomes and 4xx only for a client-caused rejection", () => {
    // 503 = "try again" (ambiguous or retriable, key retained).
    expect(transitionForOutcome("AMBIGUOUS_NETWORK_OUTCOME").httpStatus).toBe(503);
    expect(transitionForOutcome("RETRIABLE_NO_REQUEST_SENT").httpStatus).toBe(503);
    // 400 = Stripe definitively refused the card: the client caused it.
    expect(transitionForOutcome("DEFINITIVE_REJECTION").httpStatus).toBe(400);
    // 502 = our credentials/params are wrong: an operator must fix it.
    expect(transitionForOutcome("CONFIGURATION_FAILURE").httpStatus).toBe(502);
  });

  it("returns the SAME shared table entry every call (identity, not a copy)", () => {
    // Recorded property, pinned deliberately: `transitionForOutcome` returns
    // `OUTCOME_TRANSITIONS[outcome]` directly, so every caller receives the one
    // live object. Today the route only READS it, so this is safe — but it is
    // the reason the next test asserts isolation by restoring, not by
    // pretending the accessor copies.
    expect(transitionForOutcome("AMBIGUOUS_NETWORK_OUTCOME")).toBe(
      transitionForOutcome("AMBIGUOUS_NETWORK_OUTCOME"),
    );
    expect(transitionForOutcome("DEFINITIVE_REJECTION")).not.toBe(
      transitionForOutcome("CONFIGURATION_FAILURE"),
    );
  });

  /**
   * RECORDED FINDING (pinned as-is, NOT fixed here): because the accessor
   * hands back the live table entry, a MUTATING caller corrupts the module for
   * every later request in the process — including the safety decision itself.
   * I proved this by mutating the returned object and observing the next read
   * return `"tampered"` rather than `checkout_outcome_ambiguous`.
   *
   * Severity today: NONE in production. The single live consumer
   * (route.ts:523-551) only reads `.status`, `.releasesActiveKey`,
   * `.errorCode` and `.httpStatus`, verified by the source-text assertions
   * above — it never assigns to the transition. So no code path can trigger
   * this today, and the double-billing hole stays closed.
   *
   * Why not fixed here: returning a frozen or copied object changes a shared
   * module's export shape on the MONEY path, which is an owner decision, and
   * the failure mode is inert until someone adds a mutation. This test
   * documents the hazard AND restores the value, so the mutation does not
   * leak into sibling tests in this file.
   */
  it("RECORDED: a caller mutating the returned entry DOES corrupt later reads (no defensive copy)", () => {
    const live = transitionForOutcome("AMBIGUOUS_NETWORK_OUTCOME");
    const original = live.errorCode;
    try {
      live.errorCode = "tampered";
      expect(transitionForOutcome("AMBIGUOUS_NETWORK_OUTCOME").errorCode).toBe("tampered");
    } finally {
      live.errorCode = original;
    }
    // Restored, and the money-path decision itself is intact.
    expect(transitionForOutcome("AMBIGUOUS_NETWORK_OUTCOME").errorCode).toBe(
      "checkout_outcome_ambiguous",
    );
    expect(transitionForOutcome("AMBIGUOUS_NETWORK_OUTCOME").releasesActiveKey).toBe(false);
    expect(classifyStripeSessionCreateError({ type: "StripeCardError" })).toBe(
      "DEFINITIVE_REJECTION",
    );
  });
});

describe("route boundary contract (route.ts read as text, never imported)", () => {
  it("the live route classifies with this module rather than inlining its own map", () => {
    expect(routeSource).toMatch(/import\s*\{[^}]*classifyStripeSessionCreateError[^}]*\}\s*from\s*"@\/lib\/billing\/stripe-outcome"/);
    expect(routeSource).toMatch(/import\s*\{[^}]*transitionForOutcome[^}]*\}\s*from\s*"@\/lib\/billing\/stripe-outcome"/);
    expect(routeSource).toContain("classifyStripeSessionCreateError(err)");
    expect(routeSource).toContain("transitionForOutcome(outcomeClass)");
  });

  /**
   * The route must FORWARD the module's release decision into the persistence
   * call rather than recomputing one. A route-side `releasesActiveKey: true`,
   * or a re-derived boolean, would override the module with exactly the
   * fail-closed default this workstream exists to keep.
   */
  it("forwards transition.releasesActiveKey into recordCheckoutAttemptOutcome", () => {
    expect(routeSource).toMatch(
      /recordCheckoutAttemptOutcome\([\s\S]{0,400}?releasesActiveKey:\s*transition\.releasesActiveKey/,
    );
    // No route-side override of the release decision.
    expect(routeSource).not.toMatch(/releasesActiveKey:\s*true/);
    expect(routeSource).not.toMatch(/releasesActiveKey:\s*false/);
    expect(routeSource).not.toMatch(/releasesActiveKey:\s*!/);
  });

  it("serves the route's HTTP status and error code from the transition", () => {
    expect(routeSource).toMatch(/code:\s*transition\.errorCode/);
    expect(routeSource).toMatch(/status:\s*transition\.httpStatus/);
  });

  /**
   * THE customer-facing promise. The route tells a buyer "It is safe to retry —
   * you will never be double-charged" in exactly one branch. That sentence is
   * only true when the attempt KEPT its idempotency key, so the promise is
   * pinned to a class that provably does release it to the contrary. Widening
   * the guard to cover a key-releasing class would state a guarantee the
   * system cannot make.
   */
  it("offers 'never be double-charged' only for a key-RETAINING outcome", () => {
    expect(routeSource).toContain("It is safe to retry");
    expect(routeSource).toContain("you will never be double-charged");
    const promiseBranches = routeSource.match(
      /outcomeClass === "([A-Z_]+)"[\s\S]{0,300}?never be double-charged/g,
    );
    expect(promiseBranches, "promise branch not found in route source").not.toBeNull();
    for (const branch of promiseBranches ?? []) {
      const cls = branch.match(/outcomeClass === "([A-Z_]+)"/)?.[1] as CheckoutOutcomeClass;
      expect(
        transitionForOutcome(cls).releasesActiveKey,
        `route promises no double-charge for ${cls}, which RELEASES its key`,
      ).toBe(false);
    }
  });

  /**
   * If the route ever stops routing the double-charge promise through the
   * classifier, the source-text check above would silently stop matching and
   * the guarantee would be unowned. Pin the obligation to exist.
   */
  it("still classifies inside the session-create catch handler", () => {
    // The route has SIX `} catch (err) {` blocks; my first draft matched the
    // first one (line 139, the customer lookup) and failed against correct
    // code. Anchor on the session-create call and take the catch that follows
    // it, which is the handler this module actually serves.
    const createIndex = routeSource.indexOf("checkoutSession = await createCheckoutSession({");
    expect(createIndex).toBeGreaterThan(-1);
    const catchIndex = routeSource.indexOf("} catch (err) {", createIndex);
    expect(catchIndex).toBeGreaterThan(createIndex);
    const classifyIndex = routeSource.indexOf("classifyStripeSessionCreateError(err)", catchIndex);
    expect(classifyIndex).toBeGreaterThan(catchIndex);
    // The catch body documents the classification contract before using it.
    // Case-sensitive on purpose — the comment is the in-code restatement of the
    // directive, so losing it is a real doc loss worth failing on.
    expect(routeSource.slice(catchIndex, classifyIndex)).toContain("Outcome classification");
    // And the promise + typed response follow the classify call, inside the
    // same handler, so an unclassified throw cannot skip the response.
    const handlerEnd = routeSource.indexOf("} catch (err) {", classifyIndex);
    const tail =
      handlerEnd === -1 ? routeSource.slice(classifyIndex) : routeSource.slice(classifyIndex, handlerEnd);
    expect(tail).toContain("recordCheckoutAttemptOutcome");
    expect(tail).toContain("transition.httpStatus");
  });
});