#!/usr/bin/env bash
# Verify api-entitlement.ts's OWN documented claim:
#   "premium analytics surfaces (e.g. the Pro /trends page) link their
#    underlying /api/intelligence/* and /api/nflverse/* JSON. Without a
#    server-side check on the route itself, the page gate is trivially
#    bypassed by requesting the JSON URL directly. This helper makes the
#    raw endpoint require the same entitlement as the surface that links it."
#
# If ANY route under those prefixes is ungated, the documented claim is false.
cd /c/Users/Garrett/Sports-live || exit 1
for pre in intelligence nflverse; do
  echo "########## /api/$pre"
  total=0
  missing=0
  for f in $(git ls-files "apps/web/app/api/$pre/**/route.ts"); do
    total=$((total+1))
    if ! grep -qE 'requirePremiumApi|requireEntitlement|getViewerEntitlements|evaluateGate' "$f"; then
      echo "  UNGATED: $f"
      missing=$((missing+1))
    fi
  done
  echo "  routes: $total, ungated: $missing"
done

echo
echo "########## cockpit layout coverage (authoritative gate is the LAYOUT)"
if [ -f apps/web/app/cockpit/layout.tsx ]; then
  grep -c 'role !== "ADMIN"' apps/web/app/cockpit/layout.tsx | sed 's/^/  layout ADMIN checks: /'
else
  echo "  NO LAYOUT"
fi
echo "  cockpit API routes: $(git ls-files 'apps/web/app/api/cockpit/**/route.ts' | wc -l)"
echo "  cockpit API routes WITHOUT their own auth check:"
for f in $(git ls-files "apps/web/app/api/cockpit/**/route.ts"); do
  grep -qE 'auth\(\)|requireAdmin' "$f" || echo "    $f"
done
