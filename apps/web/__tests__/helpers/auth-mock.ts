/**
 * The complete `@/lib/auth` surface for `vi.mock`, with overrides.
 *
 * WHY THIS EXISTS. A `vi.mock(path, factory)` factory REPLACES the module
 * wholesale: anything the factory omits is `undefined` at the call site, and
 * calling it throws `No "<name>" export is defined on the "<path>" mock`. So a
 * factory written to cover the two exports one test needed silently becomes a
 * trap for every export added to the real module afterwards.
 *
 * That is not hypothetical here. `isAdminEmail` was added to `@/lib/auth` with
 * the code-level owner allow-list. Measured 2026-09-13: **35 test files mock
 * `@/lib/auth` and NONE of them export `isAdminEmail`.** Three of them —
 * entitlement-fail-closed-audible, preview-legacy-redirect and
 * preview-page-paywall — happen to exercise a path that calls it, and those
 * three account for 17 of the 66 failures in this workspace. The other 32 are
 * latent: they break the day their code path reaches the function.
 *
 * The same shape cost a board lane earlier the same day, on
 * `@sports/prediction-engine` rather than this module, so it is a repo pattern
 * and not a one-off.
 *
 * `importOriginal` is the usual answer and is NOT available here: importing the
 * real module pulls in NextAuth, the Prisma adapter and provider env vars,
 * which is precisely why these suites replace it wholesale.
 *
 * HOW TO USE IT. Pass only what the test needs to control; everything else
 * comes back as an inert default:
 *
 *     vi.mock("@/lib/auth", () => authModuleMock({ auth: mocks.auth }));
 *
 * WHEN `@/lib/auth` GAINS AN EXPORT, add it HERE, once, and every consumer
 * keeps working. That is the whole point — do not re-inline a partial factory.
 */

/** Inert defaults. `isAdminEmail` returns false: a test that wants an admin says so. */
const DEFAULTS = {
  auth: async () => null,
  isAdminEmail: () => false,
  stampEmailVerifiedFromProfile: async () => undefined,
  signIn: async () => undefined,
  signOut: async () => undefined,
  handlers: {},
  DEV_FAKE_ADMIN: false,
} as const;

export type AuthModuleMock = Record<string, unknown>;

/**
 * Build the mock module object. Overrides win; every other export falls back to
 * an inert default so a factory can never be missing one.
 */
export function authModuleMock(overrides: AuthModuleMock = {}): AuthModuleMock {
  return { ...DEFAULTS, ...overrides };
}
