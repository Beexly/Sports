# Packages — Deep Module Boundary Convention (`setup-ts-deep-modules`)

Every package under `packages/<name>/` is a **deep module**: substantial domain behavior hidden behind a small, explicit root entry-point interface.

```text
packages/
  <name>/
    index.ts        <- an entry point (public). Import this from outside.
    client.ts       <- another entry point. Packages may expose several small root entry points.
    lib/            <- implementation: hidden from outside, free to import each other.
    tests/          <- co-located tests + fixtures (a subfolder, so private).
```

## Four Boundary Rules (`.dependency-cruiser.cjs`)

1. **Entry-point boundary (`entrypoint-boundary-from-app` & `entrypoint-boundary-across-packages`):** Code outside a package (app code or another package) may import **only** that package's root entry points, never anything inside its subfolders (`lib/`, `src/`, etc.).
2. **Intra-package freedom:** A package's own implementation files may import each other freely across its internal subfolders.
3. **Tests through the entry points (`tests-through-entrypoints` & `tests-folder-is-private`):** Files under `packages/<pkg>/tests/` may import any package's root entry points and their own `tests/` fixtures, but never any package's subfolder internals (not even their own).
4. **No cycles (`no-circular`):** Zero circular dependencies across modules.

## Avoid Giant Barrel Files

Do **not** create giant barrel `index.ts` files that blindly re-export an entire internal subtree. Instead, expose a small number of focused root entry points (`index.ts`, `client.ts`, `server.ts`) that delegate to deep internal modules under `lib/`.

## Verification

Run boundary checks via:

```bash
npx depcruise packages --config .dependency-cruiser.cjs
```
