/**
 * Test-only stand-in for the `server-only` package.
 *
 * `server-only` is not an installed dependency — Next resolves the bare specifier
 * internally at build time, where it exists purely to make importing a server module
 * from a client component a hard BUILD error. That guard has no meaning inside Vitest,
 * where server modules are exercised in their server role, so Vite would simply fail to
 * resolve the import. Aliasing it to this empty module keeps the production guard fully
 * intact (Next still enforces it) while letting server modules be unit-tested.
 */
export {};
