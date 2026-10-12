file_path = "apps/web/components/ui/nav.tsx"
with open(file_path, "r") as f:
    content = f.read()

# Someone committed TWO `export function Nav()` and TWO `export function NavSkeleton()`.
# The first Nav() and NavSkeleton() refer to `NavChrome` which does not exist in the file!
# The second Nav() and NavSkeleton() are the actual ones.
# We must remove the ones that reference NavChrome.

bad_block = """/**
 * Layout API — asynchronous boundary isolation.
 *
 * `app/layout.tsx` is an asynchronous Server Component. Rendering a synchronous
 * boundary (like `<Nav />`) with `Suspense` delegates the dynamic portion (the
 * user's profile chip, which reads auth cookies) out of the layout render path
 * and into the `NavAuth` promise. This preserves the layout's capacity for
 * static generation.
 *
 * NOTE (Next 15): "Next.js 15 removes the layout static generation guarantee" is
 * a simplification. A layout containing an UN-suspensed dynamic read will poison
 * the entire segment route tree beneath it, forcing dynamic renders for pages
 * that could otherwise be static. The layout *itself* no longer has a distinct
 * static-generation guarantee, so do not treat it as one.
 *
 * Files: apps/web/components/ui/nav.tsx, apps/web/components/ui/nav-auth.tsx
 */
export function Nav() {
  return (
    <NavChrome
      right={
        <Suspense fallback={<NavAuthFallback />}>
          <NavAuth />
        </Suspense>
      }
    />
  );
}

/**
 * NavSkeleton — the same bar, painted with the anonymous right rail directly.
 *
 * For loading boundaries. A `loading.tsx` is rendered as a Suspense FALLBACK,
 * and the fallback subtree is part of the route's render: calling auth() (and
 * therefore cookies()) from inside it would add a dynamic data access to every
 * segment the boundary covers, for a rail the visitor sees for a few hundred
 * milliseconds. NavAuthFallback is what <Nav /> paints during that same window
 * anyway, so the skeleton and the loaded page are pixel-identical here.
 */
export function NavSkeleton() {
  return <NavChrome right={<NavAuthFallback />} />;
}
"""

if bad_block in content:
    content = content.replace(bad_block, "")
    with open(file_path, "w") as f:
        f.write(content)
    print("Fixed nav.tsx")
else:
    print("Could not find bad block")
