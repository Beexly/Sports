# Hero / immersive stack decision (2026-09-12)

Closes the open question in `docs/design/galaxy-build-references.md`, which lists
the 3D/motion stack as "operator-supplied ... organized, not yet vetted — treat
as a research index, not an approved dependency list."

This is that vetting. Every version, licence, peer range and download figure
below was read from the GitHub API, the npm registry and the PyPI JSON API on
2026-09-12 — not from memory.

## 1. The React 18 constraint (decides half the list)

The app is **React 18.3 / Next 14.2**. Two of the requested packages have moved
to React 19 only:

| Package | React-18-compatible line | Current line | React requirement of current line |
|---|---|---|---|
| `@react-three/fiber` | **8.18.0** | 9.7.0 | `react >=19 <19.3` |
| `@react-three/drei` | **9.122.0** | 10.7.8 | `react ^19` + `@react-three/fiber ^9` |
| `@react-three/postprocessing` | **2.19.1** | 3.1.1 | `react ^19` + `@react-three/fiber >=9.7.0` |

Adopting the current line therefore requires a React 19 + Next 15/16 migration
first. That is a separate, larger project (this app carries 100+ policy tests
that run against the current runtime) and is **not** a prerequisite for shipping
3D now. The 8.x line is the standing choice until that migration happens.

Pinning note: `postprocessing` (the engine `@react-three/postprocessing` wraps)
declares `three >=0.168 <0.187`. `three` is pinned at **0.184.0**, inside that
range. Bumping three to r187 without a matching `postprocessing` bump will break
the peer range — check that pairing before any three upgrade.

## 2. The budget constraint (decides the other half)

The 2026-09-11 site audit measured the homepage at **593 KB decoded / 159 KB
brotli** of JS and judged that roughly 2× a world-class Next.js marketing page
(`site-audit-2026-09-11/a11y-perf.md`).

`react-three-fiber` + `drei` + `postprocessing` adds an order of ~180 KB decoded
to whatever route loads it. Putting that on the homepage critical path would move
it to ~770 KB decoded — i.e. make the worst metric on the site worse, on the
front door of a product whose bottleneck is conversion.

**Decision: the 3D stack is lazy-loaded onto routes where 3D is the product, and
stays off the homepage critical path.** On the homepage the existing
zero-dependency primitives (`components/motion/reveal.tsx`, `signal-spine.tsx`)
are already correct, LCP-safe and reduced-motion safe; nothing was replaced there.

## 3. What was adopted

`apps/web/package.json`:

| Package | Version | Licence | Notes |
|---|---|---|---|
| `@react-three/fiber` | 8.18.0 | MIT | React 18 line |
| `@react-three/drei` | 9.122.0 | MIT | React 18 line |
| `@react-three/postprocessing` | 2.19.1 | MIT | React 18 line |
| `gsap` | 3.15.0 | GreenSock/Webflow "no charge" (proprietary) | see §5 |
| `three` | 0.184.0 | MIT | already present; unchanged |

Shipped surface: `components/three/signal-core-scene.tsx` (+ `-lazy.tsx`),
mounted on `/observatory` in place of the hand-rolled `interactive-galaxy`.

## 4. What was dropped, and why

| Candidate | Verdict | Reason |
|---|---|---|
| `lenis` | dropped after evaluation | Scroll feel change for ~4 KB brotli; the page already couples scroll through RAF + CSS vars. Installed, trialled, then removed — not left in `package.json` unused. |
| `locomotive-scroll` | dropped | Superseded by lenis; 11k weekly downloads vs lenis 1.1M. |
| `Theatre.js` | dropped | Public repo dormant since 2024-04-11 (npm `@theatre/core` 0.7.2, 2024-05-19); development moved to a private repo promising 1.0. Also `@theatre/studio` is **AGPL-3.0-only** while `@theatre/core` is Apache-2.0 — a footing we do not want in a paid product's dependency graph. |
| `anime.js` | dropped (optional later) | MIT and healthy (v4.5.0), but it overlaps GSAP for the same job; one timeline engine, not two. |
| GSAP on the homepage | not adopted | ~25 KB brotli against a page already 2× budget. GSAP ships only inside the lazy 3D chunk today. |
| `codrops/Playground`, `rmdms/agency-website-2024` | dead links | Both 404 as of 2026-09-12; not referenced by this decision. |

## 5. GSAP licence posture (read before shipping it anywhere new)

GSAP is **not open source**. It ships under Webflow's proprietary standard "no
charge" licence (effective 2025-04-30). Commercial use is explicitly permitted,
including the plugins that were formerly members-only, with three restrictions:
no building a no-code visual animation builder that competes with Webflow, no
reverse engineering toward a competing product, and no removing proprietary
notices. It is revocable and Webflow may amend it; continued use of new versions
after an amendment constitutes acceptance. Treat it as a vendor licence, not a
permissive dependency, and keep a note of the version in use.

## 6. Toolchain gotcha: `THREE.*` types do not resolve in this repo

While wiring the scene, `THREE.Mesh` in a **type** position failed with
`TS2694: Namespace '"three"' has no exported member 'Mesh'`, while
`new THREE.Mesh()` compiled fine.

Root cause: `@types/three` ships an `exports` map that mirrors three's own and
carries no `"types"` condition. Under `moduleResolution: "bundler"` the type side
of the `three` namespace resolves empty while the value side (resolved from the
JS build) still works, and `skipLibCheck: true` hides the internal failure.
Confirmed by controlled probe: `THREE.Mesh` as a type fails,
`InstanceType<typeof THREE.Mesh>` passes, `moduleResolution: "node"` passes.

Two fixes were tested and rejected: adding a `paths` mapping for `three` does not
help (resolution succeeds, the namespace still has no type members), and setting
`allowJs: false` actively made things worse (16 errors vs 11, including new
failures elsewhere in the app).

Standing workaround, used in `components/three/signal-core-scene.tsx`: derive the
object types from the value side —

```ts
type Mesh = InstanceType<typeof THREE.Mesh>;
```

This compiles on the unmodified `tsconfig.json` (no config change is committed
for it) and costs nothing at runtime. Revisit when `@types/three` gains a proper
`"types"` condition or the app moves to a toolchain that resolves it.

## 7. Open items

1. **React 19 migration** — unlocks r3f 9 / drei 10 / react-postprocessing 3.
   Do that before bumping any of the three.
2. **Chunk measurement** — confirm the `/observatory` async chunk delta from the
   new scene against the audited 689 KB / 183 KB baseline for that route.
3. **Remaining hand-rolled three.js surfaces** — `interactive-galaxy` (still
   used by `/human`, `/methodology`), `consensus-engine-3d` (`/intelligence`),
   `galaxy-slate-twin` (`/observatory`) are candidates for the same r3f
   treatment, one route at a time, each behind the same lazy boundary.
