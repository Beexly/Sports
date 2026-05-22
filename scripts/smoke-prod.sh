#!/usr/bin/env bash
# Galaxy Sports Edge — daily production smoke test.
#
# Verifies critical routes, security headers, brand integrity, and
# canonical URLs against https://www.galaxysportsedge.com.
#
# Usage:  bash scripts/smoke-prod.sh
# Exit code: 0 = SHIP, 1 = WATCH (warnings), 2 = FAIL (regressions)
#
# Scheduling:
#   - Add to .github/workflows/daily-smoke.yml on a 30 8 * * * cron
#   - Or invoke via Cowork scheduled task (see CLAUDE_PICKUP_2026-05-21_AUDIT.md)

set -u
BASE="https://www.galaxysportsedge.com"
APEX="https://galaxysportsedge.com"
FAILS=0
WARNS=0

bold()   { printf "\033[1m%s\033[0m\n" "$1"; }
ok()     { printf "  \033[32mOK\033[0m    %s\n" "$1"; }
warn()   { printf "  \033[33mWARN\033[0m  %s\n" "$1"; WARNS=$((WARNS+1)); }
fail()   { printf "  \033[31mFAIL\033[0m  %s\n" "$1"; FAILS=$((FAILS+1)); }

bold "1. Apex → www redirect"
apex_code=$(curl -sS -o /dev/null -w "%{http_code}" --max-time 6 "$APEX")
if [ "$apex_code" = "307" ] || [ "$apex_code" = "301" ] || [ "$apex_code" = "308" ]; then
  ok "apex returns $apex_code"
else
  fail "apex returned $apex_code (expected 30x redirect)"
fi

bold "2. Critical routes"
ROUTES=( / /picks /methodology /performance /pricing /observatory /vault /about /press /contact /faq /responsible-play /vs/tout-services /privacy /terms /opengraph-image /robots.txt /sitemap.xml /api/health )
ok_count=0
for r in "${ROUTES[@]}"; do
  code=$(curl -sS -o /dev/null -w "%{http_code}" -L --max-time 6 "$BASE$r")
  if [ "$code" = "200" ]; then
    ok_count=$((ok_count+1))
  else
    fail "$r returned $code"
  fi
done
ok "$ok_count/${#ROUTES[@]} routes returned 200"

bold "3. Brand integrity"
home=$(curl -sS --max-time 6 "$BASE")
pricing=$(curl -sS --max-time 6 "$BASE/pricing")
combined="$home$pricing"
# regressions = banned strings
for pattern in "Garrett Baxley" "Baxley" '>v5\.0<' "yellow-500" "yellow-400" "yellow-900"; do
  if printf "%s" "$combined" | grep -qE "$pattern"; then
    fail "regression: '$pattern' present on homepage or pricing"
  fi
done
# first-person leakage (more lenient — warn only)
for pattern in "I publish" "I&#x27;d want" "I built"; do
  if printf "%s" "$combined" | grep -qE "$pattern"; then
    warn "first-person leak: '$pattern'"
  fi
done
[ $FAILS -eq 0 ] && ok "no banned strings on homepage/pricing"

bold "4. Security headers"
hdrs=$(curl -sS -I -L --max-time 6 "$BASE")
for h in "strict-transport-security" "x-content-type-options" "x-frame-options" "permissions-policy"; do
  if printf "%s" "$hdrs" | grep -qi "^$h:"; then
    ok "$h"
  else
    fail "missing header: $h"
  fi
done

bold "5. Canonical URLs"
declare -A CANONICAL_EXPECTED=(
  ["/"]="$APEX/"
  ["/about"]="$APEX/about"
  ["/pricing"]="$APEX/pricing"
  ["/press"]="$APEX/press"
  ["/contact"]="$APEX/contact"
  ["/privacy"]="$APEX/privacy"
  ["/terms"]="$APEX/terms"
  ["/responsible-play"]="$APEX/responsible-play"
)
for path in "${!CANONICAL_EXPECTED[@]}"; do
  expected="${CANONICAL_EXPECTED[$path]}"
  expected_trim="${expected%/}"   # trim trailing /
  body=$(curl -sS --max-time 6 "$BASE$path")
  actual=$(printf "%s" "$body" | grep -oE '<link rel="canonical" href="[^"]+"' | head -1 | sed 's/.*href="//;s/"$//')
  actual_trim="${actual%/}"
  if [ "$actual_trim" = "$expected_trim" ]; then
    ok "$path → $actual"
  else
    fail "$path canonical = '$actual' (expected '$expected')"
  fi
done

bold "6. External cron workflow state"
wf_json=$(curl -sS --max-time 6 "https://api.github.com/repos/Beexly/Sports/actions/workflows" 2>/dev/null || echo "{}")
compact_wf_json=$(printf "%s" "$wf_json" | tr -d '\n\r\t ')
if printf "%s" "$compact_wf_json" | grep -q '"path":".github/workflows/external-cron.yml"'; then
  if printf "%s" "$compact_wf_json" | grep -q '"state":"active"[^}]*"path":".github/workflows/external-cron.yml"\|"path":".github/workflows/external-cron.yml"[^}]*"state":"active"'; then
    state="active - External Cron (Galaxy Sports Edge)"
  else
    state="found - External Cron (Galaxy Sports Edge)"
  fi
else
  state="no-cron-workflow-found"
fi
case "$state" in
  active*)              ok "external cron: $state" ;;
  disabled_inactivity*) fail "external cron: $state — GitHub disabled it. Re-enable in Actions tab." ;;
  no-cron*)             warn "external cron workflow not found via API" ;;
  *)                    warn "external cron state: $state" ;;
esac

echo
bold "Summary"
ts=$(date -u +"%Y-%m-%d %H:%M UTC")
if [ $FAILS -gt 0 ]; then
  echo "  Status: FAIL — $FAILS regression(s), $WARNS warning(s)  [$ts]"
  exit 2
elif [ $WARNS -gt 0 ]; then
  echo "  Status: WATCH — $WARNS warning(s)  [$ts]"
  exit 1
else
  echo "  Status: SHIP — all checks green  [$ts]"
  exit 0
fi
