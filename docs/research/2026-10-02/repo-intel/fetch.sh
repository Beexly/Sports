#!/usr/bin/env bash
#
# Fetch verified repo metadata + README for each repo in repos.txt.
#
# HARDENED 2026-11-04. The previous version failed silently. It began with an
# unguarded `cd ~/workspace/skills/github`; when that directory did not exist the
# script kept running from whatever the caller's cwd happened to be, found no
# repos.txt, looped zero times, printed DONE, and exited 0. A run that did
# nothing reported success. Verified on this host: both paths were MISSING.
#
# Defensive rules applied:
#   - strict mode (set -euo pipefail): an unset var or failed command aborts
#   - IFS pinned so word splitting cannot silently mangle paths
#   - every prerequisite checked up front, with distinct exit codes
#   - cd always guarded with || exit
#   - all expansions quoted; no reliance on the caller's $PWD
#   - input validated as readable AND non-empty before looping
#   - last line without a trailing newline is still processed
#   - per-repo failures recorded and reported, not swallowed
#
# Exit codes: 0 ok | 1 usage/prereq | 2 missing or empty input | 3 partial failures
set -euo pipefail
IFS=$'\n\t'

readonly SCRIPT_NAME="${0##*/}"
readonly GITHUB_TOOL_DIR="${GITHUB_TOOL_DIR:-$HOME/workspace/skills/github}"
readonly OUT_ROOT="${OUT_ROOT:-$HOME/workspace/gse-repo-intel}"
readonly REPOS_FILE="${REPOS_FILE:-$OUT_ROOT/repos.txt}"
readonly META_DIR="$OUT_ROOT/meta"
readonly README_DIR="$OUT_ROOT/readmes"

die() {
  local code="$1"
  shift
  printf '%s: error: %s\n' "$SCRIPT_NAME" "$*" >&2
  exit "$code"
}

log() { printf '%s: %s\n' "$SCRIPT_NAME" "$*" >&2; }

cleanup() {
  local rc=$?
  if [[ $rc -ne 0 ]]; then
    log "aborted with exit code $rc"
  fi
  return $rc
}
trap cleanup EXIT

# ---- prerequisites -------------------------------------------------------
for bin in curl jq; do
  command -v "$bin" >/dev/null 2>&1 || die 1 "required command not found: $bin"
done

[[ -d "$GITHUB_TOOL_DIR" ]] \
  || die 1 "GITHUB_TOOL_DIR does not exist: $GITHUB_TOOL_DIR (set GITHUB_TOOL_DIR=...)"
[[ -x "$GITHUB_TOOL_DIR/bin/github-api" ]] \
  || die 1 "missing executable: $GITHUB_TOOL_DIR/bin/github-api"

[[ -f "$REPOS_FILE" ]] || die 2 "repos file not found: $REPOS_FILE"
[[ -r "$REPOS_FILE" ]] || die 2 "repos file not readable: $REPOS_FILE"
[[ -s "$REPOS_FILE" ]] || die 2 "repos file is empty: $REPOS_FILE"

mkdir -p "$META_DIR" "$README_DIR"

# Run the tool from its own directory so relative paths inside it resolve.
cd "$GITHUB_TOOL_DIR" || die 1 "cannot cd to $GITHUB_TOOL_DIR"

# ---- main ----------------------------------------------------------------
total=0
failed=0
while IFS= read -r repo || [[ -n "$repo" ]]; do
  # Skip blanks and comments rather than issuing a request for them.
  [[ -z "${repo//[[:space:]]/}" ]] && continue
  [[ "$repo" == \#* ]] && continue

  total=$((total + 1))
  slug="${repo//\//-}"
  log "=== $repo"

  if ! bin/github-api GET "/repos/$repo" 2>/dev/null \
      | jq -r '{full_name, stars: .stargazers_count, forks: .forks_count, description,
                license: (.license.spdx_id // .license.key // "NONE"), pushed_at,
                created_at, language, archived, topics: (.topics[0:8])}' \
      > "$META_DIR/$slug.json"; then
    log "  WARN: metadata fetch failed for $repo"
    failed=$((failed + 1))
    continue
  fi
  cat "$META_DIR/$slug.json"

  # Distinguish the three outcomes. A `|| true` here would collapse "no readme
  # published" (legitimate) and "response was not JSON / fetch failed" (a real
  # failure) into the same silent branch, which is the exact bug being fixed.
  readme_body="$(bin/github-api GET "/repos/$repo/readme" 2>/dev/null || true)"
  if [[ -z "$readme_body" ]]; then
    log "  WARN: readme lookup returned nothing for $repo"
    failed=$((failed + 1))
  elif ! dl="$(printf '%s' "$readme_body" | jq -r '.download_url // empty' 2>/dev/null)"; then
    log "  WARN: readme response was not valid JSON for $repo"
    failed=$((failed + 1))
  elif [[ -n "$dl" ]]; then
    if curl -fsSL --max-time 30 "$dl" -o "$README_DIR/$slug.md"; then
      log "  README bytes: $(wc -c < "$README_DIR/$slug.md" | tr -d ' ')"
    else
      log "  WARN: README download failed for $repo"
      failed=$((failed + 1))
    fi
  else
    log "  README: none/404"
  fi

  sleep 2
done < "$REPOS_FILE"

if [[ $total -eq 0 ]]; then
  die 2 "no processable repos found in $REPOS_FILE"
fi

log "DONE: $total repo(s), $failed failure(s)"
[[ $failed -eq 0 ]] || exit 3
