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

/**
 * The real module's value-export surface, as a type only — `typeof import()`
 * emits no runtime import, so nothing here pulls NextAuth into a test process.
 */
type AuthModule = typeof import("@/lib/auth");

/**
 * Inert defaults. `isAdminEmail` returns false: a test that wants an admin says so.
 *
 * `satisfies Record<keyof AuthModule, unknown>` is the half that makes this
 * helper actually work (CodeRabbit, PR #819). Without it nothing forced these
 * keys to track the real module, so the helper could go stale in exactly the
 * way the 35 hand-written factories did — silently, until some test reached the
 * missing export at runtime. With it, adding an export to @/lib/auth without
 * adding it here is a COMPILE error in `npm run typecheck`.
 *
 * AND THAT IS WHY THIS FILE LIVES IN lib/, NOT IN __tests__/. apps/web's
 * tsconfig excludes the whole __tests__ tree, so nothing in there is typechecked at
 * all — verified by putting `const x: number = "nope"` in the original location
 * and watching `tsc --noEmit` exit 0. The constraint was completely inert
 * there, and the comment claiming it produced a compile error would have been
 * a false statement shipped in the repo. Moving the file is what makes the
 * sentence above true; do not move it back.
 */
const DEFAULTS = {
  auth: async () => null,
  isAdminEmail: () => false,
  stampEmailVerifiedFromProfile: async () => undefined,
  signIn: async () => undefined,
  signOut: async () => undefined,
  handlers: {},
  DEV_FAKE_ADMIN: false,
} as const satisfies Record<keyof AuthModule, unknown>;

export type AuthModuleMock = Record<string, unknown>;

/**
 * Build the mock module object. Overrides win; every other export falls back to
 * an inert default so a factory can never be missing one.
 */
export function authModuleMock(overrides: AuthModuleMock = {}): AuthModuleMock {
  return { ...DEFAULTS, ...overrides };
}
