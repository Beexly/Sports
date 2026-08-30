// Hermetic database for LOCAL test runs.
//
// @sports/db returns a stub client (writes → { id: "stub" }, reads → []) whenever
// DATABASE_URL is a sentinel like "stub". A developer machine that has a real
// DATABASE_URL exported (e.g. a Neon URL for the app) makes DB-touching tests hit
// a live — and possibly auto-suspended — database: the "stub DB — integration
// path" tests then reject instead of returning the stub shape, and worse, the
// suite can read/write real data.
//
// Force the stub for local runs unless a real DB is explicitly requested with
// FORCE_REAL_PRISMA=true. This makes `npm test` deterministic on any machine and
// guarantees it can never touch a production database.
//
// IMPORTANT: skip this in CI. GitHub Actions sets CI=true and provisions its own
// ephemeral Postgres (see .github/workflows/ci.yml) that the workspace integration
// tests run against. Overriding DATABASE_URL there would silently swap that real DB
// for the stub and change what CI proves. Guarding on !CI keeps CI byte-identical
// to today while fixing the local developer experience.
if (!process.env["CI"] && process.env["FORCE_REAL_PRISMA"] !== "true") {
  process.env["DATABASE_URL"] = "stub";
}

// The Stripe SDK is mocked in unit tests (vi.mock("stripe")), but stripe.ts now
// guards STRIPE_SECRET_KEY at runtime — a dummy non-blank value lets the lazy
// client construction proceed through the guard so `stripe.*` Proxy access in
// unit tests doesn't throw StripeConfigError before reaching the mock.
if (!process.env["STRIPE_SECRET_KEY"]) {
  process.env["STRIPE_SECRET_KEY"] = "sk_test_dummy_for_unit_tests";
}

import "@testing-library/jest-dom";
