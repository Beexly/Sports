/**
 * `server-only` is a build-time marker package: importing it makes a client
 * import a hard build error in Next, and it has no runtime behaviour at all.
 * Vitest's resolver cannot find it, so any test touching a `server-only`
 * module fails to resolve rather than failing an assertion.
 *
 * Aliased to this empty module in vitest.config.ts. It stubs the RESOLUTION,
 * not the guarantee: the real import stays in the source files, so the
 * client-bundle protection is untouched.
 */
export {};
