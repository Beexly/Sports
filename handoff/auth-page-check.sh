#!/usr/bin/env bash
# Page-level auth check under middleware-protected prefixes.
# Middleware only proves a cookie EXISTS; validity is proven in the page.
cd /c/Users/Garrett/Sports-live || exit 1
for pre in admin cockpit dashboard; do
  echo "########## /$pre"
  total=0
  missing=0
  for f in $(git ls-files "apps/web/app/$pre/**/page.tsx" "apps/web/app/$pre/page.tsx" 2>/dev/null); do
    total=$((total+1))
    if ! grep -qE 'auth\(\)|redirect\(' "$f"; then
      echo "  NO SERVER CHECK: $f"
      missing=$((missing+1))
    fi
  done
  echo "  pages: $total, without own auth()/redirect(): $missing"
done
