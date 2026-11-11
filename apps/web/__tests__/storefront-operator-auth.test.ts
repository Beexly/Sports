import { describe, expect, it } from "vitest";
import {
  MIN_OPERATOR_KEY_LENGTH,
  authorizeOperator,
  resolveOperatorKey,
} from "@/lib/storefront/operator-auth";

const GOOD = "operator-key-that-is-long-enough";

describe("storefront operator authorization", () => {
  it("refuses to authorize when no key is configured", () => {
    // The route used to fall back to a literal credential, which made a missing
    // env var a published password.
    expect(resolveOperatorKey({})).toBeNull();
    expect(authorizeOperator("sovereign-operator-secret", {})).toBe("unconfigured");
    expect(authorizeOperator(GOOD, {})).toBe("unconfigured");
  });

  it("refuses placeholder-length keys", () => {
    expect(resolveOperatorKey({ GSE_OPERATOR_KEY: "changeme" })).toBeNull();
    expect(authorizeOperator("changeme", { GSE_OPERATOR_KEY: "changeme" })).toBe("unconfigured");
    expect(MIN_OPERATOR_KEY_LENGTH).toBeGreaterThan(11);
  });

  it("accepts the configured key and rejects everything else", () => {
    const env = { GSE_OPERATOR_KEY: GOOD };
    expect(authorizeOperator(GOOD, env)).toBe("ok");
    expect(authorizeOperator(GOOD, { OPERATOR_KEY: GOOD })).toBe("ok");
    expect(authorizeOperator("wrong", env)).toBe("unauthorized");
    expect(authorizeOperator(undefined, env)).toBe("unauthorized");
    expect(authorizeOperator("", env)).toBe("unauthorized");
  });

  it("does not accept the retired literal default", () => {
    const env = { GSE_OPERATOR_KEY: GOOD };
    expect(authorizeOperator("sovereign-operator-secret", env)).toBe("unauthorized");
  });

  it("prefers the GSE key when both are set", () => {
    const env = { GSE_OPERATOR_KEY: GOOD, OPERATOR_KEY: "another-key-long-enough" };
    expect(resolveOperatorKey(env)).toBe(GOOD);
    expect(authorizeOperator("another-key-long-enough", env)).toBe("unauthorized");
  });
});
